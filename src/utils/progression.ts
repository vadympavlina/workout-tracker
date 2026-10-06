import type { SetEntry } from '@/types';

export interface ProgressionHint {
  weight: number;
  reps: number;
  /** Short human explanation for the UI. */
  reason: string;
}

/**
 * Double progression: once every working set at the top weight reached the top of
 * the rep range, add one weight step and restart at the bottom of the range.
 * Returns null when there's nothing to suggest (keep last time's numbers).
 */
export function suggestProgression(lastSets: SetEntry[], repsMin: number, repsMax: number, step: number): ProgressionHint | null {
  const done = lastSets.filter((s) => s.done && s.reps > 0);
  if (done.length === 0) return null;
  const top = Math.max(...done.map((s) => s.weight));
  if (top <= 0) {
    // Bodyweight: suggest more reps instead of more load.
    const minReps = Math.min(...done.map((s) => s.reps));
    return minReps >= repsMax ? { weight: 0, reps: minReps + 1, reason: `минулого разу всі підходи по ${repsMax}+` } : null;
  }
  const working = done.filter((s) => s.weight === top);
  const allTop = working.length >= Math.min(2, done.length) && working.every((s) => s.reps >= repsMax);
  if (!allTop) return null;
  const weight = Math.round((top + step) * 100) / 100;
  return { weight, reps: repsMin, reason: `минулого разу ${working.length}×${repsMax}+ з ${String(top).replace('.', ',')} кг` };
}
