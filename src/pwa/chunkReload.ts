import { lazy, type ComponentType } from 'react';

/**
 * A chunk that fails to load almost always means the app was updated while
 * this page was open (old file names no longer exist) or the network dropped.
 * Reloading once picks up the current version; the guard stops reload loops
 * when the failure is real (offline without a cache).
 */
const KEY = 'pulse:chunk-reload';
const WINDOW_MS = 15_000;

export function reloadOnceForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

export const isChunkError = (error: unknown) =>
  error instanceof Error &&
  /dynamically imported module|Importing a module script failed|Failed to fetch|Unable to preload CSS|ChunkLoadError|error loading dynamically/i.test(
    `${error.name} ${error.message}`,
  );

/** `React.lazy` that recovers from a stale or missing chunk by reloading once. */
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load().catch((error: unknown) => {
      if (isChunkError(error) && reloadOnceForChunkError()) return new Promise<never>(() => {});
      throw error;
    }),
  );
}

/** Vite reports failed CSS/JS preloads of dynamic imports through this event. */
export function installPreloadErrorHandler() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnceForChunkError()) event.preventDefault();
  });
}
