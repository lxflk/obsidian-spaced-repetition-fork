import { Question } from "src/card/questions/question";
import { findMatchingQuestion } from "src/card/questions/question-matcher";
import { TopicPath } from "src/deck/topic-path";
import { NoteQuestionParser } from "src/note/note-question-parser";
import { DEFAULT_SETTINGS } from "src/settings";
import { TextDirection } from "src/utils/strings";

import { UnitTestSRFile } from "./helpers/unit-test-file";
import { unitTestSetupStandardDataStoreAlgorithm } from "./helpers/unit-test-setup";
import { createTestNoteQuestionParser } from "./sample-items";

async function parseQuestions(noteText: string): Promise<Question[]> {
    const parser: NoteQuestionParser = createTestNoteQuestionParser(DEFAULT_SETTINGS);
    return await parser.createQuestionList(
        new UnitTestSRFile(noteText),
        TextDirection.Ltr,
        TopicPath.emptyPath,
        true,
    );
}

beforeAll(() => {
    unitTestSetupStandardDataStoreAlgorithm(DEFAULT_SETTINGS);
});

describe("findMatchingQuestion", () => {
    test("matches by block identifier even when the question moved", async () => {
        const originalQuestions = await parseQuestions(`#flashcards
Q1::A1
Q2::A2 ^question-two
`);
        const refreshedQuestions = await parseQuestions(`#flashcards
Intro text
Q1::A1
Q2::A2 ^question-two
`);

        const match = findMatchingQuestion(refreshedQuestions, originalQuestions[1]);

        expect(match?.lineNo).toBe(3);
        expect(match?.questionText.obsidianBlockId).toBe("^question-two");
    });

    test("matches by question text hash when schedule formatting changes and the question moved", async () => {
        const originalQuestions = await parseQuestions(`#flashcards
Q1::A1
Q2::A2
`);
        const refreshedQuestions = await parseQuestions(`#flashcards
Intro text
Q1::A1
Q2::A2
<!--SR:!2023-09-03,1,230-->
`);

        const match = findMatchingQuestion(refreshedQuestions, originalQuestions[1]);

        expect(match?.lineNo).toBe(3);
        expect(match?.questionText.actualQuestion).toBe("Q2::A2");
    });

    test("falls back to the line number when the question text changed in place", async () => {
        const originalQuestions = await parseQuestions(`#flashcards
Q1::A1
Q2::A2
`);
        const refreshedQuestions = await parseQuestions(`#flashcards
Q1::A1
Q2 updated::A2
`);

        const match = findMatchingQuestion(refreshedQuestions, originalQuestions[1]);

        expect(match?.lineNo).toBe(2);
        expect(match?.questionText.actualQuestion).toBe("Q2 updated::A2");
    });
});
