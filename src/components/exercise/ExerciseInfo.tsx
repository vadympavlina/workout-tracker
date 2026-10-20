import type { Exercise, Muscle } from '@/types';
import { Card } from '@/components/ui/Card';
import { ExercisePhoto } from '@/components/exercise/ExercisePhoto';
import { MuscleMap } from '@/components/exercise/MuscleMap';
import { MUSCLE_LABELS, muscleTargets } from '@/data/exerciseMedia';
import { useExercisePhotos } from '@/hooks/useExercisePhotos';
import { repsRange } from '@/utils/format';

/** Photo, muscle map, recommendation and technique — shared by the exercise page and the picker preview. */
export function ExerciseInfo({ exercise, compact }: { exercise: Exercise; compact?: boolean }) {
  const photos = useExercisePhotos(exercise);
  const targets = muscleTargets(exercise);
  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {photos.length > 0 && (
        <ExercisePhoto frames={photos} alt={`Техніка: ${exercise.name}`} className="aspect-[3/2] w-full rounded-card border border-white/[0.06]" />
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
