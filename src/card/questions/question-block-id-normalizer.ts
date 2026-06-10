import { Question, QuestionText } from "src/card/questions/question";
import { SRSettings } from "src/settings";
import { cyrb53, splitTextIntoLineArray } from "src/utils/strings";

const BLOCK_ID_GLOBAL_REGEX = /(?:^|\s)(\^[a-zA-Z0-9-]+)(?=\s*(?:<!--SR:.+?-->)?\s*$)/gm;
const GENERATED_BLOCK_ID_PREFIX = "^sr-";

function collectBlockIdCounts(text: string): Map<string, number> {
    const result = new Map<string, number>();
    for (const match of text.matchAll(BLOCK_ID_GLOBAL_REGEX)) {
        const blockId = match[1];
        result.set(blockId, (result.get(blockId) ?? 0) + 1);
    }
    return result;
}

function collectQuestionBlockIdCounts(questionList: Question[]): Map<string, number> {
    const result = new Map<string, number>();
    for (const question of questionList) {
        const blockId = question.questionText.obsidianBlockId;
        if (blockId) {
            result.set(blockId, (result.get(blockId) ?? 0) + 1);
        }
    }
    return result;
}

function generateBlockId(question: Question, notePath: string, usedBlockIds: Set<string>): string {
    let attempt = 0;
    while (true) {
        const hashInput = [
            notePath,
            question.lineNo,
            question.questionText.actualQuestion,
            question.questionText.original,
            attempt,
        ].join("\n");
        const candidate = `${GENERATED_BLOCK_ID_PREFIX}${cyrb53(hashInput)}`;
        if (!usedBlockIds.has(candidate)) {
            return candidate;
        }
        attempt++;
    }
}

export function normalizeQuestionBlockIds(
    questionList: Question[],
    noteText: string,
    notePath: string,
): void {
    const allBlockIdCounts = collectBlockIdCounts(noteText);
    const questionBlockIdCounts = collectQuestionBlockIdCounts(questionList);
    const seenQuestionBlockIds = new Set<string>();
    const usedBlockIds = new Set<string>(allBlockIdCounts.keys());

    for (const question of questionList) {
        const currentBlockId = question.questionText.obsidianBlockId;
        const questionCount = currentBlockId ? (questionBlockIdCounts.get(currentBlockId) ?? 0) : 0;
        const allCount = currentBlockId ? (allBlockIdCounts.get(currentBlockId) ?? 0) : 0;
        const nonQuestionCount = allCount - questionCount;

        const canKeepExistingBlockId =
            currentBlockId && nonQuestionCount === 0 && !seenQuestionBlockIds.has(currentBlockId);

        if (canKeepExistingBlockId) {
            seenQuestionBlockIds.add(currentBlockId);
            continue;
        }

        const newBlockId = generateBlockId(question, notePath ?? "", usedBlockIds);
        usedBlockIds.add(newBlockId);
        question.questionText.obsidianBlockId = newBlockId;
        question.hasChanged = true;

        if (currentBlockId) {
            seenQuestionBlockIds.add(currentBlockId);
        }
    }
}

export function replaceQuestionsByLineRange(
    noteText: string,
    questionList: Question[],
    settings: SRSettings,
): string {
    const noteLines = splitTextIntoLineArray(noteText);
    const changedQuestions = questionList
        .filter((question) => question.hasChanged)
        .sort((a, b) => b.lineNo - a.lineNo);

    for (const question of changedQuestions) {
        const replacementText = question.formatForNote(settings);
        const replacementLines = splitTextIntoLineArray(replacementText);
        const firstLine = question.parsedQuestionInfo.firstLineNum;
        const lastLine = question.parsedQuestionInfo.lastLineNum;
        noteLines.splice(firstLine, lastLine - firstLine + 1, ...replacementLines);
        question.questionText = QuestionText.create(
            replacementText,
            question.questionText.textDirection,
            settings,
        );
    }

    return noteLines.join("\n");
}
