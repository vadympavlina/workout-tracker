import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, BodyWeightEntry, Exercise, PersonalRecord, Settings, UserProfile, WorkoutPlan, WorkoutSession } from '@/types';
import { dataService } from '@/services/dataService';
import { useToast } from '@/components/ui/Toast';
import { personalRecords, sortSessions } from '@/utils/stats';
import { uid } from '@/utils/id';

interface DataApi {
  data: AppData;
  /** Sessions sorted newest first. */
  sessions: WorkoutSession[];
  records: Map<string, PersonalRecord>;
  exerciseById: (id: string) => Exercise | undefined;

  updateUser: (patch: Partial<UserProfile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  savePlan: (plan: WorkoutPlan) => void;
  deletePlan: (id: string) => void;
  duplicatePlan: (id: string) => WorkoutPlan | null;

  saveExercise: (exercise: Exercise) => void;
  deleteExercise: (id: string) => void;

  addSession: (session: WorkoutSession) => void;
  updateSession: (session: WorkoutSession) => void;
  deleteSession: (id: string) => void;

  /** Adds a weigh-in; replaces an existing entry for the same date. */
  saveWeight: (entry: Omit<BodyWeightEntry, 'id'> & { id?: string }) => void;
  deleteWeight: (id: string) => void;

  replaceAll: (data: AppData) => Promise<void>;
  resetToDemo: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const DataContext = createContext<DataApi | null>(null);

export function DataProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const dataRef = useRef<AppData | null>(null);
  const toast = useToast();

  useEffect(() => {
    dataService.load().then((loaded) => {
      dataRef.current = loaded;
      setData(loaded);
    });
  }, []);

  /** Applies an update to one collection: state first (instant UI), then persistence. */
  const commit = useCallback(
    <K extends keyof AppData>(key: K, updater: (current: AppData[K]) => AppData[K]) => {
      const current = dataRef.current;
      if (!current) return;
      const nextValue = updater(current[key]);
      const next = { ...current, [key]: nextValue };
      dataRef.current = next;
      setData(next);
      dataService.save(key, nextValue).catch((err: Error) => toast.error('Помилка збереження', err.message));
    },
    [toast],
  );

  const replace = useCallback(async (next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const api = useMemo<DataApi | null>(() => {
    if (!data) return null;
    const exerciseMap = new Map(data.exercises.map((e) => [e.id, e]));
    const sorted = sortSessions(data.sessions);
    const now = () => new Date().toISOString();

    return {
      data,
      sessions: sorted,
      records: personalRecords(data.sessions),
      exerciseById: (id) => exerciseMap.get(id),

      updateUser: (patch) => commit('user', (u) => ({ ...u, ...patch })),
      updateSettings: (patch) => commit('settings', (s) => ({ ...s, ...patch })),

      savePlan: (plan) =>
        commit('plans', (plans) => {
          const updated = { ...plan, updatedAt: now() };
          return plans.some((p) => p.id === plan.id) ? plans.map((p) => (p.id === plan.id ? updated : p)) : [...plans, updated];
        }),
      deletePlan: (id) => commit('plans', (plans) => plans.filter((p) => p.id !== id)),
      duplicatePlan: (id) => {
        const source = dataRef.current?.plans.find((p) => p.id === id);
        if (!source) return null;
        const copy: WorkoutPlan = {
          ...source,
          id: uid(),
          name: `${source.name} (копія)`,
          days: [],
          exercises: source.exercises.map((e) => ({ ...e, id: uid() })),
          createdAt: now(),
          updatedAt: now(),
        };
        commit('plans', (plans) => [...plans, copy]);
        return copy;
      },

      saveExercise: (exercise) =>
        commit('exercises', (list) =>
          list.some((e) => e.id === exercise.id) ? list.map((e) => (e.id === exercise.id ? exercise : e)) : [...list, exercise],
        ),
      deleteExercise: (id) => {
        commit('exercises', (list) => list.filter((e) => e.id !== id));
        commit('plans', (plans) =>
          plans.map((p) =>
            p.exercises.some((e) => e.exerciseId === id) ? { ...p, exercises: p.exercises.filter((e) => e.exerciseId !== id) } : p,
          ),
        );
      },

      addSession: (session) => commit('sessions', (list) => [...list, session]),
      updateSession: (session) => commit('sessions', (list) => list.map((s) => (s.id === session.id ? session : s))),
      deleteSession: (id) => commit('sessions', (list) => list.filter((s) => s.id !== id)),

      saveWeight: (entry) =>
        commit('bodyWeight', (list) => {
          const rest = list.filter((e) => e.date !== entry.date && e.id !== entry.id);
          return [...rest, { id: entry.id ?? uid(), date: entry.date, weight: entry.weight }];
        }),
      deleteWeight: (id) => commit('bodyWeight', (list) => list.filter((e) => e.id !== id)),

      replaceAll: async (next) => {
        await dataService.replaceAll(next);
        await replace(next);
      },
      resetToDemo: async () => replace(await dataService.resetToDemo()),
      clearAll: async () => replace(await dataService.clearAll()),
    };
  }, [data, commit, replace]);

  if (!api) return <>{fallback}</>;
  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
