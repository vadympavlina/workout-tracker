import { useId } from 'react';
import { metricRgb, type MetricColor } from './ActivityRings';

interface Props {
  values: number[];
  color: MetricColor;
  width?: number;
  height?: number;
  className?: string;
}

/** Tiny decorative trend line for stat tiles (the tile's number carries the data). */
export function Sparkline({ values, color, width = 96, height = 32, className }: Props) {
  const id = useId().replace(/:/g, '');
  // No trend to show (too few points, or nothing logged yet).
  if (values.length < 2 || values.every((v) => v === values[0])) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const rgb = metricRgb(color);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden overflow="visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgb(${rgb})`} stopOpacity={0.3} />
          <stop offset="100%" stopColor={`rgb(${rgb})`} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={`rgb(${rgb})`} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3.5} fill={`rgb(${rgb})`} stroke="rgb(var(--c-surface))" strokeWidth={2} />
    </svg>
  );
}
