/**
 * SOV Construction Game - Построй предложение по SOV
 * Расставь Subject, Object, Verb в правильном порядке
 */

export class SOVConstructionGame {
    constructor(content) {
        this.name = 'sov-construction';
        this.icon = '🏗️';
        this.content = content;
        // Фильтруем chunks с предложениями из 3+ слов
        const validChunks = content.chunks.filter(c => {
            const sentence = c.example || c.turkish;
            return sentence && sentence.split(/\s+/).length >= 3;
        });
        // Создаём SOV компоненты для каждого chunk
        this.chunks = validChunks.slice(0, 10).map(c => ({
            ...c,
            words: this.createSOVComponents(c.example || c.turkish)
        }));
        this.chunks = [...this.chunks].sort(() => Math.random() - 0.5);
        this.currentIndex = 0;
        this.score = 0;
        this.selectedOrder = [];
        this.showResult = false;
        this.isCorrect = false;
        this.startTime = Date.now();
    }

    createSOVComponents(sentence) {
        const words = sentence.split(/\s+/);
        if (words.length < 3) return [{ text: sentence.toLowerCase().replace(/[.!?,:;]$/g, ''), role: 'other' }];
        
        // Нормализуем слова: убираем заглавные буквы и пунктуацию (чтобы не было подсказок)
        const normalizeWord = (word) => word.toLowerCase().replace(/[.!?,:;]$/g, '');
        
        // Простая эвристика: первое слово - S, последнее - V, остальное - O
        return [
            { text: normalizeWord(words[0]), role: 'subject' },
            { text: words.slice(1, -1).map(w => normalizeWord(w)).join(' ') || normalizeWord(words[1]), role: 'object' },
            { text: normalizeWord(words[words.length - 1]), role: 'verb' }
        ];
    }

    getCurrentChunk() { return this.chunks[this.currentIndex] || null; }

    getShuffledComponents() {
        const chunk = this.getCurrentChunk();
        if (!chunk) return [];
        const components = chunk.words.filter(w => ['subject', 'object', 'verb'].includes(w.role));
        return [...components].sort(() => Math.random() - 0.5);
    }

    selectComponent(role) {
        if (this.showResult) return;
        if (!this.selectedOrder.includes(role)) {
            this.selectedOrder.push(role);
        }
    }

    removeComponent(index) {
        if (this.showResult) return;
        this.selectedOrder.splice(index, 1);
    }

    submit() {
        if (this.showResult || this.selectedOrder.length !== 3) return;
        this.isCorrect = this.selectedOrder[0] === 'subject' && 
                         this.selectedOrder[1] === 'object' && 
                         this.selectedOrder[2] === 'verb';
        this.showResult = true;
        if (this.isCorrect) this.score++;
    }

    nextQuestion() {
        this.currentIndex++;
        this.selectedOrder = [];
        this.showResult = false;
        this.isCorrect = false;
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
        const components = chunk.words.filter(w => ['subject', 'object', 'verb'].includes(w.role));
        const progress = `${this.currentIndex + 1}/${this.chunks.length}`;
        const roleLabels = { subject: 'S (Подлежащее)', object: 'O (Дополнение)', verb: 'V (Глагол)' };
        const roleColors = { subject: '#4CAF50', object: '#2196F3', verb: '#FF9800' };

        return `
            <div class="game">
                <div class="game__progress"><span>${progress}</span></div>
                <div class="game__question">
                    <p class="text-secondary">Расставьте компоненты в порядке SOV:</p>
                    <div class="game__translation mt-1">${chunk.russian}</div>
                </div>
                <div class="word-builder__answer" style="min-height: 80px;">
                    ${this.selectedOrder.map((role, i) => {
                        const comp = components.find(c => c.role === role);
                        return `<div class="word-builder__word" style="background: ${roleColors[role]}; color: white;" 
                                     onclick="currentGame.removeComponent(${i}); renderGame();">
                            <small>${roleLabels[role]}</small><br>${comp?.text || role}
                        </div>`;
                    }).join('')}
                </div>
                <div class="word-builder">
                    ${components.map(comp => {
                        const isUsed = this.selectedOrder.includes(comp.role);
                        return `<div class="word-builder__word ${isUsed ? 'word-builder__word--selected' : ''}" 
                                     style="border: 2px solid ${roleColors[comp.role]};"
                                     onclick="if(!${isUsed}) { currentGame.selectComponent('${comp.role}'); renderGame(); }">
                            <small style="color: ${roleColors[comp.role]}">${roleLabels[comp.role]}</small><br>${comp.text}
                        </div>`;
                    }).join('')}
                </div>
                ${this.showResult ? `
                    <div class="card mt-2">
                        ${this.isCorrect ? '<div class="text-success">✓ Правильно! SOV - стандартный порядок слов в турецком.</div>' : 
                          '<div class="text-error">✗ Неправильно. Правильный порядок: Subject → Object → Verb</div>'}
                    </div>
                    <button class="btn btn--primary btn--block mt-2" onclick="currentGame.nextQuestion(); renderGame();">Далее →</button>
                ` : `<button class="btn btn--primary btn--block mt-2" onclick="currentGame.submit(); renderGame();" 
                            ${this.selectedOrder.length !== 3 ? 'disabled' : ''}>Проверить</button>`}
            </div>
        `;
    }

    renderResults() {
        const r = this.getResults();
        return `<div class="results"><div class="results__icon">🎉</div><h2>Завершено!</h2>
            <div class="results__score">${r.percentage}%</div>
            <p>${r.correct}/${r.total} правильно • ${r.timeSpent} сек</p>
            <button class="btn btn--primary btn--block mt-2" onclick="App.saveGameResult('sov-construction', ${JSON.stringify(r).replace(/"/g, '&quot;')}); App.navigate('games');">Продолжить</button></div>`;
    }
}

export default SOVConstructionGame;
