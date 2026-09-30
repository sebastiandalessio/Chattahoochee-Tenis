// Menú de prueba (provisorio hasta el menú de verdad del hito 6): modo, duración, dificultad,
// superficie y personajes.

import Phaser from 'phaser';
import { CHARACTER_ORDER } from '../game/characters';
import { DEFAULT_SETUP, type CharacterPick, type MatchSetup, type Mode } from '../game/setup';
import { keyboard } from '../input/keyboard';
import { T } from '../texts/es';
import { pxText } from '../ui/pixelFont';
import { UI, drawBox, fullscreenButton } from '../ui/widgets';

const MODES: Mode[] = ['cpu', '2p', 'demo'];
const GAMES = [2, 4, 6] as const;
const SURFACES = ['hard', 'clay', 'fast'] as const;
const PICKS: CharacterPick[] = [...CHARACTER_ORDER, 'azar'];

const ROW_Y0 = 120;
const ROW_DY = 19;
const OPTION_ROWS = 6;

export class TestMenuScene extends Phaser.Scene {
  private setup: MatchSetup = { ...DEFAULT_SETUP };
  private sel = 0;
  private rows: Phaser.GameObjects.BitmapText[] = [];
  private values: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  private play!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('testMenu');
  }

  init(data: Partial<MatchSetup>): void {
    this.setup = { ...DEFAULT_SETUP, ...data, speed: 1, seed: undefined };
    this.sel = OPTION_ROWS;
    // Las escenas se reutilizan: hay que vaciar lo que quedó de la visita anterior.
    this.rows = [];
    this.values = [];
  }

  create(): void {
    const g = this.add.graphics();
    g.fillStyle(0x15141f).fillRect(0, 0, 640, 360);
    // Río Chattahoochee estilizado en el fondo.
    for (let i = 0; i < 640; i += 2) {
      const y = 312 + Math.round(Math.sin(i / 40) * 6);
      g.fillStyle(0x1f3a5a).fillRect(i, y, 2, 60);
      g.fillStyle(0x2d5580).fillRect(i, y, 2, 2);
    }
    drawBox(g, 140, 66, 360, 234, 0x1d1c2b, 0x3a3850);

    pxText(this, 320, 18, T.title, { outline: true, color: UI.gold, scale: 3 }).setOrigin(0.5, 0);
    pxText(this, 320, 72, T.testMenu.heading, { outline: true, color: UI.cyan, scale: 2 }).setOrigin(0.5, 0);
    pxText(this, 320, 98, T.testMenu.sub, { color: UI.dim }).setOrigin(0.5, 0);

    for (let i = 0; i < OPTION_ROWS; i++) {
      const y = ROW_Y0 + i * ROW_DY;
      this.rows.push(pxText(this, 176, y, '', { outline: true }));
      this.values.push(pxText(this, 300, y, '', { outline: true, color: UI.gold }));
    }
    this.play = pxText(this, 320, ROW_Y0 + OPTION_ROWS * ROW_DY + 8, T.testMenu.play, { outline: true, scale: 2 }).setOrigin(0.5, 0);
    this.cursor = pxText(this, 162, 0, '▶', { outline: true, color: UI.gold });
    pxText(this, 320, 290, T.testMenu.help, { outline: true, color: UI.dim }).setOrigin(0.5, 0);
    fullscreenButton(this);
    keyboard.install();
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
      T.testMenu.surface,
      m === '2p' ? T.testMenu.bottom2P : m === 'demo' ? T.testMenu.bottomDemo : T.testMenu.bottom,
      m === '2p' ? T.testMenu.top2P : T.testMenu.top,
    ];
    const values = [
      T.testMenu.modes[MODES.indexOf(s.mode)],
      T.testMenu.lengths[GAMES.indexOf(s.games)],
      T.testMenu.difficulties[s.difficulty],
      T.testMenu.surfaces[SURFACES.indexOf(s.surface)],
      this.pickName(s.chars[0]),
      this.pickName(s.chars[1]),
    ];
    labels.forEach((l, i) => this.rows[i].setText(l).setTint(i === this.sel ? UI.gold : UI.white));
    values.forEach((v, i) => this.values[i].setText(v));
    this.play.setTint(this.sel === OPTION_ROWS ? UI.gold : UI.white);
    if (this.sel < OPTION_ROWS) this.cursor.setPosition(162, ROW_Y0 + this.sel * ROW_DY);
    else this.cursor.setPosition(242, ROW_Y0 + OPTION_ROWS * ROW_DY + 12);
  }

  private change(dir: number): void {
    const s = this.setup;
    const cycle = <V>(list: readonly V[], v: V): V => list[(list.indexOf(v) + dir + list.length) % list.length];
    if (this.sel === 0) s.mode = cycle(MODES, s.mode);
    if (this.sel === 1) s.games = cycle(GAMES, s.games);
    if (this.sel === 2) s.difficulty = cycle([0, 1, 2] as const, s.difficulty);
    if (this.sel === 3) s.surface = cycle(SURFACES, s.surface);
    if (this.sel === 4) s.chars = [cycle(PICKS, s.chars[0]), s.chars[1]];
    if (this.sel === 5) s.chars = [s.chars[0], cycle(PICKS, s.chars[1])];
  }

  update(): void {
    const n = OPTION_ROWS + 1;
    if (keyboard.anyPressed(['ArrowUp', 'KeyW'])) this.sel = (this.sel + n - 1) % n;
    if (keyboard.anyPressed(['ArrowDown', 'KeyS'])) this.sel = (this.sel + 1) % n;
    if (keyboard.anyPressed(['ArrowLeft', 'KeyA'])) this.change(-1);
    if (keyboard.anyPressed(['ArrowRight', 'KeyD'])) this.change(1);
    if (keyboard.anyPressed(['Enter', 'Space', 'KeyZ'])) {
      if (this.sel === OPTION_ROWS) {
        keyboard.endFrame();
        this.scene.start('match', { ...this.setup });
        return;
      }
      this.sel = OPTION_ROWS;
    }
    this.refresh();
    keyboard.endFrame();
  }
}
