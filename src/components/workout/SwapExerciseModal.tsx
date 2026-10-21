import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { Exercise } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { ExerciseThumb } from '@/components/exercise/ExerciseThumb';
import { EquipmentChips, type EquipmentFilter } from '@/components/exercise/EquipmentChips';
import { EQUIPMENT } from '@/data/labels';
import { MUSCLE_LABELS, muscleTargets } from '@/data/exerciseMedia';
import { useData } from '@/store/DataContext';
import { alternativesFor } from '@/utils/alternatives';
import { lastPerformance } from '@/utils/stats';
import { formatNumber } from '@/utils/format';

interface Props {
  open: boolean;
  onClose: () => void;
  original: Exercise | undefined;
  /** Exercises already in the workout. */
  excludeIds: string[];
  /** True when sets of the original are already done (they are kept). */
  hasDoneSets: boolean;
  onSelect: (exercise: Exercise) => void;
}

/** "The machine is taken": exercises for the same muscles, filterable by what's free. */
export function SwapExerciseModal({ open, onClose, original, excludeIds, hasDoneSets, onSelect }: Props) {
  const { data, sessions } = useData();
  const [equipment, setEquipment] = useState<EquipmentFilter>('all');
  useEffect(() => {
    if (open) setEquipment('all');
  }, [open, original?.id]);

  const alts = useMemo(() => (original ? alternativesFor(original, data.exercises, excludeIds) : []), [original, data.exercises, excludeIds]);
  const shown = alts.filter((a) => equipment === 'all' || a.exercise.equipment === equipment);
  const primary = original ? muscleTargets(original).primary : [];

  return (
    <Modal
      open={open && !!original}
      onClose={onClose}
      title="Замінити вправу"
      description={
        primary.length
          ? `Ті самі мʼязи, що й у «${original?.name}»: ${primary.map((m) => MUSCLE_LABELS[m]).join(', ')}`
          : `Схожі на «${original?.name}»`
      }
      size="lg"
    >
      {hasDoneSets && (
        <p className="mb-3 rounded-[14px] bg-white/[0.04] px-3 py-2.5 text-[13px] text-muted">
          Виконані підходи збережуться, а нова вправа стане наступною.
        </p>
      )}
      <EquipmentChips exercises={alts.map((a) => a.exercise)} value={equipment} onChange={setEquipment} className="-mx-1 mb-3 px-1" />
      {shown.length === 0 ? (
        <p className="py-8 text-center text-muted">Немає схожих вправ{equipment !== 'all' ? ' з цим обладнанням' : ''}</p>
      ) : (
        <ul className="space-y-1.5" aria-label="Схожі вправи">
          {shown.map(({ exercise: e, match }) => {
            const last = lastPerformance(sessions, e.id);
            const best = last?.exercise.sets.filter((s) => s.done).reduce((b, s) => (s.weight > b.weight ? s : b), { weight: 0, reps: 0 } as { weight: number; reps: number });
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onSelect(e)}
                  className="flex w-full min-w-0 items-center gap-3 rounded-ctl p-2.5 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]"
                >
                  <ExerciseThumb exercise={e} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{e.name}</span>
                    <span className="block truncate text-[13px] text-subtle">
                      {EQUIPMENT[e.equipment]}
                      {match >= 1 ? ' · ті самі мʼязи' : match > 0 ? ' · частково ті самі' : ''}
                      {best && best.reps > 0 && ` · було ${best.weight > 0 ? `${formatNumber(best.weight, 2)}×` : ''}${best.reps}`}
                    </span>
                  </span>
                  <ArrowLeftRight size={17} className="shrink-0 text-subtle" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
