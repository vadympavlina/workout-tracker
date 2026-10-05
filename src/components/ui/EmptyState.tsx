import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div className={clsx('card flex flex-col items-center px-6 py-10 text-center', className)}>
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-card bg-accent/10 text-accent ring-1 ring-inset ring-accent/15">
        <Icon size={26} aria-hidden />
      </span>
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-[15px] text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
