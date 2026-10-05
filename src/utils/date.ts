import type { ISODate, Weekday } from '@/types';

const DAY_MS = 86_400_000;

/** Local calendar date as YYYY-MM-DD (not UTC, so late-evening workouts stay on the right day). */
export function toISODate(d: Date | string | number): ISODate {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses YYYY-MM-DD as a local date at midnight. */
export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Monday-based weekday index (0 = Mon … 6 = Sun). */
export function weekdayOf(d: Date | string): Weekday {
  return ((new Date(d).getDay() + 6) % 7) as Weekday;
}

export function startOfDay(d: Date | string | number): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfWeek(d: Date | string | number): Date {
  const date = startOfDay(d);
  date.setDate(date.getDate() - weekdayOf(date));
  return date;
}

export function startOfMonth(d: Date | string | number): Date {
  const date = startOfDay(d);
  date.setDate(1);
  return date;
}

export function addDays(d: Date | string | number, days: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return toISODate(a) === toISODate(b);
}

export function daysBetween(a: Date | string, b: Date | string): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const;
export const WEEKDAYS_LONG = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'] as const;
