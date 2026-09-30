// Game Over: "¿CONTINUAR? 10... 9..." con Don Ganso contando y cada vez más impaciente.
// Continuar en la torre repite el escalón (con chicana nueva); en el Boss, el relevo arranca de cero.

import Phaser from 'phaser';
import { music } from '../audio/music';
import { flowMode } from '../game/autoplay';
import { drawGanso, type GansoFrame } from '../art/ganso';
import { newRelay } from '../game/bossRelay';
import { bossRivals, continueRun } from '../game/tower';
import type { BossCtx, TowerCtx } from '../game/flow';
import { save } from '../game/save';
import type { MatchSetup } from '../game/setup';
import { keyboard } from '../input/keyboard';
import { sfx } from '../audio/sfx';
import { T, pick } from '../texts/es';
import { pxText } from '../ui/pixelFont';
import { Bubble, UI, fullscreenButton } from '../ui/widgets';
import { BACK, CONFIRM, artTexture, enter, goTo, portrait } from '../ui/screens';

export interface GameOverData {
  tower?: TowerCtx;
  boss?: BossCtx;
}

export class GameOverScene extends Phaser.Scene {
  private data0: GameOverData = {};
  private count = 10;
  private t = 0;
  private num!: Phaser.GameObjects.BitmapText;
  private goose!: Phaser.GameObjects.Image;
  private bubble!: Bubble;
  private done = false;

  constructor() {
    super('gameover');
  }

  init(data: GameOverData): void {
    this.data0 = data;
    this.count = 10;
    this.t = 0;
    this.done = false;
  }

  create(): void {
    enter(this, 400);
    music.play('defeat');
    const g = this.add.graphics();
    g.fillStyle(0x0b0a10).fillRect(0, 0, 640, 360);
    for (let y = 0; y < 360; y += 3) g.fillStyle(0x140f18).fillRect(0, y, 640, 1);
    const run = (this.data0.tower ?? this.data0.boss)?.run;
    if (run) portrait(this, run.player, run.outfit, 'lose', 120, 200, 1.3).setTint(0x8888a0);

    pxText(this, 320, 36, T.gameOver.title, { outline: true, color: UI.red, scale: 4 }).setOrigin(0.5, 0);
    pxText(this, 320, 104, T.gameOver.cont, { outline: true, color: UI.gold, scale: 2 }).setOrigin(0.5, 0);
    this.num = pxText(this, 320, 146, '10', { outline: true, color: UI.white, scale: 5 }).setOrigin(0.5, 0);
    for (const f of ['idle', 'blink', 'honk', 'sleep', 'look'] as GansoFrame[]) artTexture(this, `ganso_${f}`, () => drawGanso(f));
    this.goose = this.add.image(500, 300, 'ganso_idle').setOrigin(0.5, 1).setScale(3);
    this.bubble = new Bubble(this);
    pxText(this, 320, 330, T.gameOver.help, { outline: true, color: UI.dim }).setOrigin(0.5, 0);
    fullscreenButton(this);
    this.tick();
  }

  private tick(): void {
    this.num.setText(String(this.count));
    this.num.setScale(7);
    this.tweens.add({ targets: this.num, scale: 5, duration: 200, ease: 'Back.Out' });
    sfx.bip();
    const line = T.gameOver.count[this.count];
    if (line) {
      this.bubble.show(line, 500, 216, 1800);
      this.goose.setTexture(this.count <= 1 ? 'ganso_sleep' : 'ganso_honk');
      if (this.count > 1) sfx.call();
    } else if (this.count > 1) this.goose.setTexture('ganso_look');
  }

  private continueRun(): void {
    this.done = true;
    sfx.ready();
    const o = save().options;
    if (this.data0.tower) {
      const ctx = this.data0.tower;
      goTo(this, 'vs', { ctx: { ...ctx, run: continueRun(ctx.run) } });
    } else if (this.data0.boss) {
      const b = this.data0.boss;
      const rivals = bossRivals(b.run).sort(() => Math.random() - 0.5);
      const boss: BossCtx = { ...b, run: continueRun(b.run), relay: newRelay(rivals), recipe: [false, false, false], fresh: false };
      const setup: Partial<MatchSetup> = { ...flowMode(), games: o.games, difficulty: o.difficulty, venue: 'chattahoochee', boss };
      goTo(this, 'match', setup);
    } else goTo(this, 'menu');
  }

  update(_t: number, deltaMs: number): void {
    if (this.done) return;
    this.t += deltaMs / 1000;
    if (this.t >= 1.1) {
      this.t = 0;
      if (this.count > 0) {
        this.count--;
        this.tick();
      } else {
        this.done = true;
        goTo(this, 'menu', undefined, 600);
      }
    }
    if (this.count > 0 && keyboard.anyPressed(CONFIRM)) {
      this.bubble.show(pick(T.gameOver.again), 500, 216, 1500);
      this.continueRun();
    } else if (keyboard.anyPressed(BACK)) {
      this.done = true;
      goTo(this, 'menu');
    }
    keyboard.endFrame();
  }
}
