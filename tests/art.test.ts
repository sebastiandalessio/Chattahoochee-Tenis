import { describe, expect, it } from 'vitest';
import { ANIM_ORDER, animFrames } from '../src/art/body';
import { CHARACTER_ARTS, buildPortraits, buildSheet } from '../src/art/sheets';

describe('arte de personajes', () => {
  for (const art of Object.values(CHARACTER_ARTS)) {
    it(`${art.id}: grillas de cabeza parejas y con colores de su paleta`, () => {
      const grids = [art.heads.front, art.heads.back, art.heads.frontShout].filter((g) => !!g);
      for (const g of grids) {
        const w = g!.rows[0].length;
        for (const row of g!.rows) {
          expect(row.length, `fila "${row}"`).toBe(w);
          for (const ch of row) {
            if (ch === '.') continue;
            expect(art.palette[ch as keyof typeof art.palette], `color '${ch}' en "${row}"`).toBeTruthy();
          }
        }
        expect(g!.anchor[1]).toBeLessThan(g!.rows.length);
      }
      for (const o of art.outfits) {
        for (const acc of [o.headFront, o.headBack]) {
          if (!acc) continue;
          const w = acc.rows[0].length;
          for (const row of acc.rows) expect(row.length).toBe(w);
        }
      }
    });

    it(`${art.id}: todas las animaciones tienen entre 1 y 4 cuadros y se dibujan`, () => {
      for (const a of ANIM_ORDER) {
        const n = animFrames(art, a).length;
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(4);
      }
      const sheet = buildSheet(art, art.outfits[0], 'front');
      const opaque = sheet.data.filter((_, i) => i % 4 === 3 && sheet.data[i] > 0).length;
      expect(opaque).toBeGreaterThan(1000);
      const portraits = buildPortraits(art, art.outfits[0]);
      expect(portraits.w).toBe(96 * 3);
    });
  }

  it('Angelito es notoriamente más bajito que el resto', () => {
    const height = (id: string) => {
      const b = CHARACTER_ARTS[id].build;
      return b.thigh + b.shin + b.torso;
    };
    for (const id of ['elRosco', 'elSeba', 'trueTincho', 'volpi', 'elVikingo']) {
      expect(height(id) - height('angelito')).toBeGreaterThanOrEqual(5);
    }
  });
});
