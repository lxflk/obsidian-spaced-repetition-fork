import { CardType } from "src/card/questions/question";
import { parse, ParsedQuestionInfo, ParserOptions } from "src/parser";

const parserOptions: ParserOptions = {
    multilineCardStartMarker: "===front===",
    multilineCardScopedSeparator: "===back===",
    multilineCardScopedEndMarker: "===end===",
    clozePatterns: ["==[123;;]answer[;;hint]=="],
};

function parseT(text: string, options: ParserOptions = parserOptions) {
    const list: ParsedQuestionInfo[] = parse(text, options);
    return list.map((item) => [item.cardType, item.text, item.firstLineNum, item.lastLineNum]);
}

describe("bounded multiline cards", () => {
    test("parses a bounded card without an ID", () => {
        expect(
            parseT(`===front===
Question
===back===
Answer
===end===`),
        ).toEqual([
            [
                CardType.MultiLineBasic,
                `===front===
Question
===back===
Answer
===end===`,
                0,
                4,
            ],
        ]);
    });

    test("parses a bounded card with an ID", () => {
        expect(
            parseT(`Intro
===front===
Question
===back===
Answer
===end=== ^sr-abc123`),
        ).toEqual([
            [
                CardType.MultiLineBasic,
                `===front===
Question
===back===
Answer
===end=== ^sr-abc123`,
                1,
                5,
            ],
        ]);
    });

    test("parses a bounded card with schedule on the next line", () => {
        expect(
            parseT(`===front===
Question
===back===
Answer
===end=== ^sr-abc123
<!--SR:!2026-06-14,4,204-->`),
        ).toEqual([
            [
                CardType.MultiLineBasic,
                `===front===
Question
===back===
Answer
===end=== ^sr-abc123
<!--SR:!2026-06-14,4,204-->`,
                0,
                5,
            ],
        ]);
    });

    test("parses legacy same-line schedule variants", () => {
        expect(
            parseT(`===front===
Question
===back===
Answer
===end=== ^sr-abc123 <!--SR:!2026-06-14,4,204-->`),
        ).toEqual([
            [
                CardType.MultiLineBasic,
                `===front===
Question
===back===
Answer
===end=== ^sr-abc123 <!--SR:!2026-06-14,4,204-->`,
                0,
                4,
            ],
        ]);

        expect(
            parseT(`===front===
Question
===back===
Answer
===end=== <!--SR:!2026-06-14,4,204--> ^sr-abc123`),
        ).toEqual([
            [
                CardType.MultiLineBasic,
                `===front===
Question
===back===
Answer
===end=== <!--SR:!2026-06-14,4,204--> ^sr-abc123`,
                0,
                4,
            ],
        ]);
    });

    test("does not parse removed manual syntaxes", () => {
        expect(parseT("Question::Answer")).toEqual([]);
        expect(parseT("Question:::Answer")).toEqual([]);
        expect(parseT("Question\n?\nAnswer")).toEqual([]);
        expect(parseT("Question\n??\nAnswer")).toEqual([]);
    });
});

describe("cloze cards", () => {
    test("parses cloze cards", () => {
        expect(parseT("A ==[1;;]hidden[;;hint]== card")).toEqual([
            [CardType.Cloze, "A ==[1;;]hidden[;;hint]== card", 0, 0],
        ]);
    });

    test("ignores cloze syntax inside code fences", () => {
        expect(
            parseT(`\`\`\`
A ==[1;;]hidden[;;hint]== card
\`\`\``),
        ).toEqual([]);
    });
});
