import type {
  ActiveExercise, ActiveSet, ActiveWorkout, AppData, BodyWeightEntry, Exercise, SessionExercise, SetEntry, UserProfile, WorkoutPlan, WorkoutSession,
} from '@/types';
import { DEFAULT_SETTINGS, emptyUser } from '@/data/demo';
import { DEFAULT_EXERCISES } from '@/data/exercises';
import { ACCENTS } from '@/data/labels';

/**
 * Conversion between the app's data and its Realtime Database representation.
 *
 * RTDB quirks handled here:
 *  - collections are stored as `{ [id]: item }` so single records can be updated;
 *  - `undefined` is rejected on write, so values are JSON-round-tripped;
 *  - empty arrays, empty objects and `null` are not stored, and arrays may come
 *    back as objects — everything is normalised on read with sane defaults.
 */

export type CollectionKey = 'plans' | 'exercises' | 'sessions' | 'bodyWeight';
export const COLLECTIONS: CollectionKey[] = ['plans', 'exercises', 'sessions', 'bodyWeight'];

type Json = Record<string, unknown>;

/** Drops `undefined` (RTDB rejects it) and other non-JSON values. */
export const toJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
/** RTDB may return arrays as `{0: …, 1: …}`; missing → []. */
export const arr = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? v : isObj(v) ? Object.values(v) : []).filter((x) => x != null) as T[];
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const byId = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((item) => [item.id, toJson(item)]));

export interface RemoteData {
  user: Json;
  settings: Json;
  plans?: Json;
  exercises?: Json;
  sessions?: Json;
  bodyWeight?: Json;
}

export function toRemote(data: AppData): RemoteData {
  return {
    user: toJson(data.user) as unknown as Json,
    settings: toJson(data.settings) as unknown as Json,
    plans: byId(data.plans),
    exercises: byId(data.exercises),
    sessions: byId(data.sessions),
    bodyWeight: byId(data.bodyWeight),
  };
}

const set = (raw: unknown): SetEntry => {
  const s = isObj(raw) ? raw : {};
  return { id: str(s.id), weight: num(s.weight), reps: num(s.reps), done: s.done !== false };
};

const sessionExercise = (raw: unknown): SessionExercise => {
  const e = isObj(raw) ? raw : {};
  return {
    id: str(e.id),
    exerciseId: str(e.exerciseId),
    name: str(e.name),
    note: str(e.note),
    sets: arr(e.sets).map(set),
    ...(typeof e.targetRepsMin === 'number' ? { targetRepsMin: e.targetRepsMin } : {}),
    ...(typeof e.targetRepsMax === 'number' ? { targetRepsMax: e.targetRepsMax } : {}),
  };
};

export const plan = (raw: unknown): WorkoutPlan => {
  const p = isObj(raw) ? raw : {};
  return {
    ...(p as unknown as WorkoutPlan),
    name: str(p.name),
    notes: str(p.notes),
    days: arr<number>(p.days) as WorkoutPlan['days'],
    estimatedMinutes: num(p.estimatedMinutes, 60),
    exercises: arr<Json>(p.exercises).map((e) => ({ ...(e as unknown as WorkoutPlan['exercises'][number]) })),
  };
};

export const session = (raw: unknown): WorkoutSession => {
  const s = isObj(raw) ? raw : {};
  return {
    ...(s as unknown as WorkoutSession),
    planId: typeof s.planId === 'string' ? s.planId : null,
    note: str(s.note),
    durationSec: num(s.durationSec),
    exercises: arr(s.exercises).map(sessionExercise),
  };
};

const exercise = (raw: unknown): Exercise => {
  const e = isObj(raw) ? raw : {};
  return { ...(e as unknown as Exercise), description: str(e.description), isCustom: e.isCustom === true };
};

const weight = (raw: unknown): BodyWeightEntry => {
  const w = isObj(raw) ? raw : {};
  return { id: str(w.id), date: str(w.date), weight: num(w.weight) };
};

export function user(raw: unknown): UserProfile {
  const u = isObj(raw) ? raw : {};
  return {
    ...emptyUser(),
    ...(u as Partial<UserProfile>),
    avatar: typeof u.avatar === 'string' ? u.avatar : null,
    heightCm: numOrNull(u.heightCm),
    birthYear: numOrNull(u.birthYear),
    targetWeightKg: numOrNull(u.targetWeightKg),
  };
}

export function settings(raw: unknown): AppData['settings'] {
  const merged = { ...DEFAULT_SETTINGS, ...(isObj(raw) ? (raw as Partial<AppData['settings']>) : {}) };
  if (!(merged.accent in ACCENTS)) merged.accent = DEFAULT_SETTINGS.accent;
  return merged;
}

/** Remote tree → app data, or null when the account has no data yet. */
export function fromRemote(raw: unknown): AppData | null {
  if (!isObj(raw) || !isObj(raw.user)) return null;
  const exercises = arr(raw.exercises).map(exercise);
  return {
    user: user(raw.user),
    settings: settings(raw.settings),
    plans: arr(raw.plans).map(plan),
    exercises: exercises.length ? exercises : DEFAULT_EXERCISES,
    sessions: arr(raw.sessions).map(session),
    bodyWeight: arr(raw.bodyWeight).map(weight),
  };
}

const activeSet = (raw: unknown): ActiveSet => {
  const s = isObj(raw) ? raw : {};
  return {
    id: str(s.id),
    weight: numOrNull(s.weight),
    reps: numOrNull(s.reps),
    done: s.done === true,
    prevWeight: numOrNull(s.prevWeight),
    prevReps: numOrNull(s.prevReps),
  };
};

export function activeFromRemote(raw: unknown): ActiveWorkout | null {
  if (!isObj(raw) || typeof raw.id !== 'string') return null;
  return {
    ...(raw as unknown as ActiveWorkout),
    planId: typeof raw.planId === 'string' ? raw.planId : null,
    note: str(raw.note),
    currentIndex: num(raw.currentIndex),
    restEndsAt: numOrNull(raw.restEndsAt),
    exercises: arr<Json>(raw.exercises).map(
      (e): ActiveExercise => ({ ...sessionExercise(e), sets: arr(e.sets).map(activeSet), finished: e.finished === true, ...(typeof e.restSec === 'number' ? { restSec: e.restSec } : {}) }),
    ),
  };
}

/**
 * Multi-path update (relative to `users/{uid}/data`) turning `prev` into `next`
 * for one collection: changed/new records are written, removed ones set to null.
 */
export function collectionPatch<T extends { id: string }>(key: CollectionKey, prev: T[] | null, next: T[]): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const before = new Map((prev ?? []).map((item) => [item.id, JSON.stringify(toJson(item))]));
  for (const item of next) {
    const json = toJson(item);
    if (before.get(item.id) !== JSON.stringify(json)) patch[`${key}/${item.id}`] = json;
    before.delete(item.id);
  }
  for (const id of before.keys()) patch[`${key}/${id}`] = null;
  return patch;
}
