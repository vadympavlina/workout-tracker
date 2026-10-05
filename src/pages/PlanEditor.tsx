import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ListPlus, Plus, Save, Trash2 } from 'lucide-react';
import type { IconKey, PlanExercise, Weekday, WorkoutPlan } from '@/types';
import { useData } from '@/store/DataContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TopBar } from '@/components/ui/TopBar';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { IconBadge } from '@/components/ui/IconBadge';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ExercisePicker } from '@/components/workout/ExercisePicker';
import { ICON_KEYS, ICONS } from '@/utils/icons';
import { WEEKDAYS_SHORT, WEEKDAYS_LONG } from '@/utils/date';
import { uid } from '@/utils/id';
import { MUSCLE_GROUPS } from '@/data/labels';
import NotFound from './NotFound';

export default function PlanEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data, savePlan, deletePlan, exerciseById } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const existing = id ? data.plans.find((p) => p.id === id) : undefined;
  usePageTitle(existing ? 'Редагування' : 'Нове тренування');

  const initial = useMemo<WorkoutPlan>(() => {
    if (existing) return existing;
    const day = Number(params.get('day'));
    const now = new Date().toISOString();
    return {
      id: uid(),
      name: '',
      icon: 'dumbbell',
      days: Number.isInteger(day) && day >= 0 && day <= 6 && params.has('day') ? [day as Weekday] : [],
      estimatedMinutes: 60,
      notes: '',
      exercises: [],
      createdAt: now,
      updatedAt: now,
    };
    // Only initialise once per plan id.
  }, [id]);

  const [plan, setPlan] = useState<WorkoutPlan>(initial);
  const [nameError, setNameError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  if (id && !existing) return <NotFound />;

  const patch = (p: Partial<WorkoutPlan>) => setPlan((cur) => ({ ...cur, ...p }));
  const patchExercise = (index: number, p: Partial<PlanExercise>) =>
    patch({ exercises: plan.exercises.map((e, i) => (i === index ? { ...e, ...p } : e)) });
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= plan.exercises.length) return;
    const list = [...plan.exercises];
    [list[index], list[target]] = [list[target], list[index]];
    patch({ exercises: list });
  };
  const toggleDay = (d: Weekday) =>
    patch({ days: plan.days.includes(d) ? plan.days.filter((x) => x !== d) : [...plan.days, d].sort() as Weekday[] });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!plan.name.trim()) {
      setNameError('Вкажи назву тренування');
      document.getElementById('plan-name')?.focus();
      return;
    }
    const cleaned: WorkoutPlan = {
      ...plan,
      name: plan.name.trim(),
      notes: plan.notes.trim(),
      exercises: plan.exercises.map((e) => ({
        ...e,
        repsMin: Math.min(e.repsMin, e.repsMax),
        repsMax: Math.max(e.repsMin, e.repsMax),
      })),
    };
    savePlan(cleaned);
    toast.success(existing ? 'Тренування оновлено' : 'Тренування створено', cleaned.name);
    navigate(`/workout/${cleaned.id}`, { replace: true });
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: `Видалити «${existing.name}»?`,
      description: 'План буде видалено. Історія виконаних тренувань залишиться.',
      confirmLabel: 'Видалити',
    });
    if (!ok) return;
    deletePlan(existing.id);
    toast.success('Тренування видалено');
    navigate('/plan', { replace: true });
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl" noValidate>
      <TopBar
        back="/plan"
        title={existing ? 'Редагування' : 'Нове тренування'}
        actions={existing && <IconButton icon={Trash2} label="Видалити тренування" variant="danger" onClick={remove} />}
      />

      <div className="space-y-6">
        <Card padding="lg" className="space-y-5">
          <Input
            id="plan-name"
            label="Назва"
            value={plan.name}
            onChange={(e) => {
              patch({ name: e.target.value });
              setNameError('');
            }}
            placeholder="Напр., Спина + Біцепс"
            error={nameError}
            maxLength={40}
            autoFocus={!existing}
          />

          <fieldset className="min-w-0">
            <legend className="label mb-2">Дні тижня</legend>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS_SHORT.map((label, d) => {
                const selected = plan.days.includes(d as Weekday);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={selected}
                    aria-label={WEEKDAYS_LONG[d]}
                    onClick={() => toggleDay(d as Weekday)}
                    className={clsx(
                      'h-12 rounded-ctl border text-[14px] font-semibold transition',
                      selected ? 'border-accent/50 bg-accent/15 text-accent' : 'border-line bg-elevated text-muted hover:text-fg',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[13px] text-subtle">Без днів тренування збережеться як шаблон.</p>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <NumberInput
              label="Тривалість, хв"
              value={plan.estimatedMinutes}
              step={5}
              min={5}
              max={300}
              onChange={(v) => patch({ estimatedMinutes: v ?? 60 })}
            />
            <fieldset className="min-w-0">
              <legend className="label mb-1.5">Іконка</legend>
              <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
                {ICON_KEYS.map((key: IconKey) => {
                  const Icon = ICONS[key];
                  const selected = plan.icon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={`Іконка ${key}`}
                      aria-pressed={selected}
                      onClick={() => patch({ icon: key })}
                      className={clsx(
                        'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-ctl border transition',
                        selected ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line bg-elevated text-muted hover:text-fg',
                      )}
                    >
                      <Icon size={20} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <Textarea label="Нотатки" value={plan.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Необовʼязково" maxLength={300} />
        </Card>

        <section aria-labelledby="ex-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="ex-heading" className="text-[17px] font-semibold">
              Вправи <span className="text-muted">({plan.exercises.length})</span>
            </h2>
          </div>

          {plan.exercises.length === 0 && (
            <div className="card flex flex-col items-center px-6 py-8 text-center">
              <IconBadge icon={ListPlus} size="lg" />
              <p className="mt-3 text-[15px] font-semibold">Додай першу вправу</p>
              <p className="mt-1 text-[14px] text-muted">Обери з бібліотеки або створи власну.</p>
            </div>
          )}

          <ol className="space-y-3">
            {plan.exercises.map((pe, i) => {
              const ex = exerciseById(pe.exerciseId);
              return (
                <li key={pe.id} className="card p-3.5 sm:p-4">
                  <div className="flex items-center gap-3">
                    <span className="tabular inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[13px] font-semibold text-muted">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{ex?.name ?? 'Видалена вправа'}</p>
                      {ex && <p className="text-[13px] text-subtle">{MUSCLE_GROUPS[ex.muscleGroup]}</p>}
                    </div>
                    <IconButton icon={ArrowUp} label="Вище" size="sm" disabled={i === 0} onClick={() => move(i, -1)} />
                    <IconButton icon={ArrowDown} label="Нижче" size="sm" disabled={i === plan.exercises.length - 1} onClick={() => move(i, 1)} />
                    <IconButton
                      icon={Trash2}
                      label="Видалити вправу"
                      size="sm"
                      variant="danger"
                      onClick={() => patch({ exercises: plan.exercises.filter((_, j) => j !== i) })}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <CompactField label="Підходи">
                      <NumberInput variant="compact" ariaLabel="Підходи" value={pe.sets} min={1} max={12} onChange={(v) => patchExercise(i, { sets: v ?? 1 })} />
                    </CompactField>
                    <CompactField label="Повт. від">
                      <NumberInput variant="compact" ariaLabel="Повторень від" value={pe.repsMin} min={1} max={100} onChange={(v) => patchExercise(i, { repsMin: v ?? 1 })} />
                    </CompactField>
                    <CompactField label="Повт. до">
                      <NumberInput variant="compact" ariaLabel="Повторень до" value={pe.repsMax} min={1} max={100} onChange={(v) => patchExercise(i, { repsMax: v ?? 1 })} />
                    </CompactField>
                  </div>
                </li>
              );
            })}
          </ol>

          <Button variant="secondary" block icon={Plus} onClick={() => setPickerOpen(true)}>
            Додати вправу
          </Button>
        </section>

        <div className="sticky bottom-[calc(72px+var(--safe-bottom))] z-20 -mx-4 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-card sm:border lg:bottom-4">
          <div className="flex gap-3">
            <Button variant="secondary" block onClick={() => navigate(-1)}>
              Скасувати
            </Button>
            <Button type="submit" block icon={Save}>
              Зберегти
            </Button>
          </div>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedIds={plan.exercises.map((e) => e.exerciseId)}
        onSelect={(ex) => {
          patch({
            exercises: [
              ...plan.exercises,
              { id: uid(), exerciseId: ex.id, sets: ex.defaultSets, repsMin: ex.defaultRepsMin, repsMax: ex.defaultRepsMax },
            ],
          });
          setPickerOpen(false);
          toast.success('Вправу додано', ex.name);
        }}
      />
    </form>
  );
}

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-center text-[12px] font-medium text-subtle" aria-hidden>
        {label}
      </span>
      {children}
    </div>
  );
}
