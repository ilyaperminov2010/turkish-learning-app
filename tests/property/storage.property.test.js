/**
 * Property-Based Tests для Storage Module
 * Feature: turkish-learning-app
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { save, load, setCache, getCache, clearCache, hasCache, saveSessionState, loadSessionState, saveGameState, loadGameState, clearSessionState, SESSION_KEYS } from '../../js/storage.js';

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

// Mock sessionStorage
const sessionStorageMock = (() => {
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
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock });

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
});

/**
 * Feature: turkish-learning-app, Property 25: JSON Serialization Round-Trip
 * Validates: Requirements 15.5, 15.6
 * 
 * For any application data object, serializing to JSON and deserializing 
 * should produce an equivalent object.
 */
describe('Property 25: JSON Serialization Round-Trip', () => {
    test('primitive values round-trip correctly', () => {
        fc.assert(fc.property(
            fc.oneof(
                fc.string(),
                fc.integer(),
                fc.double({ noNaN: true, noDefaultInfinity: true }),
                fc.boolean(),
                fc.constant(null)
            ),
            (value) => {
                const key = 'test_key';
                save(key, value);
                const loaded = load(key);
                return loaded === value || (value === null && loaded === null);
            }
        ), { numRuns: 100 });
    });


    test('objects round-trip correctly', () => {
        fc.assert(fc.property(
            fc.record({
                id: fc.string(),
                name: fc.string(),
                value: fc.integer(),
                active: fc.boolean()
            }),
            (obj) => {
                const key = 'test_object';
                save(key, obj);
                const loaded = load(key);
                return JSON.stringify(loaded) === JSON.stringify(obj);
            }
        ), { numRuns: 100 });
    });

    test('arrays round-trip correctly', () => {
        fc.assert(fc.property(
            fc.array(fc.oneof(
                fc.string(),
                fc.integer(),
                fc.boolean()
            ), { minLength: 0, maxLength: 20 }),
            (arr) => {
                const key = 'test_array';
                save(key, arr);
                const loaded = load(key);
                return JSON.stringify(loaded) === JSON.stringify(arr);
            }
        ), { numRuns: 100 });
    });

    test('nested structures round-trip correctly', () => {
        // Arbitrary для GeneratedContent структуры
        const chunkArb = fc.record({
            id: fc.string(),
            turkish: fc.string(),
            russian: fc.string(),
            example: fc.string(),
            exampleTranslation: fc.string()
        });

        const contentArb = fc.record({
            topicId: fc.string(),
            generatedAt: fc.integer({ min: 0 }),
            chunks: fc.array(chunkArb, { minLength: 1, maxLength: 10 })
        });

        fc.assert(fc.property(
            contentArb,
            (content) => {
                const key = 'test_content';
                save(key, content);
                const loaded = load(key);
                return JSON.stringify(loaded) === JSON.stringify(content);
            }
        ), { numRuns: 100 });
    });

    test('Settings object round-trip correctly', () => {
        const settingsArb = fc.record({
            theme: fc.constantFrom('light', 'dark'),
            soundEnabled: fc.boolean(),
            apiKey: fc.string(),
            ttsVoice: fc.constantFrom('Kore', 'Orus', 'Puck'),
            ttsEnabled: fc.boolean(),
            speakingRate: fc.double({ min: 0.5, max: 1.5, noNaN: true })
        });

        fc.assert(fc.property(
            settingsArb,
            (settings) => {
                const key = 'test_settings';
                save(key, settings);
                const loaded = load(key);
                return JSON.stringify(loaded) === JSON.stringify(settings);
            }
        ), { numRuns: 100 });
    });

    test('Progress object round-trip correctly', () => {
        const topicProgressArb = fc.record({
            gamesPlayed: fc.array(fc.string(), { maxLength: 10 }),
            lastPlayed: fc.integer({ min: 0 }),
            bestScore: fc.integer({ min: 0, max: 100 })
        });

        const progressArb = fc.record({
            topicsCompleted: fc.dictionary(fc.string().filter(s => s.length > 0), topicProgressArb),
            totalTimeSpent: fc.integer({ min: 0 }),
            chunksLearned: fc.integer({ min: 0 }),
            overallAccuracy: fc.double({ min: 0, max: 100, noNaN: true })
        });

        fc.assert(fc.property(
            progressArb,
            (progress) => {
                const key = 'test_progress';
                save(key, progress);
                const loaded = load(key);
                return JSON.stringify(loaded) === JSON.stringify(progress);
            }
        ), { numRuns: 100 });
    });
});


/**
 * Feature: turkish-learning-app, Property 3: Content Cache Round-Trip
 * Validates: Requirements 2.2
 * 
 * For any generated content, storing it in LocalStorage and then retrieving it 
 * should produce an equivalent object.
 */
describe('Property 3: Content Cache Round-Trip', () => {
    test('cached content can be retrieved unchanged', () => {
        const chunkArb = fc.record({
            id: fc.string(),
            turkish: fc.string(),
            russian: fc.string(),
            example: fc.string(),
            exampleTranslation: fc.string(),
            grammarNote: fc.option(fc.string(), { nil: undefined })
        });

        const contentArb = fc.record({
            topicId: fc.string().filter(s => s.length > 0),
            generatedAt: fc.integer({ min: 0 }),
            chunks: fc.array(chunkArb, { minLength: 1, maxLength: 25 })
        });

        fc.assert(fc.property(
            contentArb,
            (content) => {
                setCache(content.topicId, content);
                const retrieved = getCache(content.topicId);
                return JSON.stringify(retrieved) === JSON.stringify(content);
            }
        ), { numRuns: 100 });
    });

    test('hasCache returns true after setCache', () => {
        fc.assert(fc.property(
            fc.string().filter(s => s.length > 0),
            fc.record({
                topicId: fc.string(),
                generatedAt: fc.integer({ min: 0 }),
                chunks: fc.array(fc.record({
                    id: fc.string(),
                    turkish: fc.string(),
                    russian: fc.string()
                }), { minLength: 1, maxLength: 5 })
            }),
            (topicId, content) => {
                setCache(topicId, content);
                return hasCache(topicId) === true;
            }
        ), { numRuns: 100 });
    });
});

/**
 * Feature: turkish-learning-app, Property 24: Selective Cache Clearing
 * Validates: Requirements 15.3
 * 
 * For any cache clear action on a specific topic, only that topic's cache 
 * should be removed while other topics remain cached.
 */
describe('Property 24: Selective Cache Clearing', () => {
    test('clearing one topic does not affect others', () => {
        const contentArb = fc.record({
            topicId: fc.string(),
            generatedAt: fc.integer({ min: 0 }),
            chunks: fc.array(fc.record({
                id: fc.string(),
                turkish: fc.string(),
                russian: fc.string()
            }), { minLength: 1, maxLength: 5 })
        });

        fc.assert(fc.property(
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes('_')), { minLength: 2, maxLength: 5 })
                .filter(arr => new Set(arr).size === arr.length), // unique topic IDs
            contentArb,
            (topicIds, contentTemplate) => {
                // Cache content for all topics
                topicIds.forEach(id => {
                    setCache(id, { ...contentTemplate, topicId: id });
                });

                // Clear first topic
                const topicToRemove = topicIds[0];
                clearCache(topicToRemove);

                // Check that removed topic is gone
                if (hasCache(topicToRemove)) {
                    return false;
                }

                // Check that other topics still exist
                for (let i = 1; i < topicIds.length; i++) {
                    if (!hasCache(topicIds[i])) {
                        return false;
                    }
                }

                return true;
            }
        ), { numRuns: 100 });
    });

    test('clearing non-existent topic does not throw', () => {
        fc.assert(fc.property(
            fc.string().filter(s => s.length > 0),
            (topicId) => {
                // Should not throw
                clearCache(topicId);
                return hasCache(topicId) === false;
            }
        ), { numRuns: 100 });
    });
});


/**
 * Feature: app-improvements, Property 2: Session State Round-Trip
 * Validates: Requirements 3.1, 3.2, 3.3
 * 
 * For any valid app state, saving to sessionStorage and loading should produce
 * an equivalent state object with the same screen, topic, and content.
 */
describe('Property 2: Session State Round-Trip', () => {
    test('session state round-trips correctly', () => {
        const chunkArb = fc.record({
            id: fc.string(),
            turkish: fc.string(),
            russian: fc.string(),
            example: fc.string(),
            exampleTranslation: fc.string()
        });

        const topicArb = fc.record({
            id: fc.string(),
            name: fc.string(),
            level: fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
            category: fc.string(),
            description: fc.string()
        });

        const contentArb = fc.record({
            topicId: fc.string(),
            generatedAt: fc.integer({ min: 0 }),
            chunks: fc.array(chunkArb, { minLength: 1, maxLength: 10 })
        });

        const stateArb = fc.record({
            currentScreen: fc.constantFrom('home', 'vocabulary', 'games', 'game', 'settings'),
            selectedLevel: fc.option(fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'), { nil: null }),
            selectedTopic: fc.option(topicArb, { nil: null }),
            currentGame: fc.option(fc.constantFrom('flashcards', 'quiz', 'writing', 'matching'), { nil: null }),
            generatedContent: fc.option(contentArb, { nil: null })
        });

        fc.assert(fc.property(
            stateArb,
            (state) => {
                saveSessionState(state);
                const loaded = loadSessionState();
                
                // Проверяем основные поля
                return loaded.currentScreen === state.currentScreen &&
                       loaded.selectedLevel === state.selectedLevel &&
                       JSON.stringify(loaded.selectedTopic) === JSON.stringify(state.selectedTopic) &&
                       loaded.currentGame === state.currentGame &&
                       JSON.stringify(loaded.generatedContent) === JSON.stringify(state.generatedContent) &&
                       typeof loaded.timestamp === 'number';
            }
        ), { numRuns: 100 });
    });

    test('loadSessionState returns null when no state saved', () => {
        const result = loadSessionState();
        expect(result).toBeNull();
    });

    test('clearSessionState removes session state', () => {
        const state = {
            currentScreen: 'vocabulary',
            selectedLevel: 'A1',
            selectedTopic: null,
            currentGame: null,
            generatedContent: null
        };
        
        saveSessionState(state);
        expect(loadSessionState()).not.toBeNull();
        
        clearSessionState();
        expect(loadSessionState()).toBeNull();
    });
});

/**
 * Feature: app-improvements, Property 3: Game State Round-Trip
 * Validates: Requirements 3.4, 3.5
 * 
 * For any valid game state (index, score, answers), saving to sessionStorage
 * and loading should produce an equivalent state object.
 */
describe('Property 3: Game State Round-Trip', () => {
    test('game state round-trips correctly', () => {
        const answerArb = fc.record({
            chunkId: fc.string(),
            correct: fc.boolean(),
            userAnswer: fc.string(),
            timestamp: fc.integer({ min: 0 })
        });

        const gameStateArb = fc.record({
            gameId: fc.constantFrom('flashcards', 'quiz', 'writing', 'matching', 'fill-in'),
            currentIndex: fc.integer({ min: 0, max: 50 }),
            score: fc.integer({ min: 0, max: 100 }),
            answers: fc.array(answerArb, { minLength: 0, maxLength: 20 }),
            startTime: fc.integer({ min: 0 })
        });

        fc.assert(fc.property(
            gameStateArb,
            (gameState) => {
                saveGameState(gameState);
                const loaded = loadGameState();
                
                return loaded.gameId === gameState.gameId &&
                       loaded.currentIndex === gameState.currentIndex &&
                       loaded.score === gameState.score &&
                       JSON.stringify(loaded.answers) === JSON.stringify(gameState.answers) &&
                       loaded.startTime === gameState.startTime &&
                       typeof loaded.timestamp === 'number';
            }
        ), { numRuns: 100 });
    });

    test('loadGameState returns null when no state saved', () => {
        const result = loadGameState();
        expect(result).toBeNull();
    });

    test('clearSessionState removes game state', () => {
        const gameState = {
            gameId: 'quiz',
            currentIndex: 5,
            score: 80,
            answers: [],
            startTime: Date.now()
        };
        
        saveGameState(gameState);
        expect(loadGameState()).not.toBeNull();
        
        clearSessionState();
        expect(loadGameState()).toBeNull();
    });
});
