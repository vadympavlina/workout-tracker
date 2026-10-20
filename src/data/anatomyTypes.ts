import type { Muscle } from '@/types';

/** Shapes in the anatomy drawing (see anatomy.ts). Non-muscle parts are drawn as the body. */
export type Slug =
  | 'chest' | 'deltoids' | 'biceps' | 'triceps' | 'forearm' | 'abs' | 'obliques' | 'upper-back' | 'trapezius' | 'lower-back'
  | 'gluteal' | 'quadriceps' | 'hamstring' | 'adductors' | 'calves' | 'tibialis'
  | 'neck' | 'head' | 'hair' | 'hands' | 'feet' | 'ankles' | 'knees';

export type BodyView = 'front' | 'back';
export type BodyType = 'male' | 'female';

export interface AnatomyPart {
  slug: Slug;
  d: string;
  box: [number, number, number, number];
}

export interface AnatomyView {
  viewBox: string;
  outline: string;
  parts: AnatomyPart[];
}

export type Anatomy = Record<BodyType, Record<BodyView, AnatomyView>>;

/** App muscle → shapes on the drawing. */
export const MUSCLE_SLUGS: Record<Muscle, Slug[]> = {
  chest: ['chest'],
  shoulders: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearm'],
  abs: ['abs'],
  obliques: ['obliques'],
  lats: ['upper-back'],
  traps: ['trapezius'],
  lowerBack: ['lower-back'],
  glutes: ['gluteal'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  adductors: ['adductors'],
  calves: ['calves', 'tibialis'],
};

/** Shape → app muscle (for tapping a muscle on the body). */
export const SLUG_MUSCLE: Partial<Record<Slug, Muscle>> = Object.fromEntries(
  (Object.entries(MUSCLE_SLUGS) as [Muscle, Slug[]][]).flatMap(([m, slugs]) => slugs.map((s) => [s, m])),
);

export const NON_MUSCLE: ReadonlySet<Slug> = new Set<Slug>(['neck', 'head', 'hair', 'hands', 'feet', 'ankles', 'knees']);
