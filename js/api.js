/**
 * API Module - работа с Gemini API
 * Модель для контента: gemini-2.5-flash
 * Модель для TTS: gemini-2.5-flash-preview-tts
 */

import { getApiKey, setCache, getCache, hasCache } from './storage.js';

const CONTENT_MODEL = 'gemini-2.5-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

let apiKey = '';

/**
 * Очистка ответа от markdown-форматирования
 * @param {string} text - текст ответа
 * @returns {string} - очищенный JSON
 */
export function stripMarkdown(text) {
    let cleaned = text.trim();
    
    // Удаляем ```json ... ``` или ``` ... ``` или ` ... `
    const patterns = [
        /^```json\s*([\s\S]*?)\s*```$/,
        /^```\s*([\s\S]*?)\s*```$/,
        /^`([\s\S]*?)`$/
    ];
    
    for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
            cleaned = match[1].trim();
            break;
        }
    }
    
    return cleaned;
}

/**
 * Установить API ключ
 * @param {string} key - API ключ
 */
export function setApiKey(key) {
    apiKey = key;
}

/**
 * Получить текущий API ключ
 * @returns {string}
 */
export function getKey() {
    if (!apiKey) {
        apiKey = getApiKey();
    }
    return apiKey;
}

/**
 * Построить промпт для генерации контента
 * @param {object} topic - тема
 * @returns {string} - промпт
 */
export function buildPrompt(topic) {
    return `Сгенерируй учебный контент для изучения турецкого языка.

Тема: ${topic.name}
Уровень: ${topic.level}
Категория: ${topic.category}
Описание: ${topic.description}

Сгенерируй 25-35 фраз (chunks) для изучения. Каждая фраза должна быть связана с темой.

ВАЖНО:
- Используй SOV (Subject-Object-Verb) структуру турецкого языка
- Учитывай гармонию гласных
- Фразы должны быть практичными и часто используемыми
- Примеры должны показывать фразу в контексте

КРИТИЧЕСКИ ВАЖНО ДЛЯ ПЕРЕВОДОВ:
- Русские переводы должны звучать ЕСТЕСТВЕННО для носителя русского языка
- НЕ делай дословный перевод, передавай СМЫСЛ фразы
- Используй разговорный русский язык, как говорят в реальной жизни
- Примеры правильных переводов:
  * "Ne var?" → "Что случилось?" (НЕ "Что есть?")
  * "Nasılsın?" → "Как дела?" (НЕ "Как ты?")
  * "Bir şey değil" → "Не за что" (НЕ "Это не вещь")
  * "Kolay gelsin" → "Удачи в работе" (НЕ "Пусть будет легко")

ФОРМАТ ОТВЕТА:
Верни ТОЛЬКО чистый JSON без markdown-форматирования.
НЕ оборачивай ответ в \`\`\`json или \`\`\`.

{
  "chunks": [
    {
      "id": "уникальный_id",
      "turkish": "турецкая фраза",
      "russian": "естественный русский перевод",
      "example": "пример предложения на турецком",
      "exampleTranslation": "естественный перевод примера",
      "grammarNote": "грамматическая заметка (опционально)",
      "words": [
        {"text": "слово", "role": "subject|object|verb|other"}
      ]
    }
  ]
}`;
}


/**
 * Парсинг ответа API
 * @param {object} response - ответ API
 * @returns {object} - распарсенный контент
 */
export function parseResponse(response) {
    try {
        // Получаем текст из ответа Gemini
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error('Empty response from API');
        }

        // Очищаем от markdown-форматирования
        const cleanedJson = stripMarkdown(text);

        const parsed = JSON.parse(cleanedJson);
        
        // Валидация структуры
        if (!parsed.chunks || !Array.isArray(parsed.chunks)) {
            throw new Error('Invalid response structure: missing chunks array');
        }

        // Добавляем ID если отсутствует
        parsed.chunks = parsed.chunks.map((chunk, index) => ({
            id: chunk.id || `chunk_${index}`,
            turkish: chunk.turkish || '',
            russian: chunk.russian || '',
            example: chunk.example || '',
            exampleTranslation: chunk.exampleTranslation || '',
            grammarNote: chunk.grammarNote || null,
            words: chunk.words || []
        }));

        return parsed;
    } catch (error) {
        console.error('Parse error:', error);
        throw new Error('Failed to parse API response: ' + error.message);
    }
}

/**
 * Генерация контента через Gemini API
 * @param {object} topic - тема
 * @returns {Promise<object>} - сгенерированный контент
 */
export async function generateContent(topic) {
    // Проверяем кэш
    if (hasCache(topic.id)) {
        console.log('Using cached content for:', topic.id);
        return getCache(topic.id);
    }

    const key = getKey();
    if (!key) {
        throw new Error('API_KEY_MISSING');
    }

    const prompt = buildPrompt(topic);
    const url = `${BASE_URL}${CONTENT_MODEL}:generateContent?key=${key}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 1.0,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 401 || response.status === 403) {
                throw new Error('API_KEY_INVALID');
            }
            if (response.status === 429) {
                throw new Error('RATE_LIMITED');
            }
            
            throw new Error(`API_ERROR: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const parsed = parseResponse(data);

        // Формируем финальный объект контента
        const content = {
            topicId: topic.id,
            generatedAt: Date.now(),
            chunks: parsed.chunks
        };

        // Кэшируем результат
        setCache(topic.id, content);

        return content;
    } catch (error) {
        if (error.message.startsWith('API_')) {
            throw error;
        }
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('NETWORK_ERROR');
        }
        throw new Error('GENERATION_ERROR: ' + error.message);
    }
}

/**
 * Проверка валидности API ключа
 * @param {string} key - API ключ для проверки
 * @returns {Promise<boolean>} - валидность ключа
 */
export async function validateApiKey(key) {
    const url = `${BASE_URL}${CONTENT_MODEL}:generateContent?key=${key}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: 'Test' }]
                }],
                generationConfig: {
                    maxOutputTokens: 10
                }
            })
        });

        return response.ok || response.status === 429; // 429 = valid key but rate limited
    } catch {
        return false;
    }
}

// Экспорт объекта API для совместимости
export const GeminiAPI = {
    setApiKey,
    getKey,
    buildPrompt,
    parseResponse,
    generateContent,
    validateApiKey
};

export default GeminiAPI;
