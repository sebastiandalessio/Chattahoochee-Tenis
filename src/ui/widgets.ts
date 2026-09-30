// Piezas de interfaz reutilizables: cajas, globos de diálogo, carteles, botón de pantalla completa.

import Phaser from 'phaser';
import { measure, pxText } from './pixelFont';

export const UI = {
  ink: 0x1c1a24,
  paper: 0xf6f0de,
  gold: 0xffd23f,
  red: 0xff5a4e,
  cyan: 0x6fe3ff,
  green: 0x7cf07c,
  dim: 0x9aa0b4,
  white: 0xffffff,
};

/** Caja con borde de 1 px y esquinas recortadas, estilo aventura gráfica. */
export function drawBox(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
  border: number,
  alpha = 1,
): void {
  g.fillStyle(border, alpha);
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle(fill, alpha);
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
}

/** Globo de diálogo con colita apuntando a (ax, ay). Se destruye solo. */
export class Bubble {
  private g: Phaser.GameObjects.Graphics;
  private t: Phaser.GameObjects.BitmapText;
  private scene: Phaser.Scene;
  private timer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(9500);
    this.t = pxText(scene, 0, 0, '', { color: UI.ink }).setDepth(9501);
    this.hide();
  }

  show(text: string, ax: number, ay: number, ms = 1600, above = true): void {
    const lines = text.split('\n');
    const w = Math.max(...lines.map((l) => measure(l))) + 8;
    const h = lines.length * 12 + 4;
    let x = Math.round(ax - 10);
    const y = Math.round(above ? ay - h - 6 : ay + 6);
    x = Phaser.Math.Clamp(x, 2, 640 - w - 2);
    const g = this.g;
    g.clear();
    drawBox(g, x, y, w, h, UI.paper, UI.ink);
    // Colita.
    g.fillStyle(UI.ink);
    const tx = Phaser.Math.Clamp(Math.round(ax), x + 3, x + w - 6);
    if (above) {
      g.fillRect(tx, y + h - 1, 4, 1);
      g.fillRect(tx, y + h, 3, 1);
      g.fillRect(tx, y + h + 1, 2, 1);
      g.fillRect(tx, y + h + 2, 1, 1);
      g.fillStyle(UI.paper).fillRect(tx + 1, y + h - 1, 2, 1);
      g.fillRect(tx + 1, y + h, 1, 1);
    } else {
      g.fillRect(tx, y - 3, 1, 1);
      g.fillRect(tx, y - 2, 2, 1);
      g.fillRect(tx, y - 1, 3, 1);
    }
    this.t.setText(text).setPosition(x + 4, y + 2);
    this.g.setVisible(true);
    this.t.setVisible(true);
    this.timer?.remove();
    this.timer = this.scene.time.delayedCall(ms, () => this.hide());
  }

  hide(): void {
    this.g.setVisible(false);
    this.t.setVisible(false);
  }
}

/** Cartel grande en el centro de la pantalla. */
export function banner(scene: Phaser.Scene, text: string, color: number = UI.gold, y = 150, ms = 1300): void {
  const t = pxText(scene, 320, y, text, { outline: true, color, scale: 3, align: 1 }).setOrigin(0.5).setDepth(9800);
  t.setScale(0.5);
  scene.tweens.add({ targets: t, scale: 3, duration: 180, ease: 'Back.Out' });
  scene.tweens.add({
    targets: t,
    alpha: 0,
    y: y - 10,
    delay: ms,
    duration: 300,
    onComplete: () => t.destroy(),
  });
}

/** Subtítulo de comentario (Don Ganso) abajo de todo. */
export class Commentary {
  private g: Phaser.GameObjects.Graphics;
  private t: Phaser.GameObjects.BitmapText;
  private scene: Phaser.Scene;
  private timer?: Phaser.Time.TimerEvent;
  private y: number;

  constructor(scene: Phaser.Scene, y = 330) {
    this.scene = scene;
    this.y = y;
    this.g = scene.add.graphics().setDepth(9600);
    this.t = pxText(scene, 0, 0, '', { outline: true, color: UI.white }).setDepth(9601);
    this.hide();
  }

  say(who: string, text: string, ms = 2600): void {
    const full = `${who}: ${text}`;
    const w = measure(full, true) + 10;
    const x = Math.round(320 - w / 2);
    this.g.clear();
    drawBox(this.g, x, this.y, w, 16, 0x101018, 0x101018, 0.72);
    this.t.setText(full).setPosition(x + 5, this.y + 2);
    this.g.setVisible(true);
    this.t.setVisible(true);
    this.timer?.remove();
    this.timer = this.scene.time.delayedCall(ms, () => this.hide());
  }

  hide(): void {
    this.g.setVisible(false);
    this.t.setVisible(false);
  }
}

/** Botoncito de pantalla completa (arriba a la derecha). */
export function fullscreenButton(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(9900);
  const x = 628;
  const y = 3;
  const draw = (hover: boolean) => {
    g.clear();
    g.fillStyle(hover ? UI.gold : UI.dim, 0.9);
    for (const [cx, cy, dx, dy] of [
      [x, y, 1, 1],
      [x + 9, y, -1, 1],
      [x, y + 9, 1, -1],
      [x + 9, y + 9, -1, -1],
    ]) {
      g.fillRect(Math.min(cx, cx + dx * 3), cy, 4, 1);
      g.fillRect(cx, Math.min(cy, cy + dy * 3), 1, 4);
    }
  };
  draw(false);
  g.setInteractive(new Phaser.Geom.Rectangle(x - 2, y - 2, 14, 14), Phaser.Geom.Rectangle.Contains);
  g.on('pointerover', () => draw(true));
  g.on('pointerout', () => draw(false));
  g.on('pointerdown', () => {
    if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    else scene.scale.startFullscreen();
  });
  return g;
}
