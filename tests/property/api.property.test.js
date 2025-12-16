/**
 * Property-Based Tests для API Module
 * Feature: turkish-learning-app, app-improvements
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { hasCache, setCache, getCache } from '../../js/storage.js';
import { stripMarkdown } from '../../js/api.js';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (i) => Object.keys(store)[i] || null
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

beforeEach(() => {
    localStorage.clear();
});

/**
 * Feature: turkish-learning-app, Property 4: Cache Prevents API Calls
 * Validates: Requirements 2.4
 * 
 * For any topic with cached content, selecting that topic should not trigger 
 * a new API request.
 */
describe('Property 4: Cache Prevents API Calls', () => {
    test('hasCache returns true for cached topics', () => {
        const contentArb = fc.record({
            topicId: fc.string().filter(s => s.length > 0),
            generatedAt: fc.integer({ min: 0 }),
            chunks: fc.array(fc.record({
                id: fc.string(),
                turkish: fc.string(),
                russian: fc.string(),
                example: fc.string(),
                exampleTranslation: fc.string()
            }), { minLength: 1, maxLength: 10 })
        });

        fc.assert(fc.property(
            contentArb,
            (content) => {
                // Кэшируем контент
                setCache(content.topicId, content);
                
                // Проверяем что кэш существует
                return hasCache(content.topicId) === true;
            }
        ), { numRuns: 100 });
    });

    test('cached content is returned without modification', () => {
        const contentArb = fc.record({
            topicId: fc.string().filter(s => s.length > 0),
            generatedAt: fc.integer({ min: 0 }),
            chunks: fc.array(fc.record({
                id: fc.string(),
                turkish: fc.string(),
                russian: fc.string(),
                example: fc.string(),
                exampleTranslation: fc.string()
            }), { minLength: 1, maxLength: 10 })
        });

        fc.assert(fc.property(
            contentArb,
            (content) => {
                setCache(content.topicId, content);
                const retrieved = getCache(content.topicId);
                
                // Проверяем что контент идентичен
                return JSON.stringify(retrieved) === JSON.stringify(content);
            }
        ), { numRuns: 100 });
    });

    test('hasCache returns false for non-cached topics', () => {
        fc.assert(fc.property(
            fc.string().filter(s => s.length > 0),
            (topicId) => {
                // Не кэшируем ничего
                return hasCache(topicId) === false;
            }
        ), { numRuns: 100 });
    });

    test('multiple topics can be cached independently', () => {
        const topicIdsArb = fc.array(
            fc.string().filter(s => s.length > 0 && !s.includes('_')),
            { minLength: 2, maxLength: 5 }
        ).filter(arr => new Set(arr).size === arr.length);

        fc.assert(fc.property(
            topicIdsArb,
            (topicIds) => {
                // Кэшируем все темы
                topicIds.forEach((id, index) => {
                    setCache(id, {
                        topicId: id,
                        generatedAt: Date.now(),
                        chunks: [{ id: `chunk_${index}`, turkish: 'test', russian: 'тест' }]
                    });
                });

                // Проверяем что все темы закэшированы
                return topicIds.every(id => hasCache(id));
            }
        ), { numRuns: 100 });
    });
});


/**
 * Feature: app-improvements, Property 1: Markdown Stripping
 * Validates: Requirements 2.1, 2.2
 * 
 * For any JSON string wrapped in markdown code blocks (```json...``` or ```...```),
 * the stripMarkdown function should return the inner JSON content that can be parsed successfully.
 */
describe('Property 1: Markdown Stripping', () => {
    test('stripMarkdown removes ```json...``` wrapper and preserves valid JSON', () => {
        fc.assert(fc.property(
            fc.json(),
            (jsonObj) => {
                const jsonStr = JSON.stringify(jsonObj);
                const wrapped = '```json\n' + jsonStr + '\n```';
                const stripped = stripMarkdown(wrapped);
                
                // Должен успешно парситься и быть эквивалентным
                return JSON.stringify(JSON.parse(stripped)) === jsonStr;
            }
        ), { numRuns: 100 });
    });

    test('stripMarkdown removes ```...``` wrapper without language identifier', () => {
        fc.assert(fc.property(
            fc.json(),
            (jsonObj) => {
                const jsonStr = JSON.stringify(jsonObj);
                const wrapped = '```\n' + jsonStr + '\n```';
                const stripped = stripMarkdown(wrapped);
                
                return JSON.stringify(JSON.parse(stripped)) === jsonStr;
            }
        ), { numRuns: 100 });
    });

    test('stripMarkdown removes single backtick wrapper', () => {
        fc.assert(fc.property(
            fc.json(),
            (jsonObj) => {
                const jsonStr = JSON.stringify(jsonObj);
                const wrapped = '`' + jsonStr + '`';
                const stripped = stripMarkdown(wrapped);
                
                return JSON.stringify(JSON.parse(stripped)) === jsonStr;
            }
        ), { numRuns: 100 });
    });

    test('stripMarkdown preserves unwrapped JSON', () => {
        fc.assert(fc.property(
            fc.json(),
            (jsonObj) => {
                const jsonStr = JSON.stringify(jsonObj);
                const stripped = stripMarkdown(jsonStr);
                
                return JSON.stringify(JSON.parse(stripped)) === jsonStr;
            }
        ), { numRuns: 100 });
    });

    test('stripMarkdown handles whitespace around markdown blocks', () => {
        fc.assert(fc.property(
            fc.json(),
            (jsonObj) => {
                const jsonStr = JSON.stringify(jsonObj);
                const wrapped = '  ```json\n  ' + jsonStr + '  \n```  ';
                const stripped = stripMarkdown(wrapped);
                
                return JSON.stringify(JSON.parse(stripped)) === jsonStr;
            }
        ), { numRuns: 100 });
    });
});
