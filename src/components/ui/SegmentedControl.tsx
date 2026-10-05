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
    <div role="radiogroup" aria-label={label} className={clsx('flex rounded-ctl border border-line bg-surface p-1', className)}>
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
              'h-9 flex-1 rounded-xl px-3 text-[13px] font-semibold transition duration-200',
              active ? 'bg-elevated text-fg shadow-card ring-1 ring-inset ring-white/[0.08]' : 'text-subtle hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
