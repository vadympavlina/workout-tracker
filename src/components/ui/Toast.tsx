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
  /** Optional inline action, e.g. "Undo". */
  action?: { label: string; onClick: () => void };
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
      // Same message again replaces the old one instead of stacking; at most 2 visible.
      setToasts((list) => [...list.filter((t) => t.title !== toast.title).slice(-1), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.action ? 5000 : toast.kind === 'error' ? 4500 : 2600);
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
          style={{ top: 'calc(8px + var(--safe-top))' }}
        >
          {toasts.map((t) => {
            const Icon = ICON[t.kind];
            return (
              <div
                key={t.id}
                role={t.kind === 'error' ? 'alert' : 'status'}
                className={clsx(
                  'pointer-events-auto flex w-full max-w-sm animate-slide-up items-center gap-3 rounded-[20px] border border-white/[0.08] bg-[rgb(28_28_31/0.92)] py-2 pl-3.5 pr-1.5 shadow-2xl backdrop-blur-2xl',
                  t.kind === 'record' && 'border-warning/30',
                )}
              >
                <Icon size={19} className={clsx('shrink-0', TONE[t.kind], t.kind === 'record' && 'animate-pop')} aria-hidden />
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="truncate text-[14px] font-semibold leading-snug">{t.title}</p>
                  {t.description && <p className="truncate text-[12.5px] text-muted">{t.description}</p>}
                </div>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                    className="h-9 shrink-0 rounded-full bg-white/[0.1] px-3.5 text-[13px] font-semibold text-accent transition hover:bg-white/[0.16]"
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Закрити сповіщення"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-subtle hover:bg-white/[0.06] hover:text-fg"
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
