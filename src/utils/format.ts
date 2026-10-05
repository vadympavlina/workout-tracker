const nf0 = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 });

export function formatNumber(n: number, digits: 0 | 1 | 2 = 0): string {
  return (digits === 0 ? nf0 : digits === 1 ? nf1 : nf2).format(n);
}

export function formatWeight(kg: number): string {
  return `${nf2.format(kg)} кг`;
}

export function formatVolume(kg: number): string {
  if (kg >= 100_000) return `${nf1.format(kg / 1000)} т`;
  return `${nf0.format(Math.round(kg))} кг`;
}

/** 4532 → "1:15:32", 932 → "15:32" */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 4532 → "1 год 15 хв" */
export function formatDurationWords(totalSec: number): string {
  const totalMin = Math.round(totalSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} хв`;
  return m === 0 ? `${h} год` : `${h} год ${m} хв`;
}

export function formatHours(totalSec: number): string {
  return `${nf1.format(totalSec / 3600)} год`;
}

export function formatPercent(p: number): string {
  const sign = p > 0 ? '+' : p < 0 ? '−' : '';
  return `${sign}${nf0.format(Math.abs(p))}%`;
}

export function formatSigned(n: number, unit = ''): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '±';
  return `${sign}${nf2.format(Math.abs(n))}${unit ? ` ${unit}` : ''}`;
}

const dayMonth = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' });
const dayMonthYear = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' });
const weekdayDate = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
const monthYear = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

/** "28 вересня" (adds the year if it is not the current one) */
export function formatDate(d: Date | string): string {
  const date = new Date(d);
  return date.getFullYear() === new Date().getFullYear() ? dayMonth.format(date) : dayMonthYear.format(date);
}
export const formatShortDate = (d: Date | string) => shortDate.format(new Date(d)).replace('.', '');
export const formatWeekdayDate = (d: Date | string) => capitalize(weekdayDate.format(new Date(d)));
export const formatMonthYear = (d: Date | string) => capitalize(monthYear.format(new Date(d)));
export const formatTime = (d: Date | string) => timeFmt.format(new Date(d));

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Ukrainian plural: plural(5, ['тренування','тренування','тренувань']) */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

export const pluralWorkouts = (n: number) => `${n} ${plural(n, ['тренування', 'тренування', 'тренувань'])}`;
export const pluralExercises = (n: number) => `${n} ${plural(n, ['вправа', 'вправи', 'вправ'])}`;
export const pluralSets = (n: number) => `${n} ${plural(n, ['підхід', 'підходи', 'підходів'])}`;

export function repsRange(min: number, max: number): string {
  return min === max ? `${min}` : `${min}–${max}`;
}

/** Parses user input like "52,5" → 52.5; returns null for empty/invalid. */
export function parseDecimal(input: string): number | null {
  const normalized = input.replace(',', '.').trim();
  if (normalized === '') return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
