import { describe, expect, it } from 'vitest';
import { formatErrorMessage, parseSqlParams } from './filesQuery';

describe('parseSqlParams', () => {
  it('returns undefined for empty or whitespace input', () => {
    expect(parseSqlParams('')).toBeUndefined();
    expect(parseSqlParams('   \n\t  ')).toBeUndefined();
  });

  it('parses a valid JSON array', () => {
    expect(parseSqlParams('[1, "hello", true, null]')).toEqual([1, 'hello', true, null]);
    expect(parseSqlParams('[]')).toEqual([]);
  });

  it('throws when JSON is not an array', () => {
    expect(() => parseSqlParams('{"a":1}')).toThrow('SQL params must be a JSON array');
    expect(() => parseSqlParams('"str"')).toThrow('SQL params must be a JSON array');
    expect(() => parseSqlParams('42')).toThrow('SQL params must be a JSON array');
  });

  it('throws on invalid JSON syntax', () => {
    expect(() => parseSqlParams('[1,')).toThrow();
  });
});

describe('formatErrorMessage', () => {
  it('extracts message from Error instances', () => {
    expect(formatErrorMessage(new Error('NotFound: /missing'))).toBe('NotFound: /missing');
  });

  it('returns string errors directly', () => {
    expect(formatErrorMessage('plain error')).toBe('plain error');
  });

  it('serializes object errors', () => {
    expect(formatErrorMessage({ code: 'NotFound' })).toBe('{"code":"NotFound"}');
  });
});
