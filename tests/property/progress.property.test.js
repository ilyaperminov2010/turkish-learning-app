/**
 * Property-Based Tests для Progress и Statistics
 * Feature: turkish-learning-app
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { saveProgress, getProgress, saveSettings, getSettings } from '../../js/storage.js';
import { getTopicsByLevel, getLevels } from '../../js/topics.js';

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
 * Feature: turkish-learning-app, Property 19: Game Results Persistence
 * Validates: Requirements 13.1
 */
describe('Property 19: Game Results Persistence', () => {
    test('saved game results persist in progress', () => {
        fc.assert(fc.property(
            fc.uuid(),
            fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
            fc.integer({ min: 0, max: 100 }),
            (topicId, gamesPlayed, bestScore) => {
                const progress = {
                    topicsCompleted: {
                        [topicId]: {
                            gamesPlayed,
                            lastPlayed: Date.now(),
                            bestScore
                        }
                    },
                    totalTimeSpent: 100,
                    chunksLearned: 10,
                    overallAccuracy: 75
                };
                
                saveProgress(progress);
                const loaded = getProgress();
                
                return loaded.topicsCompleted[topicId] !== undefined &&
                       loaded.topicsCompleted[topicId].gamesPlayed.length === gamesPlayed.length &&
                       loaded.topicsCompleted[topicId].bestScore === bestScore;
            }
        ), { numRuns: 100 });
    });
});

/**
 * Feature: turkish-learning-app, Property 20: Level Progress Calculation
 * Validates: Requirements 13.2
 */
describe('Property 20: Level Progress Calculation', () => {
    function calculateLevelProgress(level, progress) {
        const topics = getTopicsByLevel(level);
        if (topics.length === 0) return 0;
        
        const completed = topics.filter(t => {
            const tp = progress.topicsCompleted[t.id];
            return tp && tp.gamesPlayed?.length >= 10;
        }).length;
        
        return Math.round((completed / topics.length) * 100);
    }

    test('level progress is between 0 and 100', () => {
        const levels = getLevels();
        
        fc.assert(fc.property(
            fc.constantFrom(...levels),
            fc.dictionary(fc.uuid(), fc.record({
                gamesPlayed: fc.array(fc.string(), { minLength: 0, maxLength: 15 }),
                lastPlayed: fc.integer({ min: 0 }),
                bestScore: fc.integer({ min: 0, max: 100 })
            })),
            (level, topicsCompleted) => {
                const progress = {
                    topicsCompleted,
                    totalTimeSpent: 0,
                    chunksLearned: 0,
                    overallAccuracy: 0
                };
                
                const percentage = calculateLevelProgress(level, progress);
                return percentage >= 0 && percentage <= 100;
            }
        ), { numRuns: 100 });
    });

    test('empty progress gives 0%', () => {
        const levels = getLevels();
        
        levels.forEach(level => {
            const progress = {
                topicsCompleted: {},
                totalTimeSpent: 0,
                chunksLearned: 0,
                overallAccuracy: 0
            };
            
            const percentage = calculateLevelProgress(level, progress);
            expect(percentage).toBe(0);
        });
    });
});

/**
 * Feature: turkish-learning-app, Property 21: Statistics Completeness
 * Validates: Requirements 13.3
 */
describe('Property 21: Statistics Completeness', () => {
    test('progress always has required fields', () => {
        fc.assert(fc.property(
            fc.integer({ min: 0, max: 10000 }),
            fc.integer({ min: 0, max: 1000 }),
            fc.double({ min: 0, max: 100, noNaN: true }),
            (totalTimeSpent, chunksLearned, overallAccuracy) => {
                const progress = {
                    topicsCompleted: {},
                    totalTimeSpent,
                    chunksLearned,
                    overallAccuracy
                };
                
                saveProgress(progress);
                const loaded = getProgress();
                
                return typeof loaded.totalTimeSpent === 'number' &&
                       typeof loaded.chunksLearned === 'number' &&
                       typeof loaded.overallAccuracy === 'number' &&
                       loaded.totalTimeSpent >= 0 &&
                       loaded.chunksLearned >= 0 &&
                       loaded.overallAccuracy >= 0;
            }
        ), { numRuns: 100 });
    });
});

/**
 * Feature: turkish-learning-app, Property 22: Theme Persistence
 * Validates: Requirements 14.2
 */
describe('Property 22: Theme Persistence', () => {
    test('theme setting persists', () => {
        fc.assert(fc.property(
            fc.constantFrom('light', 'dark'),
            (theme) => {
                const settings = getSettings();
                settings.theme = theme;
                saveSettings(settings);
                
                const loaded = getSettings();
                return loaded.theme === theme;
            }
        ), { numRuns: 100 });
    });
});

/**
 * Feature: turkish-learning-app, Property 23: App State Restoration
 * Validates: Requirements 15.1
 */
describe('Property 23: App State Restoration', () => {
    test('settings restore correctly after save', () => {
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
                saveSettings(settings);
                const loaded = getSettings();
                
                return loaded.theme === settings.theme &&
                       loaded.soundEnabled === settings.soundEnabled &&
                       loaded.ttsVoice === settings.ttsVoice &&
                       loaded.ttsEnabled === settings.ttsEnabled;
            }
        ), { numRuns: 100 });
    });
});
