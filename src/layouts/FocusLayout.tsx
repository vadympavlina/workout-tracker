import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PageSkeleton } from '@/components/ui/Skeleton';

/** Distraction-free layout (no navigation) for the active workout and its summary. */
export function FocusLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <main id="main" className="min-h-dvh">
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-4 pt-6">
            <PageSkeleton />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </main>
  );
}
