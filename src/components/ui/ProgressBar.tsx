import clsx from 'clsx';

interface Props {
  value: number;
  max: number;
  label?: string;
  tone?: 'accent' | 'positive';
  className?: string;
}

export function ProgressBar({ value, max, label, tone = 'accent', className }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={clsx('h-1 w-full overflow-hidden rounded-full bg-white/[0.08]', className)}
    >
      <div
        className={clsx('h-full rounded-full transition-[width] duration-500 ease-out', tone === 'accent' ? 'bg-accent' : 'bg-positive')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface RingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: React.ReactNode;
}

export function ProgressRing({ value, max, size = 64, stroke = 6, label, children }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-white/[0.07]" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={clsx('transition-[stroke-dashoffset] duration-700 ease-out', pct >= 1 ? 'stroke-positive' : 'stroke-accent')}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
