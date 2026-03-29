import { Question } from "src/card/questions/question";

function chooseBestQuestionMatch(
    matches: Question[],
    preferredLineNo: number | null | undefined,
): Question | null {
    if (matches.length === 0) {
        return null;
    }

    if (preferredLineNo !== null && preferredLineNo !== undefined) {
        const lineMatch = matches.find((question) => question.lineNo === preferredLineNo);
        if (lineMatch) {
            return lineMatch;
        }
    }

    return matches[0];
}

export function findMatchingQuestion(
    questionList: Question[],
    currentQuestion: Question,
): Question | null {
    if (!currentQuestion) {
        return null;
    }

    const currentBlockId = currentQuestion.questionText?.obsidianBlockId;
    if (currentBlockId) {
        const blockIdMatch = questionList.find(
            (question) => question.questionText?.obsidianBlockId === currentBlockId,
        );
        if (blockIdMatch) {
            return blockIdMatch;
        }
    }

    const currentTextHash = currentQuestion.questionText?.textHash;
    if (currentTextHash) {
        const textHashMatch = chooseBestQuestionMatch(
            questionList.filter((question) => question.questionText?.textHash === currentTextHash),
            currentQuestion.lineNo,
        );
        if (textHashMatch) {
            return textHashMatch;
        }
    }

    const currentOriginalText = currentQuestion.questionText?.original;
    if (currentOriginalText) {
        const originalTextMatch = chooseBestQuestionMatch(
            questionList.filter(
                (question) => question.questionText?.original === currentOriginalText,
            ),
            currentQuestion.lineNo,
        );
        if (originalTextMatch) {
            return originalTextMatch;
        }
    }

    return questionList.find((question) => question.lineNo === currentQuestion.lineNo) ?? null;
}
