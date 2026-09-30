// EL SEBA ("Dinein"): alto y flaco, pelo castaño oscuro de largo medio peinado al costado,
// barba de algunos días con bigote. Remera azul con franja amarilla (colores de Boca, sin escudo).
// Trajes alternativos: chaleco de pesca con buff azul y "Modo Diplomático" (traje y credencial).

import { PAL } from '../palette';
import type { Pose } from '../body';
import {
  brow,
  ears,
  eye,
  face,
  mouth,
  neck,
  newPortrait,
  nose,
  shoulders,
  sparkle,
  stubbleFill,
  sweat,
  type Face,
} from '../portraitKit';
import type { CharacterArt, Outfit } from './types';

const palette = {
  o: PAL.ink,
  h: PAL.hairDarkBrown,
  k: PAL.hairDarkBrownHi,
  H: '#2a1e18',
  s: PAL.skinWarm,
  z: PAL.skinWarmShadow,
  n: PAL.skinWarmShadow,
  t: PAL.stubble,
  b: PAL.hairDarkBrown,
  e: PAL.ink,
  w: PAL.white,
  m: PAL.mouth,
};

const front = [
  '...oooooooo...',
  '..ohhhhhhhhho.',
  '.ohhhkkkhhhhho',
  '.ohhhhhhhhssho',
  '.ohhhhhssssszo',
  '.ohsbbsssbbszo',
  '.ozseessseeszo',
  '.ozssssnnssszo',
  '.otssbbbbbssto',
  '.ottssooosstto',
  '.otttsssssttto',
  '..ottttttttto.',
  '...ottttttto..',
  '....ozzzzzo...',
  '....ozzzzzo...',
];

const frontShout = [
  ...front.slice(0, 8),
  '.otssbmmmbssto',
  '.ottsmwwwmstto',
  '.otttsmmmsttto',
  ...front.slice(11),
];

const back = [
  '...oooooooo...',
  '..ohhhhhhhhho.',
  '.ohhhhkkhhhhho',
  '.ohhhhhhhhhhho',
  '.ohhhhhhhhhhho',
  '.ohhhhhhhhhhho',
  '.oshhhhhhhhhso',
  '.oshhhhhhhhhso',
  '.ozhhhhhhhhhzo',
  '..ohhhhhhhhho.',
  '..ozzhhhhhzzo.',
  '...ozzzzzzzo..',
  '....ozzzzzo...',
  '....ozzzzzo...',
  '....ooooooo...',
];

const boca: Outfit = {
  id: 'boca',
  shirt: (_u, v) => (v < 1.2 ? PAL.yellow : v > 4.5 && v < 7.5 ? PAL.yellow : PAL.blue),
  sleeve: PAL.blue,
  shorts: PAL.blueDark,
  socks: PAL.white,
  shoes: PAL.grey3,
};

const pesca: Outfit = {
  id: 'pesca',
  shirt: (u, v, view) => {
    if (view === 'front') {
      if (v < 3 && Math.abs(u) < 3) return PAL.blue; // buff
      if (Math.abs(u) < 1.3) return PAL.grey3; // remera debajo del chaleco
      if (v > 5 && v < 7.5 && Math.abs(u) > 2 && Math.abs(u) < 4.5) return PAL.oliveDark; // bolsillos
    } else if (v < 2) return PAL.blue;
    return PAL.olive;
  },
  sleeve: PAL.grey3,
  longSleeves: true,
  shorts: PAL.oliveDark,
  socks: PAL.grey4,
  shoes: PAL.woodDark,
};

const diplomatico: Outfit = {
  id: 'diplomatico',
  shirt: (u, v, view) => {
    if (view === 'front') {
      if (Math.abs(u) < 0.9 && v > 0.5 && v < 9) return PAL.celesteDark; // corbata
      if (v < 3.5 && Math.abs(u) < 2.4 - v * 0.3) return PAL.white; // cuello de la camisa
      if (u < -1.5 && u > -4.2 && v > 5 && v < 8.5) return v < 6 ? PAL.celeste : PAL.white; // credencial
      if (Math.abs(Math.abs(u) - 1.8) < 0.5 && v < 5) return PAL.celeste; // cinta de la credencial
    }
    return PAL.navy;
  },
  sleeve: PAL.navy,
  longSleeves: true,
  shorts: PAL.navy,
  longPants: true,
  socks: PAL.navyDark,
  shoes: PAL.ink,
};

const heeey: Pose[] = [
  { crouch: 1, armR: [120, 140], armL: [-120, -140], racket: 160, head: 'shout' },
  { dy: -2, footR: [4, 1], footL: [-4, 1], armR: [135, 158], armL: [-135, -158], racket: 178, head: 'shout' },
  { armR: [125, 145], armL: [-125, -145], racket: 165, head: 'shout' },
];

function portrait(expr: 'normal' | 'win' | 'lose', outfit: Outfit) {
  const p = newPortrait();
  const f: Face = { cx: 48, cy: 43, rx: 21, ry: 27, jaw: 0.72, chinY: 75, skin: PAL.skinWarm, shade: PAL.skinWarmShadow };
  shoulders(
    p,
    f,
    (u, v) => {
      if (outfit.id === 'diplomatico') {
        if (Math.abs(u) < 3 && v < 18) return PAL.celesteDark;
        if (Math.abs(u) < 9 - v * 0.2 && v < 14) return PAL.white;
        if (u < -18 && u > -28 && v > 8) return v < 11 ? PAL.celeste : PAL.white;
        return PAL.navy;
      }
      if (outfit.id === 'pesca') {
        if (Math.abs(u) < 12 && v < 6) return PAL.blue;
        if (Math.abs(u) < 5) return PAL.grey3;
        return PAL.olive;
      }
      if (v < 3 && Math.abs(u) < 12) return PAL.yellow;
      return v > 7 && v < 14 ? PAL.yellow : PAL.blue;
    },
    40,
    79,
  );
  neck(p, f, 10);
  ears(p, f, 47);
  face(p, f);
  // Barba de algunos días: mejillas, mandíbula y mentón.
  p.poly(
    [
      [28, 52],
      [31, 64],
      [37, 72],
      [48, 77],
      [59, 72],
      [65, 64],
      [68, 52],
      [62, 58],
      [48, 60],
      [34, 58],
    ],
    stubbleFill(PAL.skinWarm, '#9c7a62'),
  );
  // Pelo castaño oscuro con volumen, peinado hacia su derecha (nuestra izquierda).
  p.poly(
    [
      [26, 46],
      [24, 30],
      [28, 16],
      [38, 8],
      [51, 5],
      [63, 8],
      [70, 16],
      [72, 29],
      [70, 42],
      [67, 31],
      [60, 25],
      [52, 24],
      [44, 28],
      [36, 34],
      [30, 42],
    ],
    PAL.hairDarkBrown,
  );
  for (const [a, b] of [
    [[62, 11], [40, 22]],
    [[56, 9], [34, 24]],
    [[66, 16], [48, 26]],
    [[46, 8], [30, 20]],
  ] as [[number, number], [number, number]][]) {
    p.thin(a, b, PAL.hairDarkBrownHi);
  }

  const eyeY = 44;
  if (expr === 'lose') {
    brow(p, 'worried', 38, 37, -1, PAL.hairDarkBrown, 2);
    brow(p, 'worried', 58, 37, 1, PAL.hairDarkBrown, 2);
    eye(p, 'wide', 38, eyeY, '#4a3020');
    eye(p, 'wide', 58, eyeY, '#4a3020');
  } else {
    brow(p, expr === 'win' ? 'arched' : 'flat', 38, 37, -1, PAL.hairDarkBrown, 2);
    brow(p, expr === 'win' ? 'arched' : 'flat', 58, 37, 1, PAL.hairDarkBrown, 2);
    eye(p, expr === 'win' ? 'squint' : 'open', 38, eyeY, '#4a3020');
    eye(p, expr === 'win' ? 'squint' : 'open', 58, eyeY, '#4a3020');
  }
  nose(p, f, 57, 12, 4);
  // Bigote
  p.poly(
    [
      [39, 61],
      [48, 59],
      [57, 61],
      [55, 63],
      [48, 62],
      [41, 63],
    ],
    '#5a4032',
  );
  if (expr === 'win') mouth(p, 'grin', 48, 66, 9);
  else if (expr === 'lose') mouth(p, 'wavy', 48, 67, 6);
  else mouth(p, 'smirk', 48, 67, 6);

  if (expr === 'win') {
    sparkle(p, 16, 20);
    sparkle(p, 82, 16, PAL.yellow);
  }
  if (expr === 'lose') sweat(p, 74, 34);
  p.outline(PAL.ink);
  return p.img;
}

export const elSebaArt: CharacterArt = {
  id: 'elSeba',
  build: {
    thigh: 9.5,
    shin: 9.5,
    torso: 13,
    upperArm: 6.5,
    foreArm: 6.5,
    shoulderW: 5.5,
    hipW: 4,
    belly: 0,
    legW: 3,
    armW: 2.5,
  },
  skin: PAL.skinWarm,
  palette,
  heads: {
    front: { rows: front, anchor: [7, 12] },
    frontShout: { rows: frontShout, anchor: [7, 12] },
    back: { rows: back, anchor: [7, 12] },
  },
  outfits: [boca, pesca, diplomatico],
  racket: { frame: PAL.yellow, grip: PAL.blueDark },
  taunt: heeey,
  portrait,
};
