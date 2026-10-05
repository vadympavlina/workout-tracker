import { useState } from 'react';
import clsx from 'clsx';
import { Expand } from 'lucide-react';
import type { Exercise } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { useExercisePhotos } from '@/hooks/useExercisePhotos';
import { MUSCLE_LABELS, muscleTargets } from '@/data/exerciseMedia';
import { ExercisePhoto } from './ExercisePhoto';
import { ExerciseThumb } from './ExerciseThumb';
import { MuscleMap } from './MuscleMap';

interface Props {
  exercise: Exercise | undefined;
  className?: string;
}

/**
 * Compact animated preview for the active workout. Tapping opens a sheet with
 * the large start/end photos, target muscles and technique notes.
 */
export function ExerciseMediaButton({ exercise, className }: Props) {
  const [open, setOpen] = useState(false);
  const photos = useExercisePhotos(exercise);
  const targets = muscleTargets(exercise);
  if (!exercise) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Як виконувати: ${exercise.name}`}
        className={clsx('group relative shrink-0 overflow-hidden rounded-[16px] transition active:scale-95', className)}
      >
        {photos.length > 0 ? (
          <ExercisePhoto frames={photos} alt="" showControl={false} interval={1300} className="h-[68px] w-[92px]" />
        ) : (
          <ExerciseThumb exercise={exercise} size="lg" />
        )}
        <span className="absolute bottom-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-90 backdrop-blur" aria-hidden>
          <Expand size={12} />
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={exercise.name} size="lg">
        <div className="space-y-5">
          {photos.length > 0 && (
            <ExercisePhoto frames={photos} alt={`Техніка: ${exercise.name}`} className="aspect-[3/2] w-full rounded-[20px]" />
          )}
          <div className="flex items-center gap-5">
            <div className="h-40 shrink-0">
              <MuscleMap primary={targets.primary} secondary={targets.secondary} label={`Основні мʼязи: ${targets.primary.map((m) => MUSCLE_LABELS[m]).join(', ')}`} />
            </div>
            <div className="min-w-0 space-y-2 text-[14px]">
              <p>
                <span className="eyebrow mr-2">Основні</span>
                {targets.primary.map((m) => MUSCLE_LABELS[m]).join(', ') || '—'}
              </p>
              {targets.secondary.length > 0 && (
                <p className="text-muted">
                  <span className="eyebrow mr-2">Допоміжні</span>
                  {targets.secondary.map((m) => MUSCLE_LABELS[m]).join(', ')}
                </p>
              )}
            </div>
          </div>
          {exercise.description && <p className="text-[15px] leading-relaxed text-fg/90">{exercise.description}</p>}
        </div>
      </Modal>
    </>
  );
}
