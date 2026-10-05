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
  lime: { label: 'Лайм', accent: '196 245 61', strong: '168 222 28' },
  cyan: { label: 'Блакитний', accent: '82 214 255', strong: '40 186 240' },
  pink: { label: 'Рожевий', accent: '255 122 174', strong: '245 84 146' },
  violet: { label: 'Фіолетовий', accent: '188 162 255', strong: '160 126 250' },
};
