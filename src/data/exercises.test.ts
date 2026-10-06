import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/types';
import { DEFAULT_EXERCISES, withBuiltInExercises } from './exercises';
import { builtInPhotos, muscleTargets } from './exerciseMedia';
import { EQUIPMENT, MUSCLE_GROUPS } from './labels';

describe('built-in exercise library', () => {
  it('has unique ids and names', () => {
    expect(new Set(DEFAULT_EXERCISES.map((e) => e.id)).size).toBe(DEFAULT_EXERCISES.length);
    expect(new Set(DEFAULT_EXERCISES.map((e) => e.name)).size).toBe(DEFAULT_EXERCISES.length);
  });

  it('every exercise is complete: labels, reps, technique, muscles and two photos', () => {
    for (const e of DEFAULT_EXERCISES) {
      expect(MUSCLE_GROUPS[e.muscleGroup], e.id).toBeTruthy();
      expect(EQUIPMENT[e.equipment], e.id).toBeTruthy();
      expect(e.defaultRepsMin, e.id).toBeLessThanOrEqual(e.defaultRepsMax);
      expect(e.description.length, e.id).toBeGreaterThan(20);
      expect(muscleTargets(e).primary.length, e.id).toBeGreaterThan(0);
      const photos = builtInPhotos(e.id);
      expect(photos, e.id).toHaveLength(2);
      for (const p of photos) expect(existsSync(`public/${p}`), p).toBe(true);
    }
  });
});

describe('withBuiltInExercises', () => {
  const custom: Exercise = { ...DEFAULT_EXERCISES[0], id: 'custom-1', name: 'Моя', isCustom: true };

  it('adds built-ins an older account lacks, keeping existing records first and untouched', () => {
    const edited = { ...DEFAULT_EXERCISES[0], defaultSets: 5 };
    const merged = withBuiltInExercises([edited, custom]);
    expect(merged).toHaveLength(DEFAULT_EXERCISES.length + 1);
    expect(merged[0]).toBe(edited);
    expect(merged[1]).toBe(custom);
  });

  it('returns the same list when nothing is missing, defaults when empty', () => {
    const full = [...DEFAULT_EXERCISES, custom];
    expect(withBuiltInExercises(full)).toBe(full);
    expect(withBuiltInExercises([])).toBe(DEFAULT_EXERCISES);
    expect(withBuiltInExercises(null)).toBe(DEFAULT_EXERCISES);
  });
});
