// Objetos con personalidad: Betty (la lanzapelotas de Volpi), Mabel (la freidora del Vikingo),
// la minicargadora de Angelito y la obra que deja en la cancha. Dibujados con el pincel.

import { PAL } from './palette';
import { Painter } from './painter';
import type { PixelImage } from './pixelArt';

const LILAC = '#b18ad8';
const LILAC_DARK = '#7d5aa6';

/** Betty: caja con ruedas, tolva llena de pelotas, ojos con pestañas y moño rosa. */
export function drawBetty(): PixelImage {
  const p = new Painter(26, 24);
  // Ruedas
  for (const x of [6, 19]) {
    p.ellipse(x, 20, 3.5, 3.5, PAL.ink);
    p.ellipse(x, 20, 2.3, 2.3, PAL.grey2);
    p.set(x, 20, PAL.grey4);
  }
  // Cuerpo
  p.rect(3, 9, 20, 11, PAL.ink);
  p.rect(4, 10, 18, 9, LILAC);
  p.rect(4, 17, 18, 2, LILAC_DARK);
  // Cañón
  p.rect(0, 12, 4, 4, PAL.ink);
  p.rect(1, 13, 3, 2, PAL.grey3);
  // Tolva con pelotas
  p.poly(
    [
      [5, 9],
      [21, 9],
      [23, 3],
      [3, 3],
    ],
    PAL.ink,
  );
  p.poly(
    [
      [6, 8],
      [20, 8],
      [21.5, 4],
      [4.5, 4],
    ],
    PAL.grey4,
  );
  for (const [x, y] of [
    [7, 5],
    [10, 5],
    [13, 5],
    [16, 5],
    [19, 5],
    [8, 7],
    [11, 7],
    [14, 7],
    [17, 7],
  ]) {
    p.rect(x, y, 2, 2, PAL.hiVis);
  }
  // Ojos con pestañas
  for (const x of [9, 16]) {
    p.ellipse(x, 13, 2.2, 2.2, PAL.white);
    p.rect(x, 13, 1, 2, PAL.ink);
    p.set(x - 2, 10, PAL.ink);
    p.set(x - 1, 10, PAL.ink);
    p.set(x + 1, 10, PAL.ink);
    p.set(x + 2, 10, PAL.ink);
    p.set(x - 2, 11, PAL.ink);
    p.set(x + 2, 11, PAL.ink);
  }
  // Sonrisa
  p.rect(11, 17, 4, 1, PAL.ink);
  p.set(10, 16, PAL.ink);
  p.set(15, 16, PAL.ink);
  // Moño rosa
  p.poly(
    [
      [20, 2],
      [24, 0],
      [24, 5],
    ],
    PAL.pink,
  );
  p.poly(
    [
      [20, 2],
      [16, 0],
      [16, 5],
    ],
    PAL.pink,
  );
  p.rect(19, 1, 3, 3, '#d9658d');
  p.outline(PAL.ink);
  return p.img;
}

/** Mabel: freidora de aire negra con cara en el display. mood 'ding' = ojos cerrados de satisfacción. */
export function drawMabel(mood: 'normal' | 'ding' | 'celosa' = 'normal'): PixelImage {
  const p = new Painter(20, 24);
  // Cuerpo redondeado
  p.ellipse(10, 11, 9, 10, PAL.dark);
  p.rect(1, 11, 19, 10, PAL.dark);
  p.rect(3, 20, 15, 2, PAL.ink);
  // Brillo
  p.rect(3, 5, 1, 6, PAL.grey1);
  // Display verde con la cara
  p.rect(5, 5, 10, 7, PAL.ink);
  p.rect(6, 6, 8, 5, '#5fd36a');
  const face = '#1b4d24';
  if (mood === 'ding') {
    p.rect(7, 8, 2, 1, face);
    p.rect(11, 8, 2, 1, face);
    p.rect(8, 10, 4, 1, face);
  } else if (mood === 'celosa') {
    p.rect(7, 7, 2, 1, face);
    p.rect(11, 7, 2, 1, face);
    p.set(8, 8, face);
    p.set(11, 8, face);
    p.rect(8, 10, 4, 1, face);
  } else {
    p.set(8, 8, face);
    p.set(11, 8, face);
    p.rect(8, 10, 4, 1, face);
    p.set(7, 9, face);
    p.set(12, 9, face);
  }
  // Canasto con manija
  p.rect(4, 14, 12, 6, PAL.grey1);
  p.rect(6, 16, 8, 2, PAL.grey2);
  p.rect(8, 16, 4, 1, PAL.silver);
  // Patitas
  p.rect(3, 22, 2, 2, PAL.ink);
  p.rect(15, 22, 2, 2, PAL.ink);
  p.outline(PAL.ink);
  return p.img;
}

/** Minicargadora amarilla genérica (sin marca), mirando a la derecha. */
export function drawLoader(): PixelImage {
  const p = new Painter(40, 28);
  // Ruedas
  for (const x of [11, 25]) {
    p.ellipse(x, 22, 5, 5, PAL.ink);
    p.ellipse(x, 22, 3.5, 3.5, PAL.dark);
    p.ellipse(x, 22, 1.5, 1.5, PAL.grey3);
  }
  // Chasis
  p.rect(5, 13, 26, 8, PAL.ink);
  p.rect(6, 14, 24, 6, PAL.yellow);
  p.rect(6, 18, 24, 2, PAL.yellowDark);
  // Cabina con jaula
  p.rect(9, 2, 15, 12, PAL.ink);
  p.rect(10, 3, 13, 10, '#9fc6e0');
  p.rect(10, 3, 13, 2, PAL.yellow);
  p.rect(16, 3, 2, 10, PAL.dark);
  // Brazos de la pala
  p.line([22, 8], [33, 14], 3, PAL.ink);
  p.line([22, 8], [33, 14], 1.5, PAL.yellowDark);
  // Pala
  p.poly(
    [
      [31, 9],
      [39, 11],
      [39, 23],
      [32, 23],
      [30, 19],
    ],
    PAL.ink,
  );
  p.poly(
    [
      [32, 11],
      [38, 12.5],
      [38, 22],
      [33, 22],
      [31, 19],
    ],
    PAL.grey3,
  );
  p.rect(33, 21, 5, 1, PAL.silver);
  // Faro y caño de escape
  p.rect(28, 13, 2, 2, PAL.white);
  p.rect(6, 7, 2, 6, PAL.ink);
  p.outline(PAL.ink);
  return p.img;
}

export function drawCone(): PixelImage {
  const p = new Painter(8, 11);
  p.poly(
    [
      [4, 0],
      [7, 9],
      [1, 9],
    ],
    PAL.orange,
  );
  p.rect(2, 5, 4, 2, PAL.white);
  p.rect(0, 9, 8, 2, PAL.orange);
  p.outline(PAL.ink);
  return p.img;
}

/** Bache visto en perspectiva (se estira en x). */
export function drawPothole(): PixelImage {
  const p = new Painter(26, 10);
  p.ellipse(13, 5, 12, 4, '#3a3530');
  p.ellipse(13, 5.5, 9, 2.8, '#221e1a');
  p.ellipse(10, 4, 3, 1, '#524a42');
  for (const [x, y] of [
    [2, 4],
    [24, 6],
    [6, 8],
    [20, 1],
  ])
    p.set(x, y, '#524a42');
  return p.img;
}

/** Cartel de obra (el texto lo pone la escena con la fuente). */
export function drawSign(): PixelImage {
  const p = new Painter(46, 20);
  p.rect(22, 10, 2, 10, PAL.woodDark);
  p.rect(0, 0, 46, 11, PAL.ink);
  p.rect(1, 1, 44, 9, PAL.yellow);
  for (let x = -10; x < 46; x += 6) p.line([x, 10], [x + 4, 1], 1.5, PAL.dark);
  p.rect(3, 3, 40, 5, PAL.yellow);
  return p.img;
}

/** Pelota frita: dorada y crujiente. */
export function drawFriedBall(): PixelImage {
  const p = new Painter(6, 6);
  p.ellipse(3, 3, 2.8, 2.8, '#c9851e');
  p.ellipse(2.6, 2.6, 1.6, 1.6, PAL.gold);
  p.set(2, 2, '#fff3c0');
  p.set(4, 4, '#8a5410');
  p.outline(PAL.ink);
  return p.img;
}
