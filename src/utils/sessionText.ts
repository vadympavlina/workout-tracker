import type { WorkoutSession } from '@/types';
import { formatClock, formatNumber, formatTime, formatVolume, formatWeekdayDate, plural } from './format';
import { sessionSetCount, sessionVolume } from './stats';

const sets = (n: number) => `${n} ${plural(n, ['підхід', 'підходи', 'підходів'])}`;

/**
 * A finished workout as plain text for messengers and notes:
 *
 *   Ноги + Прес
 *   Четвер, 1 жовтня · 18:26
 *   Тривалість 1:22:27 · 7 вправ · 23 підходи · 13 225 кг
 *
 *   Жим ногами — 4 підходи
 *   1. 107,5 кг × 11
 *   …
 *
 * Only completed sets are listed; sets without weight (bodyweight) show reps only.
 */
export function sessionToText(session: WorkoutSession): string {
  const exercises = session.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done !== false && s.reps > 0) }))
    .filter((e) => e.sets.length > 0);

  const lines = [
    session.name,
    `${formatWeekdayDate(session.startedAt)} · ${formatTime(session.startedAt)}`,
    [
      `Тривалість ${formatClock(session.durationSec)}`,
      `${exercises.length} ${plural(exercises.length, ['вправа', 'вправи', 'вправ'])}`,
      sets(sessionSetCount(session)),
      sessionVolume(session) > 0 ? formatVolume(sessionVolume(session)) : null,
    ]
      .filter(Boolean)
      .join(' · '),
  ];

  for (const e of exercises) {
    lines.push('', `${e.name} — ${sets(e.sets.length)}`);
    e.sets.forEach((s, i) => lines.push(`${i + 1}. ${s.weight > 0 ? `${formatNumber(s.weight, 2)} кг × ${s.reps}` : `${s.reps} повт.`}`));
    if (e.note.trim()) lines.push(`Нотатка: ${e.note.trim()}`);
  }
  if (session.note.trim()) lines.push('', `Нотатка: ${session.note.trim()}`);
  return lines.join('\n');
}
