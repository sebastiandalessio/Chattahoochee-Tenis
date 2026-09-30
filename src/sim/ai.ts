// CPU: produce la misma entrada que un humano (moverse y apretar botones), leyendo el partido.

import { COURT } from '../logic/court';
import type { Ball } from '../logic/physics';
import type { Rng } from '../logic/rng';
import { other } from '../logic/scoring';
import { emptyInput, type PlayerInput } from './input';
import { Match, ZONE, type InterceptPlan, type PlayerSim } from './match';
import type { Personality } from './personalities';
import { SHOT_SPECIALS } from './rules';

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

const DEFAULT_EXTRA = {
  lobBase: 0,
  tauntChance: 0.3,
  givesUp: false,
  stayAfterHit: false,
  crossBias: false,
  lineWhenBehind: false,
  errorMul: 1,
};

export class CpuBrain {
  readonly side: 0 | 1;
  profile: Personality;
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
  private gaveUp = false;
  private tauntDecided = false;
  private specialDecidedPoint = -1;
  private ghostChoice: Ball | null | undefined = undefined;
  private stayAt: { x: number; y: number } | null = null;

  constructor(side: 0 | 1, profile: AiProfile | Personality, rng: Rng) {
    this.side = side;
    this.profile = { ...DEFAULT_EXTRA, ...profile };
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

    this.thinkSpecial(m, me, input);

    if (m.phase === 'dead') {
      this.thinkTaunt(m, me, input);
      this.moveTo(input, me, 0, -me.facing * (COURT.halfLength + 0.8), 0.5);
      return input;
    }
    this.tauntDecided = false;

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
      }
      return input;
    }
    this.serveWait = 0;

    if (m.phase === 'toss') {
      if (m.rally.server === this.side) {
        const want = m.attempt === 1 ? this.profile.serveFirst : this.profile.serveSecond;
        const half = me.setup.serveMeterHalfPeriod ?? 0.42;
        const rising = m.tossT % (2 * half) < half;
        if ((rising && m.meter >= want - 0.02 && m.ball.z >= 1.8) || (m.ball.vz < 0 && m.ball.z < 1.85)) {
          input.hit = !me.input.hit;
          // Apunta: abierto, a la T o al cuerpo.
          input.moveX = this.rng.pick([-1, 0, 1]);
        }
      }
      return input;
    }

    if (m.phase !== 'rally') {
      this.moveTo(input, me, 0, -me.facing * (COURT.halfLength + 0.8), 0.5);
      return input;
    }

    // Detectar un golpe nuevo del rival para reaccionar con demora.
    if (m.rally.lastHitter !== this.lastHitterSeen) {
      this.lastHitterSeen = m.rally.lastHitter;
      if (m.rally.lastHitter === opp.side) {
        // El Dardo del Vikingo: su golpe no delata para dónde va.
        const dardo = opp.charId === 'elVikingo' ? 0.12 : 0;
        this.reactT = (this.profile.reaction + dardo) * this.rng.range(0.7, 1.3);
        this.plan = null;
        this.shot = null;
        this.letItGo = false;
        this.gaveUp = false;
        this.ghostChoice = undefined;
        this.stayAt = null;
      } else {
        // Acabo de pegar yo: ¿subo a la red? ¿me quedo donde estoy?
        this.goNet = this.rng.chance(this.profile.netRush) && Math.abs(me.y) < COURT.halfLength + 0.5;
        this.stayAt = this.profile.stayAfterHit && this.rng.chance(0.7) ? { x: me.x, y: me.y } : null;
      }
    }

    if (m.ballIncoming(me)) {
      if (this.reactT > 0) {
        this.reactT -= dt;
        return input;
      }
      // Betty: tres pelotas iguales. La CPU a veces sigue una fantasma.
      if (this.ghostChoice === undefined && m.ghosts.length > 0) {
        this.ghostChoice = this.rng.chance(0.6) ? this.rng.pick(m.ghosts).ball : null;
      }
      const followGhost = this.ghostChoice && m.ghosts.some((g) => g.ball === this.ghostChoice) ? this.ghostChoice : undefined;
      this.planT -= dt;
      if (!this.plan || this.planT <= 0) {
        this.plan = m.planIntercept(me, { allowVolley: Math.abs(me.y) < 7.5, ball: followGhost });
        this.planT = 0.12;
        if (this.plan?.goingOut && !followGhost && !this.rng.chance(this.profile.misjudge)) this.letItGo = true;
        // Rosco: "No, esa no". Si no llega, ni la corre.
        if (this.profile.givesUp && this.plan && !this.plan.feasible && !this.gaveUp && this.rng.chance(0.7)) {
          this.gaveUp = true;
          m.emit({ type: 'emote', side: me.side, text: 'noChase' });
        }
      }
      if (!this.shot) this.shot = this.chooseShot(m, me, opp);

      if (this.letItGo) {
        const away = me.x - m.ball.x >= 0 ? 1 : -1;
        this.moveTo(input, me, m.ball.x + away * 2.2, me.y);
        return input;
      }
      if (this.gaveUp) return input;

      if (this.plan) this.moveTo(input, me, this.plan.x, this.plan.y);

      if (m.ballForMe(me) && !this.pressedHit && me.swingT <= 0 && !me.prep) {
        const zi = m.zoneInfo(me);
        const shot = this.shot;
        const trigger =
          zi.inDepth &&
          zi.inHeight &&
          Math.abs(zi.l) <= zi.reach + ZONE.diveExtra * 0.9 &&
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
    if (this.stayAt) {
      this.moveTo(input, me, this.stayAt.x, this.stayAt.y);
      return input;
    }
    const shot = m.lastShot;
    const homeX = shot ? shot.intended.x * 0.3 : 0;
    const homeY = this.goNet ? -me.facing * 2.6 : -me.facing * (COURT.halfLength + 0.9);
    this.moveTo(input, me, homeX, homeY);
    return input;
  }

  /** Cargadas: después de ganar un punto (o cuando la receta la pide). */
  private thinkTaunt(m: Match, me: PlayerSim, input: PlayerInput): void {
    if (this.tauntDecided || me.mods.tauntedThisDead || m.phaseT < 0.45) return;
    this.tauntDecided = true;
    const won = m.lastPointWinner === me.side;
    const r = m.myst.rulesOf(me);
    const st = m.myst.states[me.side];
    const needs = (id: string) => !!r && r.recipe.includes(id as never) && !st.recipe[r.recipe.indexOf(id as never)];
    let chance = won ? this.profile.tauntChance : 0;
    if (won && (needs('tauntAfterWin') || needs('tauntAny'))) chance = 0.85;
    if (needs('mateLosing') && m.myst.isBehind(me)) chance = 0.9;
    if (this.rng.chance(chance)) input.taunt = true;
  }

  /** Especiales: los "de golpe" se cargan cuando viene la pelota; los otros, al empezar el punto. */
  private thinkSpecial(m: Match, me: PlayerSim, input: PlayerInput): void {
    if (!m.myst.ready(me) || me.mods.armed || me.mods.pointBuff) return;
    const r = m.myst.rulesOf(me)!;
    const pointId = m.score.totalPointsPlayed;
    const isShot = SHOT_SPECIALS.includes(r.special);
    // Tincho guarda el paralelo para cuando va abajo en games (o le quiebran el saque).
    if (r.special === 'paralelo') {
      const sc = m.score;
      const op = other(me.side);
      const behindGames = sc.games[me.side] < sc.games[op];
      const breakPoint = sc.server === me.side && sc.points[op] >= 3 && sc.points[op] > sc.points[me.side];
      if (!behindGames && !breakPoint) return;
    }
    if (isShot) {
      if (m.phase === 'rally' && m.ballIncoming(me) && m.ball.y * me.facing > 0 && this.specialDecidedPoint !== pointId) {
        this.specialDecidedPoint = pointId;
        if (this.rng.chance(0.4)) input.special = true;
      }
    } else if (m.phase === 'preServe' && m.phaseT > 0.4 && this.specialDecidedPoint !== pointId) {
      this.specialDecidedPoint = pointId;
      if (this.rng.chance(0.4)) input.special = true;
    }
  }

  private resetRally(): void {
    this.plan = null;
    this.shot = null;
    this.lastHitterSeen = null;
    this.goNet = false;
    this.letItGo = false;
    this.gaveUp = false;
    this.ghostChoice = undefined;
    this.stayAt = null;
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
    if ((oppAtNet && this.rng.chance(p.lobChance)) || this.rng.chance(p.lobBase)) {
      button = 'slice';
      holdSlice = true;
      depth = 1;
    } else if (this.rng.chance(p.dropChance) && Math.abs(me.y) < COURT.halfLength + 1) {
      button = this.rng.chance(0.5) ? 'slice' : 'hit';
      depth = -1;
    } else if (this.rng.chance(p.sliceChance)) {
      button = 'slice';
    }
    let aimX = this.rng.pick([-0.6, 0, 0.6]);
    if (this.rng.chance(p.aimSmart)) aimX = (opp.x > 0.8 ? -1 : opp.x < -0.8 ? 1 : this.rng.pick([-1, 1])) * 0.8;
    // El Vikingo: cruzado y profundo. Tincho, yendo abajo: el paralelo.
    if (p.crossBias && this.rng.chance(0.7)) {
      aimX = -(Math.sign(me.x) || 1) * 0.9;
      depth = 1;
    }
    if (p.lineWhenBehind && m.myst.isBehind(me) && this.rng.chance(0.7)) aimX = (Math.sign(me.x) || 1) * 0.9;
    const charge = button === 'hit' && !oppAtNet && depth >= 0 && this.rng.chance(p.chargeChance);
    const dTrigger = ZONE.dIdeal + this.rng.gauss() * p.timingJitter * 0.5;
    return { button, holdSlice, aimX, depth, dTrigger, charge };
  }

  private moveTo(input: PlayerInput, me: PlayerSim, tx: number, ty: number, speed = 1): void {
    const dx = tx - me.x;
    const dy = ty - me.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.08) return;
    const k = Math.min(1, dist / 0.35) * speed;
    input.moveX = (dx / dist) * k;
    input.moveY = (dy / dist) * k;
  }
}
