// Física de la pelota: lógica pura, sin Phaser, cubierta por tests.
// Usamos una "gravedad de videojuego" más baja que la real: el partido va en cámara lenta
// para que se pueda jugar con teclado sin tener reflejos de Grand Slam.

import { COURT, netHeightAt } from './court';

export const PHYS = {
  gravity: 6.2,
  /** Por debajo de esta velocidad vertical, la pelota deja de picar y rueda. */
  restVz: 0.45,
  /** Fricción al rodar (por segundo). */
  rollFriction: 2.2,
  /** Margen del borde de la red donde la pelota "roza la faja". */
  netCordBand: 0.05,
} as const;

export interface Surface {
  id: string;
  /** Cuánto rebota verticalmente (0..1). */
  restitution: number;
  /** Cuánta velocidad horizontal conserva al picar (0..1). */
  friction: number;
  /** Cuánto se deslizan los jugadores (0 = nada; polvo de ladrillo > 0). */
  slide: number;
}

export const SURFACES: Record<string, Surface> = {
  // Cemento estándar (gris en el hito 1; Breckenridge usa algo parecido).
  hard: { id: 'hard', restitution: 0.74, friction: 0.8, slide: 0 },
  // Polvo verde: pique más lento y más alto.
  clay: { id: 'clay', restitution: 0.8, friction: 0.68, slide: 0.35 },
  // Cemento azul rapidísimo.
  fast: { id: 'fast', restitution: 0.7, friction: 0.88, slide: 0 },
};

export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Multiplicador de gravedad (efecto): >1 liftado que cae rápido, <1 slice que flota. */
  gMul: number;
  /** Modificadores del próximo pique (los pone el golpe: el slice patina, la dejadita se muere). */
  bounceE: number;
  bounceF: number;
  rolling: boolean;
}

export type BallEvent =
  | { type: 'bounce'; x: number; y: number; vz: number; speed: number }
  | { type: 'net'; x: number; z: number }
  | { type: 'netCord'; x: number };

export function makeBall(x = 0, y = 0, z = 1): Ball {
  return { x, y, z, vx: 0, vy: 0, vz: 0, gMul: 1, bounceE: 1, bounceF: 1, rolling: false };
}

export function horizontalSpeed(b: Ball): number {
  return Math.hypot(b.vx, b.vy);
}

/** Avanza la pelota dt segundos. Devuelve los eventos (piques, red) que ocurrieron. */
export function stepBall(b: Ball, dt: number, surface: Surface): BallEvent[] {
  const events: BallEvent[] = [];
  const g = PHYS.gravity * b.gMul;

  if (b.rolling) {
    const sp = horizontalSpeed(b);
    if (sp > 0) {
      const ns = Math.max(0, sp - PHYS.rollFriction * dt);
      b.vx *= ns / sp;
      b.vy *= ns / sp;
    }
    const py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z = 0;
    b.vz = 0;
    if (py !== 0 && Math.sign(py) !== Math.sign(b.y) && Math.abs(b.x) <= COURT.netPostX) {
      // Rueda contra la red: se frena ahí.
      b.y = Math.sign(py) * 0.05;
      b.vx = 0;
      b.vy = 0;
    }
    return events;
  }

  const px = b.x;
  const py = b.y;
  const pz = b.z;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.z += b.vz * dt - 0.5 * g * dt * dt;
  b.vz -= g * dt;

  // ¿Cruzó el plano de la red?
  if (py !== 0 && Math.sign(py) !== Math.sign(b.y)) {
    const f = py / (py - b.y);
    const xc = px + (b.x - px) * f;
    const zc = pz + (b.z - pz) * f;
    if (Math.abs(xc) <= COURT.netPostX) {
      const h = netHeightAt(xc);
      if (zc < h - PHYS.netCordBand * 0.4) {
        // Se come la red: vuelve un poquito y cae del lado de quien pegó.
        b.x = xc;
        b.y = Math.sign(py) * 0.06;
        b.z = Math.max(0.02, zc);
        b.vy = -b.vy * 0.12;
        b.vx *= 0.3;
        b.vz = Math.min(b.vz, 0) * 0.3;
        events.push({ type: 'net', x: xc, z: zc });
      } else if (zc < h + PHYS.netCordBand) {
        // Roza la faja y pasa, muerta.
        b.vy *= 0.45;
        b.vx *= 0.6;
        b.vz = Math.abs(b.vz) * 0.25 + 0.7;
        events.push({ type: 'netCord', x: xc });
      }
    }
  }

  if (b.z <= 0 && b.vz < 0) {
    // Pique: ubicamos el punto exacto interpolando dentro del paso.
    const f = pz > 0 ? pz / (pz - b.z) : 1;
    const bx = px + (b.x - px) * f;
    const by = py + (b.y - py) * f;
    const impactVz = b.vz;
    const e = surface.restitution * b.bounceE;
    const fr = Math.min(0.98, surface.friction * b.bounceF);
    b.vz = -impactVz * e;
    b.vx *= fr;
    b.vy *= fr;
    b.z = Math.max(0, -b.z * e);
    // El efecto se gasta casi todo en el primer pique.
    b.gMul = 1 + (b.gMul - 1) * 0.35;
    b.bounceE = 1;
    b.bounceF = 1;
    events.push({ type: 'bounce', x: bx, y: by, vz: impactVz, speed: horizontalSpeed(b) });
    if (b.vz < PHYS.restVz) {
      b.rolling = true;
      b.z = 0;
      b.vz = 0;
    }
  }
  return events;
}

/** Velocidad inicial para que la pelota salga de `from` y pique en `target` después de T segundos. */
export function solveLaunch(
  from: { x: number; y: number; z: number },
  target: { x: number; y: number },
  T: number,
  gMul = 1,
): { vx: number; vy: number; vz: number } {
  const g = PHYS.gravity * gMul;
  return {
    vx: (target.x - from.x) / T,
    vy: (target.y - from.y) / T,
    vz: (-from.z + 0.5 * g * T * T) / T,
  };
}

/** Altura con la que la trayectoria cruza la red, menos la altura de la red ahí. null si no cruza. */
export function netClearance(
  from: { x: number; y: number; z: number },
  vel: { vx: number; vy: number; vz: number },
  gMul = 1,
): number | null {
  if (vel.vy === 0 || Math.sign(-from.y) !== Math.sign(vel.vy)) return null;
  const t = -from.y / vel.vy;
  const g = PHYS.gravity * gMul;
  const z = from.z + vel.vz * t - 0.5 * g * t * t;
  const x = from.x + vel.vx * t;
  return z - netHeightAt(x);
}

export interface PathSample {
  t: number;
  x: number;
  y: number;
  z: number;
  bounces: number;
  /** Punto exacto del pique, si picó durante este paso. */
  bounceAt?: { x: number; y: number };
}

/** Simula hacia adelante una copia de la pelota (para la CPU y para las ayudas visuales). */
export function predictPath(
  ball: Ball,
  surface: Surface,
  maxT = 3,
  dt = 1 / 60,
  maxBounces = 2,
): PathSample[] {
  const b: Ball = { ...ball };
  const out: PathSample[] = [];
  let bounces = 0;
  for (let t = dt; t <= maxT; t += dt) {
    const ev = stepBall(b, dt, surface);
    let bounceAt: { x: number; y: number } | undefined;
    for (const e of ev) {
      if (e.type === 'bounce') {
        bounces++;
        bounceAt = { x: e.x, y: e.y };
      }
    }
    out.push({ t, x: b.x, y: b.y, z: b.z, bounces, bounceAt });
    if (bounces >= maxBounces || b.rolling) break;
  }
  return out;
}
