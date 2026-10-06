import { expect, startDemo, test, trackErrors } from './helpers';

test('drag to reorder and unsaved-changes guard', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.goto('./#/plan');
  await page.getByRole('link', { name: /Груди \+ Руки/ }).first().click();
  await page.getByRole('button', { name: 'Редагувати' }).click();

  const names = () => page.locator('ol li p.truncate').allTextContents();
  await expect(page.locator('ol li p.truncate')).toHaveCount(6);
  const before = await names();
  await page.locator('#ex-heading').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 120));
  const grip = page.getByRole('button', { name: /^Перетягнути/ });
  const from = (await grip.nth(0).boundingBox())!;
  const to = (await grip.nth(2).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + ((to.y - from.y + 10) * k) / 12);
  await page.mouse.up();
  await expect.poll(names).toEqual([before[1], before[2], before[0], ...before.slice(3)]);

  // Leaving via the tab bar asks first.
  await page.getByRole('link', { name: 'Головна' }).first().click();
  await expect(page.getByText('Вийти без збереження?')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Залишитись' }).click();
  await expect(page).toHaveURL(/\/edit$/);

  await page.getByRole('button', { name: 'Зберегти' }).click();
  await expect(page).toHaveURL(/#\/workout\//);
  await expect(page.locator('ol li h3').first()).toHaveText(before[1]);
  noErrors();
});
