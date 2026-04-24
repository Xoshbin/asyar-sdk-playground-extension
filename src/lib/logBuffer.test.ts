import { describe, it, expect } from 'vitest';
import { appendBounded } from './logBuffer';

describe('appendBounded', () => {
  it('appends to an empty buffer', () => {
    expect(appendBounded([], 'a', 3)).toEqual(['a']);
  });

  it('returns a NEW array (does not mutate)', () => {
    const source = [1, 2];
    const next = appendBounded(source, 3, 5);
    expect(next).toEqual([1, 2, 3]);
    expect(source).toEqual([1, 2]);
    expect(next).not.toBe(source);
  });

  it('tail-slices to respect the bound from the RIGHT', () => {
    const buf = [1, 2, 3, 4, 5];
    expect(appendBounded(buf, 6, 3)).toEqual([4, 5, 6]);
  });

  it('clamps a single-entry append on an over-long buffer', () => {
    const buf = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(appendBounded(buf, 11, 2)).toEqual([10, 11]);
  });

  it('handles max === 0 by returning empty', () => {
    expect(appendBounded([1, 2, 3], 4, 0)).toEqual([]);
  });

  it('handles max === 1 by keeping only the newest', () => {
    expect(appendBounded([1, 2, 3], 4, 1)).toEqual([4]);
  });

  it('preserves object identity for retained items (no deep-clone)', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const c = { id: 3 };
    const next = appendBounded([a, b], c, 2);
    expect(next[0]).toBe(b);
    expect(next[1]).toBe(c);
  });
});
