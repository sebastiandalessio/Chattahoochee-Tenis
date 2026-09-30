// Boss "EL GRAN CHATTAHOOCHEE": relevo por games. Cada game es contra un rival distinto;
// ganás el game y ese rival queda ELIMINADO; lo perdés y perdés una lata de pelotas y ese
// rival vuelve al final de la fila. Cinco games ganados = campeón. Sin latas = Game Over.

import type { CharacterId } from './characters';

export interface Relay {
  queue: CharacterId[];
  eliminated: CharacterId[];
  cans: number;
  games: number;
  state: 'playing' | 'won' | 'lost';
}

export const BOSS_CANS = 3;

export function newRelay(rivals: CharacterId[], cans = BOSS_CANS): Relay {
  return { queue: [...rivals], eliminated: [], cans, games: 0, state: 'playing' };
}

export function currentRival(r: Relay): CharacterId | null {
  return r.state === 'playing' ? (r.queue[0] ?? null) : null;
}

/** Terminó un game: playerWon = lo ganó el jugador. */
export function relayGame(r: Relay, playerWon: boolean): Relay {
  if (r.state !== 'playing' || r.queue.length === 0) return r;
  const [rival, ...rest] = r.queue;
  if (playerWon) {
    const queue = rest;
    return { queue, eliminated: [...r.eliminated, rival], cans: r.cans, games: r.games + 1, state: queue.length === 0 ? 'won' : 'playing' };
  }
  const cans = r.cans - 1;
  return { queue: [...rest, rival], eliminated: r.eliminated, cans, games: r.games + 1, state: cans <= 0 ? 'lost' : 'playing' };
}
