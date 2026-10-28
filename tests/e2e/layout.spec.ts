import type { Page } from '@playwright/test';
import { accountPrefix, expect, offscreenElements, startDemo, test } from './helpers';

const LONG_PLAN = 'СПИНА, ЗАДНЯ ДЕЛЬТА ТА БІЦЕПС — ВАЖКИЙ ДЕНЬ';
const LONG_EXERCISE = 'Тяга верхнього блоку широким хватом до грудей з паузою';

/** Demo data with the long names real users type (all-caps plans, wordy exercises). */
async function seedLongNames(page: Page) {
  const prefix = await accountPrefix(page);
  await page.evaluate(
    ([p, plan, exercise]) => {
      const get = (k: string) => JSON.parse(localStorage.getItem(p + k)!);
      const set = (k: string, v: unknown) => localStorage.setItem(p + k, JSON.stringify(v));
      const plans = get('workout_plans');
      plans[0].name = plan;
      plans[1].name = `${plan} 2`;
      plans[1].days = [];
      set('workout_plans', plans);
      const exercises = get('workout_exercises');
      exercises.push({ ...exercises[0], id: 'custom-long', name: exercise, isCustom: true });
      set('workout_exercises', exercises);
      const sessions = get('workout_sessions');
      sessions[0].name = plan;
      sessions[0].exercises[0].name = exercise;
      set('workout_sessions', sessions);
      set('workout_user', { ...get('workout_user'), name: 'Олександра-Вікторія Костянтинівна' });
      localStorage.setItem(`${p}workout_sync_dirty`, '1');
      return { plan: plans[0].id as string, session: sessions[0].id as string };
    },
    [prefix, LONG_PLAN, LONG_EXERCISE],
  );
  await page.reload();
  return page.evaluate((p) => ({
    plan: JSON.parse(localStorage.getItem(`${p}workout_plans`)!)[0].id as string,
    session: JSON.parse(localStorage.getItem(`${p}workout_sessions`)!)[0].id as string,
  }), prefix);
}

for (const width of [360, 390, 430]) {
  test(`nothing sticks out of the screen at ${width}px (long names)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await startDemo(page);
    const ids = await seedLongNames(page);
    const routes = ['', 'plan', `workout/${ids.plan}`, `plan/${ids.plan}/edit`, 'plan/new', 'history', `history/${ids.session}`, 'progress',
      'exercises', 'exercises/custom-long', 'exercises/squat', 'profile', 'weight', 'help'];
    for (const route of routes) {
      await page.goto(`./#/${route}`);
      await page.waitForLoadState('networkidle');
      expect(await offscreenElements(page), `/${route}`).toEqual([]);
    }
    await page.goto('./#/exercises');
    await page.getByRole('button', { name: 'Власна', exact: true }).click();
    expect(await offscreenElements(page), 'new exercise form').toEqual([]);
    await page.keyboard.press('Escape');
    await page.goto('./#/');
    await page.getByRole('button', { name: 'Почати тренування' }).first().click();
    await expect(page).toHaveURL(/#\/active/);
    expect(await offscreenElements(page), '/active').toEqual([]);
  });
}

test('no backup reminder: the cloud keeps the data', async ({ page }) => {
  await startDemo(page);
  await expect(page.getByRole('heading', { name: /Привіт/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Нагадування про резервну копію' })).toHaveCount(0);
});

test('no zoom: viewport locked and every field ≥16px (iOS auto-zoom)', async ({ page }) => {
  const smallFields = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('input, textarea, select'))
        .filter((e) => e.offsetParent !== null && parseFloat(getComputedStyle(e).fontSize) < 16)
        .map((e) => e.getAttribute('aria-label') ?? e.getAttribute('placeholder') ?? e.id),
    );
  await page.goto('./');
  const viewport = await page.locator('meta[name=viewport]').getAttribute('content');
  expect(viewport).toContain('maximum-scale=1');
  expect(viewport).toContain('user-scalable=no');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction)).toBe('pan-x pan-y');
  expect(await smallFields(), 'login').toEqual([]);

  await startDemo(page);
  for (const route of ['', 'plan/new', 'history', 'exercises', 'profile', 'weight']) {
    await page.goto(`./#/${route}`);
    await page.waitForLoadState('networkidle');
    expect(await smallFields(), `/${route}`).toEqual([]);
  }
  await page.goto('./#/exercises');
  await page.getByRole('button', { name: 'Власна', exact: true }).click();
  expect(await smallFields(), 'new exercise').toEqual([]);
  await page.keyboard.press('Escape');
  await page.goto('./#/');
  await page.getByRole('button', { name: 'Почати тренування' }).first().click();
  await expect(page).toHaveURL(/#\/active/);
  expect(await smallFields(), 'active workout').toEqual([]);
});

test('no accidental selection, callouts or dragging — fields stay editable', async ({ page }) => {
  await startDemo(page);
  await page.goto('./#/exercises');
  // A double tap/click on text selects nothing; text in a field still selects.
  await page.locator('h1').first().dblclick();
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
  const search = page.getByRole('searchbox', { name: 'Пошук вправи' });
  await search.fill('жим лежачи');
  await search.selectText();
  expect(await search.evaluate((el: HTMLInputElement) => el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0))).toBe('жим лежачи');
  await search.fill('');

  const prevented = (sel: string, type: string) =>
    page.locator(sel).first().evaluate((el, type) => !el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true })), type);
  expect(await prevented('h1', 'contextmenu')).toBe(true);
  expect(await prevented('h1', 'selectstart')).toBe(true);
  expect(await prevented('main a', 'dragstart')).toBe(true);
  expect(await prevented('input[type="search"]', 'contextmenu')).toBe(false);

  // Typing and the search clear button still work.
  await page.getByRole('searchbox', { name: 'Пошук вправи' }).fill('жим');
  await page.getByRole('button', { name: 'Очистити пошук' }).click();
  await expect(page.getByRole('searchbox', { name: 'Пошук вправи' })).toHaveValue('');
});
