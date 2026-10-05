import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { IconKey } from '@/types';
import { ICONS } from '@/utils/icons';

export type Tone = 'accent' | 'positive' | 'neutral' | 'warning' | 'move' | 'volume' | 'sets' | 'body';

interface Props {
  icon: IconKey | LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  tone?: Tone;
  className?: string;
}

const sizes = { sm: 'h-9 w-9 rounded-xl', md: 'h-11 w-11 rounded-[14px]', lg: 'h-14 w-14 rounded-[18px]' };
const iconSizes = { sm: 17, md: 20, lg: 24 };
export const TONES: Record<Tone, string> = {
  accent: 'bg-accent/[0.12] text-accent',
  positive: 'bg-positive/[0.12] text-positive',
  warning: 'bg-warning/[0.12] text-warning',
  neutral: 'bg-white/[0.06] text-muted',
  move: 'bg-move/[0.12] text-move',
  volume: 'bg-volume/[0.12] text-volume',
  sets: 'bg-sets/[0.12] text-sets',
  body: 'bg-body/[0.12] text-body',
};

export function IconBadge({ icon, size = 'md', tone = 'accent', className }: Props) {
  const Icon = typeof icon === 'string' ? ICONS[icon] : icon;
  return (
    <span className={clsx('inline-flex shrink-0 items-center justify-center', sizes[size], TONES[tone], className)} aria-hidden>
      <Icon size={iconSizes[size]} strokeWidth={2.1} />
    </span>
  );
}
