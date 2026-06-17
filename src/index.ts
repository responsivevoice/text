/**
 * Text processing utilities for text-to-speech: intelligent chunking with
 * CJK support, speech-duration estimation, and fast hashing for cache keys.
 * Consumed by `@responsivevoice/core`, `@responsivevoice/api-client`, and
 * `services/tts-api`.
 *
 * @packageDocumentation
 */

export type { ChunkerOptions, TextChunk } from './chunker';
// Chunker
export { chunkText, createTextChunker, hasCJKContent } from './chunker';
// Constants
export {
  BASE_TIMEOUT_FALLBACK,
  BASE_TIMEOUT_NATIVE,
  DEFAULT_CHARACTER_LIMIT,
  MAX_CHARACTER_LIMIT,
  MIN_CHARACTER_LIMIT,
  WORDS_PER_MINUTE,
} from './config';
// Duration estimation
export { getEstimatedTimeLength, getEstimatedTimeLengthWithRate } from './duration';
// Hash
export { djb2Hash } from './hash';
