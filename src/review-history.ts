export type DeckReviewCounts = Record<string, number>;

export type ReviewHistory = Record<string, DeckReviewCounts>;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeReviewHistory(value: unknown): ReviewHistory {
    const history: ReviewHistory = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return history;
    }

    for (const [date, deckCounts] of Object.entries(value)) {
        if (
            !DATE_KEY_PATTERN.test(date) ||
            !deckCounts ||
            typeof deckCounts !== "object" ||
            Array.isArray(deckCounts)
        ) {
            continue;
        }

        const normalizedDeckCounts: DeckReviewCounts = {};
        for (const [deck, count] of Object.entries(deckCounts)) {
            if (deck.length > 0 && Number.isInteger(count) && (count as number) > 0) {
                normalizedDeckCounts[deck] = count as number;
            }
        }

        if (Object.keys(normalizedDeckCounts).length > 0) {
            history[date] = normalizedDeckCounts;
        }
    }

    return history;
}

export function addCardReview(history: ReviewHistory, date: string, deck: string): void {
    const deckCounts = history[date] ?? {};
    deckCounts[deck] = (deckCounts[deck] ?? 0) + 1;
    history[date] = deckCounts;
}

export function getReviewCount(deckCounts: DeckReviewCounts | undefined): number {
    return Object.values(deckCounts ?? {}).reduce((total, count) => total + count, 0);
}

export function getSortedDeckReviewCounts(
    deckCounts: DeckReviewCounts | undefined,
): Array<[string, number]> {
    return Object.entries(deckCounts ?? {}).sort(([deckA, countA], [deckB, countB]) =>
        countB === countA ? deckA.localeCompare(deckB) : countB - countA,
    );
}

export function getReviewLevel(count: number, maximumCount: number): number {
    if (count <= 0 || maximumCount <= 0) {
        return 0;
    }

    return Math.min(4, Math.max(1, Math.ceil((count / maximumCount) * 4)));
}
