import { expect, type Page } from '@playwright/test';

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
