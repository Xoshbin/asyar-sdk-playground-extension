import { describe, it, expect } from 'vitest';
import { buildGreeting, parseGreetArgs } from './greet';

describe('parseGreetArgs', () => {
  it('applies defaults for every optional field', () => {
    expect(parseGreetArgs({})).toEqual({ name: 'stranger', style: 'casual', volume: 1 });
  });

  it('coerces string numeric volume', () => {
    expect(parseGreetArgs({ volume: '3' })).toEqual({
      name: 'stranger',
      style: 'casual',
      volume: 3,
    });
  });

  it('floors fractional volume and clamps negatives to zero', () => {
    expect(parseGreetArgs({ volume: 2.9 })).toMatchObject({ volume: 2 });
    expect(parseGreetArgs({ volume: -5 })).toMatchObject({ volume: 0 });
  });

  it('defaults unknown style to casual', () => {
    expect(parseGreetArgs({ style: 'weird' })).toMatchObject({ style: 'casual' });
  });

  it('accepts the three canonical styles', () => {
    expect(parseGreetArgs({ style: 'formal' })).toMatchObject({ style: 'formal' });
    expect(parseGreetArgs({ style: 'rhyming' })).toMatchObject({ style: 'rhyming' });
    expect(parseGreetArgs({ style: 'casual' })).toMatchObject({ style: 'casual' });
  });
});

describe('buildGreeting', () => {
  it('casual with volume 1', () => {
    expect(buildGreeting({ name: 'Ada', style: 'casual', volume: 1 })).toBe('Hey Ada!');
  });

  it('formal with volume 2', () => {
    expect(buildGreeting({ name: 'Ada', style: 'formal', volume: 2 })).toBe('Good day, Ada!!');
  });

  it('rhyming with volume 0 (no punctuation)', () => {
    expect(buildGreeting({ name: 'Ada', style: 'rhyming', volume: 0 })).toBe(
      'Hey Ada, you shine like a flame',
    );
  });
});
