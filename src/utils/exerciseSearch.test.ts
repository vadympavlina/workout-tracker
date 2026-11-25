import { describe, expect, it } from 'vitest';
import { DEFAULT_EXERCISES } from '@/data/exercises';
import { EXERCISE_ALIASES } from '@/data/exerciseAliases';
import { searchExercises } from './exerciseSearch';

const top = (q: string, n = 3) => searchExercises(DEFAULT_EXERCISES, q).slice(0, n).map((e) => e.id);

/** The user's own workout notes, typed as-is, and the exercise each line means. */
const REAL: [string, string[]][] = [
  ['Розгинання 2×12 1×10', ['leg-extension', 'triceps-extension-machine']],
  ['Розгинання ніг', ['leg-extension']],
  ['Жим платформи 3×10-12 1×8', ['leg-press']],
  ['Сідничний місток 3×10', ['glute-bridge', 'barbell-glute-bridge']],
  ['Згинання ніг з паузою в низу 2×8-10 1×15', ['leg-curl', 'seated-leg-curl', 'lying-leg-curl']],
  ['Зведення ніг', ['hip-adductor']],
  ['Підйом на носки 3×12-15', ['standing-calf-raise', 'seated-calf-raise', 'smith-calf-raise', 'db-calf-raise', 'barbell-calf-raise']],
  ['Розводка в метелику назад 3×12-15', ['reverse-pec-deck']],
  ['Тяга нижнього блоку 2×8(тяжких) 1×12-15', ['seated-cable-row']],
  ['Тяга в тренажері упор в груди 2×8-10(тяжких)', ['chest-supported-row']],
  ['Тяга верхнього блоку 2×6-10(тяжких) 1×12', ['lat-pulldown']],
  ['Згинання рук в тренажері 4×10-12', ['biceps-curl-machine']],
  ['Молоткові згинання 2×10', ['hammer-curl']],
  ['Тяга верхнього блоку вузька ручка 4×10-12', ['close-grip-pulldown', 'v-bar-pulldown']],
  ['Тяга в тренажері з упором в груди 3×10', ['chest-supported-row']],
  ['Тяга гантелі в нахилі по одній руці 3×10-12', ['db-row']],
  ['Розводка в метелику задня дельта 2×15', ['reverse-pec-deck']],
  ['Згинання рук в тренажері скота 4×10-12', ['preacher-curl-machine']],
  ['Згинання рук з канатом в кросовері 3×12', ['rope-hammer-curl', 'cable-curl']],
];

describe('searchExercises', () => {
  it.each(REAL)('"%s" finds the right exercise near the top', (q, ids) => {
    expect(top(q).some((id) => ids.includes(id)), `${q} → ${top(q, 5).join(', ')}`).toBe(true);
  });

  it('forgives a typo and any case ending', () => {
    expect(top('розгинаня ніг')).toContain('leg-extension');
    expect(top('жим гантелями лежачи', 5)).toContain('db-bench-press');
    expect(top('тяга гантелей однією рукою')).toContain('db-row');
  });

  it('puts the plain exercise above longer variants', () => {
    expect(top('жим штанги лежачи', 1)).toEqual(['bench-press']);
    expect(top('тяга верхнього блоку', 1)).toEqual(['lat-pulldown']);
  });

  it('a muscle name lists that muscle\'s exercises first', () => {
    const groupOf = (id: string) => DEFAULT_EXERCISES.find((e) => e.id === id)?.muscleGroup;
    expect(top('біцепс', 5).map(groupOf)).toEqual(Array(5).fill('biceps'));
  });

  it('does not match unrelated exercises', () => {
    expect(top('жим платформи', 10)).not.toContain('bench-press');
    expect(searchExercises(DEFAULT_EXERCISES, 'ывфывфыв')).toEqual([]);
  });

  it('every alias belongs to an existing exercise', () => {
    const ids = new Set(DEFAULT_EXERCISES.map((e) => e.id));
    expect(Object.keys(EXERCISE_ALIASES).filter((id) => !ids.has(id))).toEqual([]);
  });
});
