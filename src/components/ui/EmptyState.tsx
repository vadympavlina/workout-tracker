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
      <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/[0.12] text-accent">
        <Icon size={26} aria-hidden />
      </span>
      <h3 className="text-[19px] font-bold tracking-[-0.02em]">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-[15px] text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
