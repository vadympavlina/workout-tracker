import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { IconKey } from '@/types';
import { ICONS } from '@/utils/icons';

interface Props {
  icon: IconKey | LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'accent' | 'positive' | 'neutral' | 'warning';
  className?: string;
}

const sizes = { sm: 'h-9 w-9 rounded-xl', md: 'h-11 w-11 rounded-ctl', lg: 'h-14 w-14 rounded-card' };
const iconSizes = { sm: 17, md: 20, lg: 24 };
const tones = {
  accent: 'bg-accent/10 text-accent ring-accent/15',
  positive: 'bg-positive/10 text-positive ring-positive/15',
  warning: 'bg-warning/10 text-warning ring-warning/15',
  neutral: 'bg-white/[0.04] text-muted ring-white/[0.06]',
};

export function IconBadge({ icon, size = 'md', tone = 'accent', className }: Props) {
  const Icon = typeof icon === 'string' ? ICONS[icon] : icon;
  return (
    <span className={clsx('inline-flex shrink-0 items-center justify-center ring-1 ring-inset', sizes[size], tones[tone], className)} aria-hidden>
      <Icon size={iconSizes[size]} strokeWidth={2} />
    </span>
  );
}
