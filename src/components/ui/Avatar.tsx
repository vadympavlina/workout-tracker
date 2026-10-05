import clsx from 'clsx';

interface Props {
  name: string;
  src: string | null;
  size?: number;
  className?: string;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function Avatar({ name, src, size = 44, className }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 font-semibold text-accent ring-1 ring-accent/25',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? <img src={src} alt={name ? `Фото: ${name}` : 'Фото профілю'} className="h-full w-full object-cover" /> : <span aria-hidden>{initials(name)}</span>}
    </span>
  );
}
