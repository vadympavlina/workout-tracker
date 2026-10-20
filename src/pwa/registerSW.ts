import { useSyncExternalStore } from 'react';

/**
 * Service worker lifecycle for the page.
 *
 * A new deploy installs in the background and then *waits*: the open app keeps
 * running on the cache it was started from (its lazy chunks stay available).
 * The UI offers "Оновити"; accepting activates the new worker and reloads.
 * Closing the app also lets the update take over on the next launch.
 */

let waiting: ServiceWorker | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const updateAvailable = {
  get: () => waiting !== null,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const useUpdateAvailable = () => useSyncExternalStore(updateAvailable.subscribe, updateAvailable.get);

let updateRequested = false;

/** Activates the waiting version; the page reloads once it has taken control. */
export function applyUpdate() {
  if (!waiting) return window.location.reload();
  updateRequested = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

const UPDATE_CHECK_MS = 30 * 60_000;

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  // The new version took over after "Оновити": reload once to run its code.
  // (The very first install also changes the controller — no reload then.)
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested || reloading) return;
    reloading = true;
    waiting = null;
    emit();
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      const track = (worker: ServiceWorker | null) => {
        if (!worker) return;
        const check = () => {
          // Installed while another version controls the page → an update is ready.
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            waiting = worker;
            emit();
          }
        };
        check();
        worker.addEventListener('statechange', check);
      };
      track(reg.waiting);
      reg.addEventListener('updatefound', () => track(reg.installing));

      // Installed PWAs can stay open for days: look for a new deploy when the
      // app comes back to the foreground (at most every 30 minutes).
      let lastCheck = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || Date.now() - lastCheck < UPDATE_CHECK_MS) return;
        lastCheck = Date.now();
        reg.update().catch(() => {});
      });
    } catch {
      /* offline support is optional (e.g. private mode) */
    }
  });
}
