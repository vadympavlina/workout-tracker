import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import { sessionToText } from './sessionText';

const session: WorkoutSession = {
  id: 's1', planId: null, name: 'Ноги + Прес', icon: 'footprints',
  startedAt: '2026-10-01T18:26:00', finishedAt: '2026-10-01T19:48:27', durationSec: 4947, note: 'Коліно ок',
  exercises: [
    { id: 'e1', exerciseId: 'leg-press', name: 'Жим ногами', note: '', sets: [
      { id: 'a', weight: 107.5, reps: 11, done: true }, { id: 'b', weight: 120, reps: 12, done: true }, { id: 'c', weight: 120, reps: 0, done: false } ] },
    { id: 'e2', exerciseId: 'hanging-leg-raise', name: 'Підйом ніг у висі', note: 'Без розгойдування', sets: [{ id: 'd', weight: 0, reps: 15, done: true }] },
    { id: 'e3', exerciseId: 'leg-curl', name: 'Згинання ніг', note: '', sets: [{ id: 'e', weight: 40, reps: 10, done: false }] },
  ],
};

describe('sessionToText', () => {
  const text = sessionToText(session);
  const lines = text.split('\n');

  it('starts with name, date and a one-line summary', () => {
    expect(lines[0]).toBe('Ноги + Прес');
    expect(lines[1]).toMatch(/^Четвер, 1 жовтня.* · 18:26$/);
    expect(lines[2]).toMatch(/^Тривалість 1:22:27 · 2 вправи · 3 підходи · .*кг$/);
  });

  it('lists each exercise with its set count and every completed set', () => {
    expect(text).toContain('Жим ногами — 2 підходи\n1. 107,5 кг × 11\n2. 120 кг × 12');
    expect(text).toContain('Підйом ніг у висі — 1 підхід\n1. 15 повт.\nНотатка: Без розгойдування');
  });

  it('skips unfinished sets and exercises without completed sets, adds the workout note', () => {
    expect(text).not.toContain('Згинання ніг');
    expect(lines[lines.length - 1]).toBe('Нотатка: Коліно ок');
  });
});
