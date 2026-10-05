import { useId } from 'react';
import clsx from 'clsx';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Switch({ checked, onChange, label, description }: Props) {
  const id = useId();
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[15px] font-medium">
          {label}
        </label>
        {description && <p className="text-[13px] text-subtle">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full transition duration-200',
          checked ? 'bg-accent' : 'bg-white/[0.12]',
        )}
      >
        <span
          className={clsx(
            'inline-block h-[24px] w-[24px] rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-[23px]' : 'translate-x-[3px]',
          )}
        />
      </button>
    </div>
  );
}
