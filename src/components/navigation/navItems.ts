import { ChartNoAxesCombined, CalendarDays, House, NotebookText, UserRound, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Головна', icon: House, end: true },
  { to: '/plan', label: 'План', icon: CalendarDays },
  { to: '/history', label: 'Журнал', icon: NotebookText },
  { to: '/progress', label: 'Прогрес', icon: ChartNoAxesCombined },
  { to: '/profile', label: 'Профіль', icon: UserRound },
];
