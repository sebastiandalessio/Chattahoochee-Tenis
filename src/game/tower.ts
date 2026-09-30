// Torre de los Chattahoochees (estilo Mortal Kombat): los otros cinco en orden al azar,
// rotando las sedes, y arriba de todo el Boss. Lógica pura (sin Phaser), con tests.

import { VENUE_ORDER, type VenueId } from '../sim/venues';
import { CHARACTER_ORDER, type CharacterId } from './characters';

export interface TowerFight {
  rival: CharacterId;
  venue: VenueId;
}

export interface TowerRun {
  player: CharacterId;
  outfit: number;
  fights: TowerFight[];
  /** Escalón actual: 0..4 son los rivales; 5 es el Boss; 6 = torre terminada. */
  step: number;
  /** Veces que se usó "¿CONTINUAR?". */
  continues: number;
  seed: number;
  /** Resultado de cada escalón ganado (para la pantalla de la torre). */
  scores: string[];
}

export const BOSS_STEP = 5;

function shuffle<T>(list: T[], rnd: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1)) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newTower(player: CharacterId, outfit: number, rnd: () => number, seed = 0): TowerRun {
  const rivals = shuffle(
    CHARACTER_ORDER.filter((c) => c !== player),
    rnd,
  ).slice(0, 5);
  // Las sedes van rotando: nunca dos seguidas iguales.
  const start = Math.floor(rnd() * VENUE_ORDER.length) % VENUE_ORDER.length;
  const fights = rivals.map((rival, i) => ({ rival, venue: VENUE_ORDER[(start + i) % VENUE_ORDER.length] }));
  return { player, outfit, fights, step: 0, continues: 0, seed, scores: [] };
}

/** Los cinco del Boss: los mismos que enfrentaste en la torre. */
export function bossRivals(run: TowerRun): CharacterId[] {
  return run.fights.map((f) => f.rival);
}

export function isBossStep(run: TowerRun): boolean {
  return run.step === BOSS_STEP;
}

export function currentFight(run: TowerRun): TowerFight | null {
  return run.step < run.fights.length ? run.fights[run.step] : null;
}

/** Ganó el escalón actual: sube uno. */
export function winStep(run: TowerRun, score = ''): TowerRun {
  return { ...run, step: Math.min(run.step + 1, BOSS_STEP + 1), scores: [...run.scores, score] };
}

/** Perdió y eligió continuar: se repite el mismo escalón. */
export function continueRun(run: TowerRun): TowerRun {
  return { ...run, continues: run.continues + 1 };
}

/**
 * Dificultad creciente a lo largo de la torre: multiplicador del error de la CPU y ajuste de su
 * tiempo de reacción (negativo = reacciona más rápido). El Boss es un poco más difícil que el último escalón.
 */
export function towerRamp(step: number): { errorMul: number; reaction: number } {
  const k = Math.min(step, BOSS_STEP) / BOSS_STEP; // 0 .. 1
  return { errorMul: 1.2 - 0.32 * k, reaction: 0.05 - 0.07 * k };
}
