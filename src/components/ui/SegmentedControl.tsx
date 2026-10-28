import { useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { TabBar } from 'glisse';

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}

/**
 * glisse's Liquid Glass segmented bar. Its tabs have a fixed width, so the bar is
 * measured and the width is split evenly — it always fills its container.
 */
export function SegmentedControl<T extends string>({ value, onChange, options, label, className }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={clsx('segmented flex w-full items-center', className)}>
      {width > 0 ? (
        <TabBar
          aria-label={label}
          items={options}
          value={value}
          onValueChange={(v) => onChange(v as T)}
          style={{ ['--lg-tab-width' as string]: `${(width - 8) / options.length}px`, ['--lg-tab-height' as string]: '36px' }}
        />
      ) : (
        <div className="h-11" aria-hidden />
      )}
    </div>
  );
}
