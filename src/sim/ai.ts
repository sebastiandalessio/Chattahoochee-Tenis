// CPU: produce la misma entrada que un humano (moverse y apretar botones), leyendo el partido.

import { COURT } from '../logic/court';
import type { Rng } from '../logic/rng';
import { other } from '../logic/scoring';
import { emptyInput, type PlayerInput } from './input';
import { Match, ZONE, type InterceptPlan, type PlayerSim } from './match';

export interface AiProfile {
  /** Segundos que tarda en reaccionar al golpe del rival. */
  reaction: number;
  /** Error de timing al pegar (metros de desvío sobre el punto ideal). */
  timingJitter: number;
  /** Probabilidad de subir a la red después de un golpe profundo. */
  netRush: number;
  lobChance: number;
  dropChance: number;
  sliceChance: number;
  /** Probabilidad de buscar el hueco (tirar lejos del rival). */
  aimSmart: number;
  /** Probabilidad de cargar el golpe (apretar antes). */
  chargeChance: number;
  /** Potencia buscada en el primer y segundo saque (0..1). */
  serveFirst: number;
  serveSecond: number;
  /** Probabilidad de juzgar mal una pelota que se va afuera y pegarle igual. */
  misjudge: number;
}

export const BASIC_AI: AiProfile = {
  reaction: 0.26,
  timingJitter: 0.4,
  netRush: 0.12,
  lobChance: 0.35,
  dropChance: 0.05,
  sliceChance: 0.2,
  aimSmart: 0.45,
  chargeChance: 0.15,
  serveFirst: 0.72,
  serveSecond: 0.42,
  misjudge: 0.15,
};

type ShotPlan = {
  button: 'hit' | 'slice';
  holdSlice: boolean;
  aimX: number;
  depth: number;
  dTrigger: number;
  charge: boolean;
};

export class CpuBrain {
  readonly side: 0 | 1;
  profile: AiProfile;
  private rng: Rng;
  private reactT = 0;
  private plan: InterceptPlan | null = null;
  private planT = 0;
  private shot: ShotPlan | null = null;
  private lastHitterSeen: number | null = null;
  private serveWait = 0;
  private pressedHit = false;
  private holdT = 0;
  private goNet = false;
  private letItGo = false;

  constructor(side: 0 | 1, profile: AiProfile, rng: Rng) {
    this.side = side;
    this.profile = profile;
    this.rng = rng;
  }

  think(m: Match, dt: number): PlayerInput {
    const me = m.players[this.side];
    const opp = m.players[other(this.side)];
    const input = emptyInput();

    // Soltar el botón el frame siguiente a apretarlo (salvo que esté cargando).
    if (this.pressedHit) {
      this.holdT -= dt;
      if (this.holdT > 0) {
        if (this.shot?.button === 'slice') input.slice = true;
        else input.hit = true;
      } else this.pressedHit = false;
    }

    if (m.phase === 'preServe') {
      this.resetRally();
      if (m.rally.server === this.side) {
        this.serveWait += dt;
        if (this.serveWait > 0.9 + this.rng.range(0, 0.5)) {
          input.hit = true;
          this.serveWait = -10;
        }
      } else {
        this.serveWait = 0;
        this.moveTo(input, me, me.x, me.y, dt);
      }
      return input;
    }
    this.serveWait = 0;

    if (m.phase === 'toss') {
      if (m.rally.server === this.side) {
        const want = m.attempt === 1 ? this.profile.serveFirst : this.profile.serveSecond;
        const rising = m.tossT % (2 * (me.setup.serveMeterHalfPeriod ?? 0.42)) < (me.setup.serveMeterHalfPeriod ?? 0.42);
        if ((rising && m.meter >= want - 0.02 && m.ball.z >= 1.8) || (m.ball.vz < 0 && m.ball.z < 1.85)) {
          input.hit = !me.input.hit;
          // Apunta: abierto, a la T o al cuerpo.
          input.moveX = this.rng.pick([-1, 0, 1]);
        }
      }
      return input;
    }

    if (m.phase !== 'rally') {
      // Entre puntos: volver caminando al centro.
      this.moveTo(input, me, 0, -me.facing * (COURT.halfLength + 0.8), dt, 0.5);
      return input;
    }

    // Detectar un golpe nuevo del rival para reaccionar con demora.
    if (m.rally.lastHitter !== this.lastHitterSeen) {
      this.lastHitterSeen = m.rally.lastHitter;
      if (m.rally.lastHitter === opp.side) {
        this.reactT = this.profile.reaction * this.rng.range(0.7, 1.3);
        this.plan = null;
        this.shot = null;
        this.letItGo = false;
      } else {
        // Acabo de pegar yo: ¿subo a la red?
        this.goNet = this.rng.chance(this.profile.netRush) && Math.abs(me.y) < COURT.halfLength + 0.5;
      }
    }

    if (m.ballIncoming(me)) {
      if (this.reactT > 0) {
        this.reactT -= dt;
        return input;
      }
      this.planT -= dt;
      if (!this.plan || this.planT <= 0) {
        this.plan = m.planIntercept(me, { allowVolley: Math.abs(me.y) < 7.5 });
        this.planT = 0.12;
        if (this.plan?.goingOut && !this.rng.chance(this.profile.misjudge)) this.letItGo = true;
      }
      if (!this.shot) this.shot = this.chooseShot(m, me, opp);

      if (this.letItGo) {
        // Se aparta y la deja pasar.
        const away = me.x - m.ball.x >= 0 ? 1 : -1;
        this.moveTo(input, me, m.ball.x + away * 2.2, me.y, dt);
        return input;
      }

      if (this.plan) this.moveTo(input, me, this.plan.x, this.plan.y, dt);

      if (m.ballForMe(me) && !this.pressedHit && me.swingT <= 0 && !me.prep) {
        const zi = m.zoneInfo(me);
        const shot = this.shot;
        const trigger =
          zi.inDepth &&
          zi.inHeight &&
          Math.abs(zi.l) <= me.phys.reach + ZONE.diveExtra * 0.9 &&
          (zi.d <= shot.dTrigger || zi.d <= ZONE.dMin + 0.2);
        if (trigger) {
          this.press(input, shot, false);
        } else if (shot.charge && zi.d > ZONE.dMax && zi.d < ZONE.dMax + 4 && this.plan?.feasible) {
          // Se prepara antes para pegar más fuerte.
          this.press(input, shot, true);
        }
      }
      // Durante el impacto, la dirección apretada apunta.
      const aboutToHit = me.prep ? m.ballForMe(me) && m.zoneInfo(me).d < ZONE.dIdeal + 0.5 : this.pressedHit;
      if (aboutToHit || me.sliceWindow) {
        input.moveX = this.shot.aimX;
        input.moveY = this.shot.depth * me.facing;
      }
      return input;
    }

    // La pelota va hacia el rival: reacomodarse.
    const shot = m.lastShot;
    const homeX = shot ? shot.intended.x * 0.3 : 0;
    const homeY = this.goNet ? -me.facing * 2.6 : -me.facing * (COURT.halfLength + 0.9);
    this.moveTo(input, me, homeX, homeY, dt);
    return input;
  }

  private resetRally(): void {
    this.plan = null;
    this.shot = null;
    this.lastHitterSeen = null;
    this.goNet = false;
    this.letItGo = false;
  }

  private press(input: PlayerInput, shot: ShotPlan, charging: boolean): void {
    this.pressedHit = true;
    if (shot.button === 'slice') {
      input.slice = true;
      this.holdT = shot.holdSlice ? 0.4 : 0.02;
    } else {
      input.hit = true;
      this.holdT = charging ? 0.8 : 0.02;
    }
  }

  private chooseShot(m: Match, me: PlayerSim, opp: PlayerSim): ShotPlan {
    const p = this.profile;
    const oppAtNet = Math.abs(opp.y) < 6.5;
    let button: 'hit' | 'slice' = 'hit';
    let holdSlice = false;
    let depth = this.rng.chance(0.5) ? 1 : 0;
    if (oppAtNet && this.rng.chance(p.lobChance)) {
      button = 'slice';
      holdSlice = true;
      depth = 1;
    } else if (this.rng.chance(p.dropChance) && Math.abs(me.y) < COURT.halfLength) {
      button = 'slice';
      depth = -1;
    } else if (this.rng.chance(p.sliceChance)) {
      button = 'slice';
    }
    let aimX = this.rng.pick([-0.6, 0, 0.6]);
    if (this.rng.chance(p.aimSmart)) aimX = (opp.x > 0.8 ? -1 : opp.x < -0.8 ? 1 : this.rng.pick([-1, 1])) * 0.8;
    const charge = button === 'hit' && !oppAtNet && this.rng.chance(p.chargeChance);
    const dTrigger = ZONE.dIdeal + this.rng.gauss() * p.timingJitter * 0.5;
    void m;
    return { button, holdSlice, aimX, depth, dTrigger, charge };
  }

  private moveTo(input: PlayerInput, me: PlayerSim, tx: number, ty: number, _dt: number, speed = 1): void {
    const dx = tx - me.x;
    const dy = ty - me.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.08) return;
    const k = Math.min(1, dist / 0.35) * speed;
    input.moveX = (dx / dist) * k;
    input.moveY = (dy / dist) * k;
  }
}
