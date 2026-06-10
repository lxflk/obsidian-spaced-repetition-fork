import { ClozeCrafter } from "clozecraft";

import { CardType } from "src/card/questions/question";

export let debugParser = false;

export interface ParserOptions {
    multilineCardStartMarker: string;
    multilineCardScopedSeparator: string;
    multilineCardScopedEndMarker: string;
    clozePatterns: string[];
}

export function setDebugParser(value: boolean) {
    debugParser = value;
}

export class ParsedQuestionInfo {
    cardType: CardType;
    text: string;

    // Line numbers start at 0
    firstLineNum: number;
    lastLineNum: number;

    constructor(cardType: CardType, text: string, firstLineNum: number, lastLineNum: number) {
        this.cardType = cardType;
        this.text = text;
        this.firstLineNum = firstLineNum;
        this.lastLineNum = lastLineNum;
    }

    isQuestionLineNum(lineNum: number): boolean {
        return lineNum >= this.firstLineNum && lineNum <= this.lastLineNum;
    }
}

interface MultilineCardBlockConfig {
    startMarker: string;
    separator: string;
    endMarker: string;
}

interface ActiveMultilineCardBlock {
    hasFrontContent: boolean;
    hasSeparator: boolean;
}

function getMultilineCardBlockConfig(options: ParserOptions): MultilineCardBlockConfig | null {
    const startMarker = options.multilineCardStartMarker.trim();
    const separator = options.multilineCardScopedSeparator.trim();
    const endMarker = options.multilineCardScopedEndMarker.trim();

    if (!startMarker || !separator || !endMarker) {
        return null;
    }

    if (new Set([startMarker, separator, endMarker]).size !== 3) {
        return null;
    }

    return {
        startMarker,
        separator,
        endMarker,
    };
}

function lineHasScopedCardEndMarker(text: string, endMarker: string): boolean {
    if (!text.startsWith(endMarker)) {
        return false;
    }

    let remainder = text.slice(endMarker.length).trim();
    if (remainder.length === 0) {
        return true;
    }

    const tokenPatterns = [/^\^[a-zA-Z0-9-]+/, /^<!--SR:.+?-->/];
    while (remainder.length > 0) {
        const matchingToken = tokenPatterns
            .map((pattern) => remainder.match(pattern))
            .find((match) => match !== null);
        if (!matchingToken) {
            return false;
        }
        remainder = remainder.slice(matchingToken[0].length).trim();
    }

    return true;
}

/**
 * Returns flashcards found in `text`
 *
 * It is best that the text does not contain frontmatter, see extractFrontmatter for reasoning
 *
 * @param text - The text to extract flashcards from
 * @param ParserOptions - Parser options
 * @returns An array of parsed question information
 */
export function parse(text: string, options: ParserOptions): ParsedQuestionInfo[] {
    if (debugParser) {
        console.log("Text to parse:\n<<<" + text + ">>>");
    }

    const cards: ParsedQuestionInfo[] = [];
    let cardText = "";
    let cardType: CardType | null = null;
    let activeMultilineCardBlock: ActiveMultilineCardBlock | null = null;
    let firstLineNo = 0,
        lastLineNo: number;

    const multilineCardBlockConfig = getMultilineCardBlockConfig(options);
    const clozecrafter = new ClozeCrafter(options.clozePatterns);
    const lines: string[] = text.replaceAll("\r\n", "\n").split("\n");
    for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i],
            currentTrimmed = lines[i].trim();

        // Skip everything in HTML comments
        if (currentLine.startsWith("<!--") && !currentLine.startsWith("<!--SR:")) {
            while (i + 1 < lines.length && !currentLine.includes("-->")) i++;
            i++;
            continue;
        }

        if (activeMultilineCardBlock) {
            if (cardText.length > 0) {
                cardText += "\n";
            }
            cardText += currentLine.trimEnd();

            if (!activeMultilineCardBlock.hasSeparator) {
                if (currentTrimmed === multilineCardBlockConfig.separator) {
                    activeMultilineCardBlock.hasSeparator =
                        activeMultilineCardBlock.hasFrontContent;
                } else if (currentTrimmed.length > 0) {
                    activeMultilineCardBlock.hasFrontContent = true;
                }
            }

            if (lineHasScopedCardEndMarker(currentTrimmed, multilineCardBlockConfig.endMarker)) {
                if (
                    i + 1 < lines.length &&
                    !currentTrimmed.includes("<!--SR:") &&
                    lines[i + 1].startsWith("<!--SR:")
                ) {
                    cardText += "\n" + lines[i + 1];
                    i++;
                }

                if (activeMultilineCardBlock.hasSeparator) {
                    lastLineNo = i;
                    cards.push(
                        new ParsedQuestionInfo(
                            CardType.MultiLineBasic,
                            cardText.trimEnd(),
                            firstLineNo,
                            lastLineNo,
                        ),
                    );
                }

                cardType = null;
                cardText = "";
                activeMultilineCardBlock = null;
                firstLineNo = i + 1;
            }

            continue;
        }

        // Cloze cards continue until a blank line or the end of the note.
        const isEmptyLine = currentTrimmed.length === 0;
        if (isEmptyLine) {
            if (cardType) {
                lastLineNo = i - 1;
                cards.push(
                    new ParsedQuestionInfo(cardType, cardText.trimEnd(), firstLineNo, lastLineNo),
                );
                cardType = null;
            }

            cardText = "";
            firstLineNo = i + 1;
            continue;
        }

        if (multilineCardBlockConfig && currentTrimmed === multilineCardBlockConfig.startMarker) {
            cardText = currentLine.trimEnd();
            cardType = CardType.MultiLineBasic;
            activeMultilineCardBlock = {
                hasFrontContent: false,
                hasSeparator: false,
            };
            firstLineNo = i;
            continue;
        }

        if (currentLine.startsWith("```") || currentLine.startsWith("~~~")) {
            // Pick up codeblocks
            const codeBlockClose = currentLine.match(/`+|~+/)[0];
            while (i + 1 < lines.length && !lines[i + 1].startsWith(codeBlockClose)) {
                i++;
            }
            i++;
        } else if (cardType === null && clozecrafter.isClozeNote(currentLine)) {
            // Pick up cloze cards
            cardType = CardType.Cloze;
            cardText = currentLine.trimEnd();
            firstLineNo = i;
        } else if (cardType === CardType.Cloze) {
            if (cardText.length > 0) {
                cardText += "\n";
            }
            cardText += currentLine.trimEnd();
        }
    }

    // Do we have a card left in the queue?
    if (cardType && cardText && !activeMultilineCardBlock) {
        lastLineNo = lines.length - 1;
        cards.push(new ParsedQuestionInfo(cardType, cardText.trimEnd(), firstLineNo, lastLineNo));
    }

    if (debugParser) {
        console.log("Parsed cards:\n", cards);
    }

    return cards;
}
