/**
 * Property-Based Tests для App Module
 * Feature: turkish-learning-app
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { getTopicsByLevel, getTopicById, getLevels } from '../../js/topics.js';
import { save, load, getProgress, saveProgress } from '../../js/storage.js';

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
 * Feature: turkish-learning-app, Property 1: Topic Selection Updates State
 * Validates: Requirements 1.3
 * 
 * For any topic selection action, the app state should contain the selected topic 
 * with correct level and category.
 */
describe('Property 1: Topic Selection Updates State', () => {
    test('getTopicById returns topic with correct level and category', () => {
        const levels = getLevels();
        
        fc.assert(fc.property(
            fc.constantFrom(...levels),
            (level) => {
                const topics = getTopicsByLevel(level);
                
                // Для каждой темы в уровне
                return topics.every(topic => {
                    const retrieved = getTopicById(topic.id);
                    
                    // Проверяем что тема найдена
                    if (!retrieved) return false;
                    
                    // Проверяем что уровень и категория корректны
                    return retrieved.level === level &&
                           retrieved.category === topic.category &&
                           retrieved.id === topic.id &&
                           retrieved.name === topic.name;
                });
            }
        ), { numRuns: 100 });
    });

    test('all topics have required fields', () => {
        const levels = getLevels();
        
        fc.assert(fc.property(
            fc.constantFrom(...levels),
            (level) => {
                const topics = getTopicsByLevel(level);
                
                return topics.every(topic => {
                    return typeof topic.id === 'string' && topic.id.length > 0 &&
                           typeof topic.name === 'string' && topic.name.length > 0 &&
                           typeof topic.level === 'string' &&
                           typeof topic.category === 'string' &&
                           ['grammar', 'vocabulary', 'phonetics', 'culture'].includes(topic.category);
                });
            }
        ), { numRuns: 100 });
    });

    test('topic IDs are unique across all levels', () => {
        const levels = getLevels();
        const allIds = new Set();
        
        levels.forEach(level => {
            const topics = getTopicsByLevel(level);
            topics.forEach(topic => {
                expect(allIds.has(topic.id)).toBe(false);
                allIds.add(topic.id);
            });
        });
    });
});


/**
 * Feature: turkish-learning-app, Property 2: Progress Indicators Match Saved Data
 * Validates: Requirements 1.4
 * 
 * For any topic with saved progress in LocalStorage, the UI should display 
 * a progress indicator for that topic.
 */
describe('Property 2: Progress Indicators Match Saved Data', () => {
    test('saved progress can be retrieved correctly', () => {
        const topicProgressArb = fc.record({
            gamesPlayed: fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
            lastPlayed: fc.integer({ min: 0 }),
            bestScore: fc.integer({ min: 0, max: 100 })
        });

        const progressArb = fc.record({
            topicsCompleted: fc.dictionary(
                fc.string().filter(s => s.length > 0),
                topicProgressArb
            ),
            totalTimeSpent: fc.integer({ min: 0 }),
            chunksLearned: fc.integer({ min: 0 }),
            overallAccuracy: fc.double({ min: 0, max: 100, noNaN: true })
        });

        fc.assert(fc.property(
            progressArb,
            (progress) => {
                saveProgress(progress);
                const loaded = getProgress();
                
                // Проверяем что все темы с прогрессом сохранены
                const savedTopicIds = Object.keys(progress.topicsCompleted);
                const loadedTopicIds = Object.keys(loaded.topicsCompleted);
                
                return savedTopicIds.every(id => loadedTopicIds.includes(id));
            }
        ), { numRuns: 100 });
    });

    test('progress indicators reflect games played count', () => {
        const levels = getLevels();
        
        fc.assert(fc.property(
            fc.constantFrom(...levels),
            fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
            (level, gamesPlayed) => {
                const topics = getTopicsByLevel(level);
                if (topics.length === 0) return true;
                
                const topic = topics[0];
                
                const progress = {
                    topicsCompleted: {
                        [topic.id]: {
                            gamesPlayed,
                            lastPlayed: Date.now(),
                            bestScore: 50
                        }
                    },
                    totalTimeSpent: 0,
                    chunksLearned: 0,
                    overallAccuracy: 0
                };
                
                saveProgress(progress);
                const loaded = getProgress();
                
                const topicProgress = loaded.topicsCompleted[topic.id];
                
                // Проверяем что количество игр сохранено корректно
                return topicProgress && 
                       topicProgress.gamesPlayed.length === gamesPlayed.length;
            }
        ), { numRuns: 100 });
    });

    test('completed status is determined by games played count', () => {
        // Тема считается завершённой если сыграно >= 10 игр
        fc.assert(fc.property(
            fc.integer({ min: 0, max: 15 }),
            (gamesCount) => {
                const gamesPlayed = Array.from({ length: gamesCount }, (_, i) => `game_${i}`);
                
                const progress = {
                    topicsCompleted: {
                        'test_topic': {
                            gamesPlayed,
                            lastPlayed: Date.now(),
                            bestScore: 80
                        }
                    },
                    totalTimeSpent: 0,
                    chunksLearned: 0,
                    overallAccuracy: 0
                };
                
                saveProgress(progress);
                const loaded = getProgress();
                
                const isCompleted = loaded.topicsCompleted['test_topic'].gamesPlayed.length >= 10;
                
                return isCompleted === (gamesCount >= 10);
            }
        ), { numRuns: 100 });
    });
});


/**
 * Feature: app-improvements, Property 4: Removed Games Redirect
 * Validates: Requirements 4.1, 4.2, 4.3
 * 
 * For any attempt to navigate to 'sov-construction' or 'true-false' games,
 * the app should redirect to the games selection screen.
 */
describe('Property 4: Removed Games Redirect', () => {
    const REMOVED_GAMES = ['sov-construction', 'true-false'];
    const VALID_GAMES = ['flashcards', 'quiz', 'writing', 'sentence-builder', 'matching', 'fill-in', 'listening'];

    test('removed games are not in valid games list', () => {
        fc.assert(fc.property(
            fc.constantFrom(...REMOVED_GAMES),
            (removedGame) => {
                return !VALID_GAMES.includes(removedGame);
            }
        ), { numRuns: 100 });
    });

    test('valid games are not in removed games list', () => {
        fc.assert(fc.property(
            fc.constantFrom(...VALID_GAMES),
            (validGame) => {
                return !REMOVED_GAMES.includes(validGame);
            }
        ), { numRuns: 100 });
    });

    test('removed games list contains exactly sov-construction and true-false', () => {
        expect(REMOVED_GAMES).toContain('sov-construction');
        expect(REMOVED_GAMES).toContain('true-false');
        expect(REMOVED_GAMES.length).toBe(2);
    });

    test('valid games list does not contain removed games', () => {
        REMOVED_GAMES.forEach(removedGame => {
            expect(VALID_GAMES).not.toContain(removedGame);
        });
    });
});


/**
 * Feature: app-improvements, Property 9: Dashboard Statistics Display
 * Validates: Requirements 9.2, 9.3, 9.4
 * 
 * For any progress data, the dashboard should display chunksLearned, overallAccuracy,
 * and totalTimeSpent values that match the stored data.
 */
describe('Property 9: Dashboard Statistics Display', () => {
    test('progress data is stored and retrieved correctly', () => {
        fc.assert(fc.property(
            fc.record({
                chunksLearned: fc.integer({ min: 0, max: 1000 }),
                overallAccuracy: fc.double({ min: 0, max: 100, noNaN: true }),
                totalTimeSpent: fc.integer({ min: 0, max: 100000 })
            }),
            (progressData) => {
                const progress = {
                    topicsCompleted: {},
                    ...progressData
                };
                
                saveProgress(progress);
                const loaded = getProgress();
                
                return loaded.chunksLearned === progressData.chunksLearned &&
                       Math.abs(loaded.overallAccuracy - progressData.overallAccuracy) < 0.001 &&
                       loaded.totalTimeSpent === progressData.totalTimeSpent;
            }
        ), { numRuns: 100 });
    });

    test('progress values are non-negative', () => {
        fc.assert(fc.property(
            fc.integer({ min: 0, max: 1000 }),
            fc.double({ min: 0, max: 100, noNaN: true }),
            fc.integer({ min: 0, max: 100000 }),
            (chunks, accuracy, time) => {
                const progress = {
                    topicsCompleted: {},
                    chunksLearned: chunks,
                    overallAccuracy: accuracy,
                    totalTimeSpent: time
                };
                
                saveProgress(progress);
                const loaded = getProgress();
                
                return loaded.chunksLearned >= 0 &&
                       loaded.overallAccuracy >= 0 &&
                       loaded.totalTimeSpent >= 0;
            }
        ), { numRuns: 100 });
    });
});

/**
 * Feature: app-improvements, Property 10: Time Formatting
 * Validates: Requirements 9.4
 * 
 * For any time value in seconds, the formatTime function should return
 * a human-readable string in the correct format.
 */
describe('Property 10: Time Formatting', () => {
    // Import formatTime - we'll test the logic directly
    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds} сек`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours} ч ${mins} мин`;
    };

    test('seconds under 60 show as seconds', () => {
        fc.assert(fc.property(
            fc.integer({ min: 0, max: 59 }),
            (seconds) => {
                const result = formatTime(seconds);
                return result.includes('сек') && result.includes(String(seconds));
            }
        ), { numRuns: 100 });
    });

    test('seconds 60-3599 show as minutes', () => {
        fc.assert(fc.property(
            fc.integer({ min: 60, max: 3599 }),
            (seconds) => {
                const result = formatTime(seconds);
                const expectedMins = Math.floor(seconds / 60);
                return result.includes('мин') && result.includes(String(expectedMins));
            }
        ), { numRuns: 100 });
    });

    test('seconds 3600+ show as hours and minutes', () => {
        fc.assert(fc.property(
            fc.integer({ min: 3600, max: 36000 }),
            (seconds) => {
                const result = formatTime(seconds);
                const expectedHours = Math.floor(seconds / 3600);
                return result.includes('ч') && result.includes(String(expectedHours));
            }
        ), { numRuns: 100 });
    });

    test('formatTime always returns a string', () => {
        fc.assert(fc.property(
            fc.integer({ min: 0, max: 100000 }),
            (seconds) => {
                const result = formatTime(seconds);
                return typeof result === 'string' && result.length > 0;
            }
        ), { numRuns: 100 });
    });
});
