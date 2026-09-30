// Generador pseudoaleatorio con semilla (mulberry32): mismo resultado en tests y en repeticiones.

export interface Rng {
  /** Número en [0, 1). */
  next(): number;
  range(min: number, max: number): number;
  chance(p: number): boolean;
  /** Normal estándar (Box-Muller). */
  gauss(): number;
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number = Date.now()): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    chance: (p) => next() < p,
    gauss: () => {
      const u = Math.max(1e-9, next());
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    pick: (items) => items[Math.floor(next() * items.length) % items.length],
  };
}
