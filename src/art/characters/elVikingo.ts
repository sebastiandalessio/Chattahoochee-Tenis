// EL VIKINGO: pelo rubio oscuro con costados rapados y rodete arriba, barba larga castaño rojiza
// con canas en el mentón, ojos celestes, atlético. Remera gris. Toca la guitarra.
// Alternativo: casco vikingo con cuernos y remera blanca con banda roja (River, sin escudo).

import { PAL } from '../palette';
import type { Pose } from '../body';
import { beardFill, brow, ears, eye, face, hash2, mouth, neck, newPortrait, nose, shoulders, sparkle, sweat, type Face } from '../portraitKit';
import type { Accessory, CharacterArt, Outfit } from './types';

const palette = {
  o: PAL.ink,
  h: PAL.hairDarkBlond,
  k: PAL.hairDarkBlondHi,
  x: '#d3aa86',
  s: PAL.skinFair,
  z: PAL.skinFairShadow,
  n: PAL.skinFairShadow,
  b: PAL.beardAuburn,
  B: PAL.beardAuburnDark,
  g: PAL.beardGrey,
  i: PAL.celesteDark,
  w: PAL.white,
  m: PAL.mouth,
};

const front = [
  '.....oooo.....',
  '....ohkkho....',
  '...oohhhhoo...',
  '..oxhhhhhhxo..',
  '.oxxhhhhhhxxo.',
  '.oxssssssssxo.',
  '.osBBssssBBso.',
  '.oswissssiwso.',
  '.ozsssnnssszo.',
  'obbbsbbbbsbbbo',
  'obbbbbmmmbbbbo',
  'obbbbbbbbbbbbo',
  '.obbbggggbbbo.',
  '..obbggggbbo..',
  '...oBggggBo...',
];

const frontShout = [
  ...front.slice(0, 9),
  'obbbmmmmmmbbbo',
  'obbbmwwwwmbbbo',
  'obbbbmmmmbbbbo',
  ...front.slice(12),
];

const back = [
  '.....oooo.....',
  '....ohkkho....',
  '...oohhhhoo...',
  '..oxhhhhhhxo..',
  '.oxxxhhhhxxxo.',
  '.oxxxxhhxxxxo.',
  'osxxxxxxxxxxso',
  'osxxxxxxxxxxso',
  '.obxxxxxxxxbo.',
  '.obbxxxxxxbbo.',
  '..obzzzzzzbo..',
  '...ozzzzzzo...',
  '....ozzzzo....',
  '....ozzzzo....',
  '....oooooo....',
];

const helmet: Accessory = {
  rows: [
    'o................o',
    'wo....oooooo....ow',
    'wwo.ooMMMMMMoo.oww',
    '.wwoMMMMMMMMMMoww.',
    '..ooMMMMMMMMMMoo..',
    '...oGGGGGGGGGGo...',
    '...oooooooooooo...',
  ],
  palette: { o: PAL.ink, w: PAL.white, M: PAL.silver, G: PAL.gold },
  offset: [-2, -1],
};

const gris: Outfit = {
  id: 'gris',
  shirt: (u, v) => (v < 1.2 ? PAL.grey1 : (Math.floor(u * 3) + Math.floor(v * 2)) % 7 === 0 ? PAL.grey3 : PAL.grey2),
  sleeve: PAL.grey2,
  shorts: PAL.dark,
  socks: PAL.white,
  shoes: PAL.grey3,
};

const vikingo: Outfit = {
  id: 'vikingo',
  shirt: (u, v) => (v < 1.2 ? PAL.red : Math.abs(u + v * 0.85 - 4.5) < 1.9 ? PAL.red : PAL.white),
  sleeve: PAL.white,
  shorts: PAL.dark,
  socks: PAL.white,
  shoes: PAL.grey3,
  headFront: helmet,
  headBack: helmet,
};

const riff: Pose[] = [
  { crouch: 1, armR: [20, -55], armL: [-70, -95], racket: null, prop: { kind: 'guitar', hand: 'L', angle: -100 } },
  { crouch: 2, headDy: 1, armR: [30, -20], armL: [-70, -95], racket: null, prop: { kind: 'guitar', hand: 'L', angle: -100 } },
  { crouch: 1, armR: [20, -55], armL: [-72, -100], racket: null, prop: { kind: 'guitar', hand: 'L', angle: -100 } },
  { crouch: 3, headDy: 1, armR: [35, -10], armL: [-70, -95], racket: null, prop: { kind: 'guitar', hand: 'L', angle: -100 } },
];

function portrait(expr: 'normal' | 'win' | 'lose', outfit: Outfit) {
  const p = newPortrait();
  const f: Face = { cx: 48, cy: 45, rx: 22, ry: 26, jaw: 0.86, chinY: 72, skin: PAL.skinFair, shade: PAL.skinFairShadow };
  shoulders(
    p,
    f,
    (u, v) => {
      if (outfit.id === 'vikingo') {
        if (v < 3 && Math.abs(u) < 12) return PAL.red;
        return Math.abs(-u + v * 1.1 - 8) < 6 ? PAL.red : PAL.white;
      }
      if (v < 3 && Math.abs(u) < 12) return PAL.grey1;
      return hash2(u + 100, v) < 0.07 ? PAL.grey3 : PAL.grey2;
    },
    46,
    80,
  );
  neck(p, f, 12);
  ears(p, f, 47);
  face(p, f);
  // Costados rapados: piel con puntitos de pelo corto (la frente queda despejada).
  p.fillWhere(
    24,
    8,
    72,
    46,
    (x, y) =>
      ((x - 48) / 23.5) ** 2 + ((y - 34) / 27) ** 2 <= 1 &&
      y < 42 &&
      (Math.abs(x - 48) > 15 || !p.opaque(Math.floor(x), Math.floor(y))),
    (x, y) => (hash2(x, y) < 0.45 ? '#b08a64' : '#d3aa86'),
  );
  // Tira de pelo de arriba, peinada para atrás hacia el rodete.
  p.poly(
    [
      [35, 23],
      [35, 15],
      [40, 10],
      [48, 8],
      [56, 10],
      [61, 15],
      [61, 23],
      [56, 20],
      [48, 19],
      [40, 20],
    ],
    PAL.hairDarkBlond,
  );
  for (const x of [39, 45, 51, 57]) p.thin([x, 21], [48 + (x - 48) * 0.35, 10], PAL.hairDarkBlondHi);
  // Rodete
  p.ellipse(48, 7, 7, 5, PAL.hairDarkBlond);
  p.thin([44, 6], [51, 4], PAL.hairDarkBlondHi);

  // Barba castaño rojiza, larga, con canas en el mentón.
  const beard = beardFill(PAL.beardAuburn, PAL.beardAuburnDark, 5);
  p.poly(
    [
      [26, 42],
      [27, 58],
      [32, 70],
      [39, 80],
      [48, 84],
      [57, 80],
      [64, 70],
      [69, 58],
      [70, 42],
      [66, 52],
      [60, 58],
      [48, 60],
      [36, 58],
      [30, 52],
    ],
    beard,
  );
  // Canas en el mentón, mezcladas con el colorado.
  p.poly(
    [
      [42, 71],
      [48, 73],
      [54, 71],
      [56, 78],
      [48, 84],
      [40, 78],
    ],
    (x, y) => (hash2(x, y) < 0.25 ? PAL.beardAuburn : (x + y) % 4 === 0 ? '#a89c8c' : PAL.beardGrey),
  );
  const browCol = PAL.beardAuburnDark;
  if (expr === 'win') {
    brow(p, 'angry', 38, 37, -1, browCol, 2);
    brow(p, 'angry', 58, 37, 1, browCol, 2);
    eye(p, 'open', 38, 43, PAL.celesteDark);
    eye(p, 'open', 58, 43, PAL.celesteDark);
  } else if (expr === 'lose') {
    brow(p, 'worried', 38, 37, -1, browCol, 2);
    brow(p, 'worried', 58, 37, 1, browCol, 2);
    eye(p, 'worried', 38, 43, PAL.celesteDark);
    eye(p, 'worried', 58, 43, PAL.celesteDark);
  } else {
    brow(p, 'flat', 38, 37, -1, browCol, 2);
    brow(p, 'flat', 58, 37, 1, browCol, 2);
    eye(p, 'open', 38, 43, PAL.celesteDark);
    eye(p, 'open', 58, 43, PAL.celesteDark);
  }
  nose(p, f, 55, 10, 4);
  // Bigote
  p.poly(
    [
      [36, 60],
      [48, 57],
      [60, 60],
      [58, 64],
      [48, 61],
      [38, 64],
    ],
    PAL.beardAuburnDark,
  );
  if (expr === 'win') mouth(p, 'open', 48, 66, 7);
  else if (expr === 'lose') mouth(p, 'frown', 48, 65, 6);
  else mouth(p, 'smirk', 48, 65, 6);

  if (outfit.headFront === helmet) {
    // Casco con cuernos sobre el retrato.
    p.clip = (_x, y) => y < 34;
    p.ellipse(48, 30, 27, 24, PAL.silver);
    p.clip = null;
    p.rect(21, 28, 55, 6, PAL.gold);
    for (const s of [-1, 1]) {
      p.poly(
        [
          [48 + s * 24, 24],
          [48 + s * 32, 14],
          [48 + s * 36, 2],
          [48 + s * 30, 10],
          [48 + s * 22, 18],
        ],
        PAL.white,
      );
    }
  }
  if (expr === 'win') {
    sparkle(p, 12, 30);
    sparkle(p, 86, 30, PAL.celeste);
  }
  if (expr === 'lose') sweat(p, 76, 30);
  p.outline(PAL.ink);
  return p.img;
}

export const elVikingoArt: CharacterArt = {
  id: 'elVikingo',
  build: {
    thigh: 9,
    shin: 8.5,
    torso: 12.5,
    upperArm: 6,
    foreArm: 6,
    shoulderW: 6.8,
    hipW: 4.5,
    belly: 0,
    legW: 3.4,
    armW: 3,
  },
  skin: PAL.skinFair,
  palette,
  heads: {
    front: { rows: front, anchor: [7, 12] },
    frontShout: { rows: frontShout, anchor: [7, 12] },
    back: { rows: back, anchor: [7, 11] },
  },
  outfits: [gris, vikingo],
  racket: { frame: PAL.dark, grip: PAL.wood },
  twoHandedBackhand: true,
  taunt: riff,
  portrait,
};
