import { describe, expect, it } from 'vitest';
import { DEFAULT_EXERCISES } from '@/data/exercises';
import { EXERCISE_ALIASES } from '@/data/exerciseAliases';
import { matchesExercise } from './exerciseSearch';

const find = (q: string) => DEFAULT_EXERCISES.filter((e) => matchesExercise(e, q)).map((e) => e.id);

describe('matchesExercise', () => {
  it('finds exercises by the names people use in the gym', () => {
    expect(find('жим платформи')).toContain('leg-press');
    expect(find('метелик назад')).toContain('reverse-pec-deck');
    expect(find('тренажері скота')).toContain('preacher-curl-machine');
    expect(find('упор в груди')).toContain('chest-supported-row');
    expect(find('тяга верхнього блоку вузька ручка')).toContain('close-grip-pulldown');
    expect(find('тяга гантелі в нахилі')).toContain('db-row');
    expect(find('згинання рук з канатом')).toContain('rope-hammer-curl');
    expect(find('сідничний місток')).toContain('glute-bridge');
  });

  it('still matches plain names and rejects unrelated ones', () => {
    expect(find('Жим штанги лежачи')).toContain('bench-press');
    expect(find('жим платформи')).not.toContain('bench-press');
  });

  it('every alias belongs to an existing exercise', () => {
    const ids = new Set(DEFAULT_EXERCISES.map((e) => e.id));
    expect(Object.keys(EXERCISE_ALIASES).filter((id) => !ids.has(id))).toEqual([]);
  });
});
