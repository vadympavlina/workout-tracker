import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActiveExercise, ActiveSet, ActiveWorkout, Exercise, PersonalRecord, PlanExercise, WorkoutPlan, WorkoutSession } from '@/types';
import { dataService } from '@/services/dataService';
import { useData } from './DataContext';
import { beatsRecord, lastPerformance } from '@/utils/stats';
import { uid } from '@/utils/id';

interface ActiveApi {
  active: ActiveWorkout | null;
  start: (plan: WorkoutPlan | null) => ActiveWorkout;
  updateSet: (exIndex: number, setIndex: number, patch: Partial<Pick<ActiveSet, 'weight' | 'reps'>>) => void;
  /** Toggles a set; returns `record` when the completed set beats the personal record. */
  toggleSet: (exIndex: number, setIndex: number) => { ok: boolean; record: boolean; reason?: string };
  addSet: (exIndex: number) => void;
  /** Removes a set and returns it so the caller can offer undo. */
  removeSet: (exIndex: number, setIndex: number) => ActiveSet | null;
  restoreSet: (exIndex: number, setIndex: number, set: ActiveSet) => void;
  setExerciseNote: (exIndex: number, note: string) => void;
  setWorkoutNote: (note: string) => void;
  finishExercise: (exIndex: number) => void;
  reopenExercise: (exIndex: number) => void;
  goTo: (exIndex: number) => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exIndex: number) => void;
  moveExercise: (exIndex: number, dir: -1 | 1) => void;
  startRest: (seconds?: number) => void;
  adjustRest: (deltaSec: number) => void;
  stopRest: () => void;
  /** Saves completed sets as a session. Returns null when nothing was completed. */
  finish: () => WorkoutSession | null;
  discard: () => void;
}

const ActiveContext = createContext<ActiveApi | null>(null);

/** Builds pre-filled sets from the last time the exercise was performed (fast logging). */
function buildExercise(exercise: Exercise, planned: PlanExercise | null, sessions: WorkoutSession[]): ActiveExercise {
  const last = lastPerformance(sessions, exercise.id);
  const lastSets = last?.exercise.sets.filter((s) => s.done) ?? [];
  const count = planned?.sets ?? (lastSets.length || exercise.defaultSets);
  const repsMax = planned?.repsMax ?? exercise.defaultRepsMax;
  const isBodyweight = exercise.equipment === 'bodyweight';

  const sets: ActiveSet[] = Array.from({ length: count }, (_, i) => {
    const prev = lastSets[i] ?? lastSets[lastSets.length - 1];
    return {
      id: uid(),
      weight: prev ? prev.weight : isBodyweight ? 0 : null,
      reps: prev ? prev.reps : repsMax,
      done: false,
      prevWeight: lastSets[i]?.weight ?? null,
      prevReps: lastSets[i]?.reps ?? null,
    };
  });

  return {
    id: uid(),
    exerciseId: exercise.id,
    name: exercise.name,
    targetRepsMin: planned?.repsMin ?? exercise.defaultRepsMin,
    targetRepsMax: repsMax,
    sets,
    note: '',
    finished: false,
  };
}

export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
  const { data, sessions, records, exerciseById, addSession } = useData();
  const [active, setActive] = useState<ActiveWorkout | null>(null);
  const [loaded, setLoaded] = useState(false);
  const activeRef = useRef<ActiveWorkout | null>(null);

  useEffect(() => {
    dataService.loadActive().then((a) => {
      activeRef.current = a;
      setActive(a);
      setLoaded(true);
    });
  }, []);

  const set = useCallback((next: ActiveWorkout | null) => {
    activeRef.current = next;
    setActive(next);
    void dataService.saveActive(next);
  }, []);

  const mutate = useCallback(
    (fn: (a: ActiveWorkout) => ActiveWorkout) => {
      const current = activeRef.current;
      if (current) set(fn(current));
    },
    [set],
  );

  const mutateExercise = useCallback(
    (exIndex: number, fn: (e: ActiveExercise) => ActiveExercise) =>
      mutate((a) => ({ ...a, exercises: a.exercises.map((e, i) => (i === exIndex ? fn(e) : e)) })),
    [mutate],
  );

  const settingsRef = useRef(data.settings);
  settingsRef.current = data.settings;
  const recordsRef = useRef<Map<string, PersonalRecord>>(records);
  recordsRef.current = records;

  const api = useMemo<ActiveApi>(() => {
    const nextUnfinished = (a: ActiveWorkout, from: number) => {
      for (let step = 1; step <= a.exercises.length; step++) {
        const i = (from + step) % a.exercises.length;
        if (!a.exercises[i].finished) return i;
      }
      return from;
    };

    return {
      active,

      start: (plan) => {
        const exercises = (plan?.exercises ?? [])
          .map((pe) => {
            const ex = exerciseById(pe.exerciseId);
            return ex ? buildExercise(ex, pe, sessions) : null;
          })
          .filter((e): e is ActiveExercise => e !== null);
        const workout: ActiveWorkout = {
          id: uid(),
          planId: plan?.id ?? null,
          name: plan?.name ?? 'Вільне тренування',
          icon: plan?.icon ?? 'dumbbell',
          startedAt: new Date().toISOString(),
          currentIndex: 0,
          exercises,
          note: '',
          restEndsAt: null,
        };
        set(workout);
        return workout;
      },

      updateSet: (exIndex, setIndex, patch) =>
        mutateExercise(exIndex, (e) => {
          const before = e.sets[setIndex];
          // A new working weight carries over to the following, not-yet-done sets
          // that still had the same weight — they were "the same plan", not custom.
          const carry = patch.weight !== undefined && before && !before.done;
          return {
            ...e,
            sets: e.sets.map((s, i) => {
              if (i === setIndex) return { ...s, ...patch };
              if (carry && i > setIndex && !s.done && s.weight === before.weight) return { ...s, weight: patch.weight ?? null };
              return s;
            }),
          };
        }),

      toggleSet: (exIndex, setIndex) => {
        const a = activeRef.current;
        const ex = a?.exercises[exIndex];
        const target = ex?.sets[setIndex];
        if (!a || !ex || !target) return { ok: false, record: false };
        if (!target.done && (target.reps == null || target.reps <= 0)) {
          return { ok: false, record: false, reason: 'Вкажи кількість повторень' };
        }

        const done = !target.done;
        const weight = target.weight ?? 0;
        const reps = target.reps ?? 0;
        let record = false;
        if (done) {
          // Compare against the stored record and anything already done in this workout,
          // so the celebration fires once per actual improvement.
          const pr = recordsRef.current.get(ex.exerciseId);
          const doneHere = ex.sets.filter((s, i) => s.done && i !== setIndex);
          const bestHere = doneHere.reduce<{ weight: number; reps: number } | undefined>((best, s) => {
            const w = s.weight ?? 0;
            const r = s.reps ?? 0;
            return !best || w > best.weight || (w === best.weight && r > best.reps) ? { weight: w, reps: r } : best;
          }, undefined);
          const baseline = pr && bestHere && beatsRecord(pr, bestHere.weight, bestHere.reps) ? bestHere : pr;
          record = beatsRecord(baseline, weight, reps);
        }

        const settings = settingsRef.current;
        const allDoneAfter = done && ex.sets.every((s, i) => (i === setIndex ? true : s.done));
        set({
          ...a,
          restEndsAt:
            done && settings.autoRestTimer && settings.restTimerSec > 0 && !allDoneAfter
              ? Date.now() + settings.restTimerSec * 1000
              : done
                ? null
                : a.restEndsAt,
          restTotalSec: done && settings.autoRestTimer ? settings.restTimerSec : a.restTotalSec,
          exercises: a.exercises.map((e, i) =>
            i === exIndex
              ? { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, done, weight: s.weight ?? 0 } : s)) }
              : e,
          ),
        });
        return { ok: true, record };
      },

      addSet: (exIndex) =>
        mutateExercise(exIndex, (e) => {
          const last = e.sets[e.sets.length - 1];
          return {
            ...e,
            finished: false,
            sets: [
              ...e.sets,
              { id: uid(), weight: last?.weight ?? null, reps: last?.reps ?? e.targetRepsMax ?? null, done: false, prevWeight: null, prevReps: null },
            ],
          };
        }),

      removeSet: (exIndex, setIndex) => {
        const removed = activeRef.current?.exercises[exIndex]?.sets[setIndex] ?? null;
        mutateExercise(exIndex, (e) => ({ ...e, sets: e.sets.filter((_, i) => i !== setIndex) }));
        return removed;
      },

      restoreSet: (exIndex, setIndex, set) =>
        mutateExercise(exIndex, (e) => {
          const sets = [...e.sets];
          sets.splice(Math.min(setIndex, sets.length), 0, set);
          return { ...e, sets };
        }),

      setExerciseNote: (exIndex, note) => mutateExercise(exIndex, (e) => ({ ...e, note })),
      setWorkoutNote: (note) => mutate((a) => ({ ...a, note })),

      finishExercise: (exIndex) =>
        mutate((a) => {
          const exercises = a.exercises.map((e, i) => (i === exIndex ? { ...e, finished: true } : e));
          const next = { ...a, exercises, restEndsAt: null };
          return { ...next, currentIndex: nextUnfinished(next, exIndex) };
        }),

      reopenExercise: (exIndex) => mutateExercise(exIndex, (e) => ({ ...e, finished: false })),

      goTo: (exIndex) => mutate((a) => ({ ...a, currentIndex: Math.max(0, Math.min(a.exercises.length - 1, exIndex)) })),

      addExercise: (exercise) =>
        mutate((a) => ({
          ...a,
          exercises: [...a.exercises, buildExercise(exercise, null, sessions)],
          currentIndex: a.exercises.length,
        })),

      removeExercise: (exIndex) =>
        mutate((a) => {
          const exercises = a.exercises.filter((_, i) => i !== exIndex);
          return { ...a, exercises, currentIndex: Math.max(0, Math.min(a.currentIndex, exercises.length - 1)) };
        }),

      moveExercise: (exIndex, dir) =>
        mutate((a) => {
          const target = exIndex + dir;
          if (target < 0 || target >= a.exercises.length) return a;
          const exercises = [...a.exercises];
          [exercises[exIndex], exercises[target]] = [exercises[target], exercises[exIndex]];
          const currentIndex = a.currentIndex === exIndex ? target : a.currentIndex === target ? exIndex : a.currentIndex;
          return { ...a, exercises, currentIndex };
        }),

      startRest: (seconds) =>
        mutate((a) => {
          const sec = seconds ?? (settingsRef.current.restTimerSec || 90);
          return { ...a, restEndsAt: Date.now() + sec * 1000, restTotalSec: sec };
        }),
      adjustRest: (delta) =>
        mutate((a) =>
          a.restEndsAt
            ? { ...a, restEndsAt: Math.max(Date.now(), a.restEndsAt + delta * 1000), restTotalSec: Math.max(1, (a.restTotalSec ?? 90) + delta) }
            : a,
        ),
      stopRest: () => mutate((a) => ({ ...a, restEndsAt: null })),

      finish: () => {
        const a = activeRef.current;
        if (!a) return null;
        const exercises = a.exercises
          .map((e) => ({
            id: e.id,
            exerciseId: e.exerciseId,
            name: e.name,
            targetRepsMin: e.targetRepsMin,
            targetRepsMax: e.targetRepsMax,
            note: e.note.trim(),
            sets: e.sets
              .filter((s) => s.done)
              .map((s) => ({ id: s.id, weight: s.weight ?? 0, reps: s.reps ?? 0, done: true })),
          }))
          .filter((e) => e.sets.length > 0);
        if (exercises.length === 0) return null;

        const finishedAt = new Date();
        const session: WorkoutSession = {
          id: a.id,
          planId: a.planId,
          name: a.name,
          icon: a.icon,
          startedAt: a.startedAt,
          finishedAt: finishedAt.toISOString(),
          durationSec: Math.round((finishedAt.getTime() - new Date(a.startedAt).getTime()) / 1000),
          exercises,
          note: a.note.trim(),
        };
        addSession(session);
        set(null);
        return session;
      },

      discard: () => set(null),
    };
  }, [active, exerciseById, sessions, set, mutate, mutateExercise, addSession]);

  if (!loaded) return null;
  return <ActiveContext.Provider value={api}>{children}</ActiveContext.Provider>;
}

export function useActiveWorkout() {
  const ctx = useContext(ActiveContext);
  if (!ctx) throw new Error('useActiveWorkout must be used inside ActiveWorkoutProvider');
  return ctx;
}
