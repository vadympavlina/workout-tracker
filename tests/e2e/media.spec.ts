import { readdirSync } from 'node:fs';
import { expect, startDemo, storageCount, test, trackErrors } from './helpers';

// Every bundled exercise photo folder must be served on the Pages sub-path.
const BUILT_IN = readdirSync('public/exercises');

test('every built-in exercise photo is deployed', async ({ request }) => {
  expect(BUILT_IN.length).toBeGreaterThanOrEqual(160);
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

test('library: 160 exercises, filter by muscle group and equipment', async ({ page }) => {
  await startDemo(page);
  await page.goto('./#/exercises');
  await expect(page.getByText('160 у бібліотеці')).toBeVisible();
  await page.getByRole('group', { name: 'Фільтр' }).getByRole('button', { name: 'Спина' }).click();
  await page.getByRole('group', { name: 'Фільтр за обладнанням' }).getByRole('button', { name: 'Тренажер' }).click();
  await expect(page.getByRole('link', { name: /Т-тяга з упором у груди/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Тяга штанги в нахилі/ })).toHaveCount(0);
  await page.getByRole('link', { name: /Т-тяга з упором у груди/ }).click();
  const photo = page.locator('img[alt^="Техніка"]').first();
  await expect.poll(() => photo.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
});

test('kettlebell filter shows the new kettlebell exercises', async ({ page }) => {
  await startDemo(page);
  await page.goto('./#/exercises');
  await page.getByRole('group', { name: 'Фільтр за обладнанням' }).getByRole('button', { name: 'Гиря' }).click();
  await expect(page.locator('main a[href*="#/exercises/"]')).toHaveCount(8);
  await expect(page.getByRole('link', { name: /Махи гирею/ })).toBeVisible();
});

test('back from an exercise keeps filters and scroll position', async ({ page }) => {
  await startDemo(page);
  await page.goto('./#/exercises');
  await page.getByRole('group', { name: 'Фільтр' }).getByRole('button', { name: 'Ноги' }).click();
  await page.getByRole('group', { name: 'Фільтр за обладнанням' }).getByRole('button', { name: 'Тренажер' }).click();
  const rows = page.locator('main a[href*="#/exercises/"]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(5);

  const target = rows.nth(count - 1);
  await target.scrollIntoViewIfNeeded();
  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled).toBeGreaterThan(100);
  const name = (await target.locator('span.truncate').first().innerText()).trim();

  await target.click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY), 'a new screen opens at the top').toBeLessThan(5);

  await page.goBack();
  await expect(page.getByRole('group', { name: 'Фільтр' }).getByRole('button', { name: 'Ноги' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Фільтр за обладнанням' }).getByRole('button', { name: 'Тренажер' })).toHaveAttribute('aria-pressed', 'true');
  await expect(rows).toHaveCount(count);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled - 40);
});

test('exercise picker: back from details keeps the list position', async ({ page }) => {
  await startDemo(page);
  await page.goto('./#/plan/new');
  await page.getByRole('button', { name: 'Додати вправу' }).click();
  const list = page.getByRole('dialog', { name: 'Додати вправу' });
  const info = list.getByRole('button', { name: /^Деталі:/ });
  await info.nth(25).scrollIntoViewIfNeeded();
  const body = list.locator('.overflow-y-auto');
  const before = await body.evaluate((el) => el.scrollTop);
  expect(before).toBeGreaterThan(200);
  await info.nth(25).click();
  await page.getByRole('dialog').getByRole('button', { name: 'До списку' }).click();
  await expect(list).toBeVisible();
  expect(Math.abs((await list.locator('.overflow-y-auto').evaluate((el) => el.scrollTop)) - before)).toBeLessThan(5);
});
