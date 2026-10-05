import {
  Activity, BicepsFlexed, Dumbbell, Flame, Footprints, HeartPulse, Mountain, PersonStanding, Shield, Target, Weight, Zap,
  type LucideIcon,
} from 'lucide-react';
import type { IconKey } from '@/types';

export const ICONS: Record<IconKey, LucideIcon> = {
  dumbbell: Dumbbell,
  biceps: BicepsFlexed,
  footprints: Footprints,
  flame: Flame,
  activity: Activity,
  target: Target,
  zap: Zap,
  weight: Weight,
  mountain: Mountain,
  heart: HeartPulse,
  person: PersonStanding,
  shield: Shield,
};

export const ICON_KEYS = Object.keys(ICONS) as IconKey[];
