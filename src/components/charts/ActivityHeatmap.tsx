import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { WorkoutSession } from '@/types';
import { addDays, startOfWeek, toISODate, WEEKDAYS_SHORT } from '@/utils/date';
import { formatDate, formatVolume, pluralWorkouts } from '@/utils/format';
import { sessionVolume } from '@/utils/stats';

interface Props {
  sessions: WorkoutSession[];
  weeks?: number;
}

interface Day {
  key: string;
  date: Date;
  volume: number;
  names: string[];
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/** One sequential hue (the "move" colour), dim → bright. Level 0 = no workout. */
const LEVEL_CLASS = ['bg-white/[0.06]', 'bg-move/25', 'bg-move/50', 'bg-move/75', 'bg-move'] as const;
const MONTHS = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

/**
 * GitHub-style year grid: columns are weeks (Mon–Sun), colour = training volume
 * that day (quartiles of the user's own non-zero days). Days with workouts are
 * buttons that open the journal for that date.
 */
export function ActivityHeatmap({ sessions, weeks = 53 }: Props) {
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<Day | null>(null);

  const { columns, months, total } = useMemo(() => {
    const today = new Date();
    const todayKey = toISODate(today);
    const first = addDays(startOfWeek(today), -7 * (weeks - 1));
    const byDay = new Map<string, { volume: number; names: string[] }>();
    for (const s of sessions) {
      const key = toISODate(s.startedAt);
      const entry = byDay.get(key) ?? { volume: 0, names: [] };
      entry.volume += sessionVolume(s);
      entry.names.push(s.name);
      byDay.set(key, entry);
    }
    // Quartile thresholds over days that had a workout in the visible range.
    const firstKey = toISODate(first);
    const volumes = [...byDay.entries()].filter(([k]) => k >= firstKey).map(([, v]) => v.volume).sort((a, b) => a - b);
    const q = (p: number) => volumes[Math.min(volumes.length - 1, Math.floor(p * volumes.length))] ?? 0;
    const thresholds = [q(0.25), q(0.5), q(0.75)];

    const cols: Day[][] = [];
    const monthLabels: { col: number; label: string }[] = [];
    let count = 0;
    for (let w = 0; w < weeks; w++) {
      const col: Day[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(first, w * 7 + d);
        const key = toISODate(date);
        const entry = byDay.get(key);
        const volume = entry?.volume ?? 0;
        if (entry && key >= firstKey) count += entry.names.length;
        const level = !entry ? 0 : volume <= thresholds[0] ? 1 : volume <= thresholds[1] ? 2 : volume <= thresholds[2] ? 3 : 4;
        col.push({ key, date, volume, names: entry?.names ?? [], level: level as Day['level'], future: key > todayKey });
        if (d === 0 && date.getDate() <= 7) monthLabels.push({ col: w, label: MONTHS[date.getMonth()] });
      }
      cols.push(col);
    }
    return { columns: cols, months: monthLabels, total: count };
  }, [sessions, weeks]);

  // Start scrolled to the most recent weeks on narrow screens.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [columns]);

  const describe = (d: Day) =>
    d.names.length
      ? `${formatDate(d.date)}: ${d.names.join(', ')} · ${formatVolume(d.volume)}`
      : `${formatDate(d.date)}: без тренування`;

  return (
    <div>
      <div ref={scroller} className="scrollbar-none -mx-1 overflow-x-auto px-1 pb-1">
        <div className="inline-grid grid-cols-[auto_1fr] gap-x-2">
          <span className="sticky left-0 z-10 bg-[rgb(var(--c-surface))]" aria-hidden />
          <div className="relative h-5" aria-hidden>
            {months.map((m) => (
              <span key={`${m.col}-${m.label}`} className="absolute top-0 font-mono text-[10px] uppercase text-subtle" style={{ left: m.col * 15 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="sticky left-0 z-10 grid grid-rows-7 gap-[3px] bg-[rgb(var(--c-surface))] pr-1.5 font-mono text-[9px] leading-[12px] text-subtle" aria-hidden>
            {WEEKDAYS_SHORT.map((d, i) => (
              <span key={d}>{i % 2 === 0 ? d : ''}</span>
            ))}
          </div>
          <div className="flex gap-[3px]" role="grid" aria-label={`Тренування за рік: ${pluralWorkouts(total)}`}>
            {columns.map((col, w) => (
              <div key={w} role="row" className="grid grid-rows-7 gap-[3px]">
                {col.map((day) =>
                  day.names.length ? (
                    <button
                      key={day.key}
                      type="button"
                      role="gridcell"
                      aria-label={describe(day)}
                      title={describe(day)}
                      onMouseEnter={() => setFocus(day)}
                      onFocus={() => setFocus(day)}
                      onClick={() => navigate(`/history?date=${day.key}`)}
                      className={clsx('h-3 w-3 rounded-[3px] transition hover:ring-2 hover:ring-fg/60 focus-visible:ring-2', LEVEL_CLASS[day.level])}
                    />
                  ) : (
                    <span
                      key={day.key}
                      role="gridcell"
                      aria-hidden
                      className={clsx('h-3 w-3 rounded-[3px]', day.future ? 'bg-transparent' : LEVEL_CLASS[0])}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="min-h-[20px] text-[13px] text-muted" aria-live="polite">
          {focus ? describe(focus) : `${pluralWorkouts(total)} за рік · натисни на день, щоб відкрити`}
        </p>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-subtle" aria-hidden>
          Менше
          {LEVEL_CLASS.map((c) => (
            <span key={c} className={clsx('h-3 w-3 rounded-[3px]', c)} />
          ))}
          Більше
        </div>
      </div>
    </div>
  );
}
