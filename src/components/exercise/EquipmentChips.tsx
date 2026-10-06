import clsx from 'clsx';
import type { Equipment, Exercise } from '@/types';
import { EQUIPMENT } from '@/data/labels';

export type EquipmentFilter = Equipment | 'all';

interface Props {
  exercises: Exercise[];
  value: EquipmentFilter;
  onChange: (value: EquipmentFilter) => void;
  className?: string;
}

/** Second filter row in exercise lists: only equipment types that actually occur. */
export function EquipmentChips({ exercises, value, onChange, className }: Props) {
  const present = new Set(exercises.map((e) => e.equipment));
  const options = (Object.keys(EQUIPMENT) as Equipment[]).filter((k) => present.has(k));
  if (options.length < 2) return null;
  return (
    <div className={clsx('scrollbar-none flex gap-1.5 overflow-x-auto', className)} role="group" aria-label="Фільтр за обладнанням">
      {(['all', ...options] as const).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className={clsx(
            'h-8 shrink-0 rounded-full px-3 text-[13px] font-medium transition',
            value === k ? 'bg-white/[0.12] text-fg' : 'text-subtle hover:text-fg',
          )}
        >
          {k === 'all' ? 'Будь-яке обладнання' : EQUIPMENT[k]}
        </button>
      ))}
    </div>
  );
}
