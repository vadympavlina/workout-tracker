import { accountPrefix, expect, FIXED_NOW, startDemo, test, trackErrors } from './helpers';
import type { Page } from '@playwright/test';

/** Yesterday's chest press, so today's hint is based on it. */
async function seedChestPress(page: Page, sets: { weight: number; reps: number; rir?: number }[]) {
  const prefix = await accountPrefix(page);
  await page.evaluate(
    ([now, prefix, sets]) => {
      const sessions = JSON.parse(localStorage.getItem(`${prefix}workout_sessions`)!);
      const start = new Date(new Date(now as string).getTime() - 86_400_000 + sessions.length * 1000).toISOString();
      sessions.push({
        id: `rir-seed-${sessions.length}`, planId: null, name: 'Seed', icon: 'dumbbell', startedAt: start, finishedAt: start, durationSec: 3600, note: '',
        exercises: [{ id: 'e1', exerciseId: 'chest-press-machine', name: 'Жим грудей у тренажері', note: '', targetRepsMin: 8, targetRepsMax: 12,
          sets: (sets as { weight: number; reps: number; rir?: number }[]).map((s, i) => ({ id: `s${i}`, done: true, ...s })) }],
      });
      localStorage.setItem(`${prefix}workout_sessions`, JSON.stringify(sessions));
      localStorage.setItem(`${prefix}workout_sync_dirty`, '1');
    },
    [FIXED_NOW.toISOString(), prefix, sets] as const,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Почати тренування' }).first().click();
  await expect(page.locator('#current-ex')).toHaveText('Жим грудей у тренажері');
}

test('reps in reserve: asked after each set, saved with the workout', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.getByRole('button', { name: 'Почати тренування' }).first().click();

  await page.getByRole('button', { name: 'Позначити підхід 1 виконаним' }).click();
  const ask1 = page.getByRole('group', { name: 'Скільки ще повторень міг би зробити, підхід 1' });
  await ask1.getByRole('button', { name: 'Ще 1' }).click();
  await expect(ask1.getByRole('button', { name: 'Ще 1' })).toHaveAttribute('aria-pressed', 'true');

  // The question moves to the next set; the first keeps a "+1" badge.
  await page.getByRole('button', { name: 'Позначити підхід 2 виконаним' }).click();
  await expect(ask1).toBeHidden();
  await page.getByRole('group', { name: 'Скільки ще повторень міг би зробити, підхід 2' }).getByRole('button', { name: 'Нуль — до відмови' }).click();
  await expect(page.getByRole('button', { name: 'Підхід 1: дії' }).locator('..')).toContainText('+1');

  await page.getByRole('button', { name: 'Завершити тренування' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Завершити' }).click();
  await expect(page).toHaveURL(/#\/summary\//);
  const prefix = await accountPrefix(page);
  const saved = await page.evaluate((prefix) => {
    const sessions = JSON.parse(localStorage.getItem(`${prefix}workout_sessions`)!);
    const last = sessions.sort((a: { startedAt: string }, b: { startedAt: string }) => b.startedAt.localeCompare(a.startedAt))[0];
    return last.exercises[0].sets.map((s: { rir?: number }) => s.rir ?? null);
  }, prefix);
  expect(saved).toEqual([1, 0]);
  noErrors();
});

test('progression hint uses reps in reserve: easy sets add weight, failure takes it off', async ({ page }) => {
  await startDemo(page);
  await seedChestPress(page, [{ weight: 60, reps: 9, rir: 4 }, { weight: 60, reps: 9, rir: 3 }]);
  await expect(page.getByRole('status').filter({ hasText: 'Час додати вагу' })).toContainText('62,5 кг × 9');
  await expect(page.getByRole('status').filter({ hasText: 'Час додати вагу' })).toContainText('запас 3+');

  await page.getByRole('button', { name: 'Скасувати тренування' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Скасувати тренування' }).click();
  await seedChestPress(page, [{ weight: 70, reps: 8, rir: 1 }, { weight: 70, reps: 6, rir: 0 }]);
  await expect(page.getByRole('status').filter({ hasText: 'Трохи легше' })).toContainText('67,5 кг × 8');
});

test('warm-up sets before a barbell exercise, with plates per side', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.goto('./#/plan');
  await page.getByRole('link', { name: /Ноги \+ Прес/ }).first().click();
  await page.getByRole('button', { name: 'Почати тренування' }).click();
  await page.getByRole('button', { name: /Румунська тяга/ }).first().click();
  await page.getByLabel('Вага, підхід 1').fill('100');

  await page.getByRole('button', { name: /Розминка/ }).click();
  const list = page.getByRole('list', { name: 'Розминкові підходи' });
  await expect(list.getByRole('listitem')).toHaveCount(4);
  await expect(list.getByRole('listitem').nth(0)).toContainText('20 кг × 10');
  await expect(list.getByRole('listitem').nth(0)).toContainText('лише гриф');
  await expect(list.getByRole('listitem').nth(3)).toContainText('80 кг × 3');
  await expect(list.getByRole('listitem').nth(3)).toContainText('25 + 5 з боку');
  for (const i of [0, 1, 2, 3]) await list.getByRole('listitem').nth(i).getByRole('button').click();
  await expect(page.getByRole('button', { name: /Розминка · готово/ })).toBeVisible();

  // Once working sets start, the warm-up gets out of the way.
  await page.getByRole('button', { name: 'Позначити підхід 1 виконаним' }).click();
  await expect(page.getByRole('button', { name: /Розминка/ })).toBeHidden();
  noErrors();
});

test('swap an exercise for one on the same muscles, filtered by equipment', async ({ page }) => {
  const noErrors = trackErrors(page);
  await startDemo(page);
  await page.getByRole('button', { name: 'Почати тренування' }).first().click();
  const first = (await page.locator('#current-ex').innerText()).trim();
  const exercisesBefore = await page.getByRole('navigation', { name: 'Вправи тренування' }).getByRole('button').count();

  await page.getByRole('button', { name: 'Замінити' }).click();
  const dialog = page.getByRole('dialog', { name: 'Замінити вправу' });
  await expect(dialog).toContainText('Ті самі мʼязи');
  await dialog.getByRole('group', { name: 'Фільтр за обладнанням' }).getByRole('button', { name: 'Гантелі' }).click();
  const options = dialog.getByRole('list', { name: 'Схожі вправи' }).getByRole('listitem');
  expect(await options.count()).toBeGreaterThan(0);
  for (const text of await options.allInnerTexts()) expect(text).toContain('Гантелі');
  const pick = (await options.first().locator('span.truncate').first().innerText()).trim();
  await options.first().getByRole('button').click();

  await expect(page.locator('#current-ex')).toHaveText(pick);
  await expect(page.getByRole('navigation', { name: 'Вправи тренування' }).getByRole('button')).toHaveCount(exercisesBefore);
  await expect(page.getByRole('navigation', { name: 'Вправи тренування' })).not.toContainText(first);

  // With a set already done, the old exercise is kept and the new one comes next.
  await page.getByRole('button', { name: 'Позначити підхід 1 виконаним' }).click();
  await page.getByRole('button', { name: 'Замінити' }).click();
  await expect(dialog).toContainText('Виконані підходи збережуться');
  await dialog.getByRole('list', { name: 'Схожі вправи' }).getByRole('button').first().click();
  await expect(page.getByRole('navigation', { name: 'Вправи тренування' }).getByRole('button')).toHaveCount(exercisesBefore + 1);
  await expect(page.getByRole('navigation', { name: 'Вправи тренування' })).toContainText(pick);
  noErrors();
});
