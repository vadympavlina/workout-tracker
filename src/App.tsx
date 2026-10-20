import { Suspense } from 'react';
import { createHashRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { DataProvider, useData } from '@/store/DataContext';
import { ActiveWorkoutProvider } from '@/store/ActiveWorkoutContext';
import { AuthGate } from '@/store/AuthGate';
import { AppLayout } from '@/layouts/AppLayout';
import { FocusLayout } from '@/layouts/FocusLayout';
import { useTheme } from '@/hooks/useTheme';
import Dashboard from '@/pages/Dashboard';
import { lazyPage } from '@/pwa/chunkReload';
import { AppErrorBoundary, RouteError } from '@/pwa/ErrorScreen';
import { UpdateBanner } from '@/pwa/UpdateBanner';

// Secondary screens are split into their own chunks.
const Onboarding = lazyPage(() => import('@/pages/Onboarding'));
const PlanPage = lazyPage(() => import('@/pages/PlanPage'));
const PlanEditor = lazyPage(() => import('@/pages/PlanEditor'));
const WorkoutDetail = lazyPage(() => import('@/pages/WorkoutDetail'));
const ActiveWorkoutPage = lazyPage(() => import('@/pages/ActiveWorkoutPage'));
const WorkoutSummary = lazyPage(() => import('@/pages/WorkoutSummary'));
const HistoryPage = lazyPage(() => import('@/pages/HistoryPage'));
const SessionDetail = lazyPage(() => import('@/pages/SessionDetail'));
const ProgressPage = lazyPage(() => import('@/pages/ProgressPage'));
const ExercisesPage = lazyPage(() => import('@/pages/ExercisesPage'));
const ExerciseDetail = lazyPage(() => import('@/pages/ExerciseDetail'));
const ProfilePage = lazyPage(() => import('@/pages/ProfilePage'));
const WeightPage = lazyPage(() => import('@/pages/WeightPage'));
const HelpPage = lazyPage(() => import('@/pages/HelpPage'));
const NotFound = lazyPage(() => import('@/pages/NotFound'));

// Data router (needed for navigation blocking on unsaved edits). Hash-based so
// refreshes and deep links work on GitHub Pages without server rewrites.
const router = createHashRouter(
  createRoutesFromElements(
    <>
      <Route element={<AppLayout />} errorElement={<RouteError />}>
        <Route index element={<Dashboard />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="plan/new" element={<PlanEditor />} />
        <Route path="plan/:id/edit" element={<PlanEditor />} />
        <Route path="workout/:id" element={<WorkoutDetail />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:id" element={<SessionDetail />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="exercises/:id" element={<ExerciseDetail />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="weight" element={<WeightPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<FocusLayout />} errorElement={<RouteError />}>
        <Route path="active" element={<ActiveWorkoutPage />} />
        <Route path="summary/:id" element={<WorkoutSummary />} />
      </Route>
    </>,
  ),
);

function ThemedApp() {
  const { data } = useData();
  useTheme(data.settings);
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ToastProvider>
        <UpdateBanner />
        <ConfirmProvider>
          <AuthGate>
            <DataProvider
              onboarding={(finish) => (
                <Suspense fallback={null}>
                  <Onboarding finish={finish} />
                </Suspense>
              )}
              fallback={
                <div className="mx-auto max-w-[1200px] px-4 pt-8">
                  <PageSkeleton />
                </div>
              }
            >
              <ActiveWorkoutProvider>
                <ThemedApp />
              </ActiveWorkoutProvider>
            </DataProvider>
          </AuthGate>
        </ConfirmProvider>
      </ToastProvider>
    </AppErrorBoundary>
  );
}
