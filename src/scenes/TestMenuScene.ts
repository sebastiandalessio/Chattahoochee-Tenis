// Menú del hito 1: elegir modo, duración, dificultad y superficie para probar el partido.

import Phaser from 'phaser';
import { DEFAULT_SETUP, type MatchSetup, type Mode } from '../game/setup';
import { keyboard } from '../input/keyboard';
import { T } from '../texts/es';
import { pxText } from '../ui/pixelFont';
import { UI, drawBox, fullscreenButton } from '../ui/widgets';

const MODES: Mode[] = ['cpu', '2p', 'demo'];
const GAMES = [2, 4, 6] as const;
const SURFACES = ['hard', 'clay', 'fast'] as const;

export class TestMenuScene extends Phaser.Scene {
  private setup: MatchSetup = { ...DEFAULT_SETUP };
  private sel = 0;
  private rows: Phaser.GameObjects.BitmapText[] = [];
  private values: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('testMenu');
  }

  init(data: Partial<MatchSetup>): void {
    this.setup = { ...DEFAULT_SETUP, ...data, speed: 1, seed: undefined };
    this.sel = 4;
  }

  create(): void {
    const g = this.add.graphics();
    g.fillStyle(0x15141f).fillRect(0, 0, 640, 360);
    // Río Chattahoochee estilizado en el fondo.
    for (let i = 0; i < 640; i += 2) {
      const y = 300 + Math.round(Math.sin(i / 40) * 6);
      g.fillStyle(0x1f3a5a).fillRect(i, y, 2, 60);
      g.fillStyle(0x2d5580).fillRect(i, y, 2, 2);
    }
    drawBox(g, 150, 70, 340, 200, 0x1d1c2b, 0x3a3850);

    pxText(this, 320, 22, T.title, { outline: true, color: UI.gold, scale: 3 }).setOrigin(0.5, 0);
    pxText(this, 320, 76, T.testMenu.heading, { outline: true, color: UI.cyan, scale: 2 }).setOrigin(0.5, 0);
    pxText(this, 320, 102, T.testMenu.sub, { color: UI.dim }).setOrigin(0.5, 0);

    const labels = [T.testMenu.mode, T.testMenu.length, T.testMenu.difficulty, T.testMenu.surface, T.testMenu.play];
    labels.forEach((label, i) => {
      const y = 126 + i * 24;
      this.rows.push(pxText(this, 190, y, label, { outline: true }));
      if (i < 4) this.values.push(pxText(this, 300, y, '', { outline: true, color: UI.gold }));
    });
    this.rows[4].setX(320).setOrigin(0.5, 0).setScale(2).setY(222);
    this.cursor = pxText(this, 176, 0, '▶', { outline: true, color: UI.gold });
    pxText(this, 320, 278, T.testMenu.help, { outline: true, color: UI.dim }).setOrigin(0.5, 0);
    fullscreenButton(this);
    keyboard.install();
    this.refresh();
  }

  private refresh(): void {
    const s = this.setup;
    this.values[0].setText(T.testMenu.modes[MODES.indexOf(s.mode)]);
    this.values[1].setText(T.testMenu.lengths[GAMES.indexOf(s.games)]);
    this.values[2].setText(T.testMenu.difficulties[s.difficulty]);
    this.values[3].setText(T.testMenu.surfaces[SURFACES.indexOf(s.surface)]);
    this.rows.forEach((r, i) => r.setTint(i === this.sel ? UI.gold : UI.white));
    if (this.sel < 4) this.cursor.setPosition(176, 126 + this.sel * 24).setVisible(true);
    else this.cursor.setPosition(236, 226).setVisible(true);
  }

  private change(dir: number): void {
    const s = this.setup;
    const cycle = <V>(list: readonly V[], v: V): V => list[(list.indexOf(v) + dir + list.length) % list.length];
    if (this.sel === 0) s.mode = cycle(MODES, s.mode);
    if (this.sel === 1) s.games = cycle(GAMES, s.games);
    if (this.sel === 2) s.difficulty = cycle([0, 1, 2] as const, s.difficulty);
    if (this.sel === 3) s.surface = cycle(SURFACES, s.surface);
  }

  update(): void {
    if (keyboard.anyPressed(['ArrowUp', 'KeyW'])) this.sel = (this.sel + 4) % 5;
    if (keyboard.anyPressed(['ArrowDown', 'KeyS'])) this.sel = (this.sel + 1) % 5;
    if (keyboard.anyPressed(['ArrowLeft', 'KeyA'])) this.change(-1);
    if (keyboard.anyPressed(['ArrowRight', 'KeyD'])) this.change(1);
    if (keyboard.anyPressed(['Enter', 'Space', 'KeyZ'])) {
      if (this.sel === 4) {
        keyboard.endFrame();
        this.scene.start('match', { ...this.setup });
        return;
      }
      this.sel = 4;
    }
    this.refresh();
    keyboard.endFrame();
  }
}
