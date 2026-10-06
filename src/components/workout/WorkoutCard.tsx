import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronRight, Clock, ListChecks } from 'lucide-react';
import type { WorkoutPlan } from '@/types';
import { IconBadge } from '@/components/ui/IconBadge';
import { pluralExercises } from '@/utils/format';
import { WEEKDAYS_SHORT } from '@/utils/date';

interface Props {
  plan: WorkoutPlan;
  showDays?: boolean;
  highlight?: boolean;
  badge?: string;
  className?: string;
}

export function WorkoutCard({ plan, showDays, highlight, badge, className }: Props) {
  return (
    <Link
      to={`/workout/${plan.id}`}
      className={clsx('card-interactive group flex items-center gap-4 p-4', highlight && 'border-accent/30 bg-accent/[0.04]', className)}
    >
      <IconBadge icon={plan.icon} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="line-clamp-2 break-words text-[16px] font-semibold leading-snug">{plan.name}</h3>
          {badge && (
            <span className="mt-0.5 shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock size={14} aria-hidden />≈ {plan.estimatedMinutes} хв
          </span>
          <span className="inline-flex items-center gap-1">
            <ListChecks size={14} aria-hidden />
            {pluralExercises(plan.exercises.length)}
          </span>
          {showDays && plan.days.length > 0 && (
            <span className="text-subtle">{[...plan.days].sort().map((d) => WEEKDAYS_SHORT[d]).join(' · ')}</span>
          )}
        </p>
      </div>
      <ChevronRight size={20} className="shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-muted" aria-hidden />
    </Link>
  );
}
