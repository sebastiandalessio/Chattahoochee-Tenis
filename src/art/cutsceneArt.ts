// Utilería de las escenas (torre, Boss y finales): la copa, las latas de pelotas, el kayak largo,
// el drakkar, la camilla del quiropráctico, el estadio de Angelito... Todo con el pincel.

import { PAL } from './palette';
import { Painter } from './painter';
import type { PixelImage } from './pixelArt';
import { SCN } from './props';
import { hash2 } from './portraitKit';

const GOLD = PAL.gold;
const GOLD_DARK = '#b8892a';
const GOLD_LIGHT = '#fbe58a';

/** La copa del campeón de los Chattahoochees. 18×24. */
export function drawTrophy(): PixelImage {
  const p = new Painter(18, 24);
  // Asas
  p.ellipse(3, 7, 3, 4, GOLD_DARK);
  p.ellipse(14, 7, 3, 4, GOLD_DARK);
  // Copa
  p.poly(
    [
      [3, 1],
      [14, 1],
      [12, 11],
      [5, 11],
    ],
    GOLD,
  );
  p.rect(3, 1, 12, 2, GOLD_LIGHT);
  p.rect(5, 3, 2, 7, GOLD_LIGHT);
  p.rect(11, 3, 2, 7, GOLD_DARK);
  // Pie
  p.rect(7, 11, 4, 5, GOLD_DARK);
  p.rect(5, 16, 8, 3, GOLD);
  p.rect(4, 19, 10, 4, PAL.woodDark);
  p.rect(6, 20, 6, 2, GOLD_LIGHT);
  p.outline(PAL.ink);
  // Agujero de las asas (después del contorno, para que se vea el fondo).
  for (const [x, y] of [
    [2, 6],
    [2, 7],
    [3, 6],
    [3, 7],
    [2, 8],
  ])
    p.clear(x, y);
  for (const [x, y] of [
    [14, 6],
    [14, 7],
    [15, 6],
    [15, 7],
    [15, 8],
  ])
    p.clear(x, y);
  return p.img;
}

/** Lata de pelotas (las vidas del Boss). llena = con tapa y pelotas; vacía = abollada. 10×16. */
export function drawCan(full: boolean): PixelImage {
  const p = new Painter(10, 16);
  if (full) {
    p.rect(1, 3, 8, 12, '#d8dde6');
    p.rect(1, 6, 8, 5, PAL.red);
    p.rect(2, 7, 6, 1, SCN.white);
    p.rect(1, 1, 8, 2, '#f0f0f0');
    p.ellipse(5, 1, 3, 1.2, '#dcf53c');
    p.rect(2, 3, 1, 12, '#ffffff');
  } else {
    p.poly(
      [
        [1, 5],
        [8, 3],
        [9, 15],
        [2, 15],
      ],
      '#8a8f99',
    );
    p.rect(3, 9, 5, 2, '#6c6f78');
  }
  p.outline(PAL.ink);
  return p.img;
}

/** El kayak largo en el que llegan los cinco al Boss. 150×16. */
export function drawLongKayak(): PixelImage {
  const p = new Painter(150, 16);
  p.ellipse(75, 9, 73, 5, '#e2862f');
  p.ellipse(75, 7, 70, 2, '#f3a64f');
  for (let i = 0; i < 5; i++) p.ellipse(23 + i * 26, 8, 6, 1.6, PAL.dark);
  p.rect(20, 11, 110, 1, '#b8641f');
  p.outline(PAL.ink);
  return p.img;
}

/** Drakkar vikingo con vela a rayas y cabeza de dragón. 84×56. */
export function drawDrakkar(): PixelImage {
  const p = new Painter(84, 56);
  // Casco
  p.poly(
    [
      [6, 38],
      [78, 38],
      [70, 50],
      [14, 50],
    ],
    PAL.wood,
  );
  p.rect(10, 38, 64, 2, PAL.woodDark);
  p.rect(14, 44, 58, 1, PAL.woodDark);
  // Proa con dragón y popa enrulada
  p.line([72, 40], [80, 26], 3, PAL.wood);
  p.ellipse(80, 24, 3, 2.5, PAL.wood);
  p.set(81, 23, PAL.ink);
  p.poly(
    [
      [82, 25],
      [84, 26],
      [82, 27],
    ],
    PAL.red,
  );
  p.line([12, 40], [4, 30], 3, PAL.wood);
  p.ellipse(4, 28, 3, 3, PAL.wood);
  p.ellipse(4, 28, 1.5, 1.5, PAL.woodDark);
  // Escudos
  for (let i = 0; i < 6; i++) {
    const x = 18 + i * 10;
    p.ellipse(x, 41, 3.5, 3.5, i % 2 ? PAL.red : '#e8d9a8');
    p.set(x, 41, GOLD_DARK);
  }
  // Mástil y vela a rayas
  p.rect(41, 4, 2, 34, PAL.woodDark);
  for (let y = 6; y < 30; y++) {
    const w = 18 - Math.abs(y - 18) * 0.25;
    p.rect(42 - w, y, w * 2, 1, Math.floor((y - 6) / 4) % 2 ? PAL.red : '#f3ecd8');
  }
  p.outline(PAL.ink);
  return p.img;
}

/** Camilla del quiropráctico. 48×16. */
export function drawChiroTable(): PixelImage {
  const p = new Painter(48, 16);
  p.rect(1, 3, 46, 5, '#4d7fb5');
  p.rect(1, 3, 46, 1, '#7aa6d6');
  p.rect(38, 1, 9, 3, '#4d7fb5');
  for (const x of [5, 42]) p.rect(x, 8, 2, 8, PAL.grey3);
  p.rect(5, 13, 39, 1, PAL.grey3);
  p.outline(PAL.ink);
  return p.img;
}

/** Estadio casero de Angelito (con reflectores). 96×48. */
export function drawStadium(): PixelImage {
  const p = new Painter(96, 48);
  // Tribunas
  p.poly(
    [
      [4, 46],
      [16, 16],
      [80, 16],
      [92, 46],
    ],
    PAL.grey3,
  );
  for (let y = 20; y < 46; y += 4) p.rect(10, y, 76, 1, PAL.grey2);
  // Hinchada (puntitos de colores)
  const fans = [PAL.red, PAL.celeste, PAL.gold, SCN.white, '#2b54a8'];
  for (let y = 18; y < 36; y++)
    for (let x = 12; x < 84; x++) {
      if (!p.opaque(x, y) || y % 4 === 0) continue;
      const h = hash2(x, y);
      if (h < 0.35) p.set(x, y, fans[Math.floor(h * 1000) % fans.length]);
    }
  // Cancha y arco
  p.rect(24, 36, 48, 10, SCN.grass);
  p.rect(24, 36, 48, 1, SCN.white);
  // Reflectores
  for (const x of [8, 86]) {
    p.rect(x, 2, 2, 30, PAL.grey2);
    p.rect(x - 3, 0, 8, 4, '#fff6b0');
  }
  // Cartel
  p.rect(34, 8, 28, 6, PAL.hiVis);
  p.outline(PAL.ink);
  return p.img;
}

/** La copa convertida en maceta, con un limonero medio torcido. 26×40. */
export function drawTrophyPlant(): PixelImage {
  const p = new Painter(26, 40);
  // Tronco torcido
  p.line([13, 22], [11, 14], 2, SCN.trunk);
  p.line([11, 14], [14, 7], 2, SCN.trunk);
  // Copa del árbol
  p.ellipse(13, 8, 10, 7, SCN.oak);
  p.ellipse(10, 6, 5, 4, SCN.oakLight);
  for (const [x, y] of [
    [7, 9],
    [16, 5],
    [18, 10],
    [11, 12],
  ])
    p.ellipse(x, y, 1.5, 1.5, '#f7e04a');
  p.paste(drawTrophy(), 4, 16);
  // Tierra
  p.rect(8, 17, 10, 2, SCN.mulchDark);
  p.outline(PAL.ink);
  return p.img;
}

/** Marco de foto (para la foto oficial del campeón). */
export function drawFrame(w: number, h: number): PixelImage {
  const p = new Painter(w, h);
  p.rect(0, 0, w, h, PAL.woodDark);
  p.rect(2, 2, w - 4, h - 4, PAL.wood);
  p.rect(5, 5, w - 10, h - 10, '#9fd3f0');
  p.rect(5, h - 18, w - 10, 13, SCN.grass);
  return p.img;
}

/** Mate con bombilla. 10×12. */
export function drawMate(): PixelImage {
  const p = new Painter(10, 12);
  p.ellipse(5, 7, 4, 4.5, '#7a5230');
  p.rect(2, 3, 6, 2, '#5e3d22');
  p.ellipse(5, 3, 3, 1, '#6b9a3a');
  p.line([6, 3], [9, 0], 1, PAL.silver);
  p.outline(PAL.ink);
  return p.img;
}

/** Sello de "ELIMINADO" (lo dibuja la escena con texto; esto es el marco rojo). */
export function drawStampFrame(w: number, h: number): PixelImage {
  const p = new Painter(w, h);
  const red = '#d23c3c';
  p.rect(0, 0, w, 2, red);
  p.rect(0, h - 2, w, 2, red);
  p.rect(0, 0, 2, h, red);
  p.rect(w - 2, 0, 2, h, red);
  p.rect(3, 3, w - 6, 1, red);
  p.rect(3, h - 4, w - 6, 1, red);
  return p.img;
}
