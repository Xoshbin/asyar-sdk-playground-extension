import { describe, it, expect } from 'vitest';
import { formatTime } from './timeFormat';

describe('formatTime', () => {
  it('zero-pads hours, minutes, seconds in 24h form', () => {
    const d = new Date(2026, 3, 24, 3, 7, 9);
    expect(formatTime(d)).toBe('03:07:09');
  });

  it('uses 24h format past noon', () => {
    const d = new Date(2026, 3, 24, 23, 59, 58);
    expect(formatTime(d)).toBe('23:59:58');
  });

  it('accepts unix-ms numeric input', () => {
    const d = new Date(2026, 3, 24, 12, 30, 0);
    expect(formatTime(d.getTime())).toBe('12:30:00');
  });
});
