import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

interface DragState {
  from: number;
  to: number;
  dy: number;
}

/**
 * Pointer-based drag-to-reorder for a vertical list (touch and mouse).
 * Attach `register(i)` to each item, spread `handleProps(i)` on its grip and
 * apply `itemStyle(i)`. `onMove(from, to)` fires once on drop.
 */
export function useDragReorder(count: number, onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const rects = useRef<DOMRect[]>([]);
  const startY = useRef(0);

  const gap = () => {
    const r = rects.current;
    return r.length > 1 ? Math.max(0, r[1].top - r[0].bottom) : 12;
  };

  const register = (i: number) => (el: HTMLElement | null) => {
    els.current[i] = el;
  };

  const end = () => {
    if (drag && drag.to !== drag.from) onMove(drag.from, drag.to);
    setDrag(null);
  };

  const handleProps = (i: number) => ({
    style: { touchAction: 'none', cursor: drag ? 'grabbing' : 'grab' } as CSSProperties,
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      rects.current = els.current.slice(0, count).map((el) => el?.getBoundingClientRect() ?? new DOMRect());
      startY.current = e.clientY;
      setDrag({ from: i, to: i, dy: 0 });
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      if (!drag) return;
      const dy = e.clientY - startY.current;
      const r = rects.current;
      const center = r[drag.from].top + r[drag.from].height / 2 + dy;
      let to = drag.from;
      for (let j = 0; j < drag.from; j++) {
        if (center < r[j].top + r[j].height / 2) {
          to = j;
          break;
        }
      }
      if (to === drag.from) {
        for (let j = r.length - 1; j > drag.from; j--) {
          if (center > r[j].top + r[j].height / 2) {
            to = j;
            break;
          }
        }
      }
      setDrag({ ...drag, dy, to });
    },
    onPointerUp: end,
    onPointerCancel: () => setDrag(null),
  });

  const itemStyle = (i: number): CSSProperties => {
    if (!drag) return {};
    if (i === drag.from) {
      return { transform: `translateY(${drag.dy}px) scale(1.02)`, zIndex: 20, position: 'relative', boxShadow: '0 20px 40px -12px rgb(0 0 0 / 0.9)' };
    }
    const shift = rects.current[drag.from].height + gap();
    const transition = 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return { transform: `translateY(${-shift}px)`, transition };
    if (drag.to < drag.from && i >= drag.to && i < drag.from) return { transform: `translateY(${shift}px)`, transition };
    return { transition };
  };

  return { register, handleProps, itemStyle, dragging: drag?.from ?? null };
}
