/**
 * Short chime for the end of rest. iPhones ignore navigator.vibrate, so this is the
 * only signal there. Web Audio must be unlocked by a tap first (iOS rule), so the
 * workout screen calls `unlockAudio()` on taps; the chime then plays on its own.
 * The audio session is set to "ambient" so music in the headphones keeps playing.
 */
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    const nav = navigator as AudioSessionNavigator;
    if (nav.audioSession) nav.audioSession.type = 'ambient';
  } catch {
    /* older Safari */
  }
  ctx = new Ctor();
  return ctx;
}

/** Call from a tap handler: lets later sounds play without a tap. */
export function unlockAudio() {
  const c = context();
  if (c && c.state === 'suspended') void c.resume().catch(() => {});
}

/** Two rising notes, ~0.5 s. Quiet enough not to startle, clear enough over gym noise. */
export function playRestChime() {
  const c = context();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  const start = c.currentTime + 0.02;
  [
    [880, 0],
    [1318.5, 0.18],
  ].forEach(([freq, at]) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = start + at;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.34);
  });
}
