// Fondos para las escenas (llegada del Boss, festejo y finales), pintados con Graphics.
// Todo en coordenadas locales (0..w, 0..h) para poder usarlos en pantalla completa o en una viñeta.

import Phaser from 'phaser';
import { pine } from '../art/props';
import { artTexture, river, skyBands } from '../ui/screens';

export const SUNSET = [0x2a1a40, 0x4a2250, 0x7a2e52, 0xb8484a, 0xe07a44, 0xf2a650];

/** Pinos en silueta contra el cielo (se agregan al contenedor o a la escena). */
export function treeLine(scene: Phaser.Scene, add: (o: Phaser.GameObjects.GameObject) => void, y: number, w: number, tint: number, seed = 1): void {
  for (let x = -6, i = 0; x < w + 10; i++) {
    const h = 26 + ((i * 37 + seed * 13) % 5) * 6;
    const key = artTexture(scene, `pineSil_${h}`, () => pine(h, i % 3));
    add(scene.add.image(x, y, key).setOrigin(0.5, 1).setTint(tint));
    x += 12 + ((i * 17 + seed) % 4) * 4;
  }
}

/** Atardecer sobre el Chattahoochee: cielo, sol, pinos, río y orilla. */
export function riverScene(scene: Phaser.Scene, add: (o: Phaser.GameObjects.GameObject) => void, w: number, h: number, horizon: number, shore: number): void {
  const g = scene.add.graphics();
  add(g);
  skyBands(g, SUNSET, 0, horizon, w);
  g.fillStyle(0xffe08a).fillCircle(w * 0.72, horizon - 6, 22);
  g.fillStyle(0xfff3c0).fillCircle(w * 0.72, horizon - 6, 14);
  river(g, horizon, shore, 0x3a4a78, 0xf0a060, w);
  // Reflejo del sol en el agua.
  for (let y = horizon + 3; y < shore; y += 4) g.fillStyle(0xf6c070).fillRect(w * 0.72 - 14 + ((y * 5) % 9), y, 20 - ((y * 3) % 9), 1);
  // Orilla.
  g.fillStyle(0x6b5a40).fillRect(0, shore - 4, w, 8);
  g.fillStyle(0x4a6a3a).fillRect(0, shore + 4, w, h - shore - 4);
  for (let y = shore + 6; y < h; y += 3) for (let x = (y * 7) % 11; x < w; x += 11) g.fillStyle(0x587c44).fillRect(x, y, 2, 1);
  treeLine(scene, add, horizon + 2, w, 0x24162e, 3);
}

/** Cancha de día: cielo, árboles, alambrado y cemento verde con líneas. */
export function courtScene(scene: Phaser.Scene, add: (o: Phaser.GameObjects.GameObject) => void, w: number, h: number): void {
  const g = scene.add.graphics();
  add(g);
  skyBands(g, [0x6fb6e8, 0x86c4ec, 0x9fd3f0], 0, h * 0.34, w);
  treeLine(scene, add, h * 0.36, w, 0x3a6a3a, 5);
  const top = Math.round(h * 0.36);
  g.fillStyle(0x3f7f4a).fillRect(0, top, w, h - top);
  // Alambrado.
  g.fillStyle(0x2a3a30, 0.5);
  for (let x = 0; x < w; x += 4) g.fillRect(x, top - 30, 1, 30);
  for (let y = top - 30; y < top; y += 4) g.fillRect(0, y, w, 1);
  // Cancha en perspectiva.
  g.fillStyle(0x3a67a8).fillPoints(
    [
      { x: w * 0.2, y: top + 8 },
      { x: w * 0.8, y: top + 8 },
      { x: w * 0.98, y: h },
      { x: w * 0.02, y: h },
    ],
    true,
  );
  g.lineStyle(1, 0xf2f2f2);
  g.lineBetween(w * 0.2, top + 8, w * 0.8, top + 8);
  g.lineBetween(w * 0.2, top + 8, w * 0.02, h);
  g.lineBetween(w * 0.8, top + 8, w * 0.98, h);
  g.lineBetween(w * 0.5, top + 8, w * 0.5, h);
}

/** Consultorio del quiropráctico: pared, ventana, diploma y piso. */
export function clinicScene(scene: Phaser.Scene, add: (o: Phaser.GameObjects.GameObject) => void, w: number, h: number): void {
  const g = scene.add.graphics();
  add(g);
  g.fillStyle(0xd8d4c4).fillRect(0, 0, w, h);
  g.fillStyle(0xbfb9a6).fillRect(0, h * 0.62, w, 6);
  g.fillStyle(0xa9c7d8).fillRect(0, h * 0.62 + 6, w, h * 0.38);
  for (let x = 0; x < w; x += 24) g.fillStyle(0x93b3c6).fillRect(x, h * 0.62 + 6, 1, h);
  // Ventana con cielo.
  g.fillStyle(0x6a5a48).fillRect(40, 30, 110, 80);
  g.fillStyle(0x8fd0f2).fillRect(46, 36, 98, 68);
  g.fillStyle(0x6a5a48).fillRect(93, 36, 4, 68);
  // Diploma y esqueleto de columna (didáctico).
  g.fillStyle(0x6a5a48).fillRect(w - 170, 34, 64, 46);
  g.fillStyle(0xf6f0de).fillRect(w - 166, 38, 56, 38);
  for (let y = 46; y < 70; y += 6) g.fillStyle(0x9a9080).fillRect(w - 160, y, 44, 1);
  for (let y = 30; y < 120; y += 7) g.fillStyle(0xeae4d0).fillRect(w - 66, y, 12, 5);
}

/** Jardín de Angelito: cielo, cerco de madera, pasto. */
export function gardenScene(scene: Phaser.Scene, add: (o: Phaser.GameObjects.GameObject) => void, w: number, h: number): void {
  const g = scene.add.graphics();
  add(g);
  skyBands(g, [0x78bde9, 0x94cdee, 0xb3def2], 0, h * 0.5, w);
  treeLine(scene, add, h * 0.5, w, 0x4c8a3e, 9);
  const fy = Math.round(h * 0.5);
  for (let x = 0; x < w; x += 10) {
    g.fillStyle(0xb08a5a).fillRect(x, fy - 26, 8, 30);
    g.fillStyle(0x8a6a44).fillRect(x + 6, fy - 26, 2, 30);
  }
  g.fillStyle(0x5a9a45).fillRect(0, fy + 4, w, h - fy);
  for (let y = fy + 6; y < h; y += 3) for (let x = (y * 5) % 9; x < w; x += 9) g.fillStyle(0x6cae55).fillRect(x, y, 2, 1);
}

/** Rayas en diagonal con los colores de un club (fondo de "momento épico"). */
export function stripesScene(scene: Phaser.Scene, add: (o: Phaser.GameObjects.GameObject) => void, w: number, h: number, a: number, b: number): void {
  const g = scene.add.graphics();
  add(g);
  g.fillStyle(a).fillRect(0, 0, w, h);
  for (let x = -h; x < w; x += 40) {
    g.fillStyle(b).fillPoints(
      [
        { x, y: h },
        { x: x + 20, y: h },
        { x: x + 20 + h, y: 0 },
        { x: x + h, y: 0 },
      ],
      true,
    );
  }
}
