import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useActiveWorkout } from '@/store/ActiveWorkoutContext';
import { useNow } from '@/hooks/useNow';
import { formatClock } from '@/utils/format';

/** Floating "workout in progress" bar shown on regular pages while a workout runs. */
export function ActiveWorkoutPill() {
  const { active } = useActiveWorkout();
  const { pathname } = useLocation();
  const now = useNow(1000, !!active);
  if (!active || pathname.startsWith('/active')) return null;

  const elapsed = (now - new Date(active.startedAt).getTime()) / 1000;
  const finished = active.exercises.filter((e) => e.finished).length;

  return (
    <div
      className="fixed inset-x-0 z-30 flex justify-center px-4 lg:bottom-6 lg:left-[260px] xl:left-[280px]"
      style={{ bottom: 'calc(76px + var(--safe-bottom))' }}
    >
      <Link
        to="/active"
        className="flex w-full max-w-md animate-slide-up items-center gap-3 rounded-card border border-accent/30 bg-elevated/95 p-2.5 pl-3 shadow-glow backdrop-blur-xl transition hover:border-accent/50"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{active.name}</span>
          <span className="block text-[12px] text-muted">
            Тренування триває · {finished} / {active.exercises.length} вправ
          </span>
        </span>
        <span className="tabular rounded-xl bg-accent/15 px-2.5 py-1.5 text-[15px] font-semibold text-accent">{formatClock(elapsed)}</span>
        <ChevronRight size={18} className="text-subtle" aria-hidden />
      </Link>
    </div>
  );
}
