import { now } from "moment";
import { App, MarkdownView, Notice, Platform, TFile, WorkspaceLeaf } from "obsidian";

import { ReviewResponse } from "src/algorithms/base/repetition-item";
import { Card } from "src/card/card";
import {
    FlashcardReviewMode,
    IFlashcardReviewSequencer as IFlashcardReviewSequencer,
} from "src/card/flashcard-review-sequencer";
import { CardType, Question } from "src/card/questions/question";
import { findMatchingQuestion } from "src/card/questions/question-matcher";
import { Deck } from "src/deck/deck";
import { escapeHtml } from "src/escape-html";
import type SRPlugin from "src/main";
import { Note } from "src/note/note";
import { SRSettings } from "src/settings";
import CardInfoNotice from "src/ui/obsidian-ui-components/content-container/card-container/controls/card-info-notice";
import ControlsComponent from "src/ui/obsidian-ui-components/content-container/card-container/controls/controls";
import InfoSection from "src/ui/obsidian-ui-components/content-container/card-container/deck-info/info-section";
import ResponseSectionComponent from "src/ui/obsidian-ui-components/content-container/card-container/response-section/response-section";
import { FlashcardMode } from "src/ui/obsidian-ui-components/modals/sr-modal-view";
import { getOrCreateSideBySideLeaf, openMarkdownFileInLeaf } from "src/ui/workspace-window-utils";
import EmulatedPlatform from "src/utils/platform-detector";
import { RenderMarkdownWrapper } from "src/utils/renderers";

export class CardContainer {
    public app: App;
    public plugin: SRPlugin;
    public mode: FlashcardMode;

    public view: HTMLDivElement;

    public infoSection: InfoSection;

    public mainWrapper: HTMLDivElement;
    public scrollWrapper: HTMLDivElement;
    public content: HTMLDivElement;

    public controls: ControlsComponent;

    public response: ResponseSectionComponent;
    public lastPressed: number;

    public isActive: boolean = false;

    private chosenDeck: Deck | null;
    private totalCardsInSession: number = 0;
    private totalDecksInSession: number = 0;

    private currentDeck: Deck | null;
    private previousDeck: Deck | null;
    private currentDeckTotalCardsInQueue: number = 0;

    private clozeInputs: NodeListOf<Element>;
    private clozeAnswers: NodeListOf<Element>;

    private reviewSequencer: IFlashcardReviewSequencer;
    private settings: SRSettings;
    private reviewMode: FlashcardReviewMode;
    private backToDeck: () => void;
    private editClickHandler: () => void;
    private closeModal: () => void | undefined;
    private sourceLeaf?: WorkspaceLeaf;
    private noteRefreshTimeout: number | null = null;
    private isRefreshingCurrentNote: boolean = false;
    private shouldRefreshCurrentNoteAgain: boolean = false;

    constructor(
        app: App,
        plugin: SRPlugin,
        settings: SRSettings,
        reviewSequencer: IFlashcardReviewSequencer,
        reviewMode: FlashcardReviewMode,
        view: HTMLDivElement,
        backToDeck: () => void,
        editClickHandler: () => void,
        closeModal?: () => void,
        sourceLeaf?: WorkspaceLeaf,
    ) {
        // Init properties
        this.app = app;
        this.plugin = plugin;
        this.settings = settings;
        this.reviewSequencer = reviewSequencer;
        this.reviewMode = reviewMode;
        this.backToDeck = backToDeck;
        this.editClickHandler = editClickHandler;
        this.view = view;
        this.chosenDeck = null;
        this.closeModal = closeModal;
        this.sourceLeaf = sourceLeaf;

        // Build ui
        this.init();
    }

    // #region -> public methods

    /**
     * Initializes all static elements in the FlashcardView
     */
    init() {
        this.view.addClasses(["sr-container", "sr-card-container", "sr-is-hidden"]);

        this.controls = new ControlsComponent(
            this.view,
            !this.settings.openViewInNewTab,
            this.app,
            () => this.backToDeck(),
            () => this.editClickHandler(),
            async (response: ReviewResponse) => await this._processReview(response),
            () => this._displayCurrentCardInfoNotice(),
            () => this._skipCurrentCard(),
            this._jumpToCurrentCard.bind(this),
            this.closeModal ? this.closeModal.bind(this) : undefined,
        );

        this.mainWrapper = this.view.createDiv();
        this.mainWrapper.addClass("sr-main-wrapper");

        this.infoSection = new InfoSection(
            this.mainWrapper,
            this.settings.showContextInCards,
            () => this.backToDeck(),
            this.closeModal ? this.closeModal.bind(this) : undefined,
        );

        this.scrollWrapper = this.mainWrapper.createDiv();
        this.scrollWrapper.addClass("sr-scroll-wrapper");

        this.content = this.scrollWrapper.createDiv();
        this.content.addClass("sr-content");

        this.response = new ResponseSectionComponent(
            this.mainWrapper,
            this.settings,
            () => this._showAnswer(),
            (response: ReviewResponse) => this._processReview(response),
        );
    }

    /**
     * Shows the FlashcardView if it is hidden
     */
    async show(chosenDeck: Deck) {
        // Prevents rest of code, from running if this was executed multiple times after one another
        if (!this.view.hasClass("sr-is-hidden")) {
            return;
        }

        this.chosenDeck = chosenDeck;
        const deckStats = this.reviewSequencer.getDeckStats(chosenDeck.getTopicPath());
        this.totalCardsInSession = deckStats.cardsInQueueCount;
        this.totalDecksInSession = deckStats.decksInQueueOfThisDeckCount;

        await this._drawContent();

        this.view.removeClass("sr-is-hidden");
        this.isActive = true;
        document.addEventListener("keydown", this._keydownHandler);
    }

    /**
     * Refreshes all dynamic elements
     */
    async refresh(preserveSide: boolean = false) {
        const shouldShowAnswer = preserveSide && this.mode === FlashcardMode.Back;
        await this._drawContent();

        if (shouldShowAnswer) {
            this._renderAnswer();
        }
    }

    /**
     * Hides the FlashcardView if it is visible
     */
    hide() {
        // Prevents the rest of code, from running if this was executed multiple times after one another
        if (this.view.hasClass("sr-is-hidden")) {
            return;
        }

        document.removeEventListener("keydown", this._keydownHandler);
        this.view.addClass("sr-is-hidden");
        this.isActive = false;
    }

    /**
     * Closes the FlashcardView
     */
    close() {
        this.hide();
        if (this.noteRefreshTimeout !== null) {
            window.clearTimeout(this.noteRefreshTimeout);
            this.noteRefreshTimeout = null;
        }
        document.removeEventListener("keydown", this._keydownHandler);
    }

    /**
     * Blocks the key input to the FlashcardView
     *
     * @param block
     */
    blockKeyInput(block: boolean) {
        if (block) {
            document.addEventListener("keydown", this._keydownHandler);
        } else {
            document.removeEventListener("keydown", this._keydownHandler);
        }
    }

    // #region -> Functions & helpers

    private async _drawContent() {
        this.controls.resetButton.disabled = true;

        // Update current deck info
        this.mode = FlashcardMode.Front;
        this.previousDeck = this.currentDeck;
        this.currentDeck = this.reviewSequencer.currentDeck;
        if (this.previousDeck !== this.currentDeck) {
            const currentDeckStats = this.reviewSequencer.getDeckStats(
                this.currentDeck.getTopicPath(),
            );
            this.currentDeckTotalCardsInQueue = currentDeckStats.cardsInQueueOfThisDeckCount;
        }

        this._updateInfoBar(this.chosenDeck, this.currentDeck);

        // Update card content
        this.content.empty();
        const wrapper: RenderMarkdownWrapper = new RenderMarkdownWrapper(
            this.app,
            this.plugin,
            this._currentNote.filePath,
        );

        await wrapper.renderMarkdownWrapper(
            this._currentCard.front.trimStart(),
            this.content,
            this._currentQuestion.questionText.textDirection,
        );
        // Set scroll position back to top
        this.content.scrollTop = 0;

        // Update response buttons
        this.response.resetResponseButtons();

        // Setup cloze input listeners
        this._setupClozeInputListeners();
    }

    private get _currentCard(): Card {
        return this.reviewSequencer.currentCard;
    }

    private get _currentQuestion(): Question {
        return this.reviewSequencer.currentQuestion;
    }

    private get _currentNote(): Note {
        return this.reviewSequencer.currentNote;
    }

    private async _processReview(response: ReviewResponse): Promise<void> {
        const timeNow = now();
        if (
            this.lastPressed &&
            timeNow - this.lastPressed < this.plugin.data.settings.reviewButtonDelay
        ) {
            return;
        }
        this.lastPressed = timeNow;

        try {
            const currentFile = this._currentQuestion?.note?.file?.tfile;
            if (currentFile) {
                await this._refreshCurrentCardFromNote(currentFile, false);
            }

            await this.reviewSequencer.processReview(response);
            await this._showNextCard();
        } catch (error) {
            console.error("SR: Failed to save flashcard review response", error);
            new Notice(
                "Could not save the flashcard review. Reload the review view and try again.",
            );
        }
    }

    private async _showNextCard(): Promise<void> {
        if (this._currentCard !== null && this._currentCard !== undefined) await this.refresh();
        else this.backToDeck();
    }

    // #region -> Controls

    private async _skipCurrentCard(): Promise<void> {
        this.reviewSequencer.skipCurrentCard();
        await this._showNextCard();
    }

    private _displayCurrentCardInfoNotice() {
        new CardInfoNotice(this._currentCard.scheduleInfo, this._currentQuestion.note.filePath);
    }

    public scheduleRefreshForModifiedNote(file: TFile): void {
        if (!this.isActive || this._currentQuestion?.note?.filePath !== file.path) {
            return;
        }

        if (this.noteRefreshTimeout !== null) {
            window.clearTimeout(this.noteRefreshTimeout);
        }

        this.noteRefreshTimeout = window.setTimeout(() => {
            this.noteRefreshTimeout = null;
            void this._refreshCurrentCardFromNote(file);
        }, 150);
    }

    private async _jumpToCurrentCard(): Promise<void> {
        const currentQuestion = this.reviewSequencer.currentQuestion;
        if (!currentQuestion) return;

        const refreshedQuestion = await this._loadLatestQuestionLocation(currentQuestion);
        const isMobile = Platform.isMobile || EmulatedPlatform().isMobile;
        const isModalReview =
            (!isMobile && !this.settings.openViewInNewTab) ||
            (isMobile && !this.settings.openViewInNewTabMobile);

        const file = currentQuestion.note.file.tfile;
        const line = Math.max(0, refreshedQuestion?.lineNo ?? currentQuestion.lineNo ?? 0);
        const leaf = isMobile
            ? this.app.workspace.getLeaf("tab")
            : getOrCreateSideBySideLeaf(this.app, this.sourceLeaf);

        await openMarkdownFileInLeaf(leaf, file, line, true);
        await leaf.loadIfDeferred();
        await this.app.workspace.revealLeaf(leaf);

        const markdownView = leaf.view as MarkdownView;
        if (markdownView?.editor) {
            markdownView.editor.setCursor({ line, ch: 0 });
            markdownView.editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } });
        }

        if (isModalReview && !isMobile) {
            new Notice("Note was opened in a split behind the review modal");
        }
    }

    private async _refreshCurrentCardFromNote(
        file: TFile,
        refreshView: boolean = true,
    ): Promise<boolean> {
        if (!this.isActive || this._currentQuestion?.note?.filePath !== file.path) {
            return false;
        }

        if (this.isRefreshingCurrentNote) {
            this.shouldRefreshCurrentNoteAgain = true;
            return false;
        }

        this.isRefreshingCurrentNote = true;

        try {
            const currentQuestion = this._currentQuestion;
            const currentCard = this._currentCard;
            if (!currentQuestion || !currentCard) {
                return false;
            }

            const refreshedNote = await this.plugin.loadNote(file);
            const refreshedQuestion = findMatchingQuestion(
                refreshedNote.questionList,
                currentQuestion,
            );
            const refreshedCard = refreshedQuestion?.cards[currentCard.cardIdx];

            if (!refreshedQuestion || !refreshedCard) {
                return false;
            }

            this._applyRefreshedCurrentCard(
                currentQuestion,
                currentCard,
                refreshedQuestion,
                refreshedCard,
            );
            if (refreshView) {
                await this.refresh(true);
            }
            return true;
        } finally {
            this.isRefreshingCurrentNote = false;

            if (this.shouldRefreshCurrentNoteAgain) {
                this.shouldRefreshCurrentNoteAgain = false;
                void this._refreshCurrentCardFromNote(file);
            }
        }
    }

    private async _loadLatestQuestionLocation(currentQuestion: Question): Promise<Question | null> {
        const file = currentQuestion.note?.file?.tfile;
        if (!file) {
            return null;
        }

        const refreshedNote = await this.plugin.loadNote(file);
        return findMatchingQuestion(refreshedNote.questionList, currentQuestion);
    }

    private _applyRefreshedCurrentCard(
        currentQuestion: Question,
        currentCard: Card,
        refreshedQuestion: Question,
        refreshedCard: Card,
    ): void {
        const refreshedCards = [...refreshedQuestion.cards];

        Object.assign(currentQuestion, refreshedQuestion);
        Object.assign(currentCard, refreshedCard);

        currentCard.question = currentQuestion;
        refreshedCards[currentCard.cardIdx] = currentCard;
        refreshedCards.forEach((card) => {
            card.question = currentQuestion;
        });
        currentQuestion.cards = refreshedCards;
    }

    // #region -> Deck Info

    private _updateInfoBar(chosenDeck: Deck, currentDeck: Deck) {
        const currentDeckStats = this.reviewSequencer.getDeckStats(currentDeck.getTopicPath());
        const chosenDeckStats = this.reviewSequencer.getDeckStats(chosenDeck.getTopicPath());
        this.infoSection.updateChosenDeckInfo(
            chosenDeck,
            chosenDeckStats,
            this.totalCardsInSession,
            this.totalDecksInSession,
        );
        this.infoSection.updateCurrentDeckInfo(
            chosenDeck,
            currentDeck,
            currentDeckStats,
            this.settings.flashcardCardOrder,
            this.currentDeckTotalCardsInQueue,
        );
        this.infoSection.updateCardContext(
            this.settings.showContextInCards,
            this._currentQuestion,
            this._currentNote,
        );
    }

    private _setupClozeInputListeners(): void {
        this.clozeInputs = document.querySelectorAll(".cloze-input");

        this.clozeInputs.forEach((input) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            input.addEventListener("change", (e) => {});
        });
    }

    private _evaluateClozeAnswers(): void {
        this.clozeAnswers = document.querySelectorAll(".cloze-answer");

        if (this.clozeAnswers.length === this.clozeInputs.length) {
            for (let i = 0; i < this.clozeAnswers.length; i++) {
                const clozeInput = this.clozeInputs[i] as HTMLInputElement;
                const clozeAnswer = this.clozeAnswers[i] as HTMLElement;

                const inputText = clozeInput.value.trim();
                const answerText = clozeAnswer.innerText.trim();

                const answerElement =
                    inputText === answerText
                        ? `<span style="color: green">${escapeHtml(inputText)}</span>`
                        : `[<span style="color: red; text-decoration: line-through;">${escapeHtml(inputText)}</span><span style="color: green">${answerText}</span>]`;
                clozeAnswer.innerHTML = answerElement;
            }
        }
    }

    // #region -> Response

    private _showAnswer(): void {
        const timeNow = now();
        if (
            this.lastPressed &&
            timeNow - this.lastPressed < this.plugin.data.settings.reviewButtonDelay
        ) {
            return;
        }
        this.lastPressed = timeNow;

        this._renderAnswer();
    }

    private _renderAnswer(): void {
        this.mode = FlashcardMode.Back;

        this.controls.resetButton.setDisabled(false);

        // Show answer text
        if (this._currentQuestion.questionType !== CardType.Cloze) {
            const hr: HTMLElement = document.createElement("hr");
            this.content.appendChild(hr);
        } else {
            this.content.empty();
        }

        const wrapper: RenderMarkdownWrapper = new RenderMarkdownWrapper(
            this.app,
            this.plugin,
            this._currentNote.filePath,
        );
        wrapper.renderMarkdownWrapper(
            this._currentCard.back,
            this.content,
            this._currentQuestion.questionText.textDirection,
        );

        // Evaluate cloze answers
        this._evaluateClozeAnswers();

        // Show response buttons
        this.response.showRatingButtons(
            this.reviewMode,
            this.settings,
            this.reviewSequencer,
            this._currentCard,
        );
    }

    private _keydownHandler = (e: KeyboardEvent) => {
        // Prevents any input, if the edit modal is open or if the view is not in focus
        if (
            document.activeElement.nodeName === "TEXTAREA" ||
            document.activeElement.nodeName === "INPUT" ||
            this.mode === FlashcardMode.Closed ||
            !this.plugin.uiManager.getSRInFocusState() ||
            Platform.isMobile || // No keyboard events on mobile
            EmulatedPlatform().isMobile
        ) {
            return;
        }

        const consumeKeyEvent = () => {
            e.preventDefault();
            e.stopPropagation();
        };

        switch (e.code) {
            case "KeyS":
                this._skipCurrentCard();
                consumeKeyEvent();
                break;
            case "Enter":
            case "NumpadEnter":
            case "Space":
                if (this.mode === FlashcardMode.Front) {
                    this._showAnswer();
                    consumeKeyEvent();
                } else if (this.mode === FlashcardMode.Back) {
                    this._processReview(ReviewResponse.Good);
                    consumeKeyEvent();
                }
                break;
            case "Numpad1":
            case "Digit1":
                if (this.mode !== FlashcardMode.Back) {
                    break;
                }
                this._processReview(ReviewResponse.Hard);
                consumeKeyEvent();
                break;
            case "Numpad2":
            case "Digit2":
                if (this.mode !== FlashcardMode.Back) {
                    break;
                }
                this._processReview(ReviewResponse.Good);
                consumeKeyEvent();
                break;
            case "Numpad3":
            case "Digit3":
                if (this.mode !== FlashcardMode.Back) {
                    break;
                }
                this._processReview(ReviewResponse.Easy);
                consumeKeyEvent();
                break;
            case "Numpad0":
            case "Digit0":
                if (this.mode !== FlashcardMode.Back) {
                    break;
                }
                this._processReview(ReviewResponse.Reset);
                consumeKeyEvent();
                break;
            default:
                break;
        }
    };
}
