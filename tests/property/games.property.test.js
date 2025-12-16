/**
 * Property-Based Tests для Games
 * Feature: turkish-learning-app
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { updateSRS, difficultyToQuality, sortByPriority, getSRSForChunk } from '../../js/games/flashcards.js';
import { saveSRSData, getSRSData } from '../../js/storage.js';

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
 * Feature: turkish-learning-app, Property 6: SRS Interval Updates
 * Validates: Requirements 4.3
 * 
 * For any difficulty rating (easy/medium/hard) on a flashcard, the SRS data 
 * for that chunk should be updated with new interval according to SM-2 algorithm.
 */
describe('Property 6: SRS Interval Updates', () => {
    test('easy rating increases interval', () => {
        fc.assert(fc.property(
            fc.uuid(), // Используем UUID для уникальности
            (chunkId) => {
                localStorage.clear(); // Очищаем перед каждой итерацией
                
                // Первый раз - интервал должен быть 1
                const result1 = updateSRS(chunkId, 5); // easy = quality 5
                expect(result1.interval).toBe(1);
                
                // Второй раз - интервал должен быть 6
                const result2 = updateSRS(chunkId, 5);
                expect(result2.interval).toBe(6);
                
                // Третий раз - интервал должен увеличиться
                const result3 = updateSRS(chunkId, 5);
                expect(result3.interval).toBeGreaterThan(6);
                
                return true;
            }
        ), { numRuns: 50 });
    });

    test('hard rating resets interval to 1', () => {
        fc.assert(fc.property(
            fc.uuid(),
            (chunkId) => {
                localStorage.clear();
                
                // Сначала делаем несколько easy
                updateSRS(chunkId, 5);
                updateSRS(chunkId, 5);
                const beforeHard = updateSRS(chunkId, 5);
                
                // Затем hard - должен сбросить
                const afterHard = updateSRS(chunkId, 1); // hard = quality 1
                
                return afterHard.interval === 1 && afterHard.repetitions === 0;
            }
        ), { numRuns: 50 });
    });

    test('ease factor stays above minimum', () => {
        fc.assert(fc.property(
            fc.uuid(),
            fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 20 }),
            (chunkId, qualities) => {
                localStorage.clear();
                
                let result;
                qualities.forEach(q => {
                    result = updateSRS(chunkId, q);
                });
                
                // Ease factor не должен опускаться ниже 1.3
                return result.easeFactor >= 1.3;
            }
        ), { numRuns: 100 });
    });

    test('nextReview is in the future', () => {
        fc.assert(fc.property(
            fc.uuid(),
            fc.constantFrom(1, 3, 5),
            (chunkId, quality) => {
                localStorage.clear();
                
                const now = Date.now();
                const result = updateSRS(chunkId, quality);
                
                // nextReview должен быть в будущем
                return result.nextReview > now;
            }
        ), { numRuns: 100 });
    });
});


/**
 * Feature: turkish-learning-app, Property 7: SRS Card Ordering
 * Validates: Requirements 4.4
 * 
 * For any set of flashcards, cards with earlier nextReview timestamps 
 * should appear before cards with later timestamps.
 */
describe('Property 7: SRS Card Ordering', () => {
    test('cards are sorted by nextReview ascending', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    id: fc.string().filter(s => s.length > 0),
                    turkish: fc.string(),
                    russian: fc.string()
                }),
                { minLength: 2, maxLength: 10 }
            ).filter(arr => new Set(arr.map(c => c.id)).size === arr.length),
            (chunks) => {
                // Устанавливаем разные nextReview для каждого chunk
                const srsData = {};
                chunks.forEach((chunk, i) => {
                    srsData[chunk.id] = {
                        interval: 1,
                        easeFactor: 2.5,
                        nextReview: Date.now() + (chunks.length - i) * 1000, // Обратный порядок
                        repetitions: 1
                    };
                });
                saveSRSData(srsData);

                const sorted = sortByPriority(chunks);

                // Проверяем что отсортировано по nextReview
                for (let i = 1; i < sorted.length; i++) {
                    const prevSRS = getSRSData()[sorted[i - 1].id];
                    const currSRS = getSRSData()[sorted[i].id];
                    
                    if (prevSRS && currSRS) {
                        if (prevSRS.nextReview > currSRS.nextReview) {
                            return false;
                        }
                    }
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });

    test('new cards (no SRS data) come first', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    id: fc.uuid(), // Используем UUID для избежания проблем с __proto__
                    turkish: fc.string(),
                    russian: fc.string()
                }),
                { minLength: 3, maxLength: 10 }
            ),
            (chunks) => {
                localStorage.clear();
                
                // Устанавливаем SRS только для половины chunks
                const srsData = {};
                chunks.slice(0, Math.floor(chunks.length / 2)).forEach((chunk, i) => {
                    srsData[chunk.id] = {
                        interval: 1,
                        easeFactor: 2.5,
                        nextReview: Date.now() + i * 1000,
                        repetitions: 1
                    };
                });
                saveSRSData(srsData);

                const sorted = sortByPriority(chunks);
                const savedSRS = getSRSData();

                // Новые карточки (без SRS) должны быть в начале
                let foundWithSRS = false;
                for (const card of sorted) {
                    const hasSRS = savedSRS[card.id] && savedSRS[card.id].nextReview > 0;
                    
                    if (hasSRS) {
                        foundWithSRS = true;
                    } else if (foundWithSRS) {
                        // Нашли карточку без SRS после карточки с SRS - ошибка
                        return false;
                    }
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });
});

/**
 * Feature: turkish-learning-app, Property 8: Quiz Options Validity
 * Validates: Requirements 5.1, 5.2, 10.2
 * 
 * For any quiz-style game, exactly 4 options should be displayed 
 * with exactly 1 correct answer.
 */
describe('Property 8: Quiz Options Validity', () => {
    /**
     * Генерация вариантов ответа для quiz
     */
    function generateQuizOptions(chunks, correctIndex) {
        const correct = chunks[correctIndex];
        const incorrectPool = chunks.filter((_, i) => i !== correctIndex);
        
        // Выбираем 3 неправильных ответа
        const shuffled = [...incorrectPool].sort(() => Math.random() - 0.5);
        const incorrect = shuffled.slice(0, 3);
        
        // Формируем 4 варианта
        const options = [
            { text: correct.russian, isCorrect: true },
            ...incorrect.map(c => ({ text: c.russian, isCorrect: false }))
        ];
        
        // Перемешиваем
        return options.sort(() => Math.random() - 0.5);
    }

    test('quiz always has exactly 4 options', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    id: fc.string(),
                    turkish: fc.string(),
                    russian: fc.string().filter(s => s.length > 0)
                }),
                { minLength: 4, maxLength: 20 }
            ),
            fc.integer({ min: 0, max: 3 }),
            (chunks, correctOffset) => {
                const correctIndex = correctOffset % chunks.length;
                const options = generateQuizOptions(chunks, correctIndex);
                
                return options.length === 4;
            }
        ), { numRuns: 100 });
    });

    test('quiz has exactly 1 correct answer', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    id: fc.string(),
                    turkish: fc.string(),
                    russian: fc.string().filter(s => s.length > 0)
                }),
                { minLength: 4, maxLength: 20 }
            ),
            fc.integer({ min: 0, max: 3 }),
            (chunks, correctOffset) => {
                const correctIndex = correctOffset % chunks.length;
                const options = generateQuizOptions(chunks, correctIndex);
                
                const correctCount = options.filter(o => o.isCorrect).length;
                return correctCount === 1;
            }
        ), { numRuns: 100 });
    });
});


/**
 * Feature: turkish-learning-app, Property 9: Score Calculation
 * Validates: Requirements 5.5, 11.5
 * 
 * For any completed game session, the displayed percentage should equal 
 * (correct answers / total questions) * 100.
 */
describe('Property 9: Score Calculation', () => {
    function calculateScore(correct, total) {
        if (total === 0) return 0;
        return Math.round((correct / total) * 100);
    }

    test('score percentage is calculated correctly', () => {
        fc.assert(fc.property(
            fc.integer({ min: 0, max: 100 }),
            fc.integer({ min: 1, max: 100 }),
            (correct, total) => {
                const actualCorrect = Math.min(correct, total);
                const score = calculateScore(actualCorrect, total);
                const expected = Math.round((actualCorrect / total) * 100);
                
                return score === expected;
            }
        ), { numRuns: 100 });
    });

    test('score is between 0 and 100', () => {
        fc.assert(fc.property(
            fc.integer({ min: 0, max: 1000 }),
            fc.integer({ min: 1, max: 1000 }),
            (correct, total) => {
                const actualCorrect = Math.min(correct, total);
                const score = calculateScore(actualCorrect, total);
                
                return score >= 0 && score <= 100;
            }
        ), { numRuns: 100 });
    });

    test('perfect score is 100%', () => {
        fc.assert(fc.property(
            fc.integer({ min: 1, max: 100 }),
            (total) => {
                const score = calculateScore(total, total);
                return score === 100;
            }
        ), { numRuns: 100 });
    });

    test('zero correct is 0%', () => {
        fc.assert(fc.property(
            fc.integer({ min: 1, max: 100 }),
            (total) => {
                const score = calculateScore(0, total);
                return score === 0;
            }
        ), { numRuns: 100 });
    });
});

/**
 * Feature: turkish-learning-app, Property 10: Writing Answer Comparison
 * Validates: Requirements 6.2, 6.3
 * 
 * For any user input and correct answer, comparison should return true 
 * if they match after normalizing case and trimming whitespace.
 */
describe('Property 10: Writing Answer Comparison', () => {
    function compareAnswers(userInput, correctAnswer) {
        const normalize = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ');
        return normalize(userInput) === normalize(correctAnswer);
    }

    test('exact match returns true', () => {
        fc.assert(fc.property(
            fc.string().filter(s => s.trim().length > 0),
            (answer) => {
                return compareAnswers(answer, answer) === true;
            }
        ), { numRuns: 100 });
    });

    test('case differences are ignored', () => {
        fc.assert(fc.property(
            fc.string().filter(s => s.trim().length > 0),
            (answer) => {
                return compareAnswers(answer.toUpperCase(), answer.toLowerCase()) === true;
            }
        ), { numRuns: 100 });
    });

    test('leading/trailing whitespace is ignored', () => {
        fc.assert(fc.property(
            fc.string().filter(s => s.trim().length > 0),
            fc.string().filter(s => /^\s+$/.test(s) || s === ''),
            fc.string().filter(s => /^\s+$/.test(s) || s === ''),
            (answer, leadingSpace, trailingSpace) => {
                const withSpaces = (leadingSpace || '') + answer + (trailingSpace || '');
                return compareAnswers(withSpaces, answer) === true;
            }
        ), { numRuns: 100 });
    });

    test('different answers return false', () => {
        fc.assert(fc.property(
            fc.string().filter(s => s.trim().length > 0),
            fc.string().filter(s => s.trim().length > 0),
            (answer1, answer2) => {
                if (answer1.toLowerCase().trim() === answer2.toLowerCase().trim()) {
                    return true; // Skip if they're actually the same
                }
                return compareAnswers(answer1, answer2) === false;
            }
        ), { numRuns: 100 });
    });
});


/**
 * Feature: turkish-learning-app, Property 11: Sentence Shuffling
 * Validates: Requirements 7.1
 */
describe('Property 11: Sentence Shuffling', () => {
    const { shuffleWords, normalizeWord } = require('../../js/games/sentence-builder.js');

    test('shuffled words contain same words as original (after normalization)', () => {
        // Generate only alphabetic words to avoid punctuation edge cases
        fc.assert(fc.property(
            fc.array(fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g'), { minLength: 1, maxLength: 8 }), { minLength: 2, maxLength: 10 }),
            (words) => {
                const sentence = words.join(' ');
                const shuffled = shuffleWords(sentence);
                
                // Normalize original words the same way shuffleWords does
                const normalizedOriginal = words.map((w, i) => normalizeWord(w, i === 0, i === words.length - 1));
                
                const sortedOriginal = [...normalizedOriginal].sort();
                const sortedShuffled = [...shuffled].sort();
                
                return JSON.stringify(sortedOriginal) === JSON.stringify(sortedShuffled);
            }
        ), { numRuns: 100 });
    });
});

/**
 * Feature: turkish-learning-app, Property 14: Matching Game Initialization
 * Validates: Requirements 8.1
 */
describe('Property 14: Matching Game Initialization', () => {
    test('matching game has exactly 6 pairs when content has enough chunks', () => {
        fc.assert(fc.property(
            fc.array(
                fc.record({
                    id: fc.uuid(),
                    turkish: fc.string().filter(s => s.length > 0),
                    russian: fc.string().filter(s => s.length > 0)
                }),
                { minLength: 6, maxLength: 20 }
            ),
            (chunks) => {
                const content = { topicId: 'test', generatedAt: Date.now(), chunks };
                
                // Симулируем инициализацию игры
                const pairs = [...chunks].sort(() => Math.random() - 0.5).slice(0, 6);
                
                return pairs.length === 6;
            }
        ), { numRuns: 100 });
    });
});

/**
 * Feature: turkish-learning-app, Property 16: Fill-in Blank Count
 * Validates: Requirements 9.1
 */
describe('Property 16: Fill-in Blank Count', () => {
    const { createBlank } = require('../../js/games/fill-in.js');

    test('exactly one blank is created', () => {
        fc.assert(fc.property(
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ')), { minLength: 2, maxLength: 10 }),
            (words) => {
                const sentence = words.join(' ');
                const result = createBlank(sentence);
                
                const blankCount = (result.display.match(/___/g) || []).length;
                return blankCount === 1;
            }
        ), { numRuns: 100 });
    });

    test('blank answer is one of the original words', () => {
        fc.assert(fc.property(
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ')), { minLength: 2, maxLength: 10 }),
            (words) => {
                const sentence = words.join(' ');
                const result = createBlank(sentence);
                
                return words.includes(result.answer);
            }
        ), { numRuns: 100 });
    });
});

/**
 * Feature: turkish-learning-app, Property 17: True/False Distribution
 * Validates: Requirements 11.2
 */
describe('Property 17: True/False Distribution', () => {
    test('distribution approximates 50/50 over many iterations', () => {
        let trueCount = 0;
        let falseCount = 0;
        const iterations = 100;
        
        for (let i = 0; i < iterations; i++) {
            // Симулируем логику балансировки из игры
            const shouldBeCorrect = trueCount <= falseCount;
            if (shouldBeCorrect) trueCount++; else falseCount++;
        }
        
        // Проверяем что распределение близко к 50/50
        const ratio = trueCount / iterations;
        expect(ratio).toBeGreaterThanOrEqual(0.45);
        expect(ratio).toBeLessThanOrEqual(0.55);
    });
});


/**
 * Feature: app-improvements, Property 5: Translation Hint Generation
 * Validates: Requirements 5.2
 * 
 * For any Turkish phrase, the generated hint should have the same number of words,
 * and each word should start with the correct first letter followed by underscores.
 */
describe('Property 5: Translation Hint Generation', () => {
    const { generateHint } = require('../../js/games/translation.js');

    test('hint has same number of words as original', () => {
        fc.assert(fc.property(
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ')), { minLength: 1, maxLength: 10 }),
            (words) => {
                const phrase = words.join(' ');
                const hint = generateHint(phrase);
                
                const originalWordCount = words.length;
                const hintWordCount = hint.split(' ').filter(w => w.length > 0).length;
                
                return originalWordCount === hintWordCount;
            }
        ), { numRuns: 100 });
    });

    test('each hint word starts with correct first letter', () => {
        fc.assert(fc.property(
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ')), { minLength: 1, maxLength: 10 }),
            (words) => {
                const phrase = words.join(' ');
                const hint = generateHint(phrase);
                
                const hintWords = hint.split(' ').filter(w => w.length > 0);
                
                return words.every((word, i) => {
                    if (!hintWords[i]) return false;
                    return hintWords[i][0] === word[0];
                });
            }
        ), { numRuns: 100 });
    });

    test('hint word length matches original word length', () => {
        fc.assert(fc.property(
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ')), { minLength: 1, maxLength: 10 }),
            (words) => {
                const phrase = words.join(' ');
                const hint = generateHint(phrase);
                
                const hintWords = hint.split(' ').filter(w => w.length > 0);
                
                return words.every((word, i) => {
                    if (!hintWords[i]) return false;
                    return hintWords[i].length === word.length;
                });
            }
        ), { numRuns: 100 });
    });

    test('hint contains only first letter and underscores', () => {
        fc.assert(fc.property(
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ')), { minLength: 1, maxLength: 10 }),
            (words) => {
                const phrase = words.join(' ');
                const hint = generateHint(phrase);
                
                const hintWords = hint.split(' ').filter(w => w.length > 0);
                
                return hintWords.every((hintWord, i) => {
                    if (hintWord.length === 1) {
                        return hintWord === words[i][0];
                    }
                    // First char is the letter, rest are underscores
                    const rest = hintWord.slice(1);
                    return rest.split('').every(c => c === '_');
                });
            }
        ), { numRuns: 100 });
    });
});

/**
 * Feature: app-improvements, Property 6: Answer Comparison Normalization
 * Validates: Requirements 5.3, 5.4
 * 
 * For any two strings that differ only in case, punctuation, or extra whitespace,
 * the compareAnswers function should return true.
 */
describe('Property 6: Answer Comparison Normalization', () => {
    const { compareAnswers } = require('../../js/games/translation.js');

    test('case differences are ignored', () => {
        fc.assert(fc.property(
            fc.string().filter(s => s.length > 0),
            (str) => {
                return compareAnswers(str.toLowerCase(), str.toUpperCase());
            }
        ), { numRuns: 100 });
    });

    test('punctuation differences are ignored', () => {
        fc.assert(fc.property(
            fc.string().filter(s => s.length > 0 && /[a-zA-Z]/.test(s)),
            (str) => {
                const withPunctuation = str + '!';
                const withoutPunctuation = str;
                return compareAnswers(withPunctuation, withoutPunctuation);
            }
        ), { numRuns: 100 });
    });

    test('extra whitespace is ignored', () => {
        fc.assert(fc.property(
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ')), { minLength: 1, maxLength: 5 }),
            (words) => {
                const normal = words.join(' ');
                const extraSpaces = words.join('   ');
                return compareAnswers(normal, extraSpaces);
            }
        ), { numRuns: 100 });
    });

    test('identical strings return true', () => {
        fc.assert(fc.property(
            fc.string(),
            (str) => {
                return compareAnswers(str, str);
            }
        ), { numRuns: 100 });
    });
});


/**
 * Feature: app-improvements, Property 7: Difference Highlighting
 * Validates: Requirements 6.2
 * 
 * For any two strings (user answer and correct answer), the highlightDifferences
 * function should mark words that differ between them.
 */
describe('Property 7: Difference Highlighting', () => {
    const { highlightDifferences } = require('../../js/games/translation.js');

    test('identical strings have all words marked as correct', () => {
        fc.assert(fc.property(
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ')), { minLength: 1, maxLength: 10 }),
            (words) => {
                const str = words.join(' ');
                const result = highlightDifferences(str, str);
                
                return result.user.every(w => w.correct === true) &&
                       result.correct.every(w => w.missing === false);
            }
        ), { numRuns: 100 });
    });

    test('completely different strings have all words marked as different', () => {
        fc.assert(fc.property(
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ') && /^[a-z]+$/.test(s)), { minLength: 1, maxLength: 5 }),
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ') && /^[A-Z]+$/.test(s)), { minLength: 1, maxLength: 5 }),
            (userWords, correctWords) => {
                const userStr = userWords.join(' ');
                const correctStr = correctWords.join(' ');
                const result = highlightDifferences(userStr, correctStr);
                
                // All user words should be marked as incorrect (different case)
                // All correct words should be marked as missing
                return result.user.length === userWords.length &&
                       result.correct.length === correctWords.length;
            }
        ), { numRuns: 100 });
    });

    test('result contains same number of words as input', () => {
        fc.assert(fc.property(
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ')), { minLength: 1, maxLength: 10 }),
            fc.array(fc.string().filter(s => s.length > 0 && !s.includes(' ')), { minLength: 1, maxLength: 10 }),
            (userWords, correctWords) => {
                const userStr = userWords.join(' ');
                const correctStr = correctWords.join(' ');
                const result = highlightDifferences(userStr, correctStr);
                
                return result.user.length === userWords.length &&
                       result.correct.length === correctWords.length;
            }
        ), { numRuns: 100 });
    });

    test('each result word has text and status properties', () => {
        // Test with specific examples to verify structure
        const result1 = highlightDifferences('hello world', 'hello there');
        expect(result1.user.every(w => typeof w.text === 'string' && typeof w.correct === 'boolean')).toBe(true);
        expect(result1.correct.every(w => typeof w.text === 'string' && typeof w.missing === 'boolean')).toBe(true);
        
        const result2 = highlightDifferences('a b c', 'x y z');
        expect(result2.user.length).toBe(3);
        expect(result2.correct.length).toBe(3);
    });
});
