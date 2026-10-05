import { useMemo } from 'react';
import { useData } from '@/store/DataContext';
import { isSameDay, weekdayOf } from '@/utils/date';

/** Plans scheduled for today, and whether each one has already been done today. */
export function useTodayPlans() {
  const { data, sessions } = useData();
  return useMemo(() => {
    const today = new Date();
    const weekday = weekdayOf(today);
    return data.plans
      .filter((p) => p.days.includes(weekday))
      .map((plan) => ({
        plan,
        doneToday: sessions.some((s) => s.planId === plan.id && isSameDay(s.startedAt, today)),
      }));
  }, [data.plans, sessions]);
}
