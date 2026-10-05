import { createContext, Suspense, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/navigation/Sidebar';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { ActiveWorkoutPill } from '@/components/workout/ActiveWorkoutPill';
import { StartWorkoutModal } from '@/components/workout/StartWorkoutModal';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useActiveWorkout } from '@/store/ActiveWorkoutContext';

const StartSheetContext = createContext<() => void>(() => {});
/** Opens the "start workout" sheet from anywhere inside the main layout. */
export const useStartSheet = () => useContext(StartSheetContext);

export function AppLayout() {
  const [startOpen, setStartOpen] = useState(false);
  const { pathname } = useLocation();
  const { active } = useActiveWorkout();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <StartSheetContext.Provider value={() => setStartOpen(true)}>
      <a
        href="#main"
        className="sr-only z-[70] rounded-ctl bg-accent px-4 py-2 font-semibold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        До основного вмісту
      </a>
      <div className="flex min-h-dvh">
        <Sidebar onStart={() => setStartOpen(true)} />
        <main
          id="main"
          className="pb-nav min-w-0 flex-1 overflow-x-clip lg:pb-12"
          style={{ paddingTop: 'calc(20px + var(--safe-top))', paddingBottom: active ? 'calc(160px + var(--safe-bottom))' : undefined }}
        >
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10 lg:pt-6">
            <Suspense fallback={<PageSkeleton />}>
              <div key={pathname} className="animate-slide-up">
                <Outlet />
              </div>
            </Suspense>
          </div>
        </main>
      </div>
      <ActiveWorkoutPill />
      <BottomNavigation />
      <StartWorkoutModal open={startOpen} onClose={() => setStartOpen(false)} />
    </StartSheetContext.Provider>
  );
}
