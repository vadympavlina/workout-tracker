import { useEffect, useState, type ReactNode } from 'react';

export type MetricColor = 'move' | 'volume' | 'sets' | 'body' | 'accent';

export const metricRgb = (c: MetricColor) => `var(--c-${c})`;

export interface Ring {
  value: number;
  max: number;
  color: MetricColor;
  label: string;
}

interface Props {
  rings: Ring[];
  size?: number;
  stroke?: number;
  gap?: number;
  children?: ReactNode;
  /** Accessible summary; defaults to the ring labels with percentages. */
  label?: string;
}

/**
 * Concentric progress rings (outermost first). Arcs animate in on mount;
 * progress beyond 100% wraps into a second, brighter lap like Apple Fitness.
 */
export function ActivityRings({ rings, size = 168, stroke = 16, gap = 4, children, label }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const summary =
    label ?? rings.map((r) => `${r.label}: ${r.max > 0 ? Math.round((r.value / r.max) * 100) : 0}%`).join(', ');

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role={summary ? 'img' : undefined}
        aria-label={summary || undefined}
        aria-hidden={summary ? undefined : true}
        className="-rotate-90"
      >
        {rings.map((ring, i) => {
          const r = size / 2 - stroke / 2 - i * (stroke + gap);
          if (r <= stroke / 2) return null;
          const c = 2 * Math.PI * r;
          const pct = ring.max > 0 ? ring.value / ring.max : 0;
          const first = Math.min(1, pct);
          const second = Math.min(1, Math.max(0, pct - 1));
          const color = `rgb(${metricRgb(ring.color)})`;
          return (
            <g key={ring.label}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke={`rgb(${metricRgb(ring.color)} / 0.13)`} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                stroke={color}
                strokeDasharray={c}
                strokeDashoffset={mounted ? c * (1 - first) : c}
                style={{
                  transition: `stroke-dashoffset 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 120}ms`,
                  filter: `drop-shadow(0 0 6px rgb(${metricRgb(ring.color)} / 0.45))`,
                  opacity: first === 0 ? 0 : 1,
                }}
              />
              {second > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  stroke={color}
                  strokeDasharray={c}
                  strokeDashoffset={mounted ? c * (1 - second) : c}
                  style={{
                    transition: `stroke-dashoffset 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) ${1000 + i * 120}ms`,
                    filter: 'brightness(1.25) drop-shadow(0 0 4px rgb(0 0 0 / 0.8))',
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
