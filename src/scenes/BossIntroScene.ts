// Llegada del Boss "EL GRAN CHATTAHOOCHEE": un kayak larguísimo baja por el río con los otros cinco,
// que se bajan uno por uno con su frase. Don Ganso explica las reglas del relevo.

import Phaser from 'phaser';
import { flowMode } from '../game/autoplay';
import { drawLongKayak } from '../art/cutsceneArt';
import { drawGanso, drawUmpireChair, type GansoFrame } from '../art/ganso';
import type { BossCtx } from '../game/flow';
import { save } from '../game/save';
import type { MatchSetup } from '../game/setup';
import { keyboard } from '../input/keyboard';
import { sfx } from '../audio/sfx';
import { T } from '../texts/es';
import { pxText, wrapText } from '../ui/pixelFont';
import { Bubble, Commentary, UI, banner, drawBox, fullscreenButton } from '../ui/widgets';
import { BACK, CONFIRM, Puppet, artTexture, enter, goTo } from '../ui/screens';
import { riverScene } from './cinema';

const HORIZON = 150;
const SHORE = 262;

export class BossIntroScene extends Phaser.Scene {
  private boss!: BossCtx;
  private puppets: Puppet[] = [];
  private me!: Puppet;
  private kayak!: Phaser.GameObjects.Image;
  private goose!: Phaser.GameObjects.Image;
  private bubbles: Bubble[] = [];
  private comment!: Commentary;
  private t = 0;
  private stage: 'arrive' | 'land' | 'announce' | 'ready' | 'done' = 'arrive';
  private landed = 0;

  constructor() {
    super('bossIntro');
  }

  init(data: { boss: BossCtx }): void {
    this.boss = data.boss;
    this.puppets = [];
    this.bubbles = [];
    this.t = 0;
    this.stage = 'arrive';
    this.landed = 0;
  }

  create(): void {
    enter(this, 500);
    riverScene(this, () => {}, 640, 360, HORIZON, SHORE);
    pxText(this, 320, 8, T.boss.title, { outline: true, color: UI.red, scale: 3 }).setOrigin(0.5, 0).setDepth(100);

    // Don Ganso en su silla, a la derecha.
    for (const f of ['idle', 'blink', 'honk', 'sleep', 'look'] as GansoFrame[]) artTexture(this, `ganso_${f}`, () => drawGanso(f));
    artTexture(this, 'umpireChair', drawUmpireChair);
    this.add.image(590, 340, 'umpireChair').setOrigin(0.5, 1).setScale(2).setDepth(340);
    this.goose = this.add.image(592, 290, 'ganso_look').setOrigin(0.5, 1).setScale(2).setDepth(341);

    // El jugador espera en la orilla, de espaldas.
    const run = this.boss.run;
    this.me = new Puppet(this, run.player, run.outfit, 90, 350, 2, 'back');
    this.me.img.setDepth(350);

    // El kayak con los cinco.
    const key = artTexture(this, 'longKayak', drawLongKayak);
    this.kayak = this.add.image(-200, 238, key).setOrigin(0.5, 0.5).setScale(2).setDepth(240);
    this.boss.relay.queue.forEach((id) => {
      const p = new Puppet(this, id, 0, 0, 0, 1.6, 'front').play('idle', 3);
      p.img.setDepth(239);
      this.puppets.push(p);
    });
    this.placeRowers();
    this.comment = new Commentary(this, 342);
    this.comment.say('DON GANSO', T.boss.arrive, 3000);
    fullscreenButton(this);
    sfx.whoosh();
  }

  /** Los cinco sentados en el kayak (solo se les ve de la cintura para arriba). */
  private placeRowers(): void {
    this.puppets.forEach((p, i) => {
      if (i < this.landed) return;
      p.img.setPosition(this.kayak.x - 150 + 46 + i * 52, this.kayak.y + 10 + Math.sin(this.t * 3 + i) * 1);
    });
  }

  /** Se baja el siguiente: salto en arco hasta la orilla y dice su frase. */
  private landNext(): void {
    const i = this.landed;
    const p = this.puppets[i];
    const id = this.boss.relay.queue[i];
    const tx = 190 + i * 76;
    const ty = 336;
    const x0 = p.img.x;
    const y0 = p.img.y;
    this.landed++;
    p.img.setDepth(ty);
    p.play('dive', 6, false);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 520,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        p.img.setPosition(x0 + (tx - x0) * k, y0 + (ty - y0) * k - Math.sin(k * Math.PI) * 50);
        p.img.setScale(1.6 + 0.4 * k);
      },
      onComplete: () => {
        p.play('taunt', 5);
        sfx.bounce();
        sfx.taunt(id);
        for (const old of this.bubbles) old.hide();
        const b = new Bubble(this);
        b.show(wrapText(T.boss.intro[id], 150), tx, ty - 120, 2600);
        this.bubbles.push(b);
      },
    });
  }

  private startMatch(): void {
    if (this.stage === 'done') return;
    this.stage = 'done';
    const o = save().options;
    const setup: Partial<MatchSetup> = { ...flowMode(), games: o.games, difficulty: o.difficulty, venue: 'chattahoochee', boss: { ...this.boss, fresh: false } };
    goTo(this, 'match', setup, 400);
  }

  update(_t: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.t += dt;
    for (const p of this.puppets) p.update(dt);
    this.me.update(dt);

    if (this.stage === 'arrive') {
      this.kayak.x = Math.min(330, this.kayak.x + dt * 150);
      this.kayak.y = 238 + Math.sin(this.t * 2) * 1.5;
      this.placeRowers();
      if (this.kayak.x >= 330) {
        this.stage = 'land';
        this.t = 0;
      }
    } else if (this.stage === 'land' || this.stage === 'announce' || this.stage === 'ready') {
      // Vacío, el kayak sigue río abajo.
      if (this.landed === this.puppets.length) this.kayak.x += dt * 40;
      this.placeRowers();
    }
    if (this.stage === 'land') {
      if (this.landed < this.puppets.length && this.t > 0.2 + this.landed * 1.5) this.landNext();
      if (this.landed === this.puppets.length && this.t > 0.2 + this.landed * 1.5 + 1.2) {
        this.stage = 'announce';
        this.t = 0;
        for (const old of this.bubbles) old.hide();
        this.goose.setTexture('ganso_honk');
        sfx.call();
        const b = new Bubble(this);
        b.show(wrapText(T.boss.announce, 220), 590, 250, 600000);
        this.bubbles.push(b);
        this.time.delayedCall(500, () => this.goose.setTexture('ganso_idle'));
      }
    } else if (this.stage === 'announce' && this.t > 3.2) {
      this.stage = 'ready';
      const g = this.add.graphics().setDepth(400);
      drawBox(g, 60, 70, 420, 58, 0x191826, UI.gold, 0.92);
      pxText(this, 70, 78, wrapText(T.boss.rules, 400), { outline: true, color: UI.white }).setDepth(401);
      pxText(this, 270, 132, 'ENTER', { outline: true, color: UI.gold }).setOrigin(0.5, 0).setDepth(401);
      banner(this, T.boss.title, UI.red, 170, 1500);
    }

    if (this.stage === 'ready' && keyboard.anyPressed(CONFIRM)) this.startMatch();
    else if (this.stage !== 'ready' && this.stage !== 'done' && this.t > 0.3 && keyboard.anyPressed([...CONFIRM, ...BACK])) this.startMatch();
    keyboard.endFrame();
  }
}
