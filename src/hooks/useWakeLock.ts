import { useEffect } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: 'release', cb: () => void) => void;
}
type NavigatorWithWakeLock = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };

/**
 * Keeps the screen on while `enabled` (Screen Wake Lock API). The browser drops
 * the lock whenever the tab is hidden, so it is re-acquired on return.
 * Silently does nothing where unsupported.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    const nav = navigator as NavigatorWithWakeLock;
    if (!enabled || !nav.wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let disposed = false;

    const acquire = async () => {
      if (disposed || document.visibilityState !== 'visible' || sentinel) return;
      try {
        sentinel = await nav.wakeLock!.request('screen');
        sentinel.addEventListener('release', () => {
          sentinel = null;
        });
        if (disposed) await sentinel.release();
      } catch {
        /* denied (e.g. low battery) — nothing to do */
      }
    };
    const onVisibility = () => void acquire();

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
    };
  }, [enabled]);
}
