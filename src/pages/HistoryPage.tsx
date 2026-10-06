import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Clock, NotebookText, Play, X } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStartSheet } from '@/layouts/AppLayout';
import { TopBar } from '@/components/ui/TopBar';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconBadge } from '@/components/ui/IconBadge';
import { addDays, fromISODate, startOfMonth, startOfWeek, toISODate, WEEKDAYS_SHORT } from '@/utils/date';
import { formatClock, formatDate, formatMonthYear, formatVolume, pluralExercises, pluralWorkouts } from '@/utils/format';
import { sessionVolume, sumVolume } from '@/utils/stats';
import type { WorkoutSession } from '@/types';

export default function HistoryPage() {
  usePageTitle('Журнал');
  const { sessions } = useData();
  const openStart = useStartSheet();
  // `?date=YYYY-MM-DD` (e.g. from the year heatmap) opens that day directly.
  const [params] = useSearchParams();
  const dateParam = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '') ? params.get('date') : null;
  const [month, setMonth] = useState(() => startOfMonth(dateParam ? fromISODate(dateParam) : new Date()));
  const [selected, setSelected] = useState<string | null>(dateParam);

  const byDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of sessions) {
      const key = toISODate(s.startedAt);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [sessions]);

  const monthSessions = useMemo(
    () => sessions.filter((s) => {
      const d = new Date(s.startedAt);
      return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
    }),
    [sessions, month],
  );

  const visible = selected ? byDate.get(selected) ?? [] : monthSessions;
  const firstMonth = sessions.length ? startOfMonth(sessions[sessions.length - 1].startedAt) : month;
  const isCurrentMonth = month.getTime() >= startOfMonth(new Date()).getTime();

  const shiftMonth = (dir: -1 | 1) => {
    const next = new Date(month);
    next.setMonth(next.getMonth() + dir);
    setMonth(next);
    setSelected(null);
  };

  if (sessions.length === 0) {
    return (
      <div>
        <TopBar title="Журнал" subtitle="Історія твоїх тренувань" />
        <EmptyState
          icon={NotebookText}
          title="Поки що немає тренувань"
          description="Заверши перше тренування — і воно зʼявиться тут з усіма підходами."
          action={
            <Button icon={Play} onClick={openStart}>
              Почати тренування
            </Button>
          }
        />
      </div>
    );
  }

  // Calendar grid: Monday-first weeks covering the month.
  const gridStart = startOfWeek(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const lastRowNeeded = days.findIndex((d, i) => i % 7 === 0 && d.getMonth() !== month.getMonth() && d > month);
  const cells = lastRowNeeded > 0 ? days.slice(0, lastRowNeeded) : days;
  const todayKey = toISODate(new Date());

  return (
    <div>
      <TopBar title="Журнал" subtitle={`${pluralWorkouts(sessions.length)} загалом`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        <section aria-label="Календар" className="card p-4 lg:sticky lg:top-6">
          <div className="mb-3 flex items-center justify-between">
            <IconButton icon={ChevronLeft} label="Попередній місяць" size="sm" disabled={month <= firstMonth} onClick={() => shiftMonth(-1)} />
            <div className="text-center">
              <h2 className="text-[16px] font-semibold" aria-live="polite">
                {formatMonthYear(month)}
              </h2>
              <p className="text-[12px] text-subtle">
                {pluralWorkouts(monthSessions.length)} · {formatVolume(sumVolume(monthSessions))}
              </p>
            </div>
            <IconButton icon={ChevronRight} label="Наступний місяць" size="sm" disabled={isCurrentMonth} onClick={() => shiftMonth(1)} />
          </div>
          <div className="grid grid-cols-7 gap-1 text-center" role="grid">
            {WEEKDAYS_SHORT.map((d) => (
              <span key={d} className="pb-1 text-[11px] font-semibold uppercase text-subtle" role="columnheader">
                {d}
              </span>
            ))}
            {cells.map((d) => {
              const key = toISODate(d);
              const inMonth = d.getMonth() === month.getMonth();
              const has = byDate.has(key);
              const isSel = selected === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  disabled={!has}
                  aria-pressed={isSel}
                  aria-label={`${formatDate(d)}${has ? `, ${byDate.get(key)!.length} трен.` : ''}`}
                  onClick={() => setSelected(isSel ? null : key)}
                  className={clsx(
                    'tabular relative flex aspect-square min-h-[40px] flex-col items-center justify-center rounded-xl text-[14px] transition',
                    !inMonth && 'opacity-30',
                    has ? 'font-semibold text-fg hover:bg-white/[0.06]' : 'text-subtle',
                    isSel && 'bg-accent text-black hover:bg-accent',
                    !isSel && key === todayKey && 'ring-1 ring-inset ring-accent/50',
                  )}
                >
                  {d.getDate()}
                  {has && <span className={clsx('absolute bottom-1.5 h-1 w-1 rounded-full', isSel ? 'bg-[#120f1f]' : 'bg-accent')} aria-hidden />}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Тренування" className="space-y-3">
          {selected && (
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium">{formatDate(selected)}</p>
              <Button size="sm" variant="ghost" icon={X} onClick={() => setSelected(null)}>
                Показати весь місяць
              </Button>
            </div>
          )}
          {visible.length === 0 ? (
            <div className="card p-6 text-center text-[15px] text-muted">У цьому місяці тренувань немає.</div>
          ) : (
            <ul className="space-y-2.5">
              {visible.map((s) => (
                <li key={s.id}>
                  <SessionRow session={s} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: WorkoutSession }) {
  const d = new Date(session.startedAt);
  return (
    <Link to={`/history/${session.id}`} className="card-interactive flex items-center gap-4 p-4">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-ctl bg-white/[0.04] py-1.5">
        <span className="tabular text-[18px] font-semibold leading-tight">{d.getDate()}</span>
        <span className="text-[11px] uppercase text-subtle">{WEEKDAYS_SHORT[(d.getDay() + 6) % 7]}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <IconBadge icon={session.icon} size="sm" tone="neutral" className="hidden sm:inline-flex" />
          <h3 className="truncate text-[16px] font-semibold">{session.name}</h3>
        </div>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-muted">
          <span className="tabular inline-flex items-center gap-1">
            <Clock size={13} aria-hidden />
            {formatClock(session.durationSec)}
          </span>
          <span>{pluralExercises(session.exercises.length)}</span>
          <span className="tabular">{formatVolume(sessionVolume(session))}</span>
        </p>
      </div>
      <ChevronRight size={20} className="shrink-0 text-subtle" aria-hidden />
    </Link>
  );
}
