import { useId } from 'react';
import { Switch as GlassSwitch } from 'glisse';

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
      <GlassSwitch id={id} checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}
