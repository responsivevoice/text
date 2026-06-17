/**
 * Configuration constants for text processing
 */

/**
 * Default character limit for text chunking
 * Text longer than this will be split into multiple utterances
 */
export const DEFAULT_CHARACTER_LIMIT = 100;

/**
 * Maximum allowed character limit
 */
export const MAX_CHARACTER_LIMIT = 300;

/**
 * Minimum character limit
 */
export const MIN_CHARACTER_LIMIT = 50;

/**
 * Currency symbols to replace with words
 */
export const CURRENCY_REPLACEMENTS: Record<string, string> = {
  $: 'dollars',
  '€': 'euros',
  '£': 'pounds',
  '¥': 'yen',
  '₹': 'rupees',
};

/**
 * Estimated words per minute for duration calculations
 */
export const WORDS_PER_MINUTE = 130;

/**
 * Base timeout in ms for native TTS (Web Speech API) short-text estimation
 */
export const BASE_TIMEOUT_NATIVE = 700;

/**
 * Base timeout in ms for fallback (HTTP audio) short-text estimation.
 * Higher than native to account for network latency.
 */
export const BASE_TIMEOUT_FALLBACK = 1300;
