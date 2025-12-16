/**
 * TTS Module - синтез турецкой речи
 * Модель: gemini-2.5-flash-preview-tts
 * Fallback: Web Speech API
 */

import { getApiKey, cacheAudio, getCachedAudio, getSettings } from './storage.js';

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

// Доступные голоса для турецкого языка
export const TURKISH_VOICES = {
    clear: ['Kore', 'Orus', 'Iapetus', 'Erinome'],      // Чёткие голоса для обучения
    natural: ['Puck', 'Aoede', 'Fenrir'],               // Естественные голоса
    calm: ['Achernar', 'Vindemiatrix', 'Sulafat']       // Спокойные голоса для shadowing
};

// Все доступные голоса
export const ALL_VOICES = [
    ...TURKISH_VOICES.clear,
    ...TURKISH_VOICES.natural,
    ...TURKISH_VOICES.calm
];

/**
 * Генерация хэша для фразы (для кэширования)
 * @param {string} text - текст
 * @param {string} voice - голос
 * @returns {string} - хэш
 */
function generateHash(text, voice) {
    let hash = 0;
    const str = `${text}_${voice}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

/**
 * Проверка валидности голоса
 * @param {string} voice - название голоса
 * @returns {boolean}
 */
export function isValidVoice(voice) {
    return ALL_VOICES.includes(voice);
}

/**
 * Получить голос по умолчанию
 * @returns {string}
 */
export function getDefaultVoice() {
    const settings = getSettings();
    return settings.ttsVoice || 'Kore';
}


/**
 * Генерация речи через Gemini TTS API
 * @param {string} text - текст для озвучки
 * @param {string} voice - голос (по умолчанию из настроек)
 * @returns {Promise<ArrayBuffer>} - аудио данные
 */
export async function generateSpeech(text, voice = null) {
    const settings = getSettings();
    const selectedVoice = voice || settings.ttsVoice || 'Kore';
    
    // Проверяем кэш
    const hash = generateHash(text, selectedVoice);
    const cached = getCachedAudio(hash);
    
    if (cached && cached.audioData) {
        // Декодируем base64 обратно в ArrayBuffer
        const binaryString = atob(cached.audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('API_KEY_MISSING');
    }

    // Проверяем, включён ли Gemini TTS
    if (!settings.ttsEnabled) {
        throw new Error('TTS_DISABLED');
    }

    const url = `${BASE_URL}${TTS_MODEL}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: text }]
                }],
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: selectedVoice
                            }
                        }
                    }
                }
            })
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('API_KEY_INVALID');
            }
            if (response.status === 429) {
                throw new Error('RATE_LIMITED');
            }
            throw new Error(`TTS_API_ERROR: ${response.status}`);
        }

        const data = await response.json();
        
        // Извлекаем аудио данные из ответа
        const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (!audioData) {
            throw new Error('TTS_NO_AUDIO');
        }

        // Декодируем base64 в ArrayBuffer
        const binaryString = atob(audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Кэшируем результат
        cacheAudio(hash, {
            audioData: audioData,
            generatedAt: Date.now(),
            voice: selectedVoice
        });

        return bytes.buffer;
    } catch (error) {
        if (error.message.startsWith('API_') || 
            error.message.startsWith('TTS_') ||
            error.message.startsWith('RATE_')) {
            throw error;
        }
        throw new Error('TTS_NETWORK_ERROR');
    }
}

/**
 * Воспроизведение аудио через Web Audio API
 * @param {ArrayBuffer} audioData - аудио данные
 * @returns {Promise<void>}
 */
export async function playAudio(audioData) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    try {
        const audioBuffer = await audioContext.decodeAudioData(audioData);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        return new Promise((resolve, reject) => {
            source.onended = resolve;
            source.onerror = reject;
            source.start(0);
        });
    } catch (error) {
        throw new Error('AUDIO_PLAYBACK_ERROR');
    }
}

/**
 * Fallback: Web Speech API для синтеза речи
 * @param {string} text - текст для озвучки
 * @param {number} rate - скорость речи (0.5-2.0)
 * @returns {Promise<void>}
 */
export function speakWithWebSpeech(text, rate = 0.8) {
    return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            reject(new Error('WEB_SPEECH_NOT_SUPPORTED'));
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = rate;
        
        // Пытаемся найти турецкий голос
        const voices = speechSynthesis.getVoices();
        const turkishVoice = voices.find(v => v.lang.startsWith('tr'));
        if (turkishVoice) {
            utterance.voice = turkishVoice;
        }

        utterance.onend = resolve;
        utterance.onerror = (e) => reject(new Error('WEB_SPEECH_ERROR: ' + e.error));

        speechSynthesis.speak(utterance);
    });
}

/**
 * Универсальная функция озвучки с fallback
 * @param {string} text - текст для озвучки
 * @param {string} voice - голос (для Gemini TTS)
 * @returns {Promise<{method: string}>} - метод озвучки
 */
export async function speak(text, voice = null) {
    const settings = getSettings();

    // Пробуем Gemini TTS если включён
    if (settings.ttsEnabled) {
        try {
            const audioData = await generateSpeech(text, voice);
            await playAudio(audioData);
            return { method: 'gemini-tts' };
        } catch (error) {
            console.warn('Gemini TTS failed, falling back to Web Speech:', error.message);
        }
    }

    // Fallback на Web Speech API
    try {
        await speakWithWebSpeech(text, settings.speakingRate);
        return { method: 'web-speech' };
    } catch (error) {
        console.error('Web Speech also failed:', error.message);
        throw new Error('ALL_TTS_FAILED');
    }
}

// Экспорт объекта TTS для совместимости
export const TTS = {
    TURKISH_VOICES,
    ALL_VOICES,
    isValidVoice,
    getDefaultVoice,
    generateSpeech,
    playAudio,
    speakWithWebSpeech,
    speak
};

export default TTS;
