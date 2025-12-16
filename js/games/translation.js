/**
 * Translation Game - Перевод предложений с русского на турецкий
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { speak } from '../tts.js';

/**
 * Генерация подсказки - первые буквы каждого слова
 * @param {string} turkish - турецкая фраза
 * @returns {string} - подсказка
 */
export function generateHint(turkish) {
    return turkish.split(' ')
        .map(word => {
            if (word.length === 0) return '';
            return word[0] + '_'.repeat(Math.max(0, word.length - 1));
        })
        .join(' ');
}

/**
 * Нормализация строки для сравнения
 * @param {string} str - строка
 * @returns {string} - нормализованная строка
 */
export function normalizeAnswer(str) {
    return str
        .toLowerCase()
        .replace(/[.,!?;:'"]/g, '')  // Убираем пунктуацию
        .replace(/\s+/g, ' ')         // Нормализуем пробелы
        .trim();
}

/**
 * Сравнение ответов с нормализацией
 * @param {string} userAnswer - ответ пользователя
 * @param {string} correctAnswer - правильный ответ
 * @returns {boolean}
 */
export function compareAnswers(userAnswer, correctAnswer) {
    return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}


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
 * Класс игры Translation
 */
export class TranslationGame {
    constructor(content) {
        this.name = 'translation';
        this.icon = '🔄';
        this.content = content;
        this.chunks = [...content.chunks].sort(() => Math.random() - 0.5);
        this.currentIndex = 0;
        this.score = 0;
        this.answers = [];
        this.showingFeedback = false;
        this.hintRevealed = false;
        this.lastAnswer = '';
        this.startTime = Date.now();
    }

    getCurrentChunk() {
        return this.chunks[this.currentIndex] || null;
    }

    revealHint() {
        this.hintRevealed = true;
    }


    checkAnswer(userAnswer) {
        const chunk = this.getCurrentChunk();
        if (!chunk) return;
        
        this.lastAnswer = userAnswer;
        const isCorrect = compareAnswers(userAnswer, chunk.turkish);
        
        if (isCorrect) {
            this.score++;
        }
        
        this.answers.push({
            chunkId: chunk.id,
            userAnswer,
            correctAnswer: chunk.turkish,
            isCorrect
        });
        
        this.showingFeedback = true;
    }

    nextQuestion() {
        this.currentIndex++;
        this.showingFeedback = false;
        this.hintRevealed = false;
        this.lastAnswer = '';
    }

    isComplete() {
        return this.currentIndex >= this.chunks.length;
    }

    getResults() {
        const total = this.chunks.length;
        const percentage = total > 0 ? Math.round((this.score / total) * 100) : 0;
        
        return {
            correct: this.score,
            total,
            percentage,
            timeSpent: Math.round((Date.now() - this.startTime) / 1000),
            chunksLearned: this.score,
            details: this.answers
        };
    }

    async speak() {
        const chunk = this.getCurrentChunk();
        if (chunk) {
            try {
                await speak(chunk.turkish);
            } catch (e) {
                console.warn('TTS error:', e);
            }
        }
    }


    render() {
        if (this.isComplete()) {
            return this.renderResults();
        }

        const chunk = this.getCurrentChunk();
        const progress = `${this.currentIndex + 1}/${this.chunks.length}`;

        if (this.showingFeedback) {
            return this.renderFeedback(chunk);
        }

        const hint = this.hintRevealed ? generateHint(chunk.turkish) : '';

        return `
            <div class="game">
                <div class="game__progress">
                    <span>${progress}</span>
                    <div class="game__progress-bar">
                        <div class="game__progress-fill" style="width: ${((this.currentIndex + 1) / this.chunks.length) * 100}%"></div>
                    </div>
                    <span>${this.score} ✓</span>
                </div>

                <div class="game__question">
                    <div class="game__label">Переведите на турецкий:</div>
                    <div class="game__russian">${chunk.russian}</div>
                    ${chunk.example ? `<div class="game__example-hint"><em>Контекст: ${chunk.exampleTranslation}</em></div>` : ''}
                </div>

                ${hint ? `<div class="game__hint">💡 ${hint}</div>` : ''}

                <div class="game__input-area">
                    <input type="text" class="game__input" id="translationInput" 
                           placeholder="Введите перевод на турецком..."
                           onkeypress="if(event.key==='Enter'){currentGame.submitAnswer()}">
                    
                    <div class="game__actions">
                        ${!this.hintRevealed ? `
                            <button class="btn btn--secondary" onclick="currentGame.revealHint(); renderGame();">
                                💡 Подсказка
                            </button>
                        ` : ''}
                        <button class="btn btn--primary" onclick="currentGame.submitAnswer()">
                            Проверить
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    submitAnswer() {
        const input = document.getElementById('translationInput');
        if (input && input.value.trim()) {
            this.checkAnswer(input.value.trim());
            renderGame();
        }
    }


    renderFeedback(chunk) {
        const lastAnswerData = this.answers[this.answers.length - 1];
        const isCorrect = lastAnswerData?.isCorrect;
        const differences = highlightDifferences(this.lastAnswer, chunk.turkish);

        if (isCorrect) {
            return `
                <div class="game">
                    <div class="feedback feedback--correct">
                        <div class="feedback__header">
                            <span class="feedback__icon">✅</span>
                            <span class="feedback__title">Правильно!</span>
                        </div>
                        <div class="feedback__answer">${chunk.turkish}</div>
                        <button class="btn btn--primary btn--block" onclick="currentGame.nextQuestion(); renderGame();">
                            Далее →
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="game">
                <div class="feedback feedback--incorrect">
                    <div class="feedback__header">
                        <span class="feedback__icon">❌</span>
                        <span class="feedback__title">Неправильно</span>
                    </div>
                    
                    <div class="feedback__section">
                        <div class="feedback__label">Ваш ответ:</div>
                        <div class="feedback__user-answer">
                            ${differences.user.map(w => 
                                `<span class="${w.correct ? '' : 'feedback__wrong'}">${w.text}</span>`
                            ).join(' ')}
                        </div>
                    </div>
                    
                    <div class="feedback__section">
                        <div class="feedback__label">Правильный ответ:</div>
                        <div class="feedback__correct-answer">
                            ${differences.correct.map(w => 
                                `<span class="${w.missing ? 'feedback__highlight' : ''}">${w.text}</span>`
                            ).join(' ')}
                        </div>
                        <button class="btn btn--secondary mt-1" onclick="currentGame.speak()">🔊</button>
                    </div>
                    
                    ${chunk.grammarNote ? `
                        <div class="feedback__section">
                            <div class="feedback__label">📝 Грамматика:</div>
                            <div class="feedback__grammar">${chunk.grammarNote}</div>
                        </div>
                    ` : ''}
                    
                    <div class="feedback__section">
                        <div class="feedback__label">Пример использования:</div>
                        <div class="feedback__example">
                            <div class="feedback__example-turkish">${chunk.example}</div>
                            <div class="feedback__example-russian">${chunk.exampleTranslation}</div>
                        </div>
                    </div>
                    
                    <button class="btn btn--primary btn--block feedback__continue" onclick="currentGame.nextQuestion(); renderGame();">
                        Понятно, продолжить
                    </button>
                </div>
            </div>
        `;
    }


    renderResults() {
        const results = this.getResults();
        const emoji = results.percentage >= 80 ? '🎉' : results.percentage >= 50 ? '👍' : '💪';
        
        return `
            <div class="results">
                <div class="results__icon">${emoji}</div>
                <h2 class="results__title">Перевод завершён!</h2>
                <div class="results__score">${results.percentage}%</div>
                <div class="results__stats">
                    <div class="results__stat">
                        <div class="results__stat-value text-success">${results.correct}</div>
                        <div class="results__stat-label">Правильно</div>
                    </div>
                    <div class="results__stat">
                        <div class="results__stat-value text-error">${results.total - results.correct}</div>
                        <div class="results__stat-label">Ошибок</div>
                    </div>
                </div>
                <p class="text-secondary">Время: ${results.timeSpent} сек</p>
                <button class="btn btn--primary btn--block mt-2" onclick="App.saveGameResult('translation', ${JSON.stringify(results).replace(/"/g, '&quot;')}); App.navigate('games');">
                    Продолжить
                </button>
            </div>
        `;
    }
}

export default TranslationGame;
