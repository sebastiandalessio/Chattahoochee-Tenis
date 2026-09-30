// Lo que la escena del partido necesita de cualquier forma de dibujar a un jugador.

import type { Match, PlayerSim } from '../sim/match';

export interface PlayerView {
  update(p: PlayerSim, m: Match): void;
  destroy(): void;
  hidden: boolean;
}
