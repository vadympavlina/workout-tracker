import { describe, expect, it } from 'vitest';
import { platesPerSide } from './plates';

describe('platesPerSide', () => {
  it('loads common weights exactly', () => {
    expect(platesPerSide(100)).toEqual({ perSide: [25, 15], total: 100, remainder: 0 });
    expect(platesPerSide(62.5)).toEqual({ perSide: [20, 1.25], total: 62.5, remainder: 0 });
    expect(platesPerSide(142.5, 20)).toMatchObject({ perSide: [25, 25, 10, 1.25], total: 142.5 });
  });
  it('respects the bar weight', () => {
    expect(platesPerSide(45, 15)).toMatchObject({ perSide: [15], total: 45 });
    expect(platesPerSide(20, 20)).toMatchObject({ perSide: [], total: 20, remainder: 0 });
  });
  it('reports what cannot be loaded', () => {
    expect(platesPerSide(61)).toMatchObject({ perSide: [20], total: 60, remainder: 1 });
    expect(platesPerSide(10, 20)).toMatchObject({ perSide: [], total: 20, remainder: 0 });
  });
});
