import type { AccentKey, Equipment, GoalType, MuscleGroup } from '@/types';

export const MUSCLE_GROUPS: Record<MuscleGroup, string> = {
  chest: 'Груди',
  back: 'Спина',
  shoulders: 'Плечі',
  biceps: 'Біцепс',
  triceps: 'Трицепс',
  legs: 'Ноги',
  glutes: 'Сідниці',
  calves: 'Ікри',
  core: 'Прес',
  fullBody: 'Все тіло',
  cardio: 'Кардіо',
};

export const EQUIPMENT: Record<Equipment, string> = {
  machine: 'Тренажер',
  cable: 'Блок',
  barbell: 'Штанга',
  dumbbell: 'Гантелі',
  bodyweight: 'Власна вага',
  kettlebell: 'Гиря',
  other: 'Інше',
};

export const GOALS: Record<GoalType, { label: string; hint: string }> = {
  muscle: { label: "Набір м'язової маси", hint: 'Прогресивне навантаження та профіцит калорій' },
  strength: { label: 'Сила', hint: 'Менше повторень, більші ваги' },
  fatLoss: { label: 'Зниження ваги', hint: 'Збереження сили при дефіциті калорій' },
  maintain: { label: 'Підтримка форми', hint: 'Регулярність понад усе' },
  endurance: { label: 'Витривалість', hint: 'Більше повторень і коротший відпочинок' },
};

/** Accent palettes as "r g b" triplets for CSS variables. */
export const ACCENTS: Record<AccentKey, { label: string; accent: string; strong: string }> = {
  lavender: { label: 'Лаванда', accent: '185 167 255', strong: '151 125 255' },
  violet: { label: 'Фіалка', accent: '196 148 255', strong: '168 102 250' },
  indigo: { label: 'Індиго', accent: '151 164 255', strong: '108 124 250' },
  mint: { label: "М'ята", accent: '128 226 196', strong: '72 200 160' },
};
