import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { NAV_ITEMS } from './navItems';

export function BottomNavigation() {
  return (
    <nav
      aria-label="Основна навігація"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-between px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'group flex h-[64px] flex-col items-center justify-center gap-1 rounded-ctl text-[11px] font-medium transition-colors',
                  isActive ? 'text-fg' : 'text-subtle hover:text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      'inline-flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300',
                      isActive ? 'bg-accent/15 text-accent' : 'group-active:scale-90',
                    )}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.3 : 1.9} aria-hidden />
                  </span>
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
