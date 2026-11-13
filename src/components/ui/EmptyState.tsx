import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Heading level: 2 when the empty state sits directly under the page title (default 3, inside a section). */
  level?: 1 | 2 | 3;
}

export function EmptyState({ icon: Icon, title, description, action, className, level = 3 }: Props) {
  const Heading = `h${level}` as 'h1' | 'h2' | 'h3';
  return (
    <div className={clsx('card flex flex-col items-center px-6 py-10 text-center', className)}>
      <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/[0.12] text-accent">
        <Icon size={26} aria-hidden />
      </span>
      <Heading className="text-title3 font-bold tracking-[-0.02em]">{title}</Heading>
      {description && <p className="mt-1.5 max-w-xs text-subhead text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
