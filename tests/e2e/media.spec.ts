import { readdirSync } from 'node:fs';
import { expect, startDemo, storageCount, test, trackErrors } from './helpers';

// Every bundled exercise photo folder must be served on the Pages sub-path.
const BUILT_IN = readdirSync('public/exercises');

test('every built-in exercise photo is deployed', async ({ request }) => {
  expect(BUILT_IN.length).toBeGreaterThanOrEqual(100);
  for (const id of BUILT_IN)
    for (const frame of [0, 1]) expect((await request.get(`exercises/${id}/${frame}.webp`)).ok(), `${id}/${frame}`).toBe(true);
});

test('custom exercise photo: upload, show, export, delete', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.goto('./#/exercises');
  await page.getByRole('button', { name: 'Власна', exact: true }).click();
  await page.getByLabel('Назва').fill('Жим у Смітті');
  await page.locator('input[type=file][accept="image/*"]').setInputFiles('public/og-image.png');
  await expect(page.getByAltText('Фото вправи')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Зберегти' }).click();
  await page.getByRole('link', { name: /Жим у Смітті/ }).click();
  await expect(page.locator('img[alt^="Техніка"]')).toHaveJSProperty('complete', true);
  expect(await page.locator('img[alt^="Техніка"]').getAttribute('src')).toMatch(/^blob:/);

  await page.goto('./#/profile');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Експорт даних/ }).click()]);
  const path = test.info().outputPath('backup.json');
  await download.saveAs(path);
  const exported = JSON.parse(await (await import('node:fs/promises')).readFile(path, 'utf8'));
  expect(Object.values(exported.media ?? {})).toHaveLength(1);

  await page.goBack();
  await page.goto('./#/exercises');
  await page.getByRole('link', { name: /Жим у Смітті/ }).click();
  await page.getByRole('button', { name: 'Видалити вправу' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).click();
  await expect.poll(() => storageCount(page)).toBe(0);
  noErrors();
});

test('active workout shows the exercise photo', async ({ page }) => {
  await startDemo(page);
  await page.getByRole('button', { name: 'Почати тренування' }).first().click();
  const img = page.locator('section[aria-labelledby=current-ex] img').first();
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
});

test('library: 100 exercises, filter by muscle group and equipment', async ({ page }) => {
  await startDemo(page);
  await page.goto('./#/exercises');
  await expect(page.getByText('100 у бібліотеці')).toBeVisible();
  await page.getByRole('group', { name: 'Фільтр' }).getByRole('button', { name: 'Спина' }).click();
  await page.getByRole('group', { name: 'Фільтр за обладнанням' }).getByRole('button', { name: 'Тренажер' }).click();
  await expect(page.getByRole('link', { name: /Т-тяга з упором у груди/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Тяга штанги в нахилі/ })).toHaveCount(0);
  await page.getByRole('link', { name: /Т-тяга з упором у груди/ }).click();
  const photo = page.locator('img[alt^="Техніка"]').first();
  await expect.poll(() => photo.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
});
