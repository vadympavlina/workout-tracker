import { lazy, Suspense } from 'react';
import { createHashRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { DataProvider, useData } from '@/store/DataContext';
import { ActiveWorkoutProvider } from '@/store/ActiveWorkoutContext';
import { AppLayout } from '@/layouts/AppLayout';
import { FocusLayout } from '@/layouts/FocusLayout';
import { useTheme } from '@/hooks/useTheme';
import Dashboard from '@/pages/Dashboard';

// Secondary screens are split into their own chunks.
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const PlanPage = lazy(() => import('@/pages/PlanPage'));
const PlanEditor = lazy(() => import('@/pages/PlanEditor'));
const WorkoutDetail = lazy(() => import('@/pages/WorkoutDetail'));
const ActiveWorkoutPage = lazy(() => import('@/pages/ActiveWorkoutPage'));
const WorkoutSummary = lazy(() => import('@/pages/WorkoutSummary'));
const HistoryPage = lazy(() => import('@/pages/HistoryPage'));
const SessionDetail = lazy(() => import('@/pages/SessionDetail'));
const ProgressPage = lazy(() => import('@/pages/ProgressPage'));
const ExercisesPage = lazy(() => import('@/pages/ExercisesPage'));
const ExerciseDetail = lazy(() => import('@/pages/ExerciseDetail'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const WeightPage = lazy(() => import('@/pages/WeightPage'));
const HelpPage = lazy(() => import('@/pages/HelpPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Data router (needed for navigation blocking on unsaved edits). Hash-based so
// refreshes and deep links work on GitHub Pages without server rewrites.
const router = createHashRouter(
  createRoutesFromElements(
    <>
      <Route element={<AppLayout />}>
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
      <Route element={<FocusLayout />}>
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
    <ToastProvider>
      <ConfirmProvider>
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
      </ConfirmProvider>
    </ToastProvider>
  );
}
