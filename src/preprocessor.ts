/**
 * Text preprocessor for preparing text for speech synthesis
 *
 * This module provides text preprocessing functionality including:
 * - Number to words conversion
 * - Currency symbol replacement
 * - Text normalization
 */

import { CURRENCY_REPLACEMENTS } from './config';

/**
 * Options for text preprocessing
 */
export interface PreprocessOptions {
  /** Convert numeric values to words (default: false) */
  convertNumbers?: boolean;
  /** Convert currency symbols to words (default: false) */
  convertCurrency?: boolean;
  /** Normalize whitespace (default: true) */
  normalizeWhitespace?: boolean;
}

/**
 * Word representations for numbers 0-19
 */
const ONES: readonly string[] = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

/**
 * Word representations for tens (20, 30, etc.)
 */
const TENS: readonly string[] = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

/**
 * Scale words (thousand, million, etc.)
 */
const SCALES: readonly string[] = ['', 'thousand', 'million', 'billion', 'trillion'];

/**
 * Converts a number to its word representation
 *
 * Supports:
 * - Positive integers up to trillions
 * - Negative numbers
 * - Decimal numbers
 *
 * @param num - The number to convert
 * @returns The word representation of the number
 *
 * @example
 * ```typescript
 * numberToWords(123);     // "one hundred twenty three"
 * numberToWords(-42);     // "negative forty two"
 * numberToWords(3.14);    // "three point one four"
 * numberToWords(0);       // "zero"
 * numberToWords(1000000); // "one million"
 * ```
 */
/**
 * Converts a 3-digit chunk (0–999) to words.
 * Returns an empty string for chunk === 0.
 */
function chunkToWords(chunk: number): string {
  if (chunk === 0) return '';

  const parts: string[] = [];

  const hundreds = Math.floor(chunk / 100);
  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} hundred`);
  }

  const tensOnes = chunk % 100;
  if (tensOnes > 0) {
    if (tensOnes < 20) {
      parts.push(ONES[tensOnes]);
    } else {
      const tens = Math.floor(tensOnes / 10);
      const ones = tensOnes % 10;
      parts.push(ones > 0 ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens]);
    }
  }

  return parts.join(' ');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'zero';
  if (num < 0) return `negative ${numberToWords(Math.abs(num))}`;

  // Handle decimals
  if (!Number.isInteger(num)) {
    const [integer, decimal] = num.toString().split('.');
    const integerPart = numberToWords(Number.parseInt(integer, 10));
    const decimalPart = decimal
      .split('')
      .map((d) => (d === '0' ? 'zero' : ONES[Number.parseInt(d, 10)]))
      .join(' ');
    return `${integerPart} point ${decimalPart}`;
  }

  const words: string[] = [];
  let remaining = Math.floor(num);

  for (let scaleIdx = 0; remaining > 0; scaleIdx++) {
    const chunk = remaining % 1000;
    remaining = Math.floor(remaining / 1000);

    const text = chunkToWords(chunk);
    if (!text) continue;

    words.unshift(scaleIdx > 0 ? `${text} ${SCALES[scaleIdx]}` : text);
  }

  return words.join(' ');
}

/**
 * Replaces numbers in text with their word representations
 *
 * @param text - The text containing numbers
 * @returns Text with numbers replaced by words
 *
 * @example
 * ```typescript
 * replaceNumbersWithWords('I have 5 apples');
 * // "I have five apples"
 *
 * replaceNumbersWithWords('The price is 1,234.56');
 * // "The price is one thousand two hundred thirty four point five six"
 * ```
 */
export function replaceNumbersWithWords(text: string): string {
  // Match numbers (including decimals and commas)
  return text.replace(/\d+(?:,\d{3})*(?:\.\d+)?/g, (match) => {
    const num = Number.parseFloat(match.replace(/,/g, ''));
    return numberToWords(num);
  });
}

/**
 * Replaces currency symbols with their word representations
 *
 * Handles both:
 * - Currency symbols followed by amounts (e.g., `$100` becomes `100 dollars`)
 * - Standalone currency symbols
 *
 * Supported currencies (from CURRENCY_REPLACEMENTS):
 * - `$` becomes `dollars`
 * - `EUR` becomes `euros`
 * - `GBP` becomes `pounds`
 * - `JPY` becomes `yen`
 * - `INR` becomes `rupees`
 *
 * @param text - The text containing currency symbols
 * @returns Text with currency symbols replaced by words
 *
 * @example
 * ```typescript
 * replaceCurrencySymbols('The price is $100');
 * // "The price is 100 dollars"
 *
 * replaceCurrencySymbols('Costs EUR50 or GBP40');
 * // "Costs 50 euros or 40 pounds"
 * ```
 */
export function replaceCurrencySymbols(text: string): string {
  let result = text;

  for (const [symbol, word] of Object.entries(CURRENCY_REPLACEMENTS)) {
    // Escape special regex characters in the symbol
    const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match currency symbol followed by a number
    const currencyRegex = new RegExp(`${escapedSymbol}(\\d+(?:,\\d{3})*(?:\\.\\d+)?)`, 'g');
    result = result.replace(currencyRegex, (_match, amount) => {
      // Remove commas and keep the numeric value
      const numValue = amount.replace(/,/g, '');
      return `${numValue} ${word}`;
    });

    // Also replace standalone currency symbols
    result = result.replace(new RegExp(escapedSymbol, 'g'), word);
  }

  return result;
}

/**
 * Preprocesses text for speech synthesis
 *
 * Applies various transformations to make text more suitable for TTS:
 * - Normalizes whitespace
 * - Converts numbers to words (optional)
 * - Replaces currency symbols (optional)
 *
 * @param text - The text to preprocess
 * @param options - Preprocessing options
 * @returns Preprocessed text
 *
 * @example
 * ```typescript
 * preprocessText('I have $100 in my wallet.', {
 *   convertCurrency: true,
 *   convertNumbers: true
 * });
 * // "I have one hundred dollars in my wallet."
 * ```
 */
export function preprocessText(text: string, options: PreprocessOptions = {}): string {
  const { convertNumbers = false, convertCurrency = false, normalizeWhitespace = true } = options;

  let processed = text.trim();

  // Normalize whitespace (collapse multiple spaces/newlines)
  if (normalizeWhitespace) {
    processed = processed.replace(/\s+/g, ' ');
  }

  // Convert currency symbols if enabled
  if (convertCurrency) {
    processed = replaceCurrencySymbols(processed);
  }

  // Convert numbers to words if enabled
  if (convertNumbers) {
    processed = replaceNumbersWithWords(processed);
  }

  return processed;
}
