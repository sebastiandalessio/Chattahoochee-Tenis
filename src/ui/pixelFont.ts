// Arma las fuentes bitmap de Phaser a partir de los glifos definidos en código.
// 'px' = fuente simple · 'pxo' = con borde oscuro (para leer sobre cualquier fondo).

import Phaser from 'phaser';
import { CHAR_FALLBACK, FONT_METRICS, GLYPHS, type GlyphDef } from './fontGlyphs';

export const FONT = 'font-px';
export const FONT_OUTLINE = 'font-pxo';

function glyphWidth(gd: GlyphDef): number {
  return Math.max(...gd.rows.map((r) => r.length), ...(gd.top ?? []).map((r) => r.length), ...(gd.bottom ?? []).map((r) => r.length));
}

function glyphPixels(gd: GlyphDef): boolean[][] {
  const w = glyphWidth(gd);
  const H = FONT_METRICS.cellHeight;
  const grid: boolean[][] = Array.from({ length: H }, () => new Array(w).fill(false));
  const put = (rows: string[] | undefined, y0: number) => {
    rows?.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) if (r[i] === '#') grid[y0 + j][i] = true;
    });
  };
  put(gd.top, 0);
  put(gd.rows, FONT_METRICS.topRows);
  put(gd.bottom, FONT_METRICS.topRows + FONT_METRICS.mainRows);
  return grid;
}

function buildFont(scene: Phaser.Scene, key: string, outline: boolean): void {
  const chars = Object.keys(GLYPHS);
  const pad = outline ? 1 : 0;
  const H = FONT_METRICS.cellHeight + pad * 2;
  const entries = chars.map((c) => ({ c, gd: GLYPHS[c], w: glyphWidth(GLYPHS[c]) + pad * 2 }));
  // Espacio.
  entries.push({ c: ' ', gd: { rows: [] }, w: FONT_METRICS.spaceWidth });

  const atlasW = 256;
  let x = 0;
  let y = 0;
  const pos: Record<string, { x: number; y: number; w: number }> = {};
  for (const e of entries) {
    if (x + e.w + 1 > atlasW) {
      x = 0;
      y += H + 1;
    }
    pos[e.c] = { x, y, w: e.w };
    x += e.w + 1;
  }
  const atlasH = y + H + 1;
  const canvas = document.createElement('canvas');
  canvas.width = atlasW;
  canvas.height = atlasH;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(atlasW, atlasH);
  const set = (px: number, py: number, r: number, gg: number, b: number) => {
    const i = (py * atlasW + px) * 4;
    img.data[i] = r;
    img.data[i + 1] = gg;
    img.data[i + 2] = b;
    img.data[i + 3] = 255;
  };
  for (const e of entries) {
    if (e.c === ' ') continue;
    const p = pos[e.c];
    const grid = glyphPixels(e.gd);
    if (outline) {
      for (let j = 0; j < grid.length; j++)
        for (let i = 0; i < grid[j].length; i++) {
          if (!grid[j][i]) continue;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) set(p.x + pad + i + dx, p.y + pad + j + dy, 16, 12, 24);
        }
    }
    for (let j = 0; j < grid.length; j++)
      for (let i = 0; i < grid[j].length; i++) if (grid[j][i]) set(p.x + pad + i, p.y + pad + j, 255, 255, 255);
  }
  ctx.putImageData(img, 0, 0);

  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, canvas)!;
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

  // (Los tipos de Phaser no declaran xAdvance, pero el motor lo usa.)
  type CharData = Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData & { xAdvance: number };
  const data: Omit<Phaser.Types.GameObjects.BitmapText.BitmapFontData, 'chars'> & { chars: Record<number, CharData> } = {
    font: key,
    size: FONT_METRICS.cellHeight,
    lineHeight: FONT_METRICS.lineHeight,
    retroFont: true,
    chars: {},
  };
  const spacing = FONT_METRICS.letterSpacing - (outline ? pad * 2 : 0);
  for (const e of entries) {
    const p = pos[e.c];
    const code = e.c.charCodeAt(0);
    data.chars[code] = {
      x: p.x,
      y: p.y,
      width: p.w,
      height: H,
      centerX: Math.floor(p.w / 2),
      centerY: Math.floor(H / 2),
      xOffset: 0,
      yOffset: 0,
      xAdvance: e.c === ' ' ? FONT_METRICS.spaceWidth + FONT_METRICS.letterSpacing : p.w + spacing,
      data: {},
      kerning: {},
      u0: p.x / atlasW,
      v0: p.y / atlasH,
      u1: (p.x + p.w) / atlasW,
      v1: (p.y + H) / atlasH,
    };
  }
  scene.cache.bitmapFont.add(key, { data, texture: key, frame: null });
}

export function buildFonts(scene: Phaser.Scene): void {
  buildFont(scene, FONT, false);
  buildFont(scene, FONT_OUTLINE, true);
}

/** Reemplaza caracteres que la fuente no tiene. */
export function sanitize(text: string): string {
  let out = '';
  for (const ch of text) {
    if (GLYPHS[ch] || ch === ' ' || ch === '\n') out += ch;
    else if (CHAR_FALLBACK[ch]) out += CHAR_FALLBACK[ch];
    else out += ch.normalize('NFD').replace(/[̀-ͯ]/g, '') || '?';
  }
  return out;
}

/** Crea un texto pixel. Con outline = true usa la variante con borde. */
export function pxText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: { outline?: boolean; color?: number; scale?: number; align?: 0 | 1 | 2; origin?: [number, number] } = {},
): Phaser.GameObjects.BitmapText {
  const t = scene.add.bitmapText(x, y, opts.outline ? FONT_OUTLINE : FONT, sanitize(text), undefined, opts.align ?? 0);
  if (opts.color !== undefined) t.setTint(opts.color);
  if (opts.scale) t.setScale(opts.scale);
  if (opts.origin) t.setOrigin(opts.origin[0], opts.origin[1]);
  return t;
}

/** Ancho en píxeles de un texto (sin escalar). */
export function measure(text: string, outline = false): number {
  let w = 0;
  let max = 0;
  for (const ch of sanitize(text)) {
    if (ch === '\n') {
      max = Math.max(max, w);
      w = 0;
      continue;
    }
    const gd = GLYPHS[ch];
    w += (gd ? glyphWidth(gd) : FONT_METRICS.spaceWidth) + FONT_METRICS.letterSpacing;
  }
  return Math.max(max, w) + (outline ? 2 : 0);
}

/** Parte un texto en renglones que no pasen de maxW píxeles (respeta los \n que ya tenga). */
export function wrapText(text: string, maxW: number, outline = false): string {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next, outline) > maxW) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out.join('\n');
}
