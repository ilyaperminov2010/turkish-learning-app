/**
 * Writing Game - Напиши фразу
 * Пользователь вводит турецкую фразу по русскому переводу
 */

/**
 * Сравнение ответов с нормализацией
 * @param {string} userInput - ввод пользователя
 * @param {string} correctAnswer - правильный ответ
 * @returns {boolean}
 */
export function compareAnswers(userInput, correctAnswer) {
    const normalize = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ');
    return normalize(userInput) === normalize(correctAnswer);
}

/**
 * Подсветка различий между ответами
 * @param {string} userInput - ввод пользователя
 * @param {string} correctAnswer - правильный ответ
 * @returns {string} - HTML с подсветкой
 */
export function highlightDifferences(userInput, correctAnswer) {
    const userWords = userInput.trim().split(/\s+/);
    const correctWords = correctAnswer.trim().split(/\s+/);
    
    let result = '';
    const maxLen = Math.max(userWords.length, correctWords.length);
    
    for (let i = 0; i < maxLen; i++) {
        const userWord = userWords[i] || '';
        const correctWord = correctWords[i] || '';
        
        if (userWord.toLowerCase() === correctWord.toLowerCase()) {
            result += `<span class="text-success">${correctWord}</span> `;
        } else {
            result += `<span class="text-error">${correctWord}</span> `;
        }
    }
    
    return result.trim();
}

/**
 * Класс игры Writing
 */
export class WritingGame {
    constructor(content) {
        this.name = 'writing';
        this.icon = '✍️';
        this.content = content;
        this.chunks = [...content.chunks].sort(() => Math.random() - 0.5);
        this.currentIndex = 0;
        this.score = 0;
        this.answers = [];
        this.userInput = '';
        this.showResult = false;
        this.isCorrect = false;
        this.startTime = Date.now();
    }

    getCurrentChunk() {
        return this.chunks[this.currentIndex] || null;
    }

    setInput(value) {
        this.userInput = value;
    }

    submit() {
        if (this.showResult) return;
        
        const chunk = this.getCurrentChunk();
        this.isCorrect = compareAnswers(this.userInput, chunk.turkish);
        this.showResult = true;
        
        if (this.isCorrect) {
            this.score++;
        }
        
        this.answers.push({
            chunkId: chunk.id,
            userInput: this.userInput,
            correctAnswer: chunk.turkish,
            isCorrect: this.isCorrect
        });
    }

    nextQuestion() {
        this.currentIndex++;
        this.userInput = '';
        this.showResult = false;
        this.isCorrect = false;
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
                    <div class="game__translation">${chunk.russian}</div>
                    ${chunk.example ? `<div class="text-secondary mt-1"><em>${chunk.exampleTranslation}</em></div>` : ''}
                </div>

                <input type="text" 
                       class="game__input" 
                       placeholder="Напишите по-турецки..."
                       value="${this.userInput}"
                       oninput="currentGame.setInput(this.value)"
                       onkeypress="if(event.key === 'Enter') { currentGame.submit(); renderGame(); }"
                       ${this.showResult ? 'disabled' : ''}
                       autofocus>

                ${this.showResult ? `
                    <div class="card mt-2">
                        ${this.isCorrect ? `
                            <div class="text-success">✓ Правильно!</div>
                        ` : `
                            <div class="text-error">✗ Неправильно</div>
                            <div class="mt-1">Ваш ответ: <s>${this.userInput}</s></div>
                            <div class="mt-1">Правильно: ${highlightDifferences(this.userInput, chunk.turkish)}</div>
                        `}
                    </div>
                    <button class="btn btn--primary btn--block mt-2" onclick="currentGame.nextQuestion(); renderGame();">
                        Далее →
                    </button>
                ` : `
                    <button class="btn btn--primary btn--block mt-2" onclick="currentGame.submit(); renderGame();">
                        Проверить
                    </button>
                `}
            </div>
        `;
    }

    renderResults() {
        const results = this.getResults();
        const emoji = results.percentage >= 80 ? '🎉' : results.percentage >= 50 ? '👍' : '💪';
        
        return `
            <div class="results">
                <div class="results__icon">${emoji}</div>
                <h2 class="results__title">Упражнение завершено!</h2>
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
                <button class="btn btn--primary btn--block mt-2" onclick="App.saveGameResult('writing', ${JSON.stringify(results).replace(/"/g, '&quot;')}); App.navigate('games');">
                    Продолжить
                </button>
            </div>
        `;
    }
}

export default WritingGame;
