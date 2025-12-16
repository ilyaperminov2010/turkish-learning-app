/**
 * Fill-in Game - Заполни пропуск
 * Предложение с одним пропущенным словом
 */

/**
 * Создание предложения с пропуском
 * @param {string} sentence - предложение
 * @returns {object} - {display, answer, blankIndex}
 */
export function createBlank(sentence) {
    const words = sentence.trim().split(/\s+/);
    if (words.length < 2) return { display: '___', answer: sentence, blankIndex: 0 };
    
    // Выбираем случайное слово (не первое и не последнее если возможно)
    const start = words.length > 2 ? 1 : 0;
    const end = words.length > 2 ? words.length - 1 : words.length;
    const blankIndex = start + Math.floor(Math.random() * (end - start));
    
    const answer = words[blankIndex];
    const display = words.map((w, i) => i === blankIndex ? '___' : w).join(' ');
    
    return { display, answer, blankIndex };
}

export class FillInGame {
    constructor(content) {
        this.name = 'fill-in';
        this.icon = '📝';
        this.content = content;
        this.chunks = content.chunks.filter(c => c.example && c.example.split(/\s+/).length >= 3);
        if (this.chunks.length === 0) this.chunks = content.chunks;
        this.chunks = [...this.chunks].sort(() => Math.random() - 0.5).slice(0, 10);
        this.currentIndex = 0;
        this.score = 0;
        this.currentBlank = null;
        this.userInput = '';
        this.showResult = false;
        this.isCorrect = false;
        this.startTime = Date.now();
        this.initCurrentQuestion();
    }

    initCurrentQuestion() {
        const chunk = this.getCurrentChunk();
        if (chunk) {
            this.currentBlank = createBlank(chunk.example || chunk.turkish);
        }
    }

    getCurrentChunk() { return this.chunks[this.currentIndex] || null; }
    setInput(value) { this.userInput = value; }

    submit() {
        if (this.showResult) return;
        this.isCorrect = this.userInput.toLowerCase().trim() === this.currentBlank.answer.toLowerCase();
        this.showResult = true;
        if (this.isCorrect) this.score++;
    }

    nextQuestion() {
        this.currentIndex++;
        this.userInput = '';
        this.showResult = false;
        this.isCorrect = false;
        this.initCurrentQuestion();
    }

    isComplete() { return this.currentIndex >= this.chunks.length; }

    getResults() {
        const total = this.chunks.length;
        return {
            correct: this.score,
            total,
            percentage: total > 0 ? Math.round((this.score / total) * 100) : 0,
            timeSpent: Math.round((Date.now() - this.startTime) / 1000),
            chunksLearned: this.score
        };
    }

    render() {
        if (this.isComplete()) return this.renderResults();
        const chunk = this.getCurrentChunk();
        const progress = `${this.currentIndex + 1}/${this.chunks.length}`;

        return `
            <div class="game">
                <div class="game__progress">
                    <span>${progress}</span>
                    <div class="game__progress-bar">
                        <div class="game__progress-fill" style="width: ${((this.currentIndex + 1) / this.chunks.length) * 100}%"></div>
                    </div>
                </div>
                <div class="game__question">
                    <div>${this.currentBlank.display}</div>
                    <div class="game__translation mt-1">${chunk.exampleTranslation || chunk.russian}</div>
                </div>
                <input type="text" class="game__input" placeholder="Введите пропущенное слово..."
                       value="${this.userInput}" oninput="currentGame.setInput(this.value)"
                       onkeypress="if(event.key === 'Enter') { currentGame.submit(); renderGame(); }"
                       ${this.showResult ? 'disabled' : ''} autofocus>
                ${this.showResult ? `
                    <div class="card mt-2">
                        ${this.isCorrect ? '<div class="text-success">✓ Правильно!</div>' : 
                          `<div class="text-error">✗ Неправильно</div><div class="mt-1">Правильно: <strong>${this.currentBlank.answer}</strong></div>`}
                        ${chunk.grammarNote ? `<div class="mt-1 text-secondary">📝 ${chunk.grammarNote}</div>` : ''}
                    </div>
                    <button class="btn btn--primary btn--block mt-2" onclick="currentGame.nextQuestion(); renderGame();">Далее →</button>
                ` : `<button class="btn btn--primary btn--block mt-2" onclick="currentGame.submit(); renderGame();">Проверить</button>`}
            </div>
        `;
    }

    renderResults() {
        const r = this.getResults();
        return `<div class="results"><div class="results__icon">🎉</div><h2>Завершено!</h2>
            <div class="results__score">${r.percentage}%</div>
            <p>${r.correct}/${r.total} правильно • ${r.timeSpent} сек</p>
            <button class="btn btn--primary btn--block mt-2" onclick="App.saveGameResult('fill-in', ${JSON.stringify(r).replace(/"/g, '&quot;')}); App.navigate('games');">Продолжить</button></div>`;
    }
}

export default FillInGame;
