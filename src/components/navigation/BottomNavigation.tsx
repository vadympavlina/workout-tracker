import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TabBar } from 'glisse';
import { NAV_ITEMS } from './navItems';

/** glisse renders tabs with `href` through this, so they stay router links. */
const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(({ href, ...props }, ref) => (
  <Link ref={ref} to={href} {...props} />
));

/** Floating Liquid Glass tab bar (phones/tablets); the lens follows the finger. */
export function BottomNavigation() {
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))?.to ?? null;
  return (
    <nav
      aria-label="Основна навігація"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 lg:hidden"
      style={{ paddingBottom: 'calc(10px + var(--safe-bottom))' }}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-bg via-bg/70 to-transparent" aria-hidden />
      <TabBar
        aria-label="Розділи"
        className="pointer-events-auto"
        // glisse tabs have a fixed width: share the bar (max 448px) between the five sections.
        style={{ ['--lg-tab-height' as string]: '56px', ['--lg-tab-width' as string]: 'calc((min(100vw - 24px, 448px) - 8px) / 5)' }}
        link={RouterLink}
        value={current}
        items={NAV_ITEMS.map(({ to, label, icon: Icon }) => ({
          value: to,
          href: to,
          label: (
            <span className="flex flex-col items-center gap-0.5 text-[11px] font-medium">
              <Icon size={21} strokeWidth={current === to ? 2.3 : 1.8} className={current === to ? 'text-accent' : undefined} aria-hidden />
              {label}
            </span>
          ),
        }))}
      />
    </nav>
  );
}
