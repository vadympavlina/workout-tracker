import type { AppData, BodyWeightEntry, PlanExercise, Settings, UserProfile, Weekday, WorkoutPlan, WorkoutSession } from '@/types';
import { addDays, startOfDay, startOfWeek, toISODate } from '@/utils/date';
import { uid } from '@/utils/id';
import { DEFAULT_EXERCISES } from './exercises';

export const DEFAULT_SETTINGS: Settings = {
  accent: 'lavender',
  oled: false,
  restTimerSec: 90,
  autoRestTimer: true,
  vibration: true,
};

export function emptyUser(): UserProfile {
  return {
    name: '',
    avatar: null,
    heightCm: null,
    birthYear: null,
    goal: 'muscle',
    targetWeightKg: null,
    weeklyWorkoutsTarget: 3,
    createdAt: new Date().toISOString(),
  };
}

/** A fresh, empty data set (used by "clear all data"). */
export function emptyData(): AppData {
  return {
    user: emptyUser(),
    plans: [],
    exercises: DEFAULT_EXERCISES,
    sessions: [],
    bodyWeight: [],
    settings: DEFAULT_SETTINGS,
  };
}

// ---- Demo data ------------------------------------------------------------

/** Small deterministic PRNG so the demo looks the same on every first launch. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pe = (exerciseId: string): PlanExercise => {
  const ex = DEFAULT_EXERCISES.find((e) => e.id === exerciseId)!;
  return { id: uid(), exerciseId, sets: ex.defaultSets, repsMin: ex.defaultRepsMin, repsMax: ex.defaultRepsMax };
};

interface DemoPlanSeed {
  name: string;
  icon: WorkoutPlan['icon'];
  days: Weekday[];
  minutes: number;
  exercises: string[];
}

const PLAN_SEEDS: DemoPlanSeed[] = [
  { name: 'Груди + Руки', icon: 'dumbbell', days: [0], minutes: 70,
    exercises: ['chest-press-machine', 'incline-db-press', 'pec-deck', 'biceps-curl-machine', 'triceps-extension-machine', 'hammer-curl'] },
  { name: 'Спина + Біцепс', icon: 'mountain', days: [1], minutes: 75,
    exercises: ['lat-pulldown', 'seated-cable-row', 'chest-supported-row', 'lateral-raise', 'biceps-curl-machine', 'hammer-curl'] },
  { name: 'Ноги + Прес', icon: 'footprints', days: [3], minutes: 85,
    exercises: ['leg-press', 'leg-extension', 'leg-curl', 'romanian-deadlift', 'calf-raise', 'crunch', 'hanging-leg-raise'] },
  { name: 'Повне тіло', icon: 'flame', days: [5], minutes: 70,
    exercises: ['leg-press', 'chest-press-machine', 'lat-pulldown', 'shoulder-press-machine', 'triceps-pushdown', 'crunch'] },
];

/** Starting top weight and progression step per 2 weeks (kg). */
const PROGRESSION: Record<string, [number, number]> = {
  'chest-press-machine': [50, 2.5],
  'incline-db-press': [20, 1],
  'pec-deck': [40, 2.5],
  'biceps-curl-machine': [25, 1.25],
  'triceps-extension-machine': [30, 1.25],
  'hammer-curl': [12, 1],
  'lat-pulldown': [55, 2.5],
  'seated-cable-row': [50, 2.5],
  'chest-supported-row': [45, 2.5],
  'lateral-raise': [8, 0.5],
  'leg-press': [100, 5],
  'leg-extension': [45, 2.5],
  'leg-curl': [35, 2.5],
  'romanian-deadlift': [50, 2.5],
  'calf-raise': [60, 2.5],
  'crunch': [0, 0],
  'hanging-leg-raise': [0, 0],
  'shoulder-press-machine': [35, 2.5],
  'triceps-pushdown': [25, 1.25],
};

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function createDemoData(now = new Date()): AppData {
  const rand = mulberry32(198_79);
  const createdAt = addDays(now, -63).toISOString();

  const plans: WorkoutPlan[] = PLAN_SEEDS.map((p) => ({
    id: uid(),
    name: p.name,
    icon: p.icon,
    days: p.days,
    estimatedMinutes: p.minutes,
    notes: '',
    exercises: p.exercises.map(pe),
    createdAt,
    updatedAt: createdAt,
  }));

  const exerciseName = (id: string) => DEFAULT_EXERCISES.find((e) => e.id === id)!.name;
  const sessions: WorkoutSession[] = [];
  const weeks = 9;
  const firstWeek = addDays(startOfWeek(now), -7 * (weeks - 1));
  const today = startOfDay(now);

  for (let w = 0; w < weeks; w++) {
    for (const plan of plans) {
      const day = addDays(firstWeek, w * 7 + plan.days[0]);
      if (day >= today) continue; // today's workout is still ahead of the user
      if (rand() < 0.1) continue; // a realistic skipped day now and then

      const start = new Date(day);
      start.setHours(18, Math.floor(rand() * 75), 0, 0);
      const durationSec = Math.round(plan.estimatedMinutes * 60 * (0.85 + rand() * 0.3));
      const finish = new Date(start.getTime() + durationSec * 1000);

      sessions.push({
        id: uid(),
        planId: plan.id,
        name: plan.name,
        icon: plan.icon,
        startedAt: start.toISOString(),
        finishedAt: finish.toISOString(),
        durationSec,
        note: '',
        exercises: plan.exercises.map((px) => {
          const [base, step] = PROGRESSION[px.exerciseId] ?? [20, 1];
          const stepUnit = step >= 2.5 ? 2.5 : step >= 1 ? 1 : 0.5;
          const top = base === 0 ? 0 : roundTo(base + Math.floor(w / 2) * step + (rand() < 0.25 ? step : 0), stepUnit);
          return {
            id: uid(),
            exerciseId: px.exerciseId,
            name: exerciseName(px.exerciseId),
            targetRepsMin: px.repsMin,
            targetRepsMax: px.repsMax,
            note: '',
            sets: Array.from({ length: px.sets }, (_, i) => {
              const fatigue = i === px.sets - 1 && rand() < 0.5 ? 2 : 0;
              const reps = Math.max(px.repsMin - 1, px.repsMin + Math.floor(rand() * (px.repsMax - px.repsMin + 1)) - fatigue);
              const weight = i === 0 && top > 0 ? roundTo(top * 0.9, stepUnit) : top;
              return { id: uid(), weight, reps, done: true };
            }),
          };
        }),
      });
    }
  }

  const bodyWeight: BodyWeightEntry[] = [];
  let date = addDays(today, -62);
  let weight = 77.2;
  const lastDay = addDays(today, -1);
  while (date < lastDay) {
    const progress = 1 - (today.getTime() - date.getTime()) / (62 * 86_400_000);
    weight = 77.2 + progress * 1.8 + (rand() - 0.5) * 0.5;
    bodyWeight.push({ id: uid(), date: toISODate(date), weight: Math.round(weight * 10) / 10 });
    date = addDays(date, 2 + Math.floor(rand() * 3));
  }
  bodyWeight.push({ id: uid(), date: toISODate(addDays(today, -1)), weight: 79 });

  return {
    user: {
      name: 'Вадим Павліна',
      avatar: null,
      heightCm: 198,
      birthYear: null,
      goal: 'muscle',
      targetWeightKg: 82,
      weeklyWorkoutsTarget: 4,
      createdAt,
    },
    plans,
    exercises: DEFAULT_EXERCISES,
    sessions,
    bodyWeight,
    settings: DEFAULT_SETTINGS,
  };
}
