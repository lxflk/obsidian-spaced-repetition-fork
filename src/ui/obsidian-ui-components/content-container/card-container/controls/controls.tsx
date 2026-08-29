import { App, Platform } from "obsidian";

import { ReviewResponse } from "src/algorithms/base/repetition-item";
import BackButtonComponent from "src/ui/obsidian-ui-components/content-container/card-container/controls/back-button";
import CardInfoButtonComponent from "src/ui/obsidian-ui-components/content-container/card-container/controls/card-info-button";
import ResetButtonComponent from "src/ui/obsidian-ui-components/content-container/card-container/controls/reset-button";
import SkipButtonComponent from "src/ui/obsidian-ui-components/content-container/card-container/controls/skip-button";
import ModalCloseButtonComponent from "src/ui/obsidian-ui-components/content-container/modal-close-button";
import SRButtonComponent from "src/ui/sr-button";
import EmulatedPlatform from "src/utils/platform-detector";

export default class ControlsComponent {
    public controls: HTMLDivElement;
    public backButton: BackButtonComponent;
    public jumpToCardButton: SRButtonComponent;
    public searchCardsButton: SRButtonComponent;
    public refreshButton: SRButtonComponent;
    public modalCloseButton: ModalCloseButtonComponent;
    public resetButton: ResetButtonComponent;
    public skipButton: SkipButtonComponent;
    public cardInfoButton: CardInfoButtonComponent;

    constructor(
        container: HTMLElement,
        isModal: boolean,
        app: App,
        backToDeck: () => void,
        processReview: (response: ReviewResponse) => Promise<void>,
        displayCurrentCardInfoNotice: () => void,
        skipCurrentCard: () => void,
        searchCards: () => void,
        jumpToCurrentCard: () => Promise<void>,
        refreshCards: () => void,
        closeModal?: () => void,
    ) {
        const jumpToCardTitle = "Jump to card"; // TODO: Translate
        const searchCardsTitle = "Choose next card (/)"; // TODO: Translate
        const refreshCardsTitle = "Reload cards"; // TODO: Translate

        this.controls = container.createDiv();
        this.controls.addClass("sr-controls");

        this.backButton = new BackButtonComponent(this.controls, () => backToDeck(), [
            (EmulatedPlatform().isPhone || Platform.isPhone) && isModal
                ? "mod-raised"
                : "clickable-icon",
        ]);

        this.controls.createDiv().addClass("sr-flex-spacer");

        this.jumpToCardButton = new SRButtonComponent(this.controls, {
            classNames: [
                "sr-jump-to-card-button",
                ...(EmulatedPlatform().isPhone || Platform.isPhone ? ["mod-raised"] : []),
            ],
            icon: "arrow-up-right",
            tooltip: jumpToCardTitle,
            onClick: () => {
                jumpToCurrentCard();
            },
        });

        this.searchCardsButton = new SRButtonComponent(this.controls, {
            classNames: [
                "sr-search-cards-button",
                ...(EmulatedPlatform().isPhone || Platform.isPhone ? ["mod-raised"] : []),
            ],
            icon: "search",
            tooltip: searchCardsTitle,
            onClick: () => {
                searchCards();
            },
        });

        this.refreshButton = new SRButtonComponent(this.controls, {
            classNames: [
                "sr-refresh-button",
                ...(EmulatedPlatform().isPhone || Platform.isPhone ? ["mod-raised"] : []),
            ],
            icon: "refresh-cw",
            tooltip: refreshCardsTitle,
            onClick: () => {
                refreshCards();
            },
        });

        this.cardInfoButton = new CardInfoButtonComponent(
            this.controls,
            () => displayCurrentCardInfoNotice(),
            EmulatedPlatform().isPhone || Platform.isPhone ? ["mod-raised"] : undefined,
        );

        this.resetButton = new ResetButtonComponent(
            this.controls,
            app,
            async () => await processReview(ReviewResponse.Reset),
            [EmulatedPlatform().isPhone || Platform.isPhone ? "mod-raised" : "undefined"],
        );
        this.resetButton.setDisabled(true);

        this.skipButton = new SkipButtonComponent(
            this.controls,
            () => skipCurrentCard(),
            EmulatedPlatform().isPhone || Platform.isPhone ? ["mod-raised"] : undefined,
        );

        this.controls.createDiv().addClass("sr-flex-spacer");

        this.modalCloseButton = new ModalCloseButtonComponent(
            this.controls,
            () => closeModal && closeModal(),
            [
                !closeModal && "sr-hide-by-scaling",
                !closeModal && "hide-height",
                EmulatedPlatform().isPhone || Platform.isPhone ? "mod-raised" : "clickable-icon",
            ],
        );
    }

    setResetButtonDisabled(disabled: boolean) {
        this.resetButton.buttonEl.toggleClass("mod-disabled", disabled);
    }
}
