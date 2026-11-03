import { GUIDED_QUESTIONS } from './guidedQuestions.js';

const seenQuestionKeys = new Set();
const duplicateQuestionKeys = new Set();

const UNIQUE_GUIDED_QUESTIONS = GUIDED_QUESTIONS.filter((question) => {
    const questionKey = `${question.stepId}:${question.id}`;
    if (seenQuestionKeys.has(questionKey)) {
        duplicateQuestionKeys.add(questionKey);
        return false;
    }

    seenQuestionKeys.add(questionKey);
    return true;
});

if (duplicateQuestionKeys.size > 0) {
    console.error(
        'Duplicate guided-question IDs found. Only the first occurrence was loaded:',
        [...duplicateQuestionKeys]
    );
}

export async function fetchGuidedQuestions(stepId) {
    if (!stepId) return [];
    const questions = UNIQUE_GUIDED_QUESTIONS;
    return Array.isArray(questions)
        ? questions.filter((question) => question && String(question.stepId || '') === String(stepId))
        : [];
}
