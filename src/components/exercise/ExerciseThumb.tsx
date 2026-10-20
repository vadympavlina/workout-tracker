import clsx from 'clsx';
import type { Exercise } from '@/types';
import { muscleTargets } from '@/data/exerciseMedia';
import { BodyFigure, bestView, exerciseColors, slugsOf } from './Anatomy';

interface Props {
  exercise: Exercise | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'h-11 w-11 rounded-[12px]', md: 'h-14 w-14 rounded-[14px]', lg: 'h-20 w-20 rounded-[18px]' };

/** List thumbnail: the body zoomed in on the worked muscles. */
export function ExerciseThumb({ exercise, size = 'md', className }: Props) {
  const { primary, secondary } = muscleTargets(exercise);
  return (
    <span className={clsx('inline-flex shrink-0 overflow-hidden bg-[#111114]', sizes[size], className)} aria-hidden>
      <BodyFigure view={bestView(primary)} colors={exerciseColors(primary, secondary)} crop={slugsOf(primary)} className="h-full w-full" />
    </span>
  );
}
