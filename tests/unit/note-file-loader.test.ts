import { TopicPath } from "src/deck/topic-path";
import { Note } from "src/note/note";
import { NoteFileLoader } from "src/note/note-file-loader";
import { DEFAULT_SETTINGS } from "src/settings";
import { TextDirection } from "src/utils/strings";

import { UnitTestSRFile } from "./helpers/unit-test-file";
import { unitTestSetupStandardDataStoreAlgorithm } from "./helpers/unit-test-setup";

const noteFileLoader: NoteFileLoader = new NoteFileLoader(DEFAULT_SETTINGS);

beforeAll(() => {
    unitTestSetupStandardDataStoreAlgorithm(DEFAULT_SETTINGS);
});

describe("load", () => {
    test("Multiple questions, none with too many schedule details", async () => {
        const noteText: string = `#flashcards/test
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
`;
        const file: UnitTestSRFile = new UnitTestSRFile(noteText);
        const note: Note = await noteFileLoader.load(file, TextDirection.Ltr, TopicPath.emptyPath);
        expect(note.hasChanged).toEqual(false);
    });

    test("Multiple questions, some with too many schedule details", async () => {
        const noteText: string = `#flashcards/test
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
<!--SR:!2023-09-02,4,270!2023-09-02,4,270-->

===front===
Q3
===back===
A3
===end=== ^sr-q3
<!--SR:!2023-09-02,4,270-->
`;
        const file: UnitTestSRFile = new UnitTestSRFile(noteText);
        const note: Note = await noteFileLoader.load(file, TextDirection.Ltr, TopicPath.emptyPath);
        expect(note.hasChanged).toEqual(true);
    });
});
