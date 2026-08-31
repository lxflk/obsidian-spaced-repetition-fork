import { Moment } from "moment";
import { ButtonComponent, Platform, setTooltip } from "obsidian";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import h from "vhtml";

import {
    DeckStats,
    IFlashcardReviewSequencer as IFlashcardReviewSequencer,
} from "src/card/flashcard-review-sequencer";
import { COLLAPSE_ICON } from "src/constants";
import { Deck } from "src/deck/deck";
import { TopicPath } from "src/deck/topic-path";
import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { DeckReviewCounts, getReviewCount, getReviewLevel } from "src/review-history";
import { SRSettings } from "src/settings";
import ModalCloseButtonComponent from "src/ui/obsidian-ui-components/content-container/modal-close-button";
import { FlashcardMode } from "src/ui/obsidian-ui-components/modals/sr-modal-view";
import SRButtonComponent from "src/ui/sr-button";
import { globalDateProvider } from "src/utils/dates";
import EmulatedPlatform from "src/utils/platform-detector";

const ACTIVITY_WEEK_COUNT = 53;
const DAYS_PER_WEEK = 7;

export class DeckContainer {
    public plugin: SRPlugin;
    public mode: FlashcardMode;
    public contentEl: HTMLElement;

    public containerEl: HTMLDivElement;
    public header: HTMLDivElement;
    public titleWrapper: HTMLDivElement;
    public refreshButton: SRButtonComponent;
    public title: HTMLDivElement;
    public closeButton: ButtonComponent;

    public stats: HTMLDivElement;
    public headerDivider: HTMLHRElement;
    public scrollWrapper: HTMLDivElement;
    public content: HTMLDivElement;

    public isActive: boolean = false;

    private reviewSequencer: IFlashcardReviewSequencer;
    private settings: SRSettings;
    private startReviewOfDeck: (deck: Deck) => void;
    private reloadDecks: () => void;
    private closeModal: () => void | undefined;

    constructor(
        plugin: SRPlugin,
        settings: SRSettings,
        reviewSequencer: IFlashcardReviewSequencer,
        containerEl: HTMLDivElement,
        startReviewOfDeck: (deck: Deck) => void,
        reloadDecks: () => void,
        closeModal?: () => void,
    ) {
        // Init properties
        this.plugin = plugin;
        this.settings = settings;
        this.reviewSequencer = reviewSequencer;
        this.containerEl = containerEl;
        this.startReviewOfDeck = startReviewOfDeck;
        this.reloadDecks = reloadDecks;
        this.closeModal = closeModal;

        // Build ui
        this.init();
    }

    /**
     * Initializes all static elements in the DeckListView
     */
    init(): void {
        this.containerEl.addClasses(["sr-container", "sr-deck-container", "sr-is-hidden"]);

        this.header = this.containerEl.createDiv();
        this.header.addClass("sr-header");

        this.titleWrapper = this.header.createDiv();
        this.titleWrapper.addClass("sr-title-wrapper");

        this.refreshButton = new SRButtonComponent(this.titleWrapper, {
            classNames: [
                "sr-refresh-button",
                EmulatedPlatform().isPhone || Platform.isPhone ? "mod-raised" : "clickable-icon",
            ],
            icon: "refresh-cw",
            tooltip: "Reload cards",
            onClick: () => {
                this.reloadDecks();
            },
        });

        this.titleWrapper.createDiv().addClass("sr-flex-spacer");

        this.title = this.titleWrapper.createDiv();
        this.title.addClass("sr-title");
        this.title.setText(t("DECKS"));

        this.titleWrapper.createDiv().addClass("sr-flex-spacer");

        this.closeButton = new ModalCloseButtonComponent(
            this.titleWrapper,
            () => this.closeModal && this.closeModal(),
            [
                !this.closeModal && "sr-hide-by-scaling",
                !this.closeModal && "hide-height",
                EmulatedPlatform().isPhone || Platform.isPhone ? "mod-raised" : "clickable-icon",
                "sr-modal-close-button",
            ],
        );

        this.stats = this.header.createDiv();
        this.stats.addClass("sr-header-stats-container");
        this._createHeaderStats();

        this.headerDivider = this.containerEl.createEl("hr");

        this.scrollWrapper = this.containerEl.createDiv();
        this.scrollWrapper.addClass("sr-scroll-wrapper");

        this.content = this.scrollWrapper.createDiv();
        this.content.addClass("sr-content");
    }

    /**
     * Shows the DeckListView & rerenders dynamic elements
     */
    show(): void {
        this.mode = FlashcardMode.Deck;

        // Redraw in case the stats have changed
        this._createHeaderStats();

        this.content.empty();
        for (const deck of this.reviewSequencer.originalDeckTree.subdecks) {
            this._createTree(deck, this.content);
        }
        this._createReviewActivity();

        if (this.containerEl.hasClass("sr-is-hidden")) {
            this.containerEl.removeClass("sr-is-hidden");
            this.isActive = true;
        }
    }

    /**
     * Hides the DeckListView
     */
    hide() {
        if (!this.containerEl.hasClass("sr-is-hidden")) {
            this.containerEl.addClass("sr-is-hidden");
            this.isActive = false;
        }
    }

    /**
     * Closes the DeckListView
     */
    close() {
        this.hide();
    }

    setReviewSequencer(reviewSequencer: IFlashcardReviewSequencer): void {
        this.reviewSequencer = reviewSequencer;
    }

    // -> Header

    private _createHeaderStats() {
        const statistics: DeckStats = this.reviewSequencer.getDeckStats(TopicPath.emptyPath);
        this.stats.empty();

        this._createHeaderStatsContainer(t("DUE_CARDS"), statistics.dueCount, "sr-bg-green");
        this._createHeaderStatsContainer(t("NEW_CARDS"), statistics.newCount, "sr-bg-blue");
        this._createHeaderStatsContainer(t("TOTAL_CARDS"), statistics.totalCount, "sr-bg-red");
    }

    private _createHeaderStatsContainer(
        statsLable: string,
        statsNumber: number,
        statsClass: string,
    ): void {
        const statsContainer = this.stats.createDiv();
        statsContainer.ariaLabel = statsLable;
        statsContainer.addClasses([
            "tag-pane-tag-count",
            "tree-item-flair",
            "sr-header-stats-count",
            statsClass,
        ]);

        const lable = statsContainer.createDiv();
        lable.setText(statsLable + ":");

        const number = statsContainer.createDiv();
        number.setText(statsNumber.toString());
    }

    // -> Tree content

    private _createTree(deck: Deck, container: HTMLElement): void {
        const deckStats = this.reviewSequencer.getDeckStats(deck.getTopicPath());
        const deckTree: HTMLElement = container.createDiv("tree-item sr-tree-item-container");
        const deckTreeSelf: HTMLElement = deckTree.createDiv(
            `tree-item-self tag-pane-tag ${deckStats.dueCount > 0 || deckStats.newCount > 0 ? "is-clickable" : "is-disabled"} sr-tree-item-row`,
        );

        const shouldBeInitiallyExpanded: boolean = this.settings.initiallyExpandAllSubdecksInTree;
        let collapsed = !shouldBeInitiallyExpanded;
        let collapseIconEl: HTMLElement | null = null;
        if (deck.subdecks.length > 0) {
            collapseIconEl = deckTreeSelf.createDiv("tree-item-icon collapse-icon");
            collapseIconEl.innerHTML = COLLAPSE_ICON;
            (collapseIconEl.childNodes[0] as HTMLElement).style.transform = collapsed
                ? "rotate(-90deg)"
                : "";
        }

        const deckTreeInner: HTMLElement = deckTreeSelf.createDiv("tree-item-inner");
        const deckTreeInnerText: HTMLElement = deckTreeInner.createDiv("tag-pane-tag-text");
        deckTreeInnerText.innerHTML += <span class="tag-pane-tag-self">{deck.deckName}</span>;

        const deckTreeOuter: HTMLDivElement = deckTreeSelf.createDiv();
        deckTreeOuter.addClasses(["tree-item-flair-outer", "sr-tree-stats-container"]);

        this._createStats(deckStats, deckTreeOuter);

        const deckTreeChildren: HTMLElement = deckTree.createDiv("tree-item-children");
        deckTreeChildren.style.display = collapsed ? "none" : "block";
        if (deck.subdecks.length > 0) {
            collapseIconEl.addEventListener("click", (e) => {
                if (collapsed) {
                    (collapseIconEl.childNodes[0] as HTMLElement).style.transform = "";
                    deckTreeChildren.style.display = "block";
                } else {
                    (collapseIconEl.childNodes[0] as HTMLElement).style.transform =
                        "rotate(-90deg)";
                    deckTreeChildren.style.display = "none";
                }

                // We stop the propagation of the event so that the click event for deckTreeSelf doesn't get called
                // if the user clicks on the collapse icon
                e.stopPropagation();
                collapsed = !collapsed;
            });
        }

        // Add the click handler to deckTreeSelf instead of deckTreeInner so that it activates
        // over the entire rectangle of the tree item, not just the text of the topic name
        // https://github.com/st3v3nmw/obsidian-spaced-repetition/issues/709
        deckTreeSelf.addEventListener("click", () => {
            this.startReviewOfDeck(deck);
        });

        for (const subdeck of deck.subdecks) {
            this._createTree(subdeck, deckTreeChildren);
        }
    }

    private _createStats(statistics: DeckStats, statsWrapper: HTMLDivElement) {
        statsWrapper.empty();

        this._createStatsContainer(
            t("DUE_CARDS"),
            statistics.dueCount,
            "sr-bg-green",
            statsWrapper,
        );
        this._createStatsContainer(t("NEW_CARDS"), statistics.newCount, "sr-bg-blue", statsWrapper);
        this._createStatsContainer(
            t("TOTAL_CARDS"),
            statistics.totalCount,
            "sr-bg-red",
            statsWrapper,
        );
    }

    private _createStatsContainer(
        statsLable: string,
        statsNumber: number,
        statsClass: string,
        statsWrapper: HTMLDivElement,
    ): void {
        const statsContainer = statsWrapper.createDiv();

        statsContainer.ariaLabel = statsLable;

        statsContainer.addClasses([
            "tag-pane-tag-count",
            "tree-item-flair",
            "sr-tree-stats-count",
            statsClass,
        ]);

        statsContainer.setText(statsNumber.toString());
    }

    private _createReviewActivity(): void {
        const today = globalDateProvider.today;
        const todayKey = today.format("YYYY-MM-DD");
        const todayCount = getReviewCount(this.plugin.data.reviewHistory[todayKey]);
        const startDate = today
            .clone()
            .day(0)
            .subtract(ACTIVITY_WEEK_COUNT - 1, "weeks");
        const dates = Array.from({ length: ACTIVITY_WEEK_COUNT * DAYS_PER_WEEK }, (_, index) =>
            startDate.clone().add(index, "days"),
        );
        const maximumCount = dates.reduce((maximum, date) => {
            if (date.isAfter(today, "day")) return maximum;
            return Math.max(
                maximum,
                getReviewCount(this.plugin.data.reviewHistory[date.format("YYYY-MM-DD")]),
            );
        }, 0);

        const activity = this.content.createDiv("sr-review-activity");
        const summary = activity.createDiv("sr-review-activity-summary");
        const todaySummary = summary.createDiv("sr-review-activity-today");
        todaySummary.createDiv("sr-review-activity-today-count").setText(todayCount.toString());
        todaySummary.createDiv("sr-review-activity-today-label").setText(t("CARDS_REVIEWED_TODAY"));
        summary.createDiv("sr-review-activity-title").setText(t("REVIEW_ACTIVITY"));

        const chartScroller = activity.createDiv("sr-review-activity-scroller");
        const chart = chartScroller.createDiv("sr-review-activity-chart");
        this._createActivityMonthLabels(chart, startDate);

        const chartBody = chart.createDiv("sr-review-activity-chart-body");
        const weekdayLabels = chartBody.createDiv("sr-review-activity-weekdays");
        for (const label of ["", "Mon", "", "Wed", "", "Fri", ""]) {
            weekdayLabels.createDiv().setText(label);
        }

        const grid = chartBody.createDiv("sr-review-activity-grid");
        grid.setAttribute("role", "img");
        grid.setAttribute(
            "aria-label",
            `${t("REVIEW_ACTIVITY")}: ${todayCount} ${t("CARDS_REVIEWED_TODAY")}`,
        );

        for (const date of dates) {
            const cell = grid.createDiv("sr-review-activity-day");
            if (date.isAfter(today, "day")) {
                cell.addClass("is-future");
                continue;
            }

            const deckCounts = this.plugin.data.reviewHistory[date.format("YYYY-MM-DD")];
            const count = getReviewCount(deckCounts);
            cell.addClass(`is-level-${getReviewLevel(count, maximumCount)}`);
            const tooltip = this._formatActivityTooltip(date, deckCounts);
            cell.setAttribute("aria-label", tooltip);
            setTooltip(cell, tooltip, { placement: "top", delay: 50 });
        }

        const legend = activity.createDiv("sr-review-activity-legend");
        legend.createSpan().setText(t("LESS"));
        for (let level = 0; level <= 4; level++) {
            legend.createSpan(`sr-review-activity-day is-level-${level}`);
        }
        legend.createSpan().setText(t("MORE"));
    }

    private _createActivityMonthLabels(chart: HTMLDivElement, startDate: Moment): void {
        const monthRow = chart.createDiv("sr-review-activity-month-row");
        monthRow.createDiv("sr-review-activity-month-spacer");
        const months = monthRow.createDiv("sr-review-activity-months");

        for (let week = 0; week < ACTIVITY_WEEK_COUNT; week++) {
            const weekStart = startDate.clone().add(week, "weeks");
            const firstOfMonth = Array.from({ length: DAYS_PER_WEEK }, (_, day) =>
                weekStart.clone().add(day, "days"),
            ).find((date) => date.date() === 1);

            if (week === 0 || firstOfMonth) {
                const labelDate = firstOfMonth ?? weekStart;
                const label = months.createSpan();
                label.setText(labelDate.format("MMM"));
                label.style.left = `${week * 13}px`;
            }
        }
    }

    private _formatActivityTooltip(date: Moment, deckCounts?: DeckReviewCounts): string {
        const count = getReviewCount(deckCounts);
        const formattedDate = date.format("dddd, MMMM D, YYYY");
        if (count === 0) {
            return t("NO_CARDS_REVIEWED_ON", { date: formattedDate });
        }

        const breakdown = Object.entries(deckCounts ?? {})
            .sort(([deckA, countA], [deckB, countB]) =>
                countB === countA ? deckA.localeCompare(deckB) : countB - countA,
            )
            .map(([deck, deckCount]) => `${deck}: ${deckCount}`)
            .join(" • ");
        return `${t("CARDS_REVIEWED_ON", { count, date: formattedDate })} • ${breakdown}`;
    }
}
