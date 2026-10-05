import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Check, Clock, Dumbbell, House, Layers, NotebookText, TrendingDown, TrendingUp, Trophy, Weight } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActivityRings } from '@/components/ui/ActivityRings';
import { formatClock, formatNumber, formatPercent, formatVolume } from '@/utils/format';
import { percentChange, sessionRecords, sessionSetCount, sessionVolume } from '@/utils/stats';

export default function WorkoutSummary() {
  usePageTitle('Тренування завершено');
  const { id } = useParams();
  const { data, sessions } = useData();
  const session = sessions.find((s) => s.id === id);

  const info = useMemo(() => {
    if (!session) return null;
    const previous = sessions.find((s) => s.id !== session.id && s.startedAt < session.startedAt && (session.planId ? s.planId === session.planId : s.name === session.name));
    const volume = sessionVolume(session);
    const sets = sessionSetCount(session);
    const plan = data.plans.find((p) => p.id === session.planId);
    return {
      volume,
      sets,
      rings: [
        { label: 'Обсяг', value: volume, max: previous ? sessionVolume(previous) : volume, color: 'volume' as const },
        { label: 'Підходи', value: sets, max: previous ? sessionSetCount(previous) : sets, color: 'sets' as const },
        { label: 'Час', value: session.durationSec, max: plan ? plan.estimatedMinutes * 60 : session.durationSec, color: 'move' as const },
      ],
      records: sessionRecords(sessions, session),
      volumeChange: previous ? percentChange(volume, sessionVolume(previous)) : null,
    };
  }, [session, sessions, data.plans]);

  if (!session || !info) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16">
        <EmptyState
          icon={Dumbbell}
          title="Тренування не знайдено"
          action={
            <ButtonLink to="/" icon={House}>
              На головну
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const stats = [
    { icon: Clock, label: 'Тривалість', value: formatClock(session.durationSec), color: 'text-move' },
    { icon: Dumbbell, label: 'Вправ', value: String(session.exercises.length), color: 'text-fg' },
    { icon: Weight, label: 'Загальна вага', value: formatVolume(info.volume), color: 'text-volume' },
    { icon: Layers, label: 'Підходів', value: String(info.sets), color: 'text-sets' },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4" style={{ paddingTop: 'calc(48px + var(--safe-top))', paddingBottom: 'calc(24px + var(--safe-bottom))' }}>
      <div className="relative flex flex-col items-center text-center">
        <div className="glow-blob -top-10 h-64 w-64 bg-accent/[0.12]" aria-hidden />
        <ActivityRings rings={info.rings} size={200} stroke={20} gap={5} label="Порівняння з минулим разом">
          <span className="inline-flex h-12 w-12 animate-pop items-center justify-center rounded-full bg-accent text-black [animation-delay:900ms]">
            <Check size={26} strokeWidth={3} aria-hidden />
          </span>
        </ActivityRings>
        <p className="eyebrow mt-6 animate-slide-up">Тренування завершено</p>
        <h1 className="mt-2 animate-slide-up text-[38px] font-bold leading-tight tracking-[-0.045em] [animation-delay:60ms]">Чудова робота!</h1>
        <p className="mt-1 animate-slide-up text-[16px] text-muted [animation-delay:100ms]">{session.name}</p>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3">
        {stats.map(({ icon: Icon, label, value, color }, i) => (
          <div key={label} className="card animate-slide-up p-4" style={{ animationDelay: `${140 + i * 50}ms` }}>
            <dt className="eyebrow flex items-center gap-1.5">
              <Icon size={13} aria-hidden /> {label}
            </dt>
            <dd className={`metric mt-3 text-[28px] ${color}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {info.volumeChange != null && (
        <p
          className={clsx(
            'mt-3 flex animate-slide-up items-center justify-center gap-1.5 rounded-card border p-3 text-[14px] font-medium [animation-delay:360ms]',
            info.volumeChange >= 0 ? 'border-positive/20 bg-positive/[0.06] text-positive' : 'border-line bg-surface text-muted',
          )}
        >
          {info.volumeChange >= 0 ? <TrendingUp size={16} aria-hidden /> : <TrendingDown size={16} aria-hidden />}
          Обсяг {formatPercent(info.volumeChange)} порівняно з минулим разом
        </p>
      )}

      <section aria-labelledby="new-records" className="mt-6 animate-slide-up [animation-delay:420ms]">
        <h2 id="new-records" className="mb-3 text-[17px] font-semibold">
          Нові рекорди
        </h2>
        {info.records.length > 0 ? (
          <ul className="space-y-2">
            {info.records.map((r, i) => (
              <li key={r.exerciseId} className="card flex items-center gap-3 border-warning/25 bg-warning/[0.04] p-3.5">
                <span className="inline-flex h-10 w-10 animate-pop items-center justify-center rounded-ctl bg-warning/15 text-warning" style={{ animationDelay: `${520 + i * 120}ms` }}>
                  <Trophy size={20} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{r.name}</span>
                <span className="tabular text-[15px] font-semibold">
                  {formatNumber(r.weight, 2)} кг × {r.reps}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-4 text-[14px] text-muted">Цього разу без нових рекордів — регулярність теж прогрес.</p>
        )}
      </section>

      <div className="mt-auto grid gap-3 pt-8 sm:grid-cols-2">
        <ButtonLink to={`/history/${session.id}`} variant="secondary" size="lg" icon={NotebookText} replace>
          Деталі в журналі
        </ButtonLink>
        <ButtonLink to="/" size="lg" icon={House} replace>
          На головну
        </ButtonLink>
      </div>
    </div>
  );
}
