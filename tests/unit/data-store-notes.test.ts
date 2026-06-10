import { RepItemScheduleInfoOsr } from "src/algorithms/osr/rep-item-schedule-info-osr";
import { DataStore } from "src/data-stores/base/data-store";
import { TopicPath } from "src/deck/topic-path";
import { NoteParser } from "src/note/note-parser";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { TextDirection } from "src/utils/strings";

import { UnitTestSRFile } from "./helpers/unit-test-file";
import { unitTestSetupStandardDataStoreAlgorithm } from "./helpers/unit-test-setup";

const boundedSettings: SRSettings = {
    ...DEFAULT_SETTINGS,
    flashcardTags: ["#IB-Deck"],
    multilineCardEndMarker: "",
    multilineCardStartMarker: "===front===",
    multilineCardScopedSeparator: "===back===",
    multilineCardScopedEndMarker: "===end===",
    cardCommentOnSameLine: false,
};

async function parseSingleQuestion(file: UnitTestSRFile) {
    const note = await new NoteParser(boundedSettings).parse(
        file,
        TextDirection.Ltr,
        TopicPath.emptyPath,
    );
    return note.questionList[0];
}

beforeEach(() => {
    unitTestSetupStandardDataStoreAlgorithm(boundedSettings);
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe("StoreInNotes.questionWriteSchedule", () => {
    test("appends schedule after a bounded multiline card with blank lines", async () => {
        const file = new UnitTestSRFile(
            `#IB-Deck

===front===
Where is normal microbiota found in the human body?
===back===
Normal microbiota can be found in several body sites, including:

- Skin
- External ear canal
- Upper respiratory tract
- Gastrointestinal tract
- Urethra
- Genitalia
- Eye

In the GI tract, microbial concentration increases progressively because conditions become **less acidic**.
===end===
`,
            "lecture-13.md",
        );
        const question = await parseSingleQuestion(file);

        question.cards[0].scheduleInfo = RepItemScheduleInfoOsr.fromDueDateStr(
            "2026-06-14",
            4,
            204,
        );
        await DataStore.getInstance().questionWriteSchedule(question);

        expect(file.content).toContain("===end===\n<!--SR:!2026-06-14,4,204-->");
    });

    test("throws instead of silently accepting a stale source card", async () => {
        const file = new UnitTestSRFile(
            `#IB-Deck

===front===
Original question?
===back===
Answer
===end===
`,
            "stale-card.md",
        );
        const question = await parseSingleQuestion(file);
        file.content = file.content.replace("Original question?", "Edited question?");
        question.cards[0].scheduleInfo = RepItemScheduleInfoOsr.fromDueDateStr(
            "2026-06-14",
            4,
            204,
        );
        jest.spyOn(console, "error").mockImplementation(() => undefined);

        await expect(DataStore.getInstance().questionWriteSchedule(question)).rejects.toThrow(
            "source text was not found",
        );
        expect(file.content).not.toContain("<!--SR:");
    });
});
