// Selección de personaje: grilla de 3×2 con retratos, ficha con stats, bio, especial, pasiva y
// debilidad. Al pasar el cursor, el personaje dice una de sus frases.

import Phaser from 'phaser';
import { CHARACTERS, CHARACTER_ORDER, SECRET_CHARACTER, type CharacterId } from '../game/characters';
import { CHARACTER_ARTS } from '../art/sheets';
import { newTower } from '../game/tower';
import { save } from '../game/save';
import type { TowerCtx } from '../game/flow';
import { keyboard } from '../input/keyboard';
import { sfx } from '../audio/sfx';
import { T, pick } from '../texts/es';
import { pxText, wrapText } from '../ui/pixelFont';
import { Bubble, UI, drawBox, fullscreenButton } from '../ui/widgets';
import { BACK, CONFIRM, Puppet, enter, goTo, portrait } from '../ui/screens';

const STAT_KEYS = ['velocidad', 'potencia', 'control', 'saque', 'volea', 'aire'] as const;
const GRID_X = 24;
const GRID_Y = 40;
const CELL_W = 80;
const CELL_H = 82;

export interface SelectData {
  mode: 'tower';
}

export class CharSelectScene extends Phaser.Scene {
  private sel = 0;
  private outfits: Record<string, number> = {};
  private cells: Phaser.GameObjects.Image[] = [];
  private cursor!: Phaser.GameObjects.Graphics;
  private info: Phaser.GameObjects.GameObject[] = [];
  private puppet: Puppet | null = null;
  private bubble!: Bubble;
  private t = 0;
  /** Los seis y, si está desbloqueado, Don Ganso (en su casillero secreto). */
  private roster: CharacterId[] = CHARACTER_ORDER;

  constructor() {
    super('select');
  }

  /** Centro del casillero i (el 6 es el de Don Ganso, abajo a la izquierda). */
  private cellPos(i: number): { x: number; y: number } {
    if (i === 6) return { x: GRID_X + 34, y: 262 };
    return { x: GRID_X + (i % 3) * CELL_W + CELL_W / 2 - 2, y: GRID_Y + Math.floor(i / 3) * CELL_H + 36 };
  }

  init(): void {
    this.sel = 0;
    this.cells = [];
    this.info = [];
    this.puppet = null;
    this.outfits = {};
    this.roster = save().ganso ? [...CHARACTER_ORDER, SECRET_CHARACTER] : CHARACTER_ORDER;
  }

  create(): void {
    enter(this);
    const g = this.add.graphics();
    g.fillStyle(0x15141f).fillRect(0, 0, 640, 360);
    // Tablero de fondo a cuadros, muy oscuro.
    for (let y = 0; y < 360; y += 16) for (let x = (y / 16) % 2 ? 16 : 0; x < 640; x += 32) g.fillStyle(0x191827).fillRect(x, y, 16, 16);
    pxText(this, 320, 8, T.select.title, { outline: true, color: UI.gold, scale: 2 }).setOrigin(0.5, 0);

    drawBox(g, GRID_X - 6, GRID_Y - 6, CELL_W * 3 + 8, CELL_H * 2 + 8, 0x1d1c2b, 0x3a3850);
    CHARACTER_ORDER.forEach((id, i) => {
      const cx = GRID_X + (i % 3) * CELL_W + CELL_W / 2 - 2;
      const cy = GRID_Y + Math.floor(i / 3) * CELL_H + 36;
      g.fillStyle(0x0f0e18).fillRect(cx - 37, cy - 37, 74, 74);
      this.cells.push(portrait(this, id, 0, 'normal', cx, cy, 0.75));
      pxText(this, cx, cy + 38, T.characters[id].name, { outline: true }).setOrigin(0.5, 0);
      if (save().towersWon.includes(id)) pxText(this, cx + 30, cy - 36, '★', { outline: true, color: UI.gold }).setOrigin(0.5, 0);
    });
    this.cursor = this.add.graphics().setDepth(5);

    // Piso para el muñequito.
    drawBox(g, GRID_X - 6, 224, CELL_W * 3 + 8, 112, 0x1d1c2b, 0x3a3850);
    g.fillStyle(0x3f7f4a).fillRect(GRID_X - 5, 300, CELL_W * 3 + 6, 35);
    g.fillStyle(0xf2f2f2).fillRect(GRID_X + 10, 318, CELL_W * 3 - 24, 1);
    if (this.roster.length > 6) {
      // Casillero secreto de Don Ganso.
      const c = this.cellPos(6);
      g.fillStyle(0x0f0e18).fillRect(c.x - 26, c.y - 26, 52, 52);
      this.cells.push(portrait(this, SECRET_CHARACTER, 0, 'normal', c.x, c.y, 0.52));
      pxText(this, c.x, c.y + 27, 'SECRETO', { outline: true, color: UI.gold }).setOrigin(0.5, 0);
    }

    drawBox(g, 266, 34, 364, 302, 0x1d1c2b, 0x3a3850);
    pxText(this, 320, 346, T.select.help, { outline: true, color: UI.dim }).setOrigin(0.5, 0);
    this.bubble = new Bubble(this);
    fullscreenButton(this);
    this.refresh(true);
  }

  private get id(): CharacterId {
    return this.roster[this.sel];
  }

  private outfitOf(id: CharacterId): number {
    return this.outfits[id] ?? 0;
  }

  private refresh(say: boolean): void {
    const id = this.id;
    const txt = T.characters[id];
    const outfit = this.outfitOf(id);
    for (const o of this.info) o.destroy();
    this.info = [];
    const add = <O extends Phaser.GameObjects.GameObject>(o: O): O => {
      this.info.push(o);
      return o;
    };

    // Cursor en la grilla.
    const { x: cx, y: cy } = this.cellPos(this.sel);
    const half = this.sel === 6 ? 27 : 38;
    this.cursor.clear();
    this.cursor.lineStyle(2, UI.gold).strokeRect(cx - half, cy - half, half * 2, half * 2);
    this.cells.forEach((c, i) => c.setTint(i === this.sel ? 0xffffff : 0x9a98a8).setFrame(i === this.sel ? 'win' : 'normal'));
    // El retrato de la grilla muestra el traje elegido.
    this.cells[this.sel].destroy();
    this.cells[this.sel] = portrait(this, id, outfit, 'win', cx, cy, this.sel === 6 ? 0.52 : 0.75);

    // Muñequito.
    this.puppet?.img.destroy();
    this.puppet = new Puppet(this, id, outfit, GRID_X + CELL_W * 1.5 + 10, 318, 1.6).play('taunt', 5);

    // Ficha.
    const X = 276;
    let y = 42;
    add(pxText(this, X, y, txt.name, { outline: true, color: UI.gold, scale: 2 }));
    y += 20;
    add(pxText(this, X, y, txt.club, { color: UI.cyan }));
    y += 14;
    add(pxText(this, X, y, wrapText(txt.bio, 344), { color: UI.white }));
    y += 12 * wrapText(txt.bio, 344).split('\n').length + 6;

    // Stats en dos columnas.
    const st = CHARACTERS[id].stats;
    STAT_KEYS.forEach((k, i) => {
      const sx = X + (i % 2) * 176;
      const sy = y + Math.floor(i / 2) * 12;
      add(pxText(this, sx, sy, T.statNames[i], { color: UI.dim }));
      const bar = add(this.add.graphics());
      for (let j = 0; j < 10; j++) {
        bar.fillStyle(j < st[k] ? (st[k] >= 8 ? UI.gold : UI.green) : 0x34324a).fillRect(sx + 70 + j * 9, sy + 3, 7, 5);
      }
    });
    y += 40;

    const block = (title: string, [name, desc]: string[]) => {
      add(pxText(this, X, y, `${title}: ${name}`, { outline: true, color: UI.gold }));
      y += 12;
      const w = wrapText(desc, 344);
      add(pxText(this, X, y, w, { color: UI.white }));
      y += 12 * w.split('\n').length + 5;
    };
    block(T.select.special, txt.special);
    block(T.select.passive, txt.passive);
    block(T.select.weakness, txt.weakness);

    // Traje.
    const names = T.outfits[id] ?? [];
    const unlocked = save().unlockedOutfits.includes(id);
    const nOut = CHARACTER_ARTS[id].outfits.length;
    add(pxText(this, X, 314, `${T.select.outfit}: ${names[outfit] ?? '?'}${nOut > 1 && unlocked ? '  (X)' : ''}`, { outline: true, color: UI.cyan }));
    if (!unlocked) add(pxText(this, X, 326, T.select.outfitLocked, { color: UI.dim }));
    else if (save().towersWon.includes(id)) add(pxText(this, X, 326, T.select.towerDone, { color: UI.gold }));

    if (say) {
      this.bubble.show(wrapText(pick(txt.phrases), 180), GRID_X + CELL_W * 1.5 - 4, 262, 2200);
      sfx.bip();
    }
  }

  update(_t: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.t += dt;
    this.puppet?.update(dt);
    const col = this.sel % 3;
    const row = Math.floor(this.sel / 3);
    const secret = this.roster.length > 6;
    let moved = false;
    if (this.sel === 6) {
      // Desde el casillero secreto: arriba vuelve a la grilla.
      if (keyboard.anyPressed(['ArrowUp', 'KeyW'])) {
        this.sel = 3;
        moved = true;
      } else if (keyboard.anyPressed(['ArrowDown', 'KeyS'])) {
        this.sel = 0;
        moved = true;
      }
    } else {
      if (keyboard.anyPressed(['ArrowLeft', 'KeyA'])) {
        this.sel = row * 3 + ((col + 2) % 3);
        moved = true;
      }
      if (keyboard.anyPressed(['ArrowRight', 'KeyD'])) {
        this.sel = row * 3 + ((col + 1) % 3);
        moved = true;
      }
      if (keyboard.anyPressed(['ArrowDown', 'KeyS'])) {
        this.sel = row === 1 && secret ? 6 : ((row + 1) % 2) * 3 + col;
        moved = true;
      } else if (keyboard.anyPressed(['ArrowUp', 'KeyW'])) {
        this.sel = row === 0 && secret ? 6 : ((row + 1) % 2) * 3 + col;
        moved = true;
      }
    }
    if (moved) this.refresh(true);

    const id = this.id;
    if (keyboard.anyPressed(['KeyX', 'KeyG', 'KeyL', 'Tab']) && save().unlockedOutfits.includes(id)) {
      const n = CHARACTER_ARTS[id].outfits.length;
      this.outfits[id] = (this.outfitOf(id) + 1) % n;
      sfx.clinc();
      this.refresh(false);
    }
    if (keyboard.anyPressed(CONFIRM)) {
      sfx.ready();
      const seed = Math.floor(Math.random() * 1e9);
      const rnd = mulberry(seed);
      const ctx: TowerCtx = { run: newTower(id, this.outfitOf(id), rnd, seed), used: [] };
      goTo(this, 'tower', { ctx });
    } else if (keyboard.anyPressed(BACK)) {
      goTo(this, 'testMenu');
    }
    keyboard.endFrame();
  }
}

/** Azar con semilla (para que la torre se pueda repetir en las pruebas). */
export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
