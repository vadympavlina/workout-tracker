import type { ActiveWorkout, AppData, ExportFile } from '@/types';
import { createDemoData, DEFAULT_SETTINGS, emptyUser } from '@/data/demo';
import { DEFAULT_EXERCISES } from '@/data/exercises';
import { ACCENTS } from '@/data/labels';
import { createLocalAdapter, legacyLocalAdapter, STORAGE_KEYS, type StorageAdapter } from './storage';
import { dataUrlToBlob, mediaStore } from './mediaStore';
import { session } from './session';
import { COLLECTIONS } from './remoteModel';

/**
 * Domain-level data access. UI code talks to this service (via the data store),
 * never to storage directly.
 *
 * Local-first: every change lands in the per-account localStorage cache
 * immediately (so the app works offline in the gym) and is then mirrored to
 * Firebase Realtime Database by the session's cloud client.
 */

export const SCHEMA_VERSION = 1;

/** Fills defaults and drops values from older versions (e.g. a removed accent colour). */
function normalizeSettings(raw: Partial<AppData['settings']> | null | undefined): AppData['settings'] {
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  if (!(merged.accent in ACCENTS)) merged.accent = DEFAULT_SETTINGS.accent;
  return merged;
}

export interface Meta {
  schemaVersion: number;
  initializedAt: string;
  /** Last successful JSON export. */
  lastBackupAt?: string;
  /** Backup reminder hidden until this moment. */
  backupSnoozedUntil?: string;
}

type CollectionKey = keyof AppData;

const KEY_FOR: Record<CollectionKey, (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]> = {
  user: STORAGE_KEYS.user,
  plans: STORAGE_KEYS.plans,
  exercises: STORAGE_KEYS.exercises,
  sessions: STORAGE_KEYS.sessions,
  bodyWeight: STORAGE_KEYS.bodyWeight,
  settings: STORAGE_KEYS.settings,
};

/** Outcome of reconciling the local cache with the cloud at sign-in. */
export type StartResult = 'ready' | 'empty' | 'offline';

async function loadFrom(adapter: StorageAdapter): Promise<AppData | null> {
  const meta = await adapter.read<Meta>(STORAGE_KEYS.meta);
  if (!meta) return null;
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
}

export function createDataService(adapter: StorageAdapter) {
  /** Writes the full data set to the local cache only. */
  async function writeLocal(data: AppData) {
    await Promise.all((Object.keys(KEY_FOR) as CollectionKey[]).map((k) => adapter.write(KEY_FOR[k], data[k])));
    // Any full write means the app has been set up for this account on this device.
    if (!(await adapter.read<Meta>(STORAGE_KEYS.meta)))
      await adapter.write<Meta>(STORAGE_KEYS.meta, { schemaVersion: SCHEMA_VERSION, initializedAt: new Date().toISOString() });
  }

  /** Local cache + whole-account upload. */
  async function writeAll(data: AppData) {
    await writeLocal(data);
    void session.cloud()?.pushAll(data, await adapter.read<ActiveWorkout>(STORAGE_KEYS.active));
  }

  async function writeActiveLocal(active: ActiveWorkout | null) {
    if (active) await adapter.write(STORAGE_KEYS.active, active);
    else await adapter.remove(STORAGE_KEYS.active);
  }

  const service = {
    /** Local cache for the current account, or null if nothing is stored yet. */
    load: () => loadFrom(adapter),

    /**
     * Reconciles local cache and cloud after sign-in:
     *  - with a local cache the app opens instantly; unsynced offline changes
     *    are pushed up, and the provider pulls a fresh copy via `refresh()`;
     *  - on a new device the cloud copy is downloaded first;
     *  - 'empty' = a brand-new account, 'offline' = no cache and no network.
     */
    async start(): Promise<StartResult> {
      const cloud = session.cloud();
      const local = await loadFrom(adapter);
      if (local) {
        if (cloud?.isDirty()) void cloud.pushAll(local, await adapter.read<ActiveWorkout>(STORAGE_KEYS.active));
        return 'ready';
      }
      if (!cloud) return 'empty';
      try {
        const remote = await cloud.pull();
        if (!remote) return 'empty';
        await writeLocal(remote);
        await writeActiveLocal(await cloud.pullActive().catch(() => null));
        return 'ready';
      } catch {
        return 'offline';
      }
    },

    /** Fresh cloud copy when it is safe to take (no unsynced local edits); null otherwise. */
    async refresh(): Promise<AppData | null> {
      const cloud = session.cloud();
      const safe = () => cloud && !cloud.isDirty() && !cloud.hasPending();
      if (!safe()) return null;
      try {
        const remote = await cloud!.pull(8000);
        // An edit made while the request was in flight wins over the older copy.
        if (!remote || !safe()) return null;
        await writeLocal(remote);
        return remote;
      } catch {
        return null;
      }
    },

    async save<K extends CollectionKey>(key: K, value: AppData[K]): Promise<void> {
      const prev = await adapter.read<AppData[K]>(KEY_FOR[key]);
      await adapter.write(KEY_FOR[key], value);
      const cloud = session.cloud();
      if (!cloud) return;
      if (key === 'user' || key === 'settings') void cloud.writeDoc(key, value);
      else if ((COLLECTIONS as string[]).includes(key))
        void cloud.writeCollection(key as (typeof COLLECTIONS)[number], prev as { id: string }[] | null, value as { id: string }[]);
    },

    replaceAll: writeAll,

    async loadMeta(): Promise<Meta | null> {
      return adapter.read<Meta>(STORAGE_KEYS.meta);
    },
    async updateMeta(patch: Partial<Meta>): Promise<Meta | null> {
      const meta = await adapter.read<Meta>(STORAGE_KEYS.meta);
      if (!meta) return null;
      const next = { ...meta, ...patch };
      await adapter.write(STORAGE_KEYS.meta, next);
      return next;
    },

    async loadActive(): Promise<ActiveWorkout | null> {
      return adapter.read<ActiveWorkout>(STORAGE_KEYS.active);
    },
    async saveActive(active: ActiveWorkout | null) {
      await writeActiveLocal(active);
      void session.cloud()?.writeActive(active);
    },

    async resetToDemo(): Promise<AppData> {
      await mediaStore.clear().catch(() => {});
      const demo = createDemoData();
      await adapter.remove(STORAGE_KEYS.active);
      await writeAll(demo);
      return demo;
    },

    /** Deletes the account's data everywhere (cloud + this device); next start shows onboarding. */
    async clearAll(): Promise<void> {
      await mediaStore.clear().catch(() => {});
      const cloud = session.cloud();
      if (cloud) await cloud.removeAll().catch(() => {});
      await service.clearLocal();
    },

    /** Removes this account's cache from the device (sign-out). Cloud data stays. */
    async clearLocal(): Promise<void> {
      await mediaStore.clearLocal().catch(() => {});
      await Promise.all(Object.values(STORAGE_KEYS).map((k) => adapter.remove(k)));
    },

    // ---- Pre-account data on this device -------------------------------------
    loadLegacy: () => loadFrom(legacyLocalAdapter),
    legacyActive: () => legacyLocalAdapter.read<ActiveWorkout>(STORAGE_KEYS.active),
    async clearLegacy() {
      await Promise.all(Object.values(STORAGE_KEYS).map((k) => legacyLocalAdapter.remove(k)));
    },

    /** Full backup including user photos (as data URLs). */
    async toExportFile(data: AppData): Promise<ExportFile> {
      const media = await mediaStore.exportAll().catch(() => ({}) as Record<string, string>);
      return { app: 'pulse-workout-tracker', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), ...data, media };
    },

    /** Replaces stored photos with the ones from an import file. */
    async importMedia(media: Record<string, string>) {
      await mediaStore.clear();
      for (const [id, url] of Object.entries(media)) await mediaStore.put(id, await dataUrlToBlob(url));
    },
  };
  return service;
}

export type DataService = ReturnType<typeof createDataService>;

export const dataService = createDataService(createLocalAdapter(session.prefix));

// ---- Import validation ------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isArr = Array.isArray;

/** Extracts valid image data URLs from an import file (older exports have none). */
export function parseImportMedia(raw: unknown): Record<string, string> {
  if (!isObj(raw) || !isObj(raw.media)) return {};
  return Object.fromEntries(
    Object.entries(raw.media).filter((e): e is [string, string] => typeof e[1] === 'string' && e[1].startsWith('data:image/')),
  );
}

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
