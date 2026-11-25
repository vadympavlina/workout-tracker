import { Fragment, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import clsx from 'clsx';
import { Check, Minus, NotebookPen, Plus, Trash2, Trophy } from 'lucide-react';
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
  /** Reps in reserve for a done set (null clears it). */
  onRir: (setIndex: number, rir: number | null) => void;
  /** Note for one set; an empty string removes it. */
  onNote: (setIndex: number, note: string) => void;
}

const RIR_OPTIONS = [0, 1, 2, 3, 4] as const;
const rirLabel = (n: number) => (n >= 4 ? '4+' : String(n));

const GRID = 'grid grid-cols-[28px_minmax(0,1fr)_64px_46px] items-center gap-1.5 sm:grid-cols-[40px_minmax(0,1fr)_96px_52px] sm:gap-2.5';
const ACTION = 84;
const REVEAL = ACTION * 2 + 4;

/**
 * Compact set logger. Each row: set number, weight with −/+ steppers, reps, done.
 * Last time's values sit as tiny captions inside the inputs. Swipe a row left —
 * or tap its number — to reveal "Note" and "Delete".
 */
export function SetTable({ exercise, isBodyweight, weightStep, recordSetId, onChange, onToggle, onRemove, onRir, onNote }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  // The effort question follows the latest completed set; earlier answers stay as a badge.
  let lastDone = -1;
  exercise.sets.forEach((s, i) => {
    if (s.done) lastDone = i;
  });

  return (
    <div role="table" aria-label={`Підходи: ${exercise.name}`} className="relative">
      <div role="row" className={clsx(GRID, 'px-1 pb-2 font-mono text-caption2 font-medium uppercase tracking-[0.08em] text-muted')}>
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
          <Fragment key={set.id}>
          <SetRow
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
            onNote={() => {
              setOpenId(null);
              setNoteId(set.id);
            }}
          />
          {(noteId === set.id || set.note) && (
            <SetNote
              index={i}
              value={set.note ?? ''}
              editing={noteId === set.id}
              onEdit={() => setNoteId(set.id)}
              onSave={(note) => {
                setNoteId(null);
                if (note !== (set.note ?? '')) onNote(i, note);
              }}
            />
          )}
          {i === lastDone && !exercise.finished && <RirPicker index={i} value={set.rir ?? null} onChange={(v) => onRir(i, v)} />}
          </Fragment>
        ))}
      </div>
      {exercise.sets.length > 0 && (
        <p className="mt-2 text-center text-caption2 text-subtle">Свайп ← або натисни номер: нотатка чи видалення підходу</p>
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
  onNote: () => void;
}

function SetRow({ set, index, weightStep, isRecord, open, onOpenChange, onChange, onToggle, onRemove, onNote }: RowProps) {
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
    <div role="row" className="relative overflow-hidden rounded-tile">
      <div className={clsx('absolute inset-y-0 right-0 flex gap-1 transition-opacity', offset === 0 ? 'opacity-0' : 'opacity-100')} aria-hidden={!open}>
        <button
          type="button"
          onClick={onNote}
          tabIndex={open ? 0 : -1}
          className="flex flex-col items-center justify-center gap-0.5 rounded-tile bg-white/[0.12] text-caption font-semibold text-fg"
          style={{ width: ACTION }}
        >
          <NotebookPen size={16} aria-hidden />
          Нотатка
        </button>
        <button
          type="button"
          onClick={onRemove}
          tabIndex={open ? 0 : -1}
          className="flex flex-col items-center justify-center gap-0.5 rounded-tile bg-negative text-caption font-semibold text-black"
          style={{ width: ACTION }}
        >
          <Trash2 size={16} aria-hidden />
          Видалити
        </button>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className={clsx(
          GRID,
          'relative rounded-tile bg-[rgb(var(--c-surface))] px-1 py-1',
          drag === null && 'transition-transform duration-300 ease-out',
        )}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
      >
        <span className={clsx('pointer-events-none absolute inset-0 rounded-tile transition-colors duration-300', set.done ? 'bg-positive/[0.09]' : 'bg-transparent')} aria-hidden />
        <span role="cell" className="relative flex justify-center">
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            aria-label={`Підхід ${index + 1}${set.heavy ? ' (важкий)' : ''}: дії`}
            aria-expanded={open}
            className={clsx(
              'tabular inline-flex h-9 w-7 items-center justify-center rounded-lg text-subhead font-semibold transition hover:bg-white/[0.06] sm:w-9',
              set.done ? 'text-positive' : 'text-muted',
            )}
          >
            {index + 1}
          </button>
          {set.heavy && (
            <span className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-warning px-1 text-2xs font-bold uppercase leading-[14px] tracking-wide text-black" aria-hidden>
              важк
            </span>
          )}
          {set.done && set.rir != null && (
            <span
              className="tabular pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-white/[0.08] px-1 text-2xs font-semibold leading-[14px] text-muted"
              title={`Запас: ${rirLabel(set.rir)} повт.`}
            >
              <span className="sr-only">Запас </span>+{rirLabel(set.rir)}
            </span>
          )}
        </span>

        <span role="cell" className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => bump(-1)}
            disabled={(set.weight ?? 0) <= 0}
            aria-label={`Мінус ${formatNumber(weightStep, 2)} кг, підхід ${index + 1}`}
            className="inline-flex h-12 w-10 shrink-0 items-center justify-center rounded-chip bg-white/[0.04] text-muted transition hover:bg-white/[0.08] hover:text-fg active:scale-90 disabled:opacity-30"
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
            className="inline-flex h-12 w-10 shrink-0 items-center justify-center rounded-chip bg-white/[0.04] text-muted transition hover:bg-white/[0.08] hover:text-fg active:scale-90"
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
          <span className="pointer-events-none absolute -top-0.5 right-12 flex animate-pop items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-caption2 font-bold text-black shadow-lg">
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

function RirPicker({ index, value, onChange }: { index: number; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div role="row">
    <div role="cell" className="block">
    <div role="group" aria-label={`Скільки ще повторень міг би зробити, підхід ${index + 1}`} className="flex animate-pop items-center gap-1.5 px-1 py-1">
      <span className="min-w-0 flex-1 text-caption leading-tight text-muted">Скільки ще міг би?</span>
      {RIR_OPTIONS.map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          aria-label={n === 0 ? '0 — до відмови' : `${rirLabel(n)} — ще стільки повторень`}
          onClick={() => onChange(value === n ? null : n)}
          className={clsx(
            'hit tabular inline-flex h-9 min-w-[38px] items-center justify-center rounded-full px-2 text-footnote font-semibold transition active:scale-90',
            value === n ? 'bg-accent text-black' : 'bg-white/[0.06] text-muted hover:text-fg',
          )}
        >
          {rirLabel(n)}
        </button>
      ))}
    </div>
    </div>
    </div>
  );
}

/** A remark under one set: shown as a small line, edited in place. */
function SetNote({ index, value, editing, onEdit, onSave }: { index: number; value: string; editing: boolean; onEdit: () => void; onSave: (note: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);
  const save = () => onSave((ref.current?.value ?? '').trim());
  return (
    <div role="row">
      <div role="cell" className="block px-1">
        {editing ? (
          <input
            ref={ref}
            defaultValue={value}
            maxLength={120}
            enterKeyHint="done"
            placeholder="Нотатка: вузький хват, боліло плече…"
            aria-label={`Нотатка до підходу ${index + 1}`}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') onSave(value);
            }}
            className="h-10 w-full rounded-chip border border-white/[0.1] bg-white/[0.04] px-3 text-subhead text-fg placeholder:text-subtle focus:border-accent/60 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Нотатка до підходу ${index + 1}: ${value}. Змінити`}
            className="flex w-full items-start gap-2 rounded-chip px-2 py-1 text-left text-footnote text-muted transition hover:bg-white/[0.04]"
          >
            <NotebookPen size={14} className="mt-0.5 shrink-0 text-subtle" aria-hidden />
            <span className="min-w-0 flex-1 break-words">{value}</span>
          </button>
        )}
      </div>
    </div>
  );
}
