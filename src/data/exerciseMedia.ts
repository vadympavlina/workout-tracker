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
  'hack-squat': { primary: ['quads'], secondary: ['glutes', 'hamstrings'] },
  'smith-squat': { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lowerBack'] },
  'smith-split-squat': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'seated-leg-curl': { primary: ['hamstrings'], secondary: ['calves'] },
  'standing-leg-curl': { primary: ['hamstrings'], secondary: ['calves'] },
  'hip-abductor': { primary: ['glutes'], secondary: [] },
  'hip-adductor': { primary: ['quads'], secondary: ['glutes'] },
  'reverse-hyperextension': { primary: ['glutes', 'hamstrings'], secondary: ['lowerBack'] },
  hyperextension: { primary: ['lowerBack', 'glutes'], secondary: ['hamstrings'] },
  'seated-calf-raise': { primary: ['calves'], secondary: [] },
  'leg-press-calf': { primary: ['calves'], secondary: [] },
  'smith-bench-press': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'smith-incline-press': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'incline-chest-press-machine': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'decline-chest-press-machine': { primary: ['chest'], secondary: ['triceps'] },
  'dip-machine': { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  'smith-shoulder-press': { primary: ['shoulders'], secondary: ['triceps', 'traps'] },
  'reverse-pec-deck': { primary: ['shoulders'], secondary: ['traps'] },
  'machine-shrug': { primary: ['traps'], secondary: ['forearms'] },
  'high-row-machine': { primary: ['lats'], secondary: ['biceps', 'traps'] },
  'iso-row-machine': { primary: ['lats', 'traps'], secondary: ['biceps'] },
  't-bar-row': { primary: ['traps', 'lats'], secondary: ['biceps', 'shoulders'] },
  'smith-row': { primary: ['lats', 'traps'], secondary: ['biceps', 'lowerBack'] },
  'smith-rdl': { primary: ['hamstrings', 'glutes'], secondary: ['lowerBack'] },
  'preacher-curl-machine': { primary: ['biceps'], secondary: ['forearms'] },
  'ab-crunch-machine': { primary: ['abs'], secondary: ['obliques'] },
  'cable-crossover': { primary: ['chest'], secondary: ['shoulders'] },
  'low-cable-crossover': { primary: ['chest'], secondary: ['shoulders'] },
  'cable-chest-press': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'incline-cable-fly': { primary: ['chest'], secondary: ['shoulders'] },
  'face-pull': { primary: ['shoulders', 'traps'], secondary: [] },
  'cable-rear-delt-fly': { primary: ['shoulders'], secondary: ['traps'] },
  'cable-lateral-raise': { primary: ['shoulders'], secondary: ['traps'] },
  'cable-front-raise': { primary: ['shoulders'], secondary: [] },
  'cable-upright-row': { primary: ['shoulders', 'traps'], secondary: ['biceps'] },
  'cable-shoulder-press': { primary: ['shoulders'], secondary: ['triceps'] },
  'wide-grip-pulldown': { primary: ['lats'], secondary: ['biceps', 'traps'] },
  'close-grip-pulldown': { primary: ['lats'], secondary: ['biceps'] },
  'v-bar-pulldown': { primary: ['lats'], secondary: ['biceps', 'traps'] },
  'underhand-pulldown': { primary: ['lats'], secondary: ['biceps'] },
  'one-arm-cable-row': { primary: ['lats'], secondary: ['biceps', 'traps'] },
  'straight-arm-pulldown': { primary: ['lats'], secondary: ['triceps'] },
  'cable-curl': { primary: ['biceps'], secondary: ['forearms'] },
  'rope-hammer-curl': { primary: ['biceps', 'forearms'], secondary: [] },
  'cable-preacher-curl': { primary: ['biceps'], secondary: ['forearms'] },
  'rope-pushdown': { primary: ['triceps'], secondary: [] },
  'reverse-grip-pushdown': { primary: ['triceps'], secondary: ['forearms'] },
  'overhead-rope-extension': { primary: ['triceps'], secondary: [] },
  'cable-crunch': { primary: ['abs'], secondary: ['obliques'] },
  woodchop: { primary: ['obliques', 'abs'], secondary: ['shoulders'] },
  'pallof-press': { primary: ['obliques', 'abs'], secondary: [] },
  'cable-kickback': { primary: ['glutes'], secondary: ['hamstrings'] },
  'cable-pull-through': { primary: ['glutes', 'hamstrings'], secondary: ['lowerBack'] },
  'db-bench-press': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'db-fly': { primary: ['chest'], secondary: ['shoulders'] },
  'db-pullover': { primary: ['chest', 'lats'], secondary: ['triceps'] },
  'db-shoulder-press': { primary: ['shoulders'], secondary: ['triceps', 'traps'] },
  'arnold-press': { primary: ['shoulders'], secondary: ['triceps'] },
  'rear-delt-raise': { primary: ['shoulders'], secondary: ['traps'] },
  'db-row': { primary: ['lats'], secondary: ['biceps', 'traps'] },
  'db-shrug': { primary: ['traps'], secondary: ['forearms'] },
  'db-curl': { primary: ['biceps'], secondary: ['forearms'] },
  'incline-db-curl': { primary: ['biceps'], secondary: [] },
  'concentration-curl': { primary: ['biceps'], secondary: [] },
  'db-overhead-extension': { primary: ['triceps'], secondary: [] },
  'db-kickback': { primary: ['triceps'], secondary: [] },
  'db-lunge': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'db-step-up': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'plie-squat': { primary: ['glutes', 'quads'], secondary: ['hamstrings'] },
  'db-rdl': { primary: ['hamstrings', 'glutes'], secondary: ['lowerBack'] },
  'bench-press': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'incline-bench-press': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'close-grip-bench': { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  skullcrusher: { primary: ['triceps'], secondary: [] },
  deadlift: { primary: ['lowerBack', 'glutes', 'hamstrings'], secondary: ['quads', 'traps', 'forearms'] },
  'bent-over-row': { primary: ['lats', 'traps'], secondary: ['biceps', 'lowerBack'] },
  'overhead-press': { primary: ['shoulders'], secondary: ['triceps', 'traps'] },
  'barbell-curl': { primary: ['biceps'], secondary: ['forearms'] },
  'front-squat': { primary: ['quads'], secondary: ['glutes', 'abs'] },
  'hip-thrust': { primary: ['glutes'], secondary: ['hamstrings'] },
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
