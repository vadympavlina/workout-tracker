import type { Exercise, Muscle, MuscleGroup } from '@/types';

/**
 * Built-in exercise imagery and muscle targets.
 *
 * Photos: Free Exercise DB (https://github.com/yuhonas/free-exercise-db),
 * released into the public domain (Unlicense). Two frames per exercise —
 * start and end position — re-encoded to WebP in /public/exercises/<id>/.
 *
 * Kept outside the persisted exercise records so existing users get the
 * media without a data migration.
 */

interface MuscleTargets {
  primary: Muscle[];
  secondary: Muscle[];
}

const BUILT_IN: Record<string, MuscleTargets> = {
  'leg-press': { primary: ['quads'], secondary: ['glutes', 'hamstrings'] },
  'chest-press-machine': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'pec-deck': { primary: ['chest'], secondary: ['shoulders'] },
  'lat-pulldown': { primary: ['lats'], secondary: ['biceps', 'traps'] },
  'seated-cable-row': { primary: ['lats', 'traps'], secondary: ['biceps', 'lowerBack'] },
  'chest-supported-row': { primary: ['traps', 'lats'], secondary: ['biceps', 'shoulders'] },
  'biceps-curl-machine': { primary: ['biceps'], secondary: ['forearms'] },
  'triceps-extension-machine': { primary: ['triceps'], secondary: [] },
  'leg-extension': { primary: ['quads'], secondary: [] },
  'leg-curl': { primary: ['hamstrings'], secondary: ['calves'] },
  'calf-raise': { primary: ['calves'], secondary: [] },
  crunch: { primary: ['abs'], secondary: ['obliques'] },
  'shoulder-press-machine': { primary: ['shoulders'], secondary: ['triceps', 'traps'] },
  'lateral-raise': { primary: ['shoulders'], secondary: ['traps'] },
  'incline-db-press': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  squat: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lowerBack'] },
  'romanian-deadlift': { primary: ['hamstrings', 'glutes'], secondary: ['lowerBack'] },
  'hammer-curl': { primary: ['biceps', 'forearms'], secondary: [] },
  'triceps-pushdown': { primary: ['triceps'], secondary: [] },
  'hanging-leg-raise': { primary: ['abs'], secondary: ['obliques', 'forearms'] },
};

const BY_GROUP: Record<MuscleGroup, MuscleTargets> = {
  chest: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  back: { primary: ['lats', 'traps'], secondary: ['biceps', 'lowerBack'] },
  shoulders: { primary: ['shoulders'], secondary: ['traps'] },
  biceps: { primary: ['biceps'], secondary: ['forearms'] },
  triceps: { primary: ['triceps'], secondary: [] },
  legs: { primary: ['quads', 'hamstrings'], secondary: ['glutes', 'calves'] },
  glutes: { primary: ['glutes'], secondary: ['hamstrings'] },
  calves: { primary: ['calves'], secondary: [] },
  core: { primary: ['abs'], secondary: ['obliques'] },
  fullBody: { primary: ['quads', 'chest', 'lats'], secondary: ['shoulders', 'glutes', 'abs'] },
  cardio: { primary: ['quads', 'calves'], secondary: ['hamstrings', 'glutes'] },
};

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Грудні',
  shoulders: 'Дельти',
  biceps: 'Біцепс',
  triceps: 'Трицепс',
  forearms: 'Передпліччя',
  abs: 'Прес',
  obliques: 'Косі мʼязи',
  lats: 'Найширші',
  traps: 'Трапеції / ромбовидні',
  lowerBack: 'Поперек',
  glutes: 'Сідниці',
  quads: 'Квадрицепс',
  hamstrings: 'Біцепс стегна',
  calves: 'Литки',
};

export function muscleTargets(exercise: Pick<Exercise, 'id' | 'muscleGroup'> | undefined): MuscleTargets {
  if (!exercise) return { primary: [], secondary: [] };
  return BUILT_IN[exercise.id] ?? BY_GROUP[exercise.muscleGroup] ?? { primary: [], secondary: [] };
}

/** Bundled start/end photos for built-in exercises (relative to the app root). */
export function builtInPhotos(exerciseId: string): string[] {
  if (!(exerciseId in BUILT_IN)) return [];
  return [0, 1].map((i) => `${import.meta.env.BASE_URL}exercises/${exerciseId}/${i}.webp`);
}
