import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, Link2, RefreshCw, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { Equipment, Exercise, IconKey, MuscleGroup } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { EQUIPMENT, MUSCLE_GROUPS } from '@/data/labels';
import { ICON_KEYS, ICONS } from '@/utils/icons';
import { uid } from '@/utils/id';
import { resizeImageToBlob } from '@/utils/files';
import { mediaStore } from '@/services/mediaStore';
import { useExercisePhotos } from '@/hooks/useExercisePhotos';
import { useToast } from '@/components/ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (exercise: Exercise) => void;
  initial?: Exercise | null;
}

/** Accepts only absolute http(s) links; returns the trimmed URL or null. */
export function normalizePhotoUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Uploaded photos are synced through the database, so keep them small (~100–200 KB). */
async function compressPhoto(file: File): Promise<Blob> {
  const blob = await resizeImageToBlob(file, 900, 0.8);
  return blob.size > 220_000 ? resizeImageToBlob(file, 700, 0.7) : blob;
}

const blank = (): Exercise => ({
  id: '',
  name: '',
  muscleGroup: 'chest',
  equipment: 'machine',
  description: '',
  icon: 'dumbbell',
  defaultSets: 3,
  defaultRepsMin: 8,
  defaultRepsMax: 12,
  isCustom: true,
});

export function ExerciseFormModal({ open, onClose, onSave, initial }: Props) {
  const [form, setForm] = useState<Exercise>(blank);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Pending photo change: a new blob, `null` = remove, `undefined` = untouched.
  const [photo, setPhoto] = useState<Blob | null | undefined>(undefined);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkBroken, setLinkBroken] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const existing = useExercisePhotos(initial?.isCustom && initial.hasPhoto ? { ...initial, photoUrl: undefined } : undefined);

  const newPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => {
    if (newPreview) URL.revokeObjectURL(newPreview);
  }, [newPreview]);
  const linkUrl = normalizePhotoUrl(link);
  const preview = linkUrl ?? (photo === null ? null : newPreview ?? existing[0] ?? null);

  useEffect(() => {
    if (open) {
      setForm(initial ?? blank());
      setError('');
      setPhoto(undefined);
      setLink(initial?.photoUrl ?? '');
      setLinkError('');
      setLinkBroken(false);
      setSaving(false);
    }
  }, [open, initial]);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPhoto(await compressPhoto(file));
      setLink('');
      setLinkError('');
    } catch (e) {
      toast.error('Не вдалося додати фото', (e as Error).message);
    }
  };

  const patch = (p: Partial<Exercise>) => setForm((f) => ({ ...f, ...p }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError('Вкажи назву вправи');
    const repsMin = Math.min(form.defaultRepsMin, form.defaultRepsMax);
    const repsMax = Math.max(form.defaultRepsMin, form.defaultRepsMax);
    if (link.trim() && !linkUrl) return setLinkError('Посилання має починатися з https://');
    const id = form.id || `custom-${uid()}`;
    let hasPhoto = !!form.hasPhoto;
    setSaving(true);
    try {
      if (linkUrl) {
        // A link replaces an uploaded photo.
        if (hasPhoto) await mediaStore.remove(id);
        hasPhoto = false;
      } else if (photo) {
        await mediaStore.put(id, photo);
        hasPhoto = true;
      } else if (photo === null) {
        await mediaStore.remove(id);
        hasPhoto = false;
      }
    } catch {
      toast.error('Фото не збережено', 'Сховище браузера недоступне. Вправу збережено без фото.');
    }
    setSaving(false);
    const { photoUrl: _old, ...rest } = form;
    onSave({ ...rest, id, name, hasPhoto, ...(linkUrl ? { photoUrl: linkUrl } : {}), description: form.description.trim(), defaultRepsMin: repsMin, defaultRepsMax: repsMax });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Редагувати вправу' : 'Нова вправа'}
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Скасувати
          </Button>
          <Button block type="submit" form="exercise-form" disabled={saving}>
            Зберегти
          </Button>
        </>
      }
    >
      <form id="exercise-form" onSubmit={(e) => void submit(e)} className="space-y-4">
        <Input
          label="Назва"
          value={form.name}
          onChange={(e) => {
            patch({ name: e.target.value });
            setError('');
          }}
          placeholder="Напр., Жим гантелей сидячи"
          error={error}
          data-autofocus
          maxLength={60}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Група мʼязів"
            value={form.muscleGroup}
            onChange={(e) => patch({ muscleGroup: e.target.value as MuscleGroup })}
            options={Object.entries(MUSCLE_GROUPS).map(([value, label]) => ({ value, label }))}
          />
          <Select
            label="Обладнання"
            value={form.equipment}
            onChange={(e) => patch({ equipment: e.target.value as Equipment })}
            options={Object.entries(EQUIPMENT).map(([value, label]) => ({ value, label }))}
          />
        </div>
        {/* Three steppers don't fit side by side on a phone: bare numeric cells, like the plan editor. */}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['Підходи', 'defaultSets', 10],
              ['Повт. від', 'defaultRepsMin', 100],
              ['Повт. до', 'defaultRepsMax', 100],
            ] as const
          ).map(([label, key, max]) => (
            <div key={key}>
              <span className="label mb-1.5 block" aria-hidden>
                {label}
              </span>
              <NumberInput variant="compact" ariaLabel={label} value={form[key]} min={1} max={max} onChange={(v) => patch({ [key]: v ?? 1 })} />
            </div>
          ))}
        </div>
        <fieldset className="min-w-0">
          <legend className="label mb-2">Іконка</legend>
          <div className="grid grid-cols-6 gap-2">
            {ICON_KEYS.map((key: IconKey) => {
              const Icon = ICONS[key];
              const selected = form.icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`Іконка ${key}`}
                  aria-pressed={selected}
                  onClick={() => patch({ icon: key })}
                  className={clsx(
                    'inline-flex h-12 items-center justify-center rounded-ctl border transition',
                    selected ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line bg-elevated text-muted hover:text-fg',
                  )}
                >
                  <Icon size={20} aria-hidden />
                </button>
              );
            })}
          </div>
        </fieldset>
        <div>
          <p className="label mb-1.5">Фото</p>
          {preview ? (
            <div className="relative overflow-hidden rounded-[18px] bg-white/[0.04]">
              {linkBroken ? (
                <div className="flex aspect-[3/2] w-full items-center justify-center px-6 text-center text-[14px] text-muted">
                  Не вдалося завантажити зображення за цим посиланням
                </div>
              ) : (
                <img
                  src={preview}
                  alt="Фото вправи"
                  className="aspect-[3/2] w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => linkUrl && setLinkBroken(true)}
                  onLoad={() => setLinkBroken(false)}
                />
              )}
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button size="sm" variant="secondary" icon={RefreshCw} className="bg-black/60 backdrop-blur" onClick={() => fileInput.current?.click()}>
                  Змінити
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Trash2}
                  className="bg-black/60 text-negative backdrop-blur"
                  onClick={() => {
                    setLink('');
                    setLinkBroken(false);
                    setPhoto(null);
                  }}
                >
                  Прибрати
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-white/15 text-muted transition hover:border-accent/60 hover:text-fg"
            >
              <ImagePlus size={22} aria-hidden />
              <span className="text-[14px] font-medium">Завантажити фото</span>
              <span className="text-[12px] text-subtle">Напр., тренажер у твоєму залі</span>
            </button>
          )}
          <Input
            className="mt-3"
            label="Або посилання на фото"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://…"
            value={link}
            suffix={<Link2 size={16} aria-hidden />}
            error={linkError}
            onChange={(e) => {
              setLink(e.target.value);
              setLinkError('');
              setLinkBroken(false);
            }}
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void pickPhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        <Textarea
          label="Опис / техніка"
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Ключові моменти техніки (необовʼязково)"
          maxLength={400}
        />
      </form>
    </Modal>
  );
}
