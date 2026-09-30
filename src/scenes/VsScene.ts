// Pantalla VS: los dos retratos enfrentados, la sede y, si corresponde, el cartel de "¡CLÁSICO!".
// Abajo, un "consejo" de pantalla de carga (falso, como la pantalla de carga).

import Phaser from 'phaser';
import { music } from '../audio/music';
import { clasicoOf } from '../game/characters';
import type { TowerCtx } from '../game/flow';
import { keyboard } from '../input/keyboard';
import { sfx } from '../audio/sfx';
import { T, pick } from '../texts/es';
import { pxText, wrapText } from '../ui/pixelFont';
import { UI, banner, drawBox, fullscreenButton } from '../ui/widgets';
import { CONFIRM, enter, goTo, portrait } from '../ui/screens';

const CLUB_COLORS: Record<string, [number, number]> = {
  avellaneda: [0xc7373b, 0x6fb7e8],
  superclasico: [0x1f3f9a, 0xd23c3c],
};

export class VsScene extends Phaser.Scene {
  private ctx!: TowerCtx;
  private t = 0;

  constructor() {
    super('vs');
  }

  init(data: { ctx: TowerCtx }): void {
    this.ctx = data.ctx;
    this.t = 0;
  }

  create(): void {
    enter(this);
    const run = this.ctx.run;
    const fight = run.fights[run.step];
    const clasico = clasicoOf(run.player, fight.rival);
    music.play(clasico ? 'clasico' : 'tower');
    const g = this.add.graphics();
    // Fondo partido en diagonal con los colores de cada lado (o de los clubes en un clásico).
    const [ca, cb] = clasico ? CLUB_COLORS[clasico] : [0x1c2a4a, 0x4a1c2a];
    g.fillStyle(ca).fillRect(0, 0, 640, 360);
    g.fillStyle(cb).fillPoints(
      [
        { x: 380, y: 0 },
        { x: 640, y: 0 },
        { x: 640, y: 360 },
        { x: 260, y: 360 },
      ],
      true,
    );
    for (let y = 0; y < 360; y += 4) g.fillStyle(0x000000, 0.18).fillRect(0, y, 640, 1);

    const left = portrait(this, run.player, run.outfit, 'win', -120, 150, 2);
    const right = portrait(this, fight.rival, 0, 'normal', 760, 150, 2, true);
    this.tweens.add({ targets: left, x: 150, duration: 380, ease: 'Cubic.Out' });
    this.tweens.add({ targets: right, x: 490, duration: 380, ease: 'Cubic.Out' });
    pxText(this, 150, 254, T.characters[run.player].name, { outline: true, color: UI.cyan, scale: 2 }).setOrigin(0.5, 0);
    pxText(this, 490, 254, T.characters[fight.rival].name, { outline: true, color: UI.red, scale: 2 }).setOrigin(0.5, 0);
    const vs = pxText(this, 320, 140, T.vs.vs, { outline: true, color: UI.gold, scale: 5 }).setOrigin(0.5).setScale(0.2);
    this.tweens.add({ targets: vs, scale: 5, duration: 300, delay: 350, ease: 'Back.Out', onStart: () => sfx.smash() });
    pxText(this, 320, 282, `${T.tower.at} ${T.venues.names[fight.venue]}`, { outline: true, color: UI.white }).setOrigin(0.5, 0);

    if (clasico) {
      this.time.delayedCall(700, () => {
        banner(this, T.vs.clasico[clasico], UI.gold, 60, 2400);
        sfx.whistle();
      });
      const say = pick(T.vs.clasicoSay[clasico]);
      this.time.delayedCall(900, () => {
        drawBox(g, 40, 300, 560, 20, 0x101018, 0x101018, 0.75);
        const line = pxText(this, 320, 305, say, { outline: true, color: UI.gold }).setOrigin(0.5, 0);
        // Angelito, el neutral, opina desde la tribuna.
        this.time.delayedCall(2300, () => line.setText(T.vs.mediador).setTint(UI.white));
      });
    }
    const tip = wrapText(pick(T.vs.tips), 560);
    g.fillStyle(0x0d0b14, 0.8).fillRect(0, 326, 640, 34);
    pxText(this, 320, 332, tip, { color: UI.white, align: 1 }).setOrigin(0.5, 0);
    fullscreenButton(this);
  }

  update(_t: number, deltaMs: number): void {
    this.t += deltaMs / 1000;
    const run = this.ctx.run;
    const wait = clasicoOf(run.player, run.fights[run.step].rival) ? 5.6 : 4.2;
    if ((this.t > 0.6 && keyboard.anyPressed(CONFIRM)) || this.t > wait) goTo(this, 'duel', { ctx: this.ctx });
    keyboard.endFrame();
  }
}
