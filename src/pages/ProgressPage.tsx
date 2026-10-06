import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ChartLine, ChevronRight, Clock, Dumbbell, Hourglass, Play, Scale, Timer, Trophy, Weight } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStartSheet } from '@/layouts/AppLayout';
import { TopBar } from '@/components/ui/TopBar';
import { Card, Section } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button, ButtonLink } from '@/components/ui/Button';
import { IconBadge } from '@/components/ui/IconBadge';
import { BarsChart, TrendChart } from '@/components/charts/Chart';
import { ActivityHeatmap } from '@/components/charts/ActivityHeatmap';
import { addDays, daysBetween } from '@/utils/date';
import { formatDate, formatHours, formatNumber, formatPercent, formatSigned, formatVolume, pluralWorkouts } from '@/utils/format';
import {
  exerciseProgress, latestWeight, percentChange, sessionsBetween, sumDuration, sumVolume, weeklyBuckets, weightChangeSince, weightSeries,
} from '@/utils/stats';

type Period = '4w' | '3m' | '1y' | 'all';
const PERIODS: { value: Period; label: string }[] = [
  { value: '4w', label: '4 тиж.' },
  { value: '3m', label: '3 міс.' },
  { value: '1y', label: 'Рік' },
  { value: 'all', label: 'Усе' },
];

export default function ProgressPage() {
  usePageTitle('Прогрес');
  const { data, sessions, records } = useData();
  const openStart = useStartSheet();
  const { hash } = useLocation();
  const [period, setPeriod] = useState<Period>('3m');

  useEffect(() => {
    if (hash === '#records') document.getElementById('records')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  const view = useMemo(() => {
    const now = new Date();
    const oldest = sessions.length ? new Date(sessions[sessions.length - 1].startedAt) : now;
    const days = period === '4w' ? 28 : period === '3m' ? 91 : period === '1y' ? 365 : Math.max(28, daysBetween(oldest, now) + 1);
    const from = addDays(now, -days);
    const current = sessionsBetween(sessions, from, now);
    const previous = sessionsBetween(sessions, addDays(from, -days), from);
    const weeks = Math.min(104, Math.max(4, Math.ceil(days / 7)));
    const all = weeklyBuckets(sessions, weeks, now);
    // Skip empty weeks before the first workout so the chart doesn't fake a drop to zero.
    const firstActive = all.findIndex((b) => b.count > 0);
    const buckets = firstActive > 0 ? all.slice(Math.min(firstActive, all.length - 4)) : all;
    const volume = sumVolume(current);
    const duration = sumDuration(current);
    return {
      from,
      current,
      volume,
      volumeChange: period === 'all' ? null : percentChange(volume, sumVolume(previous)),
      countChange: period === 'all' ? null : current.length - previous.length,
      duration,
      avgDuration: current.length ? duration / current.length : 0,
      buckets,
      progress: exerciseProgress(current).slice(0, 8),
    };
  }, [sessions, period]);

  const weight = latestWeight(data.bodyWeight);
  const weightDelta = weightChangeSince(data.bodyWeight, view.from);
  const weightData = weightSeries(data.bodyWeight, view.from).map((p) => ({ label: p.label, value: p.weight }));
  const wantsGain = data.user.goal === 'muscle' || data.user.goal === 'strength';
  const allRecords = [...records.values()].sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  if (sessions.length === 0) {
    return (
      <div>
        <TopBar title="Прогрес" />
        <EmptyState
          icon={ChartLine}
          title="Ще немає даних для статистики"
          description="Заверши кілька тренувань — тут зʼявляться графіки обсягу, рекорди та прогрес по вправах."
          action={
            <Button icon={Play} onClick={openStart}>
              Почати тренування
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Прогрес" subtitle="Статистика, рекорди та динаміка" />

      <SegmentedControl label="Період" value={period} onChange={setPeriod} options={PERIODS} className="mb-8 max-w-md" />

      <div className="space-y-8">
        <section aria-label="Підсумки періоду" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Тренувань"
            color="move"
            value={view.current.length}
            icon={Dumbbell}
            trend={view.countChange != null && view.countChange !== 0 ? { value: formatSigned(view.countChange), direction: view.countChange > 0 ? 'up' : 'down' } : undefined}
          />
          <StatCard
            label="Обсяг"
            color="volume"
            value={formatVolume(view.volume)}
            icon={Weight}
            trend={view.volumeChange != null ? { value: formatPercent(view.volumeChange), direction: view.volumeChange > 0 ? 'up' : view.volumeChange < 0 ? 'down' : 'flat' } : undefined}
          />
          <StatCard label="Годин" color="sets" value={formatHours(view.duration)} icon={Hourglass} />
          <StatCard label="Сер. тривалість" color="sets" value={`${Math.round(view.avgDuration / 60)} хв`} icon={Timer} />
          <StatCard label="Вага" color="body" value={weight ? formatNumber(weight.weight, 1) : '—'} unit={weight ? 'кг' : undefined} icon={Scale} />
          <StatCard
            label="Зміна ваги"
            color="body"
            value={weightDelta != null ? formatSigned(weightDelta) : '—'}
            unit={weightDelta != null ? 'кг' : undefined}
            icon={Clock}
            valueClassName={weightDelta ? ((wantsGain ? weightDelta > 0 : weightDelta < 0) ? 'text-positive' : 'text-negative') : undefined}
          />
        </section>

        <Card padding="lg">
          <h2 className="eyebrow mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-move" aria-hidden />
            Рік тренувань
          </h2>
          <ActivityHeatmap sessions={sessions} />
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            color="volume"
            title="Загальний обсяг"
            value={formatVolume(view.volume)}
            change={view.volumeChange}
          >
            <TrendChart
              tone="volume"
              data={view.buckets.map((b) => ({ label: b.label, value: Math.round(b.volume) }))}
              formatValue={(v) => `${formatNumber(v)} кг`}
              ariaLabel={`Обсяг по тижнях, загалом ${formatVolume(view.volume)}`}
            />
          </ChartCard>
          <ChartCard color="move" title="Кількість тренувань" value={pluralWorkouts(view.current.length)} caption="по тижнях">
            <BarsChart
              tone="move"
              data={view.buckets.map((b) => ({ label: b.label, value: b.count }))}
              formatValue={(v) => pluralWorkouts(v)}
              ariaLabel={`Тренувань по тижнях: ${view.current.length} за період`}
            />
          </ChartCard>
          <ChartCard
            color="body"
            title="Вага тіла"
            value={weight ? `${formatNumber(weight.weight, 1)} кг` : '—'}
            caption={weightDelta != null ? `${formatSigned(weightDelta, 'кг')} за період` : undefined}
            action={
              <Link to="/weight" className="inline-flex h-9 items-center gap-1 rounded-xl px-2 text-[14px] font-medium text-accent hover:bg-accent/10">
                Записи <ChevronRight size={16} aria-hidden />
              </Link>
            }
            className="lg:col-span-2"
          >
            {weightData.length >= 2 ? (
              <TrendChart
                data={weightData}
                tone="body"
                domain={['auto', 'auto']}
                formatValue={(v) => `${formatNumber(v, 1)} кг`}
                ariaLabel={`Зміна ваги: зараз ${weight?.weight ?? '—'} кг`}
              />
            ) : (
              <div className="flex h-[180px] flex-col items-center justify-center gap-3 text-center text-[14px] text-muted">
                Додай щонайменше два записи ваги, щоб побачити графік.
                <ButtonLink to="/weight" size="sm" variant="secondary">
                  Записати вагу
                </ButtonLink>
              </div>
            )}
          </ChartCard>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Section title="Прогрес вправ">
            {view.progress.length > 0 ? (
              <ul className="card divide-y divide-line">
                {view.progress.map((p) => (
                  <li key={p.exerciseId}>
                    <Link to={`/exercises/${p.exerciseId}`} className="flex items-center gap-3 p-4 transition hover:bg-white/[0.02]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{p.name}</span>
                        <span className="tabular block text-[13px] text-subtle">
                          {formatNumber(p.from, 2)} → {formatNumber(p.to, 2)} кг
                        </span>
                      </span>
                      <span className={`tabular text-[16px] font-semibold ${p.delta > 0 ? 'text-positive' : p.delta < 0 ? 'text-negative' : 'text-muted'}`}>
                        {formatSigned(p.delta, 'кг')}
                      </span>
                      <ChevronRight size={18} className="text-subtle" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card p-5 text-[14px] text-muted">Потрібно щонайменше два тренування з однаковою вправою за цей період.</p>
            )}
          </Section>

          <Section title="Рекорди" id="records" className="scroll-mt-6">
            {allRecords.length > 0 ? (
              <ul className="card divide-y divide-line">
                {allRecords.map((r) => (
                  <li key={r.exerciseId}>
                    <Link to={`/exercises/${r.exerciseId}`} className="flex items-center gap-3 p-4 transition hover:bg-white/[0.02]">
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
              <p className="card p-5 text-[14px] text-muted">Рекорди зʼявляться після тренувань з вагою.</p>
            )}
          </Section>
        </div>

        <Link to="/exercises" className="card-interactive flex items-center gap-4 p-4">
          <IconBadge icon={BookOpen} tone="neutral" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Історія по кожній вправі</span>
            <span className="block text-[13px] text-muted">Графіки ваги, обсягу та всі підходи</span>
          </span>
          <ChevronRight size={20} className="text-subtle" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

const DOT = { move: 'bg-move', volume: 'bg-volume', sets: 'bg-sets', body: 'bg-body', accent: 'bg-accent' } as const;

function ChartCard({
  title, value, change, caption, action, children, className, color,
}: {
  color: keyof typeof DOT;
  title: string;
  value: string;
  change?: number | null;
  caption?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card padding="lg" className={className}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="eyebrow flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${DOT[color]}`} aria-hidden />
            {title}
          </h2>
          <p className="metric mt-3 text-[34px]">{value}</p>
          {change != null ? (
            <p className={`mt-2 text-[13px] font-medium ${change >= 0 ? 'text-positive' : 'text-negative'}`}>
              {formatPercent(change)} <span className="font-normal text-subtle">до попереднього періоду</span>
            </p>
          ) : (
            caption && <p className="mt-2 text-[13px] text-subtle">{caption}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
