import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { CircleAlert, CircleCheck, Info, Trophy, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info' | 'record';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastApi {
  show: (toast: Omit<ToastItem, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICON = { success: CircleCheck, error: CircleAlert, info: Info, record: Trophy };
const TONE = {
  success: 'text-positive',
  error: 'text-negative',
  info: 'text-accent',
  record: 'text-warning',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.kind === 'error' ? 5000 : 3200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, description) => show({ kind: 'success', title, description }),
      error: (title, description) => show({ kind: 'error', title, description }),
      info: (title, description) => show({ kind: 'info', title, description }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end"
          style={{ top: 'calc(12px + var(--safe-top))' }}
        >
          {toasts.map((t) => {
            const Icon = ICON[t.kind];
            return (
              <div
                key={t.id}
                role={t.kind === 'error' ? 'alert' : 'status'}
                className={clsx(
                  'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-card border border-line bg-elevated/95 p-3.5 pr-2 shadow-2xl backdrop-blur-xl',
                  t.kind === 'record' && 'border-warning/30',
                )}
              >
                <Icon size={20} className={clsx('mt-0.5 shrink-0', TONE[t.kind], t.kind === 'record' && 'animate-pop')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold leading-snug">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-[13px] text-muted">{t.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Закрити сповіщення"
                  className="-my-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-subtle hover:bg-white/[0.06] hover:text-fg"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
