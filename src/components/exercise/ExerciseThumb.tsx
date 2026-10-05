import clsx from 'clsx';
import type { Exercise } from '@/types';
import { muscleTargets } from '@/data/exerciseMedia';
import { bestView, MuscleMap } from './MuscleMap';

interface Props {
  exercise: Exercise | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'h-11 w-10 rounded-[12px] py-1', md: 'h-14 w-12 rounded-[14px] py-1.5', lg: 'h-20 w-16 rounded-[18px] py-2' };

/** List thumbnail: the relevant side of the muscle map with target muscles lit. */
export function ExerciseThumb({ exercise, size = 'md', className }: Props) {
  const { primary, secondary } = muscleTargets(exercise);
  return (
    <span className={clsx('inline-flex shrink-0 items-center justify-center bg-white/[0.05]', sizes[size], className)} aria-hidden>
      <MuscleMap primary={primary} secondary={secondary} view={bestView(primary)} label="" />
    </span>
  );
}
