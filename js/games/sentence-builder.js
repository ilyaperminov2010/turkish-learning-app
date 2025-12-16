/**
 * Sentence Builder Game - Собери предложение
 * Перемешанные слова нужно расставить в правильном порядке (SOV)
 */

/**
 * Нормализация слова - убираем заглавную букву и пунктуацию
 * @param {string} word - слово
 * @param {boolean} isFirst - первое слово
 * @param {boolean} isLast - последнее слово
 * @returns {string} - нормализованное слово
 */
export function normalizeWord(word, isFirst, isLast) {
    let result = word;
    // Убираем заглавную букву у первого слова
    if (isFirst && result.length > 0) {
        result = result.charAt(0).toLowerCase() + result.slice(1);
    }
    // Убираем точку/вопросительный/восклицательный знак в конце последнего слова
    if (isLast) {
        result = result.replace(/[.?!]+$/, '');
    }
    return result;
}

/**
 * Перемешивание слов предложения
 * @param {string} sentence - предложение
 * @returns {Array} - перемешанные слова (нормализованные)
 */
export function shuffleWords(sentence) {
    const words = sentence.trim().split(/\s+/);
    // Нормализуем слова - убираем подсказки
    const normalized = words.map((w, i) => normalizeWord(w, i === 0, i === words.length - 1));
    const shuffled = [...normalized];
    
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Убедимся что порядок изменился (если больше 1 слова)
    if (normalized.length > 1 && shuffled.join(' ') === normalized.join(' ')) {
        [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    
    return shuffled;
}

/**
 * Проверка порядка слов
 * @param {Array} userOrder - порядок пользователя (нормализованные слова)
 * @param {string} correctSentence - правильное предложение
 * @returns {boolean}
 */
export function validateOrder(userOrder, correctSentence) {
    const correctWords = correctSentence.trim().split(/\s+/);
    if (userOrder.length !== correctWords.length) return false;
    
    // Нормализуем правильные слова для сравнения
    const normalizedCorrect = correctWords.map((w, i) => 
        normalizeWord(w, i === 0, i === correctWords.length - 1)
    );
    
    return userOrder.every((word, i) => 
        word.toLowerCase() === normalizedCorrect[i].toLowerCase()
    );
}

export class SentenceBuilderGame {
    constructor(content) {
        this.name = 'sentence-builder';
        this.icon = '🧩';
        this.content = content;
        this.chunks = content.chunks.filter(c => c.example && c.example.split(/\s+/).length >= 3);
        if (this.chunks.length === 0) this.chunks = content.chunks;
        this.chunks = [...this.chunks].sort(() => Math.random() - 0.5).slice(0, 10);
        this.currentIndex = 0;
        this.score = 0;
        this.shuffledWords = [];
        this.selectedWords = [];
        this.showResult = false;
        this.isCorrect = false;
        this.startTime = Date.now();
        this.initCurrentQuestion();
    }

    initCurrentQuestion() {
        const chunk = this.getCurrentChunk();
        if (chunk) {
            const sentence = chunk.example || chunk.turkish;
            this.shuffledWords = shuffleWords(sentence);
            this.selectedWords = [];
        }
    }

    getCurrentChunk() { return this.chunks[this.currentIndex] || null; }

    selectWord(index) {
        if (this.showResult) return;
        this.selectedWords.push(this.shuffledWords[index]);
    }

    removeWord(index) {
        if (this.showResult) return;
        this.selectedWords.splice(index, 1);
    }

    submit() {
        if (this.showResult) return;
        const chunk = this.getCurrentChunk();
        const correct = chunk.example || chunk.turkish;
        this.isCorrect = validateOrder(this.selectedWords, correct);
        this.showResult = true;
        if (this.isCorrect) this.score++;
    }

    nextQuestion() {
        this.currentIndex++;
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
        const sentence = chunk.example || chunk.turkish;
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
                    <div class="game__translation">${chunk.exampleTranslation || chunk.russian}</div>
                </div>
                <div class="word-builder__answer">
                    ${this.selectedWords.map((w, i) => `
                        <span class="word-builder__word" onclick="currentGame.removeWord(${i}); renderGame();">${w}</span>
                    `).join('')}
                </div>
                <div class="word-builder">
                    ${this.shuffledWords.map((w, i) => {
                        const isUsed = this.selectedWords.filter(sw => sw === w).length > 
                                       this.shuffledWords.slice(0, i).filter(sw => sw === w).length ? false :
                                       this.selectedWords.includes(w);
                        return `<span class="word-builder__word ${isUsed ? 'word-builder__word--selected' : ''}" 
                                      onclick="if(!this.classList.contains('word-builder__word--selected')) { currentGame.selectWord(${i}); renderGame(); }">${w}</span>`;
                    }).join('')}
                </div>
                ${this.showResult ? `
                    <div class="card mt-2">
                        ${this.isCorrect ? '<div class="text-success">✓ Правильно!</div>' : 
                          `<div class="text-error">✗ Неправильно</div><div class="mt-1">Правильно: ${sentence}</div>`}
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
            <button class="btn btn--primary btn--block mt-2" onclick="App.saveGameResult('sentence-builder', ${JSON.stringify(r).replace(/"/g, '&quot;')}); App.navigate('games');">Продолжить</button></div>`;
    }
}

export default SentenceBuilderGame;
