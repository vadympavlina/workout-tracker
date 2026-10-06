import { expect, startDemo, test, trackErrors } from './helpers';

test('plan → workout → record → finish → journal → progress', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);

  // Create a plan with two exercises, reorder with arrows.
  await page.getByRole('link', { name: 'План' }).first().click();
  await page.getByRole('link', { name: 'Створити' }).click();
  await page.getByLabel('Назва').fill('Тест Спина');
  await page.getByRole('button', { name: 'Середа' }).click();
  for (const [query, row] of [['верхнього', /^Тяга верхнього блоку Спина/], ['Прес', /^Прес Прес/]] as const) {
    await page.getByRole('button', { name: 'Додати вправу' }).click();
    await page.getByPlaceholder('Пошук вправи').fill(query);
    await page.getByRole('dialog').getByRole('button', { name: row }).click();
  }
  await page.getByRole('button', { name: 'Вище' }).nth(1).click();
  await page.getByRole('button', { name: 'Зберегти' }).click();
  await expect(page.getByRole('heading', { name: 'Тест Спина' })).toBeVisible();

  // Start: previous results are prefilled.
  await page.getByRole('button', { name: 'Почати тренування' }).click();
  await expect(page).toHaveURL(/#\/active/);
  await expect(page.locator('#current-ex')).toHaveText('Прес');
  await page.getByRole('button', { name: 'Наступна вправа' }).click();
  await expect(page.getByLabel('Вага, підхід 1')).not.toHaveValue('');

  // A heavier set triggers a personal record.
  await page.getByLabel('Вага, підхід 1').fill('200');
  await page.getByRole('button', { name: 'Позначити підхід 1 виконаним' }).click();
  await expect(page.getByText('Новий рекорд!')).toBeVisible();
  await page.getByRole('button', { name: 'Позначити підхід 2 виконаним' }).click();
  await page.getByRole('button', { name: 'Позначити підхід 3 виконаним' }).click();

  // State survives a reload mid-workout.
  await page.reload();
  await expect(page.getByRole('button', { name: /Підхід 1 виконано/ })).toBeVisible();

  await page.getByRole('button', { name: 'Завершити тренування' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Завершити' }).click();
  await expect(page.getByText('Чудова робота!')).toBeVisible();
  await expect(page.locator('#new-records + ul li')).toHaveCount(1);

  await page.getByRole('link', { name: 'Деталі в журналі' }).click();
  await expect(page.getByRole('heading', { name: 'Тест Спина' })).toBeVisible();
  await page.goto('./#/history');
  await expect(page.locator('section[aria-label="Тренування"] li').first()).toContainText('Тест Спина');

  await page.goto('./#/progress');
  await expect(page.locator('section[aria-labelledby="records"]')).toContainText('200');
  noErrors();
});

test('export and re-import keep all data', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.goto('./#/profile');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Експорт даних/ }).click()]);
  const path = test.info().outputPath('backup.json');
  await download.saveAs(path);
  await page.locator('input[type=file][accept*="json"]').setInputFiles(path);
  await page.getByRole('dialog').getByRole('button', { name: 'Імпортувати' }).click();
  await expect(page.getByText('Дані імпортовано')).toBeVisible();
  noErrors();
});
