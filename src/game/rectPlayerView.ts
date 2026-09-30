// Jugador "en gris" del hito 1: rectángulos con una raqueta que se mueve.
// En el hito 2 se reemplaza por los sprites de cada personaje (misma interfaz).

import Phaser from 'phaser';
import type { Match, PlayerSim } from '../sim/match';
import { project } from './projection';

export interface PlayerView {
  update(p: PlayerSim, m: Match): void;
  destroy(): void;
}

interface Colors {
  torso: number;
  head: number;
  legs: number;
  hair: number;
}

const COLORS: [Colors, Colors] = [
  { torso: 0xd4d8e4, head: 0xbfc3cf, legs: 0x868a98, hair: 0x5c606c },
  { torso: 0x6e7390, head: 0xa3a8bb, legs: 0x4c5064, hair: 0x2e3140 },
];

type Key = [number, number];

// Posiciones de la cabeza de la raqueta relativas a la mano (px), por animación, en "lado derecho".
const RACKET: Record<string, { from: Key; to: Key; dur: number }> = {
  idle: { from: [3, -9], to: [3, -9], dur: 1 },
  run: { from: [4, -8], to: [4, -8], dur: 1 },
  prep: { from: [9, 1], to: [9, 1], dur: 1 },
  drive: { from: [9, 1], to: [-10, -7], dur: 0.22 },
  backhand: { from: [-18, 1], to: [2, -8], dur: 0.22 },
  volley: { from: [4, -11], to: [1, -6], dur: 0.14 },
  smash: { from: [1, -24], to: [-6, -2], dur: 0.2 },
  serve: { from: [1, -24], to: [-6, -2], dur: 0.2 },
  toss: { from: [6, -18], to: [6, -20], dur: 1 },
  whiff: { from: [9, 1], to: [-12, -8], dur: 0.18 },
  dive: { from: [10, -2], to: [10, -2], dur: 1 },
  celebrate: { from: [1, -26], to: [1, -26], dur: 1 },
  lament: { from: [2, 2], to: [2, 2], dur: 1 },
};

export class RectPlayerView implements PlayerView {
  private g: Phaser.GameObjects.Graphics;
  private shadow: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.BitmapText | null;
  private side: 0 | 1;

  constructor(scene: Phaser.Scene, side: 0 | 1, label: Phaser.GameObjects.BitmapText | null) {
    this.side = side;
    this.g = scene.add.graphics();
    this.shadow = scene.add.image(0, 0, 'pshadow').setAlpha(0.35);
    this.label = label;
  }

  update(p: PlayerSim, m: Match): void {
    const { sx: fx, sy: fy } = project(p.x, p.y);
    const sx = Math.round(fx);
    const sy = Math.round(fy);
    const c = COLORS[this.side];
    const g = this.g;
    g.clear();
    g.setDepth(sy);
    this.shadow.setPosition(sx, sy).setDepth(sy - 0.5);

    const fs = p.rightSign; // lado del drive en la pantalla
    const anim = p.anim;
    const t = p.animT;

    if (anim === 'dive') {
      // Tirado en el piso, estirado hacia donde voló.
      const dir = Math.sign(p.vx) || fs;
      const x0 = dir > 0 ? sx - 8 : sx - 12;
      g.fillStyle(c.legs).fillRect(x0 + (dir > 0 ? 0 : 14), sy - 6, 6, 5);
      g.fillStyle(c.torso).fillRect(x0 + (dir > 0 ? 5 : 3), sy - 8, 12, 7);
      g.fillStyle(c.head).fillRect(x0 + (dir > 0 ? 16 : -4), sy - 9, 7, 7);
      g.fillStyle(0xf2f2f2).fillRect(x0 + (dir > 0 ? 24 : -12), sy - 10, 5, 5);
      this.placeLabel(sx, sy - 16);
      return;
    }

    let bob = 0;
    if (anim === 'run') bob = Math.floor(t * 10) % 2;
    if (anim === 'celebrate') bob = Math.round(Math.abs(Math.sin(t * 9)) * 4);
    const low = anim === 'lament' ? 2 : anim === 'prep' ? 1 : 0;
    const base = sy - bob;

    // Piernas.
    const stride = anim === 'run' ? (Math.floor(t * 10) % 2 === 0 ? 2 : -2) : 0;
    g.fillStyle(c.legs);
    g.fillRect(sx - 5, base - 8 + Math.max(0, stride), 3, 8 - Math.max(0, stride));
    g.fillRect(sx + 2, base - 8 + Math.max(0, -stride), 3, 8 - Math.max(0, -stride));
    // Torso.
    g.fillStyle(c.torso).fillRect(sx - 6, base - 21 + low, 12, 13);
    // Cabeza.
    g.fillStyle(c.head).fillRect(sx - 4, base - 29 + low * 2, 8, 8);
    g.fillStyle(c.hair).fillRect(sx - 4, base - 29 + low * 2, 8, this.side === 0 ? 5 : 2);
    if (this.side === 1) {
      g.fillStyle(0x1b1d26);
      g.fillRect(sx - 2, base - 25 + low * 2, 1, 1);
      g.fillRect(sx + 1, base - 25 + low * 2, 1, 1);
    }
    // Sin aire: gotitas.
    if (p.air < 0.3 && Math.floor(m.time * 4) % 2 === 0) {
      g.fillStyle(0x7fc8ff).fillRect(sx + 5, base - 30, 1, 2);
      g.fillRect(sx - 6, base - 27, 1, 2);
    }

    // Raqueta.
    const k = RACKET[anim] ?? RACKET.idle;
    const u = Math.min(1, t / k.dur);
    const e = u * u * (3 - 2 * u);
    let rx = k.from[0] + (k.to[0] - k.from[0]) * e;
    let ry = k.from[1] + (k.to[1] - k.from[1]) * e;
    const handX = sx + fs * 6;
    const handY = base - 15 + low;
    rx *= fs;
    const hx = Math.round(handX + rx);
    const hy = Math.round(handY + ry);
    g.lineStyle(1, 0x2a2a30);
    g.lineBetween(handX, handY, hx, hy);
    g.fillStyle(0xf4f4f6);
    g.fillRect(hx - 2, hy - 2, 5, 5);
    g.fillStyle(0x3a4050).fillRect(hx - 1, hy - 1, 3, 3);
    // Brazo.
    g.fillStyle(c.head).fillRect(handX - 1, handY - 1, 2, 2);
    this.placeLabel(sx, base - 34);
  }

  private placeLabel(x: number, y: number): void {
    if (this.label) this.label.setPosition(Math.round(x - this.label.width / 2), y - 8).setDepth(5000);
  }

  destroy(): void {
    this.g.destroy();
    this.shadow.destroy();
    this.label?.destroy();
  }
}
