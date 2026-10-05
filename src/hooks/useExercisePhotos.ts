import { useEffect, useState } from 'react';
import type { Exercise } from '@/types';
import { builtInPhotos } from '@/data/exerciseMedia';
import { mediaStore } from '@/services/mediaStore';

/** Photo frames for an exercise: the user's own photo, else bundled start/end frames. */
export function useExercisePhotos(exercise: Exercise | undefined): string[] {
  const [custom, setCustom] = useState<string | null>(null);
  const id = exercise?.id;
  const hasPhoto = !!exercise?.hasPhoto;

  useEffect(() => {
    if (!id || !hasPhoto) {
      setCustom(null);
      return;
    }
    let url: string | null = null;
    let cancelled = false;
    const load = () =>
      mediaStore
        .get(id)
        .then((blob) => {
          if (cancelled) return;
          if (url) URL.revokeObjectURL(url);
          url = blob ? URL.createObjectURL(blob) : null;
          setCustom(url);
        })
        .catch(() => setCustom(null));
    void load();
    const unsubscribe = mediaStore.subscribe((changed) => {
      if (changed === id || changed === '*') void load();
    });
    return () => {
      cancelled = true;
      unsubscribe();
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, hasPhoto]);

  if (custom) return [custom];
  return id ? builtInPhotos(id) : [];
}
