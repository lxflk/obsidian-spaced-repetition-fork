import { Deck } from "src/deck/deck";
import { TopicPath } from "src/deck/topic-path";
import { Note } from "src/note/note";
import { NoteFileLoader } from "src/note/note-file-loader";
import { NoteParser } from "src/note/note-parser";
import { DEFAULT_SETTINGS } from "src/settings";
import { TextDirection } from "src/utils/strings";

import { UnitTestSRFile } from "./helpers/unit-test-file";
import { unitTestSetupStandardDataStoreAlgorithm } from "./helpers/unit-test-setup";

const parser: NoteParser = new NoteParser(DEFAULT_SETTINGS);
const noteFileLoader: NoteFileLoader = new NoteFileLoader(DEFAULT_SETTINGS);

beforeAll(() => {
    unitTestSetupStandardDataStoreAlgorithm(DEFAULT_SETTINGS);
});

describe("appendCardsToDeck", () => {
    test("Multiple bounded questions, single card per question", async () => {
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
        const deck: Deck = Deck.emptyDeck;
        note.appendCardsToDeck(deck);
        const subdeck: Deck = deck.getDeck(new TopicPath(["flashcards", "test"]));
        expect(subdeck.newFlashcards[0].front).toEqual("Q1");
        expect(subdeck.newFlashcards[1].front).toEqual("Q2");
        expect(subdeck.newFlashcards[2].front).toEqual("Q3");
        expect(subdeck.dueFlashcards.length).toEqual(0);
    });
});

describe("writeNoteFile", () => {
    test("Multiple questions, some with too many schedule details", async () => {
        const originalText: string = `#flashcards/test
===front===
Q1
===back===
A1
===end=== ^sr-q1

#flashcards
===front===
Q2
===back===
A2
===end=== ^sr-q2
<!--SR:!2023-09-02,4,270!2023-09-02,5,270-->

===front===
Q3
===back===
A3
===end=== ^sr-q3
<!--SR:!2023-09-02,4,270!2023-09-02,5,270-->
`;
        const file: UnitTestSRFile = new UnitTestSRFile(originalText);
        const note: Note = await noteFileLoader.load(file, TextDirection.Ltr, TopicPath.emptyPath);

        await note.writeNoteFile(DEFAULT_SETTINGS);

        expect(file.content).toEqual(`#flashcards/test
===front===
Q1
===back===
A1
===end=== ^sr-q1

#flashcards
===front===
Q2
===back===
A2
===end=== ^sr-q2
<!--SR:!2023-09-02,4,270-->

===front===
Q3
===back===
A3
===end=== ^sr-q3
<!--SR:!2023-09-02,4,270-->
`);
    });

    test("adds IDs to duplicated bounded cards by line range", async () => {
        const originalText: string = `#flashcards/test
===front===
Same
===back===
Same answer
===end===

===front===
Same
===back===
Same answer
===end===
`;
        const file: UnitTestSRFile = new UnitTestSRFile(originalText, "duplicate-text.md");
        const note: Note = await noteFileLoader.load(file, TextDirection.Ltr, TopicPath.emptyPath);

        await note.writeNoteFile(DEFAULT_SETTINGS);

        const ids = [...file.content.matchAll(/ \^sr-[a-f0-9]+/g)].map((match) => match[0].trim());
        expect(ids).toHaveLength(2);
        expect(new Set(ids).size).toBe(2);
    });
});
