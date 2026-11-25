import { expect, startDemo, test, trackErrors } from './helpers';

test('drag to reorder and unsaved-changes guard', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.goto('./#/plan');
  await page.getByRole('link', { name: /Груди \+ Руки/ }).first().click();
  await page.getByRole('button', { name: 'Редагувати' }).click();

  const names = () => page.locator('ol li p.line-clamp-2').allTextContents();
  await expect(page.locator('ol li p.line-clamp-2')).toHaveCount(6);
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

test('exercise picker: open details before adding', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.goto('./#/plan/new');
  await page.getByRole('button', { name: 'Додати вправу' }).click();
  await page.getByPlaceholder('Пошук вправи').fill('Гак');
  await page.getByRole('button', { name: 'Деталі: Гак-присід', exact: true }).click();

  const sheet = page.getByRole('dialog', { name: 'Гак-присід', exact: true });
  await expect(sheet.getByText('Основні мʼязи')).toBeVisible();
  await expect(sheet.getByText('Квадрицепс')).toBeVisible();
  await expect(sheet.locator('img[alt^="Техніка"]').first()).toBeVisible();
  await expect(sheet.getByText(/Рекомендовано: 4 × 8–12/)).toBeVisible();

  await sheet.getByRole('button', { name: 'Додати' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main').getByText('Гак-присід', { exact: true })).toBeVisible();
  noErrors();
});

test('heavy sets: planned in the editor, tagged in the workout and the journal', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.goto('./#/plan');
  await page.getByRole('link', { name: /Груди \+ Руки/ }).first().click();
  await page.getByRole('button', { name: 'Редагувати' }).click();

  const first = page.locator('ol > li').first();
  await first.getByRole('textbox', { name: 'Підходи' }).fill('2');
  await page.keyboard.press('Tab');
  await first.getByRole('button', { name: 'Додати важкий підхід' }).click();
  const heavy = first.getByRole('group', { name: /^Важкі підходи/ });
  await expect(heavy.getByRole('textbox', { name: 'Важких підходів' })).toHaveValue('1');
  await heavy.getByRole('textbox', { name: 'Важкі: повторень від' }).fill('5');
  await page.keyboard.press('Tab');
  await heavy.getByRole('textbox', { name: 'Важкі: повторень до' }).fill('6');
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Зберегти' }).click();

  await expect(page).toHaveURL(/#\/workout\//);
  await expect(page.locator('ol li').first()).toContainText('1 важкий × 5–6 + 2 ×');
  await page.getByRole('button', { name: 'Почати тренування' }).click();

  await expect(page.getByRole('button', { name: 'Підхід 1 (важкий): дії' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Підхід 2: дії' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Підхід 3: дії' })).toBeVisible();
  await expect(page.getByText(/Ціль: 1 важкий × 5–6 \+ 2 ×/)).toBeVisible();

  await page.getByRole('button', { name: 'Позначити підхід 1 виконаним' }).click();
  await page.getByRole('button', { name: 'Завершити тренування' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Завершити' }).click();
  await page.getByRole('link', { name: /Деталі в журналі/ }).click();
  await expect(page.getByRole('list', { name: 'Підходи' }).first()).toContainText('важк');
  noErrors();
});

test('only heavy sets: regular sets can be removed and added back', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.goto('./#/plan');
  await page.getByRole('link', { name: /Груди \+ Руки/ }).first().click();
  await page.getByRole('button', { name: 'Редагувати' }).click();

  const first = page.locator('ol > li').first();
  await first.getByRole('button', { name: 'Додати важкий підхід' }).click();
  await first.getByRole('button', { name: 'Прибрати звичайні підходи' }).click();
  await expect(first.getByText('Лише важкі підходи')).toBeVisible();
  await expect(first.getByRole('radiogroup', { name: 'Коли робити важкі підходи' })).toBeHidden();
  await first.getByRole('textbox', { name: 'Важких підходів' }).fill('3');
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Зберегти' }).click();

  await expect(page.locator('ol li').first()).toContainText('3 важкі × 6–8');
  await page.getByRole('button', { name: 'Почати тренування' }).click();
  for (const n of [1, 2, 3]) await expect(page.getByRole('button', { name: `Підхід ${n} (важкий): дії` })).toBeVisible();
  await expect(page.getByRole('button', { name: /Підхід 4/ })).toHaveCount(0);
  await expect(page.getByText(/Ціль: 3 важкі × 6–8$/)).toBeVisible();
  noErrors();
});
