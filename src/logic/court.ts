// Medidas de la cancha en metros. Origen en el centro de la red.
// x: a lo ancho (+x = derecha de la pantalla). y: a lo largo (+y = hacia abajo de la pantalla).
// z: altura. El jugador 0 juega en la mitad y > 0 (abajo); el jugador 1 en y < 0 (arriba).

import type { Side } from './scoring';

export const COURT = {
  halfLength: 11.885,
  serviceLine: 6.4,
  singlesHalfWidth: 4.115,
  doublesHalfWidth: 5.485,
  netHeightCenter: 0.914,
  netHeightPost: 1.07,
  netPostX: 6.4,
  /** Tolerancia de línea: la pelota que toca la línea es buena. */
  lineTolerance: 0.05,
} as const;

/** Altura de la red en la posición x. */
export function netHeightAt(x: number): number {
  const t = Math.min(1, Math.abs(x) / COURT.netPostX);
  return COURT.netHeightCenter + (COURT.netHeightPost - COURT.netHeightCenter) * t;
}

/** Hacia dónde mira cada jugador en y: el de abajo mira a -y, el de arriba a +y. */
export function facingOf(side: Side): -1 | 1 {
  return side === 0 ? -1 : 1;
}

/** De qué mitad es un punto de la cancha. */
export function halfOf(y: number): Side {
  return y >= 0 ? 0 : 1;
}

export function inSinglesCourt(x: number, y: number): boolean {
  const tol = COURT.lineTolerance;
  return Math.abs(x) <= COURT.singlesHalfWidth + tol && Math.abs(y) <= COURT.halfLength + tol;
}

/**
 * ¿El pique está dentro del cuadro de saque correcto?
 * `receiver` es quien recibe; `side` es 'deuce' (derecha del que recibe) o 'ad'.
 */
export function inServiceBox(x: number, y: number, receiver: Side, side: 'deuce' | 'ad'): boolean {
  const tol = COURT.lineTolerance;
  if (halfOf(y) !== receiver) return false;
  if (Math.abs(y) > COURT.serviceLine + tol) return false;
  // Derecha del que recibe, en coordenadas del mundo: el de abajo mira a -y, su derecha es +x.
  const rightSign = -facingOf(receiver);
  const boxSign = side === 'deuce' ? rightSign : -rightSign;
  const xs = x * boxSign;
  return xs >= -tol && xs <= COURT.singlesHalfWidth + tol;
}

/** Signo x de la derecha de un jugador (en coordenadas del mundo). */
export function rightSignOf(side: Side): -1 | 1 {
  return side === 0 ? 1 : -1;
}
