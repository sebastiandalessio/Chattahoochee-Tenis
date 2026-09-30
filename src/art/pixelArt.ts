// Utilidades de pixel art: grillas de caracteres + paleta → píxeles RGBA.
// Es código puro (sin DOM) para poder usarlo también desde el script que genera los PNG.

export type Palette = Record<string, string | null>;

export interface PixelImage {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function createImage(w: number, h: number): PixelImage {
  return { w, h, data: new Uint8ClampedArray(w * h * 4) };
}

/** Convierte filas de caracteres en una imagen. '.' y ' ' son transparentes. */
export function rasterize(rows: string[], palette: Palette): PixelImage {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const img = createImage(w, h);
  blit(img, rows, palette, 0, 0);
  return img;
}

/** Dibuja filas de caracteres dentro de una imagen existente, en (ox, oy). */
export function blit(img: PixelImage, rows: string[], palette: Palette, ox: number, oy: number, flipX = false): void {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[flipX ? row.length - 1 - i : i];
      if (ch === '.' || ch === ' ') continue;
      const col = palette[ch];
      if (!col) continue;
      setPixel(img, ox + i, oy + j, col);
    }
  }
}

export function setPixel(img: PixelImage, x: number, y: number, hex: string, alpha = 255): void {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const [r, g, b] = hexToRgb(hex);
  const k = (y * img.w + x) * 4;
  img.data[k] = r;
  img.data[k + 1] = g;
  img.data[k + 2] = b;
  img.data[k + 3] = alpha;
}
