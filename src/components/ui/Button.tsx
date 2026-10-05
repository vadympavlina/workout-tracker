import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'positive';
type Size = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  block?: boolean;
  children?: ReactNode;
}

const base =
  'inline-flex select-none items-center justify-center gap-2 font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-[#120f1f] hover:bg-accent/90 shadow-glow',
  secondary: 'bg-elevated text-fg border border-line hover:bg-white/[0.08] hover:border-white/[0.12]',
  ghost: 'text-muted hover:text-fg hover:bg-white/[0.05]',
  danger: 'bg-negative/10 text-negative border border-negative/20 hover:bg-negative/15',
  positive: 'bg-positive text-[#06210f] hover:bg-positive/90',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 rounded-xl px-3 text-[13px]',
  md: 'h-11 rounded-ctl px-4 text-[15px]',
  lg: 'h-14 rounded-card px-6 text-base',
};

export function buttonClass({ variant = 'primary', size = 'md', block }: Pick<CommonProps, 'variant' | 'size' | 'block'>) {
  return clsx(base, variants[variant], sizes[size], block && 'w-full');
}

function Content({ icon: Icon, iconRight: IconRight, children, size }: CommonProps) {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
  return (
    <>
      {Icon && <Icon size={iconSize} aria-hidden strokeWidth={2.2} />}
      {children}
      {IconRight && <IconRight size={iconSize} aria-hidden strokeWidth={2.2} />}
    </>
  );
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, iconRight, block, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={clsx(buttonClass({ variant, size, block }), className)} {...rest}>
      <Content icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Content>
    </button>
  );
});

type ButtonLinkProps = CommonProps & LinkProps;

export function ButtonLink({ variant, size, icon, iconRight, block, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={clsx(buttonClass({ variant, size, block }), className)} {...rest}>
      <Content icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Content>
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: 'ghost' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'ghost', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-ctl transition duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-30',
        size === 'md' ? 'h-11 w-11' : 'h-9 w-9',
        variant === 'ghost' && 'text-muted hover:bg-white/[0.06] hover:text-fg',
        variant === 'secondary' && 'border border-line bg-elevated text-fg hover:bg-white/[0.08]',
        variant === 'danger' && 'text-negative hover:bg-negative/10',
        className,
      )}
      {...rest}
    >
      <Icon size={size === 'md' ? 20 : 18} aria-hidden />
    </button>
  );
});
