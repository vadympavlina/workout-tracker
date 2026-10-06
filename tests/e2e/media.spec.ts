import { expect, startDemo, storageCount, test, trackErrors } from './helpers';

const BUILT_IN = [
  'leg-press', 'chest-press-machine', 'pec-deck', 'lat-pulldown', 'seated-cable-row', 'chest-supported-row', 'biceps-curl-machine',
  'triceps-extension-machine', 'leg-extension', 'leg-curl', 'calf-raise', 'crunch', 'shoulder-press-machine', 'lateral-raise',
  'incline-db-press', 'squat', 'romanian-deadlift', 'hammer-curl', 'triceps-pushdown', 'hanging-leg-raise',
];

test('every built-in exercise photo is deployed', async ({ request }) => {
  for (const id of BUILT_IN)
    for (const frame of [0, 1]) expect((await request.get(`exercises/${id}/${frame}.webp`)).ok(), `${id}/${frame}`).toBe(true);
});

test('custom exercise photo: upload, show, export, delete', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.goto('./#/exercises');
  await page.getByRole('button', { name: 'Власна' }).click();
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
