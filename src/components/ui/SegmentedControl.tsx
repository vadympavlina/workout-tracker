import clsx from 'clsx';

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}

/** Glass track with a lens that glides to the selected option. */
export function SegmentedControl<T extends string>({ value, onChange, options, label, className }: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="radiogroup" aria-label={label} className={clsx('glass relative flex rounded-full p-1', className)}>
      <span
        className="glass-thumb pointer-events-none absolute inset-y-1 left-1 rounded-full transition-transform duration-[420ms] ease-[cubic-bezier(0.3,1.25,0.5,1)]"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
        aria-hidden
      />
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
              'glass-press relative h-9 min-w-0 flex-1 truncate rounded-full px-2 text-[13px] font-semibold transition-colors duration-200',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
