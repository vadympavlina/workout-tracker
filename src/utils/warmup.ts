import type { Equipment } from '@/types';
import { platesPerSide } from './plates';

export interface WarmupSet {
  weight: number;
  reps: number;
  /** Plates per side (barbell only). */
  plates?: number[];
}

const BAR = 20;

/**
 * Ramp-up sets before the first working set. Barbell: empty bar, then ~40/60/80%
 * rounded to loadable weights; other loaded equipment: ~50/75%. Sets that would
 * round to the same weight (or reach the working weight) are skipped.
 */
export function warmupSets(working: number | null, equipment: Equipment): WarmupSet[] {
  if (!working || working <= 0 || equipment === 'bodyweight') return [];
  const barbell = equipment === 'barbell';
  const step = equipment === 'dumbbell' || equipment === 'kettlebell' ? 2 : 2.5;
  const ramp: [number, number][] = barbell ? [[0.4, 8], [0.6, 5], [0.8, 3]] : [[0.5, 10], [0.75, 5]];
  const out: WarmupSet[] = [];
  if (barbell && working > BAR + 10) out.push({ weight: BAR, reps: 10 });
  for (const [pct, reps] of ramp) {
    let weight = Math.round((working * pct) / step) * step;
    if (barbell) weight = Math.max(weight, BAR);
    const prev = out[out.length - 1]?.weight ?? 0;
    if (weight <= prev || weight >= working || weight <= 0) continue;
    out.push({ weight, reps });
  }
  if (barbell) for (const s of out) s.plates = platesPerSide(s.weight, BAR).perSide;
  return out;
}
