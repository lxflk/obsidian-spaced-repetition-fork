import {
    addCardReview,
    getReviewCount,
    getReviewLevel,
    getSortedDeckReviewCounts,
    normalizeReviewHistory,
    ReviewHistory,
} from "src/review-history";

describe("review history", () => {
    test("records reviews by date and deck", () => {
        const history: ReviewHistory = {};

        addCardReview(history, "2026-08-31", "probability");
        addCardReview(history, "2026-08-31", "probability");
        addCardReview(history, "2026-08-31", "sql");

        expect(history).toEqual({
            "2026-08-31": {
                probability: 2,
                sql: 1,
            },
        });
        expect(getReviewCount(history["2026-08-31"])).toBe(3);
    });

    test("normalizes persisted data and drops invalid entries", () => {
        expect(
            normalizeReviewHistory({
                "2026-08-31": { probability: 2, sql: 0, pandas: -1, empty: "3" },
                invalid: { probability: 4 },
                "2026-08-30": null,
            }),
        ).toEqual({
            "2026-08-31": { probability: 2 },
        });
    });

    test("maps review totals to one of four contribution levels", () => {
        expect(getReviewLevel(0, 20)).toBe(0);
        expect(getReviewLevel(1, 20)).toBe(1);
        expect(getReviewLevel(6, 20)).toBe(2);
        expect(getReviewLevel(11, 20)).toBe(3);
        expect(getReviewLevel(20, 20)).toBe(4);
    });

    test("sorts the deck breakdown by review count and then deck name", () => {
        expect(
            getSortedDeckReviewCounts({
                sql: 2,
                probability: 3,
                pandas: 2,
            }),
        ).toEqual([
            ["probability", 3],
            ["pandas", 2],
            ["sql", 2],
        ]);
        expect(getSortedDeckReviewCounts(undefined)).toEqual([]);
    });
});
