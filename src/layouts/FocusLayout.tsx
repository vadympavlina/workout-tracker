import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { PageSkeleton } from '@/components/ui/Skeleton';

/** Distraction-free layout (no navigation) for the active workout and its summary. */
export function FocusLayout() {
  return (
    <main id="main" className="min-h-dvh">
      <ScrollRestoration />
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
