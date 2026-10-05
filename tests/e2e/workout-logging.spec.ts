import { expect, test } from '@playwright/test';
import { startDemo, trackErrors } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __wakeLocks: number }).__wakeLocks = 0;
    Object.defineProperty(Navigator.prototype, 'wakeLock', {
      configurable: true,
      get: () => ({
        request: async () => {
          (window as unknown as { __wakeLocks: number }).__wakeLocks++;
          return { release: async () => {}, addEventListener() {} };
        },
      }),
    });
  });
});

test('steppers, weight carry-over, delete with undo, rest bar, wake lock', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.getByRole('button', { name: 'Почати тренування' }).first().click();
  await expect(page).toHaveURL(/#\/active/);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __wakeLocks: number }).__wakeLocks)).toBeGreaterThan(0);

  const weight = (i: number) => page.getByLabel(`Вага, підхід ${i}`);
  await expect(weight(1)).toHaveValue('55');
  await expect(weight(2)).toHaveValue('60');
  await expect(weight(3)).toHaveValue('60');

  // +2.5 on set 1 does not touch sets that had a different weight…
  await page.getByRole('button', { name: 'Плюс 2,5 кг, підхід 1' }).click();
  await expect(weight(1)).toHaveValue('57.5');
  await expect(weight(2)).toHaveValue('60');
  // …but carries over to following sets that shared the old weight.
  await page.getByRole('button', { name: 'Плюс 2,5 кг, підхід 2' }).click();
  await expect(weight(2)).toHaveValue('62.5');
  await expect(weight(3)).toHaveValue('62.5');

  // Completing a set starts the rest timer in the bottom bar.
  await page.getByRole('button', { name: 'Позначити підхід 1 виконаним' }).click();
  const rest = page.getByRole('button', { name: /Відпочинок: залишилось/ });
  await expect(rest).toBeVisible();

  // Delete a specific set (tap its number), then undo.
  await page.getByRole('button', { name: 'Підхід 3: дії' }).click();
  await page.getByRole('button', { name: 'Видалити', exact: true }).click();
  await expect(page.getByLabel(/Вага, підхід/)).toHaveCount(2);
  await page.getByRole('button', { name: 'Повернути' }).click();
  await expect(page.getByLabel(/Вага, підхід/)).toHaveCount(3);

  await rest.click();
  await expect(rest).toBeHidden();
  noErrors();
});

test('forgotten workout does not count idle hours', async ({ page }) => {
  await startDemo(page);
  await page.getByRole('button', { name: 'Почати тренування' }).first().click();
  await page.getByRole('button', { name: 'Позначити підхід 1 виконаним' }).click();
  // Started 15 h ago, last action 40 min after the start, then left open.
  await page.evaluate(() => {
    const a = JSON.parse(localStorage.getItem('workout_active')!);
    const now = Date.now();
    a.startedAt = new Date(now - 15 * 3600e3).toISOString();
    a.lastActivityAt = now - 15 * 3600e3 + 40 * 60e3;
    a.restEndsAt = null;
    localStorage.setItem('workout_active', JSON.stringify(a));
  });
  await page.reload();
  await expect(page.getByText('Схоже, тренування не завершили вчасно')).toBeVisible();
  await page.getByRole('button', { name: 'Позначити підхід 2 виконаним' }).click();
  await expect(page.getByRole('timer', { name: 'Тривалість тренування' })).toHaveText(/^40:0\d$/);
  await page.getByRole('button', { name: 'Завершити тренування' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Завершити' }).click();
  await expect(page).toHaveURL(/#\/summary/);
  const minutes = await page.evaluate(() => {
    const sessions = JSON.parse(localStorage.getItem('workout_sessions')!) as { finishedAt: string; durationSec: number }[];
    return Math.round(sessions.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))[0].durationSec / 60);
  });
  expect(minutes).toBe(40);
});
