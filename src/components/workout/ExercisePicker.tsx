import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Check, Plus, Search } from 'lucide-react';
import type { Exercise, MuscleGroup } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ExerciseThumb } from '@/components/exercise/ExerciseThumb';
import { EQUIPMENT, MUSCLE_GROUPS } from '@/data/labels';
import { useData } from '@/store/DataContext';
import { ExerciseFormModal } from './ExerciseFormModal';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  /** Exercise ids already in the workout (shown with a check mark). */
  selectedIds?: string[];
  title?: string;
}

export function ExercisePicker({ open, onClose, onSelect, selectedIds = [], title = 'Додати вправу' }: Props) {
  const { data, saveExercise } = useData();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all');
  const [creating, setCreating] = useState(false);
  const draft = useMemo(() => (creating && query.trim() ? emptyWithName(query.trim()) : null), [creating]);

  const groups = useMemo(() => {
    const present = new Set(data.exercises.map((e) => e.muscleGroup));
    return (Object.keys(MUSCLE_GROUPS) as MuscleGroup[]).filter((g) => present.has(g));
  }, [data.exercises]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.exercises
      .filter((e) => (group === 'all' || e.muscleGroup === group) && (!q || e.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  }, [data.exercises, query, group]);

  return (
    <>
      <Modal open={open && !creating} onClose={onClose} title={title} size="lg">
        <div className="sticky -top-2 z-10 -mx-1 space-y-3 bg-surface px-1 pb-3">
          <label className="relative block">
            <span className="sr-only">Пошук вправи</span>
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Пошук вправи"
              data-autofocus
              className="h-12 w-full rounded-ctl border border-line bg-elevated pl-11 pr-4 text-[16px] placeholder:text-subtle focus:border-accent/60 focus:outline-none"
            />
          </label>
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Фільтр за групою мʼязів">
            {(['all', ...groups] as const).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
                className={clsx(
                  'h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition',
                  group === g ? 'border-accent/40 bg-accent/15 text-accent' : 'border-line text-muted hover:text-fg',
                )}
              >
                {g === 'all' ? 'Усі' : MUSCLE_GROUPS[g]}
              </button>
            ))}
          </div>
        </div>

        <ul className="space-y-1.5">
          {list.map((e) => {
            const added = selectedIds.includes(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onSelect(e)}
                  className="flex w-full items-center gap-3 rounded-ctl p-2.5 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]"
                >
                  <ExerciseThumb exercise={e} className={added ? 'ring-1 ring-accent/50' : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{e.name}</span>
                    <span className="block text-[13px] text-subtle">
                      {MUSCLE_GROUPS[e.muscleGroup]} · {EQUIPMENT[e.equipment]}
                      {e.isCustom && ' · власна'}
                    </span>
                  </span>
                  {added ? <Check size={18} className="text-accent" aria-label="Вже додано" /> : <Plus size={18} className="text-subtle" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
        {list.length === 0 && <p className="py-8 text-center text-muted">Нічого не знайдено</p>}

        <Button variant="secondary" block icon={Plus} className="mt-4" onClick={() => setCreating(true)}>
          Створити власну вправу
        </Button>
      </Modal>

      <ExerciseFormModal
        open={open && creating}
        onClose={() => setCreating(false)}
        initial={draft}
        onSave={(exercise) => {
          saveExercise(exercise);
          setCreating(false);
          setQuery('');
          onSelect(exercise);
        }}
      />
    </>
  );
}

function emptyWithName(name: string): Exercise {
  return {
    id: '',
    name,
    muscleGroup: 'chest',
    equipment: 'machine',
    description: '',
    icon: 'dumbbell',
    defaultSets: 3,
    defaultRepsMin: 8,
    defaultRepsMax: 12,
    isCustom: true,
  };
}
