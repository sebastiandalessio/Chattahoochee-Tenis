// Texturas generadas en el navegador (canvas) a partir de código: red, pelota, sombras, etc.
// (La cancha y la escenografía de cada sede están en art/venueArt.ts.)

import Phaser from 'phaser';
import { rasterize, type Palette, type PixelImage } from '../art/pixelArt';
import { COURT, netHeightAt } from '../logic/court';
import { SCREEN_W, depthOf, metersPerPixelX, project, scaleAt } from './projection';

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
}
