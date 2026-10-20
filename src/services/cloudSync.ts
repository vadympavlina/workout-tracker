import { get, onValue, ref, remove, set, update, type Database } from 'firebase/database';
import type { ActiveWorkout, AppData } from '@/types';
import { activeFromRemote, collectionPatch, COLLECTIONS, fromRemote, toJson, toRemote, type CollectionKey } from './remoteModel';
import { syncStatus } from './syncStatus';

/**
 * Realtime Database client for one signed-in user. Layout:
 *   users/{uid}/data    — profile, settings and collections keyed by id
 *   users/{uid}/active  — the in-progress workout
 *   users/{uid}/media   — custom exercise photos (compressed data URLs)
 *
 * Writes are fire-and-track: the UI never waits for the network. Every data
 * write is a multi-path patch (only the records that changed) and is kept in a
 * persistent *outbox* until the server acknowledges it. If the app is closed
 * offline, the next start replays exactly those patches — never the whole
 * account — so edits made meanwhile on another device are not overwritten.
 */

type Patch = Record<string, unknown>;
interface OutboxEntry {
  id: number;
  patch: Patch;
  /** Server rejections so far; an entry that keeps failing is dropped, not retried forever. */
  failures?: number;
}
const MAX_FAILURES = 3;

/** `a/b` is overwritten by a later write to `a/b` or to an ancestor like `a`. */
const covers = (laterKeys: string[], key: string) => laterKeys.some((k) => k === key || key.startsWith(`${k}/`));

export function createCloudSync(db: Database, uid: string, outboxKey: string, legacyDirtyKey?: string) {
  const base = `users/${uid}`;
  let pending = 0;
  let nextId = Date.now();
  let failedThisSession = false;

  const readOutbox = (): OutboxEntry[] => {
    try {
      const raw = localStorage.getItem(outboxKey);
      return raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
    } catch {
      return [];
    }
  };
  const writeOutbox = (entries: OutboxEntry[]) => {
    try {
      if (entries.length) localStorage.setItem(outboxKey, JSON.stringify(entries));
      else localStorage.removeItem(outboxKey);
    } catch {
      /* storage full or blocked: the write still goes to the server */
    }
    syncStatus.set({ dirty: entries.length > 0 || failedThisSession });
  };
  const readLegacyDirty = () => {
    try {
      return !!legacyDirtyKey && localStorage.getItem(legacyDirtyKey) === '1';
    } catch {
      return false;
    }
  };

  syncStatus.set({ dirty: readOutbox().length > 0 || readLegacyDirty(), pending: 0, error: null });
  const stopConnection = onValue(ref(db, '.info/connected'), (snap) => syncStatus.set({ online: snap.val() === true }));

  const errorText = (err: unknown) =>
    String((err as Error)?.message ?? err).toLowerCase().includes('permission') ? 'Немає доступу до хмари' : 'Не вдалося синхронізувати';

  /** Counts an in-flight write for the UI; resolves/rejects like the write. */
  function track(write: Promise<unknown>, onDone?: (ok: boolean) => void) {
    pending++;
    syncStatus.set({ pending });
    write.then(
      () => {
        pending--;
        onDone?.(true);
        syncStatus.set({ pending, error: failedThisSession ? syncStatus.get().error : null });
        if (pending === 0 && !failedThisSession) syncStatus.set({ lastSyncedAt: Date.now() });
      },
      (err: unknown) => {
        pending--;
        onDone?.(false);
        syncStatus.set({ pending, error: errorText(err) });
      },
    );
    return write;
  }

  /** Queues `patch` (relative to users/{uid}) in the outbox and sends it. */
  function send(patch: Patch, entry?: OutboxEntry): Promise<unknown> {
    const keys = Object.keys(patch);
    if (!keys.length) return Promise.resolve();
    const item = entry ?? { id: nextId++, patch };
    if (!entry) {
      // Compact: drop queued entries fully overwritten by this one (repeated
      // active-workout saves, edits of the same record) so offline use stays small.
      const queued = readOutbox().filter((e) => !Object.keys(e.patch).every((k) => covers(keys, k)));
      writeOutbox([...queued, item]);
    }
    let write: Promise<unknown>;
    try {
      write = update(ref(db, base), patch);
    } catch (err) {
      // Invalid path or value: retrying can never succeed.
      writeOutbox(readOutbox().filter((e) => e.id !== item.id));
      failedThisSession = true;
      syncStatus.set({ error: errorText(err), dirty: true });
      return Promise.reject(err);
    }
    return track(write, (ok) => {
      const rest = readOutbox();
      if (ok) return writeOutbox(rest.filter((e) => e.id !== item.id));
      // Keep it for the next start, unless the server keeps refusing it.
      const failures = (item.failures ?? 0) + 1;
      failedThisSession = true;
      writeOutbox(
        failures >= MAX_FAILURES ? rest.filter((e) => e.id !== item.id) : rest.map((e) => (e.id === item.id ? { ...e, failures } : e)),
      );
    });
  }

  /** Rejects after `ms` so a missing connection never blocks app start forever. */
  const withTimeout = <T>(p: Promise<T>, ms: number) =>
    Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

  const pullRaw = async (timeoutMs: number) => (await withTimeout(get(ref(db, `${base}/data`)), timeoutMs)).val() as unknown;

  return {
    /** Local changes not yet confirmed by the server (persisted across reloads). */
    isDirty: () => readOutbox().length > 0 || readLegacyDirty() || failedThisSession,
    hasPending: () => pending > 0,
    hasOutbox: () => readOutbox().length > 0,
    hasLegacyDirty: readLegacyDirty,

    /** Server copy of the data, `null` if the account is empty. Throws when offline. */
    async pull(timeoutMs = 10_000): Promise<AppData | null> {
      const data = fromRemote(await pullRaw(timeoutMs));
      syncStatus.set({ lastSyncedAt: Date.now() });
      return data;
    },
    async pullActive(timeoutMs = 10_000): Promise<ActiveWorkout | null> {
      const snap = await withTimeout(get(ref(db, `${base}/active`)), timeoutMs);
      return activeFromRemote(snap.val());
    },

    /** Re-sends what an earlier session could not deliver (offline / app closed). */
    replayOutbox() {
      for (const entry of readOutbox()) void send(entry.patch, entry).catch(() => {});
    },

    /**
     * Upgrade path from the old "dirty flag" (whole-account push): merge the
     * local copy into the server copy without deleting anything the server has.
     */
    async mergeUp(local: AppData) {
      const remote = fromRemote(await pullRaw(10_000));
      const patch: Patch = { 'data/user': toJson(local.user), 'data/settings': toJson(local.settings) };
      for (const key of COLLECTIONS) {
        const additions = collectionPatch(key, remote?.[key] ?? [], local[key] as { id: string }[]);
        for (const [path, value] of Object.entries(additions)) if (value !== null) patch[`data/${path}`] = value;
      }
      await send(patch);
      try {
        if (legacyDirtyKey) localStorage.removeItem(legacyDirtyKey);
      } catch {
        /* ignore */
      }
    },

    /** Replaces the whole account with `data` (first upload, import, demo). */
    pushAll(data: AppData, active?: ActiveWorkout | null) {
      const patch: Patch = { data: toRemote(data) };
      if (active !== undefined) patch.active = active ? toJson(active) : null;
      return send(patch);
    },

    writeDoc(key: 'user' | 'settings', value: unknown) {
      return send({ [`data/${key}`]: toJson(value) });
    },

    writeCollection<T extends { id: string }>(key: CollectionKey, prev: T[] | null, next: T[]) {
      const patch = collectionPatch(key, prev, next);
      return send(Object.fromEntries(Object.entries(patch).map(([k, v]) => [`data/${k}`, v])));
    },

    writeActive(active: ActiveWorkout | null) {
      return send({ active: active ? toJson(active) : null });
    },

    // Photos are large, so they are not queued in the outbox; the device copy
    // in IndexedDB stays the source until the upload succeeds.
    putMedia: (id: string, dataUrl: string) => track(set(ref(db, `${base}/media/${id}`), dataUrl)),
    removeMedia: (id: string) => track(remove(ref(db, `${base}/media/${id}`))),
    clearMedia: () => track(remove(ref(db, `${base}/media`))),
    async getMedia(id: string): Promise<string | null> {
      const snap = await withTimeout(get(ref(db, `${base}/media/${id}`)), 10_000);
      const value = snap.val();
      return typeof value === 'string' ? value : null;
    },
    async listMedia(): Promise<Record<string, string>> {
      const snap = await withTimeout(get(ref(db, `${base}/media`)), 20_000);
      return (snap.val() as Record<string, string> | null) ?? {};
    },

    /** Deletes everything stored for this account; queued edits are moot. */
    removeAll() {
      writeOutbox([]);
      return track(remove(ref(db, base)));
    },

    dispose() {
      stopConnection();
    },
  };
}

export type CloudSync = ReturnType<typeof createCloudSync>;
