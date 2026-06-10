import { CardType } from "src/card/questions/question";
import { CardFrontBackUtil, QuestionTypeClozeFormatter } from "src/card/questions/question-type";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings";

test("CardType.MultiLineBasic expands bounded cards", () => {
    expect(
        CardFrontBackUtil.expand(
            CardType.MultiLineBasic,
            `===front===
Question
===back===
Answer
===end===`,
            DEFAULT_SETTINGS,
        ),
    ).toEqual([{ front: "Question", back: "Answer" }]);
});

test("CardType.MultiLineBasic preserves multiline front and back content", () => {
    expect(
        CardFrontBackUtil.expand(
            CardType.MultiLineBasic,
            `===front===
Question line 1
Question line 2
===back===
Answer line 1
Answer line 2
===end===`,
            DEFAULT_SETTINGS,
        ),
    ).toEqual([
        {
            front: "Question line 1\nQuestion line 2",
            back: "Answer line 1\nAnswer line 2",
        },
    ]);
});

test("CardType.MultiLineBasic uses configured bounded markers", () => {
    const settings: SRSettings = {
        ...DEFAULT_SETTINGS,
        multilineCardStartMarker: "START",
        multilineCardScopedSeparator: "BACK",
        multilineCardScopedEndMarker: "END",
    };

    expect(
        CardFrontBackUtil.expand(
            CardType.MultiLineBasic,
            `START
Question
BACK
Answer
END`,
            settings,
        ),
    ).toEqual([{ front: "Question", back: "Answer" }]);
});

test("CardType.Cloze", () => {
    const clozeFormatter = new QuestionTypeClozeFormatter();
    expect(clozeFormatter.asking()).toEqual("<span style='color:#2196f3'>[...]</span>");
    expect(clozeFormatter.asking("", "some hint")).toEqual(
        "<span style='color:#2196f3'>[some hint]</span>",
    );

    const settings: SRSettings = {
        ...DEFAULT_SETTINGS,
        clozePatterns: ["**[123;;]answer[;;hint]**"],
    };

    expect(
        CardFrontBackUtil.expand(CardType.Cloze, "This is a very **interesting** test", settings),
    ).toEqual([
        {
            front: "This is a very <span style='color:#2196f3'>[...]</span> test",
            back: "This is a very <span style='color:#2196f3'>interesting</span> test",
        },
    ]);
});
