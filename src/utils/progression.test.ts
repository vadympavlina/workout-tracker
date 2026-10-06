import { describe, expect, it } from 'vitest';
import type { SetEntry } from '@/types';
import { suggestProgression } from './progression';

const s = (weight: number, reps: number, done = true): SetEntry => ({ id: `${weight}-${reps}-${Math.random()}`, weight, reps, done });

describe('suggestProgression', () => {
  it('adds a step when every working set hit the top of the range', () => {
    expect(suggestProgression([s(50, 12), s(50, 12), s(50, 13)], 8, 12, 2.5)).toMatchObject({ weight: 52.5, reps: 8 });
  });
  it('keeps the weight while any working set is below the top', () => {
    expect(suggestProgression([s(50, 12), s(50, 11), s(50, 12)], 8, 12, 2.5)).toBeNull();
  });
  it('judges only the heaviest sets (warm-ups do not count)', () => {
    expect(suggestProgression([s(40, 8), s(50, 12), s(50, 12)], 8, 12, 2.5)).toMatchObject({ weight: 52.5 });
  });
  it('needs at least two working sets when there were several', () => {
    expect(suggestProgression([s(40, 12), s(40, 12), s(55, 12)], 8, 12, 2.5)).toBeNull();
  });
  it('uses the given step (dumbbells)', () => {
    expect(suggestProgression([s(12, 12), s(12, 12)], 10, 12, 1)).toMatchObject({ weight: 13, reps: 10 });
  });
  it('suggests more reps for bodyweight work', () => {
    expect(suggestProgression([s(0, 20), s(0, 21)], 15, 20, 2.5)).toMatchObject({ weight: 0, reps: 21 });
  });
  it('ignores undone sets and empty history', () => {
    expect(suggestProgression([], 8, 12, 2.5)).toBeNull();
    expect(suggestProgression([s(60, 12, false)], 8, 12, 2.5)).toBeNull();
  });
});
