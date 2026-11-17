import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import { DEFAULT_EXERCISES } from '@/data/exercises';
import { buildShareCard } from './shareImage';

const byId = (id: string) => DEFAULT_EXERCISES.find((e) => e.id === id);

const session: WorkoutSession = {
  id: 's1', planId: null, name: 'Груди', icon: 'dumbbell',
  startedAt: '2026-11-16T18:26:00', finishedAt: '2026-11-16T19:39:00', durationSec: 4380, note: '',
  exercises: [
    { id: 'e1', exerciseId: 'bench-press', name: 'Жим штанги лежачи', note: '', sets: [
      { id: 'a', weight: 90, reps: 10, done: true }, { id: 'b', weight: 100, reps: 8, done: true }, { id: 'c', weight: 100, reps: 0, done: false } ] },
    { id: 'e2', exerciseId: 'dips', name: 'Віджимання на брусах', note: '', sets: [{ id: 'd', weight: 0, reps: 12, done: true }, { id: 'e', weight: 0, reps: 14, done: true }] },
    { id: 'e3', exerciseId: 'pec-deck', name: 'Розводка', note: '', sets: [{ id: 'f', weight: 40, reps: 10, done: false }] },
  ],
};

describe('buildShareCard', () => {
  const card = buildShareCard(session, byId, { accent: 'pink', bodyType: 'female' });

  it('keeps only exercises with completed sets, each with its best set', () => {
    expect(card.exercises).toEqual([
      { name: 'Жим штанги лежачи', sets: 2, best: { weight: 100, reps: 8 } },
      { name: 'Віджимання на брусах', sets: 2, best: { weight: 0, reps: 14 } },
    ]);
    expect(card.sets).toBe(4);
    expect(card.volumeKg).toBe(1700);
  });

  it('uses the chosen accent and body type', () => {
    expect(card.accent).toBe('255 122 174');
    expect(card.sex).toBe('female');
  });

  it('lights the chest for a bench press', () => {
    expect(card.load.chest).toBeGreaterThanOrEqual(2);
    expect(card.load.quadriceps).toBeUndefined();
  });
});
