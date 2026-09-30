// TRUE TINCHO: pelo negro corto, cara delgada y seria, barba de pocos días y anteojos de sol
// negros SIEMPRE puestos. Remera blanca con detalles celestes (Racing, emblema geométrico genérico).
// Accesorio: mate con bombilla. Gag: cuando gana sonríe exactamente un píxel.

import { PAL } from '../palette';
import type { Pose } from '../body';
import { ears, face, neck, newPortrait, nose, shoulders, stubbleFill, sweat, type Face } from '../portraitKit';
import type { Painter } from '../painter';
import type { CharacterArt, Outfit } from './types';

const palette = {
  o: PAL.ink,
  h: PAL.hairBlack,
  k: PAL.hairBlackHi,
  s: PAL.skinOlive,
  z: PAL.skinOliveShadow,
  n: PAL.skinOliveShadow,
  t: '#b08462',
  l: '#131116',
  L: '#5c7394',
  m: PAL.mouth,
};

const front = [
  '.....oooo.....',
  '...oohkkhoo...',
  '..ohhhhhhhho..',
  '..ohhhhhhhho..',
  '..ohssssssho..',
  '..osssssssso..',
  '.ollllllllllo.',
  '.olLllllllLlo.',
  '..olllsslllo..',
  '..ozsssnsszo..',
  '..otsoooosto..',
  '..otttttttto..',
  '...otttttto...',
  '....ozzzzo....',
  '....ozzzzo....',
];

const back = [
  '.....oooo.....',
  '...oohhhhoo...',
  '..ohhhkhhhho..',
  '..ohhhhhhhho..',
  '..ohhhhhhhho..',
  '.oshhhhhhhhso.',
  '.olhhhhhhhhlo.',
  '..ohhhhhhhho..',
  '..ozhhhhhhzo..',
  '..ozzzzzzzzo..',
  '...ozzzzzzo...',
  '....ozzzzo....',
  '....ozzzzo....',
  '....ozzzzo....',
  '....oooooo....',
];

const racing: Outfit = {
  id: 'racing',
  shirt: (u, v, view) => {
    if (v < 1.2) return PAL.celeste;
    if (Math.abs(u) > 4 && v < 2.5) return PAL.celeste;
    // Emblema geométrico genérico (rombo celeste) en el pecho izquierdo.
    if (view === 'front' && Math.abs(u + 3) + Math.abs(v - 4) < 1.6) return PAL.celesteDark;
    return PAL.white;
  },
  sleeve: PAL.white,
  shorts: PAL.navy,
  socks: PAL.white,
  shoes: PAL.grey4,
};

const rayas: Outfit = {
  id: 'rayas',
  shirt: (u, v) => (v < 1.2 ? PAL.white : Math.floor((u + 100) / 2.5) % 2 === 0 ? PAL.celeste : PAL.white),
  sleeve: PAL.celeste,
  shorts: PAL.navy,
  socks: PAL.white,
  shoes: PAL.grey4,
};

const mate: Pose[] = [
  { armR: [10, 5], racket: 6, armL: [-15, 110], armLBehind: true, prop: { kind: 'mate', hand: 'L', angle: 0 } },
  { armR: [10, 5], racket: 6, armL: [-10, 150], armLBehind: true, prop: { kind: 'mate', hand: 'L', angle: 0 } },
  { armR: [10, 5], racket: 6, armL: [-8, 165], armLBehind: true, headDy: -1, prop: { kind: 'mate', hand: 'L', angle: 0 } },
  { armR: [10, 5], racket: 6, armL: [-10, 150], armLBehind: true, prop: { kind: 'mate', hand: 'L', angle: 0 } },
];

function mateProp(p: Painter, x: number, y: number): void {
  // Mate azul oscuro con virola dorada y bombilla plateada (sin escudos).
  p.ellipse(x, y + 6, 8, 9, PAL.blueDark);
  p.rect(x - 8, y - 2, 17, 5, PAL.blueDark);
  p.ellipse(x - 3, y + 5, 2, 5, PAL.blue);
  p.rect(x - 8, y - 4, 17, 3, PAL.gold);
  p.rect(x - 7, y - 4, 4, 1, PAL.white);
  p.line([x + 2, y - 4], [x + 7, y - 18], 2, PAL.silver);
  p.line([x + 7, y - 18], [x + 9, y - 19], 2, PAL.silver);
}

function portrait(expr: 'normal' | 'win' | 'lose', outfit: Outfit) {
  const p = newPortrait();
  const f: Face = { cx: 48, cy: 43, rx: 19, ry: 28, jaw: 0.72, chinY: 76, skin: PAL.skinOlive, shade: PAL.skinOliveShadow };
  shoulders(
    p,
    f,
    (u, v) => {
      if (outfit.id === 'rayas') return v < 3 && Math.abs(u) < 12 ? PAL.white : Math.floor((u + 200) / 7) % 2 === 0 ? PAL.celeste : PAL.white;
      if (v < 3 && Math.abs(u) < 12) return PAL.celeste;
      if (Math.abs(u + 20) + Math.abs(v - 10) < 5) return PAL.celesteDark;
      return PAL.white;
    },
    40,
    79,
  );
  neck(p, f, 9);
  ears(p, f, 46);
  face(p, f);
  p.poly(
    [
      [30, 54],
      [32, 66],
      [38, 73],
      [48, 78],
      [58, 73],
      [64, 66],
      [66, 54],
      [60, 60],
      [48, 61],
      [36, 60],
    ],
    stubbleFill(PAL.skinOlive, '#8e6a52'),
  );
  // Pelo negro corto, con puntitas arriba.
  p.poly(
    [
      [29, 38],
      [28, 24],
      [32, 14],
      [40, 9],
      [48, 7],
      [56, 9],
      [64, 14],
      [68, 24],
      [67, 38],
      [64, 28],
      [56, 25],
      [48, 26],
      [40, 25],
      [32, 28],
    ],
    PAL.hairBlack,
  );
  // Arriba, algo despeinado: unos mechoncitos cortos y brillos.
  for (const [x, y] of [
    [38, 9],
    [45, 7],
    [53, 7],
    [60, 10],
  ]) {
    p.ellipse(x, y, 3, 2, PAL.hairBlack);
    p.set(x - 1, y + 3, PAL.hairBlackHi);
  }
  for (const [x, y] of [
    [36, 17],
    [44, 14],
    [52, 15],
    [60, 18],
  ])
    p.thin([x, y], [x + 3, y - 2], PAL.hairBlackHi);
  // Anteojos negros envolventes, con reflejo.
  p.poly(
    [
      [26, 38],
      [70, 38],
      [70, 45],
      [63, 51],
      [54, 51],
      [50, 45],
      [46, 45],
      [42, 51],
      [33, 51],
      [26, 45],
    ],
    '#131116',
  );
  p.rect(26, 38, 45, 2, PAL.ink);
  for (const x of [33, 57]) {
    p.thin([x, 47], [x + 5, 41], '#5c7394');
    p.thin([x + 2, 48], [x + 7, 42], '#39465c');
  }
  nose(p, f, 60, 12, 4);

  // Boca: seria. Ganando, sonríe exactamente un píxel.
  p.rect(42, 68, 13, 1, PAL.ink);
  p.rect(44, 69, 9, 1, PAL.mouth);
  if (expr === 'win') {
    // Un solo píxel de la comisura sube. Ni uno más.
    p.set(54, 68, PAL.skinOlive);
    p.set(54, 67, PAL.ink);
  }
  if (expr === 'lose') sweat(p, 72, 30);

  mateProp(p, 20, 80);
  p.outline(PAL.ink);
  return p.img;
}

export const trueTinchoArt: CharacterArt = {
  id: 'trueTincho',
  build: {
    thigh: 9,
    shin: 8.5,
    torso: 12.5,
    upperArm: 6,
    foreArm: 6,
    shoulderW: 5.5,
    hipW: 4.2,
    belly: 0,
    legW: 3.1,
    armW: 2.5,
  },
  skin: PAL.skinOlive,
  palette,
  heads: {
    front: { rows: front, anchor: [7, 12] },
    back: { rows: back, anchor: [7, 11] },
  },
  outfits: [racing, rayas],
  racket: { frame: PAL.celesteDark, grip: PAL.ink },
  taunt: mate,
  portrait,
};
