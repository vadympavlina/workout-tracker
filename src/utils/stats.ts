import type { BodyWeightEntry, ID, PersonalRecord, SessionExercise, SetEntry, WorkoutSession } from '@/types';
import { addDays, fromISODate, startOfWeek, toISODate } from './date';
import { formatShortDate } from './format';

export const setVolume = (s: Pick<SetEntry, 'weight' | 'reps' | 'done'>) => (s.done ? s.weight * s.reps : 0);

export const exerciseVolume = (e: SessionExercise) => e.sets.reduce((sum, s) => sum + setVolume(s), 0);

export const sessionVolume = (session: WorkoutSession) =>
  session.exercises.reduce((sum, e) => sum + exerciseVolume(e), 0);

export const sessionSetCount = (session: WorkoutSession) =>
  session.exercises.reduce((sum, e) => sum + e.sets.filter((s) => s.done).length, 0);

export const sumVolume = (sessions: WorkoutSession[]) => sessions.reduce((sum, s) => sum + sessionVolume(s), 0);
export const sumDuration = (sessions: WorkoutSession[]) => sessions.reduce((sum, s) => sum + s.durationSec, 0);

/** Newest first. */
export const sortSessions = (sessions: WorkoutSession[]) =>
  [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

/** Epley estimated one-rep max. */
export const estimate1RM = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

/** Heaviest completed set; ties broken by reps. */
export function bestSet(sets: SetEntry[]): SetEntry | null {
  let best: SetEntry | null = null;
  for (const s of sets) {
    if (!s.done || s.reps <= 0) continue;
    if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) best = s;
  }
  return best;
}

export function beatsRecord(pr: Pick<PersonalRecord, 'weight' | 'reps'> | undefined, weight: number, reps: number) {
  if (!pr || reps <= 0 || weight <= 0) return false;
  return weight > pr.weight || (weight === pr.weight && reps > pr.reps);
}

/** Most recent performance of an exercise, optionally ignoring one session. */
export function lastPerformance(sessions: WorkoutSession[], exerciseId: ID, excludeSessionId?: ID) {
  let found: { session: WorkoutSession; exercise: SessionExercise } | null = null;
  for (const session of sessions) {
    if (session.id === excludeSessionId) continue;
    if (found && session.startedAt <= found.session.startedAt) continue;
    const exercise = session.exercises.find((e) => e.exerciseId === exerciseId && e.sets.some((s) => s.done));
    if (exercise) found = { session, exercise };
  }
  return found;
}

/** Performance of an exercise in the session immediately before `before`. */
export function previousPerformance(sessions: WorkoutSession[], exerciseId: ID, before: WorkoutSession) {
  return lastPerformance(
    sessions.filter((s) => s.startedAt < before.startedAt),
    exerciseId,
  );
}

export function personalRecords(sessions: WorkoutSession[]): Map<ID, PersonalRecord> {
  const records = new Map<ID, PersonalRecord>();
  const chronological = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const session of chronological) {
    for (const ex of session.exercises) {
      const best = bestSet(ex.sets);
      if (!best || best.weight <= 0) continue;
      const current = records.get(ex.exerciseId);
      if (!current || beatsRecord(current, best.weight, best.reps)) {
        records.set(ex.exerciseId, {
          exerciseId: ex.exerciseId,
          name: ex.name,
          weight: best.weight,
          reps: best.reps,
          date: session.startedAt,
          sessionId: session.id,
        });
      }
    }
  }
  return records;
}

/** Records set by `session` compared to everything performed before it. */
export function sessionRecords(allSessions: WorkoutSession[], session: WorkoutSession): PersonalRecord[] {
  const before = personalRecords(allSessions.filter((s) => s.id !== session.id && s.startedAt < session.startedAt));
  const result: PersonalRecord[] = [];
  for (const ex of session.exercises) {
    const best = bestSet(ex.sets);
    if (best && beatsRecord(before.get(ex.exerciseId), best.weight, best.reps)) {
      result.push({
        exerciseId: ex.exerciseId,
        name: ex.name,
        weight: best.weight,
        reps: best.reps,
        date: session.startedAt,
        sessionId: session.id,
      });
    }
  }
  return result;
}

export interface ExercisePoint {
  sessionId: ID;
  date: string;
  label: string;
  bestWeight: number;
  bestReps: number;
  volume: number;
  e1rm: number;
  sets: SetEntry[];
}

/** Oldest first. */
export function exerciseHistory(sessions: WorkoutSession[], exerciseId: ID): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const session of sessions) {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const best = bestSet(ex.sets);
    if (!best) continue;
    const doneSets = ex.sets.filter((s) => s.done);
    points.push({
      sessionId: session.id,
      date: session.startedAt,
      label: formatShortDate(session.startedAt),
      bestWeight: best.weight,
      bestReps: best.reps,
      volume: exerciseVolume(ex),
      e1rm: Math.max(...doneSets.map((s) => estimate1RM(s.weight, s.reps))),
      sets: doneSets,
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export function sessionsBetween(sessions: WorkoutSession[], from: Date, to: Date = new Date()) {
  const f = from.toISOString();
  const t = to.toISOString();
  return sessions.filter((s) => s.startedAt >= f && s.startedAt < t);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export interface WeekBucket {
  key: string;
  label: string;
  start: Date;
  volume: number;
  count: number;
  durationSec: number;
}

/** Buckets the last `weeks` weeks (including the current one), oldest first. */
export function weeklyBuckets(sessions: WorkoutSession[], weeks: number, now = new Date()): WeekBucket[] {
  const currentWeek = startOfWeek(now);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(currentWeek, -7 * i);
    buckets.push({ key: toISODate(start), label: formatShortDate(start), start, volume: 0, count: 0, durationSec: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const s of sessions) {
    const bucket = byKey.get(toISODate(startOfWeek(s.startedAt)));
    if (!bucket) continue;
    bucket.volume += sessionVolume(s);
    bucket.count += 1;
    bucket.durationSec += s.durationSec;
  }
  return buckets;
}

export interface ExerciseProgress {
  exerciseId: ID;
  name: string;
  from: number;
  to: number;
  delta: number;
  sessions: number;
}

/** Change of the top working weight per exercise between the first and last session in the list. */
export function exerciseProgress(sessions: WorkoutSession[]): ExerciseProgress[] {
  const chronological = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const map = new Map<ID, ExerciseProgress>();
  for (const session of chronological) {
    for (const ex of session.exercises) {
      const best = bestSet(ex.sets);
      if (!best) continue;
      const entry = map.get(ex.exerciseId);
      if (!entry) {
        map.set(ex.exerciseId, { exerciseId: ex.exerciseId, name: ex.name, from: best.weight, to: best.weight, delta: 0, sessions: 1 });
      } else {
        entry.to = best.weight;
        entry.delta = entry.to - entry.from;
        entry.sessions += 1;
        entry.name = ex.name;
      }
    }
  }
  return [...map.values()].filter((p) => p.sessions >= 2).sort((a, b) => b.delta - a.delta);
}

/** Newest first. */
export const sortWeights = (entries: BodyWeightEntry[]) => [...entries].sort((a, b) => b.date.localeCompare(a.date));

export function latestWeight(entries: BodyWeightEntry[]): BodyWeightEntry | null {
  return sortWeights(entries)[0] ?? null;
}

/** Weight change since the closest entry on/before `from` (or the first entry after it). */
export function weightChangeSince(entries: BodyWeightEntry[], from: Date): number | null {
  if (entries.length < 2) return null;
  const asc = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const fromIso = toISODate(from);
  let base = asc[0];
  for (const e of asc) {
    if (e.date <= fromIso) base = e;
    else break;
  }
  const latest = asc[asc.length - 1];
  if (base.id === latest.id) return null;
  return Math.round((latest.weight - base.weight) * 10) / 10;
}

export function weightSeries(entries: BodyWeightEntry[], from?: Date) {
  const fromIso = from ? toISODate(from) : '';
  return [...entries]
    .filter((e) => e.date >= fromIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, label: formatShortDate(fromISODate(e.date)), weight: e.weight }));
}
