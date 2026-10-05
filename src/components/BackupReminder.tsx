import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useBackup } from '@/hooks/useBackup';
import { plural } from '@/utils/format';

/** Dashboard nudge: data lives only in this browser, so keep a copy. */
export function BackupReminder() {
  const { due, daysSince, exportNow, snooze } = useBackup();
  if (!due) return null;
  return (
    <section aria-label="Нагадування про резервну копію" className="card flex flex-col gap-4 border-warning/25 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-warning/[0.12] text-warning">
          <ShieldAlert size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">Збережи резервну копію</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {daysSince == null
              ? 'Дані зберігаються лише в цьому браузері. Копія займе секунду.'
              : `Остання копія — ${daysSince} ${plural(daysSince, ['день', 'дні', 'днів'])} тому. Дані зберігаються лише в цьому браузері.`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="ghost" className="h-10" onClick={snooze}>
          Пізніше
        </Button>
        <Button size="sm" className="h-10 px-4" onClick={() => void exportNow()}>
          Зберегти копію
        </Button>
      </div>
    </section>
  );
}
