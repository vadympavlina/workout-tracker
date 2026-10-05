import { useCallback } from 'react';
import { useData } from '@/store/DataContext';
import { useToast } from '@/components/ui/Toast';
import { dataService } from '@/services/dataService';
import { downloadJson } from '@/utils/files';
import { daysBetween, toISODate } from '@/utils/date';

/** Days without a backup after which the dashboard nudges the user. */
export const BACKUP_REMINDER_DAYS = 14;

export function useBackup() {
  const data = useData();
  const toast = useToast();
  const { lastAt, snoozedUntil } = data.backup;

  const exportNow = useCallback(async () => {
    try {
      downloadJson(await dataService.toExportFile(data.data), `pulse-backup-${toISODate(new Date())}.json`);
      data.markBackup();
      toast.success('Резервну копію збережено', 'JSON-файл завантажено на пристрій');
    } catch (e) {
      toast.error('Не вдалося зробити копію', (e as Error).message);
    }
  }, [data, toast]);

  const daysSince = lastAt ? daysBetween(lastAt, new Date()) : null;
  const snoozed = !!snoozedUntil && new Date(snoozedUntil) > new Date();
  // Only nag once there is something worth losing.
  const due = data.sessions.length >= 3 && !snoozed && (daysSince == null || daysSince >= BACKUP_REMINDER_DAYS);

  return { exportNow, lastAt, daysSince, due, snooze: () => data.snoozeBackupReminder(7) };
}
