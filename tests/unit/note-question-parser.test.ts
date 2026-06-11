import { RepItemScheduleInfoOsr } from "src/algorithms/osr/rep-item-schedule-info-osr";
import { CardType, Question } from "src/card/questions/question";
import { DataStore } from "src/data-stores/base/data-store";
import { TopicPath } from "src/deck/topic-path";
import { Note } from "src/note/note";
import { NoteQuestionParser } from "src/note/note-question-parser";
import { DEFAULT_SETTINGS } from "src/settings";
import { setupStaticDateProvider20230906 } from "src/utils/dates";
import { TextDirection } from "src/utils/strings";

import { UnitTestSRFile } from "./helpers/unit-test-file";
import { unitTestSetupStandardDataStoreAlgorithm } from "./helpers/unit-test-setup";
import { createTestNoteQuestionParser } from "./sample-items";

async function parseQuestions(noteText: string, path: string = "note.md"): Promise<Question[]> {
    const parser: NoteQuestionParser = createTestNoteQuestionParser(DEFAULT_SETTINGS);
    return await parser.createQuestionList(
        new UnitTestSRFile(noteText, path),
        TextDirection.Ltr,
        TopicPath.emptyPath,
        true,
    );
}

beforeAll(() => {
    setupStaticDateProvider20230906();
    unitTestSetupStandardDataStoreAlgorithm(DEFAULT_SETTINGS);
});

describe("NoteQuestionParser", () => {
    test("parses bounded cards and expands front/back", async () => {
        const questions = await parseQuestions(`#flashcards/test
===front===
Question
===back===
Answer
===end=== ^sr-existing
`);

        expect(questions).toHaveLength(1);
        expect(questions[0]).toMatchObject({
            questionType: CardType.MultiLineBasic,
            lineNo: 1,
            hasChanged: false,
        });
        expect(questions[0].questionText.actualQuestion).toBe(`===front===
Question
===back===
Answer
===end===`);
        expect(questions[0].questionText.obsidianBlockId).toBe("^sr-existing");
        expect(questions[0].cards[0].front).toBe("Question");
        expect(questions[0].cards[0].back).toBe("Answer");
        expect(questions[0].topicPathList.format("|")).toBe("#flashcards/test");
    });

    test("parses schedule comments below bounded cards", async () => {
        const questions = await parseQuestions(`#flashcards/test
===front===
Question
===back===
Answer
===end=== ^sr-existing
<!--SR:!2023-09-03,1,230-->
`);

        expect(questions[0].cards[0].scheduleInfo).toMatchObject({
            interval: 1,
            latestEase: 230,
        });
        expect(questions[0].cards[0].scheduleInfo.formatDueDate()).toBe("2023-09-03");
    });

    test("adds deterministic IDs to bounded cards missing one", async () => {
        const questions = await parseQuestions(
            `#flashcards/test
===front===
Question
===back===
Answer
===end===
`,
            "missing-id.md",
        );

        expect(questions[0].hasChanged).toBe(true);
        expect(questions[0].questionText.obsidianBlockId).toMatch(/^\^sr-[a-f0-9]+$/);
        expect(questions[0].formatForNote(DEFAULT_SETTINGS)).toContain(
            `===end=== ${questions[0].questionText.obsidianBlockId}`,
        );
    });

    test("adds IDs to cloze cards", async () => {
        const questions = await parseQuestions(
            `#flashcards/test
A ==[1;;]hidden[;;hint]== card
`,
            "cloze-id.md",
        );

        expect(questions).toHaveLength(1);
        expect(questions[0].questionType).toBe(CardType.Cloze);
        expect(questions[0].hasChanged).toBe(true);
        expect(questions[0].questionText.obsidianBlockId).toMatch(/^\^sr-[a-f0-9]+$/);
        expect(questions[0].formatForNote(DEFAULT_SETTINGS)).toMatch(
            /^A ==\[1;;]hidden\[;;hint]== card \^sr-[a-f0-9]+$/,
        );
    });

    test("repairs duplicate card IDs by changing later duplicates", async () => {
        const questions = await parseQuestions(`#flashcards/test
===front===
Q1
===back===
A1
===end=== ^sr-duplicate

===front===
Q2
===back===
A2
===end=== ^sr-duplicate
`);

        expect(questions[0].questionText.obsidianBlockId).toBe("^sr-duplicate");
        expect(questions[0].hasChanged).toBe(false);
        expect(questions[1].questionText.obsidianBlockId).toMatch(/^\^sr-[a-f0-9]+$/);
        expect(questions[1].questionText.obsidianBlockId).not.toBe("^sr-duplicate");
        expect(questions[1].hasChanged).toBe(true);
    });

    test("keeps generated IDs stable when an earlier bounded card gets a schedule", async () => {
        const file = new UnitTestSRFile(
            `#flashcards/test
===front===
Q1
===back===
A1
===end===

===front===
Q2
===back===
A2
===end===
`,
            "stable-generated-ids.md",
        );
        const questions = await parseQuestions(file.content, file.path);
        const note = new Note(file, questions);
        questions[0].note = note;
        const secondQuestionBlockId = questions[1].questionText.obsidianBlockId;

        questions[0].cards[0].scheduleInfo = RepItemScheduleInfoOsr.fromDueDateStr(
            "2023-09-10",
            4,
            270,
        );
        await DataStore.getInstance().questionWriteSchedule(questions[0]);

        const reparsedQuestions = await parseQuestions(file.content, file.path);

        expect(reparsedQuestions[1].questionText.obsidianBlockId).toBe(secondQuestionBlockId);
    });

    test("does not parse removed manual syntaxes", async () => {
        const questions = await parseQuestions(`#flashcards/test
Q1::A1
Q2
?
A2
`);

        expect(questions).toEqual([]);
    });
});
