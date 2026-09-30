// Utilería de las sedes, dibujada con el pincel: árboles, pileta, playground, casa club, etc.
// Cada función devuelve una imagen chica que se apoya con su borde inferior en el piso.

import { PAL } from './palette';
import { Painter } from './painter';
import type { PixelImage } from './pixelArt';
import { hash2 } from './portraitKit';

export const SCN = {
  grass: '#4f8f45',
  grassLight: '#62a352',
  grassDark: '#3d7336',
  forest: '#3a6334',
  forestLight: '#58874a',
  mulch: '#8a6a45',
  mulchDark: '#6d5236',
  deck: '#d8d2c2',
  deckDark: '#b9b2a0',
  water: '#4aabdc',
  waterLight: '#8fd3f2',
  waterDark: '#2f84b8',
  pine: '#2f5d3a',
  pineDark: '#1f4229',
  pineLight: '#467a4c',
  oak: '#4c8a3e',
  oakDark: '#355f2c',
  oakLight: '#6cae55',
  trunk: '#6b4a2e',
  trunkDark: '#4a3220',
  white: '#f3f1ea',
  stone: '#d9d0bf',
  stoneDark: '#bfb39c',
  hedge: '#2f6b35',
  hedgeLight: '#428a45',
  red: '#c7373b',
  mud: '#6b5a40',
};

/** Pino de Georgia: tronco y copa en capas. h = alto total. */
export function pine(h: number, seed = 0): PixelImage {
  const w = Math.round(h * 0.55);
  const p = new Painter(w + 2, h + 1);
  const cx = (w + 2) / 2;
  p.rect(cx - 1.5, h - Math.round(h * 0.22), 3, Math.round(h * 0.22), SCN.trunk);
  const layers = Math.max(3, Math.round(h / 12));
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const top = Math.round(t * h * 0.55);
    const bottom = Math.round(top + h * 0.35);
    const half = (w / 2) * (0.35 + t * 0.65);
    p.poly(
      [
        [cx, top],
        [cx + half, bottom],
        [cx - half, bottom],
      ],
      (x, y) => {
        const shade = x > cx + 1 ? SCN.pineDark : hash2(x + seed, y) < 0.12 ? SCN.pineLight : SCN.pine;
        return shade;
      },
    );
  }
  p.outline(SCN.pineDark);
  return p.img;
}

/** Roble: copa redonda en grupos. r = radio de la copa. */
export function oak(r: number, seed = 0): PixelImage {
  const w = Math.round(r * 2 + 4);
  const h = Math.round(r * 2.9);
  const p = new Painter(w, h);
  const cx = w / 2;
  const cy = r + 1;
  p.rect(cx - 2, cy + r * 0.4, 4, h - cy - r * 0.4, SCN.trunk);
  p.rect(cx, cy + r * 0.4, 2, h - cy - r * 0.4, SCN.trunkDark);
  const blobs = [
    [0, 0, 1],
    [-0.55, 0.25, 0.65],
    [0.55, 0.25, 0.65],
    [-0.3, -0.35, 0.6],
    [0.35, -0.3, 0.6],
    [0, 0.45, 0.6],
  ];
  for (const [bx, by, br] of blobs) {
    p.ellipse(cx + bx * r, cy + by * r, br * r, br * r * 0.9, (x, y) => {
      const nx = (x - cx) / r;
      const ny = (y - cy) / r;
      if (nx + ny * 0.6 > 0.35) return SCN.oakDark;
      if (nx + ny < -0.6 && hash2(x + seed, y) < 0.5) return SCN.oakLight;
      return hash2(x + seed, y + 7) < 0.1 ? SCN.oakDark : SCN.oak;
    });
  }
  p.outline(SCN.oakDark);
  return p.img;
}

export function bush(w: number, h: number, color = SCN.hedge): PixelImage {
  const p = new Painter(w, h);
  p.ellipse(w / 2, h / 2 + 1, w / 2 - 0.5, h / 2 - 0.5, (x, y) => (hash2(x, y) < 0.2 ? SCN.hedgeLight : color));
  p.outline(SCN.pineDark);
  return p.img;
}

/** Seto prolijo de country club. */
export function hedge(w: number, h: number): PixelImage {
  const p = new Painter(w, h);
  p.rect(0, 2, w, h - 2, SCN.hedge);
  p.rect(0, 2, w, 2, SCN.hedgeLight);
  for (let x = 1; x < w; x += 3) p.set(x, 1, SCN.hedgeLight);
  p.outline(SCN.pineDark);
  return p.img;
}

/** Sombrilla (de pileta o de mesa). */
export function umbrella(color: string, stripe = SCN.white): PixelImage {
  const p = new Painter(22, 22);
  p.rect(10, 7, 2, 15, PAL.grey1);
  p.poly(
    [
      [11, 1],
      [21, 8],
      [1, 8],
    ],
    (x) => (Math.floor(x / 4) % 2 === 0 ? color : stripe),
  );
  p.rect(1, 8, 20, 1, PAL.dark);
  p.outline(PAL.ink);
  return p.img;
}

/** Reposera vista desde arriba en perspectiva. */
export function lounger(): PixelImage {
  const p = new Painter(16, 8);
  p.rect(1, 3, 14, 3, SCN.white);
  p.rect(1, 3, 4, 3, '#e6e1d6');
  p.rect(1, 0, 4, 3, SCN.white);
  p.rect(2, 6, 1, 2, PAL.grey2);
  p.rect(13, 6, 1, 2, PAL.grey2);
  p.outline(PAL.grey1);
  return p.img;
}

/** Silla alta del guardavidas. */
export function lifeguardChair(): PixelImage {
  const p = new Painter(14, 30);
  p.rect(2, 10, 2, 20, SCN.white);
  p.rect(10, 10, 2, 20, SCN.white);
  for (let y = 14; y < 30; y += 4) p.rect(2, y, 10, 1, SCN.white);
  p.rect(1, 8, 12, 3, SCN.red);
  p.rect(2, 0, 10, 8, SCN.red);
  p.rect(3, 1, 8, 2, '#e2585b');
  p.outline(PAL.ink);
  return p.img;
}

export function slide(): PixelImage {
  const p = new Painter(30, 26);
  // Escalera
  p.rect(2, 4, 2, 22, PAL.silver);
  p.rect(7, 4, 2, 22, PAL.silver);
  for (let y = 7; y < 26; y += 4) p.rect(2, y, 7, 1, PAL.silver);
  p.rect(1, 2, 10, 3, '#3d6fd0');
  // Tobogán
  p.line([9, 4], [28, 23], 4, PAL.yellow);
  p.line([9, 4], [28, 23], 1, '#fff08a');
  p.rect(25, 23, 5, 2, PAL.yellowDark);
  p.outline(PAL.ink);
  return p.img;
}

export function swings(): PixelImage {
  const p = new Painter(34, 26);
  p.line([2, 25], [7, 2], 2, SCN.red);
  p.line([12, 25], [7, 2], 2, SCN.red);
  p.line([22, 25], [27, 2], 2, SCN.red);
  p.line([32, 25], [27, 2], 2, SCN.red);
  p.rect(6, 1, 23, 2, SCN.red);
  for (const x of [13, 21]) {
    p.rect(x, 3, 1, 14, PAL.grey2);
    p.rect(x + 3, 3, 1, 14, PAL.grey2);
    p.rect(x - 1, 17, 6, 2, PAL.dark);
  }
  p.outline(PAL.ink);
  return p.img;
}

export function bench(): PixelImage {
  const p = new Painter(18, 8);
  p.rect(0, 0, 18, 2, '#8c5a2e');
  p.rect(0, 3, 18, 2, '#8c5a2e');
  p.rect(1, 5, 2, 3, PAL.dark);
  p.rect(15, 5, 2, 3, PAL.dark);
  p.outline(PAL.ink);
  return p.img;
}

/** Casa club blanca con columnas y toldos. */
export function clubhouse(w: number, h: number, awning = SCN.red): PixelImage {
  const p = new Painter(w, h);
  const roofH = Math.round(h * 0.28);
  p.poly(
    [
      [4, roofH],
      [w / 2, 1],
      [w - 4, roofH],
    ],
    '#7a3b2e',
  );
  p.rect(2, roofH, w - 4, 3, '#5e2c22');
  p.rect(4, roofH + 3, w - 8, h - roofH - 3, SCN.white);
  p.rect(4, h - 3, w - 8, 3, SCN.stoneDark);
  for (let x = 10; x < w - 10; x += 16) {
    p.rect(x, roofH + 12, 3, h - roofH - 15, '#e4e0d4');
    p.rect(x + 5, roofH + 16, 7, 10, '#4a6a88');
    p.rect(x + 5, roofH + 11, 7, 4, awning);
    for (let s = 0; s < 7; s += 2) p.set(x + 5 + s, roofH + 14, SCN.white);
  }
  p.rect(w / 2 - 6, h - 16, 12, 13, '#6b4a2e');
  p.outline(PAL.ink);
  return p.img;
}

/** Mesa redonda con sombrilla (patio de St. Regis). */
export function patioTable(): PixelImage {
  const p = new Painter(22, 30);
  const u = umbrella('#2f6b8a', SCN.white);
  p.paste(u, 0, 0);
  p.ellipse(11, 24, 8, 2.5, SCN.white);
  p.rect(10, 25, 2, 5, PAL.grey2);
  p.rect(1, 25, 3, 4, '#8c5a2e');
  p.rect(18, 25, 3, 4, '#8c5a2e');
  return p.img;
}

/** Poste de luz de la cancha. lit = encendido. */
export function lightPole(lit: boolean): PixelImage {
  const p = new Painter(16, 60);
  p.rect(7, 8, 2, 52, PAL.grey1);
  p.rect(2, 2, 12, 7, PAL.dark);
  p.rect(3, 3, 10, 4, lit ? '#fff4b0' : PAL.grey2);
  if (lit) for (const x of [4, 7, 10]) p.set(x, 4, PAL.white);
  p.outline(PAL.ink);
  return p.img;
}

export function flowerBed(w: number): PixelImage {
  const p = new Painter(w, 6);
  p.rect(0, 1, w, 5, '#5a3e2a');
  for (let x = 1; x < w - 1; x += 2) p.set(x, 2 + (x % 3), (x * 7) % 3 === 0 ? PAL.pink : x % 5 === 0 ? PAL.yellow : SCN.red);
  p.outline(PAL.ink);
  return p.img;
}

export function kayak(color: string): PixelImage {
  const p = new Painter(26, 10);
  p.ellipse(13, 6, 12, 2.5, color);
  p.ellipse(13, 6, 3, 1.5, PAL.dark);
  // Remador
  p.rect(12, 1, 3, 5, PAL.celesteDark);
  p.ellipse(13.5, 1, 1.5, 1.5, PAL.skinWarm);
  p.line([5, 8], [22, 0], 1, PAL.wood);
  p.outline(PAL.ink);
  return p.img;
}

export function reeds(): PixelImage {
  const p = new Painter(12, 14);
  for (let i = 0; i < 6; i++) {
    const x = 1 + i * 2;
    p.line([x, 14], [x + (i % 2 ? 1 : -1), 3 + (i % 3) * 2], 1, i % 2 ? '#5f7a3a' : '#7a9448');
  }
  p.rect(2, 2, 2, 3, '#6b4a2e');
  p.rect(8, 4, 2, 3, '#6b4a2e');
  return p.img;
}

export function rock(w: number): PixelImage {
  const p = new Painter(w, Math.round(w * 0.6));
  p.ellipse(w / 2, w * 0.35, w / 2 - 0.5, w * 0.28, (_x, y) => (y < w * 0.25 ? '#9a978f' : '#77746c'));
  p.outline(PAL.ink);
  return p.img;
}

export function soccerBall(): PixelImage {
  const p = new Painter(7, 7);
  p.ellipse(3.5, 3.5, 3.2, 3.2, SCN.white);
  p.rect(3, 2, 2, 2, PAL.ink);
  p.set(1, 4, PAL.ink);
  p.set(5, 5, PAL.ink);
  p.outline(PAL.ink);
  return p.img;
}

export function pineCone(): PixelImage {
  const p = new Painter(6, 8);
  p.ellipse(3, 4.5, 2.5, 3.5, '#7a5230');
  for (const [x, y] of [
    [2, 3],
    [4, 4],
    [2, 6],
    [4, 6],
  ])
    p.set(x, y, '#4a3018');
  p.outline(PAL.ink);
  return p.img;
}

export function pickleball(): PixelImage {
  const p = new Painter(5, 5);
  p.ellipse(2.5, 2.5, 2.3, 2.3, '#f2e23a');
  p.set(2, 2, PAL.dark);
  p.set(3, 3, PAL.dark);
  p.outline(PAL.ink);
  return p.img;
}

/** Ardilla con la cola parada. */
export function squirrel(): PixelImage {
  const p = new Painter(12, 10);
  p.ellipse(3, 4, 3, 4, '#8a6a4a');
  p.ellipse(3.5, 4, 1.5, 2.5, '#a8876a');
  p.ellipse(8, 7, 3, 2.2, '#7a5a3c');
  p.ellipse(10.5, 5, 1.6, 1.6, '#7a5a3c');
  p.set(11, 4, PAL.ink);
  p.set(10, 3, '#7a5a3c');
  p.outline(PAL.ink);
  return p.img;
}

/** Ciervo mirando con desdén. */
export function deer(): PixelImage {
  const p = new Painter(26, 26);
  p.ellipse(12, 15, 8, 4, '#9a6a3e');
  p.ellipse(12, 16.5, 6, 2, '#c49a6c');
  for (const x of [6, 9, 15, 18]) p.rect(x, 18, 1.5, 8, '#7a522e');
  p.line([18, 13], [21, 6], 3, '#9a6a3e');
  p.ellipse(22, 5, 2.5, 2, '#9a6a3e');
  p.set(23, 4, PAL.ink);
  // "Desdén": párpado a media asta.
  p.set(22, 4, '#7a522e');
  p.line([21, 3], [19, 0], 1, '#6b4a2e');
  p.line([23, 3], [25, 0], 1, '#6b4a2e');
  p.set(4, 13, SCN.white);
  p.outline(PAL.ink);
  return p.img;
}

/** Ganso canadiense chico (de fondo, en la sede del Boss). */
export function goose(): PixelImage {
  const p = new Painter(14, 12);
  p.ellipse(6, 8, 5, 3, '#8a7a66');
  p.ellipse(5, 9, 3.5, 1.5, '#cbbfaa');
  p.rect(10, 2, 2, 7, PAL.ink);
  p.ellipse(11.5, 2, 1.8, 1.4, PAL.ink);
  p.set(11, 2, PAL.white);
  p.rect(1, 7, 2, 2, PAL.ink);
  p.rect(5, 11, 1, 1, PAL.ink);
  p.rect(8, 11, 1, 1, PAL.ink);
  p.outline(PAL.ink);
  return p.img;
}

/** Bandeja con limonadas (para el mozo). */
export function lemonadeTray(): PixelImage {
  const p = new Painter(12, 6);
  p.rect(0, 4, 12, 2, PAL.silver);
  for (const x of [1, 5, 9]) {
    p.rect(x, 0, 2, 4, '#f7ef9a');
    p.set(x, 0, SCN.white);
  }
  return p.img;
}

/** Cañón de agua: salpicadura de la bomba en la pileta. */
export function splash(): PixelImage {
  const p = new Painter(20, 18);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    p.line([10, 17], [10 + Math.cos(a) * 9, 17 + Math.sin(a) * 15], 2, i % 2 ? SCN.waterLight : SCN.white);
  }
  return p.img;
}
