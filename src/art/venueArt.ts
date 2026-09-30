// Escenografía de cada sede: se pinta una sola vez por partido, píxel a píxel, con la misma
// perspectiva que la cancha (el piso sale de "desproyectar" cada píxel de la pantalla).

import { COURT } from '../logic/court';
import { SCREEN_H, SCREEN_W, depthOf, project, unproject } from '../game/projection';
import { VENUES, type VenueId } from '../sim/venues';
import { PAL } from './palette';
import { Painter } from './painter';
import type { PixelImage } from './pixelArt';
import { hash2 } from './portraitKit';
import {
  SCN,
  bench,
  bush,
  clubhouse,
  flowerBed,
  hedge,
  lifeguardChair,
  lightPole,
  lounger,
  oak,
  patioTable,
  pine,
  reeds,
  rock,
  slide,
  swings,
  umbrella,
} from './props';

export interface VenuePaint {
  background: PixelImage;
  /** Capa de luz arriba de todo (rayos de sol, atardecer), semitransparente. */
  overlay: PixelImage | null;
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c: RGB) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const shadeHex = (h: string, k: number) => toHex(hex(h).map((v) => v * k) as RGB);

interface CourtSpec {
  cx: number;
  cy: number;
  inner: string;
  outer: string;
  runX: number;
  runY: number;
  kind: 'tennis' | 'pickleball';
}

interface Prop {
  img: PixelImage;
  x: number;
  y: number;
}

/** Qué color tiene el piso en un punto del mundo (fuera de las canchas). */
type Terrain = (x: number, y: number, sx: number, sy: number) => string;

// ---------------------------------------------------------------- piezas comunes

function inCourt(c: CourtSpec, x: number, y: number): 'inner' | 'outer' | null {
  const dx = Math.abs(x - c.cx);
  const dy = Math.abs(y - c.cy);
  if (dx > c.runX || dy > c.runY) return null;
  if (c.kind === 'tennis') return dx <= COURT.doublesHalfWidth && dy <= COURT.halfLength ? 'inner' : 'outer';
  return dx <= 3.05 && dy <= 6.7 ? 'inner' : 'outer';
}

function paintGround(p: Painter, courts: CourtSpec[], terrain: Terrain, noise: number): void {
  for (let sy = 0; sy < SCREEN_H; sy++) {
    for (let sx = 0; sx < SCREEN_W; sx++) {
      const w = unproject(sx + 0.5, sy + 0.5);
      let col: string | null = null;
      for (const c of courts) {
        const k = inCourt(c, w.x, w.y);
        if (k) {
          col = k === 'inner' ? c.inner : c.outer;
          break;
        }
      }
      if (!col) col = terrain(w.x, w.y, sx, sy);
      const n = 1 + (hash2(sx, sy) - 0.5) * noise;
      p.set(sx, sy, shadeHex(col, n));
    }
  }
}

function plotLine(p: Painter, color: string) {
  // Horizontal (y constante): una fila; vertical (x constante): un píxel por fila.
  const h = (yw: number, x0: number, x1: number) => {
    const a = project(x0, yw);
    const b = project(x1, yw);
    const row = Math.floor(a.sy);
    for (let sx = Math.floor(Math.min(a.sx, b.sx)); sx <= Math.floor(Math.max(a.sx, b.sx)); sx++) p.set(sx, row, color);
  };
  const v = (xw: number, y0: number, y1: number) => {
    const a = project(xw, Math.min(y0, y1));
    const b = project(xw, Math.max(y0, y1));
    for (let sy = Math.floor(a.sy); sy <= Math.floor(b.sy); sy++) {
      const w = unproject(0, sy + 0.5);
      p.set(project(xw, w.y).sx, sy, color);
    }
  };
  return { h, v };
}

function courtLines(p: Painter, c: CourtSpec, color: string): void {
  const { h, v } = plotLine(p, color);
  const { cx, cy } = c;
  if (c.kind === 'tennis') {
    const L = COURT.halfLength;
    const S = COURT.serviceLine;
    const sw = COURT.singlesHalfWidth;
    const dw = COURT.doublesHalfWidth;
    for (const s of [-1, 1]) {
      h(cy + s * L, cx - dw, cx + dw);
      h(cy + s * S, cx - sw, cx + sw);
      v(cx + s * dw, cy - L, cy + L);
      v(cx + s * sw, cy - L, cy + L);
    }
    v(cx, cy - S, cy + S);
    v(cx, cy - L, cy - L + 0.25);
    v(cx, cy + L - 0.25, cy + L);
  } else {
    // Pickleball: 6,1 × 13,4 m, con "cocina" a 2,13 m de la red.
    const L = 6.7;
    const W = 3.05;
    const K = 2.13;
    for (const s of [-1, 1]) {
      h(cy + s * L, cx - W, cx + W);
      h(cy + s * K, cx - W, cx + W);
      v(cx + s * W, cy - L, cy + L);
      v(cx, cy + s * K, cy + s * L);
    }
    // Red baja del pickleball.
    const a = project(cx - W - 0.2, cy);
    const b = project(cx + W + 0.2, cy);
    const top = Math.round(a.sy - 8);
    for (let sx = Math.floor(a.sx); sx <= Math.floor(b.sx); sx++) {
      p.set(sx, top, PAL.white);
      for (let y = top + 1; y < a.sy; y++) if ((sx + y) % 2 === 0) p.blend(sx, y, PAL.ink, 0.6);
    }
  }
}

/** Alambrado o lona sobre un tramo recto del piso (plano vertical). */
function fence(p: Painter, x0: number, y0: number, x1: number, y1: number, height: number, style: 'mesh' | 'screen'): void {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.05);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const g = project(x, y);
    const top = project(x, y, height);
    const sx = Math.floor(g.sx);
    const post = Math.abs(((x0 === x1 ? y : x) + 100) % 3) < 0.08;
    for (let sy = Math.floor(top.sy); sy <= Math.floor(g.sy); sy++) {
      if (post) p.set(sx, sy, '#2a3a2e');
      else if (style === 'screen') p.blend(sx, sy, '#1f4a33', 0.92);
      else if ((sx + sy) % 3 === 0) p.blend(sx, sy, '#27352c', 0.55);
    }
    p.set(sx, Math.floor(top.sy), '#2a3a2e');
  }
}

function placeProps(p: Painter, props: Prop[]): void {
  props.sort((a, b) => a.y - b.y);
  for (const pr of props) {
    const g = project(pr.x, pr.y);
    p.paste(pr.img, Math.round(g.sx - pr.img.w / 2), Math.round(g.sy - pr.img.h));
  }
}

/** Árbol del tamaño que corresponde a la distancia (más lejos, más chico). */
function treeAt(x: number, y: number, kind: 'pine' | 'oak', size: number, seed: number): Prop {
  const k = (22 / depthOf(y)) * 3.2;
  const img = kind === 'pine' ? pine(Math.round(size * k), seed) : oak(Math.round(size * k * 0.42), seed);
  return { img, x, y };
}

function rowOfTrees(props: Prop[], y0: number, x0: number, x1: number, step: number, seed: number, mix = 0.5): void {
  for (let x = x0, i = 0; x <= x1; x += step, i++) {
    const jx = (hash2(i, seed) - 0.5) * step * 0.6;
    const jy = hash2(seed, i) * 4;
    const kind = hash2(i * 3, seed + 1) < mix ? 'pine' : 'oak';
    props.push(treeAt(x + jx, y0 - jy, kind, kind === 'pine' ? 26 + hash2(i, 7) * 10 : 30 + hash2(i, 9) * 8, seed + i));
  }
}

function water(x: number, y: number, sx: number, sy: number): string {
  // Reflejos finitos y alargados, no manchas.
  const wave = Math.sin(y * 2.7 + Math.sin(x * 1.3) * 1.5);
  if (wave > 0.94 && hash2(sx, sy) < 0.7) return SCN.waterLight;
  if (Math.sin(y * 2.1 - x * 0.8) > 0.985) return SCN.waterDark;
  return SCN.water;
}

// ---------------------------------------------------------------- las sedes

function breckenridge(): VenuePaint {
  const p = new Painter(SCREEN_W, SCREEN_H);
  const courts: CourtSpec[] = [
    { cx: 0, cy: 0, inner: '#3b6db5', outer: '#3f8f5c', runX: 8.2, runY: 17.1, kind: 'tennis' },
    { cx: 17.5, cy: 0, inner: '#3b6db5', outer: '#3f8f5c', runX: 8.2, runY: 17.1, kind: 'tennis' },
  ];
  paintGround(
    p,
    courts,
    (x, y, sx, sy) => {
      if (x > 8.2 && x < 9.3 && Math.abs(y) < 17.1) return '#3f8f5c';
      // Pileta a la izquierda (cerca) con su deck.
      if (x < -10.8 && x > -40 && y > 1 && y < 22) {
        if (x < -11.6 && y > 2.6 && y < 20.5) return water(x, y, sx, sy);
        return SCN.deck;
      }
      // Playground a la izquierda (lejos).
      if (x < -10.2 && y < -4 && y > -27) return (hash2(sx, sy) < 0.3 ? SCN.mulchDark : SCN.mulch);
      if (x < -9.6 && x > -10.4) return SCN.deckDark; // senderito
      return Math.floor((y + 100) / 3) % 2 === 0 ? SCN.grass : SCN.grassLight;
    },
    0.06,
  );
  for (const c of courts) courtLines(p, c, SCN.white);
  fence(p, -8.9, -18.4, 8.9, -18.4, 3, 'mesh');
  fence(p, -8.9, -18.4, -8.9, 17.1, 3, 'mesh');
  fence(p, 26.2, -18.4, 8.9, -18.4, 3, 'mesh');

  const props: Prop[] = [];
  rowOfTrees(props, -19.8, -34, 34, 5, 11, 0.45);
  rowOfTrees(props, -22, -34, 34, 6, 12, 0.5);
  props.push({ img: slide(), x: -15, y: -15 });
  props.push({ img: swings(), x: -19, y: -8 });
  props.push({ img: bench(), x: -11.5, y: -20 });
  props.push({ img: bush(18, 10), x: -12, y: -24 });
  for (const y of [4.5, 8.5, 12.5]) props.push({ img: lounger(), x: -10.9, y });
  props.push({ img: umbrella(SCN.red), x: -11.0, y: 6.3 });
  props.push({ img: umbrella('#e8a13a'), x: -11.0, y: 10.4 });
  props.push({ img: lifeguardChair(), x: -11.1, y: 15.5 });
  placeProps(p, props);
  return { background: p.img, overlay: null };
}

function springRidge(): VenuePaint {
  const p = new Painter(SCREEN_W, SCREEN_H);
  const clay = '#4d8a5c';
  const courts: CourtSpec[] = [{ cx: 0, cy: 0, inner: clay, outer: '#4a8458', runX: 8.2, runY: 17.1, kind: 'tennis' }];
  paintGround(
    p,
    courts,
    (x, y, sx, sy) => {
      // Pileta olímpica a la derecha.
      if (x > 9.6 && y > -19 && y < 19) {
        if (x > 11 && y > -16.5 && y < 16.5) {
          // Andariveles: líneas oscuras en el fondo y corcheras rojiblancas.
          const lane = (x - 11) % 2.5;
          if (lane < 0.12) return (Math.floor((y + 50) * 2) % 2 === 0 ? SCN.red : SCN.white);
          if (Math.abs(lane - 1.25) < 0.08) return SCN.waterDark;
          return water(x, y, sx, sy);
        }
        return SCN.deck;
      }
      // Piso de bosque con agujas de pino y luz filtrada.
      const light = Math.sin(x * 0.35 + y * 0.2) + Math.sin(y * 0.5 - x * 0.15);
      if (hash2(sx, sy) < 0.08) return '#6b5a3a';
      return light > 1.1 ? SCN.forestLight : SCN.forest;
    },
    0.08,
  );
  // Manchitas de polvo de ladrillo en la cancha.
  for (let i = 0; i < 900; i++) {
    const x = (hash2(i, 1) - 0.5) * 16;
    const y = (hash2(i, 2) - 0.5) * 34;
    const s = project(x, y);
    p.blend(s.sx, s.sy, '#6fa37a', 0.5);
  }
  courtLines(p, courts[0], '#e8efe6');
  fence(p, -8.9, -18.4, 8.9, -18.4, 3, 'screen');
  fence(p, -8.9, -18.4, -8.9, 17.1, 3, 'mesh');
  fence(p, 8.9, -18.4, 8.9, 17.1, 3, 'mesh');

  const props: Prop[] = [];
  // Muy boscosa: pinos y robles de Georgia por todos lados.
  rowOfTrees(props, -19.4, -36, 36, 2.8, 21, 0.7);
  rowOfTrees(props, -21.5, -36, 36, 3.2, 22, 0.7);
  rowOfTrees(props, -23.5, -36, 36, 3.6, 23, 0.6);
  for (let y = -17; y <= 22; y += 2.4) {
    props.push(treeAt(-10.6 - hash2(y, 3) * 2, y, hash2(y, 4) < 0.6 ? 'pine' : 'oak', 30 + hash2(y, 5) * 12, Math.round(y * 7)));
    props.push(treeAt(-13.5 - hash2(y, 6) * 3, y + 1.2, 'pine', 34 + hash2(y, 7) * 8, Math.round(y * 9)));
    props.push(treeAt(-17 - hash2(y, 8) * 3, y + 0.6, hash2(y, 9) < 0.5 ? 'pine' : 'oak', 36, Math.round(y * 11)));
  }
  for (let y = -17; y <= 18; y += 4) props.push(treeAt(27 + hash2(y, 12) * 3, y, 'pine', 34, Math.round(y * 13)));
  props.push({ img: bench(), x: 10.2, y: -18.5 });
  placeProps(p, props);

  // Rayos de luz filtrada entre los árboles.
  const o = new Painter(SCREEN_W, SCREEN_H);
  for (let sy = 0; sy < SCREEN_H; sy++)
    for (let sx = 0; sx < SCREEN_W; sx++) {
      const band = (sx + sy * 0.9) % 150;
      if (band < 26) o.blend(sx, sy, '#fff6c8', 0.07 + (band < 6 ? 0.03 : 0));
    }
  return { background: p.img, overlay: o.img };
}

function stRegis(): VenuePaint {
  const p = new Painter(SCREEN_W, SCREEN_H);
  const fy = VENUES.stRegis.fenceY!;
  const courts: CourtSpec[] = [
    { cx: 0, cy: 0, inner: '#2e62b0', outer: '#2a57a0', runX: 8.2, runY: fy, kind: 'tennis' },
    { cx: -14.5, cy: -6.5, inner: '#3aa88a', outer: '#2f8f7a', runX: 4.3, runY: 8, kind: 'pickleball' },
    { cx: -14.5, cy: 10.5, inner: '#3aa88a', outer: '#2f8f7a', runX: 4.3, runY: 8, kind: 'pickleball' },
  ];
  paintGround(
    p,
    courts,
    (x, y, sx, sy) => {
      // Patio de piedra a la derecha.
      if (x > 10.2 && x < 24 && y > -13 && y < 12) return (Math.floor(x) + Math.floor(y)) % 2 === 0 ? SCN.stone : SCN.stoneDark;
      // Césped de club, cortado en diagonal.
      const d = Math.floor((x + y + 200) / 2.5) % 2 === 0;
      if (hash2(sx, sy) < 0.03) return SCN.grassDark;
      return d ? '#5aa653' : '#4f9748';
    },
    0.05,
  );
  for (const c of courts) courtLines(p, c, SCN.white);
  fence(p, -8.8, -fy - 0.2, 8.8, -fy - 0.2, 3.2, 'screen');
  fence(p, -8.8, -fy - 0.2, -8.8, fy, 3, 'mesh');
  fence(p, 8.8, -fy - 0.2, 8.8, fy, 3, 'mesh');

  const props: Prop[] = [];
  props.push({ img: clubhouse(250, 66), x: 0, y: -20.5 });
  rowOfTrees(props, -19.5, -36, -15, 3.5, 31, 0.3);
  rowOfTrees(props, -19.5, 15, 36, 3.5, 32, 0.3);
  for (let y = -12; y <= 12; y += 3) props.push({ img: hedge(16, 9), x: 9.8, y });
  for (const [x, y] of [
    [13.5, -9],
    [17.5, -4],
    [13.5, 1],
    [17.5, 6],
  ])
    props.push({ img: patioTable(), x, y });
  props.push({ img: flowerBed(30), x: -10.3, y: -12.5 });
  props.push({ img: flowerBed(30), x: 10.8, y: -13.5 });
  props.push({ img: bench(), x: -10.5, y: 0 });
  placeProps(p, props);
  return { background: p.img, overlay: null };
}

function chattahoochee(): VenuePaint {
  const p = new Painter(SCREEN_W, SCREEN_H);
  const moss = VENUES.chattahoochee.moss ?? [];
  const courts: CourtSpec[] = [{ cx: 0, cy: 0, inner: '#8e928a', outer: '#858a82', runX: 8.2, runY: 17.1, kind: 'tennis' }];
  // Cielo del atardecer: franja de arriba (la cancha "mira" hacia el río lejano).
  const skyEnd = 26;
  paintGround(
    p,
    courts,
    (x, y, sx, sy) => {
      if (sy < skyEnd) {
        const t = sy / skyEnd;
        return toHex([255 - t * 30, 150 + t * 40, 90 + t * 30] as RGB);
      }
      // El río a la izquierda, con reflejos del sol.
      if (x < -10.4) {
        const streak = Math.sin(y * 3.1 + x * 0.3) > 0.85 && hash2(sx, sy) < 0.7;
        if (streak) return '#f3a35c';
        return x < -10.9 ? '#2f5d7a' : '#4a6a5a';
      }
      if (x < -9.4) return SCN.mud;
      return hash2(sx, sy) < 0.1 ? '#4a5a2e' : '#5a6a3a';
    },
    0.07,
  );
  // Musgo sobre la cancha.
  for (const mz of moss) {
    for (let i = 0; i < 400; i++) {
      const a = hash2(i, 5) * Math.PI * 2;
      const r = Math.sqrt(hash2(i, 6)) * mz.r;
      const s = project(mz.x + Math.cos(a) * r, mz.y + Math.sin(a) * r);
      p.set(s.sx, s.sy, hash2(i, 7) < 0.5 ? '#5d7a44' : '#4a6636');
    }
  }
  courtLines(p, courts[0], '#eeeae0');
  // Sol poniéndose.
  p.ellipse(470, skyEnd - 2, 18, 12, '#ffd36b');
  p.ellipse(470, skyEnd - 2, 12, 8, '#fff0b0');

  const props: Prop[] = [];
  // Otra orilla del río, en silueta.
  for (let x = -40, i = 0; x <= 40; x += 3.2, i++) {
    const img = hash2(i, 41) < 0.6 ? pine(Math.round(22 + hash2(i, 42) * 18), i) : oak(Math.round(10 + hash2(i, 43) * 5), i);
    // Silueta oscura.
    for (let k = 0; k < img.data.length; k += 4) {
      if (img.data[k + 3] === 0) continue;
      img.data[k] = 58;
      img.data[k + 1] = 44;
      img.data[k + 2] = 60;
    }
    props.push({ img, x, y: -19.6 - hash2(i, 44) * 1.5 });
  }
  for (let y = -14; y <= 18; y += 4.5) props.push({ img: reeds(), x: -10.2, y });
  props.push({ img: rock(10), x: -9.9, y: -4 });
  props.push({ img: rock(14), x: -9.8, y: 12 });
  for (const [x, y] of [
    [9.6, -13],
    [9.6, 0],
    [9.6, 13],
    [-9.2, -13],
    [-9.2, 13],
  ])
    props.push({ img: lightPole(false), x, y });
  for (let y = -16; y <= 16; y += 5) props.push(treeAt(13 + hash2(y, 8) * 3, y, 'oak', 30, Math.round(y * 3)));
  placeProps(p, props);

  // Luz de atardecer: todo más cálido, más fuerte arriba.
  const o = new Painter(SCREEN_W, SCREEN_H);
  for (let sy = skyEnd; sy < SCREEN_H; sy++)
    for (let sx = 0; sx < SCREEN_W; sx++) o.blend(sx, sy, '#ff9a4a', 0.12 - (sy / SCREEN_H) * 0.06);
  return { background: p.img, overlay: o.img };
}

export function paintVenue(id: VenueId): VenuePaint {
  if (id === 'springRidge') return springRidge();
  if (id === 'stRegis') return stRegis();
  if (id === 'chattahoochee') return chattahoochee();
  return breckenridge();
}

/** Para marcar dónde van los postes de luz (la escena los prende de a uno). */
export const BOSS_LIGHTS: [number, number][] = [
  [9.6, -13],
  [9.6, 0],
  [9.6, 13],
  [-9.2, -13],
  [-9.2, 13],
];
