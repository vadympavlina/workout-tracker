import { describe, expect, it } from 'vitest';
import { createDemoData } from '@/data/demo';
import { activeFromRemote, collectionPatch, fromRemote, toRemote } from './remoteModel';

/** Simulates what Realtime Database does to stored JSON. */
function rtdbRoundTrip(value: unknown): unknown {
  const strip = (v: unknown): unknown => {
    if (v === null || v === undefined) return undefined;
    if (Array.isArray(v)) {
      const items = v.map(strip);
      return items.every((x) => x === undefined) ? undefined : Object.fromEntries(items.map((x, i) => [i, x]).filter(([, x]) => x !== undefined));
    }
    if (typeof v === 'object') {
      const entries = Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, strip(x)] as const).filter(([, x]) => x !== undefined);
      return entries.length ? Object.fromEntries(entries) : undefined;
    }
    return v;
  };
  return strip(JSON.parse(JSON.stringify(value)));
}

describe('remote model', () => {
  it('survives a Realtime Database round trip unchanged', () => {
    const data = createDemoData(new Date('2026-10-05T12:00:00'));
    data.plans.push({ ...data.plans[0], id: 'empty-template', days: [], exercises: [], notes: '' });
    data.user.avatar = null;
    const back = fromRemote(rtdbRoundTrip(toRemote(data)))!;
    const sortById = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
    expect(back.user).toEqual(data.user);
    expect(back.settings).toEqual(data.settings);
    expect(sortById(back.plans)).toEqual(sortById(data.plans));
    expect(sortById(back.sessions)).toEqual(sortById(data.sessions));
    expect(sortById(back.bodyWeight)).toEqual(sortById(data.bodyWeight));
    expect(sortById(back.exercises)).toEqual(sortById(data.exercises));
  });

  it('treats an empty account as "no data"', () => {
    expect(fromRemote(null)).toBeNull();
    expect(fromRemote({ settings: {} })).toBeNull();
  });

  it('never sends undefined to the database', () => {
    const data = createDemoData();
    (data.plans[0].exercises[0] as { restSec?: number }).restSec = undefined;
    expect(JSON.stringify(toRemote(data))).not.toContain('undefined');
  });

  it('restores an active workout with nulls and empty arrays', () => {
    const active = {
      id: 'a1', planId: null, name: 'Free', icon: 'dumbbell', startedAt: '2026-10-05T10:00:00Z', currentIndex: 0, note: '', restEndsAt: null,
      exercises: [{ id: 'e', exerciseId: 'crunch', name: 'Прес', note: '', finished: false, sets: [{ id: 's', weight: null, reps: 15, done: false, prevWeight: null, prevReps: null }] }],
    };
    expect(activeFromRemote(rtdbRoundTrip(active))).toEqual(active);
  });
});

describe('collectionPatch', () => {
  const a = { id: 'a', v: 1 };
  const b = { id: 'b', v: 2 };
  it('writes only changed and new records, deletes removed ones', () => {
    expect(collectionPatch('plans', [a, b], [{ ...a, v: 9 }, { id: 'c', v: 3 }])).toEqual({
      'plans/a': { id: 'a', v: 9 },
      'plans/c': { id: 'c', v: 3 },
      'plans/b': null,
    });
  });
  it('is empty when nothing changed', () => {
    expect(collectionPatch('sessions', [a, b], [a, b])).toEqual({});
  });
});
