import { createUser, expect, login, startDemo, test } from './helpers';

test('a new account never sees days before it existed as missed', async ({ page }) => {
  await login(page, await createUser());
  await page.getByRole('button', { name: 'Почати' }).click();
  await page.getByRole('button', { name: 'Готово' }).click();
  await page.getByLabel('Імʼя').fill('Новачок');
  await page.getByRole('button', { name: 'Готово' }).click();
  await expect(page.getByRole('heading', { name: 'Привіт, Новачок' })).toBeVisible();
  await expect(page.getByText('Розклад на тиждень')).toBeVisible();
  await expect(page.getByText('Пропущено')).toHaveCount(0);
  await expect(page.getByRole('img', { name: /пропущено/ })).toHaveCount(0);
});

test('bodyweight sets read as reps, not "0 кг"', async ({ page }) => {
  await startDemo(page);
  await page.goto('./#/history');
  await page.locator('main a[href*="#/history/"]').first().click();
  await expect(page.getByRole('heading', { name: 'Прес' })).toBeVisible();
  // Each exercise's set chips: bodyweight ones read "17 повт." and never mention kilograms.
  const lists = await page.locator('main ul[aria-label="Підходи"]').allInnerTexts();
  const bodyweight = lists.filter((t) => t.includes('повт.'));
  expect(bodyweight.length).toBeGreaterThan(0);
  for (const t of bodyweight) expect(t).not.toContain('кг');
  await expect(page.locator('main')).not.toContainText(/Обсяг 0 кг/);
});
