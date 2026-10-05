import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const pads = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-6' };

export function Card({ as: Tag = 'div', padding = 'md', className, ...rest }: CardProps) {
  return <Tag className={clsx('card', pads[padding], className)} {...rest} />;
}

interface SectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}

/** A titled page section: heading + optional trailing action. */
export function Section({ title, action, children, className, id }: SectionProps) {
  const headingId = id ?? `s-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <section aria-labelledby={headingId} className={clsx('space-y-3', className)}>
      <div className="flex min-h-[32px] items-center justify-between gap-3">
        <h2 id={headingId} className="text-[17px] font-semibold tracking-tight">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
