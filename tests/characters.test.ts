import { describe, expect, it } from 'vitest';
import { CHARACTERS, CHARACTER_ORDER } from '../src/game/characters';

describe('fichas de los personajes', () => {
  it('están los seis', () => {
    expect(CHARACTER_ORDER).toHaveLength(6);
  });

  for (const id of CHARACTER_ORDER) {
    it(`${id}: sus stats suman 37 y van de 1 a 10`, () => {
      const values = Object.values(CHARACTERS[id].stats);
      expect(values).toHaveLength(6);
      expect(values.reduce((a, b) => a + b, 0)).toBe(37);
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(10);
      }
    });
  }
});
