// Extras de las sedes (jubilados de la cancha de al lado, chicos, guardavidas, pickleballers, mozo...).
// Usan el mismo esqueleto que los protagonistas, con cabezas genéricas.

import { PAL } from './palette';
import { Painter } from './painter';
import { STANDARD_BUILD, type Build } from './body';
import type { CharacterArt, HeadGrid, Outfit } from './characters/types';

// Cabezas genéricas: h = pelo, c = gorra/visera, s = piel, z = sombra, e = ojo, m = boca.
const HEAD_SHORT_FRONT = [
  '...oooooooo...',
  '..ohhhhhhhhoo.',
  '.ohhhhhhhhhhho',
  '.ohhsssssshhho',
  '.ohssssssssso.',
  '.osseessseeso.',
  '.ozsssssssszo.',
  '.ozssssnssszo.',
  '.ozsssmmmsszo.',
  '..ozsssssszo..',
  '...ozzzzzzo...',
  '....ozzzzo....',
  '....ozzzzo....',
];
const HEAD_SHORT_BACK = [
  '...oooooooo...',
  '..ohhhhhhhhoo.',
  '.ohhhhhhhhhhho',
  '.ohhhhhhhhhhho',
  '.ohhhhhhhhhho.',
  '.oshhhhhhhhso.',
  '.oshhhhhhhhso.',
  '.ozhhhhhhhhzo.',
  '..ozhhhhhhzo..',
  '..ozzzzzzzzo..',
  '...ozzzzzzo...',
  '....ozzzzo....',
  '....ozzzzo....',
];
// Pelado con canas a los costados (jubilados).
const HEAD_BALD_FRONT = HEAD_SHORT_FRONT.map((r, i) => (i < 3 ? r.replace(/h/g, 's') : r));
const HEAD_BALD_BACK = HEAD_SHORT_BACK.map((r, i) => (i < 4 ? r.replace(/h/g, 's') : r));
// Visera de pickleball.
const HEAD_VISOR_FRONT = [
  '...oooooooo...',
  '..ohhhhhhhhoo.',
  '.occccccccccco',
  'occccccccccco.',
  ...HEAD_SHORT_FRONT.slice(4),
];
const HEAD_VISOR_BACK = ['...oooooooo...', '..ohhhhhhhhoo.', '.occccccccccco', '.ohhhhhhhhhhho', ...HEAD_SHORT_BACK.slice(4)];
// Gorra (entrenador).
const HEAD_CAP_FRONT = ['...oooooooo...', '..occcccccco..', '.occcccccccco.', 'occcccccccccco', ...HEAD_SHORT_FRONT.slice(4)];
const HEAD_CAP_BACK = ['...oooooooo...', '..occcccccco..', '.occcccccccco.', '.occcccccccco.', ...HEAD_SHORT_BACK.slice(4)];

const HEADS = {
  short: [HEAD_SHORT_FRONT, HEAD_SHORT_BACK],
  bald: [HEAD_BALD_FRONT, HEAD_BALD_BACK],
  visor: [HEAD_VISOR_FRONT, HEAD_VISOR_BACK],
  cap: [HEAD_CAP_FRONT, HEAD_CAP_BACK],
};

export interface NpcSpec {
  id: string;
  head: keyof typeof HEADS;
  skin: string;
  shade: string;
  hair: string;
  cap?: string;
  shirt: string;
  collar?: string;
  shorts: string;
  longPants?: boolean;
  shoes?: string;
  build?: Partial<Build>;
  racket?: { frame: string; grip: string };
  noRacket?: boolean;
}

const emptyPortrait = () => new Painter(1, 1).img;

export function makeNpc(s: NpcSpec): CharacterArt {
  const [front, back] = HEADS[s.head];
  const head = (rows: string[]): HeadGrid => ({ rows, anchor: [7, 11] });
  const outfit: Outfit = {
    id: 'npc',
    shirt: (_u, v) => (v < 1.2 && s.collar ? s.collar : s.shirt),
    sleeve: s.shirt,
    shorts: s.shorts,
    longPants: s.longPants,
    socks: PAL.white,
    shoes: s.shoes ?? PAL.grey3,
  };
  return {
    id: s.id,
    build: { ...STANDARD_BUILD, ...s.build },
    skin: s.skin,
    palette: { o: PAL.ink, h: s.hair, c: s.cap ?? s.hair, s: s.skin, z: s.shade, e: PAL.ink, m: PAL.mouth, n: s.shade },
    heads: { front: head(front), back: head(back) },
    outfits: [outfit],
    racket: s.racket ?? { frame: PAL.grey2, grip: PAL.dark },
    noRacket: s.noRacket,
    portrait: emptyPortrait,
  };
}

const KID: Partial<Build> = { thigh: 4.5, shin: 4.5, torso: 8, upperArm: 4, foreArm: 4, shoulderW: 4, hipW: 3.5, legW: 2.6, armW: 2.2 };

export const NPCS: Record<string, CharacterArt> = {
  jubilado1: makeNpc({
    id: 'jubilado1',
    head: 'bald',
    skin: PAL.skinFair,
    shade: PAL.skinFairShadow,
    hair: '#d8d4cc',
    shirt: PAL.white,
    collar: PAL.navy,
    shorts: '#c9b68e',
    build: { belly: 1.5 },
  }),
  jubilado2: makeNpc({
    id: 'jubilado2',
    head: 'short',
    skin: PAL.skinWarm,
    shade: PAL.skinWarmShadow,
    hair: '#e6e2da',
    shirt: '#9ec5e8',
    shorts: PAL.white,
  }),
  chico1: makeNpc({ id: 'chico1', head: 'short', skin: PAL.skinFair, shade: PAL.skinFairShadow, hair: PAL.hairBrown, shirt: PAL.red, shorts: PAL.denim, build: KID, noRacket: true }),
  chico2: makeNpc({ id: 'chico2', head: 'short', skin: PAL.skinOlive, shade: PAL.skinOliveShadow, hair: PAL.hairBlack, shirt: PAL.hiVis, shorts: PAL.navy, build: KID, noRacket: true }),
  guardavidas: makeNpc({
    id: 'guardavidas',
    head: 'short',
    skin: PAL.skinWarm,
    shade: PAL.skinWarmShadow,
    hair: PAL.hairDarkBlond,
    shirt: PAL.red,
    shorts: PAL.red,
    noRacket: true,
  }),
  entrenador: makeNpc({
    id: 'entrenador',
    head: 'cap',
    skin: PAL.skinFair,
    shade: PAL.skinFairShadow,
    hair: PAL.hairDarkBrown,
    cap: PAL.navy,
    shirt: PAL.navy,
    shorts: PAL.grey2,
  }),
  pickle1: makeNpc({
    id: 'pickle1',
    head: 'visor',
    skin: PAL.skinFair,
    shade: PAL.skinFairShadow,
    hair: '#c9a878',
    cap: PAL.white,
    shirt: PAL.pink,
    shorts: PAL.white,
    racket: { frame: '#e0503a', grip: PAL.dark },
  }),
  pickle2: makeNpc({
    id: 'pickle2',
    head: 'visor',
    skin: PAL.skinOlive,
    shade: PAL.skinOliveShadow,
    hair: PAL.hairBlack,
    cap: PAL.hiVis,
    shirt: '#7ad0c0',
    shorts: PAL.navy,
    racket: { frame: '#3a78d0', grip: PAL.dark },
  }),
  mozo: makeNpc({
    id: 'mozo',
    head: 'short',
    skin: PAL.skinWarm,
    shade: PAL.skinWarmShadow,
    hair: PAL.hairBlack,
    shirt: PAL.white,
    collar: PAL.ink,
    shorts: PAL.ink,
    longPants: true,
    shoes: PAL.ink,
    noRacket: true,
  }),
};

/** Nadador: cabeza con gorra y brazos saliendo del agua. frame 0/1. */
export function drawSwimmer(frame: number, cap: string): import('./pixelArt').PixelImage {
  const p = new Painter(16, 8);
  p.ellipse(8, 4, 2.5, 2.2, cap);
  p.set(8, 3, PAL.white);
  if (frame === 0) {
    p.line([5, 5], [1, 1], 2, PAL.skinFair);
    p.line([11, 5], [14, 6], 2, PAL.skinFair);
  } else {
    p.line([5, 5], [2, 6], 2, PAL.skinFair);
    p.line([11, 5], [15, 1], 2, PAL.skinFair);
  }
  p.rect(0, 6, 16, 1, '#b8e4f8');
  return p.img;
}
