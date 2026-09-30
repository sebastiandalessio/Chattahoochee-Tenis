// VOLPI: gorra negra (sin logo), anteojos de sol espejados, barba corta oscura, sonrisa grande,
// contextura mediana. Remera blanca con banda roja diagonal (River, sin escudo). Alternativo: remera negra.

import { PAL } from '../palette';
import type { Pose } from '../body';
import { beardFill, ears, face, mouth, neck, newPortrait, nose, shoulders, sparkle, sweat, type Face } from '../portraitKit';
import type { CharacterArt, Outfit } from './types';

const palette = {
  o: PAL.ink,
  c: '#1f1d25',
  C: '#3b3946',
  h: '#2e2622',
  g: '#7d7780',
  s: PAL.skinFair,
  z: PAL.skinFairShadow,
  n: PAL.skinFairShadow,
  l: '#15151c',
  L: PAL.mirror,
  b: '#3a2a22',
  B: '#261a14',
  e: PAL.ink,
  w: PAL.white,
  m: PAL.mouth,
};

const front = [
  '...oooooooo...',
  '..occcCCccco..',
  '.occcccccccco.',
  'oCCCCCCCCCCCCo',
  '.ogssssssssgo.',
  '.ollllllllllo.',
  '.olLllsslLllo.',
  '.ozsssnnssszo.',
  '.obsbbbbbbsbo.',
  '.obmwwwwwwmbo.',
  '.obbmmmmmmbbo.',
  '..obbbbbbbbo..',
  '...obbbbbbo...',
  '....ozzzzo....',
  '....ozzzzo....',
];

const frontShout = [
  ...front.slice(0, 8),
  '.obmmmmmmmmbo.',
  '.obmwwwwwwmbo.',
  '.obmmmmmmmmbo.',
  '..obmmmmmmbo..',
  '...obbbbbbo...',
  ...front.slice(13),
];

const back = [
  '...oooooooo...',
  '..occcccccco..',
  '.occcccccccco.',
  '.occcCCCCccco.',
  '.oghhhhhhhhgo.',
  'oslhhhhhhhhlso',
  '.oshhhhhhhhso.',
  '.obhhhhhhhhbo.',
  '.obzzzzzzzzbo.',
  '..obzzzzzzbo..',
  '...ozzzzzzo...',
  '....ozzzzo....',
  '....ozzzzo....',
  '....ozzzzo....',
  '....oooooo....',
];

// Banda roja: del hombro derecho a la cadera izquierda (en coordenadas del jugador, vale para las dos vistas).
const river: Outfit = {
  id: 'river',
  shirt: (u, v) => (v < 1.2 ? PAL.red : Math.abs(u + v * 0.85 - 4.5) < 1.9 ? PAL.red : PAL.white),
  sleeve: PAL.white,
  shorts: PAL.dark,
  socks: PAL.white,
  shoes: PAL.dark,
};

const negra: Outfit = {
  id: 'negra',
  shirt: (_u, v) => (v < 1.2 ? PAL.grey1 : PAL.dark),
  sleeve: PAL.dark,
  shorts: PAL.grey3,
  socks: PAL.white,
  shoes: PAL.white,
};

const risa: Pose[] = [
  { crouch: 2, bend: 0.3, armR: [15, 8], racket: 10, armL: [-10, 80], armLBehind: true, head: 'shout' },
  { crouch: 3, bend: 0.5, headDy: 1, armR: [18, 10], racket: 12, armL: [-8, 85], armLBehind: true, head: 'shout' },
  { crouch: 1, bend: 0.1, dy: -1, armR: [22, 60], racket: 120, armL: [-12, 75], armLBehind: true, head: 'shout' },
];

function portrait(expr: 'normal' | 'win' | 'lose', outfit: Outfit) {
  const p = newPortrait();
  const f: Face = { cx: 48, cy: 46, rx: 22, ry: 26, jaw: 0.86, chinY: 75, skin: PAL.skinFair, shade: PAL.skinFairShadow };
  shoulders(
    p,
    f,
    (u, v) => {
      if (outfit.id === 'negra') return v < 3 && Math.abs(u) < 12 ? PAL.grey1 : PAL.dark;
      if (v < 3 && Math.abs(u) < 12) return PAL.red;
      return Math.abs(-u + v * 1.1 - 8) < 6 ? PAL.red : PAL.white;
    },
    43,
    80,
  );
  neck(p, f, 11);
  ears(p, f, 49);
  face(p, f);
  // Barba corta oscura, de patilla a patilla, con canas en las patillas.
  p.poly(
    [
      [26, 38],
      [27, 58],
      [33, 70],
      [41, 77],
      [48, 79],
      [55, 77],
      [63, 70],
      [69, 58],
      [70, 38],
      [67, 50],
      [62, 58],
      [48, 60],
      [34, 58],
      [29, 50],
    ],
    beardFill('#3a2a22', '#261a14', 1),
  );
  p.rect(26, 34, 4, 7, '#7d7780');
  p.rect(67, 34, 4, 7, '#7d7780');
  // Gorra de béisbol negra lisa (sin logo). Copa baja con frente armada; la visera se ve
  // desde abajo, curva hacia la cámara y con el forro gris (como en la foto).
  p.clip = (_x, y) => y < 31;
  p.ellipse(48, 31, 25, 19, '#1f1d25');
  p.clip = null;
  p.clip = (_x, y) => y < 31 && y > 15;
  p.ellipse(48, 31, 12, 15, '#29272f');
  p.clip = null;
  p.thin([37, 15], [35, 30], '#3b3946');
  p.thin([59, 15], [61, 30], '#3b3946');
  p.rect(46, 11, 5, 2, '#3b3946');
  p.poly(
    [
      [20, 30],
      [76, 30],
      [75, 34],
      [66, 38],
      [48, 41],
      [30, 38],
      [21, 34],
    ],
    (_x, y) => (y < 32 ? '#2e2c36' : PAL.grey2),
  );
  p.thin([28, 36], [68, 36], PAL.grey3);

  // Anteojos espejados: dos lentes con reflejo celeste.
  for (const x of [37, 59]) {
    p.rect(x - 10, 42, 20, 11, PAL.ink);
    p.rect(x - 9, 43, 18, 9, (_px, py) => (py < 46 ? PAL.mirror : py < 48 ? '#5f7fa8' : '#252a3a'));
    p.thin([x - 6, 51], [x + 2, 43], PAL.white);
  }
  p.rect(46, 44, 5, 2, PAL.ink);

  nose(p, f, 59, 6, 4);
  // Bigote
  p.poly(
    [
      [37, 62],
      [48, 60],
      [59, 62],
      [57, 65],
      [48, 63],
      [39, 65],
    ],
    '#2a1e18',
  );
  if (expr === 'win') mouth(p, 'laugh', 48, 68, 11);
  else if (expr === 'lose') mouth(p, 'wavy', 48, 69, 7);
  else mouth(p, 'grin', 48, 68, 10);

  if (expr === 'win') {
    sparkle(p, 14, 16);
    sparkle(p, 84, 20, PAL.red);
  }
  if (expr === 'lose') sweat(p, 76, 44);
  p.outline(PAL.ink);
  return p.img;
}

export const volpiArt: CharacterArt = {
  id: 'volpi',
  build: {
    thigh: 8.5,
    shin: 8,
    torso: 12.5,
    upperArm: 6,
    foreArm: 6,
    shoulderW: 6.2,
    hipW: 5,
    belly: 1,
    legW: 3.4,
    armW: 2.8,
  },
  skin: PAL.skinFair,
  palette,
  heads: {
    front: { rows: front, anchor: [7, 12] },
    frontShout: { rows: frontShout, anchor: [7, 12] },
    back: { rows: back, anchor: [7, 11] },
  },
  outfits: [river, negra],
  racket: { frame: PAL.red, grip: PAL.dark },
  taunt: risa,
  portrait,
};
