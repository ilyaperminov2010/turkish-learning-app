/**
 * True/False Game - Правда или ложь
 * Показывается пара фраза-перевод, нужно определить правильность
 */

/**
 * Генерация пары (правильной или неправильной)
 * @param {Array} chunks - все chunks
 * @param {number} index - индекс текущего chunk
 * @param {boolean} shouldBeCorrect - должна ли пара быть правильной
 * @returns {object}
 */
export function generatePair(chunks, index, shouldBeCorrect) {
    const chunk = chunks[index];
    
    if (shouldBeCorrect) {
        return {
            turkish: chunk.turkish,
            russian: chunk.russian,
            isCorrect: true,
            correctRussian: chunk.russian
        };
    }
    
    // Выбираем неправильный перевод
    const others = chunks.filter((_, i) => i !== index);
    const wrong = others[Math.floor(Math.random() * others.length)];
    
    return {
        turkish: chunk.turkish,
        russian: wrong.russian,
        isCorrect: false,
        correctRussian: chunk.russian
    };
}

export class TrueFalseGame {
    constructor(content) {
        this.name = 'true-false';
        this.icon = '⚖️';
        this.content = content;
        this.chunks = [...content.chunks].sort(() => Math.random() - 0.5).slice(0, 10);
        this.currentIndex = 0;
        this.score = 0;
        this.currentPair = null;
        this.userAnswer = null;
        this.showResult = false;
        this.startTime = Date.now();
        this.trueCount = 0;
        this.falseCount = 0;
        this.initCurrentQuestion();
    }

    initCurrentQuestion() {
        // Балансируем 50/50
        const shouldBeCorrect = this.trueCount <= this.falseCount;
        if (shouldBeCorrect) this.trueCount++; else this.falseCount++;
        
        const idx = this.content.chunks.findIndex(c => c.id === this.chunks[this.currentIndex].id);
        this.currentPair = generatePair(this.content.chunks, idx, shouldBeCorrect);
    }

    getCurrentChunk() { return this.chunks[this.currentIndex] || null; }

    answer(isTrue) {
        if (this.showResult) return;
        this.userAnswer = isTrue;
        this.showResult = true;
        if (isTrue === this.currentPair.isCorrect) this.score++;
    }

    nextQuestion() {
        this.currentIndex++;
        this.userAnswer = null;
        this.showResult = false;
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
        const progress = `${this.currentIndex + 1}/${this.chunks.length}`;
        const isUserCorrect = this.userAnswer === this.currentPair.isCorrect;

        return `
            <div class="game">
                <div class="game__progress"><span>${progress}</span><span>${this.score} ✓</span></div>
                <div class="game__question">
                    <div style="font-size: 1.5rem;">${this.currentPair.turkish}</div>
                    <div class="game__translation mt-2">${this.currentPair.russian}</div>
                </div>
                ${!this.showResult ? `
                    <div class="game__options" style="flex-direction: row; gap: 1rem;">
                        <button class="btn btn--primary" style="flex: 1;" onclick="currentGame.answer(true); renderGame();">✓ Правда</button>
                        <button class="btn btn--danger" style="flex: 1;" onclick="currentGame.answer(false); renderGame();">✗ Ложь</button>
                    </div>
                ` : `
                    <div class="card mt-2">
                        ${isUserCorrect ? '<div class="text-success">✓ Правильно!</div>' : 
                          `<div class="text-error">✗ Неправильно</div>`}
                        ${!this.currentPair.isCorrect ? `<div class="mt-1">Правильный перевод: ${this.currentPair.correctRussian}</div>` : ''}
                    </div>
                    <button class="btn btn--primary btn--block mt-2" onclick="currentGame.nextQuestion(); renderGame();">Далее →</button>
                `}
            </div>
        `;
    }

    renderResults() {
        const r = this.getResults();
        return `<div class="results"><div class="results__icon">🎉</div><h2>Завершено!</h2>
            <div class="results__score">${r.percentage}%</div>
            <p>${r.correct}/${r.total} правильно • ${r.timeSpent} сек</p>
            <button class="btn btn--primary btn--block mt-2" onclick="App.saveGameResult('true-false', ${JSON.stringify(r).replace(/"/g, '&quot;')}); App.navigate('games');">Продолжить</button></div>`;
    }
}

export default TrueFalseGame;
