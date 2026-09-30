// Simulación del partido: jugadores, pelota, saque, golpes, reglas y mística.
// No usa Phaser: la escena solo la dibuja y le pasa la entrada. Así se puede testear y
// correr partidos CPU contra CPU a toda velocidad.

import { COURT, facingOf, halfOf, inServiceBox, inSinglesCourt, rightSignOf } from '../logic/court';
import {
  PHYS,
  SURFACES,
  horizontalSpeed,
  makeBall,
  netClearance,
  predictPath,
  solveLaunch,
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
import { KMH_FACTOR, clamp, computeServe, computeShot, type ShotKind, type ShotResult } from '../logic/shots';
import { physiqueOf, type Physique, type Stats } from '../logic/stats';
import { edgesOf, emptyInput, type InputEdges, type PlayerInput } from './input';
import { Mystique } from './mystique';
import { SHOT_SPECIALS, type SpecialId, type StepId } from './rules';
import { VenueEvents } from './venueEvents';
import { VENUES, type VenueDef, type VenueEventId, type VenueId } from './venues';

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
  | 'lament'
  | 'taunt'
  | 'hurt'
  | 'burn';

export type EmoteKey = '?' | 'lumbar' | 'apurado' | 'jaja' | 'poker' | 'tentado' | 'confused' | 'burn' | 'noChase' | 'slip';

export interface PlayerSetup {
  name: string;
  stats: Stats;
  human: boolean;
  /** Personaje (activa su mística). Sin personaje, juega "neutro". */
  charId?: string;
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
  /** Sede (superficie, alambrado, eventos). Sin sede: cancha neutra sin eventos. */
  venue?: VenueId;
  surface?: Surface;
  players: [PlayerSetup, PlayerSetup];
  seed?: number;
  firstServer?: Side;
  /** Eventos de la sede (pelota de fútbol, ardilla, etc.). Por defecto, prendidos. */
  venueEvents?: boolean;
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
  taunts: number;
  specials: number;
  lumbar: number;
  netVisits: number;
}

export type MatchEvent =
  /** fresh = punto nuevo (false en el segundo saque o después de un let: sigue el mismo punto). */
  | { type: 'pointStart'; server: Side; serveSide: 'deuce' | 'ad'; attempt: 1 | 2; fresh: boolean }
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
  | { type: 'matchOver'; winner: Side }
  // Mística
  | { type: 'recipe'; side: Side; step: 0 | 1 | 2; ready: boolean }
  | { type: 'recipeCount'; side: Side; step: StepId; count: number; target: number }
  | { type: 'special'; side: Side; id: SpecialId }
  | { type: 'specialHit'; side: Side; id: SpecialId }
  | { type: 'taunt'; side: Side; good: boolean }
  | { type: 'emote'; side: Side; text: EmoteKey }
  | { type: 'passive'; side: Side; id: string }
  | { type: 'weakness'; side: Side; id: string }
  | { type: 'exento'; side: Side }
  | { type: 'burn'; side: Side }
  | { type: 'ghostPuff'; x: number; y: number }
  | { type: 'obra'; side: Side; x: number; y: number; r: number }
  | { type: 'obraBounce'; x: number; y: number }
  // Sedes
  | { type: 'venue'; id: VenueEventId; stage: 'start' | 'hit'; x?: number; y?: number; side?: Side }
  | { type: 'replay'; reason: string }
  | { type: 'fence'; x: number; y: number };

interface Prep {
  button: 'hit' | 'slice';
  t: number;
  heldT: number;
  released: boolean;
}

export interface PlayerMods {
  /** No se puede mover (admirando su golpe, doblado de la espalda, soplándose las manos). */
  frozenT: number;
  frozenAnim: AnimName;
  /** Especial de golpe cargado para el próximo golpe. */
  armed: SpecialId | null;
  /** Especial que dura el resto del punto. */
  pointBuff: 'dinein' | 'minicargadora' | null;
  /** Rosco: se le trabó la espalda hasta el final del game. */
  lumbar: boolean;
  /** Volpi: se tentó; su próximo primer saque sale flojo. */
  weakServe: boolean;
  /** Multiplicador de error del próximo saque (la carcajada de Rosco). */
  serveErrorMul: number;
  tauntT: number;
  tauntedThisDead: boolean;
  netT: number;
  confusedShown: boolean;
  /** Ya avisó que resbaló en el charco este punto. */
  slipShown: boolean;
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
  diveDir = 1;
  lockT = 0;
  lastPressure = 0;
  input: PlayerInput = emptyInput();
  prevInput: PlayerInput = emptyInput();
  mods: PlayerMods = {
    frozenT: 0,
    frozenAnim: 'idle',
    armed: null,
    pointBuff: null,
    lumbar: false,
    weakServe: false,
    serveErrorMul: 1,
    tauntT: 0,
    tauntedThisDead: false,
    netT: 0,
    confusedShown: false,
    slipShown: false,
  };
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
    taunts: 0,
    specials: 0,
    lumbar: 0,
    netVisits: 0,
  };

  constructor(side: Side, setup: PlayerSetup) {
    this.side = side;
    this.facing = facingOf(side);
    this.rightSign = rightSignOf(side);
    this.setup = setup;
    this.stats = setup.stats;
    this.phys = physiqueOf(setup.stats, { short: setup.short, slowStart: setup.slowStart });
    // Angelito, "motor de hormiga": el más rápido.
    if (setup.charId === 'angelito') this.phys.maxSpeed *= 1.1;
  }

  get name(): string {
    return this.setup.name;
  }

  get charId(): string | undefined {
    return this.setup.charId;
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

  diveExtra(): number {
    return ZONE.diveExtra + (this.setup.charId === 'angelito' ? 0.4 : 0);
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

export interface Ghost {
  ball: Ball;
  alive: boolean;
}

export class Match {
  readonly rng: Rng;
  readonly surface: Surface;
  readonly players: [PlayerSim, PlayerSim];
  readonly myst: Mystique;
  readonly venue: VenueDef | null;
  readonly venueEv: VenueEvents;
  eventsEnabled: boolean;
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
    | { kind: 'replay' }
    | { kind: 'point'; winner: Side; reason: PointReason }
    | null = null;
  lastShot: ShotResult | null = null;
  timeSinceHit = 0;
  /** Hit-stop pedido por el último golpe (lo consume la escena). */
  hitStop = 0;
  longestRally = 0;
  /** Pelotas fantasma de Betty (solo se ven: desaparecen al picar). */
  ghosts: Ghost[] = [];
  /** Zona en obra que deja la minicargadora (pique al azar), hasta el final del game. */
  obra: { side: Side; x: number; y: number; r: number } | null = null;
  /** Posición de Betty cuando dispara (para dibujarla). */
  betty: { side: Side; x: number; y: number; t: number } | null = null;
  /** Quién ganó el último punto (vale para cargar hasta el próximo saque). */
  lastPointWinner: Side | null = null;
  private events: MatchEvent[] = [];
  private assistPlan: [InterceptPlan | null, InterceptPlan | null] = [null, null];
  private assistT = 0;

  constructor(cfg: MatchConfig) {
    this.rng = createRng(cfg.seed ?? Date.now());
    this.venue = cfg.venue ? VENUES[cfg.venue] : null;
    this.surface = cfg.surface ?? this.venue?.surface ?? SURFACES.hard;
    this.eventsEnabled = cfg.venueEvents ?? true;
    this.players = [new PlayerSim(0, cfg.players[0]), new PlayerSim(1, cfg.players[1])];
    this.myst = new Mystique(this);
    this.venueEv = new VenueEvents(this, this.venue);
    this.score = newMatch(cfg.rules ?? {}, cfg.firstServer ?? 0);
    this.rally = new Rally(this.score.server, serveSide(this.score));
    this.setupPoint();
  }

  drainEvents(): MatchEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  emit(e: MatchEvent): void {
    this.events.push(e);
  }

  private push(e: MatchEvent): void {
    this.events.push(e);
  }

  get server(): PlayerSim {
    return this.players[this.rally.server];
  }

  get receiver(): PlayerSim {
    return this.players[this.rally.receiver];
  }

  /** Cámara lenta tipo repetición de TV (el Paralelo Académico en vuelo). */
  get slowMo(): boolean {
    return this.phase === 'rally' && this.ball.tag === 'paralelo';
  }

  // ------------------------------------------------------------------ puntos

  private setupPoint(fresh = true): void {
    const side = serveSide(this.score);
    this.rally = new Rally(this.score.server, side);
    this.pending = null;
    this.lastShot = null;
    this.phase = 'preServe';
    this.phaseT = 0;
    this.timeSinceHit = 0;
    this.ghosts = [];
    this.betty = null;
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
      p.mods.frozenT = 0;
      p.mods.pointBuff = null;
      p.mods.tauntT = 0;
      p.mods.netT = 0;
      p.mods.confusedShown = false;
      p.setAnim('idle');
      // Entre puntos se recupera el aire.
      p.air = Math.min(1, p.air + 0.6);
    }
    this.placeBallInHand();
    this.myst.onPointStart();
    for (const p of this.players) p.mods.slipShown = false;
    this.push({ type: 'pointStart', server: this.rally.server, serveSide: side, attempt: this.attempt, fresh });
    // Después del pointStart, así la escena primero limpia lo del punto anterior y después
    // dibuja lo que trae este (charco, piña, polen...).
    this.venueEv.onPointStart(fresh);
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
      if (p.mods.frozenT > 0) p.mods.frozenT -= dt;
      if (p.mods.tauntT > 0) p.mods.tauntT -= dt;
    }
    if (this.betty) this.betty.t += dt;

    if (this.phase === 'preServe' || this.phase === 'toss' || this.phase === 'rally') {
      for (const p of this.players) if (edges[p.side].specialPressed) this.activateSpecial(p);
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
        this.stepDead(dt, edges);
        break;
      case 'matchOver':
        this.stepBallOnly(dt);
        for (const p of this.players) this.movePlayer(p, dt, true);
        break;
    }
    this.stepGhosts(dt);
    this.venueEv.step(dt);
  }

  /** Algo de la sede interrumpió el punto (pelota de fútbol, ardilla): se repite. */
  forceReplay(reason: string): void {
    if (this.phase !== 'rally' || this.rally.decided) return;
    this.rally.decided = true;
    this.phase = 'dead';
    this.phaseT = 0;
    this.pending = { kind: 'replay' };
    for (const p of this.players) {
      p.prep = null;
      p.sliceWindow = null;
      p.mods.pointBuff = null;
    }
    this.ghosts = [];
    this.push({ type: 'replay', reason });
  }

  /** St. Regis: el alambrado está cerca del fondo y la pelota rebota. */
  private checkFence(rules: boolean): void {
    const fy = this.venue?.fenceY;
    const b = this.ball;
    if (!fy || Math.abs(b.y) <= fy) return;
    b.y = Math.sign(b.y) * fy;
    b.vy = -b.vy * 0.35;
    b.vx *= 0.7;
    b.vz *= 0.5;
    this.push({ type: 'fence', x: b.x, y: b.y });
    if (rules) this.handleDecision(this.rally.onFence());
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
    srv.setAnim(srv.mods.tauntT > 0 ? 'taunt' : 'idle');
    this.movePlayer(rcv, dt, true);
    this.placeBallInHand();
    for (const p of this.players) this.tryTaunt(p, edges[p.side]);
    if (edges[srv.side].hitPressed && this.phaseT > 0.25 && srv.mods.tauntT <= 0) {
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
    let power = this.meter;
    // Volpi tentado: el primer saque le sale flojito.
    if (srv.mods.weakServe && this.attempt === 1) {
      power = Math.min(power, 0.3);
      srv.mods.weakServe = false;
      this.push({ type: 'weakness', side: srv.side, id: 'tientaSaque' });
    }
    const res = computeServe(
      {
        stats: srv.stats,
        side: srv.side,
        from: { x: b.x, y: b.y, z: b.z },
        power,
        aimX: srv.input.moveX,
        serveSide: this.rally.serveSide,
        errorMul: (srv.setup.errorMul ?? 1) * srv.mods.serveErrorMul,
      },
      this.rng,
    );
    srv.mods.serveErrorMul = 1;
    this.lastPointWinner = null;
    // Una cargada por punto: se habilita de nuevo recién con el saque.
    for (const p of this.players) p.mods.tauntedThisDead = false;
    this.applyShot(res);
    this.ball.tag = null;
    this.rally.onServe();
    this.phase = 'rally';
    this.phaseT = 0;
    this.timeSinceHit = 0;
    srv.swingT = 0.4;
    srv.swingAnim = 'serve';
    srv.setAnim('serve');
    srv.counters.maxKmh = Math.max(srv.counters.maxKmh, res.kmh);
    this.hitStop = power > 0.85 ? 0.05 : 0.02;
    this.push({ type: 'serve', side: srv.side, kmh: res.kmh, power });
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
    this.checkFence(false);
  }

  private stepGhosts(dt: number): void {
    if (!this.ghosts.length) return;
    for (const g of this.ghosts) {
      if (!g.alive) continue;
      const ev = stepBall(g.ball, dt, this.surface);
      for (const e of ev) {
        if (e.type === 'bounce' || e.type === 'net') {
          g.alive = false;
          this.push({ type: 'ghostPuff', x: g.ball.x, y: g.ball.y });
          break;
        }
      }
    }
    this.ghosts = this.ghosts.filter((g) => g.alive);
  }

  private stepRally(dt: number, edges: InputEdges[]): void {
    this.timeSinceHit += dt;
    for (const e of stepBall(this.ball, dt, this.surface)) {
      if (e.type === 'bounce') {
        const hitter = this.rally.lastHitter;
        const d = this.rally.onBounce(e.x, e.y);
        this.push({ type: 'bounce', x: e.x, y: e.y, speed: e.speed, inPlay: d.type === 'continue' });
        if (d.type === 'continue' && this.rally.bouncesSinceHit === 1 && hitter !== null) {
          this.myst.onBounceIn(hitter);
          this.specialBounce(e.x, e.y);
        }
        this.handleDecision(d);
      } else if (e.type === 'net') {
        this.push({ type: 'net', x: e.x });
        this.handleDecision(this.rally.onNet());
      } else if (e.type === 'netCord') {
        this.rally.onNetCord();
        this.push({ type: 'netCord', x: e.x });
      }
    }
    if (this.phase === 'rally') this.checkFence(true);
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

  /** Piques especiales: la dejadita mágica vuelve hacia la red; la zona en obra pica al azar. */
  private specialBounce(x: number, y: number): void {
    const b = this.ball;
    if (b.tag === 'reyDeCopas') {
      b.vy = -b.vy * 0.8;
      b.vx *= 0.4;
      b.vz = Math.min(b.vz, 1.4);
    }
    // Sedes: el musgo del Boss frena la pelota; la piña la desvía.
    const zone = this.venueEv.bounceZone(x, y);
    if (zone === 'moss') {
      b.vz *= 0.55;
      b.vx *= 0.7;
      b.vy *= 0.7;
    } else if (zone === 'pina') {
      const sp = Math.hypot(b.vx, b.vy);
      const ang = Math.atan2(b.vy, b.vx) + this.rng.range(-1.4, 1.4);
      b.vx = Math.cos(ang) * sp;
      b.vy = Math.sin(ang) * sp;
      b.vz *= this.rng.range(0.6, 1.6);
      this.push({ type: 'venue', id: 'pina', stage: 'hit', x, y });
    }
    const o = this.obra;
    if (o && halfOf(y) === o.side && Math.hypot(x - o.x, y - o.y) < o.r) {
      const sp = Math.hypot(b.vx, b.vy);
      const ang = Math.atan2(b.vy, b.vx) + this.rng.range(-1.2, 1.2);
      b.vx = Math.cos(ang) * sp * this.rng.range(0.6, 1.3);
      b.vy = Math.sin(ang) * sp * this.rng.range(0.6, 1.3);
      b.vz *= this.rng.range(0.5, 1.5);
      this.push({ type: 'obraBounce', x, y });
    }
  }

  private stepDead(dt: number, edges: InputEdges[]): void {
    this.stepBallOnly(dt);
    for (const p of this.players) {
      this.tickTimers(p, dt);
      this.tryTaunt(p, edges[p.side]);
      this.movePlayer(p, dt, p.lockT <= 0);
      if (this.pending?.kind === 'point' && p.swingT <= 0 && p.lockT <= 0 && p.mods.tauntT <= 0 && this.phaseT > 0.35) {
        const still = Math.hypot(p.vx, p.vy) < 0.4;
        if (still && p.mods.frozenT <= 0) p.setAnim(this.pending.winner === p.side ? 'celebrate' : 'lament');
      }
    }
    const wait = this.pending?.kind === 'point' ? 1.9 : 1.2;
    const taunting = this.players.some((p) => p.mods.tauntT > 0.3);
    if (this.phaseT < wait || (taunting && this.phaseT < wait + 1)) return;

    const pend = this.pending;
    if (!pend) return;
    if (pend.kind === 'fault') {
      this.attempt = 2;
      this.setupPoint(false);
    } else if (pend.kind === 'let') {
      this.setupPoint(false);
    } else if (pend.kind === 'replay') {
      this.attempt = 1;
      this.setupPoint();
    } else {
      const { score, events } = pointWon(this.score, pend.winner);
      this.score = score;
      const gameEnded = events.some((e) => e.type === 'game');
      if (gameEnded) {
        this.obra = null;
        for (const p of this.players) p.mods.lumbar = false;
      }
      this.myst.onScoreChanged(gameEnded);
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
      p.mods.pointBuff = null;
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
    const unforced = (reason === 'out' || reason === 'net') && this.rally.shots > 1 && l.lastPressure < 0.45;

    // Seba, inmunidad diplomática: su primer error no forzado del partido queda EXENTO.
    const ls = this.myst.states[loser];
    if (unforced && this.myst.isChar(l, 'elSeba') && !ls.exentoUsed) {
      ls.exentoUsed = true;
      this.pending = { kind: 'replay' };
      this.push({ type: 'exento', side: loser });
      this.push({ type: 'passive', side: loser, id: 'exento' });
      return;
    }

    w.counters.pointsWon++;
    this.lastPointWinner = winner;
    if (reason === 'ace') w.counters.aces++;
    if (reason === 'winner' || reason === 'ace') w.counters.winners++;
    if (unforced) l.counters.unforcedErrors++;
    this.longestRally = Math.max(this.longestRally, this.rally.shots);
    this.push({ type: 'point', winner, loser, reason, out, rally: this.rally.shots, unforced });
    this.myst.onPointFinished({ winner, loser, reason, rally: this.rally.shots, server: this.rally.server });

    // Rosco, carcajada contagiosa: si el rival erra solo, se ríe y el rival saca nervioso.
    if (unforced && this.myst.isChar(w, 'elRosco')) {
      l.mods.serveErrorMul = 1.6;
      this.push({ type: 'emote', side: winner, text: 'jaja' });
      this.push({ type: 'passive', side: winner, id: 'carcajada' });
    }
  }

  // ------------------------------------------------------------------ mística

  private tryTaunt(p: PlayerSim, edges: InputEdges): void {
    if (!edges.tauntPressed || p.mods.tauntedThisDead || p.lockT > 0) return;
    // Se puede cargar entre puntos (con el punto recién terminado) o antes de sacar.
    const lastWinner = this.lastPointWinner;
    if (this.phase !== 'dead' && this.phase !== 'preServe') return;
    p.mods.tauntedThisDead = true;
    p.mods.tauntT = 1.3;
    p.setAnim('taunt');
    p.counters.taunts++;
    const good = lastWinner === p.side;
    if (!good && lastWinner !== null) {
      // Cargar después de perder: queda en ridículo (y cansado).
      p.air = Math.max(0, p.air - 0.15);
    }
    this.push({ type: 'taunt', side: p.side, good });
    this.myst.onTaunt(p, good);
  }

  private activateSpecial(p: PlayerSim): void {
    if (p.mods.armed || p.mods.pointBuff) return;
    const id = this.myst.tryActivate(p);
    if (!id) return;
    p.counters.specials++;
    if (SHOT_SPECIALS.includes(id)) {
      p.mods.armed = id;
    } else if (id === 'dinein') {
      p.mods.pointBuff = 'dinein';
    } else if (id === 'minicargadora') {
      p.mods.pointBuff = 'minicargadora';
      const rival = other(p.side);
      const f = facingOf(p.side);
      this.obra = { side: rival, x: this.rng.range(-2.8, 2.8), y: f * this.rng.range(3.5, 8.5), r: 1.3 };
      this.push({ type: 'obra', side: rival, x: this.obra.x, y: this.obra.y, r: this.obra.r });
    }
    this.push({ type: 'special', side: p.side, id });
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
    // El Paralelo Académico solo lo devuelve el que está pegado a esa línea.
    const reach = b.tag === 'paralelo' ? Math.min(1.2, p.phys.reach) : p.phys.reach;
    const inReach = Math.abs(l) <= reach;
    return { l, d, inDepth, inHeight, inReach, reach, inZone: inDepth && inHeight && inReach };
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
    const reach = zi.reach;
    const diveExtra = this.ball.tag === 'paralelo' ? 0 : p.diveExtra();

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

    // Especiales que devuelven solos: la pala de la minicargadora y la volea imán de Dinein.
    const buff = p.mods.pointBuff;
    if (forMe && buff === 'minicargadora' && zi.inDepth && zi.inHeight && Math.abs(zi.l) <= 4) {
      this.contact(p, 'hit', 0.3, false, { auto: true });
    } else if (
      forMe &&
      buff === 'dinein' &&
      this.rally.bouncesSinceHit === 0 &&
      Math.abs(p.y) < 7 &&
      zi.inDepth &&
      zi.inHeight &&
      Math.abs(zi.l) <= reach + 1.8
    ) {
      this.contact(p, 'hit', 0, false, { auto: true });
    }

    const canAct = p.lockT <= 0 && p.swingT <= 0.08 && p.mods.frozenT <= 0;

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
        Math.abs(zi.l) <= reach + diveExtra &&
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
      } else if (forMe && zi.inDepth && zi.inHeight && Math.abs(zi.l) <= reach + diveExtra) {
        this.startDive(p, Math.sign(zi.l));
      } else if (this.ballIncoming(p)) {
        p.prep = { button, t: 0, heldT: 0, released: false };
      } else {
        this.whiff(p);
      }
    }

    this.movePlayer(p, dt, p.lockT <= 0 && p.mods.frozenT <= 0);

    // El Vikingo en la red: territorio desconocido.
    if (Math.abs(p.y) < 6.4) {
      if (p.mods.netT === 0) p.counters.netVisits++;
      p.mods.netT += dt;
      if (this.myst.isChar(p, 'elVikingo') && p.mods.netT > 0.6 && !p.mods.confusedShown) {
        p.mods.confusedShown = true;
        this.push({ type: 'emote', side: p.side, text: 'confused' });
        this.push({ type: 'weakness', side: p.side, id: 'red' });
      }
    } else p.mods.netT = 0;
  }

  private startDive(p: PlayerSim, dir: number): void {
    p.prep = null;
    p.sliceWindow = null;
    p.diveT = 0.3;
    p.diveDir = dir || p.rightSign;
    p.vx = p.diveDir * 7.5;
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

  private contact(p: PlayerSim, btn: 'hit' | 'slice' | 'lob', charge: number, dove: boolean, opts: { auto?: boolean } = {}): void {
    const b = this.ball;
    const r = this.rally;
    const zi = this.zoneInfo(p);
    const rival = this.players[other(p.side)];
    const bounced = r.bouncesSinceHit >= 1;
    const nearNet = Math.abs(p.y) < 7.0;
    let aimDepth = p.input.moveY * p.facing;
    let aimX = p.input.moveX;
    const incomingTag = b.tag ?? null;
    let errorMul = (p.setup.errorMul ?? 1) * (p.air < 0.15 ? 1.25 : 1);
    let forceMiss: 'net' | 'out' | undefined;

    // Los especiales automáticos apuntan al hueco y casi no fallan.
    if (opts.auto) {
      aimX = rival.x > 0 ? -1 : 1;
      aimDepth = 1;
      errorMul *= 0.3;
    }

    let kind: ShotKind;
    if (b.z > 1.95 && btn === 'hit') kind = 'smash';
    else if (!bounced && nearNet) kind = aimDepth < -0.3 ? 'dropVolley' : 'volley';
    else if (btn === 'lob') kind = 'lob';
    else if (btn === 'slice') kind = aimDepth < -0.3 ? 'drop' : 'slice';
    else kind = aimDepth < -0.3 ? 'short' : 'drive';

    // La pelota frita de Mabel quema: la devolución sale floja y alta, lista para el smash.
    if (incomingTag === 'frita') {
      kind = 'lob';
      aimDepth = -1;
      errorMul *= 0.5;
      p.mods.frozenT = 0.45;
      p.mods.frozenAnim = 'burn';
      this.push({ type: 'burn', side: p.side });
    }
    // La dejadita del Rey de Copas: si llegás, llegás sin aire.
    if (incomingTag === 'reyDeCopas') p.air = 0;

    const timing = Match.timingOf(zi.d);
    // Seba, apurado: si le pega antes de tiempo, 25% de mandarla a la red o afuera.
    if (this.myst.isChar(p, 'elSeba') && timing < -0.55 && !opts.auto && this.rng.chance(0.25)) {
      forceMiss = this.rng.chance(0.5) ? 'net' : 'out';
      this.push({ type: 'emote', side: p.side, text: 'apurado' });
      this.push({ type: 'weakness', side: p.side, id: 'apurado' });
    }
    // El Vikingo volea torpe.
    if (this.myst.isChar(p, 'elVikingo') && (kind === 'volley' || kind === 'dropVolley')) errorMul *= 1.8;

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
    const armed = p.mods.armed;
    let res = computeShot(
      {
        kind,
        stats: p.stats,
        side: p.side,
        from: { x: b.x, y: b.y, z: b.z },
        timing,
        contactSide,
        aimX,
        aimDepth,
        charge,
        pressure,
        errorMul: armed ? errorMul * 0.4 : errorMul,
        forceMiss: armed ? undefined : forceMiss,
      },
      this.rng,
    );
    // Volpi: su slice pica bajito y patina.
    if (kind === 'slice' && this.myst.isChar(p, 'volpi')) {
      res.bounceE = 0.5;
      res.bounceF = 1.15;
    }
    if (armed) res = this.specialShot(p, armed, res, rival);
    this.applyShot(res);
    b.tag = armed ?? null;
    if (armed) {
      p.mods.armed = null;
      this.push({ type: 'specialHit', side: p.side, id: armed });
    }

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
    this.hitStop = kind === 'smash' || armed ? 0.07 : charge > 0.6 ? 0.05 : 0.033;

    // Después del golpe: Rosco queda doblado; Angelito se queda admirándolo.
    if (armed === 'reyDeCopas') {
      p.mods.frozenT = 2.0;
      p.mods.frozenAnim = 'hurt';
      p.counters.lumbar++;
    } else if (this.myst.isChar(p, 'angelito') && p.mods.pointBuff !== 'minicargadora') {
      p.mods.frozenT = 0.4;
      p.mods.frozenAnim = 'idle';
      this.push({ type: 'emote', side: p.side, text: '?' });
    }

    const cross = Math.sign(res.intended.x) !== 0 && Math.sign(res.intended.x) === -Math.sign(b.x || contactSide) && Math.abs(res.intended.x) >= 1.5;
    this.myst.onContact(p, {
      kind,
      dove,
      stretched: Math.abs(zi.l) > p.phys.reach * 0.72,
      cross,
      depth: Math.abs(p.y),
    });
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

  /** Los golpes especiales: cambian destino, velocidad y efecto del golpe normal. */
  private specialShot(p: PlayerSim, id: SpecialId, res: ShotResult, rival: PlayerSim): ShotResult {
    const b = this.ball;
    const f = p.facing;
    const from = { x: b.x, y: b.y, z: b.z };
    const solve = (target: { x: number; y: number }, T: number, gMul: number, margin: number) => {
      let t = T;
      for (let i = 0; i < 40; i++) {
        const c = netClearance(from, solveLaunch(from, target, t, gMul), gMul);
        if (c === null || c >= margin) break;
        t *= 1.05;
      }
      const vel = solveLaunch(from, target, t, gMul);
      return { vel, T: t, kmh: Math.round(Math.hypot(vel.vx, vel.vy, vel.vz) * KMH_FACTOR) };
    };
    if (id === 'reyDeCopas') {
      // Dejadita mágica pegada a la red, lejos del rival.
      const target = { x: rival.x > 0 ? -2.4 : 2.4, y: f * 1.3 };
      const s = solve(target, 0.95, 1, 0.1);
      return { ...res, kind: 'drop', ...s, gMul: 1, bounceE: 0.6, bounceF: 0.5, intended: target, target };
    }
    if (id === 'paralelo') {
      // Passing paralelo tipo láser, pegado a la línea del lado en el que está.
      const line = Math.sign(p.x) || p.rightSign;
      const target = { x: line * 3.85, y: f * 10.4 };
      const dist = Math.hypot(target.x - from.x, target.y - from.y);
      const s = solve(target, dist / 29, 1.35, 0.08);
      return { ...res, ...s, gMul: 1.35, bounceE: 0.9, bounceF: 1.05, intended: target, target };
    }
    if (id === 'betty') {
      // Betty dispara tres pelotas iguales desde su cañón; una sola es de verdad.
      const bx = clamp(p.x + p.rightSign * 1.6, -6.5, 6.5);
      const origin = { x: bx, y: p.y, z: 0.9 };
      this.betty = { side: p.side, x: bx, y: p.y, t: 0 };
      const lanes = [-3, 0, 3];
      const real = Math.floor(this.rng.next() * 3) % 3;
      const depth = f * this.rng.range(8.5, 10);
      const T = 1.15;
      const shots = lanes.map((x) => {
        const target = { x: x + this.rng.range(-0.4, 0.4), y: depth };
        return { target, vel: solveLaunch(origin, target, T, 1.1) };
      });
      this.ghosts = shots
        .filter((_, i) => i !== real)
        .map((s) => {
          const g = makeBall(origin.x, origin.y, origin.z);
          Object.assign(g, s.vel, { gMul: 1.1, tag: 'ghost' });
          return { ball: g, alive: true };
        });
      b.x = origin.x;
      b.y = origin.y;
      b.z = origin.z;
      const t = shots[real];
      return { ...res, vel: t.vel, gMul: 1.1, T, intended: t.target, target: t.target, bounceE: 1, bounceF: 1 };
    }
    // Pelota frita: el golpe es normal, pero la pelota quema.
    return res;
  }

  private clampToHalf(p: PlayerSim): void {
    p.x = clamp(p.x, -7.2, 7.2);
    const fence = this.venue?.fenceY;
    const back = fence ? fence - 0.5 : COURT.halfLength + 3.6;
    if (p.side === 0) p.y = clamp(p.y, 0.4, back);
    else p.y = clamp(p.y, -back, -0.4);
  }

  private movePlayer(p: PlayerSim, dt: number, allowInput: boolean): void {
    let ix = allowInput ? p.input.moveX : 0;
    let iy = allowInput ? p.input.moveY : 0;
    if (p.mods.tauntT > 0) {
      ix = 0;
      iy = 0;
    }
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
    if (p.mods.pointBuff === 'dinein') mul *= 1.6;
    if (p.mods.pointBuff === 'minicargadora') mul *= 1.8;
    if (p.mods.lumbar) mul *= 0.6;
    const max = p.phys.maxSpeed * mul;
    const moving = len > 0.05;
    // El charco de la bomba en la pileta: resbala.
    const wet = this.venueEv.inPuddle(p.x, p.y);
    const decel = 42 * (1 - this.surface.slide) * (wet ? 0.12 : 1);
    const a = moving ? p.phys.accel * (wet ? 0.45 : 1) : decel;
    if (wet && !p.mods.slipShown && Math.hypot(p.vx, p.vy) > 2.5) {
      p.mods.slipShown = true;
      this.push({ type: 'emote', side: p.side, text: 'slip' });
    }
    p.vx = approach(p.vx, ix * max, a * dt);
    p.vy = approach(p.vy, iy * max, a * dt);

    // Imán de la dificultad Fácil: empuja suavemente hacia donde conviene estar.
    const plan = this.assistPlan[p.side];
    const assist = p.setup.assist ?? 0;
    let ax = 0;
    let ay = 0;
    if (assist > 0 && plan && plan.feasible && !plan.goingOut && this.phase === 'rally' && allowInput) {
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
    if (this.phase === 'rally') this.myst.onMove(p, moved);

    // Rosco sin aire: "¡Ay, la lumbar!" y a caminar al 60% hasta el final del game.
    if (p.air <= 0.02 && !p.mods.lumbar && this.myst.isChar(p, 'elRosco')) {
      p.mods.lumbar = true;
      p.mods.frozenT = 0.8;
      p.mods.frozenAnim = 'hurt';
      p.counters.lumbar++;
      this.push({ type: 'emote', side: p.side, text: 'lumbar' });
      this.push({ type: 'weakness', side: p.side, id: 'lumbar' });
    }

    if (p.mods.tauntT > 0) p.setAnim('taunt');
    else if (p.swingT > 0) p.setAnim(p.swingAnim);
    else if (p.lockT > 0) p.setAnim('dive');
    else if (p.mods.frozenT > 0) p.setAnim(p.mods.frozenAnim);
    else if (this.phase === 'toss' && p === this.server) p.setAnim('toss');
    else if (p.prep || p.sliceWindow) p.setAnim('prep');
    else if (moved / dt > 0.6) p.setAnim('run');
    else if (p.anim !== 'celebrate' && p.anim !== 'lament') p.setAnim(p.mods.lumbar && this.phase === 'rally' ? 'hurt' : 'idle');
  }

  // ------------------------------------------------------------------ predicción

  /** Dónde conviene pararse para pegarle a la pelota que viene. Lo usan la CPU y el imán. */
  planIntercept(p: PlayerSim, opts: { allowVolley: boolean; reaction?: number; ball?: Ball }): InterceptPlan | null {
    if (!this.ballIncoming(p)) return null;
    const path = predictPath(opts.ball ?? this.ball, this.surface, 3.4, 1 / 60, 2);
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
}

function approach(v: number, target: number, maxDelta: number): number {
  if (v < target) return Math.min(target, v + maxDelta);
  return Math.max(target, v - maxDelta);
}
