// Opciones (duración, dificultad, volúmenes, teclas, borrar progreso), reasignación de teclas y
// "Cómo jugar" (páginas con controles, golpes, saque, mística, recetas y torre).

import Phaser from 'phaser';
import { music } from '../audio/music';
import { setMusicVolume, setSfxVolume } from '../audio/engine';
import { sfx } from '../audio/sfx';
import { CHARACTER_ORDER } from '../game/characters';
import { emptySave, save, updateSave } from '../game/save';
import { RULES } from '../sim/rules';
import { MAP_OF, applyKeyOptions, keyLabel, keyboard, type ActionKey, type KeyOptions } from '../input/keyboard';
import { T } from '../texts/es';
import { pxText, wrapText } from '../ui/pixelFont';
import { UI, drawBox, fullscreenButton } from '../ui/widgets';
import { BACK, CONFIRM, enter, goTo, portrait } from '../ui/screens';

function backdrop(scene: Phaser.Scene, title: string): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x15141f).fillRect(0, 0, 640, 360);
  for (let y = 0; y < 360; y += 16) for (let x = (y / 16) % 2 ? 16 : 0; x < 640; x += 32) g.fillStyle(0x191827).fillRect(x, y, 16, 16);
  pxText(scene, 320, 10, title, { outline: true, color: UI.gold, scale: 3 }).setOrigin(0.5, 0);
  return g;
}

// ---------------------------------------------------------------- opciones

type Row = 'games' | 'difficulty' | 'music' | 'sfx' | 'keys' | 'reset' | 'back';
const ROWS: Row[] = ['games', 'difficulty', 'music', 'sfx', 'keys', 'reset', 'back'];

export class OptionsScene extends Phaser.Scene {
  private sel = 0;
  private labels: Phaser.GameObjects.BitmapText[] = [];
  private values: Phaser.GameObjects.BitmapText[] = [];
  private bars!: Phaser.GameObjects.Graphics;
  private tip!: Phaser.GameObjects.BitmapText;
  private cursor!: Phaser.GameObjects.BitmapText;
  private confirmReset = false;

  constructor() {
    super('options');
  }

  init(): void {
    this.sel = 0;
    this.labels = [];
    this.values = [];
    this.confirmReset = false;
  }

  create(): void {
    enter(this);
    music.play('menu');
    const g = backdrop(this, T.options.title);
    drawBox(g, 100, 60, 440, 216, 0x191826, UI.gold, 0.95);
    ROWS.forEach((r, i) => {
      const y = 76 + i * 28;
      this.labels.push(pxText(this, 136, y, T.options.rows[r], { outline: true }));
      this.values.push(pxText(this, 300, y, '', { outline: true, color: UI.gold }));
    });
    this.bars = this.add.graphics();
    this.cursor = pxText(this, 118, 0, '▶', { outline: true, color: UI.gold });
    drawBox(g, 100, 284, 440, 44, 0x101018, 0x3a3850, 0.9);
    this.tip = pxText(this, 110, 290, '', { color: UI.white });
    pxText(this, 320, 344, T.options.help, { outline: true, color: UI.dim }).setOrigin(0.5, 0);
    fullscreenButton(this);
    this.refresh();
  }

  private refresh(): void {
    const o = save().options;
    const vals: Record<Row, string> = {
      games: T.testMenu.lengths[[2, 4, 6].indexOf(o.games)],
      difficulty: T.testMenu.difficulties[o.difficulty],
      music: '',
      sfx: '',
      keys: T.options.keysValue,
      reset: T.options.resetValue,
      back: '',
    };
    ROWS.forEach((r, i) => {
      this.labels[i].setTint(i === this.sel ? UI.gold : UI.white);
      this.values[i].setText(vals[r]);
    });
    this.cursor.setY(76 + this.sel * 28);
    const b = this.bars;
    b.clear();
    for (const [row, v] of [
      ['music', o.music],
      ['sfx', o.sfx],
    ] as [Row, number][]) {
      const y = 76 + ROWS.indexOf(row) * 28 + 2;
      for (let j = 0; j < 10; j++) b.fillStyle(j < Math.round(v * 10) ? UI.green : 0x34324a).fillRect(300 + j * 14, y, 11, 7);
    }
    const r = ROWS[this.sel];
    this.tip.setText(wrapText(this.confirmReset ? T.options.resetConfirm : `DON GANSO: ${T.options.gansoTips[r]}`, 420));
  }

  private change(dir: number): void {
    const r = ROWS[this.sel];
    updateSave((d) => {
      const o = { ...d.options };
      if (r === 'games') o.games = ([2, 4, 6] as const)[(([2, 4, 6].indexOf(o.games) + dir + 3) % 3)];
      if (r === 'difficulty') o.difficulty = (((o.difficulty + dir + 3) % 3) as 0 | 1 | 2);
      if (r === 'music') o.music = Math.max(0, Math.min(1, Math.round((o.music + dir * 0.1) * 10) / 10));
      if (r === 'sfx') o.sfx = Math.max(0, Math.min(1, Math.round((o.sfx + dir * 0.1) * 10) / 10));
      return { ...d, options: o };
    });
    const o = save().options;
    setMusicVolume(o.music);
    setSfxVolume(o.sfx);
    sfx.bip();
  }

  update(): void {
    if (this.confirmReset) {
      if (keyboard.anyPressed(CONFIRM)) {
        // Borra el progreso pero mantiene las opciones.
        updateSave((d) => ({ ...emptySave(), options: d.options }));
        this.confirmReset = false;
        sfx.stamp();
        this.refresh();
        this.tip.setText(wrapText(T.options.resetDone, 420));
      } else if (keyboard.anyPressed(BACK)) {
        this.confirmReset = false;
        this.refresh();
      }
      keyboard.endFrame();
      return;
    }
    const n = ROWS.length;
    if (keyboard.anyPressed(['ArrowUp', 'KeyW'])) {
      this.sel = (this.sel + n - 1) % n;
      sfx.bip();
      this.refresh();
    }
    if (keyboard.anyPressed(['ArrowDown', 'KeyS'])) {
      this.sel = (this.sel + 1) % n;
      sfx.bip();
      this.refresh();
    }
    const r = ROWS[this.sel];
    if (keyboard.anyPressed(['ArrowLeft', 'KeyA'])) {
      this.change(-1);
      this.refresh();
    }
    if (keyboard.anyPressed(['ArrowRight', 'KeyD'])) {
      this.change(1);
      this.refresh();
    }
    if (keyboard.anyPressed(CONFIRM)) {
      if (r === 'keys') goTo(this, 'keys');
      else if (r === 'reset') {
        this.confirmReset = true;
        this.refresh();
      } else if (r === 'back') goTo(this, 'menu', { sel: 3 });
      else {
        this.change(1);
        this.refresh();
      }
    } else if (keyboard.anyPressed(BACK)) goTo(this, 'menu', { sel: 3 });
    keyboard.endFrame();
  }
}

// ---------------------------------------------------------------- teclas

const WHO = ['p1', 'a', 'b'] as const;
const ACTS: ActionKey[] = ['hit', 'slice', 'special', 'taunt'];

export class KeysScene extends Phaser.Scene {
  private who = 0;
  private sel = 0;
  private waiting = false;
  private texts: Phaser.GameObjects.BitmapText[] = [];
  private whoText!: Phaser.GameObjects.BitmapText;
  private status!: Phaser.GameObjects.BitmapText;
  private cursor!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('keys');
  }

  init(): void {
    this.who = 0;
    this.sel = 0;
    this.waiting = false;
    this.texts = [];
  }

  create(): void {
    enter(this);
    const g = backdrop(this, T.keys.title);
    drawBox(g, 100, 56, 440, 250, 0x191826, UI.gold, 0.95);
    this.whoText = pxText(this, 320, 66, '', { outline: true, color: UI.cyan, scale: 2 }).setOrigin(0.5, 0);
    for (let i = 0; i < 7; i++) this.texts.push(pxText(this, 140, 100 + i * 24, '', { outline: true }));
    this.cursor = pxText(this, 122, 0, '▶', { outline: true, color: UI.gold });
    this.status = pxText(this, 320, 276, '', { outline: true, color: UI.gold }).setOrigin(0.5, 0);
    pxText(this, 320, 316, T.keys.pad, { color: UI.dim }).setOrigin(0.5, 0);
    pxText(this, 320, 344, T.keys.help, { outline: true, color: UI.dim }).setOrigin(0.5, 0);
    fullscreenButton(this);
    this.refresh();
  }

  private refresh(): void {
    const who = WHO[this.who];
    const map = MAP_OF[who];
    this.whoText.setText(`◀ ${T.keys.who[this.who]} ▶`);
    const rows = [
      `${T.keys.move}: ${T.keys.moves[this.who]}`,
      ...ACTS.map((a, i) => `${T.keys.actions[i]}: ${keyLabel(map[a][0])}`),
      T.keys.reset,
      T.keys.back,
    ];
    rows.forEach((r, i) => this.texts[i].setText(r).setTint(i === this.sel + 1 ? UI.gold : i === 0 ? UI.dim : UI.white));
    this.cursor.setY(100 + (this.sel + 1) * 24);
    this.status.setText(this.waiting ? T.keys.press : '');
  }

  private setKey(act: ActionKey, code: string): void {
    const who = WHO[this.who];
    updateSave((d) => {
      const keys: KeyOptions = JSON.parse(JSON.stringify(d.options.keys ?? {}));
      const cur: Record<string, string> = {};
      for (const a of ACTS) cur[a] = MAP_OF[who][a][0];
      // Si la tecla ya se usaba para otra acción, se intercambian.
      const other = ACTS.find((a) => a !== act && cur[a] === code);
      if (other) cur[other] = cur[act];
      cur[act] = code;
      keys[who] = cur as Record<ActionKey, string>;
      return { ...d, options: { ...d.options, keys } };
    });
    applyKeyOptions(save().options.keys);
  }

  update(): void {
    if (this.waiting) {
      const code = keyboard.firstPressed();
      if (code === 'Escape') {
        this.waiting = false;
        this.refresh();
      } else if (code && !code.startsWith('Arrow') && !['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter'].includes(code)) {
        this.setKey(ACTS[this.sel], code);
        this.waiting = false;
        sfx.clinc();
        this.refresh();
      }
      keyboard.endFrame();
      return;
    }
    const n = ACTS.length + 2;
    if (keyboard.anyPressed(['ArrowUp', 'KeyW'])) this.sel = (this.sel + n - 1) % n;
    if (keyboard.anyPressed(['ArrowDown', 'KeyS'])) this.sel = (this.sel + 1) % n;
    if (keyboard.anyPressed(['ArrowLeft', 'KeyA'])) this.who = (this.who + 2) % 3;
    if (keyboard.anyPressed(['ArrowRight', 'KeyD'])) this.who = (this.who + 1) % 3;
    if (keyboard.anyPressed(['Enter', 'Space'])) {
      if (this.sel < ACTS.length) this.waiting = true;
      else if (this.sel === ACTS.length) {
        updateSave((d) => {
          const keys: KeyOptions = { ...(d.options.keys ?? {}) };
          delete keys[WHO[this.who]];
          return { ...d, options: { ...d.options, keys } };
        });
        applyKeyOptions(save().options.keys);
        sfx.clinc();
      } else goTo(this, 'options');
    } else if (keyboard.anyPressed(BACK)) goTo(this, 'options');
    this.refresh();
    keyboard.endFrame();
  }
}

// ---------------------------------------------------------------- cómo jugar

export class HowToScene extends Phaser.Scene {
  private page = 0;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private pageText!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('howto');
  }

  init(): void {
    this.page = 0;
    this.objs = [];
  }

  create(): void {
    enter(this);
    music.play('menu');
    const g = backdrop(this, T.howto.title);
    drawBox(g, 30, 50, 580, 280, 0x191826, UI.gold, 0.95);
    this.pageText = pxText(this, 320, 344, '', { outline: true, color: UI.dim }).setOrigin(0.5, 0);
    fullscreenButton(this);
    this.show();
  }

  private show(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
    const pages = T.howto.pages;
    const p = pages[this.page];
    this.objs.push(pxText(this, 320, 58, p.title.toUpperCase(), { outline: true, color: UI.cyan, scale: 2 }).setOrigin(0.5, 0));
    if (p.title === 'Recetas') {
      // Las recetas de los seis, con su especial.
      CHARACTER_ORDER.forEach((id, i) => {
        const x = 50 + (i % 2) * 284;
        const y = 90 + Math.floor(i / 2) * 76;
        this.objs.push(portrait(this, id, 0, 'normal', x + 20, y + 26, 0.42));
        this.objs.push(pxText(this, x + 46, y, `${T.characters[id].name} — ${T.specials[RULES[id].special].name}`, { outline: true, color: UI.gold }));
        RULES[id].recipe.forEach((st, k) => {
          this.objs.push(pxText(this, x + 46, y + 14 + k * 12, `${k + 1}. ${T.steps[st]}`, { color: UI.white }));
        });
      });
    } else {
      let y = 92;
      for (const line of p.lines) {
        const w = wrapText(line, 550);
        this.objs.push(pxText(this, 46, y, w, { color: UI.white }));
        y += 12 * w.split('\n').length + 12;
      }
    }
    this.pageText.setText(`◀ ${this.page + 1}/${pages.length} ▶   ${T.howto.help}`);
  }

  update(): void {
    const n = T.howto.pages.length;
    if (keyboard.anyPressed(['ArrowLeft', 'KeyA'])) {
      this.page = (this.page + n - 1) % n;
      sfx.bip();
      this.show();
    }
    if (keyboard.anyPressed(['ArrowRight', 'KeyD', ...CONFIRM])) {
      this.page = (this.page + 1) % n;
      sfx.bip();
      this.show();
    }
    if (keyboard.anyPressed(BACK)) goTo(this, 'menu', { sel: 4 });
    keyboard.endFrame();
  }
}
