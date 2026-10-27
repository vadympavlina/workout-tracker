import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  title: string;
  subtitle?: ReactNode;
  /** Shows a back button; string = explicit fallback route if there is no history. */
  back?: boolean | string;
  actions?: ReactNode;
  large?: boolean;
  className?: string;
}

/** Long names (plans, exercises) step down in size instead of stacking one word per line. */
function titleSize(title: string) {
  if (title.length <= 16) return 'text-[32px] leading-[1.05] sm:text-[40px]';
  if (title.length <= 30) return 'text-[26px] leading-[1.1] sm:text-[34px]';
  return 'text-[22px] leading-[1.15] sm:text-[30px]';
}

export function TopBar({ title, subtitle, back, actions, large = true, className }: Props) {
  const navigate = useNavigate();
  const goBack = () => {
    const canGoBack = (window.history.state?.idx ?? 0) > 0;
    if (canGoBack) navigate(-1);
    else navigate(typeof back === 'string' ? back : '/');
  };
  const heading = (
    <div className="min-w-0 flex-1 pt-1">
      <h1 className={clsx('break-words font-bold tracking-[-0.035em] [text-wrap:balance]', large ? titleSize(title) : 'text-xl')}>{title}</h1>
      {subtitle && <div className="mt-2 text-[15px] text-muted">{subtitle}</div>}
    </div>
  );

  // Detail screens: navigation and actions share the top row, so a long name
  // gets the full width instead of wrapping beside the buttons.
  if (back)
    return (
      <header className={clsx('mb-6', className)}>
        <div className="flex min-h-[44px] items-center justify-between gap-2">
          <button
            type="button"
            onClick={goBack}
            aria-label="Назад"
            className="-ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center glass glass-press rounded-full text-fg"
          >
            <ChevronLeft size={22} aria-hidden />
          </button>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
        <div className="mt-3">{heading}</div>
      </header>
    );

  return (
    <header className={clsx('mb-6 flex items-start gap-2', className)}>
      {back && (
        <button
          type="button"
          onClick={goBack}
          aria-label="Назад"
          className="-ml-1 mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center glass glass-press rounded-full text-fg"
        >
          <ChevronLeft size={22} aria-hidden />
        </button>
      )}
      {heading}
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
