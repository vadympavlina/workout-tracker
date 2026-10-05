import type { ReactNode } from 'react';
import clsx from 'clsx';
import { History } from 'lucide-react';
import type { Exercise } from '@/types';
import { IconBadge } from '@/components/ui/IconBadge';
import { MUSCLE_GROUPS } from '@/data/labels';
import { formatNumber } from '@/utils/format';

interface Props {
  exercise: Exercise | undefined;
  name: string;
  index?: number;
  scheme?: string;
  previous?: { weight: number; reps: number; sets: number } | null;
  actions?: ReactNode;
  className?: string;
}

export function ExerciseCard({ exercise, name, index, scheme, previous, actions, className }: Props) {
  return (
    <div className={clsx('card flex items-center gap-3.5 p-3.5 sm:p-4', className)}>
      <div className="relative">
        <IconBadge icon={exercise?.icon ?? 'dumbbell'} tone="neutral" />
        {index != null && (
          <span className="absolute -left-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-line bg-elevated px-1 text-[11px] font-semibold text-muted">
            {index}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold leading-snug">{name}</h3>
        <p className="mt-0.5 text-[13px] text-muted">
          {scheme && <span className="tabular font-medium text-fg/90">{scheme}</span>}
          {scheme && exercise && <span className="mx-1.5 text-subtle">·</span>}
          {exercise && <span>{MUSCLE_GROUPS[exercise.muscleGroup]}</span>}
        </p>
        {previous !== undefined && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-subtle">
            <History size={13} aria-hidden />
            {previous ? (
              <span>
                Минулого разу:{' '}
                <span className="tabular font-medium text-muted">
                  {previous.weight > 0 ? `${formatNumber(previous.weight, 2)} кг × ${previous.reps}` : `${previous.reps} повт.`}
                </span>
              </span>
            ) : (
              <span>Ще не виконувалась</span>
            )}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center">{actions}</div>}
    </div>
  );
}
