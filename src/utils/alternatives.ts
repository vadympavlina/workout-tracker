import type { Exercise } from '@/types';
import { muscleTargets } from '@/data/exerciseMedia';

export interface Alternative {
  exercise: Exercise;
  /** Share of the original's main muscles this one also trains as main (0…1). */
  match: number;
}

/**
 * Exercises that can stand in for `original`: ranked by how many of its main
 * muscles they also hit as main targets, then by helper muscles and same group.
 */
export function alternativesFor(original: Exercise, all: Exercise[], exclude: string[] = []): Alternative[] {
  const t = muscleTargets(original);
  const primary = new Set(t.primary);
  const secondary = new Set(t.secondary);
  const skip = new Set([original.id, ...exclude]);
  const scored: (Alternative & { score: number })[] = [];
  for (const e of all) {
    if (skip.has(e.id)) continue;
    const o = muscleTargets(e);
    const mainHits = o.primary.filter((m) => primary.has(m)).length;
    const sameGroup = e.muscleGroup === original.muscleGroup;
    if (mainHits === 0 && !(sameGroup && primary.size === 0)) continue;
    const helperHits = o.secondary.filter((m) => secondary.has(m) || primary.has(m)).length;
    const extraMain = o.primary.filter((m) => !primary.has(m)).length;
    const score = mainHits * 4 + helperHits + (sameGroup ? 2 : 0) - extraMain;
    scored.push({ exercise: e, match: primary.size ? mainHits / primary.size : 1, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'uk'))
    .map(({ exercise, match }) => ({ exercise, match }));
}
