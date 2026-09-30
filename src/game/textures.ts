// Texturas generadas en el navegador (canvas) a partir de código: cancha, red, pelota, etc.

import Phaser from 'phaser';
import { rasterize, type Palette, type PixelImage } from '../art/pixelArt';
import { COURT, netHeightAt } from '../logic/court';
import { SCREEN_H, SCREEN_W, depthOf, metersPerPixelX, project, scaleAt, unproject } from './projection';

export function imageToCanvas(img: PixelImage): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.w;
  c.height = img.h;
  const ctx = c.getContext('2d')!;
  const id = ctx.createImageData(img.w, img.h);
  id.data.set(img.data);
  ctx.putImageData(id, 0, 0);
  return c;
}

export function addCanvasTexture(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const t = scene.textures.addCanvas(key, canvas);
  t?.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function addPixelTexture(scene: Phaser.Scene, key: string, rows: string[], palette: Palette): void {
  addCanvasTexture(scene, key, imageToCanvas(rasterize(rows, palette)));
}

export interface CourtTheme {
  /** Fondo fuera de la zona de juego. */
  bg: [number, number, number];
  /** Zona de juego alrededor de las líneas. */
  outer: [number, number, number];
  /** Adentro de las líneas. */
  inner: [number, number, number];
  lines: [number, number, number];
  /** Intensidad del ruido de textura (0..1). */
  noise: number;
}

export const GREY_THEME: CourtTheme = {
  bg: [46, 48, 58],
  outer: [92, 98, 112],
  inner: [120, 128, 144],
  lines: [236, 238, 244],
  noise: 0.04,
};

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Dibuja la cancha completa (piso + líneas) en un canvas del tamaño de la pantalla. */
export function drawCourtCanvas(theme: CourtTheme): HTMLCanvasElement {
  const W = SCREEN_W;
  const H = SCREEN_H;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const runX = 8.2;
  const runY = COURT.halfLength + 5.2;

  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const w = unproject(sx + 0.5, sy + 0.5);
      let col = theme.bg;
      if (Math.abs(w.y) <= runY && Math.abs(w.x) <= runX) col = theme.outer;
      if (Math.abs(w.y) <= COURT.halfLength && Math.abs(w.x) <= COURT.doublesHalfWidth) col = theme.inner;
      const n = (hash(sx, sy) - 0.5) * theme.noise * 255;
      const k = (sy * W + sx) * 4;
      d[k] = col[0] + n;
      d[k + 1] = col[1] + n;
      d[k + 2] = col[2] + n;
      d[k + 3] = 255;
    }
  }

  const plot = (sx: number, sy: number) => {
    const x = Math.floor(sx);
    const y = Math.floor(sy);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = (y * W + x) * 4;
    d[k] = theme.lines[0];
    d[k + 1] = theme.lines[1];
    d[k + 2] = theme.lines[2];
  };
  // Líneas "horizontales" (y constante): una fila de píxeles.
  const hLine = (yw: number, x0: number, x1: number) => {
    const a = project(x0, yw);
    const b = project(x1, yw);
    const row = Math.floor(a.sy);
    for (let sx = Math.floor(a.sx); sx <= Math.floor(b.sx); sx++) plot(sx, row);
  };
  // Líneas "verticales" (x constante): un píxel por fila.
  const vLine = (xw: number, y0: number, y1: number) => {
    const a = project(xw, y0);
    const b = project(xw, y1);
    for (let sy = Math.floor(a.sy); sy <= Math.floor(b.sy); sy++) {
      const w = unproject(0, sy + 0.5);
      plot(project(xw, w.y).sx, sy);
    }
  };
  const L = COURT.halfLength;
  const S = COURT.serviceLine;
  const sw = COURT.singlesHalfWidth;
  const dw = COURT.doublesHalfWidth;
  for (const s of [-1, 1]) {
    hLine(s * L, -dw, dw);
    hLine(s * S, -sw, sw);
    vLine(s * dw, -L, L);
    vLine(s * sw, -L, L);
  }
  vLine(0, -S, S);
  vLine(0, -L, -L + 0.25);
  vLine(0, L - 0.25, L);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** La red, dibujada píxel a píxel. Devuelve el canvas y dónde va en la pantalla. */
export function drawNetCanvas(): { canvas: HTMLCanvasElement; x: number; y: number } {
  const ground = project(0, 0).sy;
  const top = ground - scaleAt(0) * (COURT.netHeightPost + 0.12) - 1;
  const left = Math.floor(project(-COURT.netPostX - 0.2, 0).sx);
  const right = Math.ceil(project(COURT.netPostX + 0.2, 0).sx);
  const y0 = Math.floor(top);
  const y1 = Math.ceil(ground);
  const W = right - left + 1;
  const H = y1 - y0 + 1;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const put = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = (y * W + x) * 4;
    d[k] = r;
    d[k + 1] = g;
    d[k + 2] = b;
    d[k + 3] = a;
  };
  const dep = depthOf(0);
  const mpp = metersPerPixelX(dep);
  for (let sx = left; sx <= right; sx++) {
    const xw = (sx + 0.5 - SCREEN_W / 2) * mpp;
    if (Math.abs(xw) > COURT.netPostX + 0.12) continue;
    const isPost = Math.abs(Math.abs(xw) - COURT.netPostX) < mpp * 1.1;
    const h = netHeightAt(xw);
    const topPx = Math.round(ground - scaleAt(0) * h);
    if (isPost) {
      const postTop = Math.round(ground - scaleAt(0) * (COURT.netHeightPost + 0.1));
      for (let y = postTop; y <= Math.floor(ground); y++) put(sx - left, y - y0, 40, 42, 50, 255);
      continue;
    }
    if (Math.abs(xw) > COURT.netPostX) continue;
    for (let y = topPx; y <= Math.floor(ground); y++) {
      const mesh = (sx + y) % 2 === 0;
      put(sx - left, y - y0, 20, 22, 30, mesh ? 190 : 70);
    }
    // Faja blanca arriba y cinta central.
    put(sx - left, topPx - y0, 245, 245, 250, 255);
    put(sx - left, topPx + 1 - y0, 210, 210, 220, 255);
    if (Math.abs(xw) < mpp * 0.6) {
      for (let y = topPx; y <= Math.floor(ground); y++) put(sx - left, y - y0, 225, 225, 232, 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, x: left, y: y0 };
}

export function makeBasicTextures(scene: Phaser.Scene): void {
  const ballPal = { Y: '#dcf53c', W: '#fbffd8', G: '#94b51f', K: '#2b3310' };
  addPixelTexture(scene, 'ballNear', ['.KKK.', 'KWYYK', 'KYYGK', 'KYGGK', '.KKK.'], ballPal);
  addPixelTexture(scene, 'ballFar', ['.KK.', 'KWYK', 'KYGK', '.KK.'], ballPal);
  addPixelTexture(scene, 'shadow', ['.KKKK.', 'KKKKKK', '.KKKK.'], { K: '#000000' });
  addPixelTexture(scene, 'pshadow', ['..KKKKKKKK..', 'KKKKKKKKKKKK', '..KKKKKKKK..'], { K: '#000000' });
  addPixelTexture(scene, 'px', ['W'], { W: '#ffffff' });
  addPixelTexture(scene, 'spark', ['..W..', '..W..', 'WWWWW', '..W..', '..W..'], { W: '#ffffff' });
  // Don Ganso provisorio (el de verdad llega en el hito 4).
  addPixelTexture(
    scene,
    'ganso',
    [
      '......KK....',
      '.....KKKK...',
      '.....KWWKK..',
      '.....KWWKKK.',
      '......KK....',
      '......KK....',
      '......KK....',
      '.....KKK....',
      '...BBBBBB...',
      '..BBBLLLLB..',
      '.BBBBBLLLLB.',
      '.DBBBBBLLLB.',
      '..DBBBBBBB..',
      '...DDBBBB...',
      '....K..K....',
      '...KK.KK....',
    ],
    { K: '#1c1c20', W: '#f2f2f2', B: '#7a6a58', L: '#cbbfaa', D: '#3a3a3e' },
  );
  addPixelTexture(
    scene,
    'silla',
    [
      '############',
      '#..........#',
      '############',
      '.#........#.',
      '.#........#.',
      '.##########.',
      '.#........#.',
      '.#........#.',
      '.#........#.',
      '.##########.',
      '.#........#.',
      '.#........#.',
      '.#........#.',
      '.#........#.',
      '.#........#.',
      '##........##',
    ],
    { '#': '#2f6b4a' },
  );
}
