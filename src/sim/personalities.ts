// Personalidad de la CPU para cada personaje, según su ficha. Cada uno es ganable y explotable
// por su debilidad: globos a Seba (que siempre sube), hacer correr a Rosco, subir contra el Vikingo,
// abrirle la cancha a Angelito (no vuelve al centro)...

import { BASIC_AI, type AiProfile } from './ai';
import type { CharId } from './rules';

export interface Personality extends AiProfile {
  /** Probabilidad de hacer la cargada después de ganar un punto. */
  tauntChance: number;
  /** No corre las pelotas imposibles ("No, esa no"). */
  givesUp: boolean;
  /** Después de pegar no vuelve al centro (deja la cancha abierta). */
  stayAfterHit: boolean;
  /** Prefiere tirar cruzado. */
  crossBias: boolean;
  /** Yendo abajo, busca el paralelo. */
  lineWhenBehind: boolean;
  /** Multiplica el error de la dificultad. */
  errorMul: number;
  /** Probabilidad de tirar un globo aunque el rival esté en el fondo. */
  lobBase: number;
}

const BASE: Personality = {
  ...BASIC_AI,
  lobBase: 0,
  tauntChance: 0.3,
  givesUp: false,
  stayAfterHit: false,
  crossBias: false,
  lineWhenBehind: false,
  errorMul: 1,
};

const PERSONALITIES: Record<CharId, Partial<Personality>> = {
  elRosco: { dropChance: 0.3, netRush: 0.05, sliceChance: 0.25, chargeChance: 0.1, givesUp: true, tauntChance: 0.4, errorMul: 0.62 },
  elSeba: { netRush: 0.75, chargeChance: 0.25, aimSmart: 0.6, tauntChance: 0.35, errorMul: 1.0, reaction: 0.22 },
  trueTincho: {
    netRush: 0.05,
    sliceChance: 0.15,
    aimSmart: 0.35,
    chargeChance: 0.05,
    timingJitter: 0.3,
    errorMul: 1.28,
    lineWhenBehind: true,
    tauntChance: 0.15,
  },
  volpi: {
    // Saca bien porque su stat de Saque es el más alto, no porque se juegue todo (antes hacía
    // demasiadas dobles faltas).
    serveFirst: 0.78,
    serveSecond: 0.45,
    sliceChance: 0.5,
    lobChance: 0.75,
    lobBase: 0.12,
    netRush: 0.1,
    tauntChance: 0.3,
    errorMul: 0.95,
  },
  elVikingo: { netRush: 0, chargeChance: 0.35, crossBias: true, sliceChance: 0.05, tauntChance: 0.3, errorMul: 0.95 },
  angelito: { reaction: 0.2, misjudge: 0.25, errorMul: 0.92, stayAfterHit: true, tauntChance: 0.3, dropChance: 0.08 },
  donGanso: { netRush: 0.45, tauntChance: 0.45, errorMul: 1.0, chargeChance: 0.2 },
};

/** Personalidad de un personaje sobre un perfil de dificultad (reacción, puntería, etc.). */
export function personalityFor(id: CharId | undefined, difficulty: AiProfile = BASIC_AI): Personality {
  const own = id ? PERSONALITIES[id] : {};
  const p: Personality = { ...BASE, ...difficulty, ...own };
  // La dificultad manda en la reacción: la personalidad la ajusta en proporción.
  if (own.reaction !== undefined) p.reaction = difficulty.reaction * (own.reaction / BASIC_AI.reaction);
  else p.reaction = difficulty.reaction;
  return p;
}
