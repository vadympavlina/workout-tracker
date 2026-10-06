/**
 * Low-level key/value persistence.
 *
 * The rest of the app never touches `localStorage` directly — it goes through a
 * `StorageAdapter`. The interface is async on purpose: a Firebase/Firestore (or
 * any remote) adapter can implement the same contract without changing callers.
 */

export const STORAGE_KEYS = {
  user: 'workout_user',
  plans: 'workout_plans',
  exercises: 'workout_exercises',
  sessions: 'workout_sessions',
  bodyWeight: 'workout_body_weight',
  settings: 'workout_settings',
  active: 'workout_active',
  meta: 'workout_meta',
  syncDirty: 'workout_sync_dirty',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface StorageAdapter {
  read<T>(key: StorageKey): Promise<T | null>;
  write<T>(key: StorageKey, value: T): Promise<void>;
  remove(key: StorageKey): Promise<void>;
}

export class StorageError extends Error {}

/**
 * localStorage adapter whose keys are prefixed per account (see `session`), so
 * each signed-in user has a separate offline cache on a shared device.
 * `prefix` is read on every call because the account can change at runtime.
 */
export function createLocalAdapter(prefix: () => string): StorageAdapter {
  return {
    async read<T>(key: StorageKey) {
      try {
        const raw = window.localStorage.getItem(prefix() + key);
        return raw == null ? null : (JSON.parse(raw) as T);
      } catch {
        // Corrupted JSON or blocked storage: behave as if nothing was stored.
        return null;
      }
    },
    async write<T>(key: StorageKey, value: T) {
      try {
        window.localStorage.setItem(prefix() + key, JSON.stringify(value));
      } catch (error) {
        const quota = error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
        throw new StorageError(
          quota ? 'Сховище браузера заповнене. Експортуй дані та видали старі записи.' : 'Не вдалося зберегти дані в браузері.',
        );
      }
    },
    async remove(key: StorageKey) {
      try {
        window.localStorage.removeItem(prefix() + key);
      } catch {
        /* ignore */
      }
    },
  };
}

/** Data saved before accounts existed (no prefix) — read once for migration. */
export const legacyLocalAdapter = createLocalAdapter(() => '');
