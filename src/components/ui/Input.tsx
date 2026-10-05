import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

const fieldBase =
  'w-full rounded-ctl border border-line bg-elevated px-3.5 text-[16px] text-fg placeholder:text-subtle transition duration-200 hover:border-white/[0.12] focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  suffix?: ReactNode;
}

type InputProps = FieldProps & InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, suffix, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label mb-1.5 block">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={clsx(fieldBase, 'h-12', suffix && 'pr-12', error && 'border-negative/60')}
          {...rest}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[15px] text-subtle">{suffix}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-err`} className="mt-1.5 text-[13px] text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-[13px] text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

type TextareaProps = FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label mb-1.5 block">
          {label}
        </label>
      )}
      <textarea ref={ref} id={inputId} className={clsx(fieldBase, 'min-h-[88px] resize-y py-3')} {...rest} />
      {hint && <p className="mt-1.5 text-[13px] text-subtle">{hint}</p>}
    </div>
  );
});

interface SelectProps extends FieldProps, Omit<InputHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...rest }: SelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label mb-1.5 block">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={clsx(fieldBase, 'h-12 appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
