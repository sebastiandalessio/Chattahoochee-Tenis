// Stats de 1 a 10 y los valores físicos que se derivan de ellos.

export interface Stats {
  velocidad: number;
  potencia: number;
  control: number;
  saque: number;
  volea: number;
  aire: number;
}

export const NEUTRAL_STATS: Stats = {
  velocidad: 6,
  potencia: 6,
  control: 6,
  saque: 6,
  volea: 6,
  aire: 6,
};

export interface Physique {
  /** Velocidad máxima corriendo (m/s). */
  maxSpeed: number;
  /** Aceleración (m/s²): cuánto tarda en arrancar. */
  accel: number;
  /** Alcance lateral del brazo + raqueta (m). */
  reach: number;
  /** Altura máxima a la que llega sin smash (m). */
  maxHitHeight: number;
  /** Gasto de aire por segundo corriendo a fondo (fracción de la barra). */
  airDrain: number;
  /** Recuperación de aire por segundo quieto o caminando. */
  airRecover: number;
}

export function physiqueOf(s: Stats, opts: { short?: boolean; slowStart?: boolean } = {}): Physique {
  return {
    maxSpeed: 3.7 + s.velocidad * 0.34,
    accel: opts.slowStart ? 11 : 32,
    reach: 1.3 + s.velocidad * 0.015,
    maxHitHeight: opts.short ? 2.05 : 2.35,
    airDrain: 0.075 * (1.55 - s.aire * 0.1),
    airRecover: 0.05 + s.aire * 0.006,
  };
}
