// Proyección de la cancha (metros) a la pantalla (640×360), con perspectiva ligera:
// la cámara está detrás del jugador de abajo, alta y lejos, como en los tenis de 16 bits.

import { COURT } from '../logic/court';

export const SCREEN_W = 640;
export const SCREEN_H = 360;

const CX = SCREEN_W / 2;
/** Distancia focal en píxeles. */
const F = 1151;
/** Distancia de la cámara detrás de la línea de fondo de abajo (m). */
const CAM_BACK = 50.5;
const CAM_Y = COURT.halfLength + CAM_BACK;
/** Altura de la cámara (m). */
const CAM_H = 29.06;
const HORIZON = -366.4;

export function depthOf(y: number): number {
  return CAM_Y - y;
}

/** Píxeles por metro a la profundidad y. */
export function scaleAt(y: number): number {
  return F / depthOf(y);
}

export function project(x: number, y: number, z = 0): { sx: number; sy: number } {
  const d = depthOf(y);
  return {
    sx: CX + (F * x) / d,
    sy: HORIZON + (F * CAM_H) / d - (F * z) / d,
  };
}

/** Inversa sobre el piso: de un píxel de pantalla al punto de la cancha (z = 0). */
export function unproject(sx: number, sy: number): { x: number; y: number; depth: number } {
  const d = (F * CAM_H) / (sy - HORIZON);
  return { x: ((sx - CX) * d) / F, y: CAM_Y - d, depth: d };
}

/** Cuántos metros de cancha (en y) cubre un píxel vertical a esa altura de pantalla. */
export function metersPerPixelY(sy: number): number {
  const k = sy - HORIZON;
  return (F * CAM_H) / (k * k);
}

export function metersPerPixelX(depth: number): number {
  return depth / F;
}
