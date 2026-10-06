import { expect, test, trackErrors } from './helpers';

test('start fresh with own profile', async ({ page }) => {
  const noErrors = trackErrors(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Почати' }).click();
  await page.getByRole('button', { name: 'Готово' }).click();
  await expect(page.getByText('Як до тебе звертатися?')).toBeVisible();
  await page.getByLabel('Імʼя').fill('Олена');
  await page.getByRole('textbox', { name: 'Зріст, см' }).fill('170');
  await page.getByRole('textbox', { name: 'Вага, кг' }).fill('62,5');
  await page.getByRole('button', { name: 'Сила' }).click();
  await page.getByRole('button', { name: 'Готово' }).click();
  await expect(page.getByRole('heading', { name: 'Привіт, Олена' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Подивитись демо' })).toBeHidden();
  await page.goto('./#/plan');
  await expect(page.locator('a[href*="#/workout/"]')).toHaveCount(4);
  await page.goto('./#/weight');
  await expect(page.locator('main ul li').first()).toContainText('62,5');
  noErrors();
});

test('delete all data returns to the welcome screen', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Подивитись демо' }).click();
  await page.goto('./#/profile');
  await page.getByRole('button', { name: /Видалити всі дані/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Видалити все' }).click();
  await expect(page.getByRole('button', { name: 'Подивитись демо' })).toBeVisible();
});
