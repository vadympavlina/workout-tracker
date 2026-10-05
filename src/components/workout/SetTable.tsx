import clsx from 'clsx';
import { Check, Trophy } from 'lucide-react';
import type { ActiveExercise, ActiveSet } from '@/types';
import { NumberInput } from '@/components/ui/NumberInput';
import { formatNumber } from '@/utils/format';

interface Props {
  exercise: ActiveExercise;
  isBodyweight: boolean;
  recordSetId: string | null;
  onChange: (setIndex: number, patch: Partial<Pick<ActiveSet, 'weight' | 'reps'>>) => void;
  onToggle: (setIndex: number) => void;
}

const GRID = 'grid grid-cols-[30px_minmax(0,1fr)_76px_64px_46px] items-center gap-1.5 sm:grid-cols-[40px_minmax(0,1fr)_96px_88px_52px] sm:gap-2.5';

/** Compact set logger: one row per set — previous result, kg, reps, done. */
export function SetTable({ exercise, isBodyweight, recordSetId, onChange, onToggle }: Props) {
  return (
    <div role="table" aria-label={`Підходи: ${exercise.name}`}>
      <div role="row" className={clsx(GRID, 'px-1 pb-2 text-[12px] font-semibold uppercase tracking-wide text-subtle')}>
        <span role="columnheader" className="text-center">
          #
        </span>
        <span role="columnheader">Минулого</span>
        <span role="columnheader" className="text-center">
          {isBodyweight ? '+КГ' : 'КГ'}
        </span>
        <span role="columnheader" className="text-center">
          Повт.
        </span>
        <span role="columnheader" className="text-center">
          <span className="sr-only">Виконано</span>
          <Check size={14} className="mx-auto" aria-hidden />
        </span>
      </div>

      <div role="rowgroup" className="space-y-1.5">
        {exercise.sets.map((set, i) => {
          const isRecord = recordSetId === set.id;
          return (
            <div
              key={set.id}
              role="row"
              className={clsx(
                GRID,
                'relative rounded-ctl px-1 py-1 transition-colors duration-300',
                set.done ? 'bg-positive/[0.07]' : 'bg-transparent',
              )}
            >
              <span role="cell" className={clsx('tabular text-center text-[15px] font-semibold', set.done ? 'text-positive' : 'text-muted')}>
                {i + 1}
              </span>
              <span role="cell" className="tabular truncate text-[13px] text-subtle">
                {set.prevWeight != null && set.prevReps != null ? `${formatNumber(set.prevWeight, 2)} × ${set.prevReps}` : '—'}
              </span>
              <span role="cell">
                <NumberInput
                  variant="compact"
                  value={set.weight}
                  decimals={2}
                  step={2.5}
                  max={1000}
                  placeholder="0"
                  ariaLabel={`Вага, підхід ${i + 1}`}
                  dimmed={set.done}
                  onChange={(weight) => onChange(i, { weight })}
                />
              </span>
              <span role="cell">
                <NumberInput
                  variant="compact"
                  value={set.reps}
                  max={200}
                  placeholder="0"
                  ariaLabel={`Повторення, підхід ${i + 1}`}
                  dimmed={set.done}
                  onChange={(reps) => onChange(i, { reps })}
                />
              </span>
              <span role="cell" className="flex justify-center">
                <button
                  type="button"
                  onClick={() => onToggle(i)}
                  aria-pressed={set.done}
                  aria-label={set.done ? `Підхід ${i + 1} виконано, скасувати` : `Позначити підхід ${i + 1} виконаним`}
                  className={clsx(
                    'inline-flex h-11 w-11 items-center justify-center rounded-xl border transition duration-200 active:scale-90',
                    set.done
                      ? 'border-positive bg-positive text-[#06210f]'
                      : 'border-line bg-white/[0.04] text-subtle hover:border-white/20 hover:text-fg',
                  )}
                >
                  <Check size={20} strokeWidth={2.6} aria-hidden />
                </button>
              </span>

              {isRecord && (
                <span className="pointer-events-none absolute -top-2 right-12 flex animate-pop items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[11px] font-bold text-[#231500] shadow-lg">
                  <Trophy size={12} aria-hidden />
                  Рекорд
                </span>
              )}
              {isRecord && (
                <span className="pointer-events-none absolute right-3 top-0 animate-rise text-warning" aria-hidden>
                  <Trophy size={22} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
