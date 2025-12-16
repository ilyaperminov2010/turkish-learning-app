/**
 * App Module - главный модуль приложения
 * Управление состоянием, роутинг, рендеринг
 */

import { getSettings, saveSettings, getProgress, saveProgress, saveSessionState, loadSessionState, saveGameState, loadGameState, clearSessionState } from './storage.js';
import { TOPICS, getTopicsByLevel, getTopicById, getLevels, getCategoryIcon, getCategoryName } from './topics.js';
import { generateContent, setApiKey } from './api.js';
import { speak } from './tts.js';

// Состояние приложения
export const state = {
    currentScreen: 'home',      // home | vocabulary | game | settings | stats
    selectedLevel: null,        // A1 | A2 | B1 | B2 | C1 | C2
    selectedTopic: null,        // Topic object
    currentGame: null,          // Game name
    generatedContent: null,     // Generated content for topic
    theme: 'light',             // light | dark
    expandedLevels: new Set(),  // Expanded level accordions
    loading: false,
    error: null
};

// DOM элементы
let mainContent = null;
let backBtn = null;
let settingsBtn = null;
let loadingEl = null;
let modalEl = null;

/**
 * Инициализация приложения
 */
export function init() {
    // Получаем DOM элементы
    mainContent = document.getElementById('mainContent');
    backBtn = document.getElementById('backBtn');
    settingsBtn = document.getElementById('settingsBtn');
    loadingEl = document.getElementById('loading');
    modalEl = document.getElementById('modal');

    // Загружаем настройки
    const settings = getSettings();
    state.theme = settings.theme;
    applyTheme(settings.theme);

    // Устанавливаем API ключ
    if (settings.apiKey) {
        setApiKey(settings.apiKey);
    }

    // Восстанавливаем состояние сессии
    const savedState = loadSessionState();
    if (savedState) {
        state.currentScreen = savedState.currentScreen || 'home';
        state.selectedLevel = savedState.selectedLevel;
        state.selectedTopic = savedState.selectedTopic;
        state.currentGame = savedState.currentGame;
        state.generatedContent = savedState.generatedContent;
    }

    // Обработчики событий
    backBtn.addEventListener('click', handleBack);
    settingsBtn.addEventListener('click', () => navigate('settings'));
    modalEl.querySelector('.modal__overlay').addEventListener('click', hideModal);

    // Рендерим начальный экран
    render();
}


/**
 * Навигация между экранами
 * @param {string} screen - название экрана
 * @param {object} params - параметры
 */
export function navigate(screen, params = {}) {
    state.currentScreen = screen;
    state.error = null;

    if (params.level !== undefined) state.selectedLevel = params.level;
    if (params.topic !== undefined) state.selectedTopic = params.topic;
    if (params.game !== undefined) state.currentGame = params.game;
    if (params.content !== undefined) state.generatedContent = params.content;

    // Сохраняем состояние сессии при каждой навигации
    saveSessionState(state);

    render();
}

/**
 * Обработка кнопки "Назад"
 */
function handleBack() {
    switch (state.currentScreen) {
        case 'vocabulary':
        case 'settings':
        case 'stats':
            navigate('home');
            break;
        case 'games':
            navigate('vocabulary');
            break;
        case 'game':
            navigate('games');
            break;
        default:
            navigate('home');
    }
}

/**
 * Применение темы
 * @param {string} theme - light | dark
 */
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    state.theme = theme;
}

/**
 * Показать загрузку
 * @param {string} text - текст загрузки
 */
export function showLoading(text = 'Загрузка...') {
    state.loading = true;
    loadingEl.querySelector('.loading__text').textContent = text;
    loadingEl.hidden = false;
}

/**
 * Скрыть загрузку
 */
export function hideLoading() {
    state.loading = false;
    loadingEl.hidden = true;
}

/**
 * Показать модальное окно
 * @param {string} title - заголовок
 * @param {string} message - сообщение
 * @param {Array} actions - кнопки действий
 */
export function showModal(title, message, actions = []) {
    modalEl.querySelector('.modal__title').textContent = title;
    modalEl.querySelector('.modal__message').textContent = message;
    
    const actionsEl = modalEl.querySelector('.modal__actions');
    actionsEl.innerHTML = '';
    
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `btn ${action.primary ? 'btn--primary' : 'btn--secondary'}`;
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
            hideModal();
            if (action.handler) action.handler();
        });
        actionsEl.appendChild(btn);
    });

    modalEl.hidden = false;
}

/**
 * Скрыть модальное окно
 */
export function hideModal() {
    modalEl.hidden = true;
}

/**
 * Обработка ошибок
 * @param {Error} error - ошибка
 */
export function handleError(error) {
    hideLoading();
    console.error('App error:', error);

    const errorMessages = {
        'API_KEY_MISSING': 'API ключ не установлен. Перейдите в настройки.',
        'API_KEY_INVALID': 'Неверный API ключ. Проверьте настройки.',
        'RATE_LIMITED': 'Слишком много запросов. Подождите минуту.',
        'NETWORK_ERROR': 'Ошибка сети. Проверьте подключение.',
        'GENERATION_ERROR': 'Ошибка генерации контента.',
        'STORAGE_FULL': 'Хранилище заполнено. Очистите кэш.'
    };

    const message = errorMessages[error.message] || error.message || 'Произошла ошибка';
    
    showModal('Ошибка', message, [
        { label: 'OK', primary: true }
    ]);
}


/**
 * Главная функция рендеринга
 */
export function render() {
    // Обновляем видимость кнопки "Назад"
    backBtn.hidden = state.currentScreen === 'home';

    // Рендерим соответствующий экран
    switch (state.currentScreen) {
        case 'home':
            renderHomeScreen();
            break;
        case 'vocabulary':
            renderVocabularyScreen();
            break;
        case 'games':
            renderGamesScreen();
            break;
        case 'game':
            renderGameScreen();
            break;
        case 'settings':
            renderSettingsScreen();
            break;
        case 'stats':
            renderStatsScreen();
            break;
        default:
            renderHomeScreen();
    }
}

/**
 * Рендеринг главного экрана (выбор тем)
 */
function renderHomeScreen() {
    const progress = getProgress();
    const levels = getLevels();

    let html = `
        <div class="home">
            ${renderDashboard()}
            <div class="home__header">
                <h2>Выберите тему</h2>
            </div>
    `;

    levels.forEach(level => {
        const topics = getTopicsByLevel(level);
        const completedCount = topics.filter(t => progress.topicsCompleted[t.id]).length;
        const isExpanded = state.expandedLevels.has(level);

        html += `
            <div class="level ${isExpanded ? 'level--expanded' : ''}">
                <div class="level__header" onclick="App.toggleLevel('${level}')">
                    <span class="level__name">${level}</span>
                    <span class="level__progress">${completedCount}/${topics.length}</span>
                    <span class="level__arrow">▼</span>
                </div>
                <div class="level__topics">
        `;

        topics.forEach(topic => {
            const topicProgress = progress.topicsCompleted[topic.id];
            let statusClass = '';
            let statusIcon = '';
            
            if (topicProgress) {
                if (topicProgress.gamesPlayed?.length >= 10) {
                    statusClass = 'topic__status--completed';
                    statusIcon = '✓';
                } else {
                    statusClass = 'topic__status--in-progress';
                    statusIcon = '◐';
                }
            }

            html += `
                <div class="topic" onclick="App.selectTopic('${topic.id}')">
                    <span class="topic__icon">${getCategoryIcon(topic.category)}</span>
                    <div class="topic__info">
                        <div class="topic__name">${topic.name}</div>
                        <div class="topic__category">${getCategoryName(topic.category)}</div>
                    </div>
                    ${statusIcon ? `<span class="topic__status ${statusClass}">${statusIcon}</span>` : ''}
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += '</div>';
    mainContent.innerHTML = html;
}

/**
 * Переключение раскрытия уровня
 * @param {string} level - уровень
 */
export function toggleLevel(level) {
    if (state.expandedLevels.has(level)) {
        state.expandedLevels.delete(level);
    } else {
        state.expandedLevels.add(level);
    }
    render();
}

/**
 * Выбор темы
 * @param {string} topicId - ID темы
 */
export async function selectTopic(topicId) {
    const topic = getTopicById(topicId);
    if (!topic) {
        handleError(new Error('Тема не найдена'));
        return;
    }

    state.selectedTopic = topic;
    showLoading('Генерация контента...');

    try {
        const content = await generateContent(topic);
        state.generatedContent = content;
        hideLoading();
        navigate('vocabulary');
    } catch (error) {
        handleError(error);
    }
}


/**
 * Рендеринг экрана словаря
 */
function renderVocabularyScreen() {
    if (!state.generatedContent || !state.selectedTopic) {
        navigate('home');
        return;
    }

    const { chunks } = state.generatedContent;
    const topic = state.selectedTopic;

    let html = `
        <div class="vocabulary-screen">
            <div class="vocabulary-sticky-btn">
                <button class="btn btn--primary btn--block" onclick="App.navigate('games')">
                    🎮 Перейти к играм
                </button>
            </div>
            <div class="vocabulary-header">
                <h2>${topic.name}</h2>
                <p class="text-secondary">${topic.description}</p>
                <p class="text-secondary">${chunks.length} фраз</p>
            </div>
            <div class="vocabulary">
    `;

    chunks.forEach((chunk, index) => {
        html += `
            <div class="vocabulary__item">
                <div class="vocabulary__turkish">
                    ${chunk.turkish}
                    <button class="vocabulary__audio-btn" onclick="App.speakPhrase('${index}')">🔊</button>
                </div>
                <div class="vocabulary__russian">${chunk.russian}</div>
                ${chunk.example ? `
                    <div class="vocabulary__example">
                        <em>${chunk.example}</em>
                        ${chunk.exampleTranslation ? `<br><small>${chunk.exampleTranslation}</small>` : ''}
                    </div>
                ` : ''}
                ${chunk.grammarNote ? `<div class="vocabulary__grammar">📝 ${chunk.grammarNote}</div>` : ''}
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    mainContent.innerHTML = html;
}

/**
 * Озвучка фразы
 * @param {number} index - индекс фразы
 */
export async function speakPhrase(index) {
    if (!state.generatedContent) return;
    
    const chunk = state.generatedContent.chunks[index];
    if (!chunk) return;

    try {
        await speak(chunk.turkish);
    } catch (error) {
        console.warn('TTS error:', error);
    }
}

/**
 * Рендеринг экрана выбора игр
 */
function renderGamesScreen() {
    const progress = getProgress();
    const topicProgress = progress.topicsCompleted[state.selectedTopic?.id] || {};
    const gamesPlayed = topicProgress.gamesPlayed || [];

    // Удалены: true-false, sov-construction (Requirements 4.1, 4.2)
    const games = [
        { id: 'flashcards', name: 'Флеш-карточки', icon: '🃏' },
        { id: 'quiz', name: 'Выбери перевод', icon: '❓' },
        { id: 'writing', name: 'Напиши фразу', icon: '✍️' },
        { id: 'translation', name: 'Перевод предложений', icon: '🔄' },
        { id: 'sentence-builder', name: 'Собери предложение', icon: '🧩' },
        { id: 'matching', name: 'Соедини пары', icon: '🔗' },
        { id: 'fill-in', name: 'Заполни пропуск', icon: '📝' },
        { id: 'listening', name: 'Аудирование', icon: '👂' }
    ];

    let html = `
        <div class="games-screen">
            <h2>Выберите игру</h2>
            <p class="text-secondary mb-2">${state.selectedTopic?.name}</p>
            <div class="games-grid">
    `;

    games.forEach(game => {
        const isCompleted = gamesPlayed.includes(game.id);
        html += `
            <div class="game-card ${isCompleted ? 'game-card--completed' : ''}" 
                 onclick="App.startGame('${game.id}')">
                <span class="game-card__icon">${game.icon}</span>
                <span class="game-card__name">${game.name}</span>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    mainContent.innerHTML = html;
}

// Список удалённых игр для редиректа (Requirements 4.3)
const REMOVED_GAMES = ['sov-construction', 'true-false'];

/**
 * Запуск игры
 * @param {string} gameId - ID игры
 */
export async function startGame(gameId) {
    // Редирект при попытке открыть удалённые игры
    if (REMOVED_GAMES.includes(gameId)) {
        navigate('games');
        return;
    }
    state.currentGame = gameId;
    navigate('game');
}

// Импорт игр
import { FlashcardsGame } from './games/flashcards.js';
import { QuizGame } from './games/quiz.js';
import { WritingGame } from './games/writing.js';
import { SentenceBuilderGame } from './games/sentence-builder.js';
import { MatchingGame } from './games/matching.js';
import { FillInGame } from './games/fill-in.js';
import { ListeningGame } from './games/listening.js';
import { TranslationGame } from './games/translation.js';
// Удалены: TrueFalseGame, SOVConstructionGame

// Текущий экземпляр игры
let currentGame = null;

// Глобальная функция рендеринга игры
window.renderGame = function() {
    if (currentGame) {
        mainContent.innerHTML = currentGame.render();
        // Сохраняем состояние игры при каждом обновлении
        if (typeof saveGameState === 'function' && state.currentGame) {
            saveGameState({
                gameId: state.currentGame,
                currentIndex: currentGame.currentIndex || 0,
                score: currentGame.score || 0,
                answers: currentGame.answers || [],
                startTime: currentGame.startTime || Date.now()
            });
        }
    }
};

// Делаем currentGame доступным глобально
window.currentGame = null;

/**
 * Рендеринг экрана игры
 */
function renderGameScreen() {
    if (!state.generatedContent) {
        navigate('home');
        return;
    }

    // Редирект при попытке открыть удалённые игры через восстановление состояния
    if (REMOVED_GAMES.includes(state.currentGame)) {
        navigate('games');
        return;
    }

    const gameClasses = {
        'flashcards': FlashcardsGame,
        'quiz': QuizGame,
        'writing': WritingGame,
        'translation': TranslationGame,
        'sentence-builder': SentenceBuilderGame,
        'matching': MatchingGame,
        'fill-in': FillInGame,
        'listening': ListeningGame
        // Удалены: 'true-false': TrueFalseGame, 'sov-construction': SOVConstructionGame
    };

    const GameClass = gameClasses[state.currentGame];
    if (!GameClass) {
        mainContent.innerHTML = `<div class="game"><p>Игра не найдена</p></div>`;
        return;
    }

    currentGame = new GameClass(state.generatedContent);
    
    // Восстанавливаем состояние игры если есть
    const savedGameState = loadGameState();
    if (savedGameState && savedGameState.gameId === state.currentGame) {
        currentGame.currentIndex = savedGameState.currentIndex || 0;
        currentGame.score = savedGameState.score || 0;
        currentGame.answers = savedGameState.answers || [];
        if (savedGameState.startTime) {
            currentGame.startTime = savedGameState.startTime;
        }
    }
    
    window.currentGame = currentGame;
    mainContent.innerHTML = currentGame.render();
}


/**
 * Рендеринг экрана настроек
 */
function renderSettingsScreen() {
    const settings = getSettings();

    mainContent.innerHTML = `
        <div class="settings">
            <h2>Настройки</h2>
            
            <div class="settings__group">
                <div class="settings__toggle">
                    <span>Тёмная тема</span>
                    <label class="toggle">
                        <input type="checkbox" class="toggle__input" 
                               ${settings.theme === 'dark' ? 'checked' : ''}
                               onchange="App.toggleTheme(this.checked)">
                        <span class="toggle__slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings__group">
                <label class="settings__label">API ключ Gemini</label>
                <input type="password" class="settings__input" 
                       value="${settings.apiKey || ''}"
                       placeholder="Введите API ключ"
                       onchange="App.updateApiKey(this.value)">
            </div>

            <div class="settings__group">
                <div class="settings__toggle">
                    <span>Gemini TTS</span>
                    <label class="toggle">
                        <input type="checkbox" class="toggle__input"
                               ${settings.ttsEnabled ? 'checked' : ''}
                               onchange="App.toggleTTS(this.checked)">
                        <span class="toggle__slider"></span>
                    </label>
                </div>
                <small class="text-secondary">Если выключено, используется Web Speech API</small>
            </div>

            <div class="settings__group">
                <label class="settings__label">Голос TTS</label>
                <select class="settings__input" onchange="App.updateVoice(this.value)">
                    <optgroup label="Чёткие голоса">
                        <option value="Kore" ${settings.ttsVoice === 'Kore' ? 'selected' : ''}>Kore</option>
                        <option value="Orus" ${settings.ttsVoice === 'Orus' ? 'selected' : ''}>Orus</option>
                        <option value="Iapetus" ${settings.ttsVoice === 'Iapetus' ? 'selected' : ''}>Iapetus</option>
                        <option value="Erinome" ${settings.ttsVoice === 'Erinome' ? 'selected' : ''}>Erinome</option>
                    </optgroup>
                    <optgroup label="Естественные голоса">
                        <option value="Puck" ${settings.ttsVoice === 'Puck' ? 'selected' : ''}>Puck</option>
                        <option value="Aoede" ${settings.ttsVoice === 'Aoede' ? 'selected' : ''}>Aoede</option>
                        <option value="Fenrir" ${settings.ttsVoice === 'Fenrir' ? 'selected' : ''}>Fenrir</option>
                    </optgroup>
                    <optgroup label="Спокойные голоса (для shadowing)">
                        <option value="Achernar" ${settings.ttsVoice === 'Achernar' ? 'selected' : ''}>Achernar</option>
                        <option value="Vindemiatrix" ${settings.ttsVoice === 'Vindemiatrix' ? 'selected' : ''}>Vindemiatrix</option>
                        <option value="Sulafat" ${settings.ttsVoice === 'Sulafat' ? 'selected' : ''}>Sulafat</option>
                    </optgroup>
                </select>
            </div>

            <div class="settings__group">
                <label class="settings__label">Скорость речи: ${settings.speakingRate}</label>
                <input type="range" class="settings__input" 
                       min="0.5" max="1.5" step="0.1"
                       value="${settings.speakingRate}"
                       onchange="App.updateSpeakingRate(this.value)">
            </div>

            <div class="settings__group">
                <div class="settings__toggle">
                    <span>Звуковые эффекты</span>
                    <label class="toggle">
                        <input type="checkbox" class="toggle__input"
                               ${settings.soundEnabled ? 'checked' : ''}
                               onchange="App.toggleSound(this.checked)">
                        <span class="toggle__slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings__group mt-2">
                <button class="btn btn--danger btn--block" onclick="App.clearAllData()">
                    🗑️ Очистить все данные
                </button>
            </div>
        </div>
    `;
}

/**
 * Переключение темы
 * @param {boolean} isDark - тёмная тема
 */
export function toggleTheme(isDark) {
    const theme = isDark ? 'dark' : 'light';
    applyTheme(theme);
    const settings = getSettings();
    settings.theme = theme;
    saveSettings(settings);
}

/**
 * Обновление API ключа
 * @param {string} key - API ключ
 */
export function updateApiKey(key) {
    setApiKey(key);
    const settings = getSettings();
    settings.apiKey = key;
    saveSettings(settings);
}

/**
 * Переключение TTS
 * @param {boolean} enabled - включено
 */
export function toggleTTS(enabled) {
    const settings = getSettings();
    settings.ttsEnabled = enabled;
    saveSettings(settings);
}

/**
 * Обновление голоса TTS
 * @param {string} voice - голос
 */
export function updateVoice(voice) {
    const settings = getSettings();
    settings.ttsVoice = voice;
    saveSettings(settings);
}

/**
 * Обновление скорости речи
 * @param {string} rate - скорость
 */
export function updateSpeakingRate(rate) {
    const settings = getSettings();
    settings.speakingRate = parseFloat(rate);
    saveSettings(settings);
    render();
}

/**
 * Переключение звуковых эффектов
 * @param {boolean} enabled - включено
 */
export function toggleSound(enabled) {
    const settings = getSettings();
    settings.soundEnabled = enabled;
    saveSettings(settings);
}

/**
 * Очистка всех данных
 */
export function clearAllData() {
    showModal('Подтверждение', 'Вы уверены? Все данные будут удалены.', [
        { label: 'Отмена' },
        { 
            label: 'Удалить', 
            primary: true,
            handler: () => {
                localStorage.clear();
                location.reload();
            }
        }
    ]);
}


/**
 * Рендеринг экрана статистики
 */
function renderStatsScreen() {
    const progress = getProgress();
    const levels = getLevels();

    // Подсчёт статистики по уровням
    const levelStats = levels.map(level => {
        const topics = getTopicsByLevel(level);
        const completed = topics.filter(t => {
            const tp = progress.topicsCompleted[t.id];
            return tp && tp.gamesPlayed?.length >= 10;
        }).length;
        return {
            level,
            total: topics.length,
            completed,
            percentage: topics.length > 0 ? Math.round((completed / topics.length) * 100) : 0
        };
    });

    const totalTopics = levelStats.reduce((sum, l) => sum + l.total, 0);
    const totalCompleted = levelStats.reduce((sum, l) => sum + l.completed, 0);

    mainContent.innerHTML = `
        <div class="stats">
            <h2>Статистика</h2>
            
            <div class="stats-card">
                <div class="stats-card__title">Общий прогресс</div>
                <div class="stats-card__value">${totalCompleted}/${totalTopics}</div>
                <div class="stats-card__subtitle">тем завершено</div>
            </div>

            <div class="stats-card">
                <div class="stats-card__title">Время обучения</div>
                <div class="stats-card__value">${formatTime(progress.totalTimeSpent)}</div>
            </div>

            <div class="stats-card">
                <div class="stats-card__title">Изучено фраз</div>
                <div class="stats-card__value">${progress.chunksLearned}</div>
            </div>

            <div class="stats-card">
                <div class="stats-card__title">Точность</div>
                <div class="stats-card__value">${progress.overallAccuracy.toFixed(1)}%</div>
            </div>

            <h3 class="mt-2">По уровням</h3>
            ${levelStats.map(ls => `
                <div class="card">
                    <div class="card__title">${ls.level}</div>
                    <div class="game__progress-bar">
                        <div class="game__progress-fill" style="width: ${ls.percentage}%"></div>
                    </div>
                    <div class="card__subtitle">${ls.completed}/${ls.total} тем (${ls.percentage}%)</div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Форматирование времени
 * @param {number} seconds - секунды
 * @returns {string}
 */
export function formatTime(seconds) {
    if (seconds < 60) return `${seconds} сек`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours} ч ${mins} мин`;
}

/**
 * Рендеринг дашборда на главной странице
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 * @returns {string} - HTML
 */
function renderDashboard() {
    const progress = getProgress();
    const levels = getLevels();
    
    const levelStats = levels.map(level => {
        const topics = getTopicsByLevel(level);
        const completed = topics.filter(t => {
            const tp = progress.topicsCompleted[t.id];
            return tp && tp.gamesPlayed?.length >= 10;
        }).length;
        return {
            level,
            total: topics.length,
            completed,
            percentage: topics.length > 0 ? Math.round((completed / topics.length) * 100) : 0
        };
    });
    
    const totalTopics = levelStats.reduce((sum, l) => sum + l.total, 0);
    const totalCompleted = levelStats.reduce((sum, l) => sum + l.completed, 0);
    const overallPercentage = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;
    
    const hasProgress = progress.chunksLearned > 0 || progress.totalTimeSpent > 0;
    
    if (!hasProgress) {
        return `
            <div class="dashboard dashboard--empty">
                <div class="dashboard__welcome">
                    <h2>Merhaba! 👋</h2>
                    <p>Выберите тему ниже, чтобы начать изучение турецкого языка</p>
                </div>
                <button class="btn btn--arrow" onclick="App.navigate('stats')" style="position: absolute; bottom: 1.5rem; right: 0;">
                    →
                </button>
            </div>
        `;
    }
    
    return `
        <div class="dashboard">
            <div class="dashboard__header">
                <div class="dashboard__greeting">
                    <span class="dashboard__greeting-text">Прогресс обучения</span>
                    <span class="dashboard__greeting-percent">${overallPercentage}%</span>
                </div>
                <button class="btn btn--secondary dashboard__stats-btn" onclick="App.navigate('stats')">
                    📊
                </button>
            </div>
            
            <div class="dashboard__stats">
                <div class="dashboard__stat">
                    <div class="dashboard__stat-value">${progress.chunksLearned}</div>
                    <div class="dashboard__stat-label">фраз</div>
                </div>
                <div class="dashboard__stat">
                    <div class="dashboard__stat-value">${progress.overallAccuracy.toFixed(0)}%</div>
                    <div class="dashboard__stat-label">точность</div>
                </div>
                <div class="dashboard__stat">
                    <div class="dashboard__stat-value">${formatTime(progress.totalTimeSpent)}</div>
                    <div class="dashboard__stat-label">время</div>
                </div>
            </div>
            
            <div class="dashboard__progress">
                <div class="dashboard__progress-bar">
                    <div class="dashboard__progress-fill" style="width: ${overallPercentage}%"></div>
                </div>
            </div>
            
            <div class="dashboard__levels">
                ${levelStats.map(ls => `
                    <div class="dashboard__level">
                        <span class="dashboard__level-name">${ls.level}</span>
                        <div class="dashboard__level-bar">
                            <div class="dashboard__level-fill" style="width: ${ls.percentage}%"></div>
                        </div>
                        <span class="dashboard__level-percent">${ls.percentage}%</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Сохранение текущего состояния игры
 */
export function saveCurrentGameState() {
    if (!currentGame || !state.currentGame) return;
    
    saveGameState({
        gameId: state.currentGame,
        currentIndex: currentGame.currentIndex || 0,
        score: currentGame.score || 0,
        answers: currentGame.answers || [],
        startTime: currentGame.startTime || Date.now()
    });
}

/**
 * Сохранение результата игры
 * @param {string} gameId - ID игры
 * @param {object} results - результаты
 */
export function saveGameResult(gameId, results) {
    // Очищаем состояние игры при завершении
    clearSessionState();
    const progress = getProgress();
    const topicId = state.selectedTopic?.id;
    
    if (!topicId) return;

    if (!progress.topicsCompleted[topicId]) {
        progress.topicsCompleted[topicId] = {
            gamesPlayed: [],
            lastPlayed: Date.now(),
            bestScore: 0
        };
    }

    const topicProgress = progress.topicsCompleted[topicId];
    
    if (!topicProgress.gamesPlayed.includes(gameId)) {
        topicProgress.gamesPlayed.push(gameId);
    }
    
    topicProgress.lastPlayed = Date.now();
    
    if (results.percentage > topicProgress.bestScore) {
        topicProgress.bestScore = results.percentage;
    }

    progress.totalTimeSpent += results.timeSpent || 0;
    progress.chunksLearned += results.chunksLearned || 0;
    
    // Пересчёт общей точности
    const allScores = Object.values(progress.topicsCompleted)
        .map(tp => tp.bestScore)
        .filter(s => s > 0);
    
    if (allScores.length > 0) {
        progress.overallAccuracy = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    }

    saveProgress(progress);
}

// Экспорт глобального объекта App для onclick handlers
window.App = {
    init,
    navigate,
    render,
    toggleLevel,
    selectTopic,
    speakPhrase,
    startGame,
    toggleTheme,
    updateApiKey,
    toggleTTS,
    updateVoice,
    updateSpeakingRate,
    toggleSound,
    clearAllData,
    saveGameResult,
    saveCurrentGameState,
    showModal,
    hideModal,
    showLoading,
    hideLoading,
    handleError,
    state
};

// Инициализация при загрузке DOM
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
}

export default window.App;
