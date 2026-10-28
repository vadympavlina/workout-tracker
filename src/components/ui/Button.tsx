import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { Button as GlassButton } from 'glisse';

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

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-14 px-7 text-[16px]',
};

/**
 * Glass buttons come from glisse (Liquid Glass): `primary` and `positive` are filled,
 * `secondary` is clear glass, `danger` is glass with a red label. `ghost` stays a plain
 * text button for low-emphasis actions.
 */
const glassVariant: Record<Exclude<Variant, 'ghost'>, { variant: 'glass' | 'filled'; tint?: string; destructive?: boolean }> = {
  primary: { variant: 'filled' },
  positive: { variant: 'filled', tint: 'rgb(var(--c-positive))' },
  secondary: { variant: 'glass' },
  danger: { variant: 'glass', destructive: true },
};

const shape = 'rounded-full font-semibold tracking-[-0.01em]';
const ghost =
  'inline-flex select-none items-center justify-center gap-2 text-muted transition duration-200 hover:bg-white/[0.06] hover:text-fg active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40';

/** Classes for elements that must look like a button but are not one (e.g. router links). */
export function buttonClass({ variant = 'primary', size = 'md', block }: Pick<CommonProps, 'variant' | 'size' | 'block'>) {
  return clsx(variant === 'ghost' ? ghost : 'lg-glass lg-button', shape, sizes[size], block && 'w-full', variant === 'primary' && 'shadow-glow');
}

/** Data attributes glisse styles a `.lg-button` by (used on links that imitate a button). */
function glassData(variant: Variant = 'primary') {
  if (variant === 'ghost') return {};
  const g = glassVariant[variant];
  return {
    'data-variant': g.variant === 'filled' ? 'filled' : undefined,
    'data-destructive': g.destructive ? '' : undefined,
    'data-tint': g.tint ? '' : undefined,
    style: g.tint ? ({ ['--lg-tint' as string]: g.tint } as CSSProperties) : undefined,
  };
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
  { variant = 'primary', size, icon, iconRight, block, className, children, type = 'button', ...rest },
  ref,
) {
  const content = (
    <Content icon={icon} iconRight={iconRight} size={size}>
      {children}
    </Content>
  );
  if (variant === 'ghost')
    return (
      <button ref={ref} type={type} className={clsx(buttonClass({ variant, size, block }), className)} {...rest}>
        {content}
      </button>
    );
  const g = glassVariant[variant];
  return (
    <GlassButton
      ref={ref}
      type={type}
      variant={g.variant}
      tint={g.tint}
      destructive={g.destructive}
      className={clsx(shape, sizes[size ?? 'md'], block && 'w-full', variant === 'primary' && 'shadow-glow', className)}
      {...rest}
    >
      {content}
    </GlassButton>
  );
});

type ButtonLinkProps = CommonProps & LinkProps;

export function ButtonLink({ variant, size, icon, iconRight, block, className, children, style, ...rest }: ButtonLinkProps) {
  const data = glassData(variant);
  return (
    <Link className={clsx(buttonClass({ variant, size, block }), className)} {...data} style={{ ...data.style, ...style }} {...rest}>
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
  const box = size === 'md' ? 'h-11 w-11' : 'h-9 w-9';
  const glyph = <Icon size={size === 'md' ? 20 : 18} aria-hidden />;
  // Round glass button from glisse; ghost/danger stay plain icons on the surface.
  if (variant === 'secondary')
    return (
      <GlassButton ref={ref} type={type} icon={glyph} aria-label={label} title={label} className={clsx('shrink-0 rounded-full', box, className)} {...rest} />
    );
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full transition duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-30',
        box,
        variant === 'ghost' && 'text-muted hover:bg-white/[0.06] hover:text-fg',
        variant === 'danger' && 'text-negative hover:bg-negative/10',
        className,
      )}
      {...rest}
    >
      {glyph}
    </button>
  );
});
