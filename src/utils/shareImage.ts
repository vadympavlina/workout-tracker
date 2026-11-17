import type { Exercise, Settings, WorkoutSession } from '@/types';
import type { Anatomy, BodyType, Slug } from '@/data/anatomyTypes';
import { MUSCLE_SLUGS, NON_MUSCLE } from '@/data/anatomyTypes';
import { muscleTargets } from '@/data/exerciseMedia';
import { ACCENTS } from '@/data/labels';
import { formatNumber, formatSet, formatTime, formatWeekdayDate, pluralSets } from './format';
import { bestSet, sessionVolume } from './stats';

/** Everything the story card shows, already worked out from the session. */
export interface ShareCard {
  name: string;
  startedAt: string;
  durationSec: number;
  volumeKg: number;
  sets: number;
  exercises: { name: string; sets: number; best: { weight: number; reps: number } | null }[];
  /** Sets per body shape (primary muscles 1, secondary ½). */
  load: Partial<Record<Slug, number>>;
  sex: BodyType;
  /** Accent colour as "r g b". */
  accent: string;
}

export const CARD_W = 1080;
export const CARD_H = 1920;

const FONT = '"Geist Variable", ui-sans-serif, system-ui, -apple-system, sans-serif';
const PAD = 88;
const FG = '#FAFAFA';
const MUTED = '#A3A3AA';
const SUBTLE = '#84848C';

const font = (size: number, weight = 400) => `${weight} ${size}px ${FONT}`;
const rgba = (rgb: string, a: number) => `rgb(${rgb} / ${a})`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Cuts text to fit `max` px, ending with "…". */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Up to `lines` lines of word-wrapped text. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, lines: number) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= max || !cur) cur = next;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    const rest = out.slice(lines - 1).join(' ');
    out.length = lines - 1;
    out.push(fit(ctx, rest, max));
  }
  return out;
}

function fillLevel(sets: number, accent: string) {
  if (sets <= 0) return null;
  const a = sets < 2 ? 0.3 : sets < 4 ? 0.55 : sets < 6 ? 0.8 : 1;
  return rgba(accent, a);
}

function drawBody(ctx: CanvasRenderingContext2D, anatomy: Anatomy, card: ShareCard, view: 'front' | 'back', cx: number, top: number, h: number) {
  const v = anatomy[card.sex][view];
  const [vx, vy, vw, vh] = v.viewBox.split(/\s+/).map(Number);
  const s = h / vh;
  ctx.save();
  ctx.translate(cx - (vw * s) / 2, top);
  ctx.scale(s, s);
  ctx.translate(-vx, -vy);
  for (const p of v.parts) {
    const lit = NON_MUSCLE.has(p.slug) ? null : fillLevel(card.load[p.slug] ?? 0, card.accent);
    ctx.fillStyle = lit ?? (p.slug === 'hair' ? '#1f2026' : NON_MUSCLE.has(p.slug) ? '#353740' : '#2b2d34');
    ctx.fill(new Path2D(p.d));
  }
  ctx.strokeStyle = '#3d4049';
  ctx.lineWidth = 2 / s;
  ctx.stroke(new Path2D(v.outline));
  ctx.restore();
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, accent: string) {
  const k = size / 512;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = `rgb(${accent})`;
  roundRect(ctx, 0, 0, 512, 512, 128);
  ctx.fill();
  ctx.fillStyle = '#0A0A0A';
  for (const [rx, ry, rw, rh, rr] of [
    [72, 212, 368, 88, 28],
    [120, 108, 104, 296, 40],
    [288, 108, 104, 296, 40],
  ]) {
    roundRect(ctx, rx, ry, rw, rh, rr);
    ctx.fill();
  }
  ctx.restore();
}

/** Value in large type with a small unit after it. */
function stat(ctx: CanvasRenderingContext2D, x: number, y: number, value: string, unit: string, label: string) {
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = FG;
  ctx.font = font(76, 700);
  ctx.fillText(value, x, y);
  const w = ctx.measureText(value).width;
  ctx.fillStyle = MUTED;
  ctx.font = font(34, 500);
  if (unit) ctx.fillText(unit, x + w + 10, y);
  ctx.fillStyle = SUBTLE;
  ctx.font = font(28, 500);
  ctx.fillText(label, x, y + 52);
}

/**
 * Draws a 1080×1920 story card (Instagram / Telegram stories). Important content
 * stays clear of the top and bottom ~220 px that story apps cover with their UI.
 */
export function drawShareCard(ctx: CanvasRenderingContext2D, card: ShareCard, anatomy: Anatomy) {
  const A = card.accent;
  const W = CARD_W;
  const inner = W - PAD * 2;

  // Background: near-black with a soft accent glow behind the body.
  ctx.fillStyle = '#050506';
  ctx.fillRect(0, 0, W, CARD_H);
  let g = ctx.createRadialGradient(W * 0.85, 120, 0, W * 0.85, 120, 900);
  g.addColorStop(0, rgba(A, 0.18));
  g.addColorStop(1, rgba(A, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, CARD_H);

  // Brand row.
  let y = 150;
  drawLogo(ctx, PAD, y, 64, A);
  ctx.fillStyle = FG;
  ctx.font = font(38, 650);
  ctx.textBaseline = 'middle';
  ctx.fillText('Pulse', PAD + 84, y + 33);
  ctx.textAlign = 'right';
  ctx.fillStyle = MUTED;
  ctx.font = font(30, 500);
  ctx.fillText(`${formatWeekdayDate(card.startedAt)} · ${formatTime(card.startedAt)}`, W - PAD, y + 33);
  ctx.textAlign = 'left';

  // Title.
  y = 330;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = `rgb(${A})`;
  ctx.font = font(28, 650);
  ctx.letterSpacing = '4px';
  ctx.fillText('ТРЕНУВАННЯ ЗАВЕРШЕНО', PAD, y);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = FG;
  ctx.font = font(96, 750);
  ctx.letterSpacing = '-2px';
  for (const line of wrap(ctx, card.name, inner, 2)) {
    y += 104;
    ctx.fillText(line, PAD, y);
  }
  ctx.letterSpacing = '0px';

  // Stats panel.
  y += 56;
  const panelH = 200;
  roundRect(ctx, PAD, y, inner, panelH, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const mins = Math.max(1, Math.round(card.durationSec / 60));
  const vol = card.volumeKg >= 1000 ? [formatNumber(card.volumeKg / 1000, 1), 'т'] : [formatNumber(card.volumeKg), 'кг'];
  const cols: [string, string, string][] = [
    mins >= 60 ? [`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`, 'год', 'Тривалість'] : [String(mins), 'хв', 'Тривалість'],
    card.volumeKg > 0 ? [vol[0], vol[1], 'Обсяг'] : [String(card.exercises.length), '', 'Вправ'],
    [String(card.sets), '', 'Підходів'],
  ];
  const colW = inner / 3;
  cols.forEach(([v, u, l], i) => {
    const x = PAD + colW * i + 44;
    stat(ctx, x, y + 108, v, u, l);
    if (i > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(PAD + colW * i, y + 44, 2, panelH - 88);
    }
  });
  y += panelH;

  // Every exercise must fit. Rows shrink as the list grows; the body figures take
  // what is left and are dropped only when they would get too small to read.
  const n = card.exercises.length;
  const bottom = 1700;
  const top = y + 56;
  const avail = bottom - top;
  const FIG_MIN = 300;
  const FIG_EXTRA = 100; // caption + gap under the figures
  let rowH = Math.min(84, Math.max(40, (avail - FIG_MIN - FIG_EXTRA) / Math.max(n, 1)));
  let figH = avail - n * rowH - FIG_EXTRA;
  if (figH < FIG_MIN) {
    figH = 0;
    rowH = Math.min(84, avail / Math.max(n, 1));
  }
  figH = Math.min(figH, 700);
  const k = rowH / 84;
  const listTop = bottom - n * rowH;

  card.exercises.forEach((e, i) => {
    const ry = listTop + i * rowH;
    const mid = ry + rowH / 2;
    if (i > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(PAD, ry, inner, 2);
    }
    ctx.textBaseline = 'middle';
    const right = e.best ? formatSet(e.best.weight, e.best.reps) : '';
    ctx.font = font(Math.round(36 * k), 650);
    const rw = ctx.measureText(right).width;
    ctx.textAlign = 'right';
    ctx.fillStyle = FG;
    ctx.fillText(right, W - PAD, mid);
    ctx.textAlign = 'left';
    ctx.fillStyle = SUBTLE;
    ctx.font = font(Math.round(27 * k), 500);
    const setsLabel = pluralSets(e.sets);
    const sw = ctx.measureText(setsLabel).width;
    ctx.fillText(setsLabel, W - PAD - rw - sw - 28, mid + 1);
    // A long name first gets smaller type (down to 80 %), only then an ellipsis.
    const nameMax = inner - rw - sw - 72;
    let size = Math.round(36 * k);
    ctx.font = font(size, 500);
    while (size > Math.round(29 * k) && ctx.measureText(e.name).width > nameMax) ctx.font = font(--size, 500);
    ctx.fillStyle = FG;
    ctx.fillText(fit(ctx, e.name, nameMax), PAD, mid);
  });

  // Body figures, centred in the space between the stats and the list.
  if (figH > 0) {
    const figTop = top + (listTop - top - figH - FIG_EXTRA) / 2 + 10;
    g = ctx.createRadialGradient(W / 2, figTop + figH / 2, 0, W / 2, figTop + figH / 2, figH * 0.75);
    g.addColorStop(0, rgba(A, 0.08));
    g.addColorStop(1, rgba(A, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, figTop - 40, W, figH + 80);
    drawBody(ctx, anatomy, card, 'front', W * 0.32, figTop, figH);
    drawBody(ctx, anatomy, card, 'back', W * 0.68, figTop, figH);
    ctx.fillStyle = SUBTLE;
    ctx.font = font(24, 500);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Спереду', W * 0.32, figTop + figH + 36);
    ctx.fillText('Ззаду', W * 0.68, figTop + figH + 36);
    ctx.textAlign = 'left';
  }

  // Footer (inside the area story apps may cover — decorative only).
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = font(26, 500);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Записано в Pulse', W / 2, CARD_H - 120);
  ctx.textAlign = 'left';
}

/** Works out what the card shows: only completed sets, muscles weighted like the weekly map. */
export function buildShareCard(
  session: WorkoutSession,
  exerciseById: (id: string) => Exercise | undefined,
  settings: Pick<Settings, 'accent' | 'bodyType'>,
): ShareCard {
  const load: Partial<Record<Slug, number>> = {};
  const add = (slugs: Slug[] | undefined, n: number) => {
    for (const slug of slugs ?? []) load[slug] = (load[slug] ?? 0) + n;
  };
  const exercises: ShareCard['exercises'] = [];
  let sets = 0;
  for (const e of session.exercises) {
    const done = e.sets.filter((x) => x.done !== false && x.reps > 0);
    if (!done.length) continue;
    sets += done.length;
    const best = bestSet(done.map((x) => ({ ...x, done: true })));
    exercises.push({ name: e.name, sets: done.length, best: best && { weight: best.weight, reps: best.reps } });
    const { primary, secondary } = muscleTargets(exerciseById(e.exerciseId) ?? { id: e.exerciseId, muscleGroup: 'fullBody' });
    for (const m of primary) add(MUSCLE_SLUGS[m], done.length);
    for (const m of secondary) if (!primary.includes(m)) add(MUSCLE_SLUGS[m], done.length / 2);
  }
  return {
    name: session.name,
    startedAt: session.startedAt,
    durationSec: session.durationSec,
    volumeKg: sessionVolume(session),
    sets,
    exercises,
    load,
    sex: settings.bodyType === 'female' ? 'female' : 'male',
    accent: (ACCENTS[settings.accent] ?? ACCENTS.lime).accent,
  };
}

/** Draws the card off-screen and returns it as a PNG. */
export async function renderShareImage(card: ShareCard): Promise<Blob> {
  const [{ ANATOMY }] = await Promise.all([
    import('@/data/anatomy'),
    document.fonts?.load(font(76, 700)),
    document.fonts?.load(font(36, 500)),
    document.fonts?.load(font(36, 650)),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas недоступний');
  drawShareCard(ctx, card, ANATOMY);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Не вдалося створити зображення'))), 'image/png'));
}
