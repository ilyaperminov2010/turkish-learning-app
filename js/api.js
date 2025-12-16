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
    
    // Удаляем ```json ... ``` или ``` ... ``` (более гибкие паттерны)
    // Паттерн 1: ```json\n...\n``` или ```json ...\n```
    const jsonBlockMatch = cleaned.match(/^```json\s*\n?([\s\S]*?)\n?```\s*$/);
    if (jsonBlockMatch) {
        return jsonBlockMatch[1].trim();
    }
    
    // Паттерн 2: ```\n...\n```
    const codeBlockMatch = cleaned.match(/^```\s*\n?([\s\S]*?)\n?```\s*$/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }
    
    // Паттерн 3: Ищем JSON внутри текста с markdown
    const jsonInTextMatch = cleaned.match(/```json\s*\n?([\s\S]*?)\n?```/);
    if (jsonInTextMatch) {
        return jsonInTextMatch[1].trim();
    }
    
    // Паттерн 4: Просто ``` без json
    const codeInTextMatch = cleaned.match(/```\s*\n?([\s\S]*?)\n?```/);
    if (codeInTextMatch) {
        return codeInTextMatch[1].trim();
    }
    
    // Паттерн 5: Одинарные бэктики
    const singleBacktickMatch = cleaned.match(/^`([\s\S]*?)`$/);
    if (singleBacktickMatch) {
        return singleBacktickMatch[1].trim();
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
    // Специальные инструкции для разных категорий
    const categoryInstructions = {
        culture: `Для культурной темы сгенерируй фразы и выражения, связанные с турецкой культурой.
Включи:
- Традиционные выражения и поговорки
- Фразы для культурных ситуаций
- Слова и термины, связанные с темой
- Типичные диалоги в культурном контексте`,
        grammar: `Для грамматической темы сгенерируй примеры, демонстрирующие грамматическое правило.
Включи разнообразные примеры использования в разных контекстах.`,
        vocabulary: `Для лексической темы сгенерируй слова и фразы по теме.
Включи как отдельные слова, так и устойчивые выражения.`,
        phonetics: `Для фонетической темы сгенерируй слова и фразы, демонстрирующие звуковые особенности.
Включи примеры с разными вариантами произношения.`
    };

    const categoryInstruction = categoryInstructions[topic.category] || '';

    return `Сгенерируй учебный контент для изучения турецкого языка.

Тема: ${topic.name}
Уровень: ${topic.level}
Категория: ${topic.category}
Описание: ${topic.description}

${categoryInstruction}

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

ФОРМАТ ОТВЕТА - СТРОГО СОБЛЮДАЙ:
Верни ТОЛЬКО чистый JSON без markdown-форматирования.
НЕ оборачивай ответ в \`\`\`json или \`\`\`.
НЕ добавляй никакого текста до или после JSON.

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
        // Проверяем наличие кандидатов
        if (!response.candidates || response.candidates.length === 0) {
            // Проверяем причину блокировки
            if (response.promptFeedback?.blockReason) {
                throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
            }
            throw new Error('No candidates in API response');
        }

        // Проверяем причину завершения
        const candidate = response.candidates[0];
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            console.warn('Finish reason:', candidate.finishReason);
            if (candidate.finishReason === 'SAFETY') {
                throw new Error('Content blocked by safety filters');
            }
            if (candidate.finishReason === 'MAX_TOKENS') {
                console.warn('Response may be truncated due to max tokens');
            }
        }

        // Получаем текст из ответа Gemini
        const text = candidate.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error('Empty response from API');
        }

        // Очищаем от markdown-форматирования
        let cleanedJson = stripMarkdown(text);
        
        // Пытаемся найти JSON в тексте если он не парсится напрямую
        let parsed;
        try {
            parsed = JSON.parse(cleanedJson);
        } catch (jsonError) {
            // Пробуем найти JSON объект в тексте
            const jsonMatch = cleanedJson.match(/\{[\s\S]*"chunks"[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                // Пробуем найти массив chunks напрямую
                const arrayMatch = cleanedJson.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    parsed = { chunks: JSON.parse(arrayMatch[0]) };
                } else {
                    throw new Error('Could not find valid JSON in response: ' + jsonError.message);
                }
            }
        }
        
        // Валидация структуры - пробуем разные варианты
        let chunks = parsed.chunks;
        
        // Если chunks нет, проверяем альтернативные названия
        if (!chunks || !Array.isArray(chunks)) {
            // Проверяем альтернативные ключи
            const altKeys = ['items', 'phrases', 'content', 'data', 'results'];
            for (const key of altKeys) {
                if (parsed[key] && Array.isArray(parsed[key])) {
                    chunks = parsed[key];
                    break;
                }
            }
        }
        
        // Если всё ещё нет chunks, проверяем является ли сам parsed массивом
        if (!chunks && Array.isArray(parsed)) {
            chunks = parsed;
        }
        
        if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
            console.error('Response structure:', JSON.stringify(parsed, null, 2).substring(0, 500));
            throw new Error('Invalid response structure: missing chunks array');
        }

        // Добавляем ID если отсутствует и нормализуем структуру
        const normalizedChunks = chunks.map((chunk, index) => ({
            id: chunk.id || `chunk_${index}`,
            turkish: chunk.turkish || chunk.phrase || chunk.text || '',
            russian: chunk.russian || chunk.translation || chunk.meaning || '',
            example: chunk.example || chunk.sentence || '',
            exampleTranslation: chunk.exampleTranslation || chunk.sentenceTranslation || '',
            grammarNote: chunk.grammarNote || chunk.note || chunk.grammar || null,
            words: chunk.words || []
        }));

        return { chunks: normalizedChunks };
    } catch (error) {
        console.error('Parse error:', error);
        console.error('Raw response:', JSON.stringify(response, null, 2).substring(0, 1000));
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
