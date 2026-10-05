import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';
import { Minus, Plus } from 'lucide-react';
import { formatNumber, parseDecimal } from '@/utils/format';

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  /** Visually hidden label for compact (table) usage. */
  ariaLabel?: string;
  step?: number;
  min?: number;
  max?: number;
  decimals?: 0 | 1 | 2;
  placeholder?: string;
  suffix?: string;
  /** "stepper" shows −/+ buttons, "compact" is a bare numeric cell for set tables. */
  variant?: 'stepper' | 'compact';
  className?: string;
  disabled?: boolean;
  dimmed?: boolean;
  /** Compact only: tiny caption above the value (e.g. last time's value). */
  caption?: string;
}

/**
 * Numeric input that accepts both "52,5" and "52.5", opens the numeric keypad
 * on phones and selects its content on focus for fast overwriting mid-workout.
 */
export function NumberInput({
  value, onChange, label, ariaLabel, step = 1, min = 0, max = 9999, decimals = 0, placeholder, suffix,
  variant = 'stepper', className, disabled, dimmed, caption,
}: Props) {
  const id = useId();
  const [text, setText] = useState(value == null ? '' : String(value));

  useEffect(() => {
    const parsed = parseDecimal(text);
    if (parsed !== value) setText(value == null ? '' : String(value));
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));

  const commit = (raw: string) => {
    setText(raw);
    const parsed = parseDecimal(raw);
    if (raw.trim() === '') onChange(null);
    else if (parsed != null) onChange(clamp(decimals === 0 ? Math.round(parsed) : parsed));
  };

  const bump = (dir: 1 | -1) => {
    const next = clamp((value ?? 0) + dir * step);
    setText(String(next));
    onChange(next);
  };

  const input = (
    <input
      id={id}
      type="text"
      inputMode={decimals === 0 ? 'numeric' : 'decimal'}
      pattern={decimals === 0 ? '[0-9]*' : undefined}
      autoComplete="off"
      enterKeyHint="next"
      aria-label={ariaLabel ?? label}
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => commit(e.target.value.replace(/[^\d.,]/g, ''))}
      onBlur={() => setText(value == null ? '' : String(value))}
      className={clsx(
        'tabular w-full min-w-0 bg-transparent text-center font-semibold text-fg placeholder:font-normal placeholder:text-subtle focus:outline-none',
        variant === 'compact' ? clsx('h-12 text-[17px]', caption && 'pt-2.5') : 'h-12 text-[18px]',
        dimmed && 'text-muted',
      )}
    />
  );

  if (variant === 'compact') {
    return (
      <div
        className={clsx(
          'relative rounded-[14px] border border-transparent bg-white/[0.06] transition focus-within:border-accent/70 focus-within:bg-accent/[0.06]',
          className,
        )}
      >
        {caption && (
          <span className="pointer-events-none absolute inset-x-0 top-1 text-center font-mono text-[9.5px] leading-none text-subtle" aria-hidden>
            {caption}
          </span>
        )}
        {input}
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label mb-1.5 block">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1 rounded-ctl border border-white/[0.06] bg-white/[0.05] p-1 focus-within:border-accent/70">
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={disabled || (value ?? 0) <= min}
          aria-label={`Зменшити ${label ?? ''}`.trim()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white/[0.06] hover:text-fg active:scale-95 disabled:opacity-30"
        >
          <Minus size={18} aria-hidden />
        </button>
        <div className="relative min-w-0 flex-1">
          {input}
          {suffix && value != null && (
            <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-[13px] text-subtle">{suffix}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => bump(1)}
          disabled={disabled || (value ?? 0) >= max}
          aria-label={`Збільшити ${label ?? ''}`.trim()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white/[0.06] hover:text-fg active:scale-95 disabled:opacity-30"
        >
          <Plus size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export const formatInputNumber = (n: number | null) => (n == null ? '—' : formatNumber(n, 2));
