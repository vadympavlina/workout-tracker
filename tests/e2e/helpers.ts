import { expect, test as base, type Page } from '@playwright/test';

/**
 * Demo data is generated relative to "today", and the dashboard depends on the
 * weekday. Pin the browser clock to a Monday (a training day in the demo plan)
 * so every test sees the same data whatever day CI runs on.
 */
export const FIXED_NOW = new Date('2026-10-05T12:00:00');

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await use(page);
  },
});
export { expect };

/** Fails the test on any uncaught error or console error. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return () => expect(errors, 'browser errors').toEqual([]);
}

/** Fresh browser profile → welcome screen → demo data → dashboard. */
export async function startDemo(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Подивитись демо' }).click();
  await expect(page.getByRole('heading', { name: /Привіт, Вадим/ })).toBeVisible();
}

export const storageCount = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open('pulse-media');
        req.onsuccess = () => {
          const count = req.result.transaction('photos').objectStore('photos').count();
          count.onsuccess = () => resolve(count.result);
        };
      }),
  );
