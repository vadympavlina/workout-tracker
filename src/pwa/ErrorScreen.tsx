import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useRouteError } from 'react-router-dom';
import { Home, RotateCw, TriangleAlert, WifiOff } from 'lucide-react';
import { isChunkError, reloadOnceForChunkError } from './chunkReload';

/** Last-resort screen instead of a blank page or the router's English default. */
export function ErrorScreen({ error }: { error: unknown }) {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  const chunk = isChunkError(error);
  const Icon = offline || chunk ? WifiOff : TriangleAlert;
  return (
    <main
      role="alert"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5"
      style={{ paddingTop: 'calc(24px + var(--safe-top))', paddingBottom: 'calc(24px + var(--safe-bottom))' }}
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/[0.06] text-muted">
        <Icon size={26} aria-hidden />
      </span>
      <h1 className="mt-6 text-[28px] font-bold leading-[1.1] tracking-[-0.04em]">
        {chunk ? 'Не вдалося завантажити екран' : 'Щось пішло не так'}
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        {chunk
          ? offline
            ? 'Немає інтернету, а цю частину застосунку ще не збережено на пристрої. Підключись до мережі й спробуй ще раз.'
            : 'Схоже, застосунок щойно оновився. Перезавантаж сторінку, щоб відкрити нову версію.'
          : 'Твої дані збережені. Перезавантаж сторінку — якщо помилка повториться, повернись на головну.'}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-accent text-[16px] font-semibold text-black"
      >
        <RotateCw size={18} aria-hidden /> Перезавантажити
      </button>
      <a href="./#/" onClick={() => setTimeout(() => window.location.reload(), 0)} className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-medium text-muted">
        <Home size={17} aria-hidden /> На головну
      </a>
    </main>
  );
}

/** `errorElement` for the router: chunk failures reload once, the rest get the screen. */
export function RouteError() {
  const error = useRouteError();
  if (isChunkError(error) && reloadOnceForChunkError()) return null;
  return <ErrorScreen error={error} />;
}

/** Catches render errors outside the router (auth gate, data provider). */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (isChunkError(error)) reloadOnceForChunkError();
    console.error(error, info.componentStack);
  }
  render() {
    return this.state.error ? <ErrorScreen error={this.state.error} /> : this.props.children;
  }
}
