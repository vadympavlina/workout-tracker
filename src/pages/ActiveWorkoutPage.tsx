import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, CircleCheck, Dumbbell, Flag, History, ListPlus, Minus, NotebookPen, Plus,
  RotateCcw, Timer, Trash2, X,
} from 'lucide-react';
import { IDLE_LIMIT_MS, useActiveWorkout } from '@/store/ActiveWorkoutContext';
import { useData } from '@/store/DataContext';
import { useNow } from '@/hooks/useNow';
import { useWakeLock } from '@/hooks/useWakeLock';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SetTable } from '@/components/workout/SetTable';
import { ActivityRings } from '@/components/ui/ActivityRings';
import { ExercisePicker } from '@/components/workout/ExercisePicker';
import { ExerciseMediaButton } from '@/components/exercise/ExerciseMediaButton';
import { MUSCLE_GROUPS } from '@/data/labels';
import { formatClock, formatDurationWords, formatNumber, repsRange } from '@/utils/format';
import { lastPerformance } from '@/utils/stats';

export default function ActiveWorkoutPage() {
  usePageTitle('Тренування');
  const workout = useActiveWorkout();
  const { active } = workout;
  const { data, sessions, exerciseById } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const now = useNow(1000, !!active);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recordSetId, setRecordSetId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  useWakeLock(!!active && data.settings.keepAwake);

  // Rest timer completion.
  const restLeft = active?.restEndsAt ? Math.ceil((active.restEndsAt - now) / 1000) : null;
  const resting = restLeft != null && restLeft > 0;
  useEffect(() => {
    if (restLeft != null && restLeft <= 0) {
      workout.stopRest();
      if (data.settings.vibration) navigator.vibrate?.([180, 80, 180]);
      toast.info('Відпочинок завершено', 'Час для наступного підходу');
    }
  }, [restLeft, workout, data.settings.vibration, toast]);

  useEffect(() => {
    setNoteOpen(false);
  }, [active?.currentIndex]);

  if (!active) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16">
        <EmptyState
          icon={Dumbbell}
          title="Немає активного тренування"
          description="Обери план на головній або у розділі «План», щоб почати."
          action={
            <ButtonLink to="/" icon={ChevronLeft} variant="secondary">
              На головну
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const elapsed = (now - new Date(active.startedAt).getTime() - (active.pausedMs ?? 0)) / 1000;
  const idx = Math.min(active.currentIndex, Math.max(0, active.exercises.length - 1));
  const current = active.exercises[idx];
  const currentEx = current ? exerciseById(current.exerciseId) : undefined;
  const finishedCount = active.exercises.filter((e) => e.finished).length;
  const totalSets = active.exercises.reduce((s, e) => s + e.sets.length, 0);
  const doneSets = active.exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0);
  const lastTime = current ? lastPerformance(sessions, current.exerciseId) : null;

  const toggle = (setIndex: number) => {
    const result = workout.toggleSet(idx, setIndex);
    if (!result.ok) {
      if (result.reason) toast.error(result.reason);
      return;
    }
    if (result.record) {
      const set = current.sets[setIndex];
      setRecordSetId(set.id);
      window.setTimeout(() => setRecordSetId((id) => (id === set.id ? null : id)), 2200);
      if (data.settings.vibration) navigator.vibrate?.([60, 40, 60, 40, 120]);
      toast.show({ kind: 'record', title: 'Новий рекорд!', description: `${current.name}: ${formatNumber(set.weight ?? 0, 2)} кг × ${set.reps}` });
    }
  };

  const finishExercise = async () => {
    const pending = current.sets.filter((s) => !s.done).length;
    if (pending > 0 && current.sets.some((s) => s.done)) {
      const ok = await confirm({
        title: 'Завершити вправу?',
        description: `${pending} ${pending === 1 ? 'підхід не позначено' : 'підходи не позначено'} виконаними — вони не збережуться.`,
        confirmLabel: 'Завершити',
        tone: 'primary',
      });
      if (!ok) return;
    }
    const isLast = active.exercises.every((e, i) => i === idx || e.finished);
    workout.finishExercise(idx);
    if (isLast) toast.success('Усі вправи виконано', 'Можна завершувати тренування');
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const finishWorkout = async () => {
    if (doneSets === 0) {
      const ok = await confirm({
        title: 'Немає виконаних підходів',
        description: 'Тренування нема чого зберігати. Скасувати його?',
        confirmLabel: 'Скасувати тренування',
        cancelLabel: 'Продовжити',
      });
      if (ok) {
        workout.discard();
        navigate('/', { replace: true });
      }
      return;
    }
    const pending = totalSets - doneSets;
    const ok = await confirm({
      title: 'Завершити тренування?',
      description:
        pending > 0
          ? `Буде збережено ${doneSets} виконаних підходів. ${pending} невідмічених не збережуться.`
          : `Чудова робота! Буде збережено ${doneSets} підходів.`,
      confirmLabel: 'Завершити',
      cancelLabel: 'Продовжити',
      tone: 'primary',
    });
    if (!ok) return;
    const session = workout.finish();
    if (session) navigate(`/summary/${session.id}`, { replace: true });
  };

  const discard = async () => {
    const ok = await confirm({
      title: 'Скасувати тренування?',
      description: 'Усі введені в цьому тренуванні дані буде втрачено.',
      confirmLabel: 'Скасувати тренування',
      cancelLabel: 'Ні, продовжити',
    });
    if (ok) {
      workout.discard();
      toast.info('Тренування скасовано');
      navigate('/', { replace: true });
    }
  };

  const removeExercise = async (i: number) => {
    const ex = active.exercises[i];
    if (ex.sets.some((s) => s.done)) {
      const ok = await confirm({ title: `Прибрати «${ex.name}»?`, description: 'Виконані підходи цієї вправи не збережуться.', confirmLabel: 'Прибрати' });
      if (!ok) return;
    }
    workout.removeExercise(i);
  };

  return (
    <div className="mx-auto max-w-2xl" style={{ paddingBottom: 'calc(120px + var(--safe-bottom))' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b border-white/[0.06] bg-bg/80 px-2 pb-3 backdrop-blur-2xl sm:px-4"
        style={{ paddingTop: 'calc(8px + var(--safe-top))' }}
      >
        <div className="flex items-center gap-1">
          <IconButton icon={ChevronLeft} label="Згорнути тренування" onClick={() => navigate('/')} />
          <div className="min-w-0 flex-1 px-1">
            <h1 className="truncate text-[17px] font-bold leading-tight tracking-[-0.02em]">{active.name}</h1>
            <p className="font-mono text-[11.5px] uppercase tracking-wide text-subtle">
              <span className="tabular">{finishedCount} / {active.exercises.length}</span> вправ ·{' '}
              <span className="tabular">{doneSets} / {totalSets}</span> підх.
            </p>
          </div>
          <div className="flex h-11 items-center gap-2 rounded-full bg-accent px-4 font-mono text-[17px] font-semibold tabular-nums text-black shadow-glow" role="timer" aria-label="Тривалість тренування">
            <span className="h-2 w-2 animate-pulse rounded-full bg-black/70" aria-hidden />
            {formatClock(elapsed)}
          </div>
        </div>
        <ProgressBar value={doneSets} max={totalSets || 1} label="Виконані підходи" tone="positive" className="mt-3" />
      </header>

      <div className="space-y-5 px-4 pt-4">
        {active.lastActivityAt && now - active.lastActivityAt > IDLE_LIMIT_MS && (
          <div role="status" className="rounded-[18px] border border-warning/25 bg-warning/[0.07] p-4 text-[14px]">
            <p className="font-semibold text-warning">Схоже, тренування не завершили вчасно</p>
            <p className="mt-1 text-muted">
              Остання дія була {formatDurationWords((now - active.lastActivityAt) / 1000)} тому. Паузу довшу за годину не буде враховано в тривалості тренування.
            </p>
          </div>
        )}
        {active.exercises.length === 0 ? (
          <EmptyState
            icon={ListPlus}
            title="Додай першу вправу"
            description="Вільне тренування — обирай вправи по ходу. Минулі результати підставляться автоматично."
            action={
              <Button icon={Plus} onClick={() => setPickerOpen(true)}>
                Додати вправу
              </Button>
            }
          />
        ) : (
          <>
            {/* Exercise stepper */}
            <nav aria-label="Вправи тренування" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
              {active.exercises.map((e, i) => {
                const done = e.sets.filter((s) => s.done).length;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => workout.goTo(i)}
                    aria-current={i === idx ? 'step' : undefined}
                    className={clsx(
                      'flex h-11 max-w-[190px] shrink-0 items-center gap-2 rounded-full pl-1.5 pr-4 text-[13px] font-medium transition',
                      i === idx ? 'bg-fg text-black' : 'bg-white/[0.06] text-muted hover:text-fg',
                    )}
                  >
                    <span
                      className={clsx(
                        'tabular inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                        e.finished ? 'bg-positive text-black' : i === idx ? 'bg-black text-fg' : 'bg-white/[0.08]',
                      )}
                    >
                      {e.finished ? <Check size={14} strokeWidth={3} aria-label="Завершено" /> : i + 1}
                    </span>
                    <span className="truncate">{e.name}</span>
                    {!e.finished && done > 0 && <span className={clsx('tabular', i === idx ? 'text-black/60' : 'text-subtle')}>{done}/{e.sets.length}</span>}
                  </button>
                );
              })}
            </nav>

            {/* Current exercise */}
            <section ref={cardRef} aria-labelledby="current-ex" className="card relative scroll-mt-28 overflow-clip p-4 sm:p-5">
              <div className="glow-blob -right-20 -top-24 h-56 w-56 bg-accent/[0.08]" aria-hidden />
              <div className="relative flex items-start gap-3">
                <ExerciseMediaButton key={current.exerciseId} exercise={currentEx} />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="eyebrow">
                    Вправа {idx + 1} / {active.exercises.length}
                  </p>
                  {currentEx && <p className="mt-1 text-[13px] text-muted">{MUSCLE_GROUPS[currentEx.muscleGroup]}</p>}
                  <p className="mt-1 text-[14px] text-muted">
                    Ціль: <span className="tabular font-semibold text-fg">{current.sets.length} × {repsRange(current.targetRepsMin ?? 8, current.targetRepsMax ?? 12)}</span>
                  </p>
                </div>
                <div className="-mr-1 flex">
                  <IconButton icon={ChevronLeft} label="Попередня вправа" size="sm" disabled={idx === 0} onClick={() => workout.goTo(idx - 1)} />
                  <IconButton icon={ChevronRight} label="Наступна вправа" size="sm" disabled={idx === active.exercises.length - 1} onClick={() => workout.goTo(idx + 1)} />
                </div>
              </div>
              <h2 id="current-ex" className="relative mt-4 text-[26px] font-bold leading-[1.1] tracking-[-0.035em]">
                {current.name}
              </h2>

              <p className="relative mt-4 flex items-start gap-2 rounded-[14px] bg-white/[0.04] px-3 py-2.5 text-[13px] text-muted">
                <History size={15} className="mt-0.5 shrink-0 text-subtle" aria-hidden />
                {lastTime ? (
                  <span>
                    Минулого разу:{' '}
                    <span className="tabular font-medium text-fg">
                      {lastTime.exercise.sets.filter((s) => s.done).map((s) => `${formatNumber(s.weight, 2)}×${s.reps}`).join(', ')}
                    </span>
                  </span>
                ) : (
                  <span>Перше виконання — встанови стартову вагу.</span>
                )}
              </p>

              {current.finished && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-ctl border border-positive/25 bg-positive/[0.06] px-3 py-2">
                  <span className="flex items-center gap-2 text-[14px] font-medium text-positive">
                    <CircleCheck size={17} aria-hidden /> Вправу завершено
                  </span>
                  <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => workout.reopenExercise(idx)}>
                    Відновити
                  </Button>
                </div>
              )}

              <div className="mt-4">
                <SetTable
                  exercise={current}
                  isBodyweight={currentEx?.equipment === 'bodyweight'}
                  weightStep={currentEx?.equipment === 'dumbbell' || currentEx?.equipment === 'kettlebell' ? 1 : 2.5}
                  recordSetId={recordSetId}
                  onChange={(setIndex, patch) => workout.updateSet(idx, setIndex, patch)}
                  onToggle={toggle}
                  onRemove={(setIndex) => {
                    const removed = workout.removeSet(idx, setIndex);
                    if (removed)
                      toast.show({
                        kind: 'info',
                        title: `Підхід ${setIndex + 1} видалено`,
                        action: { label: 'Повернути', onClick: () => workout.restoreSet(idx, setIndex, removed) },
                      });
                  }}
                />
              </div>

              <Button variant="secondary" block icon={Plus} className="mt-3" onClick={() => workout.addSet(idx)}>
                Додати підхід
              </Button>

              {noteOpen || current.note ? (
                <Textarea
                  className="mt-3"
                  label="Примітка до вправи"
                  value={current.note}
                  onChange={(e) => workout.setExerciseNote(idx, e.target.value)}
                  placeholder="Напр., сидіння на 4, важко останній підхід"
                  maxLength={200}
                  autoFocus={noteOpen && !current.note}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  className="mt-2 inline-flex h-11 items-center gap-2 rounded-ctl px-2 text-[14px] text-muted transition hover:text-fg"
                >
                  <NotebookPen size={16} aria-hidden /> Додати примітку
                </button>
              )}

              {!current.finished && (
                <Button variant="positive" block size="lg" icon={Check} className="mt-3" onClick={finishExercise}>
                  Завершити вправу
                </Button>
              )}
            </section>

            {/* Overview */}
            <section aria-labelledby="overview" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 id="overview" className="text-[17px] font-semibold">
                  Усі вправи
                </h2>
                <Button size="sm" variant="ghost" icon={Plus} onClick={() => setPickerOpen(true)}>
                  Додати
                </Button>
              </div>
              <ol className="card divide-y divide-line">
                {active.exercises.map((e, i) => {
                  const done = e.sets.filter((s) => s.done).length;
                  return (
                    <li key={e.id} className="flex items-center gap-2 py-1.5 pl-3 pr-1.5">
                      <button type="button" onClick={() => workout.goTo(i)} className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 text-left">
                        <span
                          className={clsx(
                            'tabular inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                            e.finished ? 'bg-positive/15 text-positive' : i === idx ? 'bg-accent/15 text-accent' : 'bg-white/[0.05] text-muted',
                          )}
                        >
                          {e.finished ? <Check size={14} strokeWidth={3} aria-hidden /> : i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className={clsx('block truncate text-[15px]', i === idx ? 'font-semibold' : 'font-medium')}>{e.name}</span>
                          <span className="tabular block text-[12px] text-subtle">
                            {done} / {e.sets.length} підходів
                          </span>
                        </span>
                      </button>
                      <IconButton icon={ArrowUp} label="Вище" size="sm" disabled={i === 0} onClick={() => workout.moveExercise(i, -1)} />
                      <IconButton icon={ArrowDown} label="Нижче" size="sm" disabled={i === active.exercises.length - 1} onClick={() => workout.moveExercise(i, 1)} />
                      <IconButton icon={X} label={`Прибрати ${e.name}`} size="sm" onClick={() => removeExercise(i)} />
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}

        <Textarea
          label="Нотатка до тренування"
          value={active.note}
          onChange={(e) => workout.setWorkoutNote(e.target.value)}
          placeholder="Самопочуття, сон, що змінити наступного разу…"
          maxLength={500}
        />

        <Button variant="ghost" block icon={Trash2} className="text-negative hover:bg-negative/10 hover:text-negative" onClick={discard}>
          Скасувати тренування
        </Button>
      </div>

      {/* Bottom action bar — the rest timer lives here so it never covers content. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-bg/95 backdrop-blur-2xl" style={{ paddingBottom: 'var(--safe-bottom)' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          {resting ? (
            <>
              <button
                type="button"
                onClick={workout.stopRest}
                aria-label={`Відпочинок: залишилось ${formatClock(restLeft!)}. Натисни, щоб пропустити`}
                className="relative flex h-14 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-volume/[0.12] pl-1.5 pr-4 transition hover:bg-volume/[0.18] active:scale-[0.97]"
              >
                <ActivityRings size={44} stroke={5} rings={[{ label: 'Відпочинок', value: restLeft!, max: active.restTotalSec || 90, color: 'volume' }]} label="">
                  <Timer size={16} className="text-volume" aria-hidden />
                </ActivityRings>
                <span className="min-w-0 text-left">
                  <span className="eyebrow block text-volume/70">Відпочинок</span>
                  <span role="timer" className="metric block font-mono text-[19px] text-volume">
                    {formatClock(restLeft!)}
                  </span>
                </span>
              </button>
              <IconButton icon={Minus} label="Мінус 15 секунд відпочинку" variant="secondary" className="h-14 w-12" onClick={() => workout.adjustRest(-15)} />
              <IconButton icon={Plus} label="Плюс 15 секунд відпочинку" variant="secondary" className="h-14 w-12" onClick={() => workout.adjustRest(15)} />
              <Button size="lg" icon={Flag} className="w-14 shrink-0 px-0" onClick={finishWorkout} aria-label="Завершити тренування" title="Завершити тренування" />
            </>
          ) : (
            <>
              {active.exercises.length > 0 && (
                <IconButton icon={Timer} label="Почати відпочинок" variant="secondary" className="h-14 w-14" onClick={() => workout.startRest()} />
              )}
              <Button size="lg" block icon={Flag} onClick={finishWorkout}>
                Завершити тренування
              </Button>
            </>
          )}
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedIds={active.exercises.map((e) => e.exerciseId)}
        onSelect={(ex) => {
          workout.addExercise(ex);
          setPickerOpen(false);
          toast.success('Вправу додано', ex.name);
        }}
      />
    </div>
  );
}
