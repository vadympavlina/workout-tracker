import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Check, Info, Plus } from 'lucide-react';
import type { Exercise, MuscleGroup } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ExerciseThumb } from '@/components/exercise/ExerciseThumb';
import { ExerciseInfo } from '@/components/exercise/ExerciseInfo';
import { EQUIPMENT, MUSCLE_GROUPS } from '@/data/labels';
import { EquipmentChips, type EquipmentFilter } from '@/components/exercise/EquipmentChips';
import { useData } from '@/store/DataContext';
import { SearchBox } from '@/components/ui/SearchBox';
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
  const [equipment, setEquipment] = useState<EquipmentFilter>('all');
  const [creating, setCreating] = useState(false);
  /** Exercise opened for a closer look before adding it. */
  const [preview, setPreview] = useState<Exercise | null>(null);
  const draft = useMemo(() => (creating && query.trim() ? emptyWithName(query.trim()) : null), [creating]);

  const groups = useMemo(() => {
    const present = new Set(data.exercises.map((e) => e.muscleGroup));
    return (Object.keys(MUSCLE_GROUPS) as MuscleGroup[]).filter((g) => present.has(g));
  }, [data.exercises]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.exercises
      .filter((e) => (group === 'all' || e.muscleGroup === group) && (equipment === 'all' || e.equipment === equipment))
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  }, [data.exercises, query, group, equipment]);

  return (
    <>
      <Modal open={open && !creating && !preview} onClose={onClose} title={title} size="lg" rememberScroll="exercise-picker">
        <div className="sticky -top-2 z-10 -mx-1 space-y-3 bg-[rgb(26_26_29/0.94)] px-1 pb-3 backdrop-blur-xl">
          <SearchBox label="Пошук вправи" placeholder="Пошук вправи" value={query} onChange={setQuery} autoFocus />
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Фільтр за групою мʼязів">
            {(['all', ...groups] as const).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
                data-variant={group === g ? 'filled' : undefined}
                className={clsx('lg-glass lg-button h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium', group !== g && 'text-muted')}
              >
                {g === 'all' ? 'Усі' : MUSCLE_GROUPS[g]}
              </button>
            ))}
          </div>
          <EquipmentChips exercises={data.exercises} value={equipment} onChange={setEquipment} className="-mx-1 px-1" />
        </div>

        <ul className="space-y-1.5">
          {list.map((e) => {
            const added = selectedIds.includes(e.id);
            return (
              <li key={e.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(e)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-ctl p-2.5 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]"
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
                <button
                  type="button"
                  onClick={() => setPreview(e)}
                  aria-label={`Деталі: ${e.name}`}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white/[0.06] hover:text-fg"
                >
                  <Info size={19} aria-hidden />
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

      <Modal
        open={open && !!preview}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ''}
        description={preview ? `${MUSCLE_GROUPS[preview.muscleGroup]} · ${EQUIPMENT[preview.equipment]}` : undefined}
        size="lg"
        footer={
          preview && (
            <>
              <Button variant="secondary" block onClick={() => setPreview(null)}>
                До списку
              </Button>
              {selectedIds.includes(preview.id) ? (
                <Button block icon={Check} disabled>
                  Вже додано
                </Button>
              ) : (
                <Button
                  block
                  icon={Plus}
                  onClick={() => {
                    onSelect(preview);
                    setPreview(null);
                  }}
                >
                  Додати
                </Button>
              )}
            </>
          )
        }
      >
        {preview && <ExerciseInfo exercise={preview} compact />}
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
