/**
 * Matching Game - Соедини пары
 * 6 турецких фраз и 6 переводов
 */

export class MatchingGame {
    constructor(content) {
        this.name = 'matching';
        this.icon = '🔗';
        this.content = content;
        this.pairs = [...content.chunks].sort(() => Math.random() - 0.5).slice(0, 6);
        this.turkishItems = this.pairs.map((c, i) => ({ id: c.id, text: c.turkish, index: i, matched: false }));
        this.russianItems = [...this.pairs].sort(() => Math.random() - 0.5).map((c, i) => ({ id: c.id, text: c.russian, index: i, matched: false }));
        this.selectedTurkish = null;
        this.selectedRussian = null;
        this.errors = 0;
        this.matchedCount = 0;
        this.startTime = Date.now();
    }

    selectTurkish(index) {
        if (this.turkishItems[index].matched) return;
        this.selectedTurkish = index;
        this.checkMatch();
    }

    selectRussian(index) {
        if (this.russianItems[index].matched) return;
        this.selectedRussian = index;
        this.checkMatch();
    }

    checkMatch() {
        if (this.selectedTurkish === null || this.selectedRussian === null) return;
        
        const turkish = this.turkishItems[this.selectedTurkish];
        const russian = this.russianItems[this.selectedRussian];
        
        if (turkish.id === russian.id) {
            turkish.matched = true;
            russian.matched = true;
            this.matchedCount++;
        } else {
            this.errors++;
        }
        
        this.selectedTurkish = null;
        this.selectedRussian = null;
    }

    isComplete() { return this.matchedCount >= this.pairs.length; }

    getResults() {
        const total = this.pairs.length;
        const percentage = Math.max(0, Math.round(((total - this.errors) / total) * 100));
        return {
            correct: total,
            total,
            percentage,
            timeSpent: Math.round((Date.now() - this.startTime) / 1000),
            chunksLearned: total,
            errors: this.errors
        };
    }

    render() {
        if (this.isComplete()) return this.renderResults();
        
        return `
            <div class="game">
                <div class="game__progress">
                    <span>${this.matchedCount}/${this.pairs.length} пар</span>
                    <span>Ошибок: ${this.errors}</span>
                </div>
                <div class="matching">
                    <div>
                        ${this.turkishItems.map((item, i) => `
                            <div class="matching__item ${item.matched ? 'matching__item--matched' : ''} ${this.selectedTurkish === i ? 'matching__item--selected' : ''}"
                                 onclick="currentGame.selectTurkish(${i}); renderGame();">
                                ${item.text}
                            </div>
                        `).join('')}
                    </div>
                    <div>
                        ${this.russianItems.map((item, i) => `
                            <div class="matching__item ${item.matched ? 'matching__item--matched' : ''} ${this.selectedRussian === i ? 'matching__item--selected' : ''}"
                                 onclick="currentGame.selectRussian(${i}); renderGame();">
                                ${item.text}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderResults() {
        const r = this.getResults();
        return `<div class="results"><div class="results__icon">🎉</div><h2>Все пары найдены!</h2>
            <div class="results__score">${r.percentage}%</div>
            <p>Время: ${r.timeSpent} сек • Ошибок: ${r.errors}</p>
            <button class="btn btn--primary btn--block mt-2" onclick="App.saveGameResult('matching', ${JSON.stringify(r).replace(/"/g, '&quot;')}); App.navigate('games');">Продолжить</button></div>`;
    }
}

export default MatchingGame;
