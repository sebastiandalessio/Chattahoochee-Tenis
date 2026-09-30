// Datos que viajan entre pantallas durante la torre y el Boss.

import type { Relay } from './bossRelay';
import type { TowerRun } from './tower';

export interface TowerCtx {
  run: TowerRun;
  /** Chicanas que ya salieron en esta torre (para no repetir). */
  used: string[];
}

/** Resultado del duelo de chicanas antes del partido. */
export type DuelResult = 'won' | 'lost' | null;

export interface BossCtx {
  run: TowerRun;
  used: string[];
  relay: Relay;
  /** Receta del jugador que se arrastra de un game al otro. */
  recipe: [boolean, boolean, boolean];
  /** Primera vez (con la cinemática) o después de continuar. */
  fresh: boolean;
}
