import { useEffect, useId, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { Trash2 } from 'lucide-react';

const REVEAL = 96;
/** Dragging past this share of the row width deletes without a second tap. */
const FULL_SWIPE = 0.55;
const CLOSE_OTHERS = 'swipe-to-delete:open';

interface Props {
  children: ReactNode;
  onDelete: () => void;
  /** Accessible name of the revealed button, e.g. "Видалити запис 5 жовтня". */
  label: string;
  /** Wrapper shape — match the row (e.g. rounded-card for cards, none for list rows). */
  className?: string;
  /** Background behind the sliding content, so the red action never shows through. */
  surfaceClassName?: string;
}

/**
 * Touch gesture for list rows: swipe left to reveal "Видалити", or swipe all
 * the way to delete at once. Vertical scrolling is untouched (pan-y), a swipe
 * never triggers the row's link, and only one row is open at a time.
 * Mouse users get no gesture — every list keeps a regular delete action
 * elsewhere (detail page or a button).
 */
export function SwipeToDelete({ children, onDelete, label, className, surfaceClassName = 'bg-[rgb(var(--c-surface))]' }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null);
  const swiped = useRef(false);

  // One open row at a time; tapping anywhere else closes this one.
  useEffect(() => {
    const onOther = (e: Event) => (e as CustomEvent<string>).detail !== id && setOpen(false);
    window.addEventListener(CLOSE_OTHERS, onOther);
    return () => window.removeEventListener(CLOSE_OTHERS, onOther);
  }, [id]);
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent(CLOSE_OTHERS, { detail: id }));
    const onOutside = (e: globalThis.PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [open, id]);

  const width = () => root.current?.offsetWidth ?? 360;
  const remove = () => {
    setRemoving(true);
    navigator.vibrate?.(10);
    window.setTimeout(onDelete, 180);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || removing) return;
    swiped.current = false;
    start.current = { x: e.clientX, y: e.clientY, base: open ? -REVEAL : 0, horizontal: null };
  };
  const onPointerMove = (e: PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.horizontal === null && Math.hypot(dx, dy) > 8) s.horizontal = Math.abs(dx) > Math.abs(dy);
    if (!s.horizontal) return;
    swiped.current = true;
    setDrag(Math.min(0, s.base + dx));
  };
  const onPointerEnd = () => {
    const s = start.current;
    start.current = null;
    if (s?.horizontal && drag !== null) {
      if (-drag > width() * FULL_SWIPE) remove();
      else setOpen(-drag > REVEAL / 2);
    }
    setDrag(null);
  };
  // A swipe (or a tap that closes an open row) must not follow the row's link.
  const onClickCapture = (e: MouseEvent) => {
    if (swiped.current || open) {
      e.preventDefault();
      e.stopPropagation();
      swiped.current = false;
      setOpen(false);
    }
  };

  const offset = removing ? -width() : (drag ?? (open ? -REVEAL : 0));
  const pastFull = drag !== null && -drag > width() * FULL_SWIPE;

  return (
    <div ref={root} className={clsx('relative overflow-hidden', className)}>
      <button
        type="button"
        onClick={remove}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        aria-label={label}
        className={clsx(
          'absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 bg-negative pr-6 text-[14px] font-semibold text-black transition-opacity',
          offset === 0 ? 'opacity-0' : 'opacity-100',
        )}
        style={{ width: Math.max(REVEAL, -offset) }}
      >
        <Trash2 size={18} aria-hidden className={clsx('transition-transform', pastFull && 'scale-125')} />
        Видалити
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
        className={clsx('relative', surfaceClassName, drag === null && 'transition-transform duration-200 ease-out')}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
      >
        {children}
      </div>
    </div>
  );
}
