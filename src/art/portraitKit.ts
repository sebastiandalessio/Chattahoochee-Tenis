// Herramientas para pintar los retratos de 96×96 (cara de frente, hombros abajo).
// Cada personaje combina estas piezas con sus propias formas de pelo, barba y accesorios.

import { PAL } from './palette';
import { Painter, inEllipse, inPoly, type Mask, type Pt } from './painter';

export const P_SIZE = 96;

export interface Face {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Ancho de la mandíbula (0..1 respecto de rx). */
  jaw: number;
  /** Altura de la punta del mentón. */
  chinY: number;
  skin: string;
  shade: string;
}

export function faceMask(f: Face): Mask {
  const oval = inEllipse(f.cx, f.cy, f.rx, f.ry);
  const jaw = inPoly([
    [f.cx - f.rx, f.cy],
    [f.cx + f.rx, f.cy],
    [f.cx + f.rx * f.jaw, f.chinY - 6],
    [f.cx + f.rx * 0.35, f.chinY],
    [f.cx - f.rx * 0.35, f.chinY],
    [f.cx - f.rx * f.jaw, f.chinY - 6],
  ]);
  return (x, y) => oval(x, y) || jaw(x, y);
}

/** Hombros y remera. shirt(u, v) recibe coordenadas relativas al centro del cuello. */
export function shoulders(p: Painter, f: Face, shirt: (u: number, v: number) => string, width = 44, top = 78): void {
  const cx = f.cx;
  const pts: Pt[] = [
    [cx - width - 4, 96],
    [cx - width, top + 8],
    [cx - width + 10, top],
    [cx + width - 10, top],
    [cx + width, top + 8],
    [cx + width + 4, 96],
  ];
  p.poly(pts, (x, y) => shirt(x + 0.5 - cx, y + 0.5 - top));
}

export function neck(p: Painter, f: Face, w = 11, top?: number): void {
  const t = top ?? f.cy + f.ry * 0.5;
  p.rect(f.cx - w, t, w * 2, 86 - t, f.shade);
  p.rect(f.cx - w + 2, t, w * 2 - 5, 80 - t, f.skin);
}

export function ears(p: Painter, f: Face, y = f.cy + 2): void {
  for (const s of [-1, 1]) {
    const x = f.cx + s * (f.rx - 1);
    p.ellipse(x, y, 4.5, 7, PAL.ink);
    p.ellipse(x, y, 3.5, 6, s < 0 ? f.skin : f.shade);
    p.ellipse(x + s * 0.5, y + 1, 1.5, 3, s < 0 ? f.shade : darker(f.shade));
  }
}

/** Cara con sombra suave a la derecha y abajo (luz de arriba a la izquierda). */
export function face(p: Painter, f: Face): Mask {
  const m = faceMask(f);
  // Luz de arriba a la izquierda sobre un elipsoide: el borde de la sombra sigue la curva de la cara.
  const L = [-0.5, -0.45, 0.74];
  p.fillWhere(f.cx - f.rx - 2, f.cy - f.ry - 2, f.cx + f.rx + 2, f.chinY + 2, m, (x, y) => {
    const nx = Math.max(-1, Math.min(1, (x + 0.5 - f.cx) / f.rx));
    const ny = Math.max(-1, Math.min(1, (y + 0.5 - f.cy) / (f.chinY - f.cy + 2)));
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny * 0.7));
    const i = nx * L[0] + ny * L[1] + nz * L[2];
    return i < 0.3 ? f.shade : f.skin;
  });
  return m;
}

export type EyeKind = 'open' | 'squint' | 'closed' | 'worried' | 'wide' | 'half';

export function eye(p: Painter, kind: EyeKind, x: number, y: number, iris: string = PAL.ink, dir = 0): void {
  const ink = PAL.ink;
  if (kind === 'closed' || kind === 'squint') {
    // Arco feliz ∩
    p.rect(x - 3, y, 1, 1, ink);
    p.rect(x - 2, y - 1, 5, 1, ink);
    p.rect(x + 3, y, 1, 1, ink);
    if (kind === 'squint') p.rect(x - 1, y, 3, 1, iris);
    return;
  }
  if (kind === 'half') {
    p.rect(x - 3, y - 1, 7, 1, ink);
    p.rect(x - 2, y, 5, 2, PAL.white);
    p.rect(x - 1 + dir, y, 2, 2, iris);
    p.rect(x - 3, y + 2, 7, 1, darker(PAL.skinFairShadow));
    return;
  }
  const h = kind === 'wide' ? 4 : 3;
  p.rect(x - 3, y - 1, 7, 1, ink);
  p.rect(x - 3, y, 7, h, PAL.white);
  p.rect(x - 4, y, 1, h - 1, ink);
  p.rect(x + 4, y, 1, h - 1, ink);
  p.rect(x - 1 + dir, y, 3, h, iris);
  p.rect(x + dir, y + 1, 1, 1, PAL.ink);
  p.rect(x - 1 + dir, y, 1, 1, PAL.white);
  if (kind === 'worried') p.rect(x - 3, y + h, 7, 1, PAL.skinFairShadow);
}

export type BrowKind = 'flat' | 'up' | 'angry' | 'worried' | 'arched';

export function brow(p: Painter, kind: BrowKind, x: number, y: number, side: -1 | 1, color: string, thick = 2): void {
  // side = -1 ceja izquierda (de la pantalla), 1 derecha. "inner" es el lado hacia la nariz.
  const pts: Pt[] = [];
  for (let i = -4; i <= 4; i++) {
    const inner = i * side < 0; // mitad hacia el centro de la cara
    const t = Math.abs(i) / 4;
    let dy = 0;
    if (kind === 'arched') dy = -Math.round((1 - t * t) * 2);
    if (kind === 'up') dy = -Math.round((1 - t * t) * 2) - 1;
    if (kind === 'angry') dy = inner ? Math.round(t * 2) : -Math.round(t * 1);
    if (kind === 'worried') dy = inner ? -Math.round(t * 2) : Math.round(t * 1);
    pts.push([x + i, y + dy]);
  }
  for (const [px, py] of pts) p.rect(px, py, 1, thick, color);
}

export type MouthKind = 'grin' | 'laugh' | 'neutral' | 'frown' | 'smirk' | 'open' | 'wavy' | 'smile';

export function mouth(p: Painter, kind: MouthKind, x: number, y: number, w: number, lip: string = PAL.mouth): void {
  const ink = PAL.ink;
  if (kind === 'neutral') {
    p.rect(x - w, y, w * 2 + 1, 1, ink);
    p.rect(x - w + 2, y + 1, w * 2 - 3, 1, lip);
    return;
  }
  if (kind === 'smile') {
    for (let i = -w; i <= w; i++) {
      const t = Math.abs(i) / w;
      p.rect(x + i, y + Math.round((1 - t * t) * 2), 1, 1, ink);
    }
    return;
  }
  if (kind === 'smirk') {
    for (let i = -w; i <= w; i++) {
      const dy = i > 0 ? -Math.round((i / w) * 2) : 0;
      p.rect(x + i, y + dy, 1, 1, ink);
    }
    return;
  }
  if (kind === 'frown') {
    for (let i = -w; i <= w; i++) {
      const t = Math.abs(i) / w;
      p.rect(x + i, y + Math.round(t * t * 2), 1, 1, ink);
    }
    return;
  }
  if (kind === 'wavy') {
    for (let i = -w; i <= w; i++) p.rect(x + i, y + (Math.floor((i + w) / 2) % 2), 1, 1, ink);
    return;
  }
  // Bocas abiertas: grin (dientes arriba), laugh (bien abierta), open (sorpresa / grito)
  const h = kind === 'laugh' ? Math.round(w * 0.75) : kind === 'open' ? Math.round(w * 0.9) : Math.round(w * 0.5);
  const m = (px: number, py: number) => {
    const nx = (px - x) / (w + 0.5);
    const ny = (py - y) / (h + 0.5);
    if (kind === 'open') return nx * nx + ny * ny <= 1;
    // Media luna: plana arriba, redonda abajo
    return ny >= -0.25 && nx * nx + ny * ny <= 1;
  };
  p.fillWhere(x - w - 2, y - h - 2, x + w + 2, y + h + 2, (px, py) => {
    const inside = m(px, py);
    const near = m(px - 1, py) || m(px + 1, py) || m(px, py - 1) || m(px, py + 1);
    return !inside && near;
  }, ink);
  p.fillWhere(x - w, y - h, x + w, y + h, m, (_px, py) => {
    if (kind !== 'open' && py < y + (kind === 'laugh' ? 1 : 2)) return PAL.white;
    return py > y + h - 2 ? PAL.blush : lip;
  });
}

export function sweat(p: Painter, x: number, y: number): void {
  p.ellipse(x, y + 2, 2.5, 3, PAL.ink);
  p.poly(
    [
      [x - 1.5, y + 1],
      [x + 1.5, y + 1],
      [x, y - 4],
    ],
    PAL.ink,
  );
  p.ellipse(x, y + 2, 1.5, 2, PAL.celeste);
  p.rect(x, y - 1, 1, 2, PAL.celeste);
  p.set(x - 1, y + 1, PAL.white);
}

export function sparkle(p: Painter, x: number, y: number, color: string = PAL.gold): void {
  p.rect(x, y - 3, 1, 7, color);
  p.rect(x - 3, y, 7, 1, color);
  p.set(x, y, PAL.white);
}

/** Nariz: sombra del lado derecho del tabique, punta redonda y fosas. */
export function nose(p: Painter, f: Face, y: number, len = 8, wide = 3): void {
  const x = f.cx;
  const sh = f.shade;
  p.poly(
    [
      [x + 1, y - len],
      [x + 2, y - len],
      [x + wide + 0.5, y - 1],
      [x + 1, y - 1],
    ],
    sh,
  );
  p.ellipse(x + 0.5, y - 1.5, wide - 0.5, 2, f.skin);
  p.rect(x - wide + 1, y, wide * 2 - 1, 1, sh);
  p.set(x - wide, y - 1, sh);
  p.set(x + wide + 1, y - 1, sh);
  p.set(x - wide + 1, y, darker(sh));
  p.set(x + wide, y, darker(sh));
  p.set(x - 1, y - 3, lighter(f.skin));
}

export function lighter(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.35));
  return '#' + [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function cheeks(p: Painter, f: Face, y: number, dx: number): void {
  for (const s of [-1, 1]) {
    const x = f.cx + s * dx;
    p.ellipse(x, y, 3.5, 1.4, PAL.blush);
  }
}

/** Textura de barba: mechones verticales alternando dos tonos. */
export function beardFill(base: string, dark: string, seed = 0): (x: number, y: number) => string {
  return (x, y) => {
    const h = ((x * 7 + seed) % 5) + ((y >> 1) % 3 === 0 ? 1 : 0);
    return h === 0 || (x + y * 3 + seed) % 11 === 0 ? dark : base;
  };
}

/** Barba de pocos días: puntitos irregulares sobre la piel (sin patrón de grilla). */
export function stubbleFill(skin: string, dot: string, density = 0.38): (x: number, y: number) => string {
  return (x, y) => (hash2(x, y) < density ? dot : skin);
}

export function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x27d4eb2d;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function darker(hex: string, k = 0.78): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function newPortrait(): Painter {
  return new Painter(P_SIZE, P_SIZE);
}
