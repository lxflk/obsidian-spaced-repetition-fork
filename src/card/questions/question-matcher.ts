import { Question } from "src/card/questions/question";

export function findMatchingQuestion(
    questionList: Question[],
    currentQuestion: Question,
): Question | null {
    const currentBlockId = currentQuestion?.questionText?.obsidianBlockId;
    if (!currentBlockId) {
        return null;
    }

    const matches = questionList.filter(
        (question) => question.questionText?.obsidianBlockId === currentBlockId,
    );

    return matches.length === 1 ? matches[0] : null;
}
