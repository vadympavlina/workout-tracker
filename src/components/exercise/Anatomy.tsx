import { useEffect, useState } from 'react';
import clsx from 'clsx';
import type { Muscle } from '@/types';
import { MUSCLE_SLUGS, NON_MUSCLE, SLUG_MUSCLE, type Anatomy, type BodyType, type BodyView, type Slug } from '@/data/anatomyTypes';
import { MUSCLE_LABELS } from '@/data/exerciseMedia';
import { useData } from '@/store/DataContext';

// ---- Data -------------------------------------------------------------------

let cached: Anatomy | null = null;
let loading: Promise<Anatomy> | null = null;

/** The anatomy drawing data (~130 KB) is a separate chunk, loaded on first use. */
export function useAnatomy(): Anatomy | null {
  const [anatomy, setAnatomy] = useState(cached);
  useEffect(() => {
    if (cached) return;
    let alive = true;
    loading ??= import('@/data/anatomy').then((m) => {
      cached = m.ANATOMY;
      ensureSprite(cached);
      return cached;
    });
    loading.then((a) => alive && setAnatomy(a)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return anatomy;
}

const bodyId = (sex: BodyType, view: BodyView) => `pulse-body-${sex}-${view}`;

/**
 * Every figure references one shared drawing of the body (<use>) and only adds
 * its highlighted muscles on top, so a list of 160 thumbnails stays light.
 */
function ensureSprite(anatomy: Anatomy) {
  if (document.getElementById('pulse-anatomy')) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.id = 'pulse-anatomy';
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  const defs = document.createElementNS(NS, 'defs');
  for (const sex of ['male', 'female'] as const)
    for (const view of ['front', 'back'] as const) {
      const g = document.createElementNS(NS, 'g');
      g.id = bodyId(sex, view);
      for (const part of anatomy[sex][view].parts) {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', part.d);
        p.setAttribute('class', part.slug === 'hair' ? 'anat-hair' : NON_MUSCLE.has(part.slug) ? 'anat-skin' : 'anat-muscle');
        g.appendChild(p);
      }
      const outline = document.createElementNS(NS, 'path');
      outline.setAttribute('d', anatomy[sex][view].outline);
      outline.setAttribute('class', 'anat-outline');
      outline.setAttribute('vector-effect', 'non-scaling-stroke');
      g.appendChild(outline);
      defs.appendChild(g);
    }
  svg.appendChild(defs);
  document.body.appendChild(svg);
}

// ---- Geometry ---------------------------------------------------------------

const FRONT_ONLY = new Set<Slug>(['chest', 'abs', 'obliques', 'biceps', 'quadriceps', 'tibialis']);
const BACK_ONLY = new Set<Slug>(['upper-back', 'lower-back', 'gluteal', 'hamstring']);
const BACK_PREFERRED = new Set<Slug>(['triceps', 'calves', 'trapezius']);

export const slugsOf = (muscles: Muscle[]) => muscles.flatMap((m) => MUSCLE_SLUGS[m] ?? []);

/** The side of the body that shows these muscles best. */
export function bestView(primary: Muscle[]): BodyView {
  const slugs = slugsOf(primary);
  const front = slugs.filter((s) => FRONT_ONLY.has(s)).length;
  const back = slugs.filter((s) => BACK_ONLY.has(s) || BACK_PREFERRED.has(s)).length;
  return back > front ? 'back' : 'front';
}

/** Square viewBox around the given shapes, with breathing room. */
function cropBox(anatomy: Anatomy, sex: BodyType, view: BodyView, slugs: Slug[]): string | null {
  const boxes = anatomy[sex][view].parts.filter((p) => slugs.includes(p.slug)).map((p) => p.box);
  if (!boxes.length) return null;
  const x0 = Math.min(...boxes.map((b) => b[0]));
  const y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[0] + b[2]));
  const y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
  const size = Math.max(x1 - x0, y1 - y0) * 1.4 + 90;
  return `${(x0 + x1) / 2 - size / 2} ${(y0 + y1) / 2 - size / 2} ${size} ${size}`;
}

// ---- Figures ----------------------------------------------------------------

export const ACCENT = 'rgb(var(--c-accent))';
export const ACCENT_SOFT = 'rgb(var(--c-accent) / 0.42)';

interface FigureProps {
  view: BodyView;
  /** Fill per shape; shapes without a colour show as the plain body. */
  colors: Partial<Record<Slug, string>>;
  /** Zoom to these shapes (thumbnails). */
  crop?: Slug[];
  /** Makes every muscle tappable. */
  onPick?: (slug: Slug) => void;
  label?: string;
  className?: string;
}

export function BodyFigure({ view, colors, crop, onPick, label, className }: FigureProps) {
  const anatomy = useAnatomy();
  const { data } = useData();
  const sex: BodyType = data.settings.bodyType === 'female' ? 'female' : 'male';
  if (!anatomy) return <svg viewBox="0 0 724 1448" className={className} aria-hidden />;
  const v = anatomy[sex][view];
  const viewBox = (crop && cropBox(anatomy, sex, view, crop)) || v.viewBox;
  return (
    <svg
      viewBox={viewBox}
      className={className}
      role={onPick ? 'group' : label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label || onPick ? undefined : true}
    >
      <use href={`#${bodyId(sex, view)}`} />
      {v.parts.map((p) =>
        colors[p.slug] ? <path key={p.slug} d={p.d} fill={colors[p.slug]} className="transition-[fill] duration-300" /> : null,
      )}
      {onPick &&
        v.parts
          .filter((p) => !NON_MUSCLE.has(p.slug))
          .map((p) => (
            <path
              key={`hit-${p.slug}`}
              d={p.d}
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={SLUG_MUSCLE[p.slug] ? MUSCLE_LABELS[SLUG_MUSCLE[p.slug]!] : p.slug}
              className="cursor-pointer outline-none transition hover:fill-white/10 focus-visible:fill-white/15"
              onClick={() => onPick(p.slug)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick(p.slug);
                }
              }}
            />
          ))}
    </svg>
  );
}

/** Colours for an exercise: primary muscles lit, secondary softer. */
export function exerciseColors(primary: Muscle[], secondary: Muscle[]): Partial<Record<Slug, string>> {
  const colors: Partial<Record<Slug, string>> = {};
  for (const s of slugsOf(secondary)) colors[s] = ACCENT_SOFT;
  for (const s of slugsOf(primary)) colors[s] = ACCENT;
  return colors;
}

interface MapProps {
  primary: Muscle[];
  secondary?: Muscle[];
  view?: BodyView | 'both';
  className?: string;
  label?: string;
}

/** Front and back (or one side) with the worked muscles highlighted. */
export function MuscleMap({ primary, secondary = [], view = 'both', className, label }: MapProps) {
  const colors = exerciseColors(primary, secondary);
  const views: BodyView[] = view === 'both' ? ['front', 'back'] : [view];
  const name = label ?? `Основні мʼязи: ${primary.map((m) => MUSCLE_LABELS[m]).join(', ') || '—'}`;
  return (
    <div className={clsx('flex h-full items-stretch justify-center gap-3', className)} role="img" aria-label={name}>
      {views.map((v) => (
        <figure key={v} className="m-0 flex h-full flex-col items-center">
          <BodyFigure view={v} colors={colors} className="h-full min-h-0 w-auto flex-1" />
          {view === 'both' && <figcaption className="mt-1 text-[11px] text-subtle">{v === 'front' ? 'Спереду' : 'Ззаду'}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
