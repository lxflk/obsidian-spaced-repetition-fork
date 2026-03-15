import { App, TFile, ViewState, WorkspaceLeaf } from "obsidian";

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

function getMarkdownViewMode(viewState: ViewState): "source" | "preview" | undefined {
    if (viewState.type !== "markdown") {
        return undefined;
    }

    const mode = viewState.state?.mode;
    return mode === "source" || mode === "preview" ? mode : undefined;
}

export async function openMarkdownFileInLeaf(
    leaf: WorkspaceLeaf,
    file: TFile,
    line?: number,
): Promise<void> {
    const currentViewState = leaf.getViewState();
    const nextViewState: ViewState = {
        type: "markdown",
        active: true,
        state: {
            file: file.path,
        },
    };

    const mode = getMarkdownViewMode(currentViewState);
    if (mode) {
        nextViewState.state = {
            ...nextViewState.state,
            mode,
        };
    }

    if (currentViewState.pinned !== undefined) {
        nextViewState.pinned = currentViewState.pinned;
    }

    if (currentViewState.group) {
        nextViewState.group = currentViewState.group;
    }

    // Bypass plugins that monkey-patch openFile() and redirect the target leaf.
    await leaf.setViewState(nextViewState, line === undefined ? undefined : { line });
}
