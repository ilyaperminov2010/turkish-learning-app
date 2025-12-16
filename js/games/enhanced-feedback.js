/**
 * Enhanced Feedback Component
 * Компонент расширенной обратной связи при ошибке
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { normalizeAnswer } from './translation.js';

/**
 * Подсветка различий между строками
 * @param {string} userAnswer - ответ пользователя
 * @param {string} correctAnswer - правильный ответ
 * @returns {object} - объект с подсвеченными различиями
 */
export function highlightDifferences(userAnswer, correctAnswer) {
    const userWords = userAnswer.split(' ').filter(w => w.length > 0);
    const correctWords = correctAnswer.split(' ').filter(w => w.length > 0);
    
    return {
        user: userWords.map((word, i) => ({
            text: word,
            correct: correctWords[i] && normalizeAnswer(correctWords[i]) === normalizeAnswer(word)
        })),
        correct: correctWords.map((word, i) => ({
            text: word,
            missing: !userWords[i] || normalizeAnswer(userWords[i]) !== normalizeAnswer(word)
        }))
    };
}

/**
 * Рендеринг расширенной обратной связи при ошибке
 * @param {object} options - параметры
 * @returns {string} - HTML
 */
export function renderEnhancedFeedback(options) {
    const { userAnswer, correctAnswer, chunk, onContinue, speakFn } = options;
    const differences = highlightDifferences(userAnswer || '', correctAnswer);

    return `
        <div class="feedback feedback--incorrect">
            <div class="feedback__header">
                <span class="feedback__icon">❌</span>
                <span class="feedback__title">Неправильно</span>
            </div>
            
            ${userAnswer ? `
                <div class="feedback__section">
                    <div class="feedback__label">Ваш ответ:</div>
                    <div class="feedback__user-answer">
                        ${differences.user.map(w => 
                            `<span class="${w.correct ? '' : 'feedback__wrong'}">${w.text}</span>`
                        ).join(' ')}
                    </div>
                </div>
            ` : ''}
            
            <div class="feedback__section">
                <div class="feedback__label">Правильный ответ:</div>
                <div class="feedback__correct-answer">
                    ${differences.correct.map(w => 
                        `<span class="${w.missing ? 'feedback__highlight' : ''}">${w.text}</span>`
                    ).join(' ')}
                </div>
                ${speakFn ? `<button class="btn btn--secondary mt-1" onclick="${speakFn}">🔊</button>` : ''}
            </div>
            
            ${chunk.grammarNote ? `
                <div class="feedback__section">
                    <div class="feedback__label">📝 Грамматика:</div>
                    <div class="feedback__grammar">${chunk.grammarNote}</div>
                </div>
            ` : ''}
            
            ${chunk.example ? `
                <div class="feedback__section">
                    <div class="feedback__label">Пример использования:</div>
                    <div class="feedback__example">
                        <div class="feedback__example-turkish">${chunk.example}</div>
                        <div class="feedback__example-russian">${chunk.exampleTranslation || ''}</div>
                    </div>
                </div>
            ` : ''}
            
            <button class="btn btn--primary btn--block feedback__continue" onclick="${onContinue}">
                Понятно, продолжить
            </button>
        </div>
    `;
}

export default { renderEnhancedFeedback, highlightDifferences };
