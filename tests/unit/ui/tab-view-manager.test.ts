import { FlashcardReviewMode } from "src/card/flashcard-review-sequencer";
import { SRTabView } from "src/ui/obsidian-ui-components/item-views/sr-tab-view";
import TabViewManager from "src/ui/tab-view-manager";

jest.mock("src/ui/obsidian-ui-components/item-views/sr-tab-view", () => ({
    SRTabView: jest.fn(),
}));

const mockSRTabView = SRTabView as unknown as jest.Mock;

describe("TabViewManager", () => {
    beforeEach(() => {
        mockSRTabView.mockClear();
    });

    test("loads a restored tab as a normal review without requiring openSRTabView", async () => {
        const reviewableDeckTree = { name: "all cards" };
        const remainingDeckTree = { name: "remaining cards" };
        const preparedReviewSequencer = { reviewSequencer: {}, mode: FlashcardReviewMode.Review };
        const registerView = jest.fn();
        const sync = jest.fn().mockResolvedValue(undefined);
        const getPreparedReviewSequencer = jest.fn().mockReturnValue(preparedReviewSequencer);
        const plugin = {
            app: {
                workspace: {
                    getLeavesOfType: jest.fn().mockReturnValue([]),
                },
            },
            getPreparedReviewSequencer,
            osrAppCore: {
                remainingDeckTree,
                reviewableDeckTree,
            },
            registerView,
            sync,
        };

        new TabViewManager(plugin as never);

        const createView = registerView.mock.calls[0][1];
        createView({});
        const loadReviewSequencerData = mockSRTabView.mock.calls[0][2];

        await expect(loadReviewSequencerData()).resolves.toBe(preparedReviewSequencer);
        expect(sync).toHaveBeenCalledTimes(1);
        expect(getPreparedReviewSequencer).toHaveBeenCalledWith(
            reviewableDeckTree,
            remainingDeckTree,
            FlashcardReviewMode.Review,
        );
    });
});
