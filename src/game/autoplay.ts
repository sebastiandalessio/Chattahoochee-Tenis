// Para las pruebas automáticas: con ?auto=1 los partidos de la torre y del Boss los juega la CPU
// por los dos lados (y con ?speed=N van más rápido).

const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

export const AUTO = q.has('auto');
export const AUTO_SPEED = Number(q.get('speed')) || 1;

/** Modo y velocidad para un partido de la torre o del Boss. */
export function flowMode(): { mode: 'cpu' | 'demo'; speed: number } {
  return AUTO ? { mode: 'demo', speed: AUTO_SPEED } : { mode: 'cpu', speed: 1 };
}
