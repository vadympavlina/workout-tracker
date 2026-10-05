import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Pencil, Trash2, Trophy } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TopBar } from '@/components/ui/TopBar';
import { IconButton } from '@/components/ui/Button';
import { Card, Section } from '@/components/ui/Card';
import { IconBadge } from '@/components/ui/IconBadge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatCard } from '@/components/ui/StatCard';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { TrendChart } from '@/components/charts/Chart';
import { ExerciseFormModal } from '@/components/workout/ExerciseFormModal';
import { EQUIPMENT, MUSCLE_GROUPS } from '@/data/labels';
import { formatDate, formatNumber, formatSigned, formatVolume, repsRange } from '@/utils/format';
import { exerciseHistory } from '@/utils/stats';
import NotFound from './NotFound';

type Metric = 'weight' | 'e1rm' | 'volume';

export default function ExerciseDetail() {
  const { id = '' } = useParams();
  const { data, records, exerciseById, saveExercise, deleteExercise } = useData();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [metric, setMetric] = useState<Metric>('weight');
  const [editing, setEditing] = useState(false);
  const exercise = exerciseById(id);
  usePageTitle(exercise?.name ?? 'Вправа');

  const history = useMemo(() => exerciseHistory(data.sessions, id), [data.sessions, id]);

  if (!exercise) return <NotFound />;

  const pr = records.get(id);
  const first = history[0];
  const last = history[history.length - 1];
  const delta = first && last && history.length > 1 ? last.bestWeight - first.bestWeight : null;
  const usedIn = data.plans.filter((p) => p.exercises.some((e) => e.exerciseId === id));

  const chartData = history.map((p) => ({
    label: p.label,
    value: metric === 'weight' ? p.bestWeight : metric === 'e1rm' ? Math.round(p.e1rm * 10) / 10 : Math.round(p.volume),
  }));

  const remove = async () => {
    const ok = await confirm({
      title: `Видалити «${exercise.name}»?`,
      description: usedIn.length
        ? `Вправу буде прибрано з ${usedIn.length} план(ів). Історія тренувань збережеться.`
        : 'Історія тренувань з цією вправою збережеться.',
      confirmLabel: 'Видалити',
    });
    if (!ok) return;
    deleteExercise(id);
    toast.success('Вправу видалено');
    navigate('/exercises', { replace: true });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar
        back="/exercises"
        title={exercise.name}
        subtitle={`${MUSCLE_GROUPS[exercise.muscleGroup]} · ${EQUIPMENT[exercise.equipment]}`}
        actions={
          exercise.isCustom && (
            <>
              <IconButton icon={Pencil} label="Редагувати вправу" onClick={() => setEditing(true)} />
              <IconButton icon={Trash2} label="Видалити вправу" variant="danger" onClick={remove} />
            </>
          )
        }
      />

      <div className="space-y-6">
        <Card className="flex gap-4">
          <IconBadge icon={exercise.icon} size="lg" />
          <div className="min-w-0">
            <p className="text-[14px] text-muted">
              Рекомендовано: <span className="tabular font-medium text-fg">{exercise.defaultSets} × {repsRange(exercise.defaultRepsMin, exercise.defaultRepsMax)}</span>
            </p>
            {exercise.description && <p className="mt-2 text-[15px] leading-relaxed">{exercise.description}</p>}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Рекорд" icon={Trophy} value={pr ? `${formatNumber(pr.weight, 2)}` : '—'} unit={pr ? `кг × ${pr.reps}` : undefined} />
          <StatCard
            label="Прогрес ваги"
            value={delta != null ? formatSigned(delta) : '—'}
            unit={delta != null ? 'кг' : undefined}
            valueClassName={delta ? (delta > 0 ? 'text-positive' : 'text-negative') : undefined}
          />
          <StatCard label="Тренувань" value={history.length} className="col-span-2 sm:col-span-1" />
        </div>

        {history.length >= 2 && (
          <Card padding="lg">
            <SegmentedControl
              label="Показник"
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'weight', label: 'Вага' },
                { value: 'e1rm', label: '1ПМ (оцінка)' },
                { value: 'volume', label: 'Обсяг' },
              ]}
              className="mb-4"
            />
            <TrendChart
              data={chartData}
              domain={metric === 'volume' ? [0, 'auto'] : ['auto', 'auto']}
              formatValue={(v) => `${formatNumber(v, 1)} кг`}
              ariaLabel={`Динаміка: ${exercise.name}`}
            />
          </Card>
        )}

        <Section title="Історія">
          {history.length === 0 ? (
            <p className="card p-5 text-[14px] text-muted">Вправа ще не виконувалась. Додай її до плану, щоб почати відстежувати.</p>
          ) : (
            <ul className="card divide-y divide-line">
              {[...history].reverse().map((p) => (
                <li key={p.sessionId}>
                  <Link to={`/history/${p.sessionId}`} className="flex items-center gap-3 p-4 transition hover:bg-white/[0.02]">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">{formatDate(p.date)}</span>
                      <span className="tabular block truncate text-[13px] text-subtle">
                        {p.sets.map((s) => `${formatNumber(s.weight, 2)}×${s.reps}`).join(' · ')}
                      </span>
                    </span>
                    <span className="tabular text-[14px] text-muted">{formatVolume(p.volume)}</span>
                    <ChevronRight size={18} className="text-subtle" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {usedIn.length > 0 && (
          <Section title="У планах">
            <div className="flex flex-wrap gap-2">
              {usedIn.map((p) => (
                <Link key={p.id} to={`/workout/${p.id}`} className="rounded-full border border-line bg-surface px-4 py-2.5 text-[14px] font-medium transition hover:border-white/20">
                  {p.name}
                </Link>
              ))}
            </div>
          </Section>
        )}
      </div>

      <ExerciseFormModal
        open={editing}
        initial={exercise}
        onClose={() => setEditing(false)}
        onSave={(ex) => {
          saveExercise(ex);
          setEditing(false);
          toast.success('Вправу оновлено');
        }}
      />
    </div>
  );
}
