// Domain models. Everything persisted is plain JSON so it can move between
// localStorage, a JSON export file or (later) Firestore documents unchanged.

export type ID = string;
/** ISO-8601 timestamp, e.g. 2026-10-05T18:30:00.000Z */
export type ISODateTime = string;
/** Calendar date, e.g. 2026-10-05 */
export type ISODate = string;

/** 0 = Monday … 6 = Sunday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'fullBody'
  | 'cardio';

export type Equipment = 'machine' | 'cable' | 'barbell' | 'dumbbell' | 'bodyweight' | 'kettlebell' | 'other';

export type IconKey =
  | 'dumbbell'
  | 'biceps'
  | 'footprints'
  | 'flame'
  | 'activity'
  | 'target'
  | 'zap'
  | 'weight'
  | 'mountain'
  | 'heart'
  | 'person'
  | 'shield';

export interface UserProfile {
  name: string;
  /** Data URL of a downscaled avatar, or null for initials. */
  avatar: string | null;
  heightCm: number | null;
  birthYear: number | null;
  goal: GoalType;
  targetWeightKg: number | null;
  weeklyWorkoutsTarget: number;
  createdAt: ISODateTime;
}

export type GoalType = 'muscle' | 'strength' | 'fatLoss' | 'maintain' | 'endurance';

export interface Exercise {
  id: ID;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  description: string;
  icon: IconKey;
  defaultSets: number;
  defaultRepsMin: number;
  defaultRepsMax: number;
  isCustom: boolean;
}

export interface PlanExercise {
  id: ID;
  exerciseId: ID;
  sets: number;
  repsMin: number;
  repsMax: number;
}

export interface WorkoutPlan {
  id: ID;
  name: string;
  icon: IconKey;
  /** Days of the week this workout is scheduled on. Empty = template only. */
  days: Weekday[];
  estimatedMinutes: number;
  notes: string;
  exercises: PlanExercise[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface SetEntry {
  id: ID;
  weight: number;
  reps: number;
  done: boolean;
}

export interface SessionExercise {
  id: ID;
  exerciseId: ID;
  /** Name snapshot so history survives the exercise being renamed or deleted. */
  name: string;
  targetRepsMin?: number;
  targetRepsMax?: number;
  sets: SetEntry[];
  note: string;
}

export interface WorkoutSession {
  id: ID;
  planId: ID | null;
  name: string;
  icon: IconKey;
  startedAt: ISODateTime;
  finishedAt: ISODateTime;
  durationSec: number;
  exercises: SessionExercise[];
  note: string;
}

/** In-progress workout. Persisted so a refresh or app switch never loses data. */
export interface ActiveWorkout {
  id: ID;
  planId: ID | null;
  name: string;
  icon: IconKey;
  startedAt: ISODateTime;
  currentIndex: number;
  exercises: ActiveExercise[];
  note: string;
  /** When the current rest timer ends (epoch ms), or null. */
  restEndsAt: number | null;
}

export interface ActiveExercise extends Omit<SessionExercise, 'sets'> {
  sets: ActiveSet[];
  finished: boolean;
}

export interface ActiveSet {
  id: ID;
  weight: number | null;
  reps: number | null;
  done: boolean;
  /** Values from the previous time this exercise was performed (for the hint column). */
  prevWeight: number | null;
  prevReps: number | null;
}

export interface BodyWeightEntry {
  id: ID;
  date: ISODate;
  weight: number;
}

export type AccentKey = 'lime' | 'cyan' | 'pink' | 'violet';

export interface Settings {
  accent: AccentKey;
  /** Pure black background (OLED). */
  oled: boolean;
  restTimerSec: number;
  autoRestTimer: boolean;
  vibration: boolean;
}

export interface AppData {
  user: UserProfile;
  plans: WorkoutPlan[];
  exercises: Exercise[];
  sessions: WorkoutSession[];
  bodyWeight: BodyWeightEntry[];
  settings: Settings;
}

export interface ExportFile extends AppData {
  app: 'pulse-workout-tracker';
  schemaVersion: number;
  exportedAt: ISODateTime;
}

export interface PersonalRecord {
  exerciseId: ID;
  name: string;
  weight: number;
  reps: number;
  date: ISODateTime;
  sessionId: ID;
}
