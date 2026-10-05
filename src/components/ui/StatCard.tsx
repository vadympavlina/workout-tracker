import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: LucideIcon;
  trend?: { value: string; direction: 'up' | 'down' | 'flat'; positive?: boolean; hint?: string };
  className?: string;
  valueClassName?: string;
}

export function StatCard({ label, value, unit, icon: Icon, trend, className, valueClassName }: Props) {
  const positive = trend?.positive ?? trend?.direction === 'up';
  return (
    <div className={clsx('card flex flex-col justify-between gap-3 p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="label truncate">{label}</span>
        {Icon && <Icon size={16} className="shrink-0 text-subtle" aria-hidden />}
      </div>
      <div>
        <p className={clsx('tabular text-[26px] font-semibold leading-none tracking-tight', valueClassName)}>
          {value}
          {unit && <span className="ml-1 text-[15px] font-medium text-muted">{unit}</span>}
        </p>
        {trend && (
          <p
            className={clsx(
              'mt-2 inline-flex items-center gap-1 text-[13px] font-medium',
              trend.direction === 'flat' ? 'text-subtle' : positive ? 'text-positive' : 'text-negative',
            )}
          >
            {trend.direction === 'up' && <TrendingUp size={14} aria-hidden />}
            {trend.direction === 'down' && <TrendingDown size={14} aria-hidden />}
            <span>{trend.value}</span>
            {trend.hint && <span className="font-normal text-subtle">{trend.hint}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
