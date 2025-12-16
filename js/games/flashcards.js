/**
 * Flashcards Game - Флеш-карточки с SRS (Spaced Repetition System)
 * Алгоритм SM-2 для интервального повторения
 */

import { getSRSData, saveSRSData } from '../storage.js';
import { speak } from '../tts.js';

// Константы SM-2 алгоритма
const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

/**
 * Получить SRS данные для chunk
 * @param {string} chunkId - ID chunk
 * @returns {object} - SRS данные
 */
export function getSRSForChunk(chunkId) {
    const srsData = getSRSData();
    return srsData[chunkId] || {
        interval: 0,
        easeFactor: DEFAULT_EASE_FACTOR,
        nextReview: 0,
        repetitions: 0
    };
}

/**
 * Обновить SRS данные после оценки (SM-2 алгоритм)
 * @param {string} chunkId - ID chunk
 * @param {number} quality - оценка (0-5, где 0-2 = hard, 3 = medium, 4-5 = easy)
 * @returns {object} - обновлённые SRS данные
 */
export function updateSRS(chunkId, quality) {
    const srsData = getSRSData();
    const current = srsData[chunkId] || {
        interval: 0,
        easeFactor: DEFAULT_EASE_FACTOR,
        nextReview: 0,
        repetitions: 0
    };

    let { interval, easeFactor, repetitions } = current;

    // SM-2 алгоритм
    if (quality >= 3) {
        // Правильный ответ
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions++;
    } else {
        // Неправильный ответ - сброс
        repetitions = 0;
        interval = 1;
    }

    // Обновление ease factor
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < MIN_EASE_FACTOR) {
        easeFactor = MIN_EASE_FACTOR;
    }

    const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

    const updated = {
        interval,
        easeFactor,
        nextReview,
        repetitions
    };

    srsData[chunkId] = updated;
    saveSRSData(srsData);

    return updated;
}

/**
 * Конвертация оценки сложности в quality для SM-2
 * @param {string} difficulty - easy | medium | hard
 * @returns {number} - quality (0-5)
 */
export function difficultyToQuality(difficulty) {
    switch (difficulty) {
        case 'easy': return 5;
        case 'medium': return 3;
        case 'hard': return 1;
        default: return 3;
    }
}


/**
 * Сортировка карточек по SRS приоритету
 * Карточки с более ранним nextReview идут первыми
 * @param {Array} chunks - массив chunks
 * @returns {Array} - отсортированный массив
 */
export function sortByPriority(chunks) {
    const srsData = getSRSData();
    
    return [...chunks].sort((a, b) => {
        const srsA = srsData[a.id] || { nextReview: 0 };
        const srsB = srsData[b.id] || { nextReview: 0 };
        
        // Карточки без SRS данных (новые) идут первыми
        if (srsA.nextReview === 0 && srsB.nextReview !== 0) return -1;
        if (srsB.nextReview === 0 && srsA.nextReview !== 0) return 1;
        
        // Сортировка по nextReview (раньше = выше приоритет)
        return srsA.nextReview - srsB.nextReview;
    });
}

/**
 * Класс игры Flashcards
 */
export class FlashcardsGame {
    constructor(content) {
        this.name = 'flashcards';
        this.icon = '🃏';
        this.content = content;
        this.cards = sortByPriority(content.chunks);
        this.currentIndex = 0;
        this.isFlipped = false;
        this.results = [];
        this.startTime = Date.now();
    }

    /**
     * Получить текущую карточку
     * @returns {object|null}
     */
    getCurrentCard() {
        return this.cards[this.currentIndex] || null;
    }

    /**
     * Перевернуть карточку
     */
    flip() {
        this.isFlipped = !this.isFlipped;
    }

    /**
     * Оценить карточку
     * @param {string} difficulty - easy | medium | hard
     */
    rate(difficulty) {
        const card = this.getCurrentCard();
        if (!card) return;

        const quality = difficultyToQuality(difficulty);
        const srsResult = updateSRS(card.id, quality);

        this.results.push({
            chunkId: card.id,
            difficulty,
            quality,
            newInterval: srsResult.interval
        });

        this.nextCard();
    }

    /**
     * Перейти к следующей карточке
     */
    nextCard() {
        this.currentIndex++;
        this.isFlipped = false;
    }

    /**
     * Проверить завершение игры
     * @returns {boolean}
     */
    isComplete() {
        return this.currentIndex >= this.cards.length;
    }

    /**
     * Получить результаты игры
     * @returns {object}
     */
    getResults() {
        const easy = this.results.filter(r => r.difficulty === 'easy').length;
        const medium = this.results.filter(r => r.difficulty === 'medium').length;
        const hard = this.results.filter(r => r.difficulty === 'hard').length;
        
        // Процент "лёгких" ответов как показатель успеха
        const percentage = this.results.length > 0 
            ? Math.round((easy / this.results.length) * 100) 
            : 0;

        return {
            correct: easy + medium,
            total: this.results.length,
            percentage,
            timeSpent: Math.round((Date.now() - this.startTime) / 1000),
            chunksLearned: easy + medium,
            details: {
                easy,
                medium,
                hard
            }
        };
    }

    /**
     * Рендеринг игры
     * @returns {string} - HTML
     */
    render() {
        if (this.isComplete()) {
            return this.renderResults();
        }

        const card = this.getCurrentCard();
        const progress = `${this.currentIndex + 1}/${this.cards.length}`;

        return `
            <div class="game">
                <div class="game__progress">
                    <span>${progress}</span>
                    <div class="game__progress-bar">
                        <div class="game__progress-fill" style="width: ${((this.currentIndex + 1) / this.cards.length) * 100}%"></div>
                    </div>
                </div>

                <div class="flashcard ${this.isFlipped ? 'flashcard--flipped' : ''}" onclick="currentGame.flip(); renderGame();">
                    <div class="flashcard__inner">
                        <div class="flashcard__front">
                            <div class="flashcard__phrase">${card.turkish}</div>
                            <button class="btn btn--secondary mt-2" onclick="event.stopPropagation(); App.speakPhrase(${this.currentIndex});">🔊 Озвучить</button>
                        </div>
                        <div class="flashcard__back">
                            <div class="flashcard__phrase">${card.russian}</div>
                            ${card.example ? `<div class="flashcard__example">${card.example}</div>` : ''}
                            ${card.grammarNote ? `<div class="flashcard__grammar mt-1">📝 ${card.grammarNote}</div>` : ''}
                        </div>
                    </div>
                </div>

                ${this.isFlipped ? `
                    <div class="flashcard__rating">
                        <button class="btn btn--danger" onclick="currentGame.rate('hard'); renderGame();">😓 Сложно</button>
                        <button class="btn btn--secondary" onclick="currentGame.rate('medium'); renderGame();">🤔 Средне</button>
                        <button class="btn btn--primary" onclick="currentGame.rate('easy'); renderGame();">😊 Легко</button>
                    </div>
                ` : `
                    <p class="text-center text-secondary mt-2">Нажмите на карточку, чтобы увидеть перевод</p>
                `}
            </div>
        `;
    }

    /**
     * Рендеринг результатов
     * @returns {string} - HTML
     */
    renderResults() {
        const results = this.getResults();
        
        return `
            <div class="results">
                <div class="results__icon">🎉</div>
                <h2 class="results__title">Сессия завершена!</h2>
                <div class="results__score">${results.percentage}%</div>
                <div class="results__stats">
                    <div class="results__stat">
                        <div class="results__stat-value text-success">${results.details.easy}</div>
                        <div class="results__stat-label">Легко</div>
                    </div>
                    <div class="results__stat">
                        <div class="results__stat-value">${results.details.medium}</div>
                        <div class="results__stat-label">Средне</div>
                    </div>
                    <div class="results__stat">
                        <div class="results__stat-value text-error">${results.details.hard}</div>
                        <div class="results__stat-label">Сложно</div>
                    </div>
                </div>
                <p class="text-secondary">Время: ${results.timeSpent} сек</p>
                <button class="btn btn--primary btn--block mt-2" onclick="App.saveGameResult('flashcards', ${JSON.stringify(results).replace(/"/g, '&quot;')}); App.navigate('games');">
                    Продолжить
                </button>
            </div>
        `;
    }
}

export default FlashcardsGame;
