/* Pulse service worker — offline support for a static GitHub Pages build.
 *
 * The build (vite.config.ts → pwaPrecache) fills in BUILD and PRECACHE: every
 * file the app needs to start (HTML, JS/CSS chunks, fonts, icons, manifest).
 * Installing downloads them all, so the app opens offline after one visit —
 * including screens never opened before. Each deploy gets its own cache;
 * exercise photos live in a separate cache that survives deploys.
 *
 * Paths are resolved against the worker's scope, so any sub-path works. */
const BUILD = /*__BUILD__*/ 'dev' /*__END__*/;
const PRECACHE = /*__PRECACHE__*/ ['./', './index.html', './manifest.webmanifest'] /*__END__*/;
const SHELL_CACHE = `pulse-shell-${BUILD}`;
const MEDIA_CACHE = 'pulse-media-v1';
/** A slow gym connection must not leave a blank screen: fall back to the cache. */
const NAVIGATION_TIMEOUT_MS = 4000;

const scopeUrl = (path) => new URL(path, self.registration.scope).toString();

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // cache: 'reload' bypasses the HTTP cache so a deploy never precaches stale files.
      await cache.addAll(PRECACHE.map((path) => new Request(scopeUrl(path), { cache: 'reload' })));
      // First install: take over right away. Updates wait until the page agrees
      // (see SKIP_WAITING) so an open app never loses the chunks it still needs.
      if (!self.registration.active) await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('pulse-') && k !== SHELL_CACHE && k !== MEDIA_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION') event.source?.postMessage({ type: 'VERSION', build: BUILD });
});

/** Network first with a timeout; the precached shell is always a valid offline answer. */
async function navigate(request) {
  const cached = () => caches.match(scopeUrl('./index.html'), { cacheName: SHELL_CACHE });
  const network = fetch(request);
  network.catch(() => {}); // a late failure after the timeout is not an error
  const timeout = new Promise((resolve) => setTimeout(resolve, NAVIGATION_TIMEOUT_MS, 'timeout'));
  try {
    const response = await Promise.race([network, timeout]);
    if (response !== 'timeout' && response.ok) return response;
    return (await cached()) || (response === 'timeout' ? await network : response);
  } catch {
    return (await cached()) || Response.error();
  }
}

/** Cache first. Hashed build files are immutable; photos rarely change. */
async function fromCache(request, url) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const target = url.pathname.includes('/assets/') ? SHELL_CACHE : MEDIA_CACHE;
    const copy = response.clone();
    caches.open(target).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Firebase, fonts CDN etc. are handled by the browser / SDK.
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') return event.respondWith(navigate(request));
  event.respondWith(fromCache(request, url));
});
