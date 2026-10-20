/**
 * The app behaves like a native one: no pinch-zoom, no double-tap zoom, no
 * auto-zoom into focused fields. The viewport meta tag (maximum-scale=1,
 * user-scalable=no) covers Android and focus zoom; iOS Safari ignores
 * user-scalable since iOS 10, so its pinch gesture is cancelled here, and CSS
 * `touch-action: pan-x pan-y` on <html> disables double-tap zoom.
 */
export function disableZoom() {
  const stop = (event: Event) => event.preventDefault();
  // WebKit-only pinch events.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, stop, { passive: false });
  // Two-finger pinch reported as a scaled touchmove (older iOS).
  document.addEventListener(
    'touchmove',
    (event) => {
      if ((event as TouchEvent & { scale?: number }).scale !== undefined && (event as TouchEvent & { scale: number }).scale !== 1) event.preventDefault();
    },
    { passive: false },
  );
}
