import { useSyncExternalStore } from 'react';

/** Observable sync state for the UI (profile badge, logout warning). */
export interface SyncState {
  /** Connected to the Realtime Database right now. */
  online: boolean;
  /** Writes sent but not yet acknowledged by the server. */
  pending: number;
  /** Local changes that never reached the server (survives reloads). */
  dirty: boolean;
  lastSyncedAt: number | null;
  error: string | null;
}

let state: SyncState = { online: navigator.onLine, pending: 0, dirty: false, lastSyncedAt: null, error: null };
const listeners = new Set<() => void>();

export const syncStatus = {
  get: () => state,
  set(patch: Partial<SyncState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const useSyncStatus = () => useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
