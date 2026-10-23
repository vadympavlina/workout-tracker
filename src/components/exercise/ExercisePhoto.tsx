import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Pause, Play } from 'lucide-react';

interface Props {
  frames: string[];
  alt: string;
  className?: string;
  /** Milliseconds per frame when animating start ↔ end position. */
  interval?: number;
  showControl?: boolean;
  /** Shown instead when no frame can be loaded (broken link, offline). Default: nothing. */
  fallback?: ReactNode;
}

/**
 * Crossfades between start/end photos like a slow GIF. Animates only while
 * on screen and never when the user prefers reduced motion. Frames that fail
 * to load are dropped; with none left the whole block disappears.
 */
export function ExercisePhoto({ frames: all, alt, className, interval = 1100, showControl = true, fallback = null }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [frame, setFrame] = useState(0);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const key = all.join('|');
  useEffect(() => {
    setFailed([]);
    setFrame(0);
  }, [key]);
  const frames = all.filter((src) => !failed.includes(src));
  const animated = frames.length > 1;

  useEffect(() => {
    const el = ref.current;
    if (!el || !animated) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [animated]);

  useEffect(() => {
    if (!animated || !visible || paused) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % frames.length), interval);
    return () => window.clearInterval(id);
  }, [animated, visible, paused, frames.length, interval]);

  if (frames.length === 0) return <>{fallback}</>;
  const current = frame % frames.length;

  return (
    <div ref={ref} className={clsx('relative overflow-hidden bg-white/[0.04]', className)}>
      {frames.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? alt : ''}
          onError={() => setFailed((f) => (f.includes(src) ? f : [...f, src]))}
          aria-hidden={i === 0 ? undefined : true}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={clsx(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-in-out',
            i === current ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden />
      {animated && showControl && (
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          aria-label={paused ? 'Відтворити анімацію вправи' : 'Зупинити анімацію вправи'}
          className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/70"
        >
          {paused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
        </button>
      )}
    </div>
  );
}
