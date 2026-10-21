import { useState } from 'react';
import clsx from 'clsx';
import { Check, ChevronDown, Flame } from 'lucide-react';
import type { Equipment } from '@/types';
import { warmupSets } from '@/utils/warmup';
import { formatNumber } from '@/utils/format';

/** Ticked warm-up sets per workout exercise — survives switching between exercises. */
const ticked = new Map<string, number[]>();

interface Props {
  /** Workout exercise instance id. */
  id: string;
  working: number | null;
  equipment: Equipment;
}

/** Ramp-up sets before the working weight; a checklist, not logged as sets. */
export function WarmupPanel({ id, working, equipment }: Props) {
  const sets = warmupSets(working, equipment);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<number[]>(() => ticked.get(id) ?? []);
  if (sets.length === 0) return null;

  const toggle = (i: number) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    ticked.set(id, next);
    setDone(next);
  };
  const all = done.length >= sets.length;

  return (
    <div className="relative mt-2 rounded-[14px] bg-white/[0.04]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-[13px]"
      >
        <Flame size={15} className={clsx('shrink-0', all ? 'text-positive' : 'text-warning')} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-fg">Розминка</span>
          <span className="text-muted">
            {' '}
            · {all ? 'готово' : `${sets.length} підх. до ${formatNumber(working ?? 0, 2)} кг`}
          </span>
        </span>
        <ChevronDown size={16} className={clsx('shrink-0 text-subtle transition', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ul className="space-y-1 px-1.5 pb-1.5" aria-label="Розминкові підходи">
          {sets.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                aria-pressed={done.includes(i)}
                onClick={() => toggle(i)}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-[12px] px-2 text-left transition hover:bg-white/[0.04]"
              >
                <span
                  className={clsx(
                    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition',
                    done.includes(i) ? 'bg-positive text-black' : 'bg-white/[0.07] text-subtle',
                  )}
                >
                  <Check size={15} strokeWidth={2.6} aria-hidden />
                </span>
                <span className={clsx('tabular min-w-0 flex-1 text-[14px]', done.includes(i) && 'text-muted line-through decoration-white/20')}>
                  <span className="font-semibold">{formatNumber(s.weight, 2)} кг</span> × {s.reps}
                </span>
                {s.plates && (
                  <span className="tabular shrink-0 text-[12px] text-subtle">
                    {s.plates.length ? `${s.plates.map((p) => formatNumber(p, 2)).join(' + ')} з боку` : 'лише гриф'}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
