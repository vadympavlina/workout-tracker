import type { Exercise } from '@/types';
import { EXERCISE_ALIASES } from '@/data/exerciseAliases';

const norm = (s: string) => s.toLowerCase().replace(/[ʼ’`]/g, "'").replace(/ё/g, 'е');

/**
 * Word-by-word match: every word of the query must appear in the name or its gym
 * aliases. Word endings are trimmed so cases still match ("скота" → "Скотта",
 * "платформи" → "платформа", "вузька ручка" → "вузьким").
 */
export function matchesExercise(e: Pick<Exercise, 'id' | 'name'>, query: string): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = norm(`${e.name} ${EXERCISE_ALIASES[e.id] ?? ''}`);
  return words.every((w) => hay.includes(w.length > 4 ? w.slice(0, Math.max(4, w.length - 2)) : w));
}
