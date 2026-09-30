// Simulación del partido: jugadores, pelota, saque, golpes y reglas.
// No usa Phaser: la escena solo la dibuja y le pasa la entrada. Así se puede testear y
// correr partidos CPU contra CPU a toda velocidad.

import { COURT, facingOf, halfOf, inServiceBox, inSinglesCourt, rightSignOf } from '../logic/court';
import {
  PHYS,
  SURFACES,
  horizontalSpeed,
  makeBall,
  predictPath,
  stepBall,
  type Ball,
  type Surface,
} from '../logic/physics';
import { Rally, type Decision, type FaultReason, type PointReason } from '../logic/referee';
import { createRng, type Rng } from '../logic/rng';
import {
  newMatch,
  other,
  pointWon,
  serveSide,
  type MatchRules,
  type MatchScore,
  type ScoreEvent,
  type Side,
} from '../logic/scoring';
import { clamp, computeServe, computeShot, type ShotKind, type ShotResult } from '../logic/shots';
import { physiqueOf, type Physique, type Stats } from '../logic/stats';
import { edgesOf, emptyInput, type InputEdges, type PlayerInput } from './input';

// Zona de golpe, en metros, relativa al jugador. d > 0 = la pelota está delante (hacia la red).
export const ZONE = {
  dMin: -0.75,
  dMax: 1.9,
  dIdeal: 0.45,
  /** Altura máxima para un smash / golpe por arriba de la cabeza. */
  overheadMax: 3.1,
  /** Alcance extra tirándose de palomita. */
  diveExtra: 1.25,
} as const;

export type Phase = 'preServe' | 'toss' | 'rally' | 'dead' | 'matchOver';

export type AnimName =
  | 'idle'
  | 'run'
  | 'prep'
  | 'drive'
  | 'backhand'
  | 'volley'
  | 'smash'
  | 'toss'
  | 'serve'
  | 'dive'
  | 'whiff'
  | 'celebrate'
  | 'lament';

export interface PlayerSetup {
  name: string;
  stats: Stats;
  human: boolean;
  /** Multiplicador de error (dificultad). */
  errorMul?: number;
  /** Imán de dificultad Fácil (0 = nada, 1 = fuerte). */
  assist?: number;
  short?: boolean;
  slowStart?: boolean;
  /** Medio período del medidor de saque, en segundos (más grande = más fácil). */
  serveMeterHalfPeriod?: number;
}

export interface MatchConfig {
  rules?: Partial<MatchRules>;
  surface?: Surface;
  players: [PlayerSetup, PlayerSetup];
  seed?: number;
  firstServer?: Side;
}

export interface PlayerCounters {
  pointsWon: number;
  aces: number;
  doubleFaults: number;
  winners: number;
  unforcedErrors: number;
  dives: number;
  distance: number;
  shots: number;
  maxKmh: number;
  whiffs: number;
}

export type MatchEvent =
  | { type: 'pointStart'; server: Side; serveSide: 'deuce' | 'ad'; attempt: 1 | 2 }
  | { type: 'toss'; side: Side }
  | { type: 'retoss'; side: Side }
  | { type: 'serve'; side: Side; kmh: number; power: number }
  | {
      type: 'hit';
      side: Side;
      kind: ShotKind;
      kmh: number;
      charge: number;
      forehand: boolean;
      timing: number;
      dove: boolean;
      x: number;
      y: number;
      z: number;
    }
  | { type: 'whiff'; side: Side }
  | { type: 'dive'; side: Side }
  | { type: 'bounce'; x: number; y: number; speed: number; inPlay: boolean }
  | { type: 'net'; x: number }
  | { type: 'netCord'; x: number }
  | { type: 'fault'; side: Side; reason: FaultReason; attempt: 1 | 2 }
  | { type: 'let' }
  | {
      type: 'point';
      winner: Side;
      loser: Side;
      reason: PointReason;
      out?: 'long' | 'wide';
      rally: number;
      unforced: boolean;
    }
  | { type: 'score'; events: ScoreEvent[]; score: MatchScore }
  | { type: 'matchOver'; winner: Side };

interface Prep {
  button: 'hit' | 'slice';
  t: number;
  heldT: number;
  released: boolean;
}

export class PlayerSim {
  readonly side: Side;
  readonly facing: -1 | 1;
  readonly rightSign: -1 | 1;
  readonly setup: PlayerSetup;
  readonly stats: Stats;
  readonly phys: Physique;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** Aire (stamina) 0..1. */
  air = 1;
  anim: AnimName = 'idle';
  animT = 0;
  prep: Prep | null = null;
  sliceWindow: { t: number } | null = null;
  swingT = 0;
  swingAnim: AnimName = 'drive';
  diveT = 0;
  lockT = 0;
  lastPressure = 0;
  input: PlayerInput = emptyInput();
  prevInput: PlayerInput = emptyInput();
  counters: PlayerCounters = {
    pointsWon: 0,
    aces: 0,
    doubleFaults: 0,
    winners: 0,
    unforcedErrors: 0,
    dives: 0,
    distance: 0,
    shots: 0,
    maxKmh: 0,
    whiffs: 0,
  };

  constructor(side: Side, setup: PlayerSetup) {
    this.side = side;
    this.facing = facingOf(side);
    this.rightSign = rightSignOf(side);
    this.setup = setup;
    this.stats = setup.stats;
    this.phys = physiqueOf(setup.stats, { short: setup.short, slowStart: setup.slowStart });
  }

  get name(): string {
    return this.setup.name;
  }

  setAnim(a: AnimName): void {
    if (this.anim !== a) {
      this.anim = a;
      this.animT = 0;
    }
  }

  /** Multiplicador de velocidad por falta de aire. */
  airFactor(): number {
    return this.air < 0.25 ? 0.7 + this.air * 1.2 : 1;
  }
}

export interface InterceptPlan {
  x: number;
  y: number;
  t: number;
  z: number;
  volley: boolean;
  feasible: boolean;
  /** La pelota va a picar afuera: conviene dejarla pasar. */
  goingOut: boolean;
}

export class Match {
  readonly rng: Rng;
  readonly surface: Surface;
  readonly players: [PlayerSim, PlayerSim];
  score: MatchScore;
  ball: Ball = makeBall();
  phase: Phase = 'preServe';
  phaseT = 0;
  time = 0;
  rally: Rally;
  attempt: 1 | 2 = 1;
  /** Medidor de saque 0..1. */
  meter = 0;
  tossT = 0;
  pending:
    | { kind: 'fault'; reason: FaultReason }
    | { kind: 'let' }
    | { kind: 'point'; winner: Side; reason: PointReason }
    | null = null;
  lastShot: ShotResult | null = null;
  timeSinceHit = 0;
  /** Hit-stop pedido por el último golpe (lo consume la escena). */
  hitStop = 0;
  longestRally = 0;
  private events: MatchEvent[] = [];
  private assistPlan: [InterceptPlan | null, InterceptPlan | null] = [null, null];
  private assistT = 0;

  constructor(cfg: MatchConfig) {
    this.rng = createRng(cfg.seed ?? Date.now());
    this.surface = cfg.surface ?? SURFACES.hard;
    this.players = [new PlayerSim(0, cfg.players[0]), new PlayerSim(1, cfg.players[1])];
    this.score = newMatch(cfg.rules ?? {}, cfg.firstServer ?? 0);
    this.rally = new Rally(this.score.server, serveSide(this.score));
    this.setupPoint();
  }

  drainEvents(): MatchEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  get server(): PlayerSim {
    return this.players[this.rally.server];
  }

  get receiver(): PlayerSim {
    return this.players[this.rally.receiver];
  }

  // ------------------------------------------------------------------ puntos

  private setupPoint(): void {
    const side = serveSide(this.score);
    this.rally = new Rally(this.score.server, side);
    this.pending = null;
    this.lastShot = null;
    this.phase = 'preServe';
    this.phaseT = 0;
    this.timeSinceHit = 0;
    const srv = this.players[this.rally.server];
    const rcv = this.players[this.rally.receiver];
    const dSign = side === 'deuce' ? 1 : -1;
    srv.x = srv.rightSign * dSign * 0.8;
    srv.y = -srv.facing * (COURT.halfLength + 0.35);
    rcv.x = rcv.rightSign * dSign * 2.6;
    rcv.y = -rcv.facing * (COURT.halfLength + 0.8);
    for (const p of this.players) {
      p.vx = 0;
      p.vy = 0;
      p.prep = null;
      p.sliceWindow = null;
      p.swingT = 0;
      p.diveT = 0;
      p.lockT = 0;
      p.setAnim('idle');
      // Entre puntos se recupera el aire.
      p.air = Math.min(1, p.air + 0.6);
    }
    this.placeBallInHand();
    this.push({ type: 'pointStart', server: this.rally.server, serveSide: side, attempt: this.attempt });
  }

  private placeBallInHand(): void {
    const s = this.server;
    this.ball = makeBall(s.x + s.rightSign * 0.35, s.y + s.facing * 0.15, 1.0);
  }

  // ------------------------------------------------------------------ paso

  step(dt: number, inputs: [PlayerInput, PlayerInput]): void {
    this.time += dt;
    this.phaseT += dt;
    const edges: InputEdges[] = [];
    for (let i = 0; i < 2; i++) {
      const p = this.players[i];
      p.prevInput = p.input;
      p.input = inputs[i];
      edges.push(edgesOf(p.input, p.prevInput));
      p.animT += dt;
    }

    switch (this.phase) {
      case 'preServe':
        this.stepPreServe(dt, edges);
        break;
      case 'toss':
        this.stepToss(dt, edges);
        break;
      case 'rally':
        this.stepRally(dt, edges);
        break;
      case 'dead':
        this.stepDead(dt);
        break;
      case 'matchOver':
        this.stepBallOnly(dt);
        for (const p of this.players) this.movePlayer(p, dt, true);
        break;
    }
  }

  private stepPreServe(dt: number, edges: InputEdges[]): void {
    const srv = this.server;
    const rcv = this.receiver;
    // El que saca solo se mueve de costado, de su lado de la marca central.
    const dSign = this.rally.serveSide === 'deuce' ? 1 : -1;
    const lane = srv.rightSign * dSign;
    srv.x += srv.input.moveX * 2.5 * dt;
    const lx = clamp(srv.x * lane, 0.2, 3.6);
    srv.x = lx * lane;
    srv.setAnim('idle');
    this.movePlayer(rcv, dt, true);
    this.placeBallInHand();
    if (edges[srv.side].hitPressed && this.phaseT > 0.25) {
      this.phase = 'toss';
      this.phaseT = 0;
      this.tossT = 0;
      this.meter = 0;
      this.ball.z = 1.25;
      this.ball.vz = 3.9;
      srv.setAnim('toss');
      this.push({ type: 'toss', side: srv.side });
    }
  }

  private stepToss(dt: number, edges: InputEdges[]): void {
    const srv = this.server;
    this.tossT += dt;
    const half = srv.setup.serveMeterHalfPeriod ?? 0.42;
    const ph = (this.tossT / half) % 2;
    this.meter = ph < 1 ? ph : 2 - ph;
    const b = this.ball;
    b.z += b.vz * dt - 0.5 * PHYS.gravity * dt * dt;
    b.vz -= PHYS.gravity * dt;
    this.movePlayer(this.receiver, dt, true);
    if (edges[srv.side].hitPressed && b.z >= 1.7) {
      this.doServe();
    } else if (b.z < 1.05 && b.vz < 0) {
      this.phase = 'preServe';
      this.phaseT = 0.1;
      srv.setAnim('idle');
      this.push({ type: 'retoss', side: srv.side });
    }
  }

  private doServe(): void {
    const srv = this.server;
    const b = this.ball;
    const res = computeServe(
      {
        stats: srv.stats,
        side: srv.side,
        from: { x: b.x, y: b.y, z: b.z },
        power: this.meter,
        aimX: srv.input.moveX,
        serveSide: this.rally.serveSide,
        errorMul: srv.setup.errorMul ?? 1,
      },
      this.rng,
    );
    this.applyShot(res);
    this.rally.onServe();
    this.phase = 'rally';
    this.phaseT = 0;
    this.timeSinceHit = 0;
    srv.swingT = 0.4;
    srv.swingAnim = 'serve';
    srv.setAnim('serve');
    srv.counters.maxKmh = Math.max(srv.counters.maxKmh, res.kmh);
    this.hitStop = this.meter > 0.85 ? 0.05 : 0.02;
    this.push({ type: 'serve', side: srv.side, kmh: res.kmh, power: this.meter });
  }

  private applyShot(res: ShotResult): void {
    const b = this.ball;
    b.vx = res.vel.vx;
    b.vy = res.vel.vy;
    b.vz = res.vel.vz;
    b.gMul = res.gMul;
    b.bounceE = res.bounceE;
    b.bounceF = res.bounceF;
    b.rolling = false;
    this.lastShot = res;
  }

  private stepBallOnly(dt: number): void {
    for (const e of stepBall(this.ball, dt, this.surface)) {
      if (e.type === 'bounce') this.push({ type: 'bounce', x: e.x, y: e.y, speed: e.speed, inPlay: false });
      else if (e.type === 'net') this.push({ type: 'net', x: e.x });
    }
  }

  private stepRally(dt: number, edges: InputEdges[]): void {
    this.timeSinceHit += dt;
    for (const e of stepBall(this.ball, dt, this.surface)) {
      if (e.type === 'bounce') {
        const d = this.rally.onBounce(e.x, e.y);
        this.push({ type: 'bounce', x: e.x, y: e.y, speed: e.speed, inPlay: d.type === 'continue' });
        this.handleDecision(d);
      } else if (e.type === 'net') {
        this.push({ type: 'net', x: e.x });
        this.handleDecision(this.rally.onNet());
      } else if (e.type === 'netCord') {
        this.rally.onNetCord();
        this.push({ type: 'netCord', x: e.x });
      }
    }
    if (this.ball.rolling) this.handleDecision(this.rally.onDead());
    if (this.phase === 'rally' && this.timeSinceHit > 8 && this.rally.lastHitter !== null) {
      // Red de seguridad: si la pelota se trabó en algún lado, el punto es de quien no pegó.
      this.handleDecision({ type: 'point', winner: other(this.rally.lastHitter), reason: 'winner' });
    }

    this.assistT -= dt;
    if (this.assistT <= 0) {
      this.assistT = 0.1;
      for (const p of this.players) {
        this.assistPlan[p.side] =
          (p.setup.assist ?? 0) > 0 && this.ballIncoming(p) ? this.planIntercept(p, { allowVolley: true }) : null;
      }
    }

    for (const p of this.players) this.updatePlayer(p, dt, edges[p.side]);
  }

  private stepDead(dt: number): void {
    this.stepBallOnly(dt);
    for (const p of this.players) {
      this.tickTimers(p, dt);
      this.movePlayer(p, dt, p.lockT <= 0);
      if (this.pending?.kind === 'point' && p.swingT <= 0 && p.lockT <= 0 && this.phaseT > 0.35) {
        const still = Math.hypot(p.vx, p.vy) < 0.4;
        if (still) p.setAnim(this.pending.winner === p.side ? 'celebrate' : 'lament');
      }
    }
    const wait = this.pending?.kind === 'point' ? 1.9 : 1.2;
    if (this.phaseT < wait) return;

    const pend = this.pending;
    if (!pend) return;
    if (pend.kind === 'fault') {
      this.attempt = 2;
      this.setupPoint();
    } else if (pend.kind === 'let') {
      this.setupPoint();
    } else {
      const { score, events } = pointWon(this.score, pend.winner);
      this.score = score;
      this.push({ type: 'score', events, score });
      if (score.winner !== null) {
        this.phase = 'matchOver';
        this.phaseT = 0;
        this.pending = null;
        this.push({ type: 'matchOver', winner: score.winner });
      } else {
        this.attempt = 1;
        this.setupPoint();
      }
    }
  }

  private handleDecision(d: Decision): void {
    if (d.type === 'continue' || this.phase !== 'rally') return;
    this.phase = 'dead';
    this.phaseT = 0;
    for (const p of this.players) {
      p.prep = null;
      p.sliceWindow = null;
    }
    if (d.type === 'fault') {
      const srv = this.server;
      if (this.attempt === 1) {
        this.pending = { kind: 'fault', reason: d.reason };
        this.push({ type: 'fault', side: srv.side, reason: d.reason, attempt: 1 });
      } else {
        srv.counters.doubleFaults++;
        this.pending = { kind: 'point', winner: this.rally.receiver, reason: 'doubleFault' };
        this.push({ type: 'fault', side: srv.side, reason: d.reason, attempt: 2 });
        this.finishPoint(this.rally.receiver, 'doubleFault');
      }
    } else if (d.type === 'let') {
      this.pending = { kind: 'let' };
      this.push({ type: 'let' });
    } else {
      this.pending = { kind: 'point', winner: d.winner, reason: d.reason };
      this.finishPoint(d.winner, d.reason, d.out);
    }
  }

  private finishPoint(winner: Side, reason: PointReason, out?: 'long' | 'wide'): void {
    const loser = other(winner);
    const w = this.players[winner];
    const l = this.players[loser];
    w.counters.pointsWon++;
    let unforced = false;
    if (reason === 'ace') w.counters.aces++;
    if (reason === 'winner' || reason === 'ace') w.counters.winners++;
    if ((reason === 'out' || reason === 'net') && this.rally.shots > 1) {
      unforced = l.lastPressure < 0.45;
      if (unforced) l.counters.unforcedErrors++;
    }
    this.longestRally = Math.max(this.longestRally, this.rally.shots);
    this.push({ type: 'point', winner, loser, reason, out, rally: this.rally.shots, unforced });
  }

  // ------------------------------------------------------------------ jugadores

  /** La pelota viene hacia este jugador (la pegó el rival y el punto sigue). */
  ballIncoming(p: PlayerSim): boolean {
    return this.phase === 'rally' && !this.rally.decided && this.rally.lastHitter === other(p.side);
  }

  /** La pelota está en condiciones de ser golpeada por este jugador. */
  ballForMe(p: PlayerSim): boolean {
    const r = this.rally;
    if (!this.ballIncoming(p)) return false;
    if (halfOf(this.ball.y) !== p.side) return false;
    if (r.bouncesSinceHit === 0) return !r.isServe;
    return r.bouncesSinceHit === 1;
  }

  zoneInfo(p: PlayerSim) {
    const b = this.ball;
    const l = b.x - p.x;
    const d = (b.y - p.y) * p.facing;
    const zMax = p.setup.short ? ZONE.overheadMax - 0.3 : ZONE.overheadMax;
    const inDepth = d >= ZONE.dMin && d <= ZONE.dMax;
    const inHeight = b.z >= 0.06 && b.z <= zMax;
    const inReach = Math.abs(l) <= p.phys.reach;
    return { l, d, inDepth, inHeight, inReach, inZone: inDepth && inHeight && inReach };
  }

  static timingOf(d: number): number {
    if (d > ZONE.dIdeal) return -(d - ZONE.dIdeal) / (ZONE.dMax - ZONE.dIdeal);
    return (ZONE.dIdeal - d) / (ZONE.dIdeal - ZONE.dMin);
  }

  private tickTimers(p: PlayerSim, dt: number): void {
    if (p.swingT > 0) p.swingT -= dt;
    if (p.diveT > 0) {
      p.diveT -= dt;
      if (p.diveT <= 0) p.lockT = 0.55;
    } else if (p.lockT > 0) p.lockT -= dt;
  }

  private updatePlayer(p: PlayerSim, dt: number, edges: InputEdges): void {
    this.tickTimers(p, dt);
    const forMe = this.ballForMe(p);
    const zi = this.zoneInfo(p);
    const reach = p.phys.reach;

    if (p.diveT > 0) {
      // Volando de palomita: si la pelota entra en el alcance extendido, le pega.
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      this.clampToHalf(p);
      if (forMe && zi.inDepth && zi.inHeight && Math.abs(zi.l) <= reach + 0.5) {
        this.contact(p, 'hit', 0, true);
      }
      return;
    }

    const canAct = p.lockT <= 0 && p.swingT <= 0.08;

    if (p.sliceWindow) {
      p.sliceWindow.t += dt;
      const held = p.input.slice;
      const leaving = !zi.inZone || zi.d < ZONE.dMin + 0.12;
      if (!forMe) {
        p.sliceWindow = null;
      } else if (!held || p.sliceWindow.t >= 0.16 || leaving) {
        const lob = held && p.sliceWindow.t >= 0.1;
        p.sliceWindow = null;
        if (zi.inZone) this.contact(p, lob ? 'lob' : 'slice', 0, false);
        else this.whiff(p);
      }
    } else if (p.prep) {
      const pr = p.prep;
      const held = pr.button === 'hit' ? p.input.hit : p.input.slice;
      if (held && !pr.released) pr.heldT += dt;
      else pr.released = true;
      pr.t += dt;
      const charge = pr.button === 'hit' ? clamp(pr.heldT / 0.7, 0, 1) : 0;
      const btn = pr.button === 'hit' ? 'hit' : pr.heldT >= 0.25 ? 'lob' : 'slice';
      if (!this.ballIncoming(p)) {
        p.prep = null;
      } else if (forMe && zi.inZone && (zi.d <= ZONE.dIdeal + 0.05 || zi.d <= ZONE.dMin + 0.15)) {
        this.contact(p, btn, charge, false);
      } else if (
        forMe &&
        zi.inDepth &&
        zi.inHeight &&
        !zi.inReach &&
        Math.abs(zi.l) <= reach + ZONE.diveExtra &&
        zi.d <= ZONE.dIdeal + 0.35
      ) {
        this.startDive(p, Math.sign(zi.l));
      } else if (forMe && zi.d < ZONE.dMin) {
        p.prep = null;
        this.whiff(p);
      } else if (pr.t > 2.5) {
        p.prep = null;
      }
    } else if (canAct && (edges.hitPressed || edges.slicePressed)) {
      const button = edges.hitPressed ? 'hit' : 'slice';
      if (forMe && zi.inZone) {
        if (button === 'hit') this.contact(p, 'hit', 0, false);
        else p.sliceWindow = { t: 0 };
      } else if (forMe && zi.inDepth && zi.inHeight && Math.abs(zi.l) <= reach + ZONE.diveExtra) {
        this.startDive(p, Math.sign(zi.l));
      } else if (this.ballIncoming(p)) {
        p.prep = { button, t: 0, heldT: 0, released: false };
      } else {
        this.whiff(p);
      }
    }

    this.movePlayer(p, dt, p.lockT <= 0);
  }

  private startDive(p: PlayerSim, dir: number): void {
    p.prep = null;
    p.sliceWindow = null;
    p.diveT = 0.3;
    p.vx = (dir || p.rightSign) * 7.5;
    p.vy *= 0.3;
    p.air = Math.max(0, p.air - 0.08);
    p.counters.dives++;
    p.setAnim('dive');
    this.push({ type: 'dive', side: p.side });
  }

  private whiff(p: PlayerSim): void {
    p.swingT = 0.28;
    p.swingAnim = 'whiff';
    p.setAnim('whiff');
    p.counters.whiffs++;
    this.push({ type: 'whiff', side: p.side });
  }

  private contact(p: PlayerSim, btn: 'hit' | 'slice' | 'lob', charge: number, dove: boolean): void {
    const b = this.ball;
    const r = this.rally;
    const zi = this.zoneInfo(p);
    const bounced = r.bouncesSinceHit >= 1;
    const nearNet = Math.abs(p.y) < 7.0;
    const aimDepth = p.input.moveY * p.facing;
    let kind: ShotKind;
    if (b.z > 1.95 && btn === 'hit') kind = 'smash';
    else if (!bounced && nearNet) kind = aimDepth < -0.3 ? 'dropVolley' : 'volley';
    else if (btn === 'lob') kind = 'lob';
    else if (btn === 'slice') kind = aimDepth < -0.3 ? 'drop' : 'slice';
    else kind = aimDepth < -0.3 ? 'short' : 'drive';

    const timing = Match.timingOf(zi.d);
    const contactSide = Math.abs(zi.l) > 0.12 ? Math.sign(zi.l) : p.rightSign;
    const forehand = contactSide === p.rightSign;
    const incoming = horizontalSpeed(b);
    const pressure = clamp(
      (Math.abs(zi.l) / p.phys.reach) * 0.35 +
        (Math.max(0, incoming - 11) / 18) * 0.45 +
        (dove ? 0.5 : 0) +
        (b.z < 0.3 ? 0.2 : 0) +
        (!bounced && !nearNet ? 0.3 : 0),
      0,
      1,
    );
    const errorMul = (p.setup.errorMul ?? 1) * (p.air < 0.15 ? 1.25 : 1);
    const res = computeShot(
      {
        kind,
        stats: p.stats,
        side: p.side,
        from: { x: b.x, y: b.y, z: b.z },
        timing,
        contactSide,
        aimX: p.input.moveX,
        aimDepth,
        charge,
        pressure,
        errorMul,
      },
      this.rng,
    );
    this.applyShot(res);
    r.onHit(p.side);
    this.timeSinceHit = 0;
    p.lastPressure = pressure;
    p.prep = null;
    p.sliceWindow = null;
    p.swingT = 0.3;
    p.swingAnim =
      kind === 'smash' ? 'smash' : kind === 'volley' || kind === 'dropVolley' ? 'volley' : forehand ? 'drive' : 'backhand';
    if (!dove) p.setAnim(p.swingAnim);
    p.counters.shots++;
    p.counters.maxKmh = Math.max(p.counters.maxKmh, res.kmh);
    this.hitStop = kind === 'smash' ? 0.07 : charge > 0.6 ? 0.05 : 0.033;
    this.push({
      type: 'hit',
      side: p.side,
      kind,
      kmh: res.kmh,
      charge,
      forehand,
      timing,
      dove,
      x: b.x,
      y: b.y,
      z: b.z,
    });
  }

  private clampToHalf(p: PlayerSim): void {
    p.x = clamp(p.x, -7.2, 7.2);
    const back = COURT.halfLength + 3.6;
    if (p.side === 0) p.y = clamp(p.y, 0.4, back);
    else p.y = clamp(p.y, -back, -0.4);
  }

  private movePlayer(p: PlayerSim, dt: number, allowInput: boolean): void {
    let ix = allowInput ? p.input.moveX : 0;
    let iy = allowInput ? p.input.moveY : 0;
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    let mul = p.airFactor();
    // Cargando (botón apretado) se mueve lento; si ya soltó, solo espera la pelota.
    if (p.prep && !p.prep.released) mul *= 0.55;
    if (p.sliceWindow) mul *= 0.4;
    if (p.swingT > 0) mul *= 0.4;
    const max = p.phys.maxSpeed * mul;
    const moving = len > 0.05;
    const decel = 42 * (1 - this.surface.slide);
    const a = moving ? p.phys.accel : decel;
    p.vx = approach(p.vx, ix * max, a * dt);
    p.vy = approach(p.vy, iy * max, a * dt);

    // Imán de la dificultad Fácil: empuja suavemente hacia donde conviene estar.
    const plan = this.assistPlan[p.side];
    const assist = p.setup.assist ?? 0;
    let ax = 0;
    let ay = 0;
    if (assist > 0 && plan && plan.feasible && !plan.goingOut && this.phase === 'rally') {
      const dx = plan.x - p.x;
      const dy = plan.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.1 && dist < 4) {
        ax = (dx / dist) * Math.min(dist, 1) * assist * 2.2;
        ay = (dy / dist) * Math.min(dist, 1) * assist * 2.2;
      }
    }

    const px = p.x;
    const py = p.y;
    p.x += (p.vx + ax) * dt;
    p.y += (p.vy + ay) * dt;
    this.clampToHalf(p);
    const moved = Math.hypot(p.x - px, p.y - py);
    p.counters.distance += moved;

    const sp = Math.hypot(p.vx, p.vy) / p.phys.maxSpeed;
    if (sp > 0.55) p.air = Math.max(0, p.air - p.phys.airDrain * sp * dt);
    else p.air = Math.min(1, p.air + p.phys.airRecover * dt);

    if (p.swingT > 0) p.setAnim(p.swingAnim);
    else if (p.lockT > 0) p.setAnim('dive');
    else if (this.phase === 'toss' && p === this.server) p.setAnim('toss');
    else if (p.prep || p.sliceWindow) p.setAnim('prep');
    else if (moved / dt > 0.6) p.setAnim('run');
    else if (p.anim !== 'celebrate' && p.anim !== 'lament') p.setAnim('idle');
  }

  // ------------------------------------------------------------------ predicción

  /** Dónde conviene pararse para pegarle a la pelota que viene. Lo usan la CPU y el imán. */
  planIntercept(p: PlayerSim, opts: { allowVolley: boolean; reaction?: number }): InterceptPlan | null {
    if (!this.ballIncoming(p)) return null;
    const path = predictPath(this.ball, this.surface, 3.4, 1 / 60, 2);
    const r = this.rally;
    const zMax = p.setup.short ? ZONE.overheadMax - 0.3 : ZONE.overheadMax;
    const baseline = COURT.halfLength;
    let goingOut = false;
    let best: InterceptPlan | null = null;
    let bestScore = -Infinity;
    let fallback: InterceptPlan | null = null;
    let fallbackSlack = -Infinity;
    const reaction = opts.reaction ?? 0;

    let bouncesSeen = r.bouncesSinceHit;
    let prevBounces = 0;
    for (const s of path) {
      if (s.bounces > prevBounces) {
        bouncesSeen += s.bounces - prevBounces;
        prevBounces = s.bounces;
        if (bouncesSeen === 1 && r.bouncesSinceHit === 0) {
          // Primer pique previsto: ¿cae afuera?
          const bx = s.bounceAt?.x ?? s.x;
          const by = s.bounceAt?.y ?? s.y;
          const good = r.isServe
            ? inServiceBox(bx, by, p.side, r.serveSide)
            : inSinglesCourt(bx, by) && halfOf(by) === p.side;
          if (!good) goingOut = true;
        }
      }
      if (bouncesSeen >= 2) break;
      if (halfOf(s.y) !== p.side) continue;
      const volley = bouncesSeen === 0;
      if (volley && (r.isServe || !opts.allowVolley)) continue;
      if (s.z < 0.15 || s.z > zMax) continue;

      const fh = p.rightSign * 0.7;
      const pxF = s.x - fh;
      const pxB = s.x + fh;
      const px = Math.abs(pxF - p.x) <= Math.abs(pxB - p.x) + 0.8 ? pxF : pxB;
      const py = s.y - ZONE.dIdeal * p.facing;
      const dist = Math.hypot(px - p.x, py - p.y);
      const need = dist / (p.phys.maxSpeed * 0.92) + reaction;
      const slack = s.t - need;
      const plan: InterceptPlan = { x: px, y: py, t: s.t, z: s.z, volley, feasible: slack >= 0, goingOut };
      if (slack >= 0) {
        const tooDeep = Math.max(0, Math.abs(py) - (baseline + 1.6));
        const score = -Math.abs(s.z - 1.0) * 2 - tooDeep * 0.8 + Math.min(slack, 0.4) * 0.5 + (volley ? 0.3 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = plan;
        }
      } else if (slack > fallbackSlack) {
        fallbackSlack = slack;
        fallback = plan;
      }
    }
    const out = best ?? fallback;
    if (out) out.goingOut = goingOut;
    return out;
  }

  private push(e: MatchEvent): void {
    this.events.push(e);
  }
}

function approach(v: number, target: number, maxDelta: number): number {
  if (v < target) return Math.min(target, v + maxDelta);
  return Math.max(target, v - maxDelta);
}
