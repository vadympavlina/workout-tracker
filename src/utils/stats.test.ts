import { describe, expect, it } from 'vitest';
import type { BodyWeightEntry, SetEntry, WorkoutSession } from '@/types';
import {
  beatsRecord, bestSet, exerciseProgress, personalRecords, sessionRecords, sessionSetCount, sessionVolume, weeklyBuckets, weightChangeSince,
} from './stats';

const set = (weight: number, reps: number, done = true): SetEntry => ({ id: `${weight}x${reps}`, weight, reps, done });

const session = (id: string, day: string, exercises: [string, SetEntry[]][]): WorkoutSession => ({
  id,
  planId: null,
  name: id,
  icon: 'dumbbell',
  startedAt: `${day}T18:00:00.000Z`,
  finishedAt: `${day}T19:00:00.000Z`,
  durationSec: 3600,
  note: '',
  exercises: exercises.map(([exerciseId, sets]) => ({ id: `${id}-${exerciseId}`, exerciseId, name: exerciseId, note: '', sets })),
});

describe('bestSet / beatsRecord', () => {
  it('picks the heaviest done set, ties broken by reps', () => {
    expect(bestSet([set(50, 10), set(55, 6), set(55, 8), set(60, 5, false)])).toMatchObject({ weight: 55, reps: 8 });
  });
  it('ignores undone and zero-rep sets', () => {
    expect(bestSet([set(80, 0), set(90, 5, false)])).toBeNull();
  });
  it('needs more weight, or equal weight with more reps', () => {
    const pr = { weight: 60, reps: 8 };
    expect(beatsRecord(pr, 62.5, 1)).toBe(true);
    expect(beatsRecord(pr, 60, 9)).toBe(true);
    expect(beatsRecord(pr, 60, 8)).toBe(false);
    expect(beatsRecord(undefined, 100, 10)).toBe(false); // first time is not a "record"
    expect(beatsRecord(pr, 0, 30)).toBe(false); // bodyweight
  });
});

describe('volume', () => {
  it('counts only completed sets', () => {
    const s = session('a', '2026-09-01', [['bench', [set(50, 10), set(60, 5), set(70, 5, false)]]]);
    expect(sessionVolume(s)).toBe(800);
    expect(sessionSetCount(s)).toBe(2);
  });
});

describe('records', () => {
  const s1 = session('s1', '2026-09-01', [['bench', [set(50, 10)]], ['row', [set(40, 12)]]]);
  const s2 = session('s2', '2026-09-08', [['bench', [set(55, 8)]], ['row', [set(40, 10)]]]);

  it('tracks the best set and when it happened', () => {
    const prs = personalRecords([s2, s1]);
    expect(prs.get('bench')).toMatchObject({ weight: 55, reps: 8, sessionId: 's2' });
    expect(prs.get('row')).toMatchObject({ weight: 40, reps: 12, sessionId: 's1' });
  });

  it('reports records set by a session against earlier ones only', () => {
    expect(sessionRecords([s1, s2], s2).map((r) => r.exerciseId)).toEqual(['bench']);
    expect(sessionRecords([s1, s2], s1)).toEqual([]);
  });

  it('measures top-weight progress between first and last session', () => {
    expect(exerciseProgress([s2, s1])).toEqual([expect.objectContaining({ exerciseId: 'bench', from: 50, to: 55, delta: 5 }), expect.objectContaining({ exerciseId: 'row', delta: 0 })]);
  });
});

describe('weeklyBuckets', () => {
  it('groups by Monday-based weeks, oldest first', () => {
    const now = new Date('2026-10-07T12:00:00'); // Wednesday
    const buckets = weeklyBuckets([session('a', '2026-10-05', [['x', [set(10, 10)]]]), session('b', '2026-09-30', [['x', [set(10, 5)]]])], 2, now);
    expect(buckets.map((b) => b.key)).toEqual(['2026-09-28', '2026-10-05']);
    expect(buckets.map((b) => [b.count, b.volume])).toEqual([[1, 50], [1, 100]]);
  });
});

describe('weightChangeSince', () => {
  const w = (date: string, weight: number): BodyWeightEntry => ({ id: date, date, weight });
  it('compares the latest entry with the closest one on/before the date', () => {
    const entries = [w('2026-09-01', 77), w('2026-09-10', 77.6), w('2026-10-01', 79.04)];
    expect(weightChangeSince(entries, new Date('2026-09-15'))).toBe(1.4);
  });
  it('returns null without at least two entries', () => {
    expect(weightChangeSince([w('2026-09-01', 77)], new Date('2026-08-01'))).toBeNull();
  });
});
