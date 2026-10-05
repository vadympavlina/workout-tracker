import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import clsx from 'clsx';
import { Check, Minus, Plus, Trash2, Trophy } from 'lucide-react';
import type { ActiveExercise, ActiveSet } from '@/types';
import { NumberInput } from '@/components/ui/NumberInput';
import { formatNumber } from '@/utils/format';

interface Props {
  exercise: ActiveExercise;
  isBodyweight: boolean;
  /** Increment for the −/+ weight buttons. */
  weightStep: number;
  recordSetId: string | null;
  onChange: (setIndex: number, patch: Partial<Pick<ActiveSet, 'weight' | 'reps'>>) => void;
  onToggle: (setIndex: number) => void;
  onRemove: (setIndex: number) => void;
}

const GRID = 'grid grid-cols-[28px_minmax(0,1fr)_64px_46px] items-center gap-1.5 sm:grid-cols-[40px_minmax(0,1fr)_96px_52px] sm:gap-2.5';
const REVEAL = 88;

/**
 * Compact set logger. Each row: set number, weight with −/+ steppers, reps, done.
 * Last time's values sit as tiny captions inside the inputs. Swipe a row left —
 * or tap its number — to reveal "Delete".
 */
export function SetTable({ exercise, isBodyweight, weightStep, recordSetId, onChange, onToggle, onRemove }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div role="table" aria-label={`Підходи: ${exercise.name}`} className="relative">
      <div role="row" className={clsx(GRID, 'px-1 pb-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-subtle')}>
        <span role="columnheader" className="text-center">
          #
        </span>
        <span role="columnheader" className="text-center">
          {isBodyweight ? 'Дод. кг' : 'Вага, кг'}
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
        {exercise.sets.map((set, i) => (
          <SetRow
            key={set.id}
            set={set}
            index={i}
            weightStep={weightStep}
            isRecord={recordSetId === set.id}
            open={openId === set.id}
            onOpenChange={(open) => setOpenId(open ? set.id : null)}
            onChange={(patch) => onChange(i, patch)}
            onToggle={() => onToggle(i)}
            onRemove={() => {
              setOpenId(null);
              onRemove(i);
            }}
          />
        ))}
      </div>
      {exercise.sets.length > 0 && (
        <p className="mt-2 text-center text-[11.5px] text-subtle">Свайп ← або натисни номер, щоб видалити підхід</p>
      )}
    </div>
  );
}

interface RowProps {
  set: ActiveSet;
  index: number;
  weightStep: number;
  isRecord: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<Pick<ActiveSet, 'weight' | 'reps'>>) => void;
  onToggle: () => void;
  onRemove: () => void;
}

function SetRow({ set, index, weightStep, isRecord, open, onOpenChange, onChange, onToggle, onRemove }: RowProps) {
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null);
  const offset = drag ?? (open ? -REVEAL : 0);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return; // swipe is a touch gesture; mouse users tap the number
    start.current = { x: e.clientX, y: e.clientY, base: open ? -REVEAL : 0, horizontal: null };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.horizontal === null && Math.hypot(dx, dy) > 8) s.horizontal = Math.abs(dx) > Math.abs(dy);
    if (s.horizontal) setDrag(Math.max(-REVEAL - 20, Math.min(0, s.base + dx)));
  };
  const onPointerEnd = () => {
    if (start.current?.horizontal && drag !== null) onOpenChange(drag < -REVEAL / 2);
    start.current = null;
    setDrag(null);
  };

  const bump = (dir: 1 | -1) => onChange({ weight: Math.max(0, Math.round(((set.weight ?? 0) + dir * weightStep) * 100) / 100) });

  return (
    <div role="row" className="relative overflow-hidden rounded-[18px]">
      <button
        type="button"
        onClick={onRemove}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        className={clsx(
          'absolute inset-y-0 right-0 flex items-center justify-center gap-1.5 rounded-[18px] bg-negative text-[13px] font-semibold text-black transition-opacity',
          offset === 0 ? 'opacity-0' : 'opacity-100',
        )}
        style={{ width: REVEAL - 6 }}
      >
        <Trash2 size={16} aria-hidden />
        Видалити
      </button>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className={clsx(
          GRID,
          'relative rounded-[18px] bg-[rgb(var(--c-surface))] px-1 py-1',
          drag === null && 'transition-transform duration-300 ease-out',
        )}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
      >
        <span className={clsx('pointer-events-none absolute inset-0 rounded-[18px] transition-colors duration-300', set.done ? 'bg-positive/[0.09]' : 'bg-transparent')} aria-hidden />
        <span role="cell" className="relative flex justify-center">
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            aria-label={`Підхід ${index + 1}: дії`}
            aria-expanded={open}
            className={clsx(
              'tabular inline-flex h-9 w-7 items-center justify-center rounded-lg text-[15px] font-semibold transition hover:bg-white/[0.06] sm:w-9',
              set.done ? 'text-positive' : 'text-muted',
            )}
          >
            {index + 1}
          </button>
        </span>

        <span role="cell" className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => bump(-1)}
            disabled={(set.weight ?? 0) <= 0}
            aria-label={`Мінус ${formatNumber(weightStep, 2)} кг, підхід ${index + 1}`}
            className="inline-flex h-12 w-8 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.04] text-muted transition hover:bg-white/[0.08] hover:text-fg active:scale-90 disabled:opacity-30 sm:w-10"
          >
            <Minus size={15} aria-hidden />
          </button>
          <NumberInput
            variant="compact"
            className="min-w-0 flex-1"
            value={set.weight}
            decimals={2}
            max={1000}
            placeholder="0"
            caption={set.prevWeight != null ? `було ${formatNumber(set.prevWeight, 2)}` : undefined}
            ariaLabel={`Вага, підхід ${index + 1}`}
            dimmed={set.done}
            onChange={(weight) => onChange({ weight })}
          />
          <button
            type="button"
            onClick={() => bump(1)}
            aria-label={`Плюс ${formatNumber(weightStep, 2)} кг, підхід ${index + 1}`}
            className="inline-flex h-12 w-8 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.04] text-muted transition hover:bg-white/[0.08] hover:text-fg active:scale-90 sm:w-10"
          >
            <Plus size={15} aria-hidden />
          </button>
        </span>

        <span role="cell" className="relative">
          <NumberInput
            variant="compact"
            value={set.reps}
            max={200}
            placeholder="0"
            caption={set.prevReps != null ? `було ${set.prevReps}` : undefined}
            ariaLabel={`Повторення, підхід ${index + 1}`}
            dimmed={set.done}
            onChange={(reps) => onChange({ reps })}
          />
        </span>

        <span role="cell" className="relative flex justify-center">
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={set.done}
            aria-label={set.done ? `Підхід ${index + 1} виконано, скасувати` : `Позначити підхід ${index + 1} виконаним`}
            className={clsx(
              'inline-flex h-11 w-11 items-center justify-center rounded-full transition duration-200 active:scale-90',
              set.done
                ? 'bg-positive text-black shadow-[0_4px_16px_-4px_rgb(var(--c-positive)/0.7)]'
                : 'bg-white/[0.07] text-subtle hover:bg-white/[0.12] hover:text-fg',
            )}
          >
            <Check size={20} strokeWidth={2.6} aria-hidden />
          </button>
        </span>

        {isRecord && (
          <span className="pointer-events-none absolute -top-0.5 right-12 flex animate-pop items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[11px] font-bold text-black shadow-lg">
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
    </div>
  );
}
