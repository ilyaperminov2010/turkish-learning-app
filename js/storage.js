/**
 * Storage Module - работа с LocalStorage
 * Реализует сохранение, загрузку, кэширование контента
 */

export const STORAGE_KEYS = {
    API_KEY: 'turkish_app_api_key',
    SETTINGS: 'turkish_app_settings',
    PROGRESS: 'turkish_app_progress',
    CONTENT_CACHE: 'turkish_app_content_',
    SRS_DATA: 'turkish_app_srs',
    AUDIO_CACHE: 'turkish_app_audio_'
};

export const SESSION_KEYS = {
    APP_STATE: 'turkish_app_session_state',
    GAME_STATE: 'turkish_app_game_state'
};

/**
 * Сохранение данных в LocalStorage
 * @param {string} key - ключ
 * @param {any} data - данные для сохранения
 * @returns {boolean} - успешность операции
 */
export function save(key, data) {
    try {
        const serialized = JSON.stringify(data);
        localStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('LocalStorage full:', error);
            throw new Error('STORAGE_FULL');
        }
        console.error('Storage save error:', error);
        return false;
    }
}

/**
 * Загрузка данных из LocalStorage
 * @param {string} key - ключ
 * @returns {any|null} - данные или null
 */
export function load(key) {
    try {
        const serialized = localStorage.getItem(key);
        if (serialized === null) {
            return null;
        }
        return JSON.parse(serialized);
    } catch (error) {
        console.error('Storage load error:', error);
        return null;
    }
}


/**
 * Удаление данных из LocalStorage
 * @param {string} key - ключ
 * @returns {boolean} - успешность операции
 */
export function remove(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Storage remove error:', error);
        return false;
    }
}

/**
 * Проверка наличия кэша для темы
 * @param {string} topicId - ID темы
 * @returns {boolean}
 */
export function hasCache(topicId) {
    const key = STORAGE_KEYS.CONTENT_CACHE + topicId;
    return localStorage.getItem(key) !== null;
}

/**
 * Получение кэшированного контента для темы
 * @param {string} topicId - ID темы
 * @returns {object|null} - контент или null
 */
export function getCache(topicId) {
    const key = STORAGE_KEYS.CONTENT_CACHE + topicId;
    return load(key);
}

/**
 * Сохранение контента в кэш
 * @param {string} topicId - ID темы
 * @param {object} content - контент для кэширования
 * @returns {boolean} - успешность операции
 */
export function setCache(topicId, content) {
    const key = STORAGE_KEYS.CONTENT_CACHE + topicId;
    return save(key, content);
}

/**
 * Очистка кэша для конкретной темы
 * @param {string} topicId - ID темы
 * @returns {boolean} - успешность операции
 */
export function clearCache(topicId) {
    const key = STORAGE_KEYS.CONTENT_CACHE + topicId;
    return remove(key);
}

/**
 * Очистка всего кэша контента
 * @returns {number} - количество очищенных записей
 */
export function clearAllCache() {
    let count = 0;
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEYS.CONTENT_CACHE)) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        count++;
    });
    
    return count;
}

/**
 * Получение настроек приложения
 * @returns {object} - настройки с дефолтными значениями
 */
export function getSettings() {
    const defaults = {
        theme: 'light',
        soundEnabled: true,
        apiKey: 'AIzaSyBmmTMJbEKPZ5aHUliDcJ-6goVHS7qKTiA',
        ttsVoice: 'Kore',
        ttsEnabled: true,
        speakingRate: 0.8
    };
    
    const saved = load(STORAGE_KEYS.SETTINGS);
    return { ...defaults, ...saved };
}

/**
 * Сохранение настроек приложения
 * @param {object} settings - настройки
 * @returns {boolean} - успешность операции
 */
export function saveSettings(settings) {
    return save(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Получение прогресса пользователя
 * @returns {object} - прогресс с дефолтными значениями
 */
export function getProgress() {
    const defaults = {
        topicsCompleted: {},
        totalTimeSpent: 0,
        chunksLearned: 0,
        overallAccuracy: 0
    };
    
    const saved = load(STORAGE_KEYS.PROGRESS);
    return { ...defaults, ...saved };
}

/**
 * Сохранение прогресса пользователя
 * @param {object} progress - прогресс
 * @returns {boolean} - успешность операции
 */
export function saveProgress(progress) {
    return save(STORAGE_KEYS.PROGRESS, progress);
}

/**
 * Получение SRS данных
 * @returns {object} - SRS данные
 */
export function getSRSData() {
    return load(STORAGE_KEYS.SRS_DATA) || {};
}

/**
 * Сохранение SRS данных
 * @param {object} srsData - SRS данные
 * @returns {boolean} - успешность операции
 */
export function saveSRSData(srsData) {
    return save(STORAGE_KEYS.SRS_DATA, srsData);
}

/**
 * Получение API ключа
 * @returns {string} - API ключ или пустая строка
 */
export function getApiKey() {
    return load(STORAGE_KEYS.API_KEY) || '';
}

/**
 * Сохранение API ключа
 * @param {string} apiKey - API ключ
 * @returns {boolean} - успешность операции
 */
export function saveApiKey(apiKey) {
    return save(STORAGE_KEYS.API_KEY, apiKey);
}

/**
 * Кэширование аудио данных
 * @param {string} phraseHash - хэш фразы
 * @param {object} audioData - данные аудио
 * @returns {boolean} - успешность операции
 */
export function cacheAudio(phraseHash, audioData) {
    const key = STORAGE_KEYS.AUDIO_CACHE + phraseHash;
    return save(key, audioData);
}

/**
 * Получение кэшированного аудио
 * @param {string} phraseHash - хэш фразы
 * @returns {object|null} - данные аудио или null
 */
export function getCachedAudio(phraseHash) {
    const key = STORAGE_KEYS.AUDIO_CACHE + phraseHash;
    return load(key);
}

/**
 * Проверка доступного места в LocalStorage
 * @returns {object} - информация о хранилище
 */
export function getStorageInfo() {
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            const value = localStorage.getItem(key);
            totalSize += key.length + (value ? value.length : 0);
        }
    }
    
    return {
        usedBytes: totalSize * 2, // UTF-16
        usedMB: (totalSize * 2 / 1024 / 1024).toFixed(2),
        estimatedMaxMB: 5 // Типичный лимит LocalStorage
    };
}

// Экспорт объекта Storage для совместимости
export const Storage = {
    keys: STORAGE_KEYS,
    save,
    load,
    remove,
    hasCache,
    getCache,
    setCache,
    clearCache,
    clearAllCache,
    getSettings,
    saveSettings,
    getProgress,
    saveProgress,
    getSRSData,
    saveSRSData,
    getApiKey,
    saveApiKey,
    cacheAudio,
    getCachedAudio,
    getStorageInfo
};

export default Storage;


/**
 * Сохранение состояния сессии в sessionStorage
 * @param {object} state - состояние приложения
 * @returns {boolean} - успешность операции
 */
export function saveSessionState(state) {
    try {
        const sessionData = {
            currentScreen: state.currentScreen,
            selectedLevel: state.selectedLevel,
            selectedTopic: state.selectedTopic,
            currentGame: state.currentGame,
            generatedContent: state.generatedContent,
            timestamp: Date.now()
        };
        sessionStorage.setItem(SESSION_KEYS.APP_STATE, JSON.stringify(sessionData));
        return true;
    } catch (error) {
        console.error('Session state save error:', error);
        return false;
    }
}

/**
 * Загрузка состояния сессии из sessionStorage
 * @returns {object|null} - состояние или null
 */
export function loadSessionState() {
    try {
        const data = sessionStorage.getItem(SESSION_KEYS.APP_STATE);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Session state load error:', error);
        return null;
    }
}

/**
 * Сохранение состояния игры в sessionStorage
 * @param {object} gameState - состояние игры
 * @returns {boolean} - успешность операции
 */
export function saveGameState(gameState) {
    try {
        const data = {
            gameId: gameState.gameId,
            currentIndex: gameState.currentIndex,
            score: gameState.score,
            answers: gameState.answers,
            startTime: gameState.startTime,
            timestamp: Date.now()
        };
        sessionStorage.setItem(SESSION_KEYS.GAME_STATE, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Game state save error:', error);
        return false;
    }
}

/**
 * Загрузка состояния игры из sessionStorage
 * @returns {object|null} - состояние игры или null
 */
export function loadGameState() {
    try {
        const data = sessionStorage.getItem(SESSION_KEYS.GAME_STATE);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Game state load error:', error);
        return null;
    }
}

/**
 * Очистка состояния сессии
 */
export function clearSessionState() {
    try {
        sessionStorage.removeItem(SESSION_KEYS.APP_STATE);
        sessionStorage.removeItem(SESSION_KEYS.GAME_STATE);
    } catch (error) {
        console.error('Session state clear error:', error);
    }
}
