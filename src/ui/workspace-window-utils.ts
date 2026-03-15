import { App, WorkspaceLeaf } from "obsidian";

export function getOrCreateSideBySideLeaf(
    app: App,
    sourceLeaf?: WorkspaceLeaf | null,
): WorkspaceLeaf {
    const workspace = app.workspace;
    const currentLeaf = sourceLeaf ?? workspace.activeLeaf;

    if (currentLeaf) {
        let targetLeaf: WorkspaceLeaf | null = null;

        workspace.iterateRootLeaves((leaf) => {
            if (targetLeaf || leaf === currentLeaf || leaf.parent === currentLeaf.parent) {
                return;
            }

            targetLeaf = workspace.getMostRecentLeaf(leaf.parent) ?? leaf;
        });

        if (targetLeaf) {
            return targetLeaf;
        }

        return workspace.createLeafBySplit(currentLeaf, "vertical");
    }

    return workspace.getLeaf("split", "vertical");
}
