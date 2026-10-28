import { expect, startDemo, test, trackErrors } from './helpers';

test('week muscle map on Progress and Home: load, recovery and ranking', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await expect(page.getByRole('heading', { name: 'Мʼязи за 7 днів' })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Підходи за 7 днів:/ })).toBeVisible();
  await page.getByRole('link', { name: /Детальніше/ }).click();
  await expect(page).toHaveURL(/#\/progress/);

  const map = page.getByRole('img', { name: /^Підходи за 7 днів:/ });
  await expect(map).toBeVisible();
  // The demo has workouts this week: some muscles are coloured and ranked.
  await expect(map).not.toHaveAccessibleName('Підходи за 7 днів: немає');
  await expect(map.locator('svg path').first()).toBeAttached();
  const ranking = page.getByRole('list', { name: 'Рейтинг мʼязів' });
  await expect(ranking.getByRole('listitem')).toHaveCount(15);
  await expect(ranking.getByRole('listitem').first()).not.toContainText(/(^|\D)0 підх\./);

  await page.getByRole('tab', { name: 'Відновлення' }).click();
  await expect(page.getByRole('img', { name: /^Відновлення:/ })).toBeVisible();
  await expect(page.getByText('до 24 год').first()).toBeVisible();
  noErrors();
});

test('library: tap a muscle on the body to filter exercises', async ({ page }) => {
  await startDemo(page);
  await page.goto('./#/exercises');
  await page.getByRole('button', { name: 'Мʼяз' }).click();
  // Both arms form one shape, so its centre is the torso: tap a point on the arm.
  const biceps = page.locator('#muscle-picker').getByRole('button', { name: 'Біцепс' }).first();
  const box = (await biceps.boundingBox())!;
  await biceps.click({ position: { x: box.width * 0.06, y: box.height * 0.5 } });

  await expect(page).toHaveURL(/m=biceps/);
  await expect(page.getByRole('button', { name: 'Прибрати фільтр: Біцепс' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Фільтр', exact: true })).toHaveCount(0);
  const rows = page.locator('main a[href*="#/exercises/"]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(5);
  expect(count).toBeLessThan(284);
  // Exercises that train the muscle as the main target come before assisting ones.
  await expect(rows.first()).toContainText(/біцепс|згинання/i);

  // Keyboard works too: another muscle replaces the first one.
  await page.locator('#muscle-picker').getByRole('button', { name: 'Прес' }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/m=abs/);
  await page.getByRole('button', { name: 'Прибрати фільтр: Прес' }).click();
  await expect(page).not.toHaveURL(/m=/);
  await expect(page.getByRole('group', { name: 'Фільтр', exact: true })).toBeVisible();
  await expect(rows).toHaveCount(284);
});

test('body type setting switches the figure on muscle maps', async ({ page }) => {
  await startDemo(page);
  await page.goto('./#/exercises');
  const firstUse = page.locator('main a[href*="#/exercises/"] svg use').first();
  await expect(firstUse).toHaveAttribute('href', /pulse-body-male-/);

  await page.goto('./#/profile');
  await page.getByRole('button', { name: /Налаштування/ }).click();
  await page.getByRole('tab', { name: 'Жіноча' }).click();
  await page.keyboard.press('Escape');

  await page.goto('./#/exercises');
  await expect(firstUse).toHaveAttribute('href', /pulse-body-female-/);
  await expect(page.locator('#pulse-anatomy g[id="pulse-body-female-front"] path').first()).toBeAttached();
});
