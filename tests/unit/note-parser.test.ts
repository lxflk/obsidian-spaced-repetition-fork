import { TopicPath } from "src/deck/topic-path";
import { Note } from "src/note/note";
import { NoteParser } from "src/note/note-parser";
import { DEFAULT_SETTINGS } from "src/settings";
import { setupStaticDateProvider20230906 } from "src/utils/dates";
import { TextDirection } from "src/utils/strings";

import { UnitTestSRFile } from "./helpers/unit-test-file";
import { unitTestSetupStandardDataStoreAlgorithm } from "./helpers/unit-test-setup";

const parser: NoteParser = new NoteParser(DEFAULT_SETTINGS);

beforeAll(() => {
    setupStaticDateProvider20230906();
    unitTestSetupStandardDataStoreAlgorithm(DEFAULT_SETTINGS);
});

describe("Multiple questions in the text", () => {
    test("Bounded cards: No schedule info", async () => {
        const noteText: string = `#flashcards/test
===front===
Q1
===back===
A1
===end=== ^sr-q1

===front===
Q2
===back===
A2
===end=== ^sr-q2

===front===
Q3
===back===
A3
===end=== ^sr-q3
`;
        const file: UnitTestSRFile = new UnitTestSRFile(noteText);
        const folderTopicPath = TopicPath.emptyPath;
        const note: Note = await parser.parse(file, TextDirection.Ltr, folderTopicPath);
        const questionList = note.questionList;
        expect(questionList.length).toEqual(3);
    });
});
