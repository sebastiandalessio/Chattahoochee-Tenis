// Créditos: "Un juego de los Chattahoochees", con los cargos de cada uno, y de remate el casamiento
// de Betty (la lanzapelotas) y Mabel (la freidora), con Don Ganso de oficiante a orillas del río.

import Phaser from 'phaser';
import { drawGanso, drawUmpireChair, type GansoFrame } from '../art/ganso';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { CHARACTER_ORDER } from '../game/characters';
import { ensureMystiqueTextures } from '../game/mystiqueFx';
import { keyboard } from '../input/keyboard';
import { T } from '../texts/es';
import { pxText, wrapText } from '../ui/pixelFont';
import { UI, banner, drawBox, fullscreenButton } from '../ui/widgets';
import { BACK, CONFIRM, Puppet, artTexture, enter, goTo } from '../ui/screens';
import { riverScene } from './cinema';

const HORIZON = 140;
const SHORE = 236;

export class CreditsScene extends Phaser.Scene {
  private stage: 'roll' | 'wedding' | 'end' = 'roll';
  private roll!: Phaser.GameObjects.Container;
  private rollH = 0;
  private t = 0;
  private line = -1;
  private speaker!: Phaser.GameObjects.BitmapText;
  private said!: Phaser.GameObjects.BitmapText;
  private wedding: Phaser.GameObjects.GameObject[] = [];
  private puppets: Puppet[] = [];
  private goose!: Phaser.GameObjects.Image;
  private betty!: Phaser.GameObjects.Image;
  private mabel!: Phaser.GameObjects.Image;

  constructor() {
    super('credits');
  }

  init(): void {
    this.stage = 'roll';
    this.t = 0;
    this.line = -1;
    this.wedding = [];
    this.puppets = [];
  }

  create(): void {
    enter(this, 500);
    music.play('title');
    riverScene(this, () => {}, 640, 360, HORIZON, SHORE);
    const shade = this.add.graphics();
    shade.fillStyle(0x000000, 0.55).fillRect(0, 0, 640, 360);
    this.roll = this.add.container(0, 360);
    let y = 0;
    this.roll.add(pxText(this, 320, y, T.credits.title, { outline: true, color: UI.gold, scale: 3 }).setOrigin(0.5, 0));
    y += 60;
    for (const [role, who] of T.credits.lines) {
      if (!role && !who) {
        y += 20;
        continue;
      }
      if (!who) {
        this.roll.add(pxText(this, 320, y, role, { outline: true, color: UI.cyan, scale: 2 }).setOrigin(0.5, 0));
        y += 34;
        continue;
      }
      this.roll.add(pxText(this, 310, y, role, { outline: true, color: UI.dim }).setOrigin(1, 0));
      this.roll.add(pxText(this, 330, y, who, { outline: true, color: UI.white }));
      y += 22;
    }
    this.rollH = y;
    pxText(this, 320, 346, T.credits.help, { outline: true, color: UI.dim }).setOrigin(0.5, 0).setDepth(100);
    fullscreenButton(this);
    this.events.once('shutdown', () => this.tweens.killAll());
    shade.setName('shade');
  }

  private startWedding(): void {
    this.stage = 'wedding';
    this.roll.destroy();
    this.children.getByName('shade')?.destroy();
    music.play('wedding');
    this.t = 0;
    const add = <O extends Phaser.GameObjects.GameObject>(o: O): O => {
      this.wedding.push(o);
      return o;
    };
    add(pxText(this, 320, 12, T.credits.wedding.title, { outline: true, color: UI.gold, scale: 2 }).setOrigin(0.5, 0));
    // Arco de flores en la orilla.
    const g = add(this.add.graphics());
    g.fillStyle(0xf2f0e8).fillRect(236, 150, 6, 100).fillRect(398, 150, 6, 100);
    for (let a = 0; a <= Math.PI; a += 0.08) {
      const x = 320 + Math.cos(a) * 82;
      const y = 150 - Math.sin(a) * 60;
      g.fillStyle([0xff8fb0, 0xffffff, 0xffd23f][Math.floor(a * 10) % 3]).fillCircle(x, y, 5);
    }
    for (let y = 150; y < 250; y += 12) {
      g.fillStyle(0xff8fb0).fillCircle(239, y, 4).fillCircle(401, y, 4);
    }
    // Don Ganso de oficiante, en su silla de umpire.
    for (const f of ['idle', 'blink', 'honk', 'sleep', 'look'] as GansoFrame[]) artTexture(this, `ganso_${f}`, () => drawGanso(f));
    artTexture(this, 'umpireChair', drawUmpireChair);
    add(this.add.image(320, 250, 'umpireChair').setOrigin(0.5, 1).setScale(2));
    this.goose = add(this.add.image(322, 200, 'ganso_idle').setOrigin(0.5, 1).setScale(2));
    // Los novios.
    ensureMystiqueTextures(this);
    this.betty = add(this.add.image(274, 300, 'betty').setOrigin(0.5, 1).setScale(3));
    this.mabel = add(this.add.image(368, 300, 'mabel').setOrigin(0.5, 1).setScale(3));
    // Los invitados: los seis, tres de cada lado.
    CHARACTER_ORDER.forEach((id, i) => {
      const left = i < 3;
      const x = left ? 40 + i * 58 : 470 + (i - 3) * 58;
      const p = new Puppet(this, id, 0, x, 328, 1.7).play('idle', 3);
      this.puppets.push(p);
      add(p.img);
    });
    const box = add(this.add.graphics().setDepth(50));
    drawBox(box, 20, 300, 600, 42, 0x101018, UI.gold, 0.9);
    this.speaker = add(pxText(this, 30, 305, '', { outline: true, color: UI.gold }).setDepth(51));
    this.said = add(pxText(this, 30, 318, '', { color: UI.white }).setDepth(51));
    this.nextLine();
  }

  private nextLine(): void {
    const lines = T.credits.wedding.lines;
    this.line++;
    this.t = 0;
    if (this.line >= lines.length) {
      this.finale();
      return;
    }
    const [who, text] = lines[this.line];
    this.speaker.setText(who);
    this.said.setText(wrapText(text, 580));
    const voice = who === 'BETTY' ? 'betty' : who === 'MABEL' ? 'mabel' : 'donGanso';
    sfx.voice(voice, text);
    if (who === 'DON GANSO') {
      this.goose.setTexture('ganso_honk');
      this.time.delayedCall(300, () => this.goose.setTexture('ganso_idle'));
    }
    const target = who === 'BETTY' ? this.betty : who === 'MABEL' ? this.mabel : null;
    if (target) this.tweens.add({ targets: target, y: target.y - 8, duration: 120, yoyo: true, repeat: 1 });
    if (who === 'MABEL') sfx.ding();
  }

  private finale(): void {
    this.stage = 'end';
    this.t = 0;
    for (const p of this.puppets) p.play('taunt', 6);
    // Betty y Mabel se acercan.
    this.tweens.add({ targets: this.betty, x: 300, duration: 800 });
    this.tweens.add({ targets: this.mabel, x: 342, duration: 800 });
    // Fuegos artificiales de pelotas de tenis y papelitos.
    this.time.addEvent({
      delay: 90,
      repeat: 70,
      callback: () => {
        const x = 60 + Math.random() * 520;
        const b = this.add.image(x, 300, Math.random() < 0.5 ? 'ballNear' : 'px').setScale(2).setTint(Math.random() < 0.5 ? 0xffffff : [0xffd23f, 0xff8fb0, 0x6fe3ff][Math.floor(Math.random() * 3)]);
        this.tweens.add({ targets: b, y: 40 + Math.random() * 100, alpha: 0, duration: 1200, ease: 'Cubic.Out', onComplete: () => b.destroy() });
        if (Math.random() < 0.15) sfx.betty();
      },
    });
    // Un corazón entre los dos.
    const heart = this.add.graphics().setDepth(60);
    heart.fillStyle(0xff5a7a).fillCircle(-4, 0, 5).fillCircle(4, 0, 5).fillTriangle(-9, 2, 9, 2, 0, 12);
    heart.setPosition(321, 226).setScale(0);
    this.tweens.add({ targets: heart, scale: 1.4, duration: 500, ease: 'Back.Out', yoyo: true, repeat: -1, repeatDelay: 300 });
    banner(this, T.credits.end, UI.gold, 90, 4000);
    this.speaker.setText('');
    this.said.setText(T.credits.thanks);
  }

  update(_t: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.t += dt;
    for (const p of this.puppets) p.update(dt);
    if (this.stage === 'roll') {
      const fast = keyboard.anyDown(['Enter', 'Space', 'KeyZ']) ? 5 : 1;
      this.roll.y -= dt * 34 * fast;
      if (this.roll.y < -this.rollH + 60) this.startWedding();
    } else if (this.stage === 'wedding') {
      if ((this.t > 0.4 && keyboard.anyPressed(CONFIRM)) || this.t > 4.5) this.nextLine();
    } else if (this.t > 1.5 && keyboard.anyPressed(CONFIRM)) goTo(this, 'menu', { sel: 5 });
    if (keyboard.anyPressed(BACK)) goTo(this, 'menu', { sel: 5 });
    keyboard.endFrame();
  }
}
