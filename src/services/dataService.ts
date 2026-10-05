import type { ActiveWorkout, AppData, ExportFile } from '@/types';
import { createDemoData, DEFAULT_SETTINGS, emptyData, emptyUser } from '@/data/demo';
import { DEFAULT_EXERCISES } from '@/data/exercises';
import { ACCENTS } from '@/data/labels';
import { localStorageAdapter, STORAGE_KEYS, type StorageAdapter } from './storage';

/**
 * Domain-level data access. UI code talks to this service (via the data store),
 * never to the storage adapter. To move to Firebase, implement `StorageAdapter`
 * (or replace this service with Firestore calls) — components stay untouched.
 */

export const SCHEMA_VERSION = 1;

/** Fills defaults and drops values from older versions (e.g. a removed accent colour). */
function normalizeSettings(raw: Partial<AppData['settings']> | null | undefined): AppData['settings'] {
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  if (!(merged.accent in ACCENTS)) merged.accent = DEFAULT_SETTINGS.accent;
  return merged;
}

interface Meta {
  schemaVersion: number;
  initializedAt: string;
}

type CollectionKey = Exclude<keyof AppData, never>;

const KEY_FOR: Record<CollectionKey, (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]> = {
  user: STORAGE_KEYS.user,
  plans: STORAGE_KEYS.plans,
  exercises: STORAGE_KEYS.exercises,
  sessions: STORAGE_KEYS.sessions,
  bodyWeight: STORAGE_KEYS.bodyWeight,
  settings: STORAGE_KEYS.settings,
};

export function createDataService(adapter: StorageAdapter) {
  async function writeAll(data: AppData) {
    await Promise.all((Object.keys(KEY_FOR) as CollectionKey[]).map((k) => adapter.write(KEY_FOR[k], data[k])));
  }

  return {
    /** Loads everything; seeds demo data on the very first launch. */
    async load(): Promise<AppData> {
      const meta = await adapter.read<Meta>(STORAGE_KEYS.meta);
      if (!meta) {
        const demo = createDemoData();
        await writeAll(demo);
        await adapter.write<Meta>(STORAGE_KEYS.meta, { schemaVersion: SCHEMA_VERSION, initializedAt: new Date().toISOString() });
        return demo;
      }
      const [user, plans, exercises, sessions, bodyWeight, settings] = await Promise.all([
        adapter.read<AppData['user']>(STORAGE_KEYS.user),
        adapter.read<AppData['plans']>(STORAGE_KEYS.plans),
        adapter.read<AppData['exercises']>(STORAGE_KEYS.exercises),
        adapter.read<AppData['sessions']>(STORAGE_KEYS.sessions),
        adapter.read<AppData['bodyWeight']>(STORAGE_KEYS.bodyWeight),
        adapter.read<AppData['settings']>(STORAGE_KEYS.settings),
      ]);
      return {
        user: { ...emptyUser(), ...user },
        plans: plans ?? [],
        exercises: exercises?.length ? exercises : DEFAULT_EXERCISES,
        sessions: sessions ?? [],
        bodyWeight: bodyWeight ?? [],
        settings: normalizeSettings(settings),
      };
    },

    save<K extends CollectionKey>(key: K, value: AppData[K]): Promise<void> {
      return adapter.write(KEY_FOR[key], value);
    },

    replaceAll: writeAll,

    async loadActive(): Promise<ActiveWorkout | null> {
      return adapter.read<ActiveWorkout>(STORAGE_KEYS.active);
    },
    async saveActive(active: ActiveWorkout | null) {
      if (active) await adapter.write(STORAGE_KEYS.active, active);
      else await adapter.remove(STORAGE_KEYS.active);
    },

    async resetToDemo(): Promise<AppData> {
      const demo = createDemoData();
      await writeAll(demo);
      await adapter.remove(STORAGE_KEYS.active);
      return demo;
    },

    async clearAll(): Promise<AppData> {
      const data = emptyData();
      await writeAll(data);
      await adapter.remove(STORAGE_KEYS.active);
      return data;
    },

    toExportFile(data: AppData): ExportFile {
      return { app: 'pulse-workout-tracker', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), ...data };
    },
  };
}

export type DataService = ReturnType<typeof createDataService>;

export const dataService = createDataService(localStorageAdapter);

// ---- Import validation ------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isArr = Array.isArray;

/** Validates a parsed JSON export and returns normalized data, or throws a readable error. */
export function parseImport(raw: unknown): AppData {
  if (!isObj(raw)) throw new Error('Файл не містить даних застосунку.');
  if (raw.app !== 'pulse-workout-tracker') throw new Error('Це не файл експорту Pulse.');
  if (typeof raw.schemaVersion !== 'number' || raw.schemaVersion > SCHEMA_VERSION)
    throw new Error('Файл створено новішою версією застосунку.');

  const { user, plans, exercises, sessions, bodyWeight, settings } = raw;
  if (!isObj(user) || !isArr(plans) || !isArr(exercises) || !isArr(sessions) || !isArr(bodyWeight))
    throw new Error('Файл пошкоджений: відсутні обовʼязкові розділи.');

  const allHaveIds = [plans, exercises, sessions, bodyWeight].every((list) =>
    (list as unknown[]).every((item) => isObj(item) && typeof item.id === 'string'),
  );
  if (!allHaveIds) throw new Error('Файл пошкоджений: некоректні записи.');

  const sessionsValid = (sessions as unknown[]).every(
    (s) => isObj(s) && typeof s.startedAt === 'string' && isArr(s.exercises),
  );
  if (!sessionsValid) throw new Error('Файл пошкоджений: некоректна історія тренувань.');

  return {
    user: { ...emptyUser(), ...(user as Partial<AppData['user']>) },
    plans: plans as AppData['plans'],
    exercises: (exercises as AppData['exercises']).length ? (exercises as AppData['exercises']) : DEFAULT_EXERCISES,
    sessions: sessions as AppData['sessions'],
    bodyWeight: bodyWeight as AppData['bodyWeight'],
    settings: normalizeSettings(isObj(settings) ? (settings as Partial<AppData['settings']>) : null),
  };
}
