/**
 * Binary media (user exercise photos). IndexedDB is the on-device cache —
 * localStorage is too small for images — and the signed-in account's
 * Realtime Database `media` node is the synced copy. Keyed by exercise id.
 */

import { session } from './session';

const DB_NAME = 'pulse-media';
const STORE = 'photos';

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error ?? new Error('IndexedDB недоступна'));
      };
    });
  }
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(d.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

type Listener = (id: string) => void;
const listeners = new Set<Listener>();
const notify = (id: string) => listeners.forEach((l) => l(id));

/** Local cache keys are namespaced per account, like localStorage. */
const key = (id: string) => session.prefix() + id;
const ownKeys = async () => {
  const prefix = session.prefix();
  const keys = await run<IDBValidKey[]>('readonly', (s) => s.getAllKeys());
  return keys.map(String).filter((k) => (prefix ? k.startsWith(prefix) : !k.startsWith('u:')));
};

/**
 * Exercise photos: IndexedDB is the on-device cache, the signed-in account's
 * `users/{uid}/media/{id}` in Realtime Database is the shared copy. A photo
 * missing locally (e.g. on a second device) is fetched on first use.
 */
export const mediaStore = {
  async get(id: string): Promise<Blob | undefined> {
    const cached = await run<Blob | undefined>('readonly', (s) => s.get(key(id))).catch(() => undefined);
    if (cached) return cached;
    const cloud = session.cloud();
    if (!cloud) return undefined;
    const dataUrl = await cloud.getMedia(id).catch(() => null);
    if (!dataUrl) return undefined;
    const blob = await dataUrlToBlob(dataUrl);
    await run('readwrite', (s) => s.put(blob, key(id))).catch(() => {});
    return blob;
  },
  async put(id: string, blob: Blob) {
    await run('readwrite', (s) => s.put(blob, key(id)));
    const cloud = session.cloud();
    if (cloud) void cloud.putMedia(id, await blobToDataUrl(blob));
    notify(id);
  },
  async remove(id: string) {
    await run('readwrite', (s) => s.delete(key(id)));
    void session.cloud()?.removeMedia(id);
    notify(id);
  },
  /** Removes all photos of the current account (device + cloud). */
  async clear() {
    await mediaStore.clearLocal();
    void session.cloud()?.clearMedia();
    notify('*');
  },
  /** Removes the current account's photos from this device only. */
  async clearLocal() {
    for (const k of await ownKeys()) await run('readwrite', (s) => s.delete(k));
  },
  /** All photos as data URLs for the JSON backup (cloud copy when signed in). */
  async exportAll(): Promise<Record<string, string>> {
    const cloud = session.cloud();
    if (cloud) {
      const remote = await cloud.listMedia().catch(() => null);
      if (remote) return remote;
    }
    const out: Record<string, string> = {};
    const prefix = session.prefix();
    for (const k of await ownKeys()) {
      const blob = await run<Blob | undefined>('readonly', (s) => s.get(k));
      if (blob) out[k.slice(prefix.length)] = await blobToDataUrl(blob);
    }
    return out;
  },
  /** Photos saved before accounts existed (unprefixed keys), for migration. */
  async legacyEntries(): Promise<[string, Blob][]> {
    const keys = (await run<IDBValidKey[]>('readonly', (s) => s.getAllKeys())).map(String).filter((k) => !k.startsWith('u:'));
    const out: [string, Blob][] = [];
    for (const k of keys) {
      const blob = await run<Blob | undefined>('readonly', (s) => s.get(k));
      if (blob) out.push([k, blob]);
    }
    return out;
  },
  async clearLegacy() {
    const keys = (await run<IDBValidKey[]>('readonly', (s) => s.getAllKeys())).map(String).filter((k) => !k.startsWith('u:'));
    for (const k of keys) await run('readwrite', (s) => s.delete(k));
  },
  /** Called with the changed exercise id ("*" for everything). */
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const dataUrlToBlob = (dataUrl: string) => fetch(dataUrl).then((r) => r.blob());
