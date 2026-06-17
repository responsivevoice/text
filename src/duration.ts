/**
 * Duration Estimation Utilities
 *
 * Provides speech duration estimation based on text length and word count.
 * Preprocesses text (currency symbols, numbers) before counting words
 * to match what TTS engines actually speak, matching legacy getWords() behavior.
 */

import { BASE_TIMEOUT_NATIVE, WORDS_PER_MINUTE } from './config';
import { replaceCurrencySymbols, replaceNumbersWithWords } from './preprocessor';

/**
 * Preprocess text for word counting (not for TTS output).
 *
 * Matches legacy getWords(): replaces currency symbols and converts
 * numbers to words so word count reflects actual spoken words.
 * e.g. "$1,234" → "1234 dollars" → "one thousand two hundred thirty four dollars"
 */
function preprocessForWordCount(text: string): string {
  let processed = replaceCurrencySymbols(text);
  processed = replaceNumbersWithWords(processed);
  return processed;
}

/**
 * Estimate the speech duration for a given text
 *
 * Uses different formulas based on text length:
 * - Short text (fewer than 5 words): character-based formula with a
 *   configurable base timeout.
 * - Normal text: words-per-minute calculation (130 WPM).
 *
 * Text is preprocessed (currency/number expansion) before word counting
 * so estimates match what TTS engines actually speak.
 *
 * @param text - The text to estimate duration for
 * @param multiplier - Optional multiplier for the duration (default: 1)
 * @param options - Optional configuration. `options.baseTimeout` is the base
 *   timeout in ms for short text (default: 700 for native TTS, use 1300 for
 *   fallback/HTTP audio).
 * @returns Estimated duration in milliseconds
 *
 * @example
 * ```typescript
 * // Estimate duration for a sentence
 * const duration = getEstimatedTimeLength("Hello, how are you today?");
 *
 * // With a multiplier (e.g., for slower speech rate)
 * const slowerDuration = getEstimatedTimeLength("Hello world", 1.5);
 *
 * // For fallback engine (HTTP audio) - uses higher base timeout
 * const fallbackDuration = getEstimatedTimeLength("Hi", 1, { baseTimeout: 1300 });
 * ```
 */
export function getEstimatedTimeLength(
  text: string,
  multiplier = 1,
  options?: { baseTimeout?: number }
): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Preprocess for accurate word counting (legacy getWords() parity)
  const processed = preprocessForWordCount(text);

  // Count words by splitting on whitespace
  const words = processed
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const wordCount = words.length;

  if (wordCount === 0) {
    return 0;
  }

  // Short text handling (legacy parity)
  // For texts with fewer than 5 words, use character-based formula
  if (wordCount < 5) {
    const base = options?.baseTimeout ?? BASE_TIMEOUT_NATIVE;

    // Count non-whitespace characters from preprocessed text
    const charsCount = processed.replace(/\s/g, '').length;

    // Character-based formula: base + 50ms per character
    return Math.round(multiplier * (base + charsCount * 50));
  }

  // Normal text: word-based calculation
  // WORDS_PER_MINUTE = 130 (from config)
  // Duration in ms = (wordCount / WPM) * 60 * 1000
  const minutesPerWord = 1 / WORDS_PER_MINUTE;
  const durationMs = wordCount * minutesPerWord * 60 * 1000;

  // Apply multiplier and round to nearest millisecond
  return Math.round(durationMs * multiplier);
}

/**
 * Estimate speech duration with rate adjustment
 *
 * @param text - The text to estimate duration for
 * @param rate - Speech rate (0.1 to 10, where 1 is normal)
 * @returns Estimated duration in milliseconds
 */
export function getEstimatedTimeLengthWithRate(text: string, rate = 1): number {
  // Faster rate = shorter duration, so we divide by rate
  const rateMultiplier = 1 / Math.max(0.1, Math.min(10, rate));
  return getEstimatedTimeLength(text, rateMultiplier);
}
