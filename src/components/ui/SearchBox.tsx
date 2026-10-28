import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { SearchField } from 'glisse';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
  autoFocus?: boolean;
}

/** glisse search field: glass pill, magnifier and a clear button. */
export function SearchBox({ value, onChange, placeholder, label, className, autoFocus }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  // glisse names its clear button in English; the app speaks Ukrainian.
  useEffect(() => {
    ref.current?.parentElement?.querySelector('.lg-input-clear')?.setAttribute('aria-label', 'Очистити пошук');
  });
  return (
    <SearchField
      ref={ref}
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onValueChange={onChange}
      className={clsx('search-box', className)}
      {...(autoFocus ? { 'data-autofocus': true } : {})}
    />
  );
}
