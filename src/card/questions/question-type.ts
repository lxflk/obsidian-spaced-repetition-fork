import { ClozeCrafter, IClozeFormatter } from "clozecraft";

import { CardType } from "src/card/questions/question";
import { SettingsUtil, SRSettings } from "src/settings";
import { findLineIndexOfSearchStringIgnoringWs } from "src/utils/strings";

export class CardFrontBack {
    front: string;
    back: string;

    // The caller is responsible for any required trimming of leading/trailing spaces
    constructor(front: string, back: string) {
        this.front = front;
        this.back = back;
    }
}

export class CardFrontBackUtil {
    static expand(
        questionType: CardType,
        questionText: string,
        settings: SRSettings,
    ): CardFrontBack[] {
        const handler: IQuestionTypeHandler = QuestionTypeFactory.create(questionType);
        return handler.expand(questionText, settings);
    }
}

export interface IQuestionTypeHandler {
    expand(questionText: string, settings: SRSettings): CardFrontBack[];
}

class QuestionTypeMultiLineBasic implements IQuestionTypeHandler {
    expand(questionText: string, settings: SRSettings): CardFrontBack[] {
        // We don't need to worry about "\r\n", as multi line questions processed by parse() concatenates lines explicitly with "\n"
        const questionLines = questionText.split("\n");
        const blockConfig = SettingsUtil.getMultilineCardBlockConfig(settings);

        if (
            !blockConfig ||
            questionLines[0]?.trim() !== blockConfig.startMarker ||
            questionLines[questionLines.length - 1]?.trim() !== blockConfig.endMarker
        ) {
            return [];
        }

        const lineIdx = findLineIndexOfSearchStringIgnoringWs(questionLines, blockConfig.separator);
        if (lineIdx < 1) {
            return [];
        }

        const side1: string = questionLines.slice(1, lineIdx).join("\n");
        const side2: string = questionLines.slice(lineIdx + 1, -1).join("\n");

        const result: CardFrontBack[] = [new CardFrontBack(side1, side2)];
        return result;
    }
}

class QuestionTypeCloze implements IQuestionTypeHandler {
    expand(questionText: string, settings: SRSettings): CardFrontBack[] {
        const clozecrafter = new ClozeCrafter(settings.clozePatterns);
        const clozeNote = clozecrafter.createClozeNote(questionText);

        // Determine which question formatter to use based on settings (Cloze patterns as inputs or not).
        const clozeFormatter = settings.convertClozePatternsToInputs
            ? new QuestionTypeClozeInputFormatter()
            : new QuestionTypeClozeFormatter();

        let front: string, back: string;
        const result: CardFrontBack[] = [];
        for (let i = 0; i < clozeNote.numCards; i++) {
            front = clozeNote.getCardFront(i, clozeFormatter);
            back = clozeNote.getCardBack(i, clozeFormatter);
            result.push(new CardFrontBack(front, back));
        }

        return result;
    }
}

export class QuestionTypeClozeFormatter implements IClozeFormatter {
    asking(answer?: string, hint?: string): string {
        return `<span style='color:#2196f3'>${!hint ? "[...]" : `[${hint}]`}</span>`;
    }

    showingAnswer(answer: string, _hint?: string): string {
        return `<span style='color:#2196f3'>${answer}</span>`;
    }

    hiding(answer?: string, hint?: string): string {
        return `<span style='color:var(--code-comment)'>${!hint ? "[...]" : `[${hint}]`}</span>`;
    }
}

export class QuestionTypeClozeInputFormatter implements IClozeFormatter {
    asking(answer?: string, hint?: string): string {
        return `<span style='color:#2196f3'><input class="cloze-input" type="text" size="${!answer ? 1 : answer.length}" />${!hint ? "" : `[${hint}]`}</span>`;
    }

    showingAnswer(answer: string, _hint?: string): string {
        return `<span class="cloze-answer" style='color:#2196f3'>${answer}</span>`;
    }

    hiding(answer?: string, hint?: string): string {
        return `<span style='color:var(--code-comment)'>${!hint ? "[...]" : `[${hint}]`}</span>`;
    }
}

export class QuestionTypeFactory {
    static create(questionType: CardType): IQuestionTypeHandler {
        let handler: IQuestionTypeHandler;
        switch (questionType) {
            case CardType.MultiLineBasic:
                handler = new QuestionTypeMultiLineBasic();
                break;
            case CardType.Cloze:
                handler = new QuestionTypeCloze();
                break;
        }
        return handler;
    }
}
