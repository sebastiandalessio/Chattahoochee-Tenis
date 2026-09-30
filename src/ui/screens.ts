// Piezas para las pantallas fuera de la cancha (selección, torre, VS, chicanas, Boss, finales):
// retratos, muñequitos animados, fondos y el paso de una pantalla a otra.

import Phaser from 'phaser';
import type { AnimName } from '../art/body';
import type { PixelImage } from '../art/pixelArt';
import { ensureCharacterTextures } from '../game/spriteTextures';
import { addCanvasTexture, imageToCanvas } from '../game/textures';
import type { CharacterId } from '../game/characters';
import { keyboard } from '../input/keyboard';
import { setMusicDuck } from '../audio/engine';

/** Textura a partir de un dibujo del pincel (una sola vez por clave). */
export function artTexture(scene: Phaser.Scene, key: string, draw: () => PixelImage): string {
  if (!scene.textures.exists(key)) addCanvasTexture(scene, key, imageToCanvas(draw()));
  return key;
}

export type Expr = 'normal' | 'win' | 'lose';

export function portrait(
  scene: Phaser.Scene,
  id: CharacterId,
  outfit: number,
  expr: Expr,
  x: number,
  y: number,
  scale = 1,
  flip = false,
): Phaser.GameObjects.Image {
  const tex = ensureCharacterTextures(scene, id, outfit);
  return scene.add.image(x, y, tex.portrait, expr).setScale(scale).setFlipX(flip);
}

export interface SheetKeys {
  front: string;
  back: string;
  frames: Record<string, number>;
}

/** Muñequito de un personaje (o de un extra) con animaciones, de frente o de espaldas. */
export class Puppet {
  readonly img: Phaser.GameObjects.Image;
  readonly tex: SheetKeys;
  private anim: AnimName = 'idle';
  private t = 0;
  private fps = 4;
  private loop = true;

  constructor(scene: Phaser.Scene, who: CharacterId | SheetKeys, outfit: number, x: number, y: number, scale = 2, view: 'front' | 'back' = 'front') {
    this.tex = typeof who === 'string' ? ensureCharacterTextures(scene, who, outfit) : who;
    this.img = scene.add.image(x, y, view === 'front' ? this.tex.front : this.tex.back, 'idle_0').setOrigin(0.5, 60 / 64).setScale(scale);
  }

  play(anim: AnimName, fps = 6, loop = true): this {
    if (this.tex.frames[anim] === undefined) anim = 'idle';
    this.anim = anim;
    this.fps = fps;
    this.loop = loop;
    this.t = 0;
    this.apply();
    return this;
  }

  setView(view: 'front' | 'back'): this {
    this.img.setTexture(view === 'front' ? this.tex.front : this.tex.back, this.frameName());
    return this;
  }

  update(dt: number): void {
    this.t += dt;
    this.apply();
  }

  private frameName(): string {
    const n = this.tex.frames[this.anim] ?? 1;
    let i = Math.floor(this.t * this.fps);
    i = this.loop ? i % n : Math.min(i, n - 1);
    return `${this.anim}_${i}`;
  }

  private apply(): void {
    this.img.setFrame(this.frameName());
  }
}

/** Fondo de cielo en franjas (atardecer, noche, mañana), pixelado. */
export function skyBands(g: Phaser.GameObjects.Graphics, colors: number[], y0: number, y1: number, w = 640): void {
  const n = colors.length;
  const h = (y1 - y0) / n;
  colors.forEach((c, i) => {
    g.fillStyle(c).fillRect(0, Math.round(y0 + i * h), w, Math.ceil(h) + 1);
    // Borde tramado entre franjas, estilo 16 bits.
    if (i < n - 1) {
      g.fillStyle(colors[i + 1]);
      const y = Math.round(y0 + (i + 1) * h) - 1;
      for (let x = (i % 2) * 2; x < w; x += 4) g.fillRect(x, y, 2, 1);
    }
  });
}

/** Río con reflejos. */
export function river(g: Phaser.GameObjects.Graphics, y0: number, y1: number, base = 0x2d5580, light = 0x5d8fc0, w = 640): void {
  g.fillStyle(base).fillRect(0, y0, w, y1 - y0);
  for (let y = y0 + 3; y < y1; y += 5) {
    for (let x = ((y * 7) % 23) - 23; x < w; x += 46) g.fillStyle(light).fillRect(x, y, 10 + ((x + y) % 7), 1);
  }
}

/** Cambio de pantalla con fundido a negro. */
export function goTo(scene: Phaser.Scene, key: string, data?: object, ms = 220): void {
  if ((scene as unknown as { __leaving?: boolean }).__leaving) return;
  (scene as unknown as { __leaving?: boolean }).__leaving = true;
  keyboard.endFrame();
  scene.cameras.main.fadeOut(ms, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    (scene as unknown as { __leaving?: boolean }).__leaving = false;
    scene.scene.start(key, data);
  });
}

/** Al entrar a una pantalla: fundido desde negro. */
export function enter(scene: Phaser.Scene, ms = 220): void {
  (scene as unknown as { __leaving?: boolean }).__leaving = false;
  scene.cameras.main.fadeIn(ms, 0, 0, 0);
  keyboard.install();
  keyboard.setPadMode('menu');
  setMusicDuck(1);
}

export const CONFIRM = ['Enter', 'Space', 'KeyZ', 'KeyF', 'KeyK'];
export const BACK = ['Escape'];
