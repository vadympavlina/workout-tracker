import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Pulse` : 'Pulse — Workout Tracker';
  }, [title]);
}
