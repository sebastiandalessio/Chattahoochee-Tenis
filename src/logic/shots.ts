// Modelo de golpe: a partir de lo que hizo el jugador (timing, dirección, carga) y de sus stats,
// decide adónde va la pelota, con qué velocidad y con cuánto error. Lógica pura.

import { COURT, facingOf, rightSignOf } from './court';
import { netClearance, solveLaunch } from './physics';
import type { Rng } from './rng';
import { other, type Side } from './scoring';
import type { Stats } from './stats';

export type ShotKind =
  | 'drive'
  | 'slice'
  | 'lob'
  | 'drop'
  | 'short'
  | 'volley'
  | 'dropVolley'
  | 'smash'
  | 'serve';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ShotRequest {
  kind: ShotKind;
  stats: Stats;
  side: Side;
  /** Punto de contacto (posición de la pelota al pegarle). */
  from: Vec3;
  /** -1 = le pegó temprano (sale cruzada) · +1 = tarde (sale paralela). */
  timing: number;
  /** De qué lado del cuerpo estaba la pelota, en x del mundo (-1, 0, 1). */
  contactSide: number;
  /** Dirección apretada en x del mundo (-1..1). */
  aimX: number;
  /** -1 = corto, 0 = normal, 1 = profundo. */
  aimDepth: number;
  /** Carga del golpe (mantener el botón) 0..1. */
  charge: number;
  /** Qué tan incómodo le llegó la pelota 0..1. */
  pressure: number;
  /** Multiplicador de error (dificultad, personalidad, pasivas). */
  errorMul: number;
  /** Forzar un error (debilidades de personajes). */
  forceMiss?: 'net' | 'out';
}

export interface ShotResult {
  kind: ShotKind;
  vel: { vx: number; vy: number; vz: number };
  gMul: number;
  bounceE: number;
  bounceF: number;
  intended: { x: number; y: number };
  target: { x: number; y: number };
  T: number;
  /** Velocidad "de TV" en km/h (el partido va en cámara lenta, la TV no). */
  kmh: number;
  sigma: number;
}

interface ShotProfile {
  depth: [short: number, normal: number, deep: number];
  maxX: number;
  speed: (s: Stats, charge: number) => number | null;
  fixedT?: (charge: number) => number;
  gMul: (charge: number) => number;
  bounceE: number;
  bounceF: number;
  netMargin: (charge: number) => number;
  baseSigma: number;
  skill: (s: Stats) => number;
}

const PROFILES: Record<Exclude<ShotKind, 'serve'>, ShotProfile> = {
  drive: {
    depth: [5.2, 8.4, 10.3],
    maxX: 3.3,
    speed: (s, c) => 13.2 + s.potencia * 0.65 + c * 6.5,
    gMul: (c) => 1.25 + c * 0.15,
    bounceE: 1.05,
    bounceF: 1.04,
    netMargin: (c) => 0.38 - c * 0.18,
    baseSigma: 0.42,
    skill: (s) => s.control,
  },
  slice: {
    depth: [6.5, 8.0, 9.8],
    maxX: 3.2,
    speed: (s) => 12.3 + s.control * 0.15,
    gMul: () => 0.72,
    bounceE: 0.68,
    bounceF: 1.08,
    netMargin: () => 0.25,
    baseSigma: 0.34,
    skill: (s) => s.control,
  },
  lob: {
    depth: [8.6, 9.9, 10.6],
    maxX: 3.2,
    speed: () => null,
    fixedT: (c) => 2.35 - c * 0.15,
    gMul: () => 1,
    bounceE: 1,
    bounceF: 0.95,
    netMargin: () => 1.2,
    baseSigma: 0.55,
    skill: (s) => s.control,
  },
  drop: {
    depth: [1.6, 2.0, 2.6],
    maxX: 2.8,
    speed: () => null,
    fixedT: () => 1.0,
    gMul: () => 0.95,
    bounceE: 0.55,
    bounceF: 0.45,
    netMargin: () => 0.14,
    baseSigma: 0.36,
    skill: (s) => s.control,
  },
  short: {
    depth: [4.4, 5.2, 5.8],
    maxX: 3.7,
    speed: (s) => 11.8 + s.potencia * 0.4,
    gMul: () => 1.35,
    bounceE: 1,
    bounceF: 0.95,
    netMargin: () => 0.2,
    baseSigma: 0.4,
    skill: (s) => s.control,
  },
  volley: {
    depth: [4.5, 7.0, 9.0],
    maxX: 3.6,
    speed: (s) => 14 + s.volea * 0.5 + s.potencia * 0.2,
    gMul: () => 1,
    bounceE: 0.9,
    bounceF: 1,
    netMargin: () => 0.15,
    baseSigma: 0.36,
    skill: (s) => s.volea,
  },
  dropVolley: {
    depth: [2.0, 2.6, 3.2],
    maxX: 3.2,
    speed: () => null,
    fixedT: () => 0.85,
    gMul: () => 1,
    bounceE: 0.5,
    bounceF: 0.4,
    netMargin: () => 0.12,
    baseSigma: 0.3,
    skill: (s) => s.volea,
  },
  smash: {
    depth: [5.5, 7.8, 9.5],
    maxX: 3.4,
    speed: (s) => 22 + s.potencia * 0.8,
    gMul: () => 1,
    bounceE: 1.1,
    bounceF: 1.05,
    netMargin: () => 0.1,
    baseSigma: 0.45,
    skill: (s) => (s.potencia + s.volea) / 2,
  },
};

/** La TV muestra velocidades "reales" aunque el juego vaya en cámara lenta. */
export const KMH_FACTOR = 3.6 * 1.7;

export function computeShot(req: ShotRequest, rng: Rng): ShotResult {
  if (req.kind === 'serve') throw new Error('Para el saque usá computeServe');
  const p = PROFILES[req.kind];
  const facing = facingOf(req.side);
  const depthIdx = req.aimDepth < -0.3 ? 0 : req.aimDepth > 0.3 ? 2 : 1;
  const dist = p.depth[depthIdx];

  const timingX = (req.contactSide || 0) * clamp(req.timing, -1, 1) * 2.7;
  const ix = clamp(timingX + req.aimX * 2.4, -p.maxX, p.maxX);
  const intended = { x: ix, y: facing * dist };

  // Tiempo de vuelo a partir de la velocidad del golpe.
  const flat = Math.hypot(intended.x - req.from.x, intended.y - req.from.y);
  const sp = p.speed(req.stats, req.charge);
  let T = p.fixedT ? p.fixedT(req.charge) : flat / Math.max(4, sp ?? 10);
  const gMul = p.gMul(req.charge);
  const margin = p.netMargin(req.charge);

  // La trayectoria "ideal" siempre pasa la red: si no, se levanta un poco (sale más lenta).
  for (let i = 0; i < 40; i++) {
    const c = netClearance(req.from, solveLaunch(req.from, intended, T, gMul), gMul);
    if (c === null || c >= margin) break;
    T *= 1.05;
  }

  // Error: se desvía el destino según control, presión, carga y timing.
  const skill = p.skill(req.stats);
  const timingFactor = 1 + Math.max(0, Math.abs(req.timing) - 0.7) * 1.5;
  const heightFactor = req.from.z < 0.3 ? 1.35 : req.from.z > 1.9 && req.kind !== 'smash' ? 1.2 : 1;
  const sigma =
    p.baseSigma *
    (1.6 - skill * 0.09) *
    (1 + 1.4 * clamp(req.pressure, 0, 1)) *
    (1 + 0.9 * req.charge) *
    timingFactor *
    heightFactor *
    req.errorMul;
  const target = {
    x: intended.x + rng.gauss() * sigma,
    y: intended.y + rng.gauss() * sigma * 1.25 * facing,
  };
  let vzNoise = rng.gauss() * sigma * 0.5;

  if (req.forceMiss === 'out') {
    target.y = facing * (COURT.halfLength + 1.2 + rng.range(0, 1.5));
  }
  const vel = solveLaunch(req.from, target, T, gMul);
  if (req.forceMiss === 'net') {
    const c = netClearance(req.from, vel, gMul) ?? 0;
    const tNet = Math.abs(req.from.y / (vel.vy || 1));
    vzNoise = -(c + 0.25) / Math.max(0.1, tNet);
  }
  vel.vz += vzNoise;

  return {
    kind: req.kind,
    vel,
    gMul,
    bounceE: p.bounceE,
    bounceF: p.bounceF,
    intended,
    target,
    T,
    kmh: Math.round(Math.hypot(vel.vx, vel.vy, vel.vz) * KMH_FACTOR),
    sigma,
  };
}

export interface ServeRequest {
  stats: Stats;
  side: Side;
  from: Vec3;
  /** 0..1 según el medidor. */
  power: number;
  /** Dirección apretada en x del mundo (-1..1). */
  aimX: number;
  serveSide: 'deuce' | 'ad';
  errorMul: number;
}

export function serviceBoxSign(server: Side, serveSide: 'deuce' | 'ad'): number {
  const receiver = other(server);
  const r = rightSignOf(receiver);
  return serveSide === 'deuce' ? r : -r;
}

export function computeServe(req: ServeRequest, rng: Rng): ShotResult {
  const facing = facingOf(req.side);
  const boxSign = serviceBoxSign(req.side, req.serveSide);
  // Hacia la línea lateral = abierto; hacia el centro = a la T.
  const toward = req.aimX * boxSign;
  const ax = toward > 0.3 ? 3.3 : toward < -0.3 ? 0.7 : 2.0;
  const intended = { x: ax * boxSign, y: facing * (COURT.serviceLine - 1.1) };
  const power = clamp(req.power, 0, 1);
  const v = 15.5 + power * 11 + (req.stats.saque - 5) * 0.6;
  const gMul = 1.25;
  const flat = Math.hypot(intended.x - req.from.x, intended.y - req.from.y);
  let T = flat / v;
  for (let i = 0; i < 40; i++) {
    const c = netClearance(req.from, solveLaunch(req.from, intended, T, gMul), gMul);
    if (c === null || c >= 0.1) break;
    T *= 1.04;
  }
  const sigma = (0.15 + 1.1 * power ** 3) * (1.45 - req.stats.saque * 0.08) * req.errorMul;
  const target = {
    x: intended.x + rng.gauss() * sigma,
    y: intended.y + rng.gauss() * sigma * 1.2 * facing,
  };
  const vel = solveLaunch(req.from, target, T, gMul);
  return {
    kind: 'serve',
    vel,
    gMul,
    bounceE: 0.95,
    bounceF: 1.05,
    intended,
    target,
    T,
    kmh: Math.round(Math.hypot(vel.vx, vel.vy, vel.vz) * KMH_FACTOR),
    sigma,
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
