import { describe, expect, it } from 'vitest';
import { djb2Hash } from '../hash';

describe('djb2Hash', () => {
  it('returns consistent hashes', () => {
    expect(djb2Hash('hello')).toBe(djb2Hash('hello'));
  });

  it('returns different hashes for different inputs', () => {
    expect(djb2Hash('hello')).not.toBe(djb2Hash('world'));
  });

  it('returns hex string', () => {
    expect(djb2Hash('test')).toMatch(/^[0-9a-f]+$/);
  });

  it('handles empty string', () => {
    expect(djb2Hash('')).toMatch(/^[0-9a-f]+$/);
  });
});
