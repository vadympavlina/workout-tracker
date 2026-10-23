import { EyeOff, ImageIcon } from 'lucide-react';
import type { Exercise, Muscle } from '@/types';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/Card';
import { ExercisePhoto } from '@/components/exercise/ExercisePhoto';
import { MuscleMap } from '@/components/exercise/MuscleMap';
import { MUSCLE_LABELS, muscleTargets } from '@/data/exerciseMedia';
import { useExercisePhotos } from '@/hooks/useExercisePhotos';
import { repsRange } from '@/utils/format';

/** Photo, muscle map, recommendation and technique — shared by the exercise page and the picker preview. */
export function ExerciseInfo({ exercise, compact }: { exercise: Exercise; compact?: boolean }) {
  const { data, updateSettings } = useData();
  const photos = useExercisePhotos(exercise, true);
  const hidden = data.settings.hiddenPhotos.includes(exercise.id);
  const targets = muscleTargets(exercise);
  const setHidden = (hide: boolean) => {
    const rest = data.settings.hiddenPhotos.filter((id) => id !== exercise.id);
    updateSettings({ hiddenPhotos: hide ? [...rest, exercise.id] : rest });
  };
  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {photos.length > 0 && !hidden && (
        <div className="relative">
          <ExercisePhoto frames={photos} alt={`Техніка: ${exercise.name}`} className="aspect-[3/2] w-full rounded-card border border-white/[0.06]" />
          {/* The bundled photo can show a different variation — let the user drop it. */}
          <button
            type="button"
            onClick={() => setHidden(true)}
            title="Фото не відповідає вправі? Сховай його"
            className="absolute left-2 top-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-black/55 px-3 text-[12.5px] font-medium text-white backdrop-blur transition hover:bg-black/70"
          >
            <EyeOff size={14} aria-hidden />
            Сховати фото
          </button>
        </div>
      )}
      {photos.length > 0 && hidden && (
        <button
          type="button"
          onClick={() => setHidden(false)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-[13px] font-medium text-muted transition hover:text-fg"
        >
          <ImageIcon size={14} aria-hidden />
          Показати фото
        </button>
      )}
      <Card padding={compact ? 'md' : 'lg'} className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className={compact ? 'mx-auto h-44' : 'mx-auto h-56 sm:h-60'}>
          <MuscleMap
            primary={targets.primary}
            secondary={targets.secondary}
            label={`Основні мʼязи: ${targets.primary.map((m) => MUSCLE_LABELS[m]).join(', ') || '—'}`}
          />
        </div>
        <div className="min-w-0 space-y-4">
          <MuscleList title="Основні мʼязи" tone="bg-accent" muscles={targets.primary} />
          {targets.secondary.length > 0 && <MuscleList title="Допоміжні" tone="bg-accent/45" muscles={targets.secondary} />}
          <p className="text-[14px] text-muted">
            Рекомендовано: <span className="tabular font-semibold text-fg">{exercise.defaultSets} × {repsRange(exercise.defaultRepsMin, exercise.defaultRepsMax)}</span>
          </p>
          {exercise.description && <p className="text-[15px] leading-relaxed">{exercise.description}</p>}
        </div>
      </Card>
    </div>
  );
}

function MuscleList({ title, tone, muscles }: { title: string; tone: string; muscles: Muscle[] }) {
  return (
    <div>
      <p className="eyebrow mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${tone}`} aria-hidden />
        {title}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {muscles.map((m) => (
          <li key={m} className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[13px] font-medium">
            {MUSCLE_LABELS[m]}
          </li>
        ))}
      </ul>
    </div>
  );
}
