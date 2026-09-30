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

class KeyboardState {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private installed = false;

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
    return this.down.has(code);
  }

  anyDown(codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
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
