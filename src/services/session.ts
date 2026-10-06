import type { CloudSync } from './cloudSync';

/**
 * The signed-in account the data layer works for. Set by the auth gate after
 * sign-in; storage keys and cloud paths are derived from it so several people
 * can use one device without seeing each other's cached data.
 */
interface Session {
  uid: string;
  cloud: CloudSync | null;
}

let current: Session | null = null;

export const session = {
  get: () => current,
  set(next: Session | null) {
    current?.cloud?.dispose();
    current = next;
  },
  /** Prefix for localStorage keys and media cache entries. '' = pre-account (legacy) data. */
  prefix: () => (current ? `u:${current.uid}:` : ''),
  cloud: () => current?.cloud ?? null,
};
