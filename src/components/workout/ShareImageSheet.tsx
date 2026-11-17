import { useEffect, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import type { WorkoutSession } from '@/types';
import { useData } from '@/store/DataContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { buildShareCard, renderShareImage } from '@/utils/shareImage';
import { toISODate } from '@/utils/date';

interface Props {
  session: WorkoutSession;
  open: boolean;
  onClose: () => void;
}

/**
 * Story-sized picture of a finished workout. The image is drawn as soon as the sheet
 * opens, so the share button hands a ready file to the share sheet within the tap
 * (iOS refuses to share once the tap has been "used up" by slow work).
 */
export function ShareImageSheet({ session, open, onClose }: Props) {
  const { data, exerciseById } = useData();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    let objectUrl: string | null = null;
    setFailed(false);
    renderShareImage(buildShareCard(session, exerciseById, data.settings))
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setFile(new File([blob], `pulse-${toISODate(new Date(session.startedAt))}.png`, { type: 'image/png' }));
        setUrl(objectUrl);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setFile(null);
      setUrl(null);
    };
  }, [open, session, exerciseById, data.settings]);

  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: session.name });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Не вдалося поділитися', 'Збережи фото і надішли його вручну');
    }
  };

  const save = () => {
    if (!file || !url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Поділитися фото"
      description="Формат 9:16 — для сторіс в Instagram чи Telegram"
      footer={
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row">
          <Button variant="secondary" icon={Download} block disabled={!file} onClick={save}>
            Зберегти
          </Button>
          {canShareFile && (
            <Button icon={Share2} block onClick={() => void share()}>
              Поділитися
            </Button>
          )}
        </div>
      }
    >
      <div className="mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-tile bg-surface ring-1 ring-white/[0.08]">
        {url ? (
          <img src={url} alt={`Картинка тренування «${session.name}»`} className="h-full w-full object-cover" />
        ) : failed ? (
          <p className="flex h-full items-center justify-center p-6 text-center text-subhead text-muted">Не вдалося створити зображення</p>
        ) : (
          <div className="skeleton h-full w-full" aria-label="Створюємо зображення" role="status" />
        )}
      </div>
    </Modal>
  );
}
