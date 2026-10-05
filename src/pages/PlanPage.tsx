import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { BookOpen, CalendarDays, ChevronRight, LayoutTemplate, Plus } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TopBar } from '@/components/ui/TopBar';
import { ButtonLink } from '@/components/ui/Button';
import { Section } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconBadge } from '@/components/ui/IconBadge';
import { WorkoutCard } from '@/components/workout/WorkoutCard';
import { weekdayOf, WEEKDAYS_LONG, WEEKDAYS_SHORT } from '@/utils/date';
import { pluralWorkouts } from '@/utils/format';
import type { Weekday } from '@/types';

export default function PlanPage() {
  usePageTitle('План');
  const { data } = useData();
  const today = weekdayOf(new Date());
  const [filter, setFilter] = useState<Weekday | 'all'>('all');

  const byDay = useMemo(
    () => WEEKDAYS_LONG.map((_, d) => data.plans.filter((p) => p.days.includes(d as Weekday))),
    [data.plans],
  );
  const templates = data.plans.filter((p) => p.days.length === 0);
  const scheduledCount = data.plans.length - templates.length;

  return (
    <div>
      <TopBar
        title="План"
        subtitle={data.plans.length ? `${pluralWorkouts(scheduledCount)} у розкладі` : 'Розклад тренувань на тиждень'}
        actions={
          <ButtonLink to="/plan/new" icon={Plus} size="sm" className="h-11 px-4">
            Створити
          </ButtonLink>
        }
      />

      {data.plans.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Поки що немає тренувань"
          description="Створи свій перший план і почни відстежувати прогрес."
          action={
            <ButtonLink to="/plan/new" icon={Plus}>
              Створити тренування
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-8">
          <div role="tablist" aria-label="День тижня" className="grid grid-cols-8 gap-1 rounded-full bg-white/[0.06] p-1">
            {(['all', 0, 1, 2, 3, 4, 5, 6] as const).map((d) => {
              const active = filter === d;
              const has = d !== 'all' && byDay[d].length > 0;
              return (
                <button
                  key={d}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(d)}
                  className={clsx(
                    'relative flex h-12 flex-col items-center justify-center rounded-full text-[13px] font-semibold transition',
                    active ? 'bg-fg text-black' : 'text-muted hover:text-fg',
                    d === today && !active && 'text-accent',
                  )}
                >
                  {d === 'all' ? 'Усі' : WEEKDAYS_SHORT[d]}
                  {has && <span className={clsx('mt-1 h-1 w-1 rounded-full', active ? 'bg-black' : 'bg-accent')} aria-hidden />}
                </button>
              );
            })}
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {WEEKDAYS_LONG.map((dayName, d) => {
              if (filter !== 'all' && filter !== d) return null;
              const plans = byDay[d];
              if (filter === 'all' && plans.length === 0) return null;
              return (
                <Section
                  key={d}
                  id={`day-${d}`}
                  title={dayName}
                  action={d === today ? <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[12px] font-semibold text-accent">Сьогодні</span> : undefined}
                >
                  {plans.length > 0 ? (
                    <div className="space-y-3">
                      {plans.map((p) => (
                        <WorkoutCard key={p.id} plan={p} highlight={d === today} />
                      ))}
                    </div>
                  ) : (
                    <div className="card flex items-center justify-between gap-3 p-4">
                      <p className="text-[15px] text-muted">День відпочинку</p>
                      <ButtonLink to={`/plan/new?day=${d}`} variant="secondary" size="sm" icon={Plus}>
                        Додати
                      </ButtonLink>
                    </div>
                  )}
                </Section>
              );
            })}
          </div>

          {filter === 'all' && templates.length > 0 && (
            <Section title="Шаблони без дня">
              <div className="grid gap-3 lg:grid-cols-2">
                {templates.map((p) => (
                  <WorkoutCard key={p.id} plan={p} />
                ))}
              </div>
            </Section>
          )}

          <Link to="/exercises" className="card-interactive flex items-center gap-4 p-4">
            <IconBadge icon={BookOpen} tone="neutral" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Бібліотека вправ</span>
              <span className="block text-[13px] text-muted">{data.exercises.length} вправ · додавай власні</span>
            </span>
            <ChevronRight size={20} className="text-subtle" aria-hidden />
          </Link>
          {templates.length === 0 && filter === 'all' && (
            <p className="flex items-start gap-2 text-[13px] text-subtle">
              <LayoutTemplate size={16} className="mt-0.5 shrink-0" aria-hidden />
              Тренування без дня тижня зберігаються як шаблони — їх можна запускати будь-коли.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
