import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Clock, Copy, Dumbbell, Layers, Pencil, Play, Plus, Save, Trash2, TrendingDown, TrendingUp, Trophy, Weight, X } from 'lucide-react';
import type { WorkoutPlan, WorkoutSession } from '@/types';
import { useData } from '@/store/DataContext';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TopBar } from '@/components/ui/TopBar';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumberInput } from '@/components/ui/NumberInput';
import { Textarea } from '@/components/ui/Input';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatClock, formatNumber, formatPercent, formatSigned, formatTime, formatVolume, formatWeekdayDate } from '@/utils/format';
import { bestSet, exerciseVolume, percentChange, previousPerformance, sessionRecords, sessionSetCount, sessionVolume } from '@/utils/stats';
import { uid } from '@/utils/id';
import NotFound from './NotFound';

export default function SessionDetail() {
  const { id } = useParams();
  const { data, sessions, updateSession, deleteSession, savePlan, exerciseById } = useData();
  const begin = useStartWorkout();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const session = sessions.find((s) => s.id === id);
  const [draft, setDraft] = useState<WorkoutSession | null>(null);
  usePageTitle(session?.name ?? 'Тренування');

  const info = useMemo(() => {
    if (!session) return null;
    const previous = sessions.find(
      (s) => s.startedAt < session.startedAt && (session.planId ? s.planId === session.planId : s.name === session.name),
    );
    return {
      records: new Set(sessionRecords(sessions, session).map((r) => r.exerciseId)),
      previous,
      volumeChange: previous ? percentChange(sessionVolume(session), sessionVolume(previous)) : null,
    };
  }, [session, sessions]);

  if (!session || !info) return <NotFound />;

  const editing = draft !== null;
  const view = draft ?? session;
  const plan = session.planId ? data.plans.find((p) => p.id === session.planId) : undefined;

  const remove = async () => {
    const ok = await confirm({ title: 'Видалити тренування з журналу?', description: 'Статистика та рекорди буде перераховано.', confirmLabel: 'Видалити' });
    if (!ok) return;
    deleteSession(session.id);
    toast.success('Тренування видалено');
    navigate('/history', { replace: true });
  };

  const saveAsTemplate = () => {
    const now = new Date().toISOString();
    const template: WorkoutPlan = {
      id: uid(),
      name: `${session.name} (шаблон)`,
      icon: session.icon,
      days: [],
      estimatedMinutes: Math.max(5, Math.round(session.durationSec / 300) * 5),
      notes: '',
      exercises: session.exercises
        .filter((e) => exerciseById(e.exerciseId))
        .map((e) => ({
          id: uid(),
          exerciseId: e.exerciseId,
          sets: e.sets.length,
          repsMin: e.targetRepsMin ?? Math.min(...e.sets.map((s) => s.reps)),
          repsMax: e.targetRepsMax ?? Math.max(...e.sets.map((s) => s.reps)),
        })),
      createdAt: now,
      updatedAt: now,
    };
    savePlan(template);
    toast.success('Шаблон створено', 'Можеш налаштувати його та призначити день');
    navigate(`/plan/${template.id}/edit`);
  };

  const saveEdit = () => {
    if (!draft) return;
    const cleaned: WorkoutSession = {
      ...draft,
      note: draft.note.trim(),
      exercises: draft.exercises
        .map((e) => ({ ...e, sets: e.sets.filter((s) => s.reps > 0) }))
        .filter((e) => e.sets.length > 0),
    };
    if (cleaned.exercises.length === 0) {
      toast.error('Потрібен хоча б один підхід', 'Щоб прибрати тренування повністю, видали його.');
      return;
    }
    updateSession(cleaned);
    setDraft(null);
    toast.success('Зміни збережено');
  };

  const patchSet = (ei: number, si: number, patch: { weight?: number; reps?: number }) =>
    setDraft((d) =>
      d && {
        ...d,
        exercises: d.exercises.map((e, i) => (i === ei ? { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : e)),
      },
    );

  const volume = sessionVolume(view);
  const stats = [
    { icon: Clock, label: 'Тривалість', value: formatClock(view.durationSec) },
    { icon: Dumbbell, label: 'Вправ', value: String(view.exercises.length) },
    { icon: Weight, label: 'Обсяг', value: formatVolume(volume) },
    { icon: Layers, label: 'Підходів', value: String(sessionSetCount(view)) },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar
        back="/history"
        title={session.name}
        subtitle={`${formatWeekdayDate(session.startedAt)} · ${formatTime(session.startedAt)}`}
        actions={
          editing ? (
            <IconButton icon={X} label="Скасувати редагування" onClick={() => setDraft(null)} />
          ) : (
            <>
              <IconButton icon={Pencil} label="Редагувати" onClick={() => setDraft(structuredClone(session))} />
              <IconButton icon={Trash2} label="Видалити" variant="danger" onClick={remove} />
            </>
          )
        }
      />

      <div className="space-y-6">
        <Card padding="none" className="grid grid-cols-2 gap-px overflow-hidden bg-line bg-none sm:grid-cols-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-surface p-4">
              <p className="flex items-center gap-1.5 text-[12px] text-subtle">
                <Icon size={13} aria-hidden /> {label}
              </p>
              <p className="tabular mt-1 text-[18px] font-semibold">{value}</p>
            </div>
          ))}
        </Card>

        {info.volumeChange != null && !editing && (
          <p className={clsx('flex items-center gap-2 text-[14px]', info.volumeChange >= 0 ? 'text-positive' : 'text-muted')}>
            {info.volumeChange >= 0 ? <TrendingUp size={16} aria-hidden /> : <TrendingDown size={16} aria-hidden />}
            Обсяг {formatPercent(info.volumeChange)} порівняно з{' '}
            <Link to={`/history/${info.previous!.id}`} className="underline decoration-white/20 underline-offset-4 hover:text-fg">
              попереднім разом
            </Link>
          </p>
        )}

        <ol className="space-y-3">
          {view.exercises.map((ex, ei) => {
            const prev = previousPerformance(sessions, ex.exerciseId, session);
            const best = bestSet(ex.sets);
            const prevBest = prev ? bestSet(prev.exercise.sets) : null;
            const weightDelta = best && prevBest ? best.weight - prevBest.weight : null;
            const volDelta = prev ? exerciseVolume(ex) - exerciseVolume(prev.exercise) : null;
            return (
              <li key={ex.id} className="card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/exercises/${ex.exerciseId}`} className="text-[16px] font-semibold hover:text-accent">
                      {ex.name}
                    </Link>
                    <p className="tabular mt-0.5 text-[13px] text-muted">Обсяг {formatVolume(exerciseVolume(ex))}</p>
                  </div>
                  {info.records.has(ex.exerciseId) && !editing && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-[12px] font-semibold text-warning">
                      <Trophy size={13} aria-hidden /> Рекорд
                    </span>
                  )}
                </div>

                {editing ? (
                  <div className="mt-3 space-y-1.5">
                    {ex.sets.map((s, si) => (
                      <div key={s.id} className="grid grid-cols-[28px_1fr_1fr_44px] items-center gap-2">
                        <span className="tabular text-center text-[14px] font-semibold text-muted">{si + 1}</span>
                        <NumberInput variant="compact" decimals={2} max={1000} ariaLabel={`Вага, підхід ${si + 1}`} value={s.weight} onChange={(v) => patchSet(ei, si, { weight: v ?? 0 })} />
                        <NumberInput variant="compact" max={200} ariaLabel={`Повторення, підхід ${si + 1}`} value={s.reps} onChange={(v) => patchSet(ei, si, { reps: v ?? 0 })} />
                        <IconButton
                          icon={Trash2}
                          label={`Видалити підхід ${si + 1}`}
                          size="sm"
                          variant="danger"
                          onClick={() => setDraft((d) => d && { ...d, exercises: d.exercises.map((e, i) => (i === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e)) })}
                        />
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Plus}
                      className="h-11"
                      onClick={() =>
                        setDraft((d) => {
                          if (!d) return d;
                          return {
                            ...d,
                            exercises: d.exercises.map((e, i) => {
                              if (i !== ei) return e;
                              const last = e.sets[e.sets.length - 1];
                              return { ...e, sets: [...e.sets, { id: uid(), weight: last?.weight ?? 0, reps: last?.reps ?? 10, done: true }] };
                            }),
                          };
                        })
                      }
                    >
                      Додати підхід
                    </Button>
                  </div>
                ) : (
                  <>
                    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Підходи">
                      {ex.sets.map((s, si) => (
                        <li
                          key={s.id}
                          className={clsx(
                            'tabular rounded-xl border px-3 py-2 text-[14px] font-medium',
                            best && s.id === best.id ? 'border-accent/40 bg-accent/10' : 'border-line bg-white/[0.03]',
                          )}
                        >
                          <span className="mr-1.5 text-subtle">{si + 1}</span>
                          {formatNumber(s.weight, 2)} кг × {s.reps}
                        </li>
                      ))}
                    </ul>
                    {prev && (
                      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-[13px] text-subtle">
                        <span>
                          Минулого разу:{' '}
                          <span className="tabular text-muted">{prevBest ? `${formatNumber(prevBest.weight, 2)} кг × ${prevBest.reps}` : '—'}</span>
                        </span>
                        {weightDelta != null && weightDelta !== 0 && (
                          <span className={weightDelta > 0 ? 'text-positive' : 'text-negative'}>Вага {formatSigned(weightDelta, 'кг')}</span>
                        )}
                        {volDelta != null && volDelta !== 0 && (
                          <span className={volDelta > 0 ? 'text-positive' : 'text-negative'}>Обсяг {formatSigned(Math.round(volDelta), 'кг')}</span>
                        )}
                      </p>
                    )}
                    {ex.note && <p className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2 text-[14px] text-muted">{ex.note}</p>}
                  </>
                )}
              </li>
            );
          })}
        </ol>

        {editing ? (
          <>
            <Textarea label="Нотатка" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} maxLength={500} />
            <div className="flex gap-3">
              <Button variant="secondary" block onClick={() => setDraft(null)}>
                Скасувати
              </Button>
              <Button block icon={Save} onClick={saveEdit}>
                Зберегти
              </Button>
            </div>
          </>
        ) : (
          <>
            {session.note && (
              <Card>
                <p className="label mb-1">Нотатка</p>
                <p className="text-[15px]">{session.note}</p>
              </Card>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {plan && (
                <Button size="lg" icon={Play} onClick={() => begin(plan)}>
                  Повторити тренування
                </Button>
              )}
              <Button size="lg" variant="secondary" icon={Copy} onClick={saveAsTemplate}>
                Зберегти як шаблон
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
