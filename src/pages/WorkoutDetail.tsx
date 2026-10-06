import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, ChevronRight, Clock, Copy, ListChecks, Pencil, Play, Plus, Trash2, Weight } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useActiveWorkout } from '@/store/ActiveWorkoutContext';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TopBar } from '@/components/ui/TopBar';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Card, Section } from '@/components/ui/Card';
import { IconBadge } from '@/components/ui/IconBadge';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { addDays, weekdayOf, WEEKDAYS_SHORT } from '@/utils/date';
import { formatClock, formatDate, formatDurationWords, formatVolume, formatWeekdayDate, repsRange } from '@/utils/format';
import { bestSet, lastPerformance, sessionVolume } from '@/utils/stats';
import NotFound from './NotFound';

export default function WorkoutDetail() {
  const { id } = useParams();
  const { data, sessions, exerciseById, deletePlan, duplicatePlan } = useData();
  const { active } = useActiveWorkout();
  const begin = useStartWorkout();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const plan = data.plans.find((p) => p.id === id);
  usePageTitle(plan?.name ?? 'Тренування');

  const planSessions = useMemo(() => sessions.filter((s) => s.planId === id), [sessions, id]);

  if (!plan) return <NotFound />;

  const nextDate = (() => {
    if (plan.days.length === 0) return null;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, i);
      if (plan.days.includes(weekdayOf(d))) return d;
    }
    return null;
  })();

  const lastVolume = planSessions[0] ? sessionVolume(planSessions[0]) : null;
  const totalSets = plan.exercises.reduce((s, e) => s + e.sets, 0);
  const isActive = active?.planId === plan.id;

  const remove = async () => {
    const ok = await confirm({
      title: `Видалити «${plan.name}»?`,
      description: 'План буде видалено. Історія виконаних тренувань залишиться.',
      confirmLabel: 'Видалити',
    });
    if (!ok) return;
    deletePlan(plan.id);
    toast.success('Тренування видалено');
    navigate('/plan', { replace: true });
  };

  const duplicate = () => {
    const copy = duplicatePlan(plan.id);
    if (copy) {
      toast.success('Створено копію', 'Копія збережена як шаблон без дня');
      navigate(`/plan/${copy.id}/edit`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar
        back="/plan"
        title={plan.name}
        subtitle={
          nextDate ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} aria-hidden />
              {formatWeekdayDate(nextDate)}
            </span>
          ) : (
            'Шаблон без дня'
          )
        }
        actions={
          <>
            <IconButton icon={Pencil} label="Редагувати" onClick={() => navigate(`/plan/${plan.id}/edit`)} />
            <IconButton icon={Copy} label="Дублювати" onClick={duplicate} />
            <IconButton icon={Trash2} label="Видалити" variant="danger" onClick={remove} />
          </>
        }
      />

      <div className="space-y-6">
        <Card padding="none" className="grid grid-cols-2 gap-px overflow-hidden bg-line bg-none sm:grid-cols-4">
          <Info icon={Clock} label="Тривалість" value={`≈ ${plan.estimatedMinutes} хв`} />
          <Info icon={ListChecks} label="Вправ / підходів" value={`${plan.exercises.length} / ${totalSets}`} />
          <Info icon={Weight} label="Обсяг минулого разу" value={lastVolume != null ? formatVolume(lastVolume) : '—'} />
          <Info icon={CalendarDays} label="Дні" value={plan.days.length ? [...plan.days].sort().map((d) => WEEKDAYS_SHORT[d]).join(', ') : '—'} />
        </Card>

        {plan.notes && <p className="rounded-card border border-line bg-surface p-4 text-[15px] text-muted">{plan.notes}</p>}

        <Section title="Вправи">
          {plan.exercises.length === 0 ? (
            <div className="card flex flex-col items-center px-6 py-8 text-center">
              <p className="text-[15px] font-semibold">У тренуванні ще немає вправ</p>
              <p className="mt-1 text-[14px] text-muted">Додай вправи, щоб почати.</p>
              <ButtonLink to={`/plan/${plan.id}/edit`} icon={Plus} className="mt-4">
                Додати вправи
              </ButtonLink>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {plan.exercises.map((pe, i) => {
                const ex = exerciseById(pe.exerciseId);
                const last = lastPerformance(sessions, pe.exerciseId);
                const best = last ? bestSet(last.exercise.sets) : null;
                return (
                  <li key={pe.id}>
                    <Link to={`/exercises/${pe.exerciseId}`} className="block rounded-card transition hover:brightness-110">
                      <ExerciseCard
                        exercise={ex}
                        name={ex?.name ?? 'Видалена вправа'}
                        index={i + 1}
                        scheme={`${pe.sets} × ${repsRange(pe.repsMin, pe.repsMax)}${pe.restSec ? ` · відп. ${formatClock(pe.restSec)}` : ''}`}
                        previous={best ? { weight: best.weight, reps: best.reps, sets: last!.exercise.sets.length } : null}
                        actions={<ChevronRight size={18} className="text-subtle" aria-hidden />}
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Section>

        {planSessions.length > 0 && (
          <Section title="Історія">
            <ul className="card divide-y divide-line">
              {planSessions.slice(0, 4).map((s) => (
                <li key={s.id}>
                  <Link to={`/history/${s.id}`} className="flex items-center gap-3 p-4 transition hover:bg-white/[0.02]">
                    <IconBadge icon={s.icon} size="sm" tone="neutral" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">{formatDate(s.startedAt)}</span>
                      <span className="block text-[13px] text-subtle">
                        {formatDurationWords(s.durationSec)} · {formatVolume(sessionVolume(s))}
                      </span>
                    </span>
                    <ChevronRight size={18} className="text-subtle" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="sticky bottom-[calc(76px+var(--safe-bottom))] z-20 lg:bottom-4">
          <Button size="lg" block icon={Play} disabled={plan.exercises.length === 0} onClick={() => begin(plan)}>
            {isActive ? 'Продовжити тренування' : 'Почати тренування'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[12px] text-subtle">
        <Icon size={13} aria-hidden />
        {label}
      </p>
      <p className="tabular mt-1 text-[16px] font-semibold">{value}</p>
    </div>
  );
}
