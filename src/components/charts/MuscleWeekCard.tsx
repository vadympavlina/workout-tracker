import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import type { Muscle } from '@/types';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { BodyFigure, slugsOf } from '@/components/exercise/Anatomy';
import { MUSCLE_LABELS } from '@/data/exerciseMedia';
import type { Slug } from '@/data/anatomyTypes';
import { loadLevel, muscleLoad, recovery, type Recovery } from '@/utils/muscleLoad';
import { formatNumber } from '@/utils/format';

type Mode = 'load' | 'recovery';

const BASE = '#2b2d34';
const LOAD_FILL = ['', 'rgb(var(--c-accent) / 0.24)', 'rgb(var(--c-accent) / 0.48)', 'rgb(var(--c-accent) / 0.74)', 'rgb(var(--c-accent))'];
const REC: Record<Recovery, { fill: string; label: string }> = {
  tired: { fill: '#FF5A5F', label: 'до 24 год' },
  recovering: { fill: '#F6C343', label: '1–2 дні' },
  fresh: { fill: '#3DDC84', label: 'відновлений' },
  idle: { fill: '', label: 'понад тиждень' },
};
const MUSCLES = Object.keys(MUSCLE_LABELS) as Muscle[];

/** Body coloured by this week's sets per muscle, or by how recovered each muscle is. */
export function MuscleWeekCard({ compact = false }: { compact?: boolean }) {
  const { data, exerciseById } = useData();
  const [mode, setMode] = useState<Mode>('load');
  const now = Date.now();
  const load = useMemo(() => muscleLoad(data.sessions, exerciseById, new Date()), [data.sessions, exerciseById]);

  const colorOf = (m: Muscle) => (mode === 'load' ? LOAD_FILL[loadLevel(load.sets[m] ?? 0)] : REC[recovery(load.lastWorked[m], now)].fill);
  const colors: Partial<Record<Slug, string>> = {};
  for (const m of MUSCLES) {
    const c = colorOf(m);
    if (c) for (const s of slugsOf([m])) colors[s] = c;
  }

  const ranked = [...MUSCLES].sort((a, b) => (load.sets[b] ?? 0) - (load.sets[a] ?? 0));
  const worked = ranked.filter((m) => load.sets[m]);
  const max = Math.max(1, ...MUSCLES.map((m) => load.sets[m] ?? 0));
  const untouched = MUSCLES.filter((m) => !load.sets[m]);
  const label =
    mode === 'load'
      ? `Підходи за 7 днів: ${worked.map((m) => `${MUSCLE_LABELS[m]} ${formatNumber(load.sets[m] ?? 0, 1)}`).join(', ') || 'немає'}`
      : `Відновлення: ${MUSCLES.map((m) => `${MUSCLE_LABELS[m]} — ${REC[recovery(load.lastWorked[m], now)].label}`).join(', ')}`;

  return (
    <Card padding="lg" id={compact ? undefined : 'muscles'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">Мʼязи за 7 днів</h2>
        {compact ? (
          <Link to="/progress" className="inline-flex items-center gap-0.5 text-[14px] font-medium text-muted hover:text-fg">
            Детальніше <ChevronRight size={16} aria-hidden />
          </Link>
        ) : (
          <SegmentedControl
            label="Режим карти мʼязів"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'load', label: 'Навантаження' },
              { value: 'recovery', label: 'Відновлення' },
            ]}
            className="w-full sm:max-w-[280px]"
          />
        )}
      </div>

      <div className={clsx('mt-4 grid grid-cols-2 gap-2', compact ? 'h-52' : 'h-72 sm:h-80')} role="img" aria-label={label}>
        {(['front', 'back'] as const).map((v) => (
          <figure key={v} className="m-0 flex min-h-0 flex-col items-center">
            <BodyFigure view={v} colors={colors} className="h-full min-h-0 w-auto flex-1" />
            <figcaption className="mt-1 text-[11px] text-subtle">{v === 'front' ? 'Спереду' : 'Ззаду'}</figcaption>
          </figure>
        ))}
      </div>

      {mode === 'load' ? (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-subtle" aria-hidden>
          Менше
          {LOAD_FILL.map((c, i) => (
            <span key={i} className="h-2 w-6 rounded-sm" style={{ background: c || BASE }} />
          ))}
          Більше підходів
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-subtle" aria-hidden>
          {(Object.keys(REC) as Recovery[]).map((r) => (
            <span key={r} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: REC[r].fill || BASE }} />
              {REC[r].label}
            </span>
          ))}
        </div>
      )}

      {compact ? (
        <p className="mt-3 text-[14px] text-muted">
          {worked.length ? (
            <>
              Найбільше: <span className="text-fg">{worked.slice(0, 2).map((m) => MUSCLE_LABELS[m]).join(', ')}</span>
              {untouched.length > 0 && (
                <>
                  {' '}
                  · без навантаження: <span className="text-fg">{untouched.slice(0, 3).map((m) => MUSCLE_LABELS[m]).join(', ')}</span>
                </>
              )}
            </>
          ) : (
            'За останні 7 днів тренувань не було.'
          )}
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2" aria-label="Рейтинг мʼязів">
          {(mode === 'load' ? ranked : [...MUSCLES].sort((a, b) => (load.lastWorked[b] ?? 0) - (load.lastWorked[a] ?? 0))).map((m) => {
            const sets = load.sets[m] ?? 0;
            const rec = recovery(load.lastWorked[m], now);
            return (
              <li key={m} className="grid grid-cols-[104px_minmax(0,1fr)_96px] items-center gap-3 text-[13px]">
                <span className="truncate">{MUSCLE_LABELS[m]}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <span
                    className="block h-full rounded-full"
                    style={
                      mode === 'load'
                        ? { width: `${(sets / max) * 100}%`, background: LOAD_FILL[Math.max(1, loadLevel(sets))] }
                        : { width: rec === 'idle' ? '0%' : '100%', background: REC[rec].fill }
                    }
                  />
                </span>
                <span className="tabular truncate text-right text-muted">{mode === 'load' ? `${formatNumber(sets, 1)} підх.` : REC[rec].label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
