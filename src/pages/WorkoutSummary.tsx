import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Check, Clock, Dumbbell, House, Image as ImageIcon, Layers, NotebookText, TrendingDown, TrendingUp, Trophy, Weight } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ShareImageSheet } from '@/components/workout/ShareImageSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { MuscleMap } from '@/components/exercise/MuscleMap';
import { muscleTargets } from '@/data/exerciseMedia';
import type { Muscle } from '@/types';
import { formatClock, formatPercent, formatSet, formatVolume } from '@/utils/format';
import { percentChange, sessionRecords, sessionSetCount, sessionVolume } from '@/utils/stats';

export default function WorkoutSummary() {
  usePageTitle('Тренування завершено');
  const { id } = useParams();
  const { sessions, exerciseById } = useData();
  const session = sessions.find((s) => s.id === id);
  const [imageOpen, setImageOpen] = useState(false);

  const info = useMemo(() => {
    if (!session) return null;
    const previous = sessions.find((s) => s.id !== session.id && s.startedAt < session.startedAt && (session.planId ? s.planId === session.planId : s.name === session.name));
    const volume = sessionVolume(session);
    const sets = sessionSetCount(session);
    // Muscles this workout hit: main targets lit, helpers softer.
    const primary = new Set<Muscle>();
    const secondary = new Set<Muscle>();
    for (const e of session.exercises) {
      const t = muscleTargets(exerciseById(e.exerciseId));
      t.primary.forEach((m) => primary.add(m));
      t.secondary.forEach((m) => secondary.add(m));
    }
    primary.forEach((m) => secondary.delete(m));
    return {
      volume,
      sets,
      primary: [...primary],
      secondary: [...secondary],
      records: sessionRecords(sessions, session),
      volumeChange: previous ? percentChange(volume, sessionVolume(previous)) : null,
    };
  }, [session, sessions, exerciseById]);

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
    { icon: Weight, label: 'Обсяг', value: formatVolume(info.volume), color: 'text-volume' },
    { icon: Layers, label: 'Підходів', value: String(info.sets), color: 'text-sets' },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4" style={{ paddingTop: 'calc(48px + var(--safe-top))', paddingBottom: 'calc(24px + var(--safe-bottom))' }}>
      <div className="relative flex flex-col items-center text-center">
        <div className="glow-blob -top-10 h-64 w-64 bg-accent/[0.12]" aria-hidden />
        <div className="h-52 w-full animate-slide-up">
          <MuscleMap primary={info.primary} secondary={info.secondary} />
        </div>
        <span className="mt-5 inline-flex h-12 w-12 animate-pop items-center justify-center rounded-full bg-accent text-black shadow-glow [animation-delay:500ms]">
          <Check size={26} strokeWidth={3} aria-hidden />
        </span>
        <p className="eyebrow mt-4 animate-slide-up">Тренування завершено</p>
        <h1 className="mt-2 animate-slide-up text-display font-bold leading-tight tracking-[-0.045em] [animation-delay:60ms]">Чудова робота!</h1>
        <p className="mt-1 animate-slide-up text-callout text-muted [animation-delay:100ms]">{session.name}</p>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3">
        {stats.map(({ icon: Icon, label, value, color }, i) => (
          <div key={label} className="card animate-slide-up p-4" style={{ animationDelay: `${140 + i * 50}ms` }}>
            <dt className="eyebrow flex items-center gap-1.5">
              <Icon size={13} aria-hidden /> {label}
            </dt>
            <dd className={`metric mt-3 text-title1 ${color}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {info.volumeChange != null && (
        <p
          className={clsx(
            'mt-3 flex animate-slide-up items-center justify-center gap-1.5 rounded-card border p-3 text-subhead font-medium [animation-delay:360ms]',
            info.volumeChange >= 0 ? 'border-positive/20 bg-positive/[0.06] text-positive' : 'border-line bg-surface text-muted',
          )}
        >
          {info.volumeChange >= 0 ? <TrendingUp size={16} aria-hidden /> : <TrendingDown size={16} aria-hidden />}
          Обсяг {formatPercent(info.volumeChange)} порівняно з минулим разом
        </p>
      )}

      <section aria-labelledby="new-records" className="mt-6 animate-slide-up [animation-delay:420ms]">
        <h2 id="new-records" className="mb-3 text-headline font-semibold">
          Нові рекорди
        </h2>
        {info.records.length > 0 ? (
          <ul className="space-y-2">
            {info.records.map((r, i) => (
              <li key={r.exerciseId} className="card flex items-center gap-3 border-warning/25 bg-warning/[0.04] p-3.5">
                <span className="inline-flex h-10 w-10 animate-pop items-center justify-center rounded-ctl bg-warning/15 text-warning" style={{ animationDelay: `${520 + i * 120}ms` }}>
                  <Trophy size={20} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-subhead font-medium">{r.name}</span>
                <span className="tabular text-subhead font-semibold">
                  {formatSet(r.weight, r.reps)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-4 text-subhead text-muted">Цього разу без нових рекордів — регулярність теж прогрес.</p>
        )}
      </section>

      <div className="mt-auto grid grid-cols-1 gap-3 pt-8 sm:grid-cols-3">
        <Button variant="secondary" size="lg" icon={ImageIcon} onClick={() => setImageOpen(true)}>
          Поділитися фото
        </Button>
        <ButtonLink to={`/history/${session.id}`} variant="secondary" size="lg" icon={NotebookText} replace>
          Деталі в журналі
        </ButtonLink>
        <ButtonLink to="/" size="lg" icon={House} replace>
          На головну
        </ButtonLink>
      </div>
      <ShareImageSheet session={session} open={imageOpen} onClose={() => setImageOpen(false)} />
    </div>
  );
}
