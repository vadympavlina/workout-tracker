import { createUser, expect, login, startDemo, test, trackErrors } from './helpers';

test('login: wrong password, then success; no sign-up', async ({ page }) => {
  const user = await createUser();
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Вхід' })).toBeVisible();
  await expect(page.getByText(/Його створює адміністратор/)).toBeVisible();

  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Пароль', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Увійти' }).click();
  await expect(page.getByRole('alert')).toHaveText('Невірний email або пароль.');
  // (the rejected attempt itself logs a 400 — only track errors from here on)
  const noErrors = trackErrors(page);

  await page.getByLabel('Пароль', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Увійти' }).click();
  await expect(page.getByRole('button', { name: 'Подивитись демо' })).toBeVisible();
  // Session survives a reload.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Подивитись демо' })).toBeVisible();
  noErrors();
});

test('password reset form', async ({ page }) => {
  const user = await createUser();
  await page.goto('./');
  await page.getByRole('button', { name: 'Забули пароль?' }).click();
  await expect(page.getByRole('heading', { name: 'Відновлення пароля' })).toBeVisible();
  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('button', { name: 'Надіслати посилання' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'надіслали лист' })).toBeVisible();
  await page.getByRole('button', { name: 'До входу' }).click();
  await expect(page.getByRole('heading', { name: 'Вхід' })).toBeVisible();
});

test('data follows the account to another device; other accounts are isolated', async ({ browser }) => {
  const phone = await browser.newPage();
  await phone.clock.setFixedTime(new Date('2026-10-05T12:00:00'));
  const user = await startDemo(phone);
  await phone.goto('./#/profile');
  await expect(phone.getByTestId('sync-status')).toContainText('Усе синхронізовано');

  // Second device, same account: no onboarding, the demo data is there.
  const laptop = await browser.newPage();
  await laptop.clock.setFixedTime(new Date('2026-10-05T12:00:00'));
  await login(laptop, user);
  await expect(laptop.getByRole('heading', { name: /Привіт, Вадим/ })).toBeVisible();

  // An edit on the laptop reaches the phone when it returns to the app.
  await laptop.goto('./#/profile');
  await laptop.getByRole('button', { name: /Особисті дані/ }).click();
  await laptop.getByLabel('Імʼя').fill('Олег');
  await laptop.getByRole('dialog').getByRole('button', { name: 'Зберегти' }).click();
  await expect(laptop.getByTestId('sync-status')).toContainText('Усе синхронізовано');
  await phone.goto('./');
  await phone.reload();
  await expect(phone.getByRole('heading', { name: 'Привіт, Олег' })).toBeVisible();

  // A different account on the same browser profile starts empty.
  await phone.goto('./#/profile');
  await phone.getByRole('button', { name: /Вийти/ }).click();
  await phone.getByRole('dialog').getByRole('button', { name: 'Вийти' }).click();
  await expect(phone.getByRole('heading', { name: 'Вхід' })).toBeVisible();
  expect(await phone.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('u:')))).toEqual([]);
  await login(phone, await createUser('other'));
  await expect(phone.getByRole('button', { name: 'Подивитись демо' })).toBeVisible();

  await phone.close();
  await laptop.close();
});

test('pre-account data on the device can be moved into a new account', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('workout_meta', JSON.stringify({ schemaVersion: 1, initializedAt: new Date().toISOString() }));
    localStorage.setItem('workout_user', JSON.stringify({ name: 'Ірина', goal: 'strength', weeklyWorkoutsTarget: 3 }));
    localStorage.setItem('workout_body_weight', JSON.stringify([{ id: 'w1', date: '2026-10-01', weight: 58.4 }]));
  });
  const user = await createUser();
  await login(page, user);
  await expect(page.getByRole('heading', { name: 'Перенести дані в акаунт?' })).toBeVisible();
  await page.getByRole('button', { name: 'Перенести' }).click();
  await expect(page.getByRole('heading', { name: 'Привіт, Ірина' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('workout_user'))).toBeNull();

  // It is in the cloud: a clean device gets it after signing in.
  const other = await page.context().browser()!.newPage();
  await login(other, user);
  await other.goto('./#/weight');
  await expect(other.locator('main ul li').first()).toContainText('58,4');
  await other.close();
});

test('custom exercise photo by link', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  const url = new URL('og-image.png', page.url()).href;
  await page.goto('./#/exercises');
  await page.getByRole('button', { name: 'Власна' }).click();
  await page.getByLabel('Назва').fill('Тяга з посиланням');
  await page.getByLabel('Або посилання на фото').fill('ftp://nope');
  await page.getByRole('dialog').getByRole('button', { name: 'Зберегти' }).click();
  await expect(page.getByText('Посилання має починатися з https://')).toBeVisible();
  await page.getByLabel('Або посилання на фото').fill(url);
  await expect(page.getByAltText('Фото вправи')).toHaveAttribute('src', url);
  await page.getByRole('dialog').getByRole('button', { name: 'Зберегти' }).click();
  await page.getByRole('link', { name: /Тяга з посиланням/ }).click();
  await expect(page.locator('img[alt^="Техніка"]').first()).toHaveAttribute('src', url);
  noErrors();
});
