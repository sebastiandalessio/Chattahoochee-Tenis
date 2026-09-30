// Amistoso: partido suelto. Modo (vos contra la CPU, 2 jugadores o CPU contra CPU), duración,
// dificultad, sede, jugadores y, si se quiere, duelo de chicanas antes de empezar.
// (La clave de la escena sigue siendo 'testMenu' porque nació como menú de prueba.)

import Phaser from 'phaser';
import { CHARACTER_ORDER } from '../game/characters';
import { DEFAULT_SETUP, resolveChars, type CharacterPick, type MatchSetup, type Mode, type VenuePick } from '../game/setup';
import { save, updateSave } from '../game/save';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { keyboard } from '../input/keyboard';
import { T } from '../texts/es';
import { pxText } from '../ui/pixelFont';
import { UI, drawBox, fullscreenButton } from '../ui/widgets';
import { BACK, enter, goTo, portrait } from '../ui/screens';

const MODES: Mode[] = ['cpu', '2p', 'demo'];
const GAMES = [2, 4, 6] as const;
const VENUE_PICKS: VenuePick[] = ['sorteo', 'breckenridge', 'springRidge', 'stRegis', 'chattahoochee'];
const picks = (): CharacterPick[] => [...CHARACTER_ORDER, ...(save().ganso ? (['donGanso'] as CharacterPick[]) : []), 'azar'];

const ROW_Y0 = 86;
const ROW_DY = 22;
const OPTION_ROWS = 7;

/** Chicanas en el amistoso: se recuerda entre visitas. */
let chicanasOn = false;

export class TestMenuScene extends Phaser.Scene {
  private setup: MatchSetup = { ...DEFAULT_SETUP };
  private sel = 0;
  private rows: Phaser.GameObjects.BitmapText[] = [];
  private values: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  private play!: Phaser.GameObjects.BitmapText;
  private faces: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('testMenu');
  }

  init(data: Partial<MatchSetup>): void {
    const o = save().options;
    this.setup = {
      ...DEFAULT_SETUP,
      games: o.games,
      difficulty: o.difficulty,
      ...data,
      mode: data?.mode === 'practice' || !data?.mode ? DEFAULT_SETUP.mode : data.mode,
      speed: 1,
      seed: undefined,
      tower: undefined,
      boss: undefined,
      outfits: undefined,
      duels: undefined,
    };
    this.sel = OPTION_ROWS;
    // Las escenas se reutilizan: hay que vaciar lo que quedó de la visita anterior.
    this.rows = [];
    this.values = [];
    this.faces = [];
  }

  create(): void {
    enter(this);
    music.play('menu');
    const g = this.add.graphics();
    g.fillStyle(0x15141f).fillRect(0, 0, 640, 360);
    // Río Chattahoochee estilizado en el fondo.
    for (let i = 0; i < 640; i += 2) {
      const y = 318 + Math.round(Math.sin(i / 40) * 6);
      g.fillStyle(0x1f3a5a).fillRect(i, y, 2, 60);
      g.fillStyle(0x2d5580).fillRect(i, y, 2, 2);
    }
    drawBox(g, 150, 72, 340, 222, 0x1d1c2b, 0x3a3850);
    pxText(this, 320, 10, T.friendly.title, { outline: true, color: UI.gold, scale: 3 }).setOrigin(0.5, 0);
    pxText(this, 320, 44, T.friendly.sub, { color: UI.dim }).setOrigin(0.5, 0);

    for (let i = 0; i < OPTION_ROWS; i++) {
      const y = ROW_Y0 + i * ROW_DY;
      this.rows.push(pxText(this, 180, y, '', { outline: true }));
      this.values.push(pxText(this, 300, y, '', { outline: true, color: UI.gold }));
    }
    this.play = pxText(this, 320, ROW_Y0 + OPTION_ROWS * ROW_DY + 12, T.testMenu.play, { outline: true, scale: 2 }).setOrigin(0.5, 0);
    this.cursor = pxText(this, 166, 0, '▶', { outline: true, color: UI.gold });
    pxText(this, 320, 302, `${T.testMenu.help} · ESC volver`, { outline: true, color: UI.dim }).setOrigin(0.5, 0);
    fullscreenButton(this);
    this.refresh();
  }

  private pickName(p: CharacterPick): string {
    return p === 'azar' ? T.testMenu.random : T.characters[p].name;
  }

  private refresh(): void {
    const s = this.setup;
    const m = s.mode;
    const labels = [
      T.testMenu.mode,
      T.testMenu.length,
      T.testMenu.difficulty,
      T.testMenu.venue,
      m === '2p' ? T.testMenu.bottom2P : m === 'demo' ? T.testMenu.bottomDemo : T.testMenu.bottom,
      m === '2p' ? T.testMenu.top2P : T.testMenu.top,
      T.friendly.chicanas,
    ];
    const values = [
      T.testMenu.modes[MODES.indexOf(s.mode)],
      T.testMenu.lengths[GAMES.indexOf(s.games)],
      T.testMenu.difficulties[s.difficulty],
      s.venue === 'sorteo' ? T.venues.random : T.venues.names[s.venue],
      this.pickName(s.chars[0]),
      this.pickName(s.chars[1]),
      m === 'demo' ? '-' : T.friendly.chicanasValues[chicanasOn ? 1 : 0],
    ];
    labels.forEach((l, i) => this.rows[i].setText(l).setTint(i === this.sel ? UI.gold : UI.white));
    values.forEach((v, i) => this.values[i].setText(v));
    this.play.setTint(this.sel === OPTION_ROWS ? UI.gold : UI.white);
    if (this.sel < OPTION_ROWS) this.cursor.setPosition(166, ROW_Y0 + this.sel * ROW_DY);
    else this.cursor.setPosition(250, ROW_Y0 + OPTION_ROWS * ROW_DY + 16);
    // Retratos de los elegidos a los costados.
    for (const f of this.faces) f.destroy();
    this.faces = [];
    ([0, 1] as const).forEach((side) => {
      const c = s.chars[side];
      if (c === 'azar') return;
      this.faces.push(portrait(this, c, 0, 'normal', side === 0 ? 74 : 566, 170, 1, side === 1));
    });
  }

  private change(dir: number): void {
    const s = this.setup;
    const cycle = <V>(list: readonly V[], v: V): V => list[(list.indexOf(v) + dir + list.length) % list.length];
    if (this.sel === 0) s.mode = cycle(MODES, s.mode);
    if (this.sel === 1) s.games = cycle(GAMES, s.games);
    if (this.sel === 2) s.difficulty = cycle([0, 1, 2] as const, s.difficulty);
    if (this.sel === 3) s.venue = cycle(VENUE_PICKS, s.venue);
    if (this.sel === 4) s.chars = [cycle(picks(), s.chars[0]), s.chars[1]];
    if (this.sel === 5) s.chars = [s.chars[0], cycle(picks(), s.chars[1])];
    if (this.sel === 6) chicanasOn = !chicanasOn;
    sfx.bip();
  }

  private start(): void {
    const s = { ...this.setup };
    // Lo que se elige acá queda como duración y dificultad por defecto.
    updateSave((d) => ({ ...d, options: { ...d.options, games: s.games, difficulty: s.difficulty } }));
    sfx.ready();
    if (chicanasOn && s.mode !== 'demo') {
      const chars = resolveChars(s.chars, Math.random);
      goTo(this, 'duel', { friendly: { setup: { ...s, chars }, round: 0, results: [null, null] } });
    } else goTo(this, 'match', s);
  }

  update(): void {
    const n = OPTION_ROWS + 1;
    const before = this.sel;
    let changed = false;
    if (keyboard.anyPressed(['ArrowUp', 'KeyW'])) this.sel = (this.sel + n - 1) % n;
    if (keyboard.anyPressed(['ArrowDown', 'KeyS'])) this.sel = (this.sel + 1) % n;
    if (keyboard.anyPressed(['ArrowLeft', 'KeyA'])) {
      this.change(-1);
      changed = true;
    }
    if (keyboard.anyPressed(['ArrowRight', 'KeyD'])) {
      this.change(1);
      changed = true;
    }
    if (keyboard.anyPressed(['Enter', 'Space', 'KeyZ'])) {
      if (this.sel === OPTION_ROWS) {
        this.start();
        keyboard.endFrame();
        return;
      }
      this.sel = OPTION_ROWS;
    } else if (keyboard.anyPressed(BACK)) goTo(this, 'menu', { sel: 1 });
    if (changed || before !== this.sel) this.refresh();
    keyboard.endFrame();
  }
}
