import { describe, expect, it } from 'vitest';
import { formatClock, formatPercent, formatSigned, parseDecimal, plural, pluralWorkouts, repsRange } from './format';
import { startOfWeek, toISODate, weekdayOf } from './date';

describe('Ukrainian plurals', () => {
  it.each([
    [1, 'тренування'], [2, 'тренування'], [5, 'тренувань'], [11, 'тренувань'], [12, 'тренувань'], [21, 'тренування'], [24, 'тренування'], [25, 'тренувань'], [111, 'тренувань'],
  ])('%i → %s', (n, word) => {
    expect(pluralWorkouts(n)).toBe(`${n} ${word}`);
  });
  it('handles all three forms', () => {
    expect([1, 3, 7].map((n) => plural(n, ['день', 'дні', 'днів']))).toEqual(['день', 'дні', 'днів']);
  });
});

describe('numbers', () => {
  it('parses both comma and dot decimals', () => {
    expect(parseDecimal('52,5')).toBe(52.5);
    expect(parseDecimal(' 60.25 ')).toBe(60.25);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });
  it('formats clocks, signs and ranges', () => {
    expect(formatClock(4532)).toBe('1:15:32');
    expect(formatClock(932)).toBe('15:32');
    expect(formatClock(-5)).toBe('0:00');
    expect(formatPercent(12.4)).toBe('+12%');
    expect(formatPercent(-3)).toBe('−3%');
    expect(formatSigned(2.5, 'кг')).toBe('+2,5 кг');
    expect(repsRange(8, 12)).toBe('8–12');
    expect(repsRange(10, 10)).toBe('10');
  });
});

describe('dates', () => {
  it('uses Monday as the first weekday', () => {
    expect(weekdayOf(new Date(2026, 9, 5))).toBe(0); // Monday
    expect(weekdayOf(new Date(2026, 9, 11))).toBe(6); // Sunday
    expect(toISODate(startOfWeek(new Date(2026, 9, 11, 23, 30)))).toBe('2026-10-05');
  });
  it('keeps late-evening local times on the same calendar day', () => {
    expect(toISODate(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
  });
});
