import { describe, expect, it } from 'vitest';
import { COURT, inServiceBox, inSinglesCourt, netHeightAt } from '../src/logic/court';
import {
  PHYS,
  SURFACES,
  makeBall,
  netClearance,
  predictPath,
  solveLaunch,
  stepBall,
  type BallEvent,
} from '../src/logic/physics';
import { Rally } from '../src/logic/referee';
import { createRng } from '../src/logic/rng';
import { computeServe, computeShot } from '../src/logic/shots';
import { NEUTRAL_STATS } from '../src/logic/stats';

const DT = 1 / 120;

function flyUntilBounce(ball = makeBall(), maxT = 5): { t: number; ev: BallEvent | null } {
  let t = 0;
  while (t < maxT) {
    t += DT;
    const ev = stepBall(ball, DT, SURFACES.hard);
    const hit = ev.find((e) => e.type === 'bounce' || e.type === 'net');
    if (hit) return { t, ev: hit };
  }
  return { t, ev: null };
}

describe('física de la pelota', () => {
  it('cae con la gravedad del juego', () => {
    const b = makeBall(0, 5, 2);
    const { t, ev } = flyUntilBounce(b);
    expect(ev?.type).toBe('bounce');
    // z = 2 - g t²/2 → t = sqrt(4/g)
    expect(t).toBeCloseTo(Math.sqrt(4 / PHYS.gravity), 1);
  });

  it('al picar sube menos de lo que bajó y pierde velocidad horizontal', () => {
    const b = makeBall(0, 5, 2);
    b.vy = 5;
    flyUntilBounce(b);
    expect(b.vz).toBeGreaterThan(0);
    expect(b.vy).toBeLessThan(5);
    expect(b.vy).toBeGreaterThan(3);
  });

  it('el polvo de ladrillo frena más y pica más alto que el cemento', () => {
    const drop = (surface: typeof SURFACES.hard) => {
      const b = makeBall(0, 5, 2);
      b.vy = 6;
      while (!stepBall(b, DT, surface).some((e) => e.type === 'bounce'));
      return b;
    };
    const hard = drop(SURFACES.hard);
    const clay = drop(SURFACES.clay);
    expect(clay.vz).toBeGreaterThan(hard.vz);
    expect(clay.vy).toBeLessThan(hard.vy);
  });

  it('solveLaunch hace picar la pelota donde se apuntó', () => {
    const from = { x: 1, y: 11, z: 1 };
    const target = { x: -2.5, y: -8 };
    const v = solveLaunch(from, target, 1.2, 1.25);
    const b = makeBall(from.x, from.y, from.z);
    Object.assign(b, v, { gMul: 1.25 });
    const { ev } = flyUntilBounce(b);
    expect(ev?.type).toBe('bounce');
    if (ev?.type === 'bounce') {
      expect(ev.x).toBeCloseTo(target.x, 1);
      expect(ev.y).toBeCloseTo(target.y, 1);
    }
  });

  it('una pelota baja se come la red y vuelve del lado de quien pegó', () => {
    const b = makeBall(0, 6, 0.8);
    b.vy = -20;
    b.vz = 0;
    const { ev } = flyUntilBounce(b);
    expect(ev?.type).toBe('net');
    expect(b.y).toBeGreaterThan(0);
  });

  it('netClearance mide cuánto pasa por arriba de la red', () => {
    const from = { x: 0, y: 10, z: 1 };
    const v = solveLaunch(from, { x: 0, y: -8 }, 1.1, 1);
    const c = netClearance(from, v, 1);
    expect(c).not.toBeNull();
    expect(c!).toBeGreaterThan(0);
    expect(netHeightAt(0)).toBeCloseTo(COURT.netHeightCenter);
    expect(netHeightAt(10)).toBeCloseTo(COURT.netHeightPost);
  });

  it('predictPath coincide con la simulación real', () => {
    const b = makeBall(0, 10, 1);
    Object.assign(b, solveLaunch(b, { x: 2, y: -9 }, 1.2));
    const path = predictPath(b, SURFACES.hard, 2, DT, 1);
    const last = path[path.length - 1];
    expect(last.bounces).toBe(1);
    expect(last.y).toBeLessThan(-8);
  });
});

describe('cancha', () => {
  it('líneas y cuadros de saque', () => {
    expect(inSinglesCourt(4.1, 11.8)).toBe(true);
    expect(inSinglesCourt(4.3, 5)).toBe(false);
    expect(inSinglesCourt(0, -12.2)).toBe(false);
    // El de arriba (1) recibe: su derecha es -x.
    expect(inServiceBox(-2, -4, 1, 'deuce')).toBe(true);
    expect(inServiceBox(2, -4, 1, 'deuce')).toBe(false);
    expect(inServiceBox(2, -4, 1, 'ad')).toBe(true);
    expect(inServiceBox(-2, -7, 1, 'deuce')).toBe(false);
    // El de abajo (0) recibe: su derecha es +x.
    expect(inServiceBox(2, 4, 0, 'deuce')).toBe(true);
  });
});

describe('golpes', () => {
  const rng = createRng(42);
  const base = {
    stats: NEUTRAL_STATS,
    side: 0 as const,
    from: { x: 0, y: 12, z: 0.9 },
    contactSide: 1,
    aimX: 0,
    aimDepth: 0,
    charge: 0,
    pressure: 0,
    errorMul: 0,
  };

  it('temprano sale cruzado, tarde sale paralelo', () => {
    const early = computeShot({ ...base, kind: 'drive', timing: -1 }, rng);
    const late = computeShot({ ...base, kind: 'drive', timing: 1 }, rng);
    // Con la pelota a la derecha del cuerpo: temprano va a la izquierda (cruzado).
    expect(early.intended.x).toBeLessThan(-1.5);
    expect(late.intended.x).toBeGreaterThan(1.5);
  });

  it('arriba = profunda, abajo = corta; la dejadita cae cerca de la red', () => {
    const deep = computeShot({ ...base, kind: 'drive', timing: 0, aimDepth: 1 }, rng);
    const normal = computeShot({ ...base, kind: 'drive', timing: 0 }, rng);
    const drop = computeShot({ ...base, kind: 'drop', timing: 0 }, rng);
    expect(deep.intended.y).toBeLessThan(normal.intended.y);
    expect(Math.abs(drop.intended.y)).toBeLessThan(3);
    // El jugador de abajo pega hacia la mitad de arriba (y negativa).
    expect(normal.intended.y).toBeLessThan(0);
  });

  it('el golpe ideal (sin error) pasa la red y pica adentro', () => {
    for (const kind of ['drive', 'slice', 'lob', 'drop', 'short', 'volley', 'smash'] as const) {
      const from = kind === 'volley' || kind === 'smash' ? { x: 0, y: 4, z: kind === 'smash' ? 2.5 : 1.1 } : base.from;
      const r = computeShot({ ...base, from, kind, timing: 0 }, rng);
      const b = makeBall(from.x, from.y, from.z);
      Object.assign(b, r.vel, { gMul: r.gMul });
      const { ev } = flyUntilBounce(b);
      expect(ev?.type, kind).toBe('bounce');
      if (ev?.type === 'bounce') {
        expect(inSinglesCourt(ev.x, ev.y), kind).toBe(true);
        expect(ev.y, kind).toBeLessThan(0);
      }
    }
  });

  it('cargar el drive lo hace más rápido', () => {
    const soft = computeShot({ ...base, kind: 'drive', timing: 0 }, rng);
    const hard = computeShot({ ...base, kind: 'drive', timing: 0, charge: 1 }, rng);
    expect(hard.kmh).toBeGreaterThan(soft.kmh);
  });

  it('el saque ideal entra en el cuadro correcto', () => {
    for (const side of ['deuce', 'ad'] as const) {
      for (const aimX of [-1, 0, 1]) {
        const x = side === 'deuce' ? 0.8 : -0.8;
        const from = { x, y: 12.2, z: 2.4 };
        const r = computeServe(
          { stats: NEUTRAL_STATS, side: 0, from, power: 0.8, aimX, serveSide: side, errorMul: 0 },
          rng,
        );
        const b = makeBall(from.x, from.y, from.z);
        Object.assign(b, r.vel, { gMul: r.gMul });
        const { ev } = flyUntilBounce(b);
        expect(ev?.type).toBe('bounce');
        if (ev?.type === 'bounce') expect(inServiceBox(ev.x, ev.y, 1, side)).toBe(true);
      }
    }
  });
});

describe('árbitro del peloteo', () => {
  it('pique afuera: punto para el rival', () => {
    const r = new Rally(0, 'deuce');
    r.onServe();
    expect(r.onBounce(-2, -4)).toEqual({ type: 'continue' });
    r.onHit(1);
    const d = r.onBounce(0, 13);
    expect(d).toMatchObject({ type: 'point', winner: 0, reason: 'out', out: 'long' });
  });

  it('saque afuera del cuadro es falta; con red y adentro es let', () => {
    let r = new Rally(0, 'deuce');
    r.onServe();
    expect(r.onBounce(-2, -7)).toEqual({ type: 'fault', reason: 'long' });
    r = new Rally(0, 'deuce');
    r.onServe();
    r.onNetCord();
    expect(r.onBounce(-2, -3)).toEqual({ type: 'let' });
  });

  it('doble pique: ace o winner', () => {
    let r = new Rally(0, 'deuce');
    r.onServe();
    r.onBounce(-2, -4);
    expect(r.onBounce(-3, -12)).toMatchObject({ type: 'point', winner: 0, reason: 'ace' });
    r = new Rally(0, 'deuce');
    r.onServe();
    r.onBounce(-2, -4);
    r.onHit(1);
    r.onBounce(1, 8);
    expect(r.onBounce(1, 14)).toMatchObject({ type: 'point', winner: 1, reason: 'winner' });
  });

  it('red: punto para el otro (o falta si era el saque)', () => {
    let r = new Rally(1, 'ad');
    r.onServe();
    expect(r.onNet()).toEqual({ type: 'fault', reason: 'net' });
    r = new Rally(1, 'ad');
    r.onServe();
    r.onBounce(-2, 4);
    r.onHit(0);
    expect(r.onNet()).toMatchObject({ type: 'point', winner: 1, reason: 'net' });
  });
});
