import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { NAV_ITEMS } from './navItems';

/** Floating glass tab bar (phones/tablets). */
export function BottomNavigation() {
  return (
    <nav
      aria-label="Основна навігація"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 lg:hidden"
      style={{ paddingBottom: 'calc(10px + var(--safe-bottom))' }}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-bg via-bg/80 to-transparent" aria-hidden />
      <ul className="pointer-events-auto relative flex w-full max-w-md items-stretch justify-between rounded-full border border-white/[0.08] bg-[rgb(22_22_25/0.78)] p-1.5 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.9)] backdrop-blur-2xl">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                clsx(
                  'flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-medium transition-all duration-300',
                  isActive ? 'bg-white/[0.1] text-fg' : 'text-subtle hover:text-muted active:scale-95',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={21} strokeWidth={isActive ? 2.3 : 1.8} className={isActive ? 'text-accent' : ''} aria-hidden />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
