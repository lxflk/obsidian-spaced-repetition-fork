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
        new UnitTestSRFile(noteText, "matcher.md"),
        TextDirection.Ltr,
        TopicPath.emptyPath,
        true,
    );
}

beforeAll(() => {
    unitTestSetupStandardDataStoreAlgorithm(DEFAULT_SETTINGS);
});

describe("findMatchingQuestion", () => {
    test("matches by a unique block identifier when the question moved and changed text", async () => {
        const originalQuestions = await parseQuestions(`#flashcards
===front===
Q1
===back===
A1
===end=== ^sr-one

===front===
Q2
===back===
A2
===end=== ^sr-two
`);
        const refreshedQuestions = await parseQuestions(`#flashcards
Intro text

===front===
Q1
===back===
A1
===end=== ^sr-one

===front===
Q2 edited
===back===
A2 edited
===end=== ^sr-two
`);

        const match = findMatchingQuestion(refreshedQuestions, originalQuestions[1]);

        expect(match?.lineNo).toBe(9);
        expect(match?.questionText.obsidianBlockId).toBe("^sr-two");
        expect(match?.questionText.actualQuestion).toContain("Q2 edited");
    });

    test("does not match without a current block identifier", async () => {
        const questions = await parseQuestions(`#flashcards
===front===
Q1
===back===
A1
===end=== ^sr-one
`);
        questions[0].questionText.obsidianBlockId = null;

        expect(findMatchingQuestion(questions, questions[0])).toBeNull();
    });

    test("does not match duplicate refreshed block identifiers", async () => {
        const questions = await parseQuestions(`#flashcards
===front===
Q1
===back===
A1
===end=== ^sr-one

===front===
Q2
===back===
A2
===end=== ^sr-two
`);
        questions[1].questionText.obsidianBlockId = "^sr-one";

        expect(findMatchingQuestion(questions, questions[0])).toBeNull();
    });
});
