// EL ROSCO: grandote, pelo castaño medio largo peinado para atrás (húmedo), barba tupida,
// sonrisa enorme. Camiseta a rayas verticales rojas y negras (sin escudo ni sponsor).

import { PAL } from '../palette';
import type { Pose } from '../body';
import {
  beardFill,
  brow,
  cheeks,
  ears,
  eye,
  face,
  mouth,
  neck,
  newPortrait,
  nose,
  shoulders,
  sparkle,
  sweat,
  type Face,
} from '../portraitKit';
import type { CharacterArt, Outfit } from './types';

const palette = {
  o: PAL.ink,
  h: PAL.hairBrown,
  k: PAL.hairBrownHi,
  H: '#4a3325',
  s: PAL.skinRosy,
  z: PAL.skinRosyShadow,
  n: PAL.skinRosyShadow,
  r: PAL.blush,
  b: PAL.beardBrown,
  B: PAL.beardBrownDark,
  e: PAL.ink,
  w: PAL.white,
  m: PAL.mouth,
};

// Arriba: pelo más ralo, con entradas en las sienes y un mechón al medio.
const front = [
  '....oooooo....',
  '..oohhkhhhoo..',
  '.ohhsshhsshho.',
  '.ohssssssssho.',
  'ohhsssssssshho',
  'ohzsBBsssBBzho',
  'ohseesssseesho',
  'ohrsssnnsssrho',
  'ohbssbbbbssbho',
  'obbmwwwwwwmbbo',
  'obbbmwwwwmbbbo',
  'obbbbmmmmbbbbo',
  '.obbbbbbbbbbo.',
  '..oBbbbbbbBo..',
  '....oBBBBo....',
];

const frontShout = [
  '....oooooo....',
  '..oohhkhhhoo..',
  '.ohhsshhsshho.',
  '.ohssssssssho.',
  'ohhsssssssshho',
  'ohzBBssssBBzho',
  'ohseesssseesho',
  'ohrsssnnsssrho',
  'ohbsbmmmmbsbho',
  'obbmwwwwwwmbbo',
  'obbmmmmmmmmbbo',
  'obbbmmmmmmbbbo',
  '.obbbmmmmbbbo.',
  '..oBbbbbbbBo..',
  '....oBBBBo....',
];

const back = [
  '....oooooo....',
  '..oohhskhhoo..',
  '.ohhhsshhhhho.',
  '.ohhhhhhhhhho.',
  'ohhhhhhhhhhhho',
  'ohhhhkhhhhhhho',
  'oshhhhhhhhhhso',
  'oshhhhhhhhhhso',
  'obhhhhhhhhhhbo',
  'obhHhhhhhhHhbo',
  'obbHHhhhhHHbbo',
  '.obbHHHHHHbbo.',
  '..obbzzzzbbo..',
  '...obzzzzbo...',
  '....oooooo....',
];

const stripes =
  (a: string, b: string, w = 2.5) =>
  (u: number, v: number) => {
    if (v < 1.2) return PAL.dark;
    return Math.floor((u + 100) / w) % 2 === 0 ? a : b;
  };

const rayas: Outfit = {
  id: 'rayas',
  shirt: stripes(PAL.red, PAL.dark),
  sleeve: PAL.red,
  shorts: PAL.navy,
  socks: PAL.white,
  shoes: PAL.grey3,
};

const rojo: Outfit = {
  id: 'rojo',
  shirt: (_u, v) => (v < 1.2 ? PAL.white : PAL.red),
  sleeve: PAL.red,
  shorts: PAL.blue,
  socks: PAL.white,
  shoes: PAL.grey3,
};

const gol: Pose[] = [
  { crouch: 1, armR: [35, -125], armL: [-35, 125], armRBehind: true, armLBehind: true, racket: null, head: 'shout' },
  { dy: -2, footR: [3, 2], footL: [-3, 2], armR: [40, -130], armL: [-40, 130], armRBehind: true, armLBehind: true, racket: null, head: 'shout' },
  { dy: -3, footR: [3, 3], footL: [-3, 3], armR: [38, -128], armL: [-38, 128], armRBehind: true, armLBehind: true, racket: null, head: 'shout' },
  { crouch: 2, armR: [35, -125], armL: [-35, 125], armRBehind: true, armLBehind: true, racket: null, head: 'shout' },
];

function portrait(expr: 'normal' | 'win' | 'lose', outfit: Outfit) {
  const p = newPortrait();
  const f: Face = { cx: 48, cy: 44, rx: 25, ry: 27, jaw: 0.9, chinY: 74, skin: PAL.skinRosy, shade: PAL.skinRosyShadow };
  const striped = outfit.id === 'rayas';
  shoulders(p, f, (u, v) => {
    if (v < 3 && Math.abs(u) < 14) return PAL.dark;
    if (!striped) return v < 3 && Math.abs(u) < 17 ? PAL.white : PAL.red;
    return Math.floor((u + 200) / 7) % 2 === 0 ? PAL.red : PAL.dark;
  }, 47, 79);
  neck(p, f, 12);
  // Pelo largo de atrás, cayendo a los costados (sigue largo, eso no cambia).
  p.poly(
    [
      [22, 28],
      [74, 28],
      [79, 44],
      [77, 60],
      [70, 62],
      [70, 40],
      [26, 40],
      [26, 62],
      [19, 60],
      [17, 44],
    ],
    PAL.hairBrown,
  );
  ears(p, f, 49);
  face(p, f);
  // Cuero cabelludo arriba (se asoma entre el pelo ralo).
  p.clip = (_x, y) => y < 30;
  p.ellipse(48, 31, 24, 22, PAL.skinRosy);
  p.clip = null;
  // Pelo peinado para atrás, más ralo arriba y con entradas en las sienes (hairline en M).
  p.poly(
    [
      [23, 34],
      [25, 21],
      [31, 12],
      [40, 8],
      [56, 8],
      [65, 12],
      [71, 21],
      [73, 34],
      [68, 29],
      [63, 21],
      [58, 15],
      [53, 17],
      [48, 21],
      [43, 17],
      [38, 15],
      [33, 21],
      [28, 29],
    ],
    // Mechones con huecos: cerca de la frente se ve más el cuero, atrás es más tupido.
    (x, y) => {
      const gapEvery = y < 13 ? 7 : 4;
      return (x + Math.round(y * 0.35)) % gapEvery === 0 ? null : PAL.hairBrown;
    },
  );
  // Mechones mojados.
  for (const [a, b] of [
    [[35, 19], [39, 9]],
    [[45, 18], [46, 8]],
    [[51, 18], [51, 8]],
    [[61, 19], [58, 10]],
    [[27, 28], [30, 17]],
    [[69, 28], [67, 17]],
  ] as [[number, number], [number, number]][]) {
    p.thin(a, b, PAL.hairBrownHi);
  }
  // Brillo de transpiración en la frente.
  p.rect(38, 25, 4, 1, PAL.white);
  p.rect(39, 24, 2, 1, PAL.white);

  const browCol = PAL.beardBrownDark;
  const eyeY = 43;
  if (expr === 'lose') {
    brow(p, 'worried', 37, 35, -1, browCol, 2);
    brow(p, 'worried', 59, 35, 1, browCol, 2);
    eye(p, 'closed', 37, eyeY + 1);
    eye(p, 'closed', 59, eyeY + 1);
  } else {
    brow(p, expr === 'win' ? 'up' : 'arched', 37, 35, -1, browCol, 2);
    brow(p, expr === 'win' ? 'up' : 'arched', 59, 35, 1, browCol, 2);
    eye(p, expr === 'win' ? 'closed' : 'squint', 37, eyeY);
    eye(p, expr === 'win' ? 'closed' : 'squint', 59, eyeY);
  }
  cheeks(p, f, 51, 16);
  nose(p, f, 54, 9, 4);

  // Barba tupida de oreja a oreja.
  p.poly(
    [
      [23, 48],
      [26, 62],
      [32, 73],
      [40, 80],
      [48, 83],
      [56, 80],
      [64, 73],
      [70, 62],
      [73, 48],
      [68, 57],
      [61, 60],
      [48, 60],
      [35, 60],
      [28, 57],
    ],
    beardFill(PAL.beardBrown, PAL.beardBrownDark, 3),
  );
  // Bigote
  p.poly(
    [
      [37, 61],
      [48, 58],
      [59, 61],
      [57, 64],
      [48, 62],
      [39, 64],
    ],
    PAL.beardBrownDark,
  );
  if (expr === 'win') mouth(p, 'laugh', 48, 66, 11);
  else if (expr === 'lose') mouth(p, 'open', 48, 68, 6);
  else mouth(p, 'grin', 48, 66, 11);

  if (expr === 'win') {
    sparkle(p, 14, 14);
    sparkle(p, 84, 22, PAL.white);
  }
  if (expr === 'lose') sweat(p, 76, 30);
  p.outline(PAL.ink);
  return p.img;
}

export const elRoscoArt: CharacterArt = {
  id: 'elRosco',
  build: {
    thigh: 8,
    shin: 8,
    torso: 13.5,
    upperArm: 6,
    foreArm: 6,
    shoulderW: 7,
    hipW: 6,
    belly: 2.2,
    legW: 3.8,
    armW: 3.2,
  },
  skin: PAL.skinRosy,
  palette,
  heads: {
    front: { rows: front, anchor: [7, 12] },
    frontShout: { rows: frontShout, anchor: [7, 12] },
    back: { rows: back, anchor: [7, 12] },
  },
  outfits: [rayas, rojo],
  racket: { frame: PAL.red, grip: PAL.dark },
  taunt: gol,
  portrait,
};
