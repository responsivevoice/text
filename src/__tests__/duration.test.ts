/**
 * Tests for Duration Estimation Utilities
 */

import { describe, expect, it } from 'vitest';

import { BASE_TIMEOUT_FALLBACK, BASE_TIMEOUT_NATIVE, WORDS_PER_MINUTE } from '../config';
import { getEstimatedTimeLength, getEstimatedTimeLengthWithRate } from '../duration';

describe('Duration Estimation', () => {
  describe('getEstimatedTimeLength', () => {
    it('should return 0 for empty string', () => {
      expect(getEstimatedTimeLength('')).toBe(0);
    });

    it('should return 0 for whitespace-only string', () => {
      expect(getEstimatedTimeLength('   ')).toBe(0);
      expect(getEstimatedTimeLength('\t\n')).toBe(0);
    });

    it('should return 0 for null/undefined input', () => {
      expect(getEstimatedTimeLength(null as unknown as string)).toBe(0);
      expect(getEstimatedTimeLength(undefined as unknown as string)).toBe(0);
    });

    it('should return 0 for non-string input', () => {
      expect(getEstimatedTimeLength(123 as unknown as string)).toBe(0);
      expect(getEstimatedTimeLength({} as unknown as string)).toBe(0);
    });

    it('should calculate duration for single word using character-based formula', () => {
      // Short text (<5 words) uses character-based formula: base + charsCount * 50
      // Native base = 700ms, "Hello" has 5 chars
      // Expected: 700 + 5 * 50 = 950ms
      const duration = getEstimatedTimeLength('Hello');
      const charsCount = 5;
      const expected = BASE_TIMEOUT_NATIVE + charsCount * 50;
      expect(duration).toBe(expected);
    });

    it('should calculate duration for multiple words (5+ words) using word-based formula', () => {
      // 5 words at 130 WPM = (5/130) * 60 * 1000 = ~2308ms
      const duration = getEstimatedTimeLength('Hello how are you today');
      const expected = Math.round((5 / WORDS_PER_MINUTE) * 60 * 1000);
      expect(duration).toBe(expected);
    });

    it('should handle text with multiple spaces (short text)', () => {
      // "Hello    world" = 2 words (short text), uses character-based formula
      // After preprocessing, still 2 words. charsCount from preprocessed text.
      const duration = getEstimatedTimeLength('Hello    world');
      const preprocessedChars = 'Hello world'.replace(/\s/g, '').length; // 10
      const expected = BASE_TIMEOUT_NATIVE + preprocessedChars * 50;
      expect(duration).toBe(expected);
    });

    it('should handle text with tabs and newlines (short text)', () => {
      // "Hello\tworld\ntest" = 3 words (short text), uses character-based formula
      const duration = getEstimatedTimeLength('Hello\tworld\ntest');
      const preprocessedChars = 'Hello world test'.replace(/\s/g, '').length; // 14
      const expected = BASE_TIMEOUT_NATIVE + preprocessedChars * 50;
      expect(duration).toBe(expected);
    });

    it('should apply multiplier correctly', () => {
      const baseText = 'Hello world';
      const baseDuration = getEstimatedTimeLength(baseText);

      // 1.5x multiplier should increase duration by 50%
      const multipliedDuration = getEstimatedTimeLength(baseText, 1.5);
      expect(multipliedDuration).toBe(Math.round(baseDuration * 1.5));
    });

    it('should handle multiplier less than 1', () => {
      const baseText = 'Hello world';
      const baseDuration = getEstimatedTimeLength(baseText);

      // 0.5x multiplier should halve the duration
      const multipliedDuration = getEstimatedTimeLength(baseText, 0.5);
      expect(multipliedDuration).toBe(Math.round(baseDuration * 0.5));
    });

    it('should default multiplier to 1', () => {
      const text = 'Hello world';
      const duration1 = getEstimatedTimeLength(text);
      const duration2 = getEstimatedTimeLength(text, 1);
      expect(duration1).toBe(duration2);
    });

    it('should handle long text', () => {
      // 100 words
      const words = Array(100).fill('word').join(' ');
      const duration = getEstimatedTimeLength(words);
      const expected = Math.round((100 / WORDS_PER_MINUTE) * 60 * 1000);
      expect(duration).toBe(expected);
    });

    it('should handle punctuation attached to words (short text)', () => {
      // "Hello, world!" = 2 words (short text), uses character-based formula
      const duration = getEstimatedTimeLength('Hello, world!');
      const preprocessedChars = 'Hello, world!'.replace(/\s/g, '').length; // 12
      const expected = BASE_TIMEOUT_NATIVE + preprocessedChars * 50;
      expect(duration).toBe(expected);
    });
  });

  describe('getEstimatedTimeLength - short text handling', () => {
    it('should use character-based formula for texts with fewer than 5 words', () => {
      // 4 words = short text, uses character-based formula
      const shortText = 'One two three four';
      const charsCount = shortText.replace(/\s/g, '').length; // 15 chars
      const expected = BASE_TIMEOUT_NATIVE + charsCount * 50;
      expect(getEstimatedTimeLength(shortText)).toBe(expected);

      // 5 words = normal text, uses word-based formula
      const normalText = 'One two three four five';
      const wordExpected = Math.round((5 / WORDS_PER_MINUTE) * 60 * 1000);
      expect(getEstimatedTimeLength(normalText)).toBe(wordExpected);
    });

    it('should use higher base timeout for fallback engine', () => {
      const text = 'Hi';
      const charsCount = 2;

      // Native base = 700ms
      const nativeDuration = getEstimatedTimeLength(text);
      expect(nativeDuration).toBe(BASE_TIMEOUT_NATIVE + charsCount * 50); // 800ms

      // Fallback base = 1300ms
      const fallbackDuration = getEstimatedTimeLength(text, 1, {
        baseTimeout: BASE_TIMEOUT_FALLBACK,
      });
      expect(fallbackDuration).toBe(BASE_TIMEOUT_FALLBACK + charsCount * 50); // 1400ms
    });

    it('should apply multiplier to short text formula', () => {
      const text = 'Hello';
      const charsCount = 5;
      const baseExpected = BASE_TIMEOUT_NATIVE + charsCount * 50; // 950ms

      // With 2x multiplier
      const doubled = getEstimatedTimeLength(text, 2);
      expect(doubled).toBe(baseExpected * 2); // 1900ms
    });

    it('should use correct base for fallback with multiplier', () => {
      const text = 'Test';
      const charsCount = 4;
      const fallbackBase = BASE_TIMEOUT_FALLBACK + charsCount * 50; // 1500ms

      // With 1.3x multiplier (common for estimation timeout)
      const withMultiplier = getEstimatedTimeLength(text, 1.3, {
        baseTimeout: BASE_TIMEOUT_FALLBACK,
      });
      expect(withMultiplier).toBe(Math.round(fallbackBase * 1.3)); // 1950ms
    });

    it('should not affect longer texts when baseTimeout is set', () => {
      // Long text (5+ words) uses word-based formula regardless of baseTimeout
      const longText = 'This is a longer text with many words';
      const wordCount = 8;
      const expected = Math.round((wordCount / WORDS_PER_MINUTE) * 60 * 1000);

      expect(getEstimatedTimeLength(longText)).toBe(expected);
      expect(getEstimatedTimeLength(longText, 1, { baseTimeout: BASE_TIMEOUT_FALLBACK })).toBe(
        expected
      );
    });
  });

  describe('getEstimatedTimeLength - preprocessing for word count', () => {
    it('should expand numbers to words for accurate word counting', () => {
      // "I have 100 apples" without preprocessing: 4 words
      // With preprocessing: "I have one hundred apples" = 5 words → word-based formula
      const withNumber = getEstimatedTimeLength('I have 100 apples');
      // "one hundred" adds a word, pushing past the 5-word threshold
      const expectedWords = 5; // "I have one hundred apples"
      const expected = Math.round((expectedWords / WORDS_PER_MINUTE) * 60 * 1000);
      expect(withNumber).toBe(expected);
    });

    it('should expand currency symbols for accurate word counting', () => {
      // "$100" without preprocessing: 1 word (short text, char-based)
      // With preprocessing: "100 dollars" → "one hundred dollars" = 3 words (still short text)
      const withCurrency = getEstimatedTimeLength('$100');
      // Preprocessed: "one hundred dollars" = 3 words, 18 chars
      const preprocessedChars = 'one hundred dollars'.replace(/\s/g, '').length;
      const expected = BASE_TIMEOUT_NATIVE + preprocessedChars * 50;
      expect(withCurrency).toBe(expected);
    });

    it('should produce longer estimates for text with numbers than plain text', () => {
      // Text with a large number should estimate longer than without
      const withNumber = getEstimatedTimeLength('The value is 1000000');
      const withoutNumber = getEstimatedTimeLength('The value is big');
      expect(withNumber).toBeGreaterThan(withoutNumber);
    });

    it('should handle mixed currency and numbers', () => {
      // "$50 and €30" → "50 dollars and 30 euros" → expanded numbers
      const duration = getEstimatedTimeLength('$50 and €30');
      // After expansion it's more words, so duration should be positive
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('getEstimatedTimeLengthWithRate', () => {
    it('should return same as base for rate 1', () => {
      const text = 'Hello world test';
      const baseEstimate = getEstimatedTimeLength(text);
      const withRate = getEstimatedTimeLengthWithRate(text, 1);
      expect(withRate).toBe(baseEstimate);
    });

    it('should decrease duration for faster rate', () => {
      const text = 'Hello world test';
      const baseEstimate = getEstimatedTimeLength(text);

      // Rate 2 = speech is 2x faster, so duration is approximately halved
      const fastDuration = getEstimatedTimeLengthWithRate(text, 2);
      expect(fastDuration).toBeLessThan(baseEstimate);
      // Should be approximately half (within 1ms due to rounding)
      expect(Math.abs(fastDuration - baseEstimate / 2)).toBeLessThanOrEqual(1);
    });

    it('should increase duration for slower rate', () => {
      const text = 'Hello world test';
      const baseEstimate = getEstimatedTimeLength(text);

      // Rate 0.5 = speech is half speed, so duration approximately doubles
      const slowDuration = getEstimatedTimeLengthWithRate(text, 0.5);
      expect(slowDuration).toBeGreaterThan(baseEstimate);
      // Should be approximately double (within 1ms due to rounding)
      expect(Math.abs(slowDuration - baseEstimate * 2)).toBeLessThanOrEqual(1);
    });

    it('should clamp rate to minimum 0.1', () => {
      const text = 'Hello world';

      // Rate below 0.1 should be clamped to 0.1
      const withZeroRate = getEstimatedTimeLengthWithRate(text, 0);
      const withNegativeRate = getEstimatedTimeLengthWithRate(text, -1);
      const withMinRate = getEstimatedTimeLengthWithRate(text, 0.1);

      expect(withZeroRate).toBe(withMinRate);
      expect(withNegativeRate).toBe(withMinRate);
    });

    it('should clamp rate to maximum 10', () => {
      const text = 'Hello world';
      const baseEstimate = getEstimatedTimeLength(text);

      // Rate above 10 should be clamped to 10
      const withHighRate = getEstimatedTimeLengthWithRate(text, 100);
      const withMaxRate = getEstimatedTimeLengthWithRate(text, 10);

      expect(withHighRate).toBe(withMaxRate);
      expect(withMaxRate).toBe(Math.round(baseEstimate / 10));
    });

    it('should default rate to 1', () => {
      const text = 'Hello world';
      const duration1 = getEstimatedTimeLengthWithRate(text);
      const duration2 = getEstimatedTimeLengthWithRate(text, 1);
      expect(duration1).toBe(duration2);
    });

    it('should return 0 for empty text regardless of rate', () => {
      expect(getEstimatedTimeLengthWithRate('', 1)).toBe(0);
      expect(getEstimatedTimeLengthWithRate('', 2)).toBe(0);
      expect(getEstimatedTimeLengthWithRate('', 0.5)).toBe(0);
    });
  });

  describe('WORDS_PER_MINUTE constant', () => {
    it('should be 130 (average speaking rate)', () => {
      expect(WORDS_PER_MINUTE).toBe(130);
    });
  });
});
