import clsx from 'clsx';

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}

export function SegmentedControl<T extends string>({ value, onChange, options, label, className }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={clsx('flex rounded-full bg-white/[0.06] p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'h-9 flex-1 rounded-full px-3 text-[13px] font-semibold transition duration-200',
              active ? 'bg-fg text-black shadow-card' : 'text-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
