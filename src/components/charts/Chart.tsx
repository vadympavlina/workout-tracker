import { useId } from 'react';
import type { MetricColor } from '@/components/ui/ActivityRings';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

/** Single-series charts: one accent hue, recessive grid/axes, hover tooltip. No legend (the card title names the series). */

const AXIS = { fontSize: 11, fill: 'rgb(var(--c-subtle))', fontFamily: '"Geist Mono Variable", ui-monospace, monospace' };

interface Point {
  label: string;
  value: number;
}

interface BaseProps {
  data: Point[];
  height?: number;
  formatValue: (v: number) => string;
  /** Screen-reader summary of the chart. */
  ariaLabel: string;
  tone?: MetricColor;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown }>;
  label?: string | number;
  formatValue: (v: number) => string;
}

function ChartTooltip({ active, payload, label, formatValue }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[14px] border border-white/[0.08] bg-[rgb(28_28_31/0.92)] px-3 py-2 shadow-2xl backdrop-blur-xl">
      <p className="font-mono text-[11px] uppercase tracking-wider text-subtle">{label}</p>
      <p className="metric mt-1 text-[17px] text-fg">{formatValue(Number(payload[0].value))}</p>
    </div>
  );
}

const color = (tone: BaseProps['tone'] = 'accent') => `rgb(var(--c-${tone}))`;

export function TrendChart({ data, height = 180, formatValue, ariaLabel, tone = 'accent', domain }: BaseProps & { domain?: [number | 'auto', number | 'auto'] }) {
  const gradientId = useId().replace(/:/g, '');
  const stroke = color(tone);
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.06)" strokeDasharray="2 4" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} dy={6} />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={domain ?? [0, 'auto']}
            tickFormatter={(v: number) => (v >= 10000 ? `${Math.round(v / 1000)}k` : String(Math.round(v * 10) / 10))}
          />
          <Tooltip
            cursor={{ stroke: 'rgb(255 255 255 / 0.15)', strokeWidth: 1 }}
            content={<ChartTooltip formatValue={formatValue} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'rgb(var(--c-surface))', fill: stroke }}
            isAnimationActive
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, height = 180, formatValue, ariaLabel, tone = 'accent', highlightLast = true }: BaseProps & { highlightLast?: boolean }) {
  const fill = color(tone);
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.06)" strokeDasharray="2 4" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={12} dy={6} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} content={<ChartTooltip formatValue={formatValue} />} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            animationDuration={700}
            shape={(props: unknown) => {
              const { x, y, width, height: h, index } = props as { x: number; y: number; width: number; height: number; index: number };
              const isLast = index === data.length - 1;
              const r = Math.min(4, width / 2, Math.max(0, h));
              if (h <= 0) return <g />;
              return (
                <path
                  d={`M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + h} Z`}
                  fill={fill}
                  fillOpacity={highlightLast && !isLast ? 0.72 : 1}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
