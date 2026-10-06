import { expect, startDemo, test } from './helpers';

const ROUTES = ['', 'plan', 'history', 'progress', 'profile', 'exercises', 'exercises/squat', 'weight', 'help'];

for (const width of [375, 430]) {
  test(`no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await startDemo(page);
    for (const route of ROUTES) {
      await page.goto(`./#/${route}`);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `/${route}`).toBeLessThanOrEqual(0);
    }
  });
}

test('no backup reminder: the cloud keeps the data', async ({ page }) => {
  await startDemo(page);
  await expect(page.getByRole('heading', { name: /Привіт/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Нагадування про резервну копію' })).toHaveCount(0);
});

test('PWA: manifest, icons and service worker on the sub-path', async ({ page, request }) => {
  for (const path of ['manifest.webmanifest', 'favicon.ico', 'icons/icon-192.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'og-image.png'])
    expect((await request.get(path)).ok(), path).toBe(true);
  await page.goto('./');
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/workout-tracker\/$/);
});
