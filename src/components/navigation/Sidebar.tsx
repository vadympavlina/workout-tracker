import { NavLink, Link } from 'react-router-dom';
import clsx from 'clsx';
import { Dumbbell, Play } from 'lucide-react';
import { NAV_ITEMS } from './navItems';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useData } from '@/store/DataContext';
import { useActiveWorkout } from '@/store/ActiveWorkoutContext';

export function Sidebar({ onStart }: { onStart: () => void }) {
  const { data } = useData();
  const { active } = useActiveWorkout();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-bg px-4 py-6 lg:flex xl:w-[280px]">
      <Link to="/" className="mb-8 flex items-center gap-3 px-3" aria-label="Pulse — на головну">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[13px] bg-accent text-black shadow-glow">
          <Dumbbell size={20} strokeWidth={2.4} aria-hidden />
        </span>
        <span className="text-[20px] font-bold tracking-[-0.04em]">Pulse</span>
      </Link>

      <nav aria-label="Основна навігація" className="flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    'flex h-12 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors',
                    isActive ? 'bg-white/[0.08] text-fg' : 'text-muted hover:bg-white/[0.04] hover:text-fg',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} className={isActive ? 'text-accent' : ''} aria-hidden />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-4">
        <Button block size="lg" icon={Play} onClick={onStart}>
          {active ? 'Продовжити' : 'Почати тренування'}
        </Button>
        <Link to="/profile" className="flex items-center gap-3 rounded-full p-1.5 pr-4 transition hover:bg-white/[0.05]">
          <Avatar name={data.user.name} src={data.user.avatar} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">{data.user.name || 'Профіль'}</p>
            <p className="text-[13px] text-subtle">Налаштування</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
