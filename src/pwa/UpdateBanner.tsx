import { RefreshCw } from 'lucide-react';
import { applyUpdate, useUpdateAvailable } from './registerSW';

/** Shown when a new deploy has been downloaded and is waiting to take over. */
export function UpdateBanner() {
  const available = useUpdateAvailable();
  if (!available) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4" style={{ paddingTop: 'calc(8px + var(--safe-top))' }}>
      <div role="status" className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full border border-white/10 bg-elevated/95 py-1.5 pl-4 pr-1.5 shadow-card backdrop-blur">
        <RefreshCw size={16} className="shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1 text-[14px] font-medium">Доступна нова версія</span>
        <button type="button" onClick={applyUpdate} className="h-9 shrink-0 rounded-full bg-accent px-4 text-[14px] font-semibold text-black">
          Оновити
        </button>
      </div>
    </div>
  );
}
