import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CloudOff, Dumbbell, RotateCw, Upload } from 'lucide-react';
import type { AppData } from '@/types';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { db } from '@/services/firebase';
import { signOut as authSignOut, watchAuth, type User } from '@/services/auth';
import { createCloudSync } from '@/services/cloudSync';
import { dataService } from '@/services/dataService';
import { mediaStore } from '@/services/mediaStore';
import { session } from '@/services/session';
import { STORAGE_KEYS } from '@/services/storage';
import { syncStatus } from '@/services/syncStatus';
import { useTheme } from '@/hooks/useTheme';
import { usePageTitle } from '@/hooks/usePageTitle';
import { DEFAULT_SETTINGS } from '@/data/demo';
import { pluralWorkouts } from '@/utils/format';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));

interface Account {
  email: string;
  /** Signs out and removes this account's cached data from the device. */
  signOut: () => Promise<void>;
}

const AccountContext = createContext<Account | null>(null);

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AuthGate');
  return ctx;
}

type Phase =
  | { kind: 'auth' }
  | { kind: 'signedOut' }
  | { kind: 'booting'; user: User }
  | { kind: 'offline'; user: User }
  | { kind: 'migrate'; user: User; legacy: AppData }
  | { kind: 'ready'; user: User };

/**
 * Sign-in is mandatory: nothing below this gate renders without an account.
 * After sign-in it binds the data layer to the user (`session`), reconciles the
 * local cache with the cloud and, for a fresh account on a device that already
 * has pre-account data, offers to move that data into the account.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'auth' });
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      watchAuth((user) => {
        if (!user) {
          session.set(null);
          setPhase({ kind: 'signedOut' });
          return;
        }
        if (session.get()?.uid !== user.uid) {
          const prefix = `u:${user.uid}:`;
          session.set({ uid: user.uid, cloud: createCloudSync(db, user.uid, prefix + STORAGE_KEYS.syncDirty) });
        }
        // Ignore repeat notifications for the account that is already open.
        setPhase((p) => (p.kind === 'ready' && p.user.uid === user.uid ? p : { kind: 'booting', user }));
      }),
    [],
  );

  // Boot (and retry after "offline").
  const bootUser = phase.kind === 'booting' ? phase.user : null;
  useEffect(() => {
    if (!bootUser) return;
    let cancelled = false;
    void (async () => {
      const result = await dataService.start();
      if (cancelled) return;
      if (result === 'offline') return setPhase({ kind: 'offline', user: bootUser });
      if (result === 'empty') {
        const legacy = await dataService.loadLegacy();
        if (!cancelled && legacy) return setPhase({ kind: 'migrate', user: bootUser, legacy });
      }
      if (!cancelled) setPhase({ kind: 'ready', user: bootUser });
    })();
    return () => {
      cancelled = true;
    };
  }, [bootUser, attempt]);

  const signOut = useCallback(async () => {
    await dataService.clearLocal();
    session.set(null);
    syncStatus.set({ pending: 0, dirty: false, error: null, lastSyncedAt: null });
    await authSignOut();
  }, []);

  switch (phase.kind) {
    case 'auth':
    case 'booting':
      return <Splash />;
    case 'signedOut':
      return (
        <Suspense fallback={<Splash />}>
          <LoginPage />
        </Suspense>
      );
    case 'offline':
      return (
        <OfflineScreen
          onRetry={() => {
            setPhase({ kind: 'booting', user: phase.user });
            setAttempt((a) => a + 1);
          }}
          onSignOut={() => void signOut()}
        />
      );
    case 'migrate':
      return <MigratePrompt legacy={phase.legacy} done={() => setPhase({ kind: 'ready', user: phase.user })} />;
    case 'ready':
      return (
        <AccountContext.Provider value={{ email: phase.user.email ?? '', signOut }}>
          {/* Keyed so switching accounts never leaks state between users. */}
          <div key={phase.user.uid} className="contents">
            {children}
          </div>
        </AccountContext.Provider>
      );
  }
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Завантаження">
      <span className="inline-flex h-14 w-14 animate-pulse items-center justify-center rounded-[18px] bg-accent text-black shadow-glow">
        <Dumbbell size={26} strokeWidth={2.4} aria-hidden />
      </span>
    </div>
  );
}

function CenteredScreen({ title, children }: { title: string; children: ReactNode }) {
  usePageTitle(title);
  useTheme(DEFAULT_SETTINGS);
  return (
    <main
      className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center overflow-x-clip px-5"
      style={{ paddingTop: 'calc(24px + var(--safe-top))', paddingBottom: 'calc(24px + var(--safe-bottom))' }}
    >
      <div className="glow-blob -right-24 -top-24 h-72 w-72 bg-accent/[0.12]" aria-hidden />
      <div className="relative">{children}</div>
    </main>
  );
}

function OfflineScreen({ onRetry, onSignOut }: { onRetry: () => void; onSignOut: () => void }) {
  return (
    <CenteredScreen title="Немає зʼєднання">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/[0.06] text-muted">
        <CloudOff size={26} aria-hidden />
      </span>
      <h1 className="mt-6 text-[30px] font-bold leading-[1.1] tracking-[-0.04em]">Немає зʼєднання</h1>
      <p className="mt-2 text-[15px] text-muted">
        На цьому пристрої ще немає твоїх даних, а завантажити їх із хмари не вдалося. Перевір інтернет і спробуй ще раз — після першого
        завантаження застосунок працює й офлайн.
      </p>
      <Button size="lg" block icon={RotateCw} className="mt-8" onClick={onRetry}>
        Спробувати ще раз
      </Button>
      <Button size="lg" block variant="ghost" className="mt-2" onClick={onSignOut}>
        Вийти з акаунта
      </Button>
    </CenteredScreen>
  );
}

/** New account + data from before accounts existed on this device. */
function MigratePrompt({ legacy, done }: { legacy: AppData; done: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const migrate = async () => {
    setBusy(true);
    try {
      await dataService.replaceAll(legacy);
      const active = await dataService.legacyActive();
      if (active) await dataService.saveActive(active);
      for (const [id, blob] of await mediaStore.legacyEntries()) await mediaStore.put(id, blob);
      await dataService.clearLegacy();
      await mediaStore.clearLegacy();
      done();
    } catch (e) {
      toast.error('Не вдалося перенести дані', (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <CenteredScreen title="Перенесення даних">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent text-black shadow-glow">
        <Upload size={24} strokeWidth={2.4} aria-hidden />
      </span>
      <h1 className="mt-6 text-[30px] font-bold leading-[1.1] tracking-[-0.04em]">Перенести дані в акаунт?</h1>
      <p className="mt-2 text-[15px] text-muted">
        На цьому пристрої є дані, збережені до входу: {legacy.user.name ? `профіль «${legacy.user.name}», ` : ''}
        {pluralWorkouts(legacy.sessions.length)} у журналі. Їх можна перенести в акаунт — тоді вони будуть доступні на всіх твоїх пристроях.
      </p>
      <Button size="lg" block icon={Upload} className="mt-8" disabled={busy} onClick={() => void migrate()}>
        {busy ? 'Переносимо…' : 'Перенести'}
      </Button>
      <Button size="lg" block variant="ghost" className="mt-2" disabled={busy} onClick={done}>
        Почати з нуля
      </Button>
    </CenteredScreen>
  );
}
