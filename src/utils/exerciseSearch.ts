import type { Exercise } from '@/types';
import { EXERCISE_ALIASES } from '@/data/exerciseAliases';
import { MUSCLE_GROUPS } from '@/data/labels';

/**
 * Exercise search that understands how people actually type in the gym:
 * - any word order and any case ending ("гантелі" = "гантелей" = "гантелями");
 * - short filler words are ignored ("в", "з", "на", "по"…), and so are set schemes ("3×10");
 * - one typo in a longer word is forgiven ("розгинаня", "скота" → "Скотта");
 * - gym slang via aliases ("жим платформи", "метелик назад", "упор в груди");
 * - not every word has to match: extra details ("з паузою внизу") still find the exercise,
 *   ranked below exact matches.
 */

const STOP = new Set([
  'в', 'у', 'з', 'із', 'зі', 'на', 'по', 'до', 'для', 'і', 'й', 'та', 'а', 'або', 'від', 'під', 'над', 'за', 'при', 'без', 'через',
  'одній', 'одній', 'тяжких', 'важких', 'легких', 'низу', 'внизу', 'вгорі', 'паузою', 'пауза', 'повільно', 'кг', 'разів', 'підходи', 'підходів',
]);

/** Words that mean the same thing in the gym; mapped to one form before comparing. */
const SAME: Record<string, string> = {
  розводк: 'розвед',
  розвод: 'розвед',
  ніг: 'ног',
  ноги: 'ног',
  гантел: 'гантел',
  гантельн: 'гантел',
  блочн: 'блок',
  кросовер: 'кросовер',
  кроссовер: 'кросовер',
  тренажор: 'тренажер',
  сідничн: 'сідничн',
  ягідичн: 'сідничн',
  одною: 'одн',
  однією: 'одн',
  одну: 'одн',
  одній: 'одн',
  руці: 'рук',
  руки: 'рук',
  рукою: 'рук',
  руками: 'рук',
};

const ENDINGS = ['ями', 'ами', 'ові', 'еві', 'ого', 'ому', 'ими', 'іми', 'ях', 'ах', 'ів', 'їв', 'ей', 'ою', 'ею', 'ям', 'ам', 'ом', 'ем', 'им', 'ім', 'ий', 'ій', 'ої', 'ій', 'ая', 'а', 'я', 'о', 'е', 'и', 'і', 'ї', 'у', 'ю', 'ь', 'й'];

const clean = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ʼ’`']/g, '')
    .replace(/ё/g, 'е')
    .replace(/ы/g, 'и')
    .replace(/[^a-zа-яіїєґ0-9\s-]/gi, ' ');

/** Rough Ukrainian stem: drop one case ending, keep at least 3 letters. */
export function stem(word: string): string {
  if (SAME[word]) return SAME[word];
  let w = word;
  for (const e of ENDINGS) {
    if (w.length - e.length >= 3 && w.endsWith(e)) {
      w = w.slice(0, -e.length);
      break;
    }
  }
  return SAME[w] ?? w;
}

const tokens = (s: string) =>
  clean(s)
    .split(/[\s-]+/)
    .filter((w) => w && !STOP.has(w) && !/\d/.test(w))
    .map(stem);

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** How well one query word fits one word of the exercise: 1 exact/prefix, 0.8 with a typo, 0 no. */
function wordScore(q: string, h: string): number {
  if (h === q || h.startsWith(q) || (h.length >= 4 && q.startsWith(h))) return 1;
  if (q.length >= 5 && h.length >= 4 && withinOneEdit(q, h.slice(0, q.length + 1)) ) return 0.8;
  if (q.length >= 5 && withinOneEdit(q, h)) return 0.8;
  return 0;
}

interface Indexed {
  name: string[];
  alias: string[];
  /** Muscle group label ("Біцепс"), so a muscle name alone lists its exercises. */
  group: string[];
}
type Searchable = Pick<Exercise, 'id' | 'name'> & Partial<Pick<Exercise, 'muscleGroup'>>;
const cache = new Map<string, Indexed>();
function indexOf(e: Searchable): Indexed {
  const key = `${e.id}|${e.name}|${e.muscleGroup ?? ''}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = { name: tokens(e.name), alias: tokens(EXERCISE_ALIASES[e.id] ?? ''), group: tokens(e.muscleGroup ? MUSCLE_GROUPS[e.muscleGroup] ?? '' : '') };
    cache.set(key, hit);
  }
  return hit;
}

/** 0 = no match; higher is better. */
export function scoreExercise(e: Searchable, query: string): number {
  const q = tokens(query);
  if (!q.length) return clean(query).trim() ? 0 : 1;
  const { name, alias, group } = indexOf(e);
  let total = 0;
  let inName = 0;
  for (const w of q) {
    const n = Math.max(0, ...name.map((h) => wordScore(w, h)));
    const a = Math.max(0, ...alias.map((h) => wordScore(w, h)));
    const g = Math.max(0, ...group.map((h) => wordScore(w, h)));
    total += Math.max(n, a * 0.95, g * 0.9);
    if (n > 0) inName++;
  }
  const share = total / q.length;
  // Short queries must match fully; longer ones may carry extra details.
  const need = q.length <= 2 ? 0.79 : 0.6;
  if (share < need) return 0;
  // Bonuses: every word found in the name itself, the name starts like the query,
  // and fewer leftover words in the name (a closer, not a longer, match).
  const leftover = Math.max(0, name.length - q.length);
  return share * 10 + (inName === q.length ? 2 : 0) + (name[0] && wordScore(q[0], name[0]) ? 1 : 0) - leftover * 0.15;
}

export function matchesExercise(e: Searchable, query: string): boolean {
  return scoreExercise(e, query) > 0;
}

/** Matching exercises, best first; with an empty query returns the list as is. */
export function searchExercises<T extends Searchable>(list: T[], query: string): T[] {
  if (!query.trim()) return list;
  return list
    .map((e) => ({ e, s: scoreExercise(e, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name, 'uk'))
    .map((x) => x.e);
}
