// Entrada abstracta de un jugador en un frame. La llenan el teclado, el joystick o la CPU.

export interface PlayerInput {
  /** -1..1: izquierda/derecha de la pantalla (= x del mundo). */
  moveX: number;
  /** -1..1: arriba/abajo de la pantalla (= y del mundo). */
  moveY: number;
  hit: boolean;
  slice: boolean;
  special: boolean;
  taunt: boolean;
}

export function emptyInput(): PlayerInput {
  return { moveX: 0, moveY: 0, hit: false, slice: false, special: false, taunt: false };
}

export interface InputEdges {
  hitPressed: boolean;
  hitReleased: boolean;
  slicePressed: boolean;
  sliceReleased: boolean;
  specialPressed: boolean;
  tauntPressed: boolean;
}

export function edgesOf(now: PlayerInput, prev: PlayerInput): InputEdges {
  return {
    hitPressed: now.hit && !prev.hit,
    hitReleased: !now.hit && prev.hit,
    slicePressed: now.slice && !prev.slice,
    sliceReleased: !now.slice && prev.slice,
    specialPressed: now.special && !prev.special,
    tauntPressed: now.taunt && !prev.taunt,
  };
}
