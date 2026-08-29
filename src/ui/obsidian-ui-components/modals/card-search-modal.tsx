import { App, FuzzyMatch, FuzzySuggestModal, renderMatches } from "obsidian";

import { Card } from "src/card/card";

export class CardSearchModal extends FuzzySuggestModal<Card> {
    private readonly cards: Card[];
    private readonly submitCallback: (card: Card) => void;

    constructor(app: App, cards: Card[], submitCallback: (card: Card) => void) {
        super(app);
        this.cards = cards;
        this.submitCallback = submitCallback;
        this.limit = 20;
        this.emptyStateText = "No matching cards";
        this.setPlaceholder("Search card fronts…");
        this.setInstructions([
            { command: "↑↓", purpose: "navigate" },
            { command: "↵", purpose: "select next card" },
            { command: "esc", purpose: "close" },
        ]);
        this.modalEl.addClass("sr-card-search-modal");
    }

    getItems(): Card[] {
        return this.cards;
    }

    getItemText(card: Card): string {
        return CardSearchModal.normalizeFront(card.front);
    }

    renderSuggestion(match: FuzzyMatch<Card>, el: HTMLElement): void {
        const front = this.getItemText(match.item);
        const frontEl = el.createDiv("sr-card-search-suggestion-front");
        renderMatches(frontEl, front, match.match.matches);

        const notePath = match.item.question?.note?.filePath;
        if (notePath) {
            el.createDiv({ cls: "sr-card-search-suggestion-note", text: notePath });
        }
    }

    onChooseItem(card: Card, _: MouseEvent | KeyboardEvent): void {
        this.close();
        this.submitCallback(card);
    }

    private static normalizeFront(front: string): string {
        return front.replace(/\s+/g, " ").trim();
    }
}
