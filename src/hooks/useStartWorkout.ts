import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WorkoutPlan } from '@/types';
import { useActiveWorkout } from '@/store/ActiveWorkoutContext';
import { useConfirm } from '@/components/ui/ConfirmDialog';

/** Starts (or resumes) a workout, protecting an unfinished one from being overwritten. */
export function useStartWorkout() {
  const { active, start } = useActiveWorkout();
  const confirm = useConfirm();
  const navigate = useNavigate();

  return useCallback(
    async (plan: WorkoutPlan | null) => {
      if (active) {
        if (plan && active.planId === plan.id) {
          navigate('/active');
          return;
        }
        const ok = await confirm({
          title: 'Почати нове тренування?',
          description: `Незавершене тренування «${active.name}» буде скасовано без збереження.`,
          confirmLabel: 'Почати нове',
        });
        if (!ok) return;
      }
      start(plan);
      navigate('/active');
    },
    [active, start, confirm, navigate],
  );
}
