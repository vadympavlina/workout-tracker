import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sparkline } from './Sparkline';
import type { MetricColor } from './ActivityRings';

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: LucideIcon;
  /** Metric identity colour for the icon dot and sparkline. */
  color?: MetricColor;
  trend?: { value: string; direction: 'up' | 'down' | 'flat'; positive?: boolean; hint?: string };
  spark?: number[];
  className?: string;
  valueClassName?: string;
}

const dot: Record<MetricColor, string> = {
  move: 'bg-move',
  volume: 'bg-volume',
  sets: 'bg-sets',
  body: 'bg-body',
  accent: 'bg-accent',
};

export function StatCard({ label, value, unit, icon: Icon, color, trend, spark, className, valueClassName }: Props) {
  const positive = trend?.positive ?? trend?.direction === 'up';
  return (
    <div className={clsx('card relative flex min-h-[132px] flex-col justify-between gap-3 overflow-hidden p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow flex min-w-0 items-center gap-2">
          {color && <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', dot[color])} aria-hidden />}
          <span className="truncate">{label}</span>
        </span>
        {Icon && <Icon size={15} className="shrink-0 text-subtle" aria-hidden />}
      </div>
      <p className={clsx('metric text-[32px]', valueClassName)}>
        {value}
        {unit && <span className="ml-1 font-mono text-[11px] font-medium uppercase tracking-normal text-subtle">{unit}</span>}
      </p>
      <div className="flex min-h-[28px] items-end justify-between gap-2">
        {trend ? (
          <p
            className={clsx(
              'inline-flex min-w-0 flex-wrap items-center gap-x-1 text-[12px] font-medium leading-tight',
              trend.direction === 'flat' ? 'text-subtle' : positive ? 'text-positive' : 'text-negative',
            )}
          >
            {trend.direction === 'up' && <ArrowUpRight size={14} aria-hidden />}
            {trend.direction === 'down' && <ArrowDownRight size={14} aria-hidden />}
            <span>{trend.value}</span>
            {trend.hint && <span className="font-normal text-subtle">{trend.hint}</span>}
          </p>
        ) : (
          <span />
        )}
        {spark && color && <Sparkline values={spark} color={color} width={56} height={26} className="shrink-0" />}
      </div>
    </div>
  );
}
