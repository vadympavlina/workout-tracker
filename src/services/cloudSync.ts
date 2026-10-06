import { get, onValue, ref, remove, set, update, type Database } from 'firebase/database';
import type { ActiveWorkout, AppData } from '@/types';
import { activeFromRemote, collectionPatch, fromRemote, toJson, toRemote, type CollectionKey } from './remoteModel';
import { syncStatus } from './syncStatus';

/**
 * Realtime Database client for one signed-in user. Layout:
 *   users/{uid}/data    — profile, settings and collections keyed by id
 *   users/{uid}/active  — the in-progress workout
 *   users/{uid}/media   — custom exercise photos (compressed data URLs)
 *
 * Writes are fire-and-track: the UI never waits for the network. Each write
 * marks the account "dirty" (persisted in localStorage) until the server
 * acknowledges it, so changes made offline are re-pushed on the next start
 * even if the page was closed before reconnecting.
 */
export function createCloudSync(db: Database, uid: string, dirtyKey: string) {
  const base = `users/${uid}`;
  let pending = 0;

  const readDirty = () => {
    try {
      return localStorage.getItem(dirtyKey) === '1';
    } catch {
      return false;
    }
  };
  const writeDirty = (dirty: boolean) => {
    try {
      if (dirty) localStorage.setItem(dirtyKey, '1');
      else localStorage.removeItem(dirtyKey);
    } catch {
      /* storage unavailable */
    }
    syncStatus.set({ dirty });
  };

  syncStatus.set({ dirty: readDirty(), pending: 0, error: null });
  const stopConnection = onValue(ref(db, '.info/connected'), (snap) => syncStatus.set({ online: snap.val() === true }));

  function track(write: Promise<unknown>) {
    pending++;
    writeDirty(true);
    syncStatus.set({ pending });
    write.then(
      () => {
        pending--;
        syncStatus.set({ pending, error: null });
        if (pending === 0) {
          writeDirty(false);
          syncStatus.set({ lastSyncedAt: Date.now() });
        }
      },
      (err: Error) => {
        pending--;
        // Stay dirty: the next start pushes local data again.
        syncStatus.set({ pending, error: err.message.includes('permission') ? 'Немає доступу до хмари' : 'Не вдалося синхронізувати' });
      },
    );
    return write;
  }

  /** Rejects after `ms` so a missing connection never blocks app start forever. */
  const withTimeout = <T>(p: Promise<T>, ms: number) =>
    Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

  return {
    isDirty: readDirty,
    hasPending: () => pending > 0,

    /** Server copy of the data, `null` if the account is empty. Throws when offline. */
    async pull(timeoutMs = 10_000): Promise<AppData | null> {
      const snap = await withTimeout(get(ref(db, `${base}/data`)), timeoutMs);
      syncStatus.set({ lastSyncedAt: Date.now() });
      return fromRemote(snap.val());
    },
    async pullActive(timeoutMs = 10_000): Promise<ActiveWorkout | null> {
      const snap = await withTimeout(get(ref(db, `${base}/active`)), timeoutMs);
      return activeFromRemote(snap.val());
    },

    /** Replaces the whole account with `data` (first upload, import, demo, offline recovery). */
    pushAll(data: AppData, active?: ActiveWorkout | null) {
      const updates: Record<string, unknown> = { data: toRemote(data) };
      if (active !== undefined) updates.active = active ? toJson(active) : null;
      return track(update(ref(db, base), updates));
    },

    writeDoc(key: 'user' | 'settings', value: unknown) {
      return track(set(ref(db, `${base}/data/${key}`), toJson(value)));
    },

    writeCollection<T extends { id: string }>(key: CollectionKey, prev: T[] | null, next: T[]) {
      const patch = collectionPatch(key, prev, next);
      if (Object.keys(patch).length === 0) return Promise.resolve();
      return track(update(ref(db, `${base}/data`), patch));
    },

    writeActive(active: ActiveWorkout | null) {
      return track(active ? set(ref(db, `${base}/active`), toJson(active)) : remove(ref(db, `${base}/active`)));
    },

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

    /** Deletes everything stored for this account. */
    removeAll: () => track(remove(ref(db, base))),

    dispose() {
      stopConnection();
    },
  };
}

export type CloudSync = ReturnType<typeof createCloudSync>;
