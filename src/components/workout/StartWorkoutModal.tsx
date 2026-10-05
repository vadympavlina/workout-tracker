import { ChevronRight, Play, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { IconBadge } from '@/components/ui/IconBadge';
import { useData } from '@/store/DataContext';
import { useActiveWorkout } from '@/store/ActiveWorkoutContext';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { weekdayOf } from '@/utils/date';
import { pluralExercises } from '@/utils/format';
import type { WorkoutPlan } from '@/types';

export function StartWorkoutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useData();
  const { active } = useActiveWorkout();
  const begin = useStartWorkout();
  const today = weekdayOf(new Date());

  const plans = [...data.plans].sort((a, b) => Number(b.days.includes(today)) - Number(a.days.includes(today)));

  const choose = (plan: WorkoutPlan | null) => {
    onClose();
    void begin(plan);
  };

  return (
    <Modal open={open} onClose={onClose} title="Почати тренування" description="Обери план — минулі результати підставляться автоматично.">
      {active && (
        <Link
          to="/active"
          onClick={onClose}
          className="mb-4 flex items-center gap-3 rounded-card border border-accent/30 bg-accent/[0.06] p-3.5 transition hover:bg-accent/[0.1]"
        >
          <IconBadge icon={Play} />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Продовжити «{active.name}»</span>
            <span className="block text-[13px] text-muted">Тренування ще триває</span>
          </span>
          <ChevronRight size={18} className="text-subtle" aria-hidden />
        </Link>
      )}

      <ul className="space-y-1.5">
        {plans.map((plan) => (
          <li key={plan.id}>
            <button
              type="button"
              onClick={() => choose(plan)}
              className="flex w-full items-center gap-3 rounded-ctl p-2.5 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]"
            >
              <IconBadge icon={plan.icon} tone={plan.days.includes(today) ? 'accent' : 'neutral'} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-semibold">{plan.name}</span>
                  {plan.days.includes(today) && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                      Сьогодні
                    </span>
                  )}
                </span>
                <span className="block text-[13px] text-muted">
                  {pluralExercises(plan.exercises.length)} · ≈ {plan.estimatedMinutes} хв
                </span>
              </span>
              <ChevronRight size={18} className="text-subtle" aria-hidden />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => choose(null)}
            className="flex w-full items-center gap-3 rounded-ctl p-2.5 text-left transition hover:bg-white/[0.04]"
          >
            <IconBadge icon={Sparkles} tone="neutral" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Вільне тренування</span>
              <span className="block text-[13px] text-muted">Без плану — додавай вправи по ходу</span>
            </span>
            <ChevronRight size={18} className="text-subtle" aria-hidden />
          </button>
        </li>
      </ul>

      <Link
        to="/plan/new"
        onClick={onClose}
        className="mt-3 flex h-12 items-center justify-center gap-2 rounded-ctl border border-dashed border-line text-[15px] font-medium text-muted transition hover:border-white/20 hover:text-fg"
      >
        <Plus size={18} aria-hidden />
        Створити новий план
      </Link>
    </Modal>
  );
}
