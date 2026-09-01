import { DEFAULT_SETTINGS } from "src/settings";
import { SidebarManager } from "src/ui/sidebar-manager";

jest.mock("src/ui/obsidian-ui-components/item-views/review-queue-list-view", () => ({
    REVIEW_QUEUE_VIEW_TYPE: "review-queue-list-view",
    ReviewQueueListView: jest.fn(),
}));

describe("SidebarManager", () => {
    test("ignores redraw requests until the deferred review queue view is available", () => {
        const plugin = {
            app: {
                workspace: {},
            },
        };
        const manager = new SidebarManager(plugin as never, DEFAULT_SETTINGS, {} as never);

        expect(() => manager.redraw()).not.toThrow();
    });

    test("creates the startup pane in the background and activates it on command", async () => {
        const leaf = {
            setViewState: jest.fn().mockResolvedValue(undefined),
        };
        const workspace = {
            getLeavesOfType: jest.fn().mockReturnValue([]),
            getRightLeaf: jest.fn().mockReturnValue(leaf),
            revealLeaf: jest.fn(),
        };
        const plugin = {
            app: { workspace },
        };
        const manager = new SidebarManager(plugin as never, DEFAULT_SETTINGS, {} as never);

        await manager.activateReviewQueueViewPanel();
        expect(leaf.setViewState).toHaveBeenLastCalledWith({
            type: "review-queue-list-view",
            active: false,
        });

        await manager.openReviewQueueView();
        expect(leaf.setViewState).toHaveBeenLastCalledWith({
            type: "review-queue-list-view",
            active: true,
        });
        expect(workspace.revealLeaf).toHaveBeenCalledWith(leaf);
    });
});
