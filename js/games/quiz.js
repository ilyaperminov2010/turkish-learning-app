/**
 * Quiz Game - Выбери правильный перевод
 * 4 варианта ответа, 1 правильный
 */

import { speak } from '../tts.js';

/**
 * Генерация вариантов ответа
 * @param {Array} chunks - все chunks
 * @param {number} correctIndex - индекс правильного ответа
 * @returns {Array} - 4 варианта ответа
 */
export function generateOptions(chunks, correctIndex) {
    const correct = chunks[correctIndex];
    const incorrectPool = chunks.filter((_, i) => i !== correctIndex);
    
    // Перемешиваем и берём 3 неправильных
    const shuffled = [...incorrectPool].sort(() => Math.random() - 0.5);
    const incorrect = shuffled.slice(0, Math.min(3, shuffled.length));
    
    // Формируем варианты
    const options = [
        { text: correct.russian, isCorrect: true, chunkId: correct.id },
        ...incorrect.map(c => ({ text: c.russian, isCorrect: false, chunkId: c.id }))
    ];
    
    // Перемешиваем варианты
    return options.sort(() => Math.random() - 0.5);
}

/**
 * Класс игры Quiz
 */
export class QuizGame {
    constructor(content) {
        this.name = 'quiz';
        this.icon = '❓';
        this.content = content;
        this.chunks = [...content.chunks].sort(() => Math.random() - 0.5);
        this.currentIndex = 0;
        this.score = 0;
        this.answers = [];
        this.currentOptions = null;
        this.selectedOption = null;
        this.showResult = false;
        this.startTime = Date.now();
        
        this.generateCurrentOptions();
    }

    generateCurrentOptions() {
        if (this.currentIndex < this.chunks.length) {
            this.currentOptions = generateOptions(this.content.chunks, 
                this.content.chunks.findIndex(c => c.id === this.chunks[this.currentIndex].id));
        }
    }

    getCurrentChunk() {
        return this.chunks[this.currentIndex] || null;
    }

    selectOption(index) {
        if (this.showResult) return;
        
        this.selectedOption = index;
        this.showResult = true;
        
        const isCorrect = this.currentOptions[index].isCorrect;
        if (isCorrect) {
            this.score++;
        }
        
        this.answers.push({
            chunkId: this.getCurrentChunk().id,
            selectedOption: index,
            isCorrect
        });
    }

    nextQuestion() {
        this.currentIndex++;
        this.selectedOption = null;
        this.showResult = false;
        this.generateCurrentOptions();
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


    render() {
        if (this.isComplete()) {
            return this.renderResults();
        }

        const chunk = this.getCurrentChunk();
        const progress = `${this.currentIndex + 1}/${this.chunks.length}`;

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
                    <div>${chunk.turkish}</div>
                    <button class="btn btn--secondary mt-1" onclick="currentGame.speak()">🔊</button>
                </div>

                <div class="game__options">
                    ${this.currentOptions.map((opt, i) => `
                        <button class="game__option ${this.getOptionClass(i)}"
                                onclick="currentGame.selectOption(${i}); renderGame();"
                                ${this.showResult ? 'disabled' : ''}>
                            ${opt.text}
                        </button>
                    `).join('')}
                </div>

                ${this.showResult ? `
                    <button class="btn btn--primary btn--block mt-2" onclick="currentGame.nextQuestion(); renderGame();">
                        Далее →
                    </button>
                ` : ''}
            </div>
        `;
    }

    getOptionClass(index) {
        if (!this.showResult) {
            return this.selectedOption === index ? 'game__option--selected' : '';
        }
        
        const opt = this.currentOptions[index];
        if (opt.isCorrect) {
            return 'game__option--correct';
        }
        if (index === this.selectedOption && !opt.isCorrect) {
            return 'game__option--incorrect';
        }
        return '';
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

    renderResults() {
        const results = this.getResults();
        const emoji = results.percentage >= 80 ? '🎉' : results.percentage >= 50 ? '👍' : '💪';
        
        return `
            <div class="results">
                <div class="results__icon">${emoji}</div>
                <h2 class="results__title">Викторина завершена!</h2>
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
                <button class="btn btn--primary btn--block mt-2" onclick="App.saveGameResult('quiz', ${JSON.stringify(results).replace(/"/g, '&quot;')}); App.navigate('games');">
                    Продолжить
                </button>
            </div>
        `;
    }
}

export default QuizGame;
