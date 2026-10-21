import type { Page } from '@playwright/test';
import { createUser, expect, login, test, trackErrors, type TestUser } from './helpers';

/** Fresh account → own profile with a name and a first weigh-in. */
async function onboard(page: Page, user: TestUser, name: string, weight: string) {
  await login(page, user);
  await page.getByRole('button', { name: 'Почати' }).click();
  await page.getByRole('button', { name: 'Готово' }).click();
  await page.getByLabel('Імʼя').fill(name);
  await page.getByRole('textbox', { name: 'Вага, кг' }).fill(weight);
  await page.getByRole('button', { name: 'Готово' }).click();
  await expect(page.getByRole('heading', { name: `Привіт, ${name}` })).toBeVisible();
}

async function signOut(page: Page) {
  await page.goto('./#/profile');
  await expect(page.getByTestId('sync-status')).toContainText('Усе синхронізовано');
  await page.getByRole('button', { name: /Вийти/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Вийти' }).click();
  await expect(page.getByRole('heading', { name: 'Вхід' })).toBeVisible();
  // Nothing of the account stays on the device.
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('u:')))).toEqual([]);
}

async function weights(page: Page) {
  await page.goto('./#/weight');
  await expect(page.locator('main ul li').first()).toBeVisible();
  return (await page.locator('main ul li').allInnerTexts()).join(' | ');
}

test('two people take turns on one phone: each sees only their own data', async ({ page }) => {
  const noErrors = trackErrors(page);
  const anna = await createUser('anna');
  const borys = await createUser('borys');

  // Anna: profile, weigh-in and a workout left running.
  await onboard(page, anna, 'Анна', '60,4');
  await page.getByRole('button', { name: 'Почати тренування' }).first().click();
  await page.getByRole('button', { name: 'Позначити підхід 1 виконаним' }).click();
  await page.getByRole('button', { name: 'Згорнути тренування' }).click();
  await expect(page.getByRole('link', { name: /Тренування триває/ })).toBeVisible();
  await signOut(page);

  // Borys on the same phone starts from zero: no name, weight or workout of Anna's.
  await login(page, borys);
  await expect(page.getByRole('button', { name: 'Почати' })).toBeVisible();
  await expect(page.getByText('Анна')).toHaveCount(0);
  await page.getByRole('button', { name: 'Почати' }).click();
  await page.getByRole('button', { name: 'Готово' }).click();
  await page.getByLabel('Імʼя').fill('Борис');
  await page.getByRole('textbox', { name: 'Вага, кг' }).fill('90,5');
  await page.getByRole('button', { name: 'Готово' }).click();
  await expect(page.getByRole('heading', { name: 'Привіт, Борис' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Тренування триває/ })).toHaveCount(0);
  const borysWeights = await weights(page);
  expect(borysWeights).toContain('90,5');
  expect(borysWeights).not.toContain('60,4');
  await signOut(page);

  // Anna again: everything is back from the cloud, nothing of Borys's.
  await login(page, anna);
  await expect(page.getByRole('heading', { name: 'Привіт, Анна' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Тренування триває/ })).toBeVisible();
  const annaWeights = await weights(page);
  expect(annaWeights).toContain('60,4');
  expect(annaWeights).not.toContain('90,5');
  await page.goto('./#/active');
  await expect(page.getByRole('button', { name: /Підхід 1 виконано/ })).toBeVisible();
  noErrors();
});

test('an account that does not exist cannot sign in, and there is no way to register', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Вхід' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Зареєстр|Створити акаунт/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Зареєстр|Створити акаунт/ })).toHaveCount(0);
  await page.getByLabel('Email').fill(`nobody-${Date.now()}@pulse.test`);
  await page.getByLabel('Пароль', { exact: true }).fill('whatever123');
  await page.getByRole('button', { name: 'Увійти' }).click();
  await expect(page.getByRole('alert')).toHaveText('Невірний email або пароль.');
});
