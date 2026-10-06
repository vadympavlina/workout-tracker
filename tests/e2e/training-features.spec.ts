import { expect, FIXED_NOW, startDemo, test, trackErrors } from './helpers';

test('progression hint suggests the next weight and applies it', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  // Yesterday: every set of the first exercise hit the top of its 8–12 range.
  await page.evaluate((now) => {
    const sessions = JSON.parse(localStorage.getItem('workout_sessions')!);
    const start = new Date(new Date(now).getTime() - 86_400_000).toISOString();
    sessions.push({
      id: 'progression-seed', planId: null, name: 'Seed', icon: 'dumbbell', startedAt: start, finishedAt: start, durationSec: 3600, note: '',
      exercises: [{ id: 'e1', exerciseId: 'chest-press-machine', name: 'Жим грудей у тренажері', note: '', targetRepsMin: 8, targetRepsMax: 12,
        sets: [1, 2, 3].map((i) => ({ id: `s${i}`, weight: 60, reps: 12, done: true })) }],
    });
    localStorage.setItem('workout_sessions', JSON.stringify(sessions));
  }, FIXED_NOW.toISOString());
  await page.reload();

  await page.getByRole('button', { name: 'Почати тренування' }).first().click();
  await expect(page.locator('#current-ex')).toHaveText('Жим грудей у тренажері');
  const hint = page.getByRole('status').filter({ hasText: 'Час додати вагу' });
  await expect(hint).toContainText('62,5 кг × 8');
  await hint.getByRole('button', { name: 'Застосувати' }).click();
  for (const i of [1, 2, 3]) {
    await expect(page.getByLabel(`Вага, підхід ${i}`)).toHaveValue('62.5');
    await expect(page.getByLabel(`Повторення, підхід ${i}`)).toHaveValue('8');
  }
  await expect(hint).toBeHidden();
  noErrors();
});

test('per-exercise rest time drives the rest timer', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.goto('./#/plan');
  await page.getByRole('link', { name: /Груди \+ Руки/ }).first().click();
  await page.getByRole('button', { name: 'Редагувати' }).click();
  await page.getByRole('radiogroup', { name: /Відпочинок: Жим грудей у тренажері/ }).getByRole('radio', { name: '3 хв' }).click();
  await page.getByRole('button', { name: 'Зберегти' }).click();
  await expect(page.getByText(/відп\. 3:00/)).toBeVisible();

  await page.getByRole('button', { name: 'Почати тренування' }).click();
  await page.getByRole('button', { name: 'Позначити підхід 1 виконаним' }).click();
  await expect(page.getByRole('button', { name: /Відпочинок: залишилось 3:00/ })).toBeVisible();
  noErrors();
});
