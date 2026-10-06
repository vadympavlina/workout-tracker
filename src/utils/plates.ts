/** Standard gym plates (kg), heaviest first. */
export const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export interface PlateLoad {
  /** Plates for ONE side of the bar, heaviest first. */
  perSide: number[];
  /** Total weight actually loaded (bar + both sides). */
  total: number;
  /** Target minus loadable total (0 when exact). */
  remainder: number;
}

/**
 * Greedy plate loading — exact for the standard set because each plate is at
 * least the sum needed below it at the 1.25 kg resolution.
 */
export function platesPerSide(target: number, bar = 20, plates: readonly number[] = STANDARD_PLATES): PlateLoad {
  const perSide: number[] = [];
  let left = Math.max(0, (target - bar) / 2);
  for (const plate of plates) {
    while (left + 1e-9 >= plate) {
      perSide.push(plate);
      left = Math.round((left - plate) * 1000) / 1000;
    }
  }
  const total = Math.round((bar + 2 * perSide.reduce((a, b) => a + b, 0)) * 100) / 100;
  return { perSide, total, remainder: Math.round((Math.max(target, bar) - total) * 100) / 100 };
}
