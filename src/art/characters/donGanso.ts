// DON GANSO (secreto: se desbloquea ganando la torre con los seis). El umpire baja a la cancha:
// ganso canadiense (cabeza y cuello negros, barbijo blanco, pico negro), cuerpo marrón con pechera
// clara, moño rojo y pantalón blanco de tenis. Traje alternativo: el saco de umpire.

import { PAL } from '../palette';
import type { Pose } from '../body';
import { Painter } from '../painter';
import type { CharacterArt, Outfit } from './types';

const BLACK = '#23232a';
const BLACK_HI = '#3d3d48';
const WHITE = '#f2f0e8';
const BROWN = '#8a7a66';
const BROWN_DARK = '#6e604f';
const CREAM = '#cbbfaa';
const BOW = '#c7373b';

const palette = {
  o: PAL.ink,
  h: BLACK,
  k: BLACK_HI,
  w: WHITE,
  b: '#141418',
  e: '#e8e8f0',
  m: '#c25a6a',
};

// De frente: la cabeza chiquita arriba de un cuello largo; el pico apunta a la cámara.
const front = [
  '.....oooo.....',
  '....ohhhho....',
  '...ohhhhhho...',
  '...ohkhhkho...',
  '...oehhhheo...',
  '...ohhbbhho...',
  '...owhbbhwo...',
  '...owwbbwwo...',
  '....owbbwo....',
  '....owwwwo....',
  '.....ohho.....',
  '.....ohho.....',
  '.....ohho.....',
  '.....ohho.....',
  '.....ohho.....',
];

// Graznando: el pico abierto.
const frontShout = [
  ...front.slice(0, 5),
  '...ohbbbbho...',
  '...owbmmbwo...',
  '...owbmmbwo...',
  '....obbbbo....',
  ...front.slice(9),
];

const back = [
  '.....oooo.....',
  '....ohhhho....',
  '...ohhhhhho...',
  '...ohhkhhho...',
  '...ohhhhhho...',
  '...ohhhhhho...',
  '...owhhhhwo...',
  '...owhhhhwo...',
  '....ohhhho....',
  '....ohhhho....',
  '.....ohho.....',
  '.....ohho.....',
  '.....ohho.....',
  '.....ohho.....',
  '.....ohho.....',
];

const plumas: Outfit = {
  id: 'plumas',
  shirt: (u, v, view) => {
    // Moño rojo en el cuello (solo se ve de frente).
    if (view === 'front' && v < 1.8 && Math.abs(u) < 2.2) return Math.abs(u) < 0.8 ? '#9a2528' : BOW;
    // Pechera clarita.
    if (view === 'front' && v > 3 && Math.abs(u) < 3.2) return CREAM;
    return (u + v) % 4 < 2 ? BROWN : BROWN_DARK;
  },
  sleeve: BROWN,
  shorts: WHITE,
  socks: BLACK,
  shoes: BLACK,
};

const umpire: Outfit = {
  id: 'umpire',
  shirt: (u, v, view) => {
    if (view === 'front' && v < 1.8 && Math.abs(u) < 2.2) return BOW;
    if (view === 'front' && Math.abs(u) < 1.6) return WHITE;
    return '#1f2a44';
  },
  sleeve: '#1f2a44',
  longSleeves: true,
  shorts: '#3a3a44',
  longPants: true,
  socks: BLACK,
  shoes: BLACK,
};

// La cargada: abre las alas y grazna.
const honk: Pose[] = [
  { crouch: 1, armR: [115, 135], armL: [-115, -135], racket: 150, head: 'shout' },
  { dy: -3, footR: [4, 1], footL: [-4, 1], armR: [140, 160], armL: [-140, -160], racket: 175, head: 'shout' },
  { crouch: 1, armR: [120, 140], armL: [-120, -140], racket: 160, head: 'shout' },
];

function portrait(expr: 'normal' | 'win' | 'lose', outfit: Outfit) {
  const p = new Painter(96, 96);
  // Cuerpo y hombros.
  const umpireSuit = outfit.id === 'umpire';
  p.ellipse(48, 100, 42, 26, umpireSuit ? '#1f2a44' : BROWN);
  if (umpireSuit) p.poly([[42, 78], [54, 78], [52, 96], [44, 96]], WHITE);
  else {
    p.ellipse(48, 102, 20, 18, CREAM);
    for (let x = 12; x < 86; x += 7) p.thin([x, 86], [x + 4, 90], BROWN_DARK);
  }
  // Cuello largo.
  p.rect(40, 42, 17, 40, BLACK);
  p.rect(42, 44, 3, 36, BLACK_HI);
  // Moño.
  p.poly([[48, 80], [36, 74], [36, 88]], BOW);
  p.poly([[48, 80], [60, 74], [60, 88]], BOW);
  p.ellipse(48, 81, 3, 3, '#9a2528');
  // Cabeza.
  p.ellipse(48, 30, 18, 16, BLACK);
  p.ellipse(42, 22, 6, 4, BLACK_HI);
  // Barbijo blanco de mejilla a mejilla.
  p.poly(
    [
      [31, 32],
      [36, 44],
      [48, 49],
      [60, 44],
      [65, 32],
      [60, 38],
      [48, 42],
      [36, 38],
    ],
    WHITE,
  );
  // Pico (apunta a la cámara).
  if (expr === 'win') {
    p.ellipse(48, 38, 7, 7, '#141418');
    p.ellipse(48, 39, 4, 4, '#c25a6a');
    // ¡HONK! (rayitas de grito)
    for (const [x, y, dx, dy] of [
      [26, 20, -6, -3],
      [24, 30, -7, 0],
      [70, 20, 6, -3],
      [72, 30, 7, 0],
    ])
      p.line([x, y], [x + dx, y + dy], 2, PAL.gold);
  } else {
    p.ellipse(48, 37, 6, 4, '#141418');
    p.set(46, 36, '#5a5a66');
  }
  // Ojos.
  for (const x of [38, 58]) {
    if (expr === 'lose') {
      // Dormido: ojitos cerrados.
      p.rect(x - 3, 27, 6, 1, WHITE);
    } else {
      p.ellipse(x, 27, 2.5, 2.5, '#0a0a0c');
      p.set(x - 1, 26, WHITE);
      // Ceño de umpire: opiniones firmes.
      p.line([x - 4, 22], [x + 3, x < 48 ? 24 : 20], 1, WHITE);
    }
  }
  if (expr === 'lose') {
    // Zzz
    p.rect(68, 10, 6, 1, WHITE);
    p.line([73, 11], [68, 16], 1, WHITE);
    p.rect(68, 16, 6, 1, WHITE);
  }
  p.outline(PAL.ink);
  return p.img;
}

export const donGansoArt: CharacterArt = {
  id: 'donGanso',
  build: {
    thigh: 7,
    shin: 6.5,
    torso: 13,
    upperArm: 6,
    foreArm: 6,
    shoulderW: 5,
    hipW: 5,
    belly: 2.5,
    legW: 2.2,
    armW: 3,
  },
  skin: BLACK,
  palette,
  heads: {
    front: { rows: front, anchor: [7, 13] },
    frontShout: { rows: frontShout, anchor: [7, 13] },
    back: { rows: back, anchor: [7, 13] },
  },
  outfits: [plumas, umpire],
  racket: { frame: BOW, grip: BLACK },
  taunt: honk,
  portrait,
};
