/**
 * Text chunker for splitting long text into speakable segments
 *
 * Splits text at natural boundaries (sentences, clauses) to produce
 * more natural-sounding speech. Uses backward search to find the last
 * delimiter within the character limit, producing fewer, larger chunks.
 *
 * Design choice — backward search vs legacy forward search:
 * The legacy responsivevoice.js used forward search (tmptxt.search(regex)),
 * finding the FIRST delimiter and producing many small chunks with frequent
 * audio seams. This implementation uses backward search (lastIndexOf),
 * finding the LAST delimiter within the limit. Fewer chunks means fewer
 * HTTP requests, fewer audio stitching points, and more natural speech.
 *
 * Features:
 * - Expanded delimiter set: Latin and CJK punctuation (W3C CLREQ)
 * - Digit-aware splitting: won't break "3.14" or "1,000"
 * - Grouping awareness: soft preference to keep () [] «» 「」 etc. intact
 * - CJK character boundary fallback: ideographs are individually pronounceable
 */

import { DEFAULT_CHARACTER_LIMIT, MAX_CHARACTER_LIMIT, MIN_CHARACTER_LIMIT } from './config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Represents a single chunk of text
 */
export interface TextChunk {
  /** The text content of the chunk */
  text: string;
  /** Zero-based index of this chunk */
  index: number;
  /** Total number of chunks */
  total: number;
  /** Whether this is the last chunk */
  isLast: boolean;
}

/**
 * Options for text chunking
 */
export interface ChunkerOptions {
  /** Maximum characters per chunk (default: 100, clamped: 50-300) */
  characterLimit?: number;
  /**
   * Internal character limit that bypasses min/max clamping.
   * Used by voice-aware logic to set limits below the public minimum
   * (e.g. 40 chars for CJK text with Google remote voices).
   * When provided, takes precedence over characterLimit.
   * @internal
   */
  _internalCharacterLimit?: number;
  /** Whether to prioritize sentence boundaries over character limit */
  preserveSentences?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum chunk size to avoid very small segments
 */
const MIN_CHUNK_SIZE = 20;

/**
 * Delimiter priority groups for backward search.
 * Higher priority groups (lower index) are checked first.
 * Within a group, the rightmost occurrence wins.
 *
 * Includes CJK pause punctuation per W3C CLREQ:
 * 。(U+3002) ，(U+FF0C) 、(U+3001) ．(U+FF0E) ：(U+FF1A) ；(U+FF1B) ！(U+FF01) ？(U+FF1F)
 */
const DELIMITER_PRIORITIES: readonly (readonly string[])[] = [
  // Priority 1: Sentence endings (strongest natural pause)
  ['.', '?', '!', '\u3002', '\uFF1F', '\uFF01', '\uFF0E'],
  // Priority 2: Major separators (medium pause)
  [';', ':', '\uFF1B', '\uFF1A'],
  // Priority 3: Clause separators (soft pause)
  [',', '\uFF0C', '\u3001'],
];

/**
 * Delimiters where the split must be skipped when followed by a digit.
 * Prevents splitting numbers like "3.14" and "1,000".
 */
const DIGIT_SENSITIVE_DELIMITERS = new Set(['.', ',']);

/**
 * Grouping delimiter pairs: opening → closing.
 * The chunker has a soft preference to not split inside these pairs.
 */
const GROUPING_PAIRS = new Map<string, string>([
  ['(', ')'],
  ['[', ']'],
  ['\u00AB', '\u00BB'], // «»
  ['\u201C', '\u201D'], // ""
  ['\u2018', '\u2019'], // ''
  ['\u300C', '\u300D'], // 「」
  ['\u300E', '\u300F'], // 『』
  ['\uFF08', '\uFF09'], // （）
  ['\u3010', '\u3011'], // 【】
]);

/** Set of opening grouping delimiters for fast lookup */
const GROUPING_OPENERS = new Set(GROUPING_PAIRS.keys());

/** Map from closing → opening grouping delimiter */
const CLOSING_TO_OPENING = new Map<string, string>(
  [...GROUPING_PAIRS.entries()].map(([open, close]) => [close, open])
);

// ---------------------------------------------------------------------------
// CJK Detection
// ---------------------------------------------------------------------------

/**
 * Checks if a character code is a CJK ideograph.
 * Covers CJK Unified Ideographs, Extension A, and Compatibility Ideographs.
 */
function isCJKIdeograph(charCode: number): boolean {
  return (
    (charCode >= 0x4e00 && charCode <= 0x9fff) || // CJK Unified Ideographs
    (charCode >= 0x3400 && charCode <= 0x4dbf) || // CJK Extension A
    (charCode >= 0xf900 && charCode <= 0xfaff) // CJK Compatibility Ideographs
  );
}

/**
 * Checks if text contains any CJK ideographic characters.
 * Exported for use in voice-aware character limit computation
 * (e.g. reducing the limit for Google remote voices with CJK content).
 */
export function hasCJKContent(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (isCJKIdeograph(text.charCodeAt(i))) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Split Position Finding
// ---------------------------------------------------------------------------

/**
 * Returns true when the delimiter at `pos` is followed by an ASCII digit,
 * meaning it's part of a number literal (e.g. "3.14", "1,000") and must not
 * be used as a split point.
 */
function isDigitBoundary(text: string, pos: number, delimiter: string): boolean {
  if (!DIGIT_SENSITIVE_DELIMITERS.has(delimiter)) return false;
  const nextIdx = pos + 1;
  if (nextIdx >= text.length) return false;
  const nextCode = text.charCodeAt(nextIdx);
  return nextCode >= 0x30 && nextCode <= 0x39;
}

/**
 * Finds the rightmost valid occurrence of `delimiter` in `text` between
 * `MIN_CHUNK_SIZE` and `maxLength - 1`, skipping digit-sensitive positions.
 *
 * @returns The position, or -1 if none found
 */
function findRightmostDelimiter(text: string, delimiter: string, maxLength: number): number {
  let searchFrom = maxLength - 1;

  while (searchFrom >= MIN_CHUNK_SIZE) {
    const pos = text.lastIndexOf(delimiter, searchFrom);
    if (pos < MIN_CHUNK_SIZE) return -1;

    if (isDigitBoundary(text, pos, delimiter)) {
      searchFrom = pos - 1;
      continue;
    }

    return pos;
  }

  return -1;
}

/**
 * Searches backward for the rightmost pause delimiter within the limit,
 * respecting delimiter priorities and digit-awareness.
 *
 * @returns Position to split at (after the delimiter), or -1 if none found
 */
function findLastPauseDelimiter(text: string, maxLength: number): number {
  for (const group of DELIMITER_PRIORITIES) {
    let bestInGroup = -1;

    for (const delimiter of group) {
      const pos = findRightmostDelimiter(text, delimiter, maxLength);
      if (pos > bestInGroup) {
        bestInGroup = pos;
      }
    }

    if (bestInGroup >= MIN_CHUNK_SIZE) {
      return bestInGroup + 1; // Include the delimiter in the chunk
    }
  }

  return -1;
}

/**
 * Adjusts a split position to avoid splitting inside grouping delimiters.
 *
 * Soft preference: if the split falls inside an unclosed grouping pair
 * (e.g. parentheses) and the grouped content fits in one chunk, moves
 * the split to before the opening delimiter so the grouping stays together
 * in the next chunk. If the grouped content is too large, keeps the
 * original position (splits inside — no choice).
 */
/**
 * Scans text up to `splitPos` and returns the innermost unclosed grouping
 * delimiter (opener + position), or null if all groupings are balanced.
 */
function findUnclosedGrouping(
  text: string,
  splitPos: number
): { char: string; pos: number } | null {
  const stack: { char: string; pos: number }[] = [];

  for (let i = 0; i < splitPos; i++) {
    const char = text[i];
    if (GROUPING_OPENERS.has(char)) {
      stack.push({ char, pos: i });
    } else if (CLOSING_TO_OPENING.has(char)) {
      const expectedOpener = CLOSING_TO_OPENING.get(char);
      if (stack.length > 0 && stack[stack.length - 1].char === expectedOpener) {
        stack.pop();
      }
    }
  }

  return stack.length > 0 ? stack[stack.length - 1] : null;
}

function adjustForGrouping(text: string, splitPos: number, maxLength: number): number {
  const unclosed = findUnclosedGrouping(text, splitPos);
  if (!unclosed) return splitPos;

  const closingChar = GROUPING_PAIRS.get(unclosed.char);
  if (!closingChar) return splitPos;

  const closingPos = text.indexOf(closingChar, splitPos);
  if (closingPos === -1) return splitPos;

  const groupingLength = closingPos - unclosed.pos + 1;
  if (groupingLength <= maxLength && unclosed.pos >= MIN_CHUNK_SIZE) {
    return unclosed.pos;
  }

  return splitPos;
}

/**
 * Searches backward for a CJK character boundary.
 * CJK ideographs are logographic — any boundary between two is pronounceable,
 * though it may split compound words (acceptable tradeoff for TTS).
 *
 * @returns Position to split at, or -1 if no CJK boundary found
 */
function findCJKBoundary(text: string, maxLength: number): number {
  const limit = Math.min(maxLength, text.length);
  for (let i = limit - 1; i >= MIN_CHUNK_SIZE; i--) {
    if (isCJKIdeograph(text.charCodeAt(i - 1))) {
      return i;
    }
  }
  return -1;
}

/**
 * Finds the best position to split text within the character limit.
 *
 * Split position priority:
 * 1. Pause delimiters, tried in order: sentence endings, then major
 *    separators, then clause separators — with grouping awareness and
 *    digit-aware splitting.
 * 2. Space (word boundary)
 * 3. CJK character boundary (any position after a CJK ideograph)
 * 4. Hard cut at maxLength (absolute fallback)
 *
 * @param text - The remaining text to find a split position in
 * @param maxLength - Maximum allowed length for the chunk
 * @returns The position to split at
 */
function findBestSplitPosition(text: string, maxLength: number): number {
  if (text.length <= maxLength) {
    return text.length;
  }

  // Phase 1: Pause delimiters with grouping awareness
  const delimiterPos = findLastPauseDelimiter(text, maxLength);
  if (delimiterPos >= MIN_CHUNK_SIZE) {
    const adjusted = adjustForGrouping(text, delimiterPos, maxLength);
    if (adjusted >= MIN_CHUNK_SIZE) {
      return adjusted;
    }
  }

  // Phase 2: Space (word boundary) with grouping awareness
  const lastSpace = text.lastIndexOf(' ', maxLength - 1);
  if (lastSpace >= MIN_CHUNK_SIZE) {
    const adjusted = adjustForGrouping(text, lastSpace, maxLength);
    if (adjusted >= MIN_CHUNK_SIZE) {
      return adjusted;
    }
    return lastSpace;
  }

  // Phase 3: CJK character boundary
  const cjkPos = findCJKBoundary(text, maxLength);
  if (cjkPos >= MIN_CHUNK_SIZE) {
    return cjkPos;
  }

  // Phase 4: Hard cut
  return maxLength;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Splits text into chunks for speech synthesis
 *
 * @param text - The text to chunk
 * @param options - Chunking options
 * @returns Array of text chunks with metadata
 *
 * @example
 * ```typescript
 * const chunks = chunkText('Hello world. How are you today?', { characterLimit: 20 });
 * // Returns:
 * // [
 * //   { text: 'Hello world.', index: 0, total: 2, isLast: false },
 * //   { text: 'How are you today?', index: 1, total: 2, isLast: true }
 * // ]
 * ```
 */
export function chunkText(text: string, options: ChunkerOptions = {}): TextChunk[] {
  // Determine effective character limit:
  // - _internalCharacterLimit bypasses clamping (voice-aware limits, e.g. CJK 40 chars)
  // - characterLimit is clamped to [MIN_CHARACTER_LIMIT, MAX_CHARACTER_LIMIT]
  const characterLimit =
    options._internalCharacterLimit != null
      ? options._internalCharacterLimit
      : Math.max(
          MIN_CHARACTER_LIMIT,
          Math.min(options.characterLimit ?? DEFAULT_CHARACTER_LIMIT, MAX_CHARACTER_LIMIT)
        );

  // Normalize and trim text
  const normalizedText = text.trim().replace(/\s+/g, ' ');

  if (normalizedText.length === 0) {
    return [];
  }

  // If text fits in one chunk, return it
  if (normalizedText.length <= characterLimit) {
    return [
      {
        text: normalizedText,
        index: 0,
        total: 1,
        isLast: true,
      },
    ];
  }

  // Split into chunks
  const chunks: string[] = [];
  let remaining = normalizedText;

  while (remaining.length > 0) {
    const splitPos = findBestSplitPosition(remaining, characterLimit);
    const chunk = remaining.substring(0, splitPos).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    remaining = remaining.substring(splitPos).trim();
  }

  // Convert to TextChunk objects
  return chunks.map((chunkText, index) => ({
    text: chunkText,
    index,
    total: chunks.length,
    isLast: index === chunks.length - 1,
  }));
}

/**
 * Creates a text chunker instance with preset options
 *
 * @param defaultOptions - Default options for all chunk operations
 * @returns A chunker function with the preset options
 *
 * @example
 * ```typescript
 * const chunker = createTextChunker({ characterLimit: 150 });
 * const chunks = chunker('Long text here...');
 * ```
 */
export function createTextChunker(
  defaultOptions: ChunkerOptions = {}
): (text: string, options?: ChunkerOptions) => TextChunk[] {
  return (text: string, options: ChunkerOptions = {}) =>
    chunkText(text, { ...defaultOptions, ...options });
}
