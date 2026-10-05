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

export function TopBar({ title, subtitle, back, actions, large = true, className }: Props) {
  const navigate = useNavigate();
  const goBack = () => {
    const canGoBack = (window.history.state?.idx ?? 0) > 0;
    if (canGoBack) navigate(-1);
    else navigate(typeof back === 'string' ? back : '/');
  };
  return (
    <header className={clsx('mb-6 flex items-start gap-2', className)}>
      {back && (
        <button
          type="button"
          onClick={goBack}
          aria-label="Назад"
          className="-ml-2 mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl text-muted transition hover:bg-white/[0.06] hover:text-fg"
        >
          <ChevronLeft size={24} aria-hidden />
        </button>
      )}
      <div className="min-w-0 flex-1 pt-1">
        <h1 className={clsx('font-semibold tracking-tight', large ? 'text-[28px] leading-tight sm:text-[32px]' : 'text-xl')}>{title}</h1>
        {subtitle && <div className="mt-1 text-[15px] text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
