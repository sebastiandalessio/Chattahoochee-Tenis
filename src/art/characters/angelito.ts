// ANGELITO: el más bajito (sprite notoriamente más chico), cara juvenil, pelo castaño corto,
// barba corta prolija, sonrisa amplia. Remera negra lisa, bermudas de jean gris azulado, zapatillas grises.
// Alternativo: handyman (casco amarillo, chaleco reflectivo, cinturón de herramientas).

import { PAL } from '../palette';
import type { Joints, Pose } from '../body';
import { beardFill, brow, ears, eye, face, mouth, neck, newPortrait, nose, shoulders, sparkle, stubbleFill, type Face } from '../portraitKit';
import type { Painter, Pt } from '../painter';
import type { Accessory, CharacterArt, Outfit } from './types';

const palette = {
  o: PAL.ink,
  h: PAL.hairBrown,
  k: PAL.hairBrownHi,
  s: PAL.skinFair,
  z: PAL.skinFairShadow,
  n: PAL.skinFairShadow,
  b: PAL.beardBrown,
  e: PAL.ink,
  w: PAL.white,
  m: PAL.mouth,
};

const front = [
  '...oooooooo...',
  '..ohhkkhhhhho.',
  '.ohhhhhhhhhhho',
  '.ohhsssssssho.',
  '.ozsssssssszo.',
  '.osbbsssssbbso',
  '.osseessseesso',
  '.ozsssnnssszo.',
  '.obssbbbbbssbo',
  '.obmwwwwwwwmbo',
  '.obbmmmmmmmbbo',
  '..obbbbbbbbbo.',
  '...ozzzzzzzo..',
  '...ozzzzzzzo..',
];

const back = [
  '...oooooooo...',
  '..ohhhkkhhhho.',
  '.ohhhhhhhhhhho',
  '.ohhhhhhhhhhho',
  '.ohhhhhhhhhhho',
  'oshhhhhhhhhhso',
  'oshhhhhhhhhhso',
  '.obhhhhhhhhbo.',
  '.obzhhhhhhzbo.',
  '..obzzzzzzbo..',
  '...ozzzzzzo...',
  '...ozzzzzzo...',
  '...ozzzzzzo...',
  '...oooooooo...',
];

const hardHat: Accessory = {
  rows: [
    '....oooooooo....',
    '..ooyyyyyyyyoo..',
    '.oyyyyYyyyyyyyo.',
    '.oyyyyyyyyyyyyo.',
    'oooooooooooooooo',
    'oyyyyyyyyyyyyyyo',
    'oooooooooooooooo',
  ],
  palette: { o: PAL.ink, y: PAL.yellow, Y: PAL.white },
  offset: [-1, -3],
};

const negra: Outfit = {
  id: 'negra',
  shirt: (_u, v) => (v < 1.2 ? PAL.grey1 : PAL.dark),
  sleeve: PAL.dark,
  shorts: PAL.denim,
  socks: PAL.white,
  shoes: PAL.grey3,
};

function toolBelt(p: Painter, j: Joints): void {
  const a: Pt = [j.hip[0] - j.perp[0] * 5, j.hip[1] - j.perp[1] * 5 - 1];
  const b: Pt = [j.hip[0] + j.perp[0] * 5, j.hip[1] + j.perp[1] * 5 - 1];
  p.line(a, b, 2.2, PAL.wood);
  p.set(Math.round(j.hip[0]), Math.round(j.hip[1] - 1), PAL.gold);
  // Martillo colgando
  p.rect(Math.round(b[0]) - 1, Math.round(b[1]), 1, 4, PAL.woodDark);
  p.rect(Math.round(b[0]) - 2, Math.round(b[1]) + 3, 3, 1, PAL.silver);
}

const handyman: Outfit = {
  id: 'handyman',
  shirt: (u, v, view) => {
    if (view === 'front' && Math.abs(u) < 1.2) return PAL.dark;
    if (v > 6 && v < 7.4) return PAL.silver;
    return v < 1.2 ? PAL.dark : PAL.hiVis;
  },
  sleeve: PAL.dark,
  shorts: PAL.denim,
  socks: PAL.white,
  shoes: PAL.woodDark,
  headFront: hardHat,
  headBack: hardHat,
  extras: (p, j) => toolBelt(p, j),
};

const llave: Pose[] = [
  { crouch: 1, bend: 0.2, armR: [60, 110], racket: null, prop: { kind: 'wrench', hand: 'R', angle: 100 }, armL: [-30, -60] },
  { crouch: 1, bend: 0.2, armR: [70, 140], racket: null, prop: { kind: 'wrench', hand: 'R', angle: 150 }, armL: [-30, -60] },
  { crouch: 2, bend: 0.2, armR: [55, 80], racket: null, prop: { kind: 'wrench', hand: 'R', angle: 60 }, armL: [-30, -60] },
];

function questionMark(p: Painter, x: number, y: number): void {
  const q = ['.ooo.', 'o...o', '...o.', '..o..', '.....', '..o..'];
  q.forEach((row, j) => {
    for (let i = 0; i < row.length; i++)
      if (row[i] === 'o') {
        p.rect(x + i * 2, y + j * 2, 2, 2, PAL.gold);
      }
  });
}

function portrait(expr: 'normal' | 'win' | 'lose', outfit: Outfit) {
  const p = newPortrait();
  const f: Face = { cx: 48, cy: 46, rx: 22, ry: 25, jaw: 0.84, chinY: 73, skin: PAL.skinFair, shade: PAL.skinFairShadow };
  shoulders(
    p,
    f,
    (u, v) => {
      if (outfit.id === 'handyman') {
        if (Math.abs(u) < 6) return PAL.dark;
        if (v > 9 && v < 12) return PAL.silver;
        return PAL.hiVis;
      }
      return v < 3 && Math.abs(u) < 12 ? PAL.grey1 : PAL.dark;
    },
    42,
    80,
  );
  neck(p, f, 11);
  ears(p, f, 49);
  face(p, f);
  // Sombra de barba en las mejillas y barba corta prolija por la mandíbula.
  p.poly(
    [
      [27, 50],
      [30, 60],
      [36, 60],
      [48, 62],
      [60, 60],
      [66, 60],
      [69, 50],
    ],
    stubbleFill(PAL.skinFair, '#c49a7e'),
  );
  p.poly(
    [
      [26, 50],
      [29, 62],
      [35, 70],
      [42, 74],
      [48, 75],
      [54, 74],
      [61, 70],
      [67, 62],
      [70, 50],
      [66, 58],
      [60, 64],
      [48, 66],
      [36, 64],
      [30, 58],
    ],
    beardFill(PAL.beardBrown, PAL.beardBrownDark, 7),
  );
  // Pelo castaño corto con entradas suaves.
  p.poly(
    [
      [26, 42],
      [25, 28],
      [30, 16],
      [40, 9],
      [53, 8],
      [64, 12],
      [70, 21],
      [71, 36],
      [68, 29],
      [62, 25],
      [55, 26],
      [48, 23],
      [41, 26],
      [34, 25],
      [29, 31],
    ],
    PAL.hairBrown,
  );
  for (const [a, b] of [
    [[36, 14], [44, 22]],
    [[46, 11], [50, 20]],
    [[57, 12], [58, 21]],
    [[30, 22], [34, 26]],
  ] as [[number, number], [number, number]][]) {
    p.thin(a, b, PAL.hairBrownHi);
  }
  const browCol = PAL.beardBrownDark;
  if (expr === 'lose') {
    brow(p, 'flat', 38, 38, -1, browCol, 2);
    brow(p, 'up', 58, 36, 1, browCol, 2);
    eye(p, 'open', 38, 44, '#5a4030', 1);
    eye(p, 'wide', 58, 44, '#5a4030', 1);
    mouth(p, 'smirk', 48, 66, 6);
    questionMark(p, 74, 4);
  } else {
    brow(p, 'arched', 38, 38, -1, browCol, 2);
    brow(p, 'arched', 58, 38, 1, browCol, 2);
    eye(p, expr === 'win' ? 'closed' : 'squint', 38, 44, '#5a4030');
    eye(p, expr === 'win' ? 'closed' : 'squint', 58, 44, '#5a4030');
    mouth(p, expr === 'win' ? 'laugh' : 'grin', 48, 65, 10);
  }
  nose(p, f, 57, 9, 4);
  if (outfit.headFront === hardHat) {
    p.clip = (_x, y) => y < 30;
    p.ellipse(48, 28, 27, 22, PAL.yellow);
    p.clip = null;
    p.rect(18, 28, 61, 5, PAL.yellow);
    p.rect(18, 32, 61, 1, PAL.yellowDark);
    p.rect(46, 8, 5, 20, PAL.yellowDark);
  }
  if (expr === 'win') {
    sparkle(p, 14, 18);
    sparkle(p, 82, 14, PAL.hiVis);
  }
  p.outline(PAL.ink);
  return p.img;
}

export const angelitoArt: CharacterArt = {
  id: 'angelito',
  build: {
    thigh: 6,
    shin: 6,
    torso: 10.5,
    upperArm: 5,
    foreArm: 5,
    shoulderW: 5.3,
    hipW: 4.2,
    belly: 0,
    legW: 3.2,
    armW: 2.6,
  },
  skin: PAL.skinFair,
  palette,
  heads: {
    front: { rows: front, anchor: [7, 11] },
    back: { rows: back, anchor: [7, 10] },
  },
  outfits: [negra, handyman],
  racket: { frame: PAL.yellow, grip: PAL.dark },
  taunt: llave,
  portrait,
};
