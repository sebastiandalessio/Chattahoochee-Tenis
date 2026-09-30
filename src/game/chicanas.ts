// Duelo de Chicanas (la idea del duelo de insultos de las aventuras gráficas, con textos propios):
// el rival tira una chicana y vos elegís la réplica. Lógica pura: qué chicana sale y en qué orden
// aparecen las respuestas.

import { T } from '../texts/es';
import type { CharacterId } from './characters';

export interface Chicana {
  id: string;
  line: string;
  good: string;
  bad: string[];
}

export interface DuelRound {
  chicana: Chicana;
  /** Opciones ya mezcladas. */
  options: string[];
  correct: number;
}

const BANKS = T.chicanas as unknown as Record<CharacterId | 'shared', Chicana[]>;

export function bankOf(rival: CharacterId): Chicana[] {
  return BANKS[rival] ?? [];
}

export function sharedBank(): Chicana[] {
  return BANKS.shared;
}

/**
 * Elige la chicana: casi siempre del banco propio del rival; a veces una compartida (esas se
 * aprenden con uno y sirven contra todos). Evita repetir las que ya salieron en esta torre.
 */
export function pickChicana(rival: CharacterId, rnd: () => number, used: string[] = []): Chicana {
  const fresh = (list: Chicana[]) => list.filter((c) => !used.includes(c.id));
  const own = fresh(bankOf(rival));
  const shared = fresh(sharedBank());
  let pool = rnd() < 0.3 && shared.length ? shared : own;
  if (!pool.length) pool = own.length ? own : bankOf(rival);
  return pool[Math.floor(rnd() * pool.length) % pool.length];
}

export function makeRound(ch: Chicana, rnd: () => number): DuelRound {
  const all = [ch.good, ...ch.bad];
  const order = all.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1)) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { chicana: ch, options: order.map((i) => all[i]), correct: order.indexOf(0) };
}
