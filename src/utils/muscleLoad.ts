import type { Exercise, Muscle, WorkoutSession } from '@/types';
import { muscleTargets } from '@/data/exerciseMedia';

export interface MuscleLoad {
  /** Completed sets in the window: primary muscles count 1 per set, secondary ½. */
  sets: Partial<Record<Muscle, number>>;
  /** When each muscle last did work (primary or secondary), ms timestamp, over all history. */
  lastWorked: Partial<Record<Muscle, number>>;
}

export function muscleLoad(
  sessions: WorkoutSession[],
  exerciseById: (id: string) => Exercise | undefined,
  now = new Date(),
  days = 7,
): MuscleLoad {
  const from = now.getTime() - days * 86_400_000;
  const sets: Partial<Record<Muscle, number>> = {};
  const lastWorked: Partial<Record<Muscle, number>> = {};
  for (const s of sessions) {
    const at = new Date(s.finishedAt || s.startedAt).getTime();
    if (at > now.getTime()) continue;
    for (const e of s.exercises) {
      const done = e.sets.filter((x) => x.done !== false && x.reps > 0).length;
      if (!done) continue;
      const exercise = exerciseById(e.exerciseId);
      const { primary, secondary } = muscleTargets(exercise ?? { id: e.exerciseId, muscleGroup: 'fullBody' });
      for (const m of [...primary, ...secondary]) lastWorked[m] = Math.max(lastWorked[m] ?? 0, at);
      if (at < from) continue;
      for (const m of primary) sets[m] = (sets[m] ?? 0) + done;
      for (const m of secondary) if (!primary.includes(m)) sets[m] = (sets[m] ?? 0) + done / 2;
    }
  }
  return { sets, lastWorked };
}

/** 0 = untouched … 4 = most sets; thresholds suit typical weekly volume per muscle. */
export const loadLevel = (sets: number): 0 | 1 | 2 | 3 | 4 => (sets <= 0 ? 0 : sets < 4 ? 1 : sets < 8 ? 2 : sets < 12 ? 3 : 4);

export type Recovery = 'fresh' | 'recovering' | 'tired' | 'idle';

/** Under 24 h since it worked → tired, 24–48 h → recovering, later → fresh; nothing in 7 days → idle. */
export function recovery(lastWorked: number | undefined, now = Date.now()): Recovery {
  if (!lastWorked) return 'idle';
  const h = (now - lastWorked) / 3_600_000;
  return h < 24 ? 'tired' : h < 48 ? 'recovering' : h < 24 * 7 ? 'fresh' : 'idle';
}
