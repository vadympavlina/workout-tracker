import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronRight, Plus, Search } from 'lucide-react';
import type { MuscleGroup } from '@/types';
import { useData } from '@/store/DataContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TopBar } from '@/components/ui/TopBar';
import { Button } from '@/components/ui/Button';
import { ExerciseThumb } from '@/components/exercise/ExerciseThumb';
import { EquipmentChips, type EquipmentFilter } from '@/components/exercise/EquipmentChips';
import { useToast } from '@/components/ui/Toast';
import { ExerciseFormModal } from '@/components/workout/ExerciseFormModal';
import { EQUIPMENT, MUSCLE_GROUPS } from '@/data/labels';
import { formatNumber, repsRange } from '@/utils/format';

export default function ExercisesPage() {
  usePageTitle('Вправи');
  const { data, records, saveExercise } = useData();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'all' | 'custom'>('all');
  const [equipment, setEquipment] = useState<EquipmentFilter>('all');
  const [creating, setCreating] = useState(false);

  const groups = useMemo(() => {
    const present = new Set(data.exercises.map((e) => e.muscleGroup));
    return (Object.keys(MUSCLE_GROUPS) as MuscleGroup[]).filter((g) => present.has(g));
  }, [data.exercises]);
  const hasCustom = data.exercises.some((e) => e.isCustom);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.exercises
      .filter((e) => (group === 'all' ? true : group === 'custom' ? e.isCustom : e.muscleGroup === group))
      .filter((e) => equipment === 'all' || e.equipment === equipment)
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  }, [data.exercises, query, group, equipment]);

  return (
    <div>
      <TopBar
        back="/plan"
        title="Вправи"
        subtitle={`${data.exercises.length} у бібліотеці`}
        actions={
          <Button size="sm" icon={Plus} className="h-11 px-4" onClick={() => setCreating(true)}>
            Власна
          </Button>
        }
      />

      <div className="mb-5 space-y-3">
        <label className="relative block max-w-xl">
          <span className="sr-only">Пошук вправи</span>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук вправи"
            className="h-12 w-full rounded-ctl border border-line bg-surface pl-11 pr-4 text-[16px] placeholder:text-subtle focus:border-accent/60 focus:outline-none"
          />
        </label>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Фільтр">
          {(['all', ...(hasCustom ? (['custom'] as const) : []), ...groups] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={group === g}
              onClick={() => setGroup(g)}
              className={clsx(
                'h-10 shrink-0 rounded-full border px-4 text-[14px] font-medium transition',
                group === g ? 'border-accent/40 bg-accent/15 text-accent' : 'border-line text-muted hover:text-fg',
              )}
            >
              {g === 'all' ? 'Усі' : g === 'custom' ? 'Власні' : MUSCLE_GROUPS[g]}
            </button>
          ))}
        </div>
        <EquipmentChips exercises={data.exercises} value={equipment} onChange={setEquipment} className="-mx-4 px-4 sm:mx-0 sm:flex-wrap sm:px-0" />
      </div>

      {list.length === 0 ? (
        <p className="card p-8 text-center text-muted">Нічого не знайдено</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {list.map((e) => {
            const pr = records.get(e.id);
            return (
              <li key={e.id}>
                <Link to={`/exercises/${e.id}`} className="card-interactive flex items-center gap-3.5 p-3.5">
                  <ExerciseThumb exercise={e} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{e.name}</span>
                      {e.isCustom && <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">Власна</span>}
                    </span>
                    <span className="block text-[13px] text-subtle">
                      {MUSCLE_GROUPS[e.muscleGroup]} · {EQUIPMENT[e.equipment]} · {e.defaultSets} × {repsRange(e.defaultRepsMin, e.defaultRepsMax)}
                    </span>
                  </span>
                  {pr && <span className="tabular hidden text-[14px] font-medium text-muted sm:block">{formatNumber(pr.weight, 2)} кг</span>}
                  <ChevronRight size={18} className="text-subtle" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <ExerciseFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSave={(ex) => {
          saveExercise(ex);
          setCreating(false);
          toast.success('Вправу створено', ex.name);
        }}
      />
    </div>
  );
}
