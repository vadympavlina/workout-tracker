import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { CalendarDays, Check, ChevronRight, Clock, ListChecks, Moon, Play, Plus, Sparkles, Trophy } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useActiveWorkout } from '@/store/ActiveWorkoutContext';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { useTodayPlans } from '@/hooks/useTodayPlans';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStartSheet } from '@/layouts/AppLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Section } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { IconBadge } from '@/components/ui/IconBadge';
import { ActivityRings, type Ring } from '@/components/ui/ActivityRings';
import { EmptyState } from '@/components/ui/EmptyState';
import { BackupReminder } from '@/components/BackupReminder';
import { addDays, isSameDay, startOfWeek, weekdayOf, WEEKDAYS_SHORT } from '@/utils/date';
import {
  formatClock, formatDate, formatDurationWords, formatNumber, formatPercent, formatSigned, formatVolume, formatWeekdayDate, pluralExercises,
} from '@/utils/format';
import {
  latestWeight, percentChange, sessionSetCount, sessionsBetween, sessionVolume, sumVolume, weeklyBuckets, weightChangeSince, weightSeries,
} from '@/utils/stats';
import type { WorkoutPlan } from '@/types';

const SeeAll = ({ to, children }: { to: string; children: string }) => (
  <Link to={to} className="inline-flex h-9 items-center gap-0.5 rounded-full px-3 text-[14px] font-medium text-muted transition hover:bg-white/[0.06] hover:text-fg">
    {children} <ChevronRight size={16} aria-hidden />
  </Link>
);

export default function Dashboard() {
  usePageTitle('Головна');
  const { data, sessions, records } = useData();
  const openStart = useStartSheet();

  const firstName = data.user.name.trim().split(/\s+/)[0] || '';
  const now = new Date();

  const stats = useMemo(() => {
    const last30 = sessionsBetween(sessions, addDays(now, -30), now);
    const prev30 = sessionsBetween(sessions, addDays(now, -60), addDays(now, -30));
    const weeks = weeklyBuckets(sessions, 9, now);
    const past = weeks.slice(0, -1).slice(-4);
    const thisWeekSessions = sessions.filter((s) => new Date(s.startedAt) >= startOfWeek(now));
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const setsByWeek = weeklyBuckets(sessions, 5, now).map((b) =>
      sessions.filter((s) => new Date(s.startedAt) >= b.start && new Date(s.startedAt) < addDays(b.start, 7)).reduce((n, s) => n + sessionSetCount(s), 0),
    );
    return {
      count: last30.length,
      countDelta: last30.length - prev30.length,
      volume: sumVolume(last30),
      volumeChange: percentChange(sumVolume(last30), sumVolume(prev30)),
      weekCount: thisWeekSessions.length,
      weekVolume: sumVolume(thisWeekSessions),
      weekSets: thisWeekSessions.reduce((n, s) => n + sessionSetCount(s), 0),
      avgVolume: avg(past.map((b) => b.volume)),
      avgSets: avg(setsByWeek.slice(0, -1)),
      sparkCount: weeks.slice(1).map((b) => b.count),
      sparkVolume: weeks.slice(1).map((b) => b.volume),
    };
    // Recompute when sessions change; `now` is intentionally per-render.
  }, [sessions]);

  const weight = latestWeight(data.bodyWeight);
  const weightDelta = weightChangeSince(data.bodyWeight, addDays(now, -30));
  const weightSpark = weightSeries(data.bodyWeight).slice(-10).map((p) => p.weight);
  const wantsGain = data.user.goal === 'muscle' || data.user.goal === 'strength';
  const lastSession = sessions[0];
  const recentRecords = [...records.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const target = data.user.weeklyWorkoutsTarget;

  const rings: Ring[] = [
    { label: 'Тренування', value: stats.weekCount, max: target, color: 'move' },
    { label: 'Обсяг', value: stats.weekVolume, max: stats.avgVolume || 1, color: 'volume' },
    { label: 'Підходи', value: stats.weekSets, max: stats.avgSets || 1, color: 'sets' },
  ];

  return (
    <div className="space-y-10">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{formatWeekdayDate(now)}</p>
          <h1 className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[44px]">
            {firstName ? `Привіт, ${firstName}` : 'Привіт'}
          </h1>
          <p className="mt-2 text-[15px] text-muted">Твій прогрес — результат регулярності.</p>
        </div>
        <Link to="/profile" aria-label="Профіль" className="shrink-0 rounded-full lg:hidden">
          <Avatar name={data.user.name} src={data.user.avatar} size={48} />
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Weekly activity rings */}
        <section aria-labelledby="activity-title" className="card relative overflow-clip p-5 sm:p-6">
          <div className="glow-blob -left-24 -top-24 h-64 w-64 bg-move/[0.08]" aria-hidden />
          <div className="relative flex items-center justify-between">
            <h2 id="activity-title" className="eyebrow">
              Активність тижня
            </h2>
            <span className="font-mono text-[11px] text-subtle">vs середнє 4 тиж.</span>
          </div>
          <div className="relative mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
            <ActivityRings rings={rings} size={176} stroke={17} gap={4} />
            <dl className="grid w-full grid-cols-3 gap-3 sm:grid-cols-1 sm:gap-4">
              <RingLegend color="text-move" label="Тренування" value={String(stats.weekCount)} suffix={`/${target}`} />
              <RingLegend color="text-volume" label="Обсяг" value={formatCompact(stats.weekVolume)} suffix="кг" />
              <RingLegend color="text-sets" label="Підходи" value={String(stats.weekSets)} suffix={stats.avgSets ? `/${Math.round(stats.avgSets)}` : ''} />
            </dl>
          </div>
        </section>

        <TodayCard />
      </div>

      <BackupReminder />

      <section aria-label="Коротка статистика" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Тренування"
          color="move"
          value={stats.count}
          spark={stats.sparkCount}
          trend={stats.countDelta !== 0 ? { value: formatSigned(stats.countDelta), direction: stats.countDelta > 0 ? 'up' : 'down', hint: 'за 30 дн.' } : { value: 'за 30 днів', direction: 'flat' }}
        />
        <StatCard
          label="Вага"
          color="body"
          value={weight ? formatNumber(weight.weight, 1) : '—'}
          unit={weight ? 'кг' : undefined}
          spark={weightSpark}
          trend={
            weightDelta != null && weightDelta !== 0
              ? { value: formatSigned(weightDelta, 'кг'), direction: weightDelta > 0 ? 'up' : 'down', positive: wantsGain ? weightDelta > 0 : weightDelta < 0, hint: '30 дн.' }
              : undefined
          }
        />
        <StatCard label="Обсяг" color="volume" value={formatCompact(stats.volume)} unit="кг" spark={stats.sparkVolume} trend={{ value: 'за 30 днів', direction: 'flat' }} />
        <StatCard
          label="Прогрес"
          color="accent"
          value={stats.volumeChange != null ? formatPercent(stats.volumeChange) : '—'}
          valueClassName={clsx(stats.volumeChange != null && stats.volumeChange > 0 && 'text-positive')}
          trend={{ value: stats.volumeChange != null ? 'обсяг до мин. 30 дн.' : 'замало даних', direction: 'flat' }}
        />
      </section>

      <WeekPlan />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-6">
        <Section title="Останнє тренування" action={sessions.length > 0 && <SeeAll to="/history">Журнал</SeeAll>}>
          {lastSession ? (
            <Link to={`/history/${lastSession.id}`} className="card-interactive block p-5">
              <div className="flex items-center gap-3.5">
                <IconBadge icon={lastSession.icon} tone="move" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[17px] font-semibold">{lastSession.name}</h3>
                  <p className="text-[13px] text-muted">{formatDate(lastSession.startedAt)}</p>
                </div>
                <ChevronRight size={20} className="text-subtle" aria-hidden />
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-2">
                <Metric label="Час" value={formatClock(lastSession.durationSec)} />
                <Metric label="Вправ" value={String(lastSession.exercises.length)} />
                <Metric label="Обсяг" value={formatVolume(sessionVolume(lastSession))} color="text-volume" />
              </dl>
            </Link>
          ) : (
            <EmptyState
              icon={Clock}
              title="Поки що немає тренувань"
              description="Почни перше тренування — і тут зʼявиться підсумок."
              action={
                <Button icon={Play} onClick={openStart}>
                  Почати тренування
                </Button>
              }
            />
          )}
        </Section>

        <Section title="Рекорди" action={recentRecords.length > 0 && <SeeAll to="/progress#records">Усі</SeeAll>}>
          {recentRecords.length > 0 ? (
            <ul className="card divide-y divide-white/[0.06]">
              {recentRecords.map((r) => (
                <li key={r.exerciseId}>
                  <Link to={`/exercises/${r.exerciseId}`} className="flex items-center gap-3.5 p-4 transition hover:bg-white/[0.03]">
                    <IconBadge icon={Trophy} tone="warning" size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{r.name}</span>
                      <span className="block font-mono text-[11px] uppercase tracking-wider text-subtle">{formatDate(r.date)}</span>
                    </span>
                    <span className="metric text-[18px]">
                      {formatNumber(r.weight, 2)}
                      <span className="ml-1 font-mono text-[11px] font-medium tracking-normal text-subtle">кг × {r.reps}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Trophy} title="Рекордів ще немає" description="Вони зʼявляться, щойно ти перевершиш свої попередні результати." />
          )}
        </Section>
      </div>
    </div>
  );
}

/** 146084 → "146k", 9500 → "9 500" */
function formatCompact(kg: number) {
  return kg >= 100_000 ? `${formatNumber(Math.round(kg / 1000))}k` : formatNumber(Math.round(kg));
}

function RingLegend({ color, label, value, suffix }: { color: string; label: string; value: string; suffix?: string }) {
  return (
    <div className="min-w-0">
      <dt className={clsx('font-mono text-[11px] font-medium uppercase tracking-[0.12em]', color)}>{label}</dt>
      <dd className="metric mt-1.5 truncate text-[26px] sm:text-[30px]">
        {value}
        {suffix && <span className="ml-0.5 text-[15px] font-medium tracking-normal text-subtle">{suffix}</span>}
      </dd>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-[14px] bg-white/[0.04] px-3 py-2.5">
      <dt className="eyebrow">{label}</dt>
      <dd className={clsx('metric mt-1.5 text-[17px]', color)}>{value}</dd>
    </div>
  );
}

/** Hero "poster" for today's workout. */
function TodayCard() {
  const { data, sessions, exerciseById } = useData();
  const { active } = useActiveWorkout();
  const begin = useStartWorkout();
  const openStart = useStartSheet();
  const todayPlans = useTodayPlans();
  const now = new Date();

  const pending = todayPlans.find((t) => !t.doneToday)?.plan;
  const doneToday = sessions.find((s) => isSameDay(s.startedAt, now));
  const nextPlan = (() => {
    const today = weekdayOf(now);
    for (let i = 1; i <= 7; i++) {
      const day = ((today + i) % 7) as typeof today;
      const plan = data.plans.find((p) => p.days.includes(day));
      if (plan) return { plan, inDays: i };
    }
    return null;
  })();

  let eyebrow = 'Сьогодні';
  let title: string;
  let meta: React.ReactNode;
  let chips: string[] = [];
  let link: string | undefined;
  let action: React.ReactNode;
  let mood: 'go' | 'done' | 'rest' = 'go';

  if (active) {
    eyebrow = 'Триває зараз';
    title = active.name;
    meta = `${active.exercises.filter((e) => e.finished).length} з ${active.exercises.length} вправ виконано`;
    action = (
      <ButtonLink to="/active" size="lg" icon={Play} block>
        Продовжити тренування
      </ButtonLink>
    );
  } else if (pending) {
    title = pending.name;
    meta = <PlanMeta plan={pending} />;
    chips = pending.exercises.slice(0, 3).map((e) => exerciseById(e.exerciseId)?.name ?? '').filter(Boolean);
    link = `/workout/${pending.id}`;
    action = (
      <Button size="lg" icon={Play} block onClick={() => begin(pending)}>
        Почати тренування
      </Button>
    );
  } else if (doneToday) {
    mood = 'done';
    title = 'Тренування виконано';
    meta = `${doneToday.name} · ${formatDurationWords(doneToday.durationSec)} · ${formatVolume(sessionVolume(doneToday))}`;
    link = `/history/${doneToday.id}`;
    action = (
      <Button size="lg" variant="secondary" icon={Plus} block onClick={openStart}>
        Ще одне тренування
      </Button>
    );
  } else {
    mood = 'rest';
    title = 'День відновлення';
    meta = nextPlan ? `Далі: ${nextPlan.plan.name} — ${nextPlan.inDays === 1 ? 'завтра' : `через ${nextPlan.inDays} дн.`}` : 'На сьогодні тренувань не заплановано';
    action = (
      <Button size="lg" variant="secondary" icon={Sparkles} block onClick={openStart}>
        Вільне тренування
      </Button>
    );
  }

  const heading = (
    <>
      <p className="eyebrow flex items-center gap-2 text-fg/70">
        {mood === 'go' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />}
        {mood === 'done' && <Check size={13} className="text-positive" aria-hidden />}
        {mood === 'rest' && <Moon size={13} aria-hidden />}
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[32px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[40px]">{title}</h2>
      <div className="mt-2 text-[15px] text-muted">{meta}</div>
    </>
  );

  return (
    <section
      aria-label="Сьогоднішнє тренування"
      className="relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-card border border-white/[0.08] p-5 sm:p-6"
      style={{
        background:
          mood === 'rest'
            ? 'radial-gradient(120% 90% at 100% 0%, rgb(var(--c-body) / 0.18) 0%, transparent 55%), linear-gradient(160deg, rgb(24 24 27) 0%, rgb(12 12 14) 100%)'
            : 'radial-gradient(110% 90% at 100% 0%, rgb(var(--c-accent) / 0.26) 0%, transparent 55%), radial-gradient(80% 70% at 0% 100%, rgb(var(--c-volume) / 0.12) 0%, transparent 60%), linear-gradient(160deg, rgb(24 24 27) 0%, rgb(12 12 14) 100%)',
      }}
    >
      <div className="relative">
        {link ? (
          <Link to={link} className="group block">
            {heading}
            <ChevronRight size={22} className="absolute right-0 top-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden />
          </Link>
        ) : (
          heading
        )}
        {chips.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Вправи">
            {chips.map((c) => (
              <li key={c} className="max-w-full truncate rounded-full bg-white/[0.07] px-3 py-1.5 text-[12.5px] text-fg/80 backdrop-blur">
                {c}
              </li>
            ))}
            {pending && pending.exercises.length > chips.length && (
              <li className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[12.5px] text-subtle">+{pending.exercises.length - chips.length}</li>
            )}
          </ul>
        )}
      </div>
      <div className="relative mt-6">{action}</div>
    </section>
  );
}

function PlanMeta({ plan }: { plan: WorkoutPlan }) {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="inline-flex items-center gap-1.5">
        <Clock size={15} aria-hidden />≈ {plan.estimatedMinutes} хв
      </span>
      <span className="inline-flex items-center gap-1.5">
        <ListChecks size={15} aria-hidden />
        {pluralExercises(plan.exercises.length)}
      </span>
    </span>
  );
}

/** Apple-Fitness-style week: a mini ring per day + this week's schedule. */
function WeekPlan() {
  const { data, sessions } = useData();
  const today = new Date();
  const weekStart = startOfWeek(today);
  const todayIdx = weekdayOf(today);

  const days = WEEKDAYS_SHORT.map((label, i) => {
    const date = addDays(weekStart, i);
    const plans = data.plans.filter((p) => p.days.includes(i as 0));
    const done = sessions.filter((s) => isSameDay(s.startedAt, date));
    return { label, i, date, plans, done };
  });

  // One row per finished workout, plus every scheduled plan not yet done that day.
  const rows = days.flatMap(({ label, i, plans, done }) => [
    ...done.map((s) => ({ key: s.id, label, i, name: s.name, to: `/history/${s.id}`, done: true })),
    ...plans
      .filter((p) => !done.some((s) => s.planId === p.id))
      .map((p) => ({ key: `${p.id}-${i}`, label, i, name: p.name, to: `/workout/${p.id}`, done: false })),
  ]);

  return (
    <Section title="Цей тиждень" action={<SeeAll to="/plan">План</SeeAll>}>
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
        <div className="card p-4 sm:p-5">
          <ol className="grid grid-cols-7 gap-1" aria-label="Дні тижня">
            {days.map(({ label, i, date, plans, done: doneList }) => {
              const isToday = i === todayIdx;
              const past = i < todayIdx;
              const plan = plans[0];
              const done = doneList.length > 0;
              return (
                <li key={label} className="flex flex-col items-center gap-2">
                  <span className={clsx('font-mono text-[11px] font-medium uppercase', isToday ? 'text-fg' : 'text-subtle')}>{label}</span>
                  <ActivityRings
                    size={38}
                    stroke={5}
                    rings={[{ label, value: done ? 1 : 0, max: 1, color: 'move' }]}
                    label={`${label}: ${done ? 'виконано' : plan ? (past ? 'пропущено' : 'заплановано') : 'відпочинок'}`}
                  >
                    {done ? (
                      <Check size={14} strokeWidth={3} className="text-move" aria-hidden />
                    ) : (
                      <span
                        className={clsx(
                          'tabular flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold',
                          isToday ? 'bg-fg text-black' : plan ? 'text-fg' : 'text-subtle',
                        )}
                      >
                        {date.getDate()}
                      </span>
                    )}
                  </ActivityRings>
                  <span className={clsx('h-1 w-1 rounded-full', plan && !done ? (past ? 'bg-negative/70' : 'bg-accent') : 'bg-transparent')} aria-hidden />
                </li>
              );
            })}
          </ol>

          <ul className="mt-4 space-y-1 border-t border-white/[0.06] pt-3">
            {rows.map(({ key, label, i, name, to, done }) => {
              const isToday = i === todayIdx;
              const status = done ? 'Виконано' : isToday ? 'Сьогодні' : i < todayIdx ? 'Пропущено' : 'Заплановано';
              return (
                <li key={key}>
                  <Link to={to} className="-mx-2 flex min-h-[52px] items-center gap-3 rounded-[14px] px-2 transition hover:bg-white/[0.04]">
                    <span className={clsx('w-7 font-mono text-[12px] font-medium uppercase', isToday ? 'text-fg' : 'text-subtle')}>{label}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{name}</span>
                    <span
                      className={clsx(
                        'shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                        done ? 'bg-move/[0.14] text-move' : isToday ? 'bg-fg text-black' : i < todayIdx ? 'text-negative/80' : 'text-subtle',
                      )}
                    >
                      {status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Section>
  );
}
