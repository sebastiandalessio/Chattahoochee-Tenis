// Mística: recetas de 3 pasos, especiales (uno por game), pasivas y debilidades de cada personaje.
// Sin Phaser: el partido le avisa lo que pasa y ella tilda pasos y emite eventos.

import { other, type Side } from '../logic/scoring';
import type { ShotKind } from '../logic/shots';
import { RULES, STEP_TARGET, isCharId, type CharId, type SpecialId, type StepId } from './rules';
import type { Match, PlayerSim } from './match';

export interface MystiqueState {
  recipe: [boolean, boolean, boolean];
  counts: Partial<Record<StepId, number>>;
  usedThisGame: boolean;
  /** Seba: su inmunidad diplomática ya se usó en este partido. */
  exentoUsed: boolean;
  // Seguimiento dentro del punto
  rallyMinAir: number;
  allBaseline: boolean;
  runSinceOppHit: number;
  pendingLongRun: boolean;
  centerPending: boolean;
  lastShotKind: ShotKind | null;
  lastShotCross: boolean;
  /** Tiró al menos un globo en este punto. */
  lobInRally: boolean;
}

function freshState(): MystiqueState {
  return {
    recipe: [false, false, false],
    counts: {},
    usedThisGame: false,
    exentoUsed: false,
    rallyMinAir: 1,
    allBaseline: true,
    runSinceOppHit: 0,
    pendingLongRun: false,
    centerPending: false,
    lastShotKind: null,
    lastShotCross: false,
    lobInRally: false,
  };
}

export interface ContactInfo {
  kind: ShotKind;
  dove: boolean;
  /** Le pegó estirado, casi fuera de alcance. */
  stretched: boolean;
  cross: boolean;
  /** |y| del jugador al pegar. */
  depth: number;
}

export interface PointInfo {
  winner: Side;
  loser: Side;
  reason: string;
  rally: number;
  server: Side;
}

export class Mystique {
  readonly states: [MystiqueState, MystiqueState] = [freshState(), freshState()];
  private m: Match;

  constructor(m: Match) {
    this.m = m;
  }

  charOf(p: PlayerSim): CharId | null {
    const c = p.setup.charId;
    return isCharId(c) ? c : null;
  }

  isChar(p: PlayerSim, id: CharId): boolean {
    return this.charOf(p) === id;
  }

  rulesOf(p: PlayerSim) {
    const c = this.charOf(p);
    return c ? RULES[c] : null;
  }

  ready(p: PlayerSim): boolean {
    const s = this.states[p.side];
    return !!this.rulesOf(p) && s.recipe.every(Boolean) && !s.usedThisGame;
  }

  /** Tilda un paso (si todavía no estaba). Se usa también para las chicanas y el Boss. */
  tick(p: PlayerSim, step: 0 | 1 | 2): void {
    const s = this.states[p.side];
    if (s.recipe[step]) return;
    s.recipe[step] = true;
    this.m.emit({ type: 'recipe', side: p.side, step, ready: s.recipe.every(Boolean) });
  }

  private tickId(p: PlayerSim, id: StepId): void {
    const r = this.rulesOf(p);
    if (!r) return;
    const idx = r.recipe.indexOf(id);
    if (idx >= 0) this.tick(p, idx as 0 | 1 | 2);
  }

  private has(p: PlayerSim, id: StepId): boolean {
    const r = this.rulesOf(p);
    return !!r && r.recipe.includes(id) && !this.states[p.side].recipe[r.recipe.indexOf(id)];
  }

  private count(p: PlayerSim, id: StepId): void {
    if (!this.has(p, id)) return;
    const s = this.states[p.side];
    s.counts[id] = (s.counts[id] ?? 0) + 1;
    this.m.emit({ type: 'recipeCount', side: p.side, step: id, count: s.counts[id]!, target: STEP_TARGET[id] ?? 1 });
    if (s.counts[id]! >= (STEP_TARGET[id] ?? 1)) this.tickId(p, id);
  }

  isBehind(p: PlayerSim): boolean {
    const sc = this.m.score;
    const me = p.side;
    const op = other(me);
    return sc.points[me] < sc.points[op] || sc.games[me] < sc.games[op] || sc.sets[me] < sc.sets[op];
  }

  // ---------------------------------------------------------------- ganchos del partido

  onPointStart(): void {
    for (const p of this.m.players) {
      const s = this.states[p.side];
      s.rallyMinAir = p.air;
      s.allBaseline = true;
      s.runSinceOppHit = 0;
      s.pendingLongRun = false;
      s.centerPending = false;
      s.lastShotKind = null;
      s.lastShotCross = false;
      s.lobInRally = false;
      if (this.has(p, 'behind') && this.isBehind(p)) this.tickId(p, 'behind');
    }
  }

  onMove(p: PlayerSim, dist: number): void {
    const s = this.states[p.side];
    s.runSinceOppHit += dist;
    s.rallyMinAir = Math.min(s.rallyMinAir, p.air);
    // Angelito: ¿volvió al centro antes de que le peguen?
    if (s.centerPending && Math.abs(p.x) < 1.2 && Math.abs(p.y) > 9.5) {
      s.centerPending = false;
      this.count(p, 'center3');
    }
  }

  onContact(p: PlayerSim, info: ContactInfo): void {
    const s = this.states[p.side];
    s.lastShotKind = info.kind;
    s.lastShotCross = info.cross;
    if (info.kind === 'lob') s.lobInRally = true;
    if (info.depth < 9.5) s.allBaseline = false;
    if (info.dove || info.stretched) this.count(p, 'impossible3');
    s.pendingLongRun = s.runSinceOppHit >= 5 && this.has(p, 'longRun');
    s.centerPending = this.has(p, 'center3');
    // El rival le pegó: se reinicia su carrera y ya no llega "a tiempo" al centro.
    const o = this.states[other(p.side)];
    o.runSinceOppHit = 0;
    o.centerPending = false;
    o.pendingLongRun = false;
  }

  /** El primer pique después del golpe de `hitter` fue bueno. */
  onBounceIn(hitter: Side): void {
    const p = this.m.players[hitter];
    const s = this.states[hitter];
    if (s.pendingLongRun) {
      s.pendingLongRun = false;
      this.tickId(p, 'longRun');
    }
  }

  onPointFinished(pt: PointInfo): void {
    for (const p of this.m.players) {
      const s = this.states[p.side];
      const won = pt.winner === p.side;
      if (won && (s.lastShotKind === 'drop' || s.lastShotKind === 'short' || s.lastShotKind === 'dropVolley'))
        this.tickId(p, 'winDrop');
      if (pt.rally >= 5 && s.rallyMinAir > 0.05) this.tickId(p, 'rally5Air');
      if (won && (s.lastShotKind === 'volley' || s.lastShotKind === 'dropVolley')) this.tickId(p, 'winVolley');
      if (won && pt.rally >= 4) this.tickId(p, 'winRally4');
      if (won && pt.server === p.side && pt.rally <= 2 && pt.reason !== 'doubleFault') this.tickId(p, 'aceOrServeWinner');
      // Globo: gana el punto en el que tiró un globo (el remate que falla el rival también cuenta).
      if (won && s.lobInRally) this.tickId(p, 'winLob');
      if (won && pt.rally >= 6 && s.allBaseline) this.tickId(p, 'baseline6');
      if (won && pt.reason === 'winner' && s.lastShotCross) this.tickId(p, 'crossPass');
    }
  }

  /** Después de actualizar el marcador. */
  onScoreChanged(gameEnded: boolean): void {
    if (gameEnded) for (const s of this.states) s.usedThisGame = false;
    for (const p of this.m.players) if (this.has(p, 'behind') && this.isBehind(p)) this.tickId(p, 'behind');
  }

  /** La cargada. good = la hizo después de ganar el punto. */
  onTaunt(p: PlayerSim, good: boolean): void {
    if (good) this.tickId(p, 'tauntAfterWin');
    this.tickId(p, 'tauntAny');
    if (this.isBehind(p)) this.tickId(p, 'mateLosing');
    const rival = this.m.players[other(p.side)];
    if (!good) return;
    if (this.isChar(rival, 'trueTincho')) {
      // Cara de póker: inmune. Responde "..." y queda un silencio incómodo.
      this.m.emit({ type: 'emote', side: rival.side, text: 'poker' });
      this.m.emit({ type: 'passive', side: rival.side, id: 'poker' });
      return;
    }
    // Don Ganso, autoridad: después de ganar un punto, su ¡HONK! pone nervioso al que saca.
    if (this.isChar(p, 'donGanso')) {
      rival.mods.serveErrorMul = Math.max(rival.mods.serveErrorMul, 1.4);
      this.m.emit({ type: 'passive', side: p.side, id: 'autoridad' });
    }
    if (this.isChar(rival, 'volpi')) {
      // Se tienta: su próximo primer saque sale flojo.
      rival.mods.weakServe = true;
      this.m.emit({ type: 'emote', side: rival.side, text: 'tentado' });
      this.m.emit({ type: 'weakness', side: rival.side, id: 'tienta' });
    }
  }

  /** Intenta activar el especial. Devuelve cuál, o null. */
  tryActivate(p: PlayerSim): SpecialId | null {
    const r = this.rulesOf(p);
    if (!r || !this.ready(p)) return null;
    const s = this.states[p.side];
    s.usedThisGame = true;
    s.recipe = [false, false, false];
    s.counts = {};
    return r.special;
  }
}
