import { describe, expect, it } from 'vitest';
import { warmupSets } from './warmup';

describe('warmupSets', () => {
  it('barbell: empty bar, then 40/60/80% with plates', () => {
    expect(warmupSets(100, 'barbell')).toEqual([
      { weight: 20, reps: 10, plates: [] },
      { weight: 40, reps: 8, plates: [10] },
      { weight: 60, reps: 5, plates: [20] },
      { weight: 80, reps: 3, plates: [25, 5] },
    ]);
  });
  it('rounds to loadable weights and drops duplicates for light bars', () => {
    const sets = warmupSets(40, 'barbell');
    expect(sets.map((s) => s.weight)).toEqual([20, 25, 32.5]);
    expect(sets.every((s) => s.weight < 40)).toBe(true);
  });
  it('dumbbells: two lighter sets in 2 kg steps', () => {
    expect(warmupSets(24, 'dumbbell')).toEqual([
      { weight: 12, reps: 10 },
      { weight: 18, reps: 5 },
    ]);
  });
  it('nothing for bodyweight or an unknown weight', () => {
    expect(warmupSets(0, 'barbell')).toEqual([]);
    expect(warmupSets(null, 'machine')).toEqual([]);
    expect(warmupSets(20, 'bodyweight')).toEqual([]);
  });
});
