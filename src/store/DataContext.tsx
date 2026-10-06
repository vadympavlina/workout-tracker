import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, BodyWeightEntry, Exercise, PersonalRecord, Settings, UserProfile, WorkoutPlan, WorkoutSession } from '@/types';
import { dataService, type Meta } from '@/services/dataService';
import { mediaStore } from '@/services/mediaStore';
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

  /** Backup bookkeeping (last export, reminder snooze) and storage protection status. */
  backup: { lastAt: string | null; snoozedUntil: string | null; persisted: boolean | null };
  markBackup: () => void;
  snoozeBackupReminder: (days: number) => void;

  replaceAll: (data: AppData) => Promise<void>;
  resetToDemo: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const DataContext = createContext<DataApi | null>(null);

interface ProviderProps {
  children: ReactNode;
  fallback: ReactNode;
  /** Rendered on the very first launch; call `finish` with the initial data set. */
  onboarding: (finish: (data: AppData) => Promise<void>) => ReactNode;
}

export function DataProvider({ children, fallback, onboarding }: ProviderProps) {
  const [data, setData] = useState<AppData | null>(null);
  const [firstRun, setFirstRun] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const dataRef = useRef<AppData | null>(null);
  const toast = useToast();

  useEffect(() => {
    dataService.load().then((loaded) => {
      if (!loaded) {
        setFirstRun(true);
        return;
      }
      dataRef.current = loaded;
      setData(loaded);
    });
  }, []);

  // Pick up changes made on other devices: on open and whenever the app comes
  // back to the foreground. Skipped while local edits are still uploading.
  useEffect(() => {
    let alive = true;
    const pull = () => {
      if (document.visibilityState !== 'visible' || !dataRef.current) return;
      void dataService.refresh().then((remote) => {
        if (alive && remote && dataRef.current) {
          dataRef.current = remote;
          setData(remote);
        }
      });
    };
    pull();
    document.addEventListener('visibilitychange', pull);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', pull);
    };
  }, [data !== null]);

  // Once real data exists: load backup bookkeeping and ask the browser not to
  // evict our storage under pressure (granted silently for installed PWAs).
  useEffect(() => {
    if (!data) return;
    void dataService.loadMeta().then(setMeta);
    const storage = navigator.storage;
    if (!storage?.persisted) return;
    void storage
      .persisted()
      .then((already) => (already || !storage.persist ? already : storage.persist()))
      .then(setPersisted)
      .catch(() => setPersisted(null));
  }, [data !== null]);

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
        mediaStore.remove(id).catch(() => {});
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

      backup: { lastAt: meta?.lastBackupAt ?? null, snoozedUntil: meta?.backupSnoozedUntil ?? null, persisted },
      markBackup: () => void dataService.updateMeta({ lastBackupAt: new Date().toISOString() }).then(setMeta),
      snoozeBackupReminder: (days) =>
        void dataService.updateMeta({ backupSnoozedUntil: new Date(Date.now() + days * 86_400_000).toISOString() }).then(setMeta),

      replaceAll: async (next) => {
        await dataService.replaceAll(next);
        await replace(next);
      },
      resetToDemo: async () => replace(await dataService.resetToDemo()),
      clearAll: async () => {
        await dataService.clearAll();
        dataRef.current = null;
        setData(null);
        setFirstRun(true);
      },
    };
  }, [data, commit, replace, meta, persisted]);

  if (firstRun && !api)
    return (
      <>
        {onboarding(async (initial) => {
          await dataService.replaceAll(initial);
          dataRef.current = initial;
          setData(initial);
          setFirstRun(false);
        })}
      </>
    );
  if (!api) return <>{fallback}</>;
  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
