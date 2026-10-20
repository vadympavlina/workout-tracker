import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import { DEFAULT_EXERCISES } from '@/data/exercises';
import { loadLevel, muscleLoad, recovery } from './muscleLoad';

const byId = (id: string) => DEFAULT_EXERCISES.find((e) => e.id === id);
const now = new Date('2026-10-05T12:00:00');
const session = (daysAgo: number, exerciseId: string, sets: number): WorkoutSession => {
  const at = new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  return {
    id: `${exerciseId}-${daysAgo}`, planId: null, name: 'T', icon: 'dumbbell', startedAt: at, finishedAt: at, durationSec: 3600, note: '',
    exercises: [{ id: 'e', exerciseId, name: '', note: '', sets: Array.from({ length: sets }, (_, i) => ({ id: String(i), weight: 50, reps: 10, done: true })) }],
  };
};

describe('muscleLoad', () => {
  it('counts sets for primary muscles and half for secondary within the window', () => {
    // chest press: chest primary; shoulders + triceps secondary
    const { sets } = muscleLoad([session(1, 'chest-press-machine', 4), session(10, 'chest-press-machine', 4)], byId, now);
    expect(sets.chest).toBe(4);
    expect(sets.triceps).toBe(2);
    expect(sets.quads).toBeUndefined();
  });

  it('tracks when each muscle last worked, beyond the window too', () => {
    const { lastWorked } = muscleLoad([session(10, 'leg-press', 3), session(2, 'leg-press', 3)], byId, now);
    expect(lastWorked.quads).toBe(now.getTime() - 2 * 86_400_000);
  });

  it('ignores unfinished sets', () => {
    const s = session(0, 'leg-press', 3);
    s.exercises[0].sets[2].done = false;
    expect(muscleLoad([s], byId, now).sets.quads).toBe(2);
  });

  it('maps sets to levels and time to recovery states', () => {
    expect([0, 2, 5, 9, 15].map(loadLevel)).toEqual([0, 1, 2, 3, 4]);
    const t = now.getTime();
    expect(recovery(t - 3 * 3_600_000, t)).toBe('tired');
    expect(recovery(t - 30 * 3_600_000, t)).toBe('recovering');
    expect(recovery(t - 3 * 86_400_000, t)).toBe('fresh');
    expect(recovery(undefined, t)).toBe('idle');
  });
});
