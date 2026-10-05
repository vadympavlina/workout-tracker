import { useEffect } from 'react';
import { ACCENTS } from '@/data/labels';
import type { Settings } from '@/types';

/** Applies accent + OLED settings to CSS variables and the browser chrome colour. */
export function useTheme(settings: Settings) {
  useEffect(() => {
    const root = document.documentElement;
    const accent = ACCENTS[settings.accent] ?? ACCENTS.lime;
    root.style.setProperty('--c-accent', accent.accent);
    root.style.setProperty('--c-accent-strong', accent.strong);
    root.dataset.oled = String(settings.oled);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.oled ? '#000000' : '#050506');
  }, [settings.accent, settings.oled]);
}
