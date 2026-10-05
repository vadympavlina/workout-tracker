import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  CalendarCheck, CalendarDays, Check, ChevronRight, Clock, Dumbbell, Flame, Moon, Play, Plus, Scale, Trophy, Weight,
} from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useActiveWorkout } from '@/store/ActiveWorkoutContext';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { useTodayPlans } from '@/hooks/useTodayPlans';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStartSheet } from '@/layouts/AppLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, Section } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { IconBadge } from '@/components/ui/IconBadge';
import { ProgressRing } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { addDays, isSameDay, startOfWeek, weekdayOf, WEEKDAYS_SHORT } from '@/utils/date';
import {
  formatDate, formatDurationWords, formatNumber, formatPercent, formatSigned, formatVolume, formatWeekdayDate, pluralExercises,
} from '@/utils/format';
import { latestWeight, percentChange, sessionsBetween, sessionVolume, sumVolume, weightChangeSince } from '@/utils/stats';

export default function Dashboard() {
  usePageTitle('Головна');
  const { data, sessions, records } = useData();
  const { active } = useActiveWorkout();
  const begin = useStartWorkout();
  const openStart = useStartSheet();
  const todayPlans = useTodayPlans();

  const firstName = data.user.name.trim().split(/\s+/)[0] || '';
  const now = new Date();

  const stats = useMemo(() => {
    const last30 = sessionsBetween(sessions, addDays(now, -30), now);
    const prev30 = sessionsBetween(sessions, addDays(now, -60), addDays(now, -30));
    const volume = sumVolume(last30);
    const weekStart = startOfWeek(now);
    return {
      count: last30.length,
      countDelta: last30.length - prev30.length,
      volume,
      volumeChange: percentChange(volume, sumVolume(prev30)),
      thisWeek: sessions.filter((s) => new Date(s.startedAt) >= weekStart).length,
    };
  }, [sessions]);

  const weight = latestWeight(data.bodyWeight);
  const weightDelta = weightChangeSince(data.bodyWeight, addDays(now, -30));
  const wantsGain = data.user.goal === 'muscle' || data.user.goal === 'strength';
  const lastSession = sessions[0];
  const recentRecords = [...records.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  const pendingToday = todayPlans.find((t) => !t.doneToday);
  const doneTodaySession = sessions.find((s) => isSameDay(s.startedAt, now));
  const nextPlan = useMemo(() => {
    const today = weekdayOf(now);
    for (let i = 1; i <= 7; i++) {
      const day = ((today + i) % 7) as typeof today;
      const plan = data.plans.find((p) => p.days.includes(day));
      if (plan) return { plan, inDays: i };
    }
    return null;
  }, [data.plans]);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{formatWeekdayDate(now)}</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
            {firstName ? `Привіт, ${firstName}` : 'Привіт'}
          </h1>
          <p className="mt-1 text-[15px] text-muted">Твій прогрес — результат регулярності.</p>
        </div>
        <Link to="/profile" aria-label="Профіль" className="shrink-0 rounded-full lg:hidden">
          <Avatar name={data.user.name} src={data.user.avatar} size={48} />
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Today */}
        <Card padding="lg" className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" aria-hidden />
          <p className="eyebrow">Сьогодні</p>
          {active ? (
            <TodayBlock
              icon={active.icon}
              title={active.name}
              meta={`Тренування триває · ${active.exercises.filter((e) => e.finished).length} / ${active.exercises.length} вправ`}
              action={
                <ButtonLink to="/active" size="lg" icon={Play} block>
                  Продовжити тренування
                </ButtonLink>
              }
            />
          ) : pendingToday ? (
            <TodayBlock
              icon={pendingToday.plan.icon}
              title={pendingToday.plan.name}
              meta={`≈ ${pendingToday.plan.estimatedMinutes} хв · ${pluralExercises(pendingToday.plan.exercises.length)}`}
              link={`/workout/${pendingToday.plan.id}`}
              action={
                <Button size="lg" icon={Play} block onClick={() => begin(pendingToday.plan)}>
                  Почати тренування
                </Button>
              }
            />
          ) : doneTodaySession ? (
            <TodayBlock
              icon={CalendarCheck}
              tone="positive"
              title="Тренування виконано"
              meta={`${doneTodaySession.name} · ${formatDurationWords(doneTodaySession.durationSec)} · ${formatVolume(sessionVolume(doneTodaySession))}`}
              link={`/history/${doneTodaySession.id}`}
              action={
                <Button size="lg" variant="secondary" icon={Plus} block onClick={openStart}>
                  Ще одне тренування
                </Button>
              }
            />
          ) : (
            <TodayBlock
              icon={Moon}
              tone="neutral"
              title="День відновлення"
              meta={
                nextPlan
                  ? `Далі: ${nextPlan.plan.name} — ${nextPlan.inDays === 1 ? 'завтра' : `через ${nextPlan.inDays} дн.`}`
                  : 'На сьогодні тренувань не заплановано'
              }
              action={
                <Button size="lg" icon={Play} block onClick={openStart}>
                  Почати тренування
                </Button>
              }
            />
          )}
        </Card>

        {/* Weekly goal */}
        <Card padding="lg" className="flex items-center gap-5">
          <ProgressRing value={stats.thisWeek} max={data.user.weeklyWorkoutsTarget} size={92} stroke={8} label="Ціль тижня">
            <span className="tabular text-[22px] font-semibold">
              {stats.thisWeek}
              <span className="text-[14px] text-subtle">/{data.user.weeklyWorkoutsTarget}</span>
            </span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="eyebrow">Ціль тижня</p>
            <p className="mt-1.5 text-[17px] font-semibold leading-snug">
              {stats.thisWeek >= data.user.weeklyWorkoutsTarget
                ? 'Ціль виконано!'
                : `Ще ${data.user.weeklyWorkoutsTarget - stats.thisWeek} до цілі`}
            </p>
            <p className="mt-1 text-[14px] text-muted">Тренувань цього тижня</p>
          </div>
        </Card>
      </div>

      <section aria-label="Коротка статистика" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Тренування"
          value={stats.count}
          icon={Dumbbell}
          trend={
            stats.countDelta !== 0
              ? { value: formatSigned(stats.countDelta), direction: stats.countDelta > 0 ? 'up' : 'down', hint: 'за 30 дн.' }
              : { value: 'за 30 днів', direction: 'flat' }
          }
        />
        <StatCard
          label="Вага"
          value={weight ? formatNumber(weight.weight, 1) : '—'}
          unit={weight ? 'кг' : undefined}
          icon={Scale}
          trend={
            weightDelta != null && weightDelta !== 0
              ? { value: formatSigned(weightDelta, 'кг'), direction: weightDelta > 0 ? 'up' : 'down', positive: wantsGain ? weightDelta > 0 : weightDelta < 0, hint: '30 дн.' }
              : undefined
          }
        />
        <StatCard
          label="Обсяг, 30 дн."
          value={formatNumber(Math.round(stats.volume))}
          unit="кг"
          icon={Weight}
        />
        <StatCard
          label="Прогрес обсягу"
          value={stats.volumeChange != null ? formatPercent(stats.volumeChange) : '—'}
          icon={Flame}
          trend={
            stats.volumeChange != null
              ? { value: 'до попередніх 30 дн.', direction: 'flat' }
              : { value: 'замало даних', direction: 'flat' }
          }
          valueClassName={clsx(stats.volumeChange != null && stats.volumeChange > 0 && 'text-positive')}
        />
      </section>

      <WeekPlan />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section
          title="Останнє тренування"
          action={
            sessions.length > 0 && (
              <Link to="/history" className="inline-flex h-9 items-center gap-1 rounded-xl px-2 text-[14px] font-medium text-accent hover:bg-accent/10">
                Журнал <ChevronRight size={16} aria-hidden />
              </Link>
            )
          }
        >
          {lastSession ? (
            <Link to={`/history/${lastSession.id}`} className="card-interactive block p-4 sm:p-5">
              <div className="flex items-center gap-3.5">
                <IconBadge icon={lastSession.icon} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[16px] font-semibold">{lastSession.name}</h3>
                  <p className="text-[13px] text-muted">{formatDate(lastSession.startedAt)}</p>
                </div>
                <ChevronRight size={20} className="text-subtle" aria-hidden />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
                <Metric label="Тривалість" value={formatDurationWords(lastSession.durationSec)} />
                <Metric label="Вправ" value={String(lastSession.exercises.length)} />
                <Metric label="Обсяг" value={formatVolume(sessionVolume(lastSession))} />
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

        <Section
          title="Рекорди"
          action={
            recentRecords.length > 0 && (
              <Link to="/progress#records" className="inline-flex h-9 items-center gap-1 rounded-xl px-2 text-[14px] font-medium text-accent hover:bg-accent/10">
                Усі <ChevronRight size={16} aria-hidden />
              </Link>
            )
          }
        >
          {recentRecords.length > 0 ? (
            <ul className="card divide-y divide-line">
              {recentRecords.map((r) => (
                <li key={r.exerciseId}>
                  <Link to={`/exercises/${r.exerciseId}`} className="flex items-center gap-3.5 p-4 transition hover:bg-white/[0.02]">
                    <IconBadge icon={Trophy} tone="warning" size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{r.name}</span>
                      <span className="block text-[13px] text-subtle">{formatDate(r.date)}</span>
                    </span>
                    <span className="tabular text-[15px] font-semibold">
                      {formatNumber(r.weight, 2)} кг × {r.reps}
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

function TodayBlock({
  icon, title, meta, action, link, tone = 'accent',
}: {
  icon: Parameters<typeof IconBadge>[0]['icon'];
  title: string;
  meta: string;
  action: React.ReactNode;
  link?: string;
  tone?: 'accent' | 'positive' | 'neutral';
}) {
  const heading = (
    <div className="flex items-center gap-4">
      <IconBadge icon={icon} size="lg" tone={tone} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[22px] font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-[14px] text-muted">{meta}</p>
      </div>
      {link && <ChevronRight size={20} className="shrink-0 text-subtle" aria-hidden />}
    </div>
  );
  return (
    <div className="relative mt-4 space-y-5">
      {link ? (
        <Link to={link} className="-m-2 block rounded-ctl p-2 transition hover:bg-white/[0.03]">
          {heading}
        </Link>
      ) : (
        heading
      )}
      {action}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-subtle">{label}</dt>
      <dd className="tabular mt-0.5 text-[15px] font-semibold">{value}</dd>
    </div>
  );
}

function WeekPlan() {
  const { data, sessions } = useData();
  const today = new Date();
  const weekStart = startOfWeek(today);
  const todayIdx = weekdayOf(today);

  return (
    <Section
      title="План на тиждень"
      action={
        <Link to="/plan" className="inline-flex h-9 items-center gap-1 rounded-xl px-2 text-[14px] font-medium text-accent hover:bg-accent/10">
          Усі плани <ChevronRight size={16} aria-hidden />
        </Link>
      }
    >
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
        <ol className="scrollbar-none -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0">
          {WEEKDAYS_SHORT.map((label, i) => {
            const date = addDays(weekStart, i);
            const plan = data.plans.find((p) => p.days.includes(i as 0));
            const done = sessions.some((s) => isSameDay(s.startedAt, date));
            const isToday = i === todayIdx;
            const content = (
              <>
                <span className={clsx('text-[12px] font-semibold uppercase tracking-wide', isToday ? 'text-accent' : 'text-subtle')}>{label}</span>
                <span className="tabular text-[13px] text-subtle">{date.getDate()}</span>
                <span className="mt-auto flex h-6 items-center">
                  {done ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-positive/15 text-positive" aria-label="Виконано">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  ) : plan ? (
                    <span className={clsx('h-1.5 w-1.5 rounded-full', isToday ? 'bg-accent' : 'bg-white/30')} aria-hidden />
                  ) : null}
                </span>
                <span className={clsx('line-clamp-2 text-[13px] font-medium leading-tight', plan ? 'text-fg' : 'text-subtle')}>
                  {plan ? plan.name : 'Відпочинок'}
                </span>
              </>
            );
            const cls = clsx(
              'flex h-[132px] w-[104px] shrink-0 snap-start flex-col items-start gap-1 rounded-card border p-3 text-left transition sm:w-auto',
              isToday ? 'border-accent/40 bg-accent/[0.06]' : 'border-line bg-surface',
              plan && 'hover:border-white/[0.14] hover:bg-elevated',
            );
            return (
              <li key={label} className="contents">
                {plan ? (
                  <Link to={`/workout/${plan.id}`} className={cls} aria-label={`${label}: ${plan.name}${done ? ', виконано' : ''}`}>
                    {content}
                  </Link>
                ) : (
                  <div className={cls}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
