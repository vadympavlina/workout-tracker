import { expect, test } from '@playwright/test';
import { startDemo } from './helpers';

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

test('backup reminder: shown, cleared by export, snoozable', async ({ page }) => {
  await startDemo(page);
  const banner = page.getByRole('region', { name: 'Нагадування про резервну копію' });
  await expect(banner).toBeVisible();
  await Promise.all([page.waitForEvent('download'), banner.getByRole('button', { name: 'Зберегти копію' }).click()]);
  await expect(banner).toBeHidden();

  await page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem('workout_meta')!);
    meta.lastBackupAt = new Date(Date.now() - 20 * 864e5).toISOString();
    localStorage.setItem('workout_meta', JSON.stringify(meta));
  });
  await page.reload();
  await expect(banner).toContainText('20 днів тому');
  await banner.getByRole('button', { name: 'Пізніше' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Привіт/ })).toBeVisible();
  await expect(banner).toBeHidden();
});

test('PWA: manifest, icons and service worker on the sub-path', async ({ page, request }) => {
  for (const path of ['manifest.webmanifest', 'favicon.ico', 'icons/icon-192.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'og-image.png'])
    expect((await request.get(path)).ok(), path).toBe(true);
  await page.goto('./');
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/workout-tracker\/$/);
});
