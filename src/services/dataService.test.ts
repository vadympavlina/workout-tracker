import { describe, expect, it } from 'vitest';
import { parseImport, parseImportMedia, SCHEMA_VERSION } from './dataService';
import { createDemoData } from '@/data/demo';

const valid = () => ({ app: 'pulse-workout-tracker', schemaVersion: SCHEMA_VERSION, exportedAt: '2026-10-05T10:00:00Z', ...createDemoData() });

describe('parseImport', () => {
  it('accepts a full export', () => {
    const data = parseImport(valid());
    expect(data.sessions.length).toBeGreaterThan(10);
    expect(data.user.name).toBe('Вадим Павліна');
  });

  it.each([
    [null, 'не містить даних'],
    [{ app: 'other' }, 'не файл експорту'],
    [{ ...valid(), schemaVersion: SCHEMA_VERSION + 1 }, 'новішою версією'],
    [{ ...valid(), sessions: 'nope' }, 'відсутні обовʼязкові'],
    [{ ...valid(), plans: [{ name: 'no id' }] }, 'некоректні записи'],
    [{ ...valid(), sessions: [{ id: 'x' }] }, 'історія'],
  ])('rejects broken files with a readable message', (raw, message) => {
    expect(() => parseImport(raw)).toThrow(message);
  });

  it('migrates settings from older versions', () => {
    const raw = valid();
    (raw.settings as unknown as Record<string, unknown>) = { accent: 'lavender', restTimerSec: 60 };
    const data = parseImport(raw);
    expect(data.settings.accent).toBe('lime');
    expect(data.settings.restTimerSec).toBe(60);
    expect(data.settings.keepAwake).toBe(true);
  });

  it('only keeps image data URLs from the media section', () => {
    expect(parseImportMedia({ media: { a: 'data:image/jpeg;base64,AAA', b: 'javascript:alert(1)', c: 42 } })).toEqual({ a: 'data:image/jpeg;base64,AAA' });
    expect(parseImportMedia({})).toEqual({});
  });
});
