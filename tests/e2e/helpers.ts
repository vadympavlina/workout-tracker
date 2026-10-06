import { expect, test as base, type Page } from '@playwright/test';

/**
 * Demo data is generated relative to "today", and the dashboard depends on the
 * weekday. Pin the browser clock to a Monday (a training day in the demo plan)
 * so every test sees the same data whatever day CI runs on.
 */
export const FIXED_NOW = new Date('2026-10-05T12:00:00');

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await use(page);
  },
});
export { expect };

/** Fails the test on any uncaught error or console error. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return () => expect(errors, 'browser errors').toEqual([]);
}

// ---- Firebase emulators ------------------------------------------------------

const AUTH_EMULATOR = 'http://127.0.0.1:9099';
export const PASSWORD = 'test-password-1';

export interface TestUser {
  email: string;
  password: string;
  uid: string;
}

/**
 * Creates an account in the Auth emulator (sign-up is disabled for real users;
 * the owner creates them in the console). Each test gets its own account, so
 * tests stay independent while running in parallel.
 */
export async function createUser(prefix = 'user'): Promise<TestUser> {
  const email = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@pulse.test`;
  const res = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`Auth emulator sign-up failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { localId: string };
  return { email, password: PASSWORD, uid: body.localId };
}

/** Login screen → signed in (the caller asserts what comes next). */
export async function login(page: Page, user: TestUser) {
  await page.goto('./');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Пароль', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Увійти' }).click();
}

/** New account → login → welcome screen → demo data → dashboard. */
export async function startDemo(page: Page, user?: TestUser) {
  const account = user ?? (await createUser());
  await login(page, account);
  await page.getByRole('button', { name: 'Подивитись демо' }).click();
  await expect(page.getByRole('heading', { name: /Привіт, Вадим/ })).toBeVisible();
  return account;
}

/**
 * localStorage prefix of the signed-in account (`u:{uid}:`). Tests that edit the
 * cache directly also mark it dirty — like an edit made offline — so the app
 * uploads it instead of replacing it with the cloud copy on the next start.
 */
export async function accountPrefix(page: Page) {
  const prefix = await page.evaluate(() => Object.keys(localStorage).find((k) => /^u:[^:]+:workout_meta$/.test(k))?.replace('workout_meta', ''));
  if (!prefix) throw new Error('No signed-in account cache');
  return prefix;
}

export const storageCount = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open('pulse-media');
        req.onsuccess = () => {
          const count = req.result.transaction('photos').objectStore('photos').count();
          count.onsuccess = () => resolve(count.result);
        };
      }),
  );
