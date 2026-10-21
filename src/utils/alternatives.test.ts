import { describe, expect, it } from 'vitest';
import { DEFAULT_EXERCISES } from '@/data/exercises';
import { alternativesFor } from './alternatives';

const byId = (id: string) => DEFAULT_EXERCISES.find((e) => e.id === id)!;

describe('alternativesFor', () => {
  it('a lat pulldown is replaced by other lat exercises, not by leg work', () => {
    const alts = alternativesFor(byId('lat-pulldown'), DEFAULT_EXERCISES);
    expect(alts.length).toBeGreaterThan(3);
    expect(alts.slice(0, 5).every((a) => a.match > 0)).toBe(true);
    expect(alts.some((a) => a.exercise.muscleGroup === 'legs')).toBe(false);
    expect(alts.find((a) => a.exercise.id === 'lat-pulldown')).toBeUndefined();
  });
  it('skips exercises already in the workout', () => {
    const alts = alternativesFor(byId('barbell-curl'), DEFAULT_EXERCISES, ['biceps-curl-machine']);
    expect(alts.map((a) => a.exercise.id)).not.toContain('biceps-curl-machine');
    expect(alts[0].exercise.muscleGroup).toBe('biceps');
  });
});
