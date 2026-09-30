// Teclado por "código físico" (event.code): la Ñ de los teclados en español y el ; del
// teclado inglés son la misma tecla ('Semicolon'), así que funciona con los dos.

import type { PlayerInput } from '../sim/input';

export interface KeyMap {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  hit: string[];
  slice: string[];
  special: string[];
  taunt: string[];
}

export const KEYMAP_1P: KeyMap = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  hit: ['KeyZ'],
  slice: ['KeyX'],
  special: ['KeyC'],
  taunt: ['KeyV'],
};

export const KEYMAP_2P_A: KeyMap = {
  up: ['KeyW'],
  down: ['KeyS'],
  left: ['KeyA'],
  right: ['KeyD'],
  hit: ['KeyF'],
  slice: ['KeyG'],
  special: ['KeyH'],
  taunt: ['KeyR'],
};

export const KEYMAP_2P_B: KeyMap = {
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  hit: ['KeyK'],
  slice: ['KeyL'],
  special: ['Semicolon'],
  taunt: ['KeyI'],
};

const BLOCK_DEFAULT = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'Tab',
  'Semicolon',
]);

export type ActionKey = 'hit' | 'slice' | 'special' | 'taunt';
export type KeyOptions = Partial<Record<'p1' | 'a' | 'b', Partial<Record<ActionKey, string>>>>;

const DEFAULT_ACTIONS: Record<'p1' | 'a' | 'b', Record<ActionKey, string>> = {
  p1: { hit: 'KeyZ', slice: 'KeyX', special: 'KeyC', taunt: 'KeyV' },
  a: { hit: 'KeyF', slice: 'KeyG', special: 'KeyH', taunt: 'KeyR' },
  b: { hit: 'KeyK', slice: 'KeyL', special: 'Semicolon', taunt: 'KeyI' },
};

export const MAP_OF: Record<'p1' | 'a' | 'b', KeyMap> = { p1: KEYMAP_1P, a: KEYMAP_2P_A, b: KEYMAP_2P_B };

/** Aplica las teclas elegidas en Opciones (se modifican los mapas en el lugar). */
export function applyKeyOptions(keys: KeyOptions | undefined): void {
  for (const who of ['p1', 'a', 'b'] as const) {
    for (const act of ['hit', 'slice', 'special', 'taunt'] as ActionKey[]) {
      MAP_OF[who][act] = [keys?.[who]?.[act] ?? DEFAULT_ACTIONS[who][act]];
    }
  }
}

export function defaultKey(who: 'p1' | 'a' | 'b', act: ActionKey): string {
  return DEFAULT_ACTIONS[who][act];
}

/** Nombre corto de una tecla para mostrar ("KeyZ" → "Z"). */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const names: Record<string, string> = { Semicolon: 'Ñ', Space: 'ESPACIO', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT DER.', ControlLeft: 'CTRL', ControlRight: 'CTRL DER.', Enter: 'ENTER', Comma: ',', Period: '.', Slash: '-', Quote: '{', BracketLeft: '´', BracketRight: '+', Backslash: '}', Minus: "'", Equal: '¡', Tab: 'TAB', AltLeft: 'ALT' };
  return names[code] ?? code;
}

/** Nombres para mostrar de las teclas de acción de un mapa. */
export function keyNames(map: KeyMap): { hit: string; slice: string; special: string; taunt: string } {
  return { hit: keyLabel(map.hit[0]), slice: keyLabel(map.slice[0]), special: keyLabel(map.special[0]), taunt: keyLabel(map.taunt[0]) };
}

/**
 * Joysticks: se leen en cada frame y se traducen a "teclas virtuales" según el modo.
 * En los menús: cruz/palanca = flechas, A = ENTER, B = ESC. En el partido: A golpe, B slice,
 * X especial, Y (o RB) cargada, START pausa. En 2P, el joystick 1 es J1 y el 2 es J2.
 */
export type PadMode = 'menu' | '1p' | '2p';

class KeyboardState {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private padDown = new Set<string>();
  private padMode: PadMode = 'menu';
  private installed = false;

  setPadMode(m: PadMode): void {
    this.padMode = m;
  }

  /** Lee los joysticks (se llama una vez por frame, antes de las escenas). */
  pollPads(): void {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].filter((p): p is Gamepad => !!p) : [];
    const next = new Set<string>();
    pads.forEach((pad, i) => {
      const btn = (k: number) => !!pad.buttons[k]?.pressed;
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      const dir = {
        up: btn(12) || ay < -0.45,
        down: btn(13) || ay > 0.45,
        left: btn(14) || ax < -0.45,
        right: btn(15) || ax > 0.45,
      };
      let map: KeyMap;
      let pause: string;
      if (this.padMode === '2p') {
        if (i > 1) return;
        map = i === 0 ? KEYMAP_2P_A : KEYMAP_2P_B;
        pause = i === 0 ? 'Escape' : 'Enter';
      } else {
        map = KEYMAP_1P;
        pause = 'Escape';
      }
      if (this.padMode === 'menu') {
        if (dir.up) next.add('ArrowUp');
        if (dir.down) next.add('ArrowDown');
        if (dir.left) next.add('ArrowLeft');
        if (dir.right) next.add('ArrowRight');
        if (btn(0) || btn(9)) next.add('Enter');
        if (btn(1) || btn(8)) next.add('Escape');
        if (btn(2)) next.add('KeyX');
        return;
      }
      if (dir.up) next.add(map.up[0]);
      if (dir.down) next.add(map.down[0]);
      if (dir.left) next.add(map.left[0]);
      if (dir.right) next.add(map.right[0]);
      if (btn(0)) next.add(map.hit[0]);
      if (btn(1)) next.add(map.slice[0]);
      if (btn(2)) next.add(map.special[0]);
      if (btn(3) || btn(5)) next.add(map.taunt[0]);
      if (btn(9) || btn(8)) next.add(pause);
    });
    for (const c of next) if (!this.padDown.has(c) && !this.down.has(c)) this.pressed.add(c);
    this.padDown = next;
  }

  install(): void {
    if (this.installed) return;
    this.installed = true;
    window.addEventListener('keydown', (e) => {
      if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => this.down.clear());
  }

  isDown(code: string): boolean {
    return this.down.has(code) || this.padDown.has(code);
  }

  anyDown(codes: string[]): boolean {
    return codes.some((c) => this.isDown(c));
  }

  /** Para reasignar teclas: la próxima tecla que se apriete (o null). */
  firstPressed(): string | null {
    for (const c of this.pressed) return c;
    return null;
  }

  /** ¿Se apretó en este frame? */
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  anyPressed(codes: string[]): boolean {
    return codes.some((c) => this.pressed.has(c));
  }

  /** ¿Se apretó cualquier tecla en este frame? */
  anyKeyPressed(): boolean {
    return this.pressed.size > 0;
  }

  /** Hay que llamarlo una vez al final de cada frame. */
  endFrame(): void {
    this.pressed.clear();
  }

  readPlayer(map: KeyMap): PlayerInput {
    const x = (this.anyDown(map.right) ? 1 : 0) - (this.anyDown(map.left) ? 1 : 0);
    const y = (this.anyDown(map.down) ? 1 : 0) - (this.anyDown(map.up) ? 1 : 0);
    return {
      moveX: x,
      moveY: y,
      // Un toque rapidísimo (apretar y soltar en el mismo frame) también cuenta.
      hit: this.anyDown(map.hit) || this.anyPressed(map.hit),
      slice: this.anyDown(map.slice) || this.anyPressed(map.slice),
      special: this.anyDown(map.special) || this.anyPressed(map.special),
      taunt: this.anyDown(map.taunt) || this.anyPressed(map.taunt),
    };
  }
}

export const keyboard = new KeyboardState();
