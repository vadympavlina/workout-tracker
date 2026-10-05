import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { Muscle } from '@/types';

/**
 * Stylised anatomical map (front + back), drawn in a 100×200 box per view.
 * Primary muscles glow in the accent colour, secondary ones are a softer tint.
 */

type View = 'front' | 'back';

const FRONT_ONLY: Muscle[] = ['chest', 'biceps', 'abs', 'obliques', 'quads'];
const BACK_ONLY: Muscle[] = ['triceps', 'lats', 'traps', 'lowerBack', 'glutes', 'hamstrings'];

/** Picks the view that shows the primary muscles best. */
export function bestView(primary: Muscle[]): View {
  const front = primary.filter((m) => FRONT_ONLY.includes(m)).length;
  const back = primary.filter((m) => BACK_ONLY.includes(m)).length;
  return back > front ? 'back' : 'front';
}

interface Shape {
  muscle: Muscle | null;
  node: (props: { className: string }) => ReactNode;
}

// Helper: a pair of mirrored elements around x = 50.
function pair(muscle: Muscle | null, render: (side: 1 | -1) => (props: { className: string }) => ReactNode): Shape[] {
  return [
    { muscle, node: render(1) },
    { muscle, node: render(-1) },
  ];
}
const mx = (x: number, side: 1 | -1) => (side === 1 ? x : 100 - x);
const ell = (muscle: Muscle | null, cx: number, cy: number, rx: number, ry: number, rot = 0) =>
  pair(muscle, (side) => ({ className }) => (
    <ellipse className={className} cx={mx(cx, side)} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot * side} ${mx(cx, side)} ${cy})`} />
  ));
const path = (muscle: Muscle | null, d: (side: 1 | -1) => string) =>
  pair(muscle, (side) => ({ className }) => <path className={className} d={d(side)} />);

/** Mirrors an "M x,y C …" path drawn for the left side. */
const p = (side: 1 | -1, pts: [string, ...number[]][]) =>
  pts.map(([cmd, ...n]) => cmd + n.map((v, i) => (i % 2 === 0 ? mx(v, side) : v)).join(',')).join(' ');

/** A rounded capsule centred on (cx, cy), mirrored to both sides. */
const capsule = (cx: number, cy: number, w: number, h: number, rot = 0) =>
  pair(null, (side) => ({ className }) => (
    <rect
      className={className}
      x={mx(cx, side) - w / 2}
      y={cy - h / 2}
      width={w}
      height={h}
      rx={w / 2}
      transform={`rotate(${rot * side} ${mx(cx, side)} ${cy})`}
    />
  ));

/** Continuous body silhouette underneath the muscles. */
const BASE: Shape[] = [
  { muscle: null, node: ({ className }) => <ellipse className={className} cx={50} cy={14} rx={8.5} ry={10.5} /> },
  { muscle: null, node: ({ className }) => <rect className={className} x={44.5} y={22} width={11} height={10} rx={4} /> },
  {
    muscle: null,
    node: ({ className }) => (
      <path
        className={className}
        d="M41,29 L59,29 C68,30 75,34 76,42 C76.5,49 72,55 66.5,58 C65,70 64.5,82 64,94 L36,94 C35.5,82 35,70 33.5,58 C28,55 23.5,49 24,42 C25,34 32,30 41,29 Z"
      />
    ),
  },
  { muscle: null, node: ({ className }) => <rect className={className} x={35.5} y={88} width={29} height={19} rx={8} /> },
  ...capsule(26.5, 57, 11, 27, 12),
  ...capsule(22, 80, 9.5, 27, 14),
  ...ell(null, 19.5, 97, 4, 5.2),
  ...capsule(42, 124, 16.5, 50, 4),
  ...capsule(41, 163, 11, 36, 2),
  ...ell(null, 41, 184.5, 5.8, 3.4),
];

const FRONT: Shape[] = [
  ...ell('shoulders', 31, 40, 8, 7, -25),
  ...path('chest', (s) => p(s, [['M', 49, 35], ['C', 42, 33, 35, 35, 33.5, 43], ['C', 33, 51, 40, 56, 49, 55], ['Z']])),
  ...ell('biceps', 27, 57, 4.8, 10.5, 12),
  ...ell('forearms', 22.5, 79, 4.3, 12, 14),
  { muscle: 'abs', node: ({ className }) => <rect className={className} x={43} y={58} width={14} height={33} rx={5} /> },
  ...ell('obliques', 38.4, 74, 3.4, 13),
  ...ell('quads', 41.5, 124, 7.6, 22, 4),
  ...ell('calves', 41, 163, 4.6, 15, 2),
];

const BACK: Shape[] = [
  { muscle: 'traps', node: ({ className }) => <path className={className} d="M50,25 L61,35 L57,50 L50,56 L43,50 L39,35 Z" /> },
  ...ell('shoulders', 31, 40, 8, 7, -25),
  ...path('lats', (s) => p(s, [['M', 46, 53], ['C', 40, 50, 34, 47, 33.5, 55], ['C', 34, 66, 40, 77, 46.5, 80], ['Z']])),
  ...ell('triceps', 27, 57, 4.8, 10.5, 12),
  ...ell('forearms', 22.5, 79, 4.3, 12, 14),
  { muscle: 'lowerBack', node: ({ className }) => <rect className={className} x={44} y={72} width={12} height={18} rx={4} /> },
  ...ell('glutes', 43, 102, 8, 9),
  ...ell('hamstrings', 42, 129, 6.6, 17, 3),
  ...ell('calves', 41, 161, 5.6, 13, 2),
];

interface Props {
  primary: Muscle[];
  secondary?: Muscle[];
  view?: View | 'both';
  className?: string;
  /** Accessible description; pass '' to hide from assistive tech (e.g. decorative thumbnails). */
  label?: string;
}

export function MuscleMap({ primary, secondary = [], view = 'both', className, label }: Props) {
  const views: View[] = view === 'both' ? ['front', 'back'] : [view];
  const width = views.length * 100 + (views.length - 1) * 12;
  const captions = view === 'both';
  const height = captions ? 214 : 200;

  const cls = (m: Muscle | null) =>
    m && primary.includes(m)
      ? 'fill-accent drop-shadow-[0_0_6px_rgb(var(--c-accent)/0.55)]'
      : m && secondary.includes(m)
        ? 'fill-accent/45'
        : m
          ? 'fill-white/[0.12]'
          : 'fill-white/[0.05]';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={clsx('h-full w-auto', className)}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      {views.map((v, i) => (
        <g key={v} transform={`translate(${i * 112} 0)`}>
          {[...BASE, ...(v === 'front' ? FRONT : BACK)].map((shape, j) => (
            <g key={j}>{shape.node({ className: clsx('transition-[fill] duration-300', cls(shape.muscle)) })}</g>
          ))}
          {captions && (
            <text x={50} y={210} textAnchor="middle" className="fill-subtle font-mono text-[8px] uppercase tracking-[0.14em]">
              {v === 'front' ? 'Спереду' : 'Ззаду'}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
