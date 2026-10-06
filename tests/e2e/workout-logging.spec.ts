import { accountPrefix, expect, startDemo, test, trackErrors } from './helpers';

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
  // Demo data depends on today's date, so set known weights first. Edit top-down
  // because a change carries over to following sets that shared the old weight.
  for (const [i, kg] of [[1, '50'], [2, '60'], [3, '60']] as const) {
    await weight(i).fill(kg);
    await weight(i).blur();
  }
  await expect(weight(1)).toHaveValue('50');
  await expect(weight(2)).toHaveValue('60');
  await expect(weight(3)).toHaveValue('60');

  // +2.5 on set 1 does not touch sets that had a different weight…
  await page.getByRole('button', { name: 'Плюс 2,5 кг, підхід 1' }).click();
  await expect(weight(1)).toHaveValue('52.5');
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
  const prefix = await accountPrefix(page);
  await page.evaluate((prefix) => {
    const a = JSON.parse(localStorage.getItem(`${prefix}workout_active`)!);
    const now = Date.now();
    a.startedAt = new Date(now - 15 * 3600e3).toISOString();
    a.lastActivityAt = now - 15 * 3600e3 + 40 * 60e3;
    a.restEndsAt = null;
    localStorage.setItem(`${prefix}workout_active`, JSON.stringify(a));
  }, prefix);
  await page.reload();
  await expect(page.getByText('Схоже, тренування не завершили вчасно')).toBeVisible();
  await page.getByRole('button', { name: 'Позначити підхід 2 виконаним' }).click();
  await expect(page.getByRole('timer', { name: 'Тривалість тренування' })).toHaveText(/^40:0\d$/);
  await page.getByRole('button', { name: 'Завершити тренування' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Завершити' }).click();
  await expect(page).toHaveURL(/#\/summary/);
  const minutes = await page.evaluate((prefix) => {
    const sessions = JSON.parse(localStorage.getItem(`${prefix}workout_sessions`)!) as { finishedAt: string; durationSec: number }[];
    return Math.round(sessions.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))[0].durationSec / 60);
  }, prefix);
  expect(minutes).toBe(40);
});

/** Touch swipe: Playwright has no swipe helper, so dispatch the pointer events a finger produces. */
async function swipeLeft(page: import('@playwright/test').Page, locator: import('@playwright/test').Locator, fraction: number) {
  const box = (await locator.boundingBox())!;
  const y = box.y + box.height / 2;
  const x0 = box.x + box.width - 20;
  const opts = { pointerType: 'touch', isPrimary: true, pointerId: 7, bubbles: true };
  await locator.dispatchEvent('pointerdown', { ...opts, clientX: x0, clientY: y });
  for (let i = 1; i <= 8; i++) await locator.dispatchEvent('pointermove', { ...opts, clientX: x0 - (box.width * fraction * i) / 8, clientY: y });
  await locator.dispatchEvent('pointerup', { ...opts, clientX: x0 - box.width * fraction, clientY: y });
}

test('swipe to delete in journal, weight and plan lists, with undo', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);

  // Journal: a full swipe deletes at once; "Повернути" brings it back.
  await page.goto('./#/history');
  const rows = page.locator('main ul li a[href*="#/history/"]');
  await expect(rows.first()).toBeVisible();
  const before = await rows.count();
  await swipeLeft(page, rows.first(), 0.8);
  await expect(rows).toHaveCount(before - 1);
  await page.getByRole('button', { name: 'Повернути' }).last().click();
  await expect(rows).toHaveCount(before);

  // A half swipe only reveals the button and must not open the session.
  await swipeLeft(page, rows.first(), 0.35);
  await expect(page).toHaveURL(/#\/history$/);
  await page.getByRole('button', { name: /^Видалити тренування/ }).first().click();
  await expect(rows).toHaveCount(before - 1);

  // Weight entries.
  await page.goto('./#/weight');
  const weights = page.getByRole('region', { name: 'Записи' }).locator('li');
  await expect(weights.first()).toBeVisible();
  const w = await weights.count();
  await swipeLeft(page, weights.first().locator('span').first(), 1.5); // the date span is narrower than the row
  await expect(weights).toHaveCount(w - 1);

  // Plans.
  await page.goto('./#/plan');
  const plans = page.locator('main a[href*="#/workout/"]');
  await expect(plans.first()).toBeVisible();
  const p = await plans.count();
  await swipeLeft(page, plans.first(), 0.8);
  await expect(plans).toHaveCount(p - 1);
  await page.getByRole('button', { name: 'Повернути' }).last().click();
  await expect(plans).toHaveCount(p);
  noErrors();
});
