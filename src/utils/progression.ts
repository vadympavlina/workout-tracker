import type { SetEntry } from '@/types';

export interface ProgressionHint {
  /** up — add weight, reps — add a repetition (bodyweight), down — take weight off. */
  kind: 'up' | 'reps' | 'down';
  weight: number;
  reps: number;
  /** Short human explanation for the UI. */
  reason: string;
}

const kg = (n: number) => String(n).replace('.', ',');
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Double progression, refined by reps in reserve (RIR) when it was logged:
 * - every working set reached the top of the range → add one step
 *   (two steps when every one of them still had 3+ reps left);
 * - every working set had 3+ reps left, even below the top → add one step: too light;
 * - a set at 0 RIR fell below the bottom of the range → take one step off.
 * Returns null when there's nothing to suggest (keep last time's numbers).
 */
export function suggestProgression(lastSets: SetEntry[], repsMin: number, repsMax: number, step: number): ProgressionHint | null {
  const done = lastSets.filter((s) => s.done && s.reps > 0);
  if (done.length === 0) return null;
  const top = Math.max(...done.map((s) => s.weight));
  if (top <= 0) {
    // Bodyweight: suggest more reps instead of more load.
    const minReps = Math.min(...done.map((s) => s.reps));
    return minReps >= repsMax ? { kind: 'reps', weight: 0, reps: minReps + 1, reason: `минулого разу всі підходи по ${repsMax}+` } : null;
  }
  const working = done.filter((s) => s.weight === top);
  const rated = working.filter((s) => s.rir != null);
  const easy = rated.length === working.length && rated.every((s) => (s.rir ?? 0) >= 3);

  const allTop = working.length >= Math.min(2, done.length) && working.every((s) => s.reps >= repsMax);
  if (allTop) {
    const steps = easy ? 2 : 1;
    return {
      kind: 'up',
      weight: round(top + steps * step),
      reps: repsMin,
      reason: `минулого разу ${working.length}×${repsMax}+ з ${kg(top)} кг${easy ? ' і ще був запас' : ''}`,
    };
  }
  if (easy && working.length >= Math.min(2, done.length)) {
    return { kind: 'up', weight: round(top + step), reps: Math.min(...working.map((s) => s.reps)), reason: `з ${kg(top)} кг лишався запас 3+ повторення` };
  }
  const failed = working.some((s) => s.rir === 0 && s.reps < repsMin);
  if (failed && top - step > 0) {
    return { kind: 'down', weight: round(top - step), reps: repsMin, reason: `з ${kg(top)} кг до відмови й менше ${repsMin} повторень` };
  }
  return null;
}
