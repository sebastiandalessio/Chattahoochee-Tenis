// Pincel de pixel art: figuras simples dibujadas píxel a píxel, sin suavizado.
// Se usa para el cuerpo de los sprites y para los retratos grandes.

import { createImage, hexToRgb, type PixelImage } from './pixelArt';

export type Pt = [number, number];
export type Mask = (x: number, y: number) => boolean;

export class Painter {
  readonly img: PixelImage;
  /** Si hay máscara, solo se pinta donde la máscara dice que sí. */
  clip: Mask | null = null;

  constructor(w: number, h: number) {
    this.img = createImage(w, h);
  }

  get w(): number {
    return this.img.w;
  }
  get h(): number {
    return this.img.h;
  }

  set(x: number, y: number, hex: string | null): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!hex || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (this.clip && !this.clip(x, y)) return;
    const [r, g, b] = hexToRgb(hex);
    const k = (y * this.w + x) * 4;
    const d = this.img.data;
    d[k] = r;
    d[k + 1] = g;
    d[k + 2] = b;
    d[k + 3] = 255;
  }

  clear(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.img.data[(y * this.w + x) * 4 + 3] = 0;
  }

  opaque(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.img.data[(y * this.w + x) * 4 + 3] > 0;
  }

  getHex(x: number, y: number): string | null {
    if (!this.opaque(x, y)) return null;
    const k = (y * this.w + x) * 4;
    const d = this.img.data;
    return '#' + [d[k], d[k + 1], d[k + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  /** Pinta todos los píxeles (centros) que cumplen la condición, dentro de una caja. */
  fillWhere(x0: number, y0: number, x1: number, y1: number, inside: Mask, color: string | ((x: number, y: number) => string | null)): void {
    const xa = Math.max(0, Math.floor(x0));
    const ya = Math.max(0, Math.floor(y0));
    const xb = Math.min(this.w - 1, Math.ceil(x1));
    const yb = Math.min(this.h - 1, Math.ceil(y1));
    for (let y = ya; y <= yb; y++)
      for (let x = xa; x <= xb; x++) {
        if (!inside(x + 0.5, y + 0.5)) continue;
        this.set(x, y, typeof color === 'string' ? color : color(x, y));
      }
  }

  rect(x: number, y: number, w: number, h: number, color: string | ((x: number, y: number) => string | null)): void {
    this.fillWhere(x, y, x + w - 1, y + h - 1, (px, py) => px >= x && px < x + w && py >= y && py < y + h, color);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string | ((x: number, y: number) => string | null)): void {
    this.fillWhere(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, inEllipse(cx, cy, rx, ry), color);
  }

  poly(pts: Pt[], color: string | ((x: number, y: number) => string | null)): void {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    this.fillWhere(Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1, inPoly(pts), color);
  }

  /** Línea gruesa entre dos puntos (cápsula). */
  line(a: Pt, b: Pt, width: number, color: string | ((x: number, y: number) => string | null)): void {
    const r = width / 2;
    this.fillWhere(
      Math.min(a[0], b[0]) - r - 1,
      Math.min(a[1], b[1]) - r - 1,
      Math.max(a[0], b[0]) + r + 1,
      Math.max(a[1], b[1]) + r + 1,
      (x, y) => distToSeg(x, y, a, b) <= r,
      color,
    );
  }

  /** Línea fina de 1 píxel (Bresenham). */
  thin(a: Pt, b: Pt, color: string): void {
    let x0 = Math.round(a[0]);
    let y0 = Math.round(a[1]);
    const x1 = Math.round(b[0]);
    const y1 = Math.round(b[1]);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Borde de 1 píxel alrededor de todo lo opaco (afuera). */
  outline(color: string, diagonal = false): void {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.opaque(x, y)) continue;
        const n =
          this.opaque(x - 1, y) ||
          this.opaque(x + 1, y) ||
          this.opaque(x, y - 1) ||
          this.opaque(x, y + 1) ||
          (diagonal &&
            (this.opaque(x - 1, y - 1) || this.opaque(x + 1, y - 1) || this.opaque(x - 1, y + 1) || this.opaque(x + 1, y + 1)));
        if (n) add.push([x, y]);
      }
    const saved = this.clip;
    this.clip = null;
    for (const [x, y] of add) this.set(x, y, color);
    this.clip = saved;
  }

  /** Copia una grilla de caracteres (con paleta) en (ox, oy). */
  grid(rows: string[], palette: Record<string, string | null | undefined>, ox: number, oy: number, flipX = false, rot = 0): void {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const ch = rows[j][flipX ? w - 1 - i : i];
        if (!ch || ch === '.' || ch === ' ') continue;
        const col = palette[ch];
        if (!col) continue;
        // rot: 1 = 90° horario, 3 = 90° antihorario
        const [x, y] = rot === 1 ? [h - 1 - j, i] : rot === 3 ? [j, w - 1 - i] : [i, j];
        this.set(ox + x, oy + y, col);
      }
  }

  /** Pega otra imagen encima. */
  paste(src: PixelImage, ox: number, oy: number, flipX = false): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const sx = flipX ? src.w - 1 - x : x;
        const k = (y * src.w + sx) * 4;
        if (src.data[k + 3] === 0) continue;
        const tx = ox + x;
        const ty = oy + y;
        if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
        const t = (ty * this.w + tx) * 4;
        this.img.data[t] = src.data[k];
        this.img.data[t + 1] = src.data[k + 1];
        this.img.data[t + 2] = src.data[k + 2];
        this.img.data[t + 3] = 255;
      }
  }
}

export function inEllipse(cx: number, cy: number, rx: number, ry: number): Mask {
  return (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

export function inPoly(pts: Pt[]): Mask {
  return (x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

export function distToSeg(x: number, y: number, a: Pt, b: Pt): number {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const len2 = vx * vx + vy * vy;
  let t = len2 > 0 ? ((x - a[0]) * vx + (y - a[1]) * vy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (a[0] + t * vx), y - (a[1] + t * vy));
}

/** Tramado 50% (tablero de ajedrez) para mezclar dos colores. */
export function checker(a: string, b: string): (x: number, y: number) => string {
  return (x, y) => ((x + y) % 2 === 0 ? a : b);
}

export function allOf(...masks: Mask[]): Mask {
  return (x, y) => masks.every((m) => m(x, y));
}

export function anyOf(...masks: Mask[]): Mask {
  return (x, y) => masks.some((m) => m(x, y));
}

export function not(m: Mask): Mask {
  return (x, y) => !m(x, y);
}
