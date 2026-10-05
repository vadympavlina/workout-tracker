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
          className="-ml-1 mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-fg transition hover:bg-white/[0.1]"
        >
          <ChevronLeft size={22} aria-hidden />
        </button>
      )}
      <div className="min-w-0 flex-1 pt-1">
        <h1 className={clsx('font-bold tracking-[-0.035em]', large ? 'text-[32px] leading-[1.05] sm:text-[40px]' : 'text-xl')}>{title}</h1>
        {subtitle && <div className="mt-2 text-[15px] text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
