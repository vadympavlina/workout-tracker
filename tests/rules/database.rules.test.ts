import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { get, ref, set, update } from 'firebase/database';

// Runs against the Realtime Database emulator: `npm run test:rules`.
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'workout-tracker-91340',
    database: { host: '127.0.0.1', port: 9000, rules: readFileSync('database.rules.json', 'utf8') },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearDatabase());

const alice = () => env.authenticatedContext('alice').database();
const bob = () => env.authenticatedContext('bob').database();
const guest = () => env.unauthenticatedContext().database();

const session = { id: 's1', startedAt: '2026-10-01T10:00:00.000Z', name: 'Push', durationSec: 3600, exercises: [] };

describe('account isolation', () => {
  it('lets a user read and write only their own subtree', async () => {
    await assertSucceeds(set(ref(alice(), 'users/alice/data/sessions/s1'), session));
    await assertSucceeds(get(ref(alice(), 'users/alice')));
    await assertFails(get(ref(bob(), 'users/alice')));
    await assertFails(set(ref(bob(), 'users/alice/data/sessions/s2'), { ...session, id: 's2' }));
  });

  it('denies anonymous access and listing other users', async () => {
    await assertFails(get(ref(guest(), 'users/alice')));
    await assertFails(set(ref(guest(), 'users/alice/data/user'), { name: 'x' }));
    await assertFails(get(ref(alice(), 'users')));
    await assertFails(get(ref(alice(), '/')));
  });

  it('denies data outside users/{uid}', async () => {
    await assertFails(set(ref(alice(), 'public/x'), 1));
    await assertFails(set(ref(alice(), 'users/alice/extra'), 1));
    await assertFails(set(ref(alice(), 'users/alice/data/unknown'), { a: 1 }));
  });
});

describe('shape validation', () => {
  it('requires record keys to match their id', async () => {
    await assertFails(set(ref(alice(), 'users/alice/data/sessions/other'), session));
    await assertFails(set(ref(alice(), 'users/alice/data/sessions/s1'), { ...session, startedAt: 5 }));
    await assertSucceeds(set(ref(alice(), 'users/alice/data/bodyWeight/w1'), { id: 'w1', date: '2026-10-01', weight: 80.5 }));
    await assertFails(set(ref(alice(), 'users/alice/data/bodyWeight/w2'), { id: 'w2', date: '2026-10-01', weight: '80' }));
  });

  it('accepts a full multi-path account upload', async () => {
    await assertSucceeds(
      update(ref(alice(), 'users/alice'), {
        data: {
          user: { name: 'Alice', goal: 'muscle' },
          settings: { accent: 'lime', restTimerSec: 90 },
          plans: { p1: { id: 'p1', name: 'A' } },
          exercises: { e1: { id: 'e1', name: 'Squat' } },
          sessions: { s1: session },
        },
        active: { planId: 'p1', startedAt: '2026-10-05T10:00:00.000Z' },
      }),
    );
  });

  it('only accepts image data URLs of bounded size as media', async () => {
    await assertSucceeds(set(ref(alice(), 'users/alice/media/e1'), 'data:image/jpeg;base64,AAAA'));
    await assertFails(set(ref(alice(), 'users/alice/media/e1'), 'https://example.com/a.jpg'));
    await assertFails(set(ref(alice(), 'users/alice/media/e1'), `data:image/jpeg;base64,${'A'.repeat(400_000)}`));
    await assertFails(set(ref(alice(), 'users/alice/media/e1'), { nested: true }));
  });
});
