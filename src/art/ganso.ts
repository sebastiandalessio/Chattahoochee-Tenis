// DON GANSO: el umpire. Ganso canadiense (cabeza y cuello negros, "barbijo" blanco, cuerpo
// pardo), con moñito de juez, sentado en una silla alta de umpire. Opiniones muy firmes.

import { PAL } from './palette';
import { Painter } from './painter';
import type { PixelImage } from './pixelArt';

export type GansoFrame = 'idle' | 'blink' | 'honk' | 'sleep' | 'look';

const BODY = '#7d6b57';
const BODY_DARK = '#5c4d3e';
const BREAST = '#d2c6b0';
const NECK = '#17151b';

export function drawGanso(frame: GansoFrame): PixelImage {
  const p = new Painter(22, 24);
  // Cuerpo (sentado, mirando a la derecha: hacia la cancha).
  p.ellipse(9, 17, 8, 5.5, BODY);
  p.ellipse(8, 19, 6, 3, BODY_DARK);
  p.ellipse(12, 16.5, 4.5, 4, BREAST);
  // Plumas de la cola.
  p.poly(
    [
      [1, 14],
      [3, 17],
      [0, 18],
    ],
    NECK,
  );
  // Alas: rayitas
  p.thin([4, 15], [10, 16], BODY_DARK);
  p.thin([4, 18], [9, 19], BODY_DARK);
  if (frame === 'sleep') {
    // Cabeza escondida sobre el lomo.
    p.line([13, 13], [9, 10], 3, NECK);
    p.ellipse(8, 10, 3, 2.3, NECK);
    p.rect(7, 9, 3, 2, PAL.white);
    p.set(7, 10, PAL.ink);
  } else {
    const look = frame === 'look' ? -1 : 0;
    // Cuello largo y negro.
    p.line([14, 14], [15 + look, 5], 3, NECK);
    // Cabeza
    p.ellipse(16 + look, 4, 3.4, 2.8, NECK);
    // "Barbijo" blanco del ganso canadiense.
    p.poly(
      [
        [14 + look, 3],
        [16 + look, 3],
        [17 + look, 7],
        [14 + look, 6],
      ],
      PAL.white,
    );
    // Ojo
    if (frame !== 'blink') p.set(17 + look, 2, PAL.white);
    p.set(17 + look, 3, frame === 'blink' ? NECK : PAL.ink);
    // Pico
    if (frame === 'honk') {
      p.thin([19, 3], [22, 1], NECK);
      p.thin([19, 5], [22, 6], NECK);
      p.set(20, 4, '#b8364a');
    } else {
      p.rect(19 + look, 4, 3, 2, NECK);
    }
    // Moñito de umpire.
    p.rect(13, 11, 2, 2, PAL.red);
    p.rect(11, 10, 2, 4, PAL.red);
    p.rect(15, 10, 2, 4, PAL.red);
  }
  // Patas colgando de la silla.
  p.rect(8, 22, 1, 2, NECK);
  p.rect(11, 22, 1, 2, NECK);
  p.outline(PAL.ink);
  return p.img;
}

/** Silla alta de umpire, verde, con escalera y sombrilla blanca. */
export function drawUmpireChair(): PixelImage {
  const p = new Painter(26, 44);
  const G = '#2f6b4a';
  const GD = '#214d35';
  // Patas
  p.rect(4, 18, 3, 26, G);
  p.rect(19, 18, 3, 26, G);
  // Escalera
  for (let y = 22; y < 44; y += 4) p.rect(4, y, 18, 2, GD);
  // Asiento y apoyabrazos
  p.rect(2, 16, 22, 4, G);
  p.rect(2, 10, 3, 7, G);
  p.rect(21, 10, 3, 7, G);
  p.rect(5, 8, 16, 3, GD);
  // Sombrilla
  p.rect(12, 0, 2, 8, PAL.grey2);
  p.poly(
    [
      [13, -3],
      [25, 4],
      [1, 4],
    ],
    (x) => (Math.floor(x / 4) % 2 === 0 ? PAL.white : '#d9d4c8'),
  );
  p.outline(PAL.ink);
  return p.img;
}

/** Cabecita para el cartel de comentarios. */
export function drawGansoIcon(): PixelImage {
  const p = new Painter(14, 14);
  p.ellipse(7, 7, 5, 4.5, NECK);
  p.poly(
    [
      [4, 6],
      [8, 6],
      [9, 12],
      [4, 11],
    ],
    PAL.white,
  );
  p.set(8, 5, PAL.white);
  p.set(9, 5, PAL.ink);
  p.rect(11, 7, 3, 2, NECK);
  p.outline(PAL.ink);
  return p.img;
}
