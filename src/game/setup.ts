// Configuración de un partido de prueba (hito 1) y parámetros por dificultad.

import { BASIC_AI, type AiProfile } from '../sim/ai';
import { VENUE_ORDER, type VenueId } from '../sim/venues';
import { CHARACTER_ORDER, type CharacterId } from './characters';
import type { BossCtx, DuelResult, TowerCtx } from './flow';

export type Mode = 'cpu' | '2p' | 'demo' | 'practice';
export type Difficulty = 0 | 1 | 2;
export type CharacterPick = CharacterId | 'azar';
export type VenuePick = VenueId | 'sorteo';

export interface MatchSetup {
  mode: Mode;
  games: 2 | 4 | 6;
  difficulty: Difficulty;
  /** Sede (la superficie sale de la sede). */
  venue: VenuePick;
  /** Personaje de abajo y de arriba. */
  chars: [CharacterPick, CharacterPick];
  /** Velocidad de simulación (solo para mirar CPU contra CPU o pruebas automáticas). */
  speed?: number;
  seed?: number;
  /** Trajes (0 = el principal). Si no se dice, el de arriba usa el alternativo en el espejo. */
  outfits?: [number, number];
  /** Partido de la torre. */
  tower?: { ctx: TowerCtx };
  /** Resultado de los duelos de chicanas: duels[s] = cómo le fue al jugador s contestando. */
  duels?: [DuelResult, DuelResult];
  /** Un game del relevo del Boss. */
  boss?: BossCtx;
}

export const DEFAULT_SETUP: MatchSetup = {
  mode: 'cpu',
  games: 4,
  difficulty: 1,
  venue: 'sorteo',
  chars: ['elRosco', 'azar'],
};

/** "Sorteo" elige una de las tres sedes normales (la del Boss es secreta). */
export function resolveVenue(pick: VenuePick, rnd: () => number): VenueId {
  if (pick !== 'sorteo') return pick;
  return VENUE_ORDER[Math.floor(rnd() * VENUE_ORDER.length) % VENUE_ORDER.length];
}

/** Resuelve "al azar" y evita que el de arriba sea el mismo que el de abajo por sorteo. */
export function resolveChars(pick: [CharacterPick, CharacterPick], rnd: () => number): [CharacterId, CharacterId] {
  const any = (exclude?: CharacterId) => {
    const pool = CHARACTER_ORDER.filter((c) => c !== exclude);
    return pool[Math.floor(rnd() * pool.length) % pool.length];
  };
  const a = pick[0] === 'azar' ? any() : pick[0];
  const b = pick[1] === 'azar' ? any(a) : pick[1];
  return [a, b];
}

export interface DifficultyParams {
  humanAssist: number;
  humanMeterHalf: number;
  cpuErrorMul: number;
  ai: AiProfile;
}

export function difficultyParams(d: Difficulty): DifficultyParams {
  if (d === 0)
    return {
      humanAssist: 0.6,
      humanMeterHalf: 0.62,
      cpuErrorMul: 1.45,
      ai: { ...BASIC_AI, reaction: 0.34, aimSmart: 0.3, chargeChance: 0.05 },
    };
  if (d === 2)
    return {
      humanAssist: 0,
      humanMeterHalf: 0.42,
      cpuErrorMul: 0.85,
      ai: { ...BASIC_AI, reaction: 0.18, aimSmart: 0.65, chargeChance: 0.3, misjudge: 0.05 },
    };
  return { humanAssist: 0, humanMeterHalf: 0.42, cpuErrorMul: 1.15, ai: BASIC_AI };
}
