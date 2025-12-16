/**
 * Listening Game - Аудирование + Shadowing
 * Слушай и выбери правильный перевод
 */

import { speak } from '../tts.js';
import { generateOptions } from './quiz.js';

export class ListeningGame {
    constructor(content) {
        this.name = 'listening';
        this.icon = '👂';
        this.content = content;
        this.chunks = [...content.chunks].sort(() => Math.random() - 0.5).slice(0, 10);
        this.currentIndex = 0;
        this.score = 0;
        this.currentOptions = null;
        this.selectedOption = null;
        this.showResult = false;
        this.shadowingMode = false;
        this.startTime = Date.now();
        this.generateCurrentOptions();
    }

    generateCurrentOptions() {
        if (this.currentIndex < this.chunks.length) {
            const idx = this.content.chunks.findIndex(c => c.id === this.chunks[this.currentIndex].id);
            this.currentOptions = generateOptions(this.content.chunks, idx);
        }
    }

    getCurrentChunk() { return this.chunks[this.currentIndex] || null; }

    async playAudio() {
        const chunk = this.getCurrentChunk();
        if (chunk) {
            try { await speak(chunk.turkish); } catch (e) { console.warn('TTS error:', e); }
        }
    }

    selectOption(index) {
        if (this.showResult) return;
        this.selectedOption = index;
        this.showResult = true;
        if (this.currentOptions[index].isCorrect) {
            this.score++;
            this.shadowingMode = true;
        }
    }

    completeShadowing() {
        this.shadowingMode = false;
        this.nextQuestion();
    }

    nextQuestion() {
        this.currentIndex++;
        this.selectedOption = null;
        this.showResult = false;
        this.shadowingMode = false;
        this.generateCurrentOptions();
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

        if (this.shadowingMode) {
            return `
                <div class="game">
                    <div class="game__question">
                        <h3>🎤 Shadowing</h3>
                        <p class="text-secondary">Повторите за диктором:</p>
                        <div class="mt-2" style="font-size: 1.5rem;">${chunk.turkish}</div>
                        <button class="btn btn--secondary mt-2" onclick="currentGame.playAudio()">🔊 Прослушать ещё раз</button>
                    </div>
                    <button class="btn btn--primary btn--block mt-2" onclick="currentGame.completeShadowing(); renderGame();">
                        Готово ✓
                    </button>
                </div>
            `;
        }

        return `
            <div class="game">
                <div class="game__progress"><span>${progress}</span></div>
                <div class="game__question">
                    <p class="text-secondary">Прослушайте и выберите перевод:</p>
                    <button class="btn btn--primary mt-2" onclick="currentGame.playAudio()">🔊 Прослушать</button>
                </div>
                <div class="game__options">
                    ${this.currentOptions.map((opt, i) => `
                        <button class="game__option ${this.showResult ? (opt.isCorrect ? 'game__option--correct' : (i === this.selectedOption ? 'game__option--incorrect' : '')) : ''}"
                                onclick="currentGame.selectOption(${i}); renderGame();" ${this.showResult ? 'disabled' : ''}>
                            ${opt.text}
                        </button>
                    `).join('')}
                </div>
                ${this.showResult && !this.currentOptions[this.selectedOption].isCorrect ? `
                    <button class="btn btn--primary btn--block mt-2" onclick="currentGame.nextQuestion(); renderGame();">Далее →</button>
                ` : ''}
            </div>
        `;
    }

    renderResults() {
        const r = this.getResults();
        return `<div class="results"><div class="results__icon">🎉</div><h2>Завершено!</h2>
            <div class="results__score">${r.percentage}%</div>
            <p>${r.correct}/${r.total} правильно • ${r.timeSpent} сек</p>
            <button class="btn btn--primary btn--block mt-2" onclick="App.saveGameResult('listening', ${JSON.stringify(r).replace(/"/g, '&quot;')}); App.navigate('games');">Продолжить</button></div>`;
    }
}

export default ListeningGame;
