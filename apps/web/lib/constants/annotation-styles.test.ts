import { describe, it, expect } from 'vitest';
import { getStrokePx } from './annotation-styles';

describe('getStrokePx', () => {
  it('returns 2 for thin (value 1)', () => {
    expect(getStrokePx(1)).toBe(2);
  });

  it('returns 3 for medium (value 2)', () => {
    expect(getStrokePx(2)).toBe(3);
  });

  it('returns 5 for thick (value 3)', () => {
    expect(getStrokePx(3)).toBe(5);
  });

  it('returns default 3 for undefined', () => {
    expect(getStrokePx(undefined)).toBe(3);
  });

  it('returns default 3 for unknown value', () => {
    expect(getStrokePx(99)).toBe(3);
    expect(getStrokePx(0)).toBe(3);
    expect(getStrokePx(-1)).toBe(3);
  });
});
