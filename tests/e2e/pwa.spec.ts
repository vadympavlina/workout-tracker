import { expect, startDemo, test } from './helpers';

/** Waits until the service worker controls the page (first install claims it). */
async function swReady(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
}

/** Real offline: the page *and* the service worker lose the network. */
async function goOffline(context: import('@playwright/test').BrowserContext) {
  await context.setOffline(true);
  await context.route('**/*', (route) => route.abort('internetdisconnected'));
}

test('manifest, icons and service worker on the sub-path', async ({ page, request }) => {
  for (const path of ['manifest.webmanifest', 'favicon.ico', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'og-image.png'])
    expect((await request.get(path)).ok(), path).toBe(true);
  const manifest = await (await request.get('manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ start_url: './', scope: './', display: 'standalone' });
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);

  const sw = await (await request.get('sw.js')).text();
  expect(sw, 'build fills in the version').not.toContain("'dev'");
  await page.goto('./');
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/workout-tracker\/$/);
});

test('install precaches every file the app needs, including unvisited screens', async ({ page, request }) => {
  const sw = await (await request.get('sw.js')).text();
  const list: string[] = JSON.parse(sw.match(/const PRECACHE = (\[.*?\]);/)![1]);
  expect(list.some((f) => /assets\/HelpPage-.*\.js$/.test(f)), 'lazy chunks').toBe(true);
  expect(list.some((f) => /assets\/firebase-.*\.js$/.test(f)), 'firebase chunk').toBe(true);
  expect(list.some((f) => f.endsWith('.woff2')), 'fonts').toBe(true);
  expect(list.some((f) => f.includes('exercises/')), 'photos are cached on demand').toBe(false);

  await page.goto('./');
  await swReady(page);
  const cached = await page.evaluate(async () => {
    const name = (await caches.keys()).find((k) => k.startsWith('pulse-shell-'))!;
    return (await (await caches.open(name)).keys()).length;
  });
  expect(cached).toBe(list.length);
});

test('opens offline after one visit: signed in, data and never-opened screens', async ({ page, context }) => {
  await startDemo(page);
  await swReady(page);
  await goOffline(context);

  await page.reload();
  await expect(page.getByRole('heading', { name: /Привіт, Вадим/ })).toBeVisible();
  // Screens whose code was never loaded online come from the precache.
  for (const [route, heading] of [['help', 'Допомога'], ['progress', 'Прогрес'], ['weight', 'Вага тіла']] as const) {
    await page.goto(`./#/${route}`);
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  }
  // Logging works offline and survives a reload.
  await page.goto('./#/weight');
  await page.getByRole('textbox', { name: 'Вага, кг' }).fill('81,3');
  await page.getByRole('button', { name: 'Записати' }).click();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Записи' }).locator('li').first()).toContainText('81,3');
});

test('a missing chunk (app updated while open) reloads instead of a blank screen', async ({ page }) => {
  await startDemo(page);
  // Simulate a deploy that removed the old file names: every lazy chunk 404s once.
  let failed = 0;
  await page.route(/assets\/HelpPage-.*\.js$/, (route) => (failed++ === 0 ? route.fulfill({ status: 404, body: '' }) : route.continue()));
  await page.evaluate(async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Привіт/ })).toBeVisible();
  await page.goto('./#/help');
  await expect(page.getByRole('heading', { name: 'Допомога', level: 1 })).toBeVisible();
  // The 404 happened and the app recovered by itself (one automatic reload).
  expect(failed).toBeGreaterThanOrEqual(1);
});

test('a new deploy waits, offers "Оновити", then switches version', async ({ page, context, request }) => {
  await startDemo(page);
  await swReady(page);
  const original = await (await request.get('sw.js')).text();
  const oldBuild = original.match(/const BUILD = "(\w+)"/)![1];
  // Next deploy: same files, new build id (served to this context only, see serve-dist.mjs).
  await context.addCookies([{ name: 'pulse-test-build', value: 'nextbuild', url: page.url() }]);
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());

  const banner = page.getByRole('status').filter({ hasText: 'Доступна нова версія' });
  await expect(banner).toBeVisible();
  // The open app keeps working on its own version until the user agrees.
  expect(await page.evaluate(() => caches.keys())).toContain(`pulse-shell-${oldBuild}`);

  await banner.getByRole('button', { name: 'Оновити' }).click();
  await expect(banner).toBeHidden();
  await expect(page.getByRole('heading', { name: /Привіт, Вадим/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(expect.arrayContaining(['pulse-shell-nextbuild']));
  expect(await page.evaluate(() => caches.keys())).not.toContain(`pulse-shell-${oldBuild}`);
});
