/**
 * Binary media (user exercise photos) in IndexedDB — localStorage is too small
 * for images. Keyed by exercise id. Like the storage adapter, this is the only
 * place that knows where media lives, so it can move to Firebase Storage later.
 */

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

export const mediaStore = {
  get: (id: string) => run<Blob | undefined>('readonly', (s) => s.get(id)),
  async put(id: string, blob: Blob) {
    await run('readwrite', (s) => s.put(blob, id));
    notify(id);
  },
  async remove(id: string) {
    await run('readwrite', (s) => s.delete(id));
    notify(id);
  },
  async clear() {
    await run('readwrite', (s) => s.clear());
    notify('*');
  },
  async entries(): Promise<[string, Blob][]> {
    const [keys, values] = await Promise.all([
      run<IDBValidKey[]>('readonly', (s) => s.getAllKeys()),
      run<Blob[]>('readonly', (s) => s.getAll()),
    ]);
    return keys.map((k, i) => [String(k), values[i]]);
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
