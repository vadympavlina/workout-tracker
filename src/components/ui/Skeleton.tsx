import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden />;
}

/** Generic page placeholder shown while a route chunk or data is loading. */
export function PageSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Завантаження">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-44" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
  );
}
