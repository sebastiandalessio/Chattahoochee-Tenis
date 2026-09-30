// Victoria contra el Boss: los cinco levantan en andas al campeón... y se tiran todos al río.

import Phaser from 'phaser';
import { splash } from '../art/props';
import { bossRivals } from '../game/tower';
import type { BossCtx } from '../game/flow';
import { keyboard } from '../input/keyboard';
import { sfx } from '../audio/sfx';
import { T } from '../texts/es';
import { pxText } from '../ui/pixelFont';
import { Commentary, UI, banner, fullscreenButton } from '../ui/widgets';
import { CONFIRM, Puppet, artTexture, enter, goTo } from '../ui/screens';
import { riverScene } from './cinema';

const HORIZON = 150;
const SHORE = 262;

export class BossWinScene extends Phaser.Scene {
  private boss!: BossCtx;
  private crowd: Puppet[] = [];
  private champ!: Puppet;
  private comment!: Commentary;
  private t = 0;
  private stage: 'lift' | 'jump' | 'splash' | 'done' = 'lift';

  constructor() {
    super('bossWin');
  }

  init(data: { boss: BossCtx }): void {
    this.boss = data.boss;
    this.crowd = [];
    this.t = 0;
    this.stage = 'lift';
  }

  create(): void {
    enter(this, 400);
    riverScene(this, () => {}, 640, 360, HORIZON, SHORE);
    const run = this.boss.run;
    const rivals = bossRivals(run);
    rivals.forEach((id, i) => {
      const p = new Puppet(this, id, 0, 250 + i * 35, 336, 2, 'front').play('serve', 4);
      p.img.setDepth(336 + (i % 2));
      this.crowd.push(p);
    });
    // El campeón, arriba de las manos de todos.
    this.champ = new Puppet(this, run.player, run.outfit, 282, 262, 2, 'front').play('taunt', 6);
    this.champ.img.setDepth(400).setAngle(90);
    this.tweens.add({ targets: this.champ.img, y: 250, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    banner(this, '¡CAMPEÓN!', UI.gold, 70, 2200);
    this.comment = new Commentary(this, 342);
    this.comment.say('DON GANSO', T.boss.victory[0], 3000);
    sfx.special();
    artTexture(this, 'splashFx', splash);
    fullscreenButton(this);
    pxText(this, 320, 8, T.boss.title, { outline: true, color: UI.gold, scale: 2 }).setOrigin(0.5, 0);
  }

  private jump(): void {
    this.tweens.killTweensOf(this.champ.img);
    this.champ.img.setAngle(0);
    const all = [...this.crowd, this.champ];
    all.forEach((p, i) => {
      const x0 = p.img.x;
      const y0 = p.img.y;
      const tx = 120 + i * 80;
      const ty = 214 + (i % 2) * 10;
      p.play('dive', 5, false);
      this.time.delayedCall(i * 170, () => {
        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 700,
          onUpdate: (tw) => {
            const k = tw.getValue() ?? 0;
            p.img.setPosition(x0 + (tx - x0) * k, y0 + (ty - y0) * k - Math.sin(k * Math.PI) * 90);
            p.img.setScale(2 - 0.7 * k);
            p.img.setDepth(k > 0.6 ? 180 : p.img.depth);
          },
          onComplete: () => {
            p.img.setVisible(false);
            const s = this.add.image(tx, ty + 6, 'splashFx').setOrigin(0.5, 1).setScale(2).setDepth(200);
            this.tweens.add({ targets: s, alpha: 0, delay: 500, duration: 600, onComplete: () => s.destroy() });
            sfx.splash();
          },
        });
      });
    });
  }

  update(_t: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.t += dt;
    for (const p of this.crowd) p.update(dt);
    this.champ.update(dt);
    if (this.stage === 'lift' && this.t > 3) {
      this.stage = 'jump';
      this.t = 0;
      this.comment.say('DON GANSO', T.boss.victory[1], 3000);
      this.jump();
    } else if (this.stage === 'jump' && this.t > 2.4) {
      this.stage = 'splash';
      this.t = 0;
      this.comment.say('DON GANSO', T.boss.victory[2], 4000);
      banner(this, '¡SPLASH!', UI.cyan, 120, 1800);
    } else if (this.stage === 'splash' && (this.t > 4 || keyboard.anyPressed(CONFIRM))) {
      this.stage = 'done';
      goTo(this, 'ending', { boss: this.boss }, 500);
    } else if (this.stage !== 'splash' && this.stage !== 'done' && this.t > 0.5 && keyboard.anyPressed(CONFIRM)) {
      this.stage = 'done';
      goTo(this, 'ending', { boss: this.boss }, 500);
    }
    keyboard.endFrame();
  }
}
