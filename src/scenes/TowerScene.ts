// La torre: columna de retratos estilo Mortal Kombat, con el Boss arriba (la silueta de los cinco
// con signos de pregunta). Después de cada victoria, el retrato del jugador sube un escalón.

import Phaser from 'phaser';
import { music } from '../audio/music';
import { BOSS_STEP, bossRivals, isBossStep } from '../game/tower';
import { newRelay } from '../game/bossRelay';
import type { BossCtx, TowerCtx } from '../game/flow';
import { keyboard } from '../input/keyboard';
import { sfx } from '../audio/sfx';
import { T, pick } from '../texts/es';
import { pxText } from '../ui/pixelFont';
import { UI, drawBox, fullscreenButton } from '../ui/widgets';
import { ensureMystiqueTextures } from '../game/mystiqueFx';
import { wrapText } from '../ui/pixelFont';
import { BACK, CONFIRM, enter, goTo, portrait, skyBands } from '../ui/screens';

const COL_X = 170;
const SLOT_Y0 = 306;
const SLOT_DY = 52;

export interface TowerData {
  ctx: TowerCtx;
  /** Viene de ganar: animar la subida. */
  climbed?: boolean;
}

export class TowerScene extends Phaser.Scene {
  private ctx!: TowerCtx;
  private climbed = false;
  private marker!: Phaser.GameObjects.Container;
  private ready = false;
  private confirmQuit = false;
  private quitText: Phaser.GameObjects.BitmapText | null = null;

  constructor() {
    super('tower');
  }

  init(data: TowerData): void {
    this.ctx = data.ctx;
    this.climbed = !!data.climbed;
    this.ready = false;
    this.confirmQuit = false;
    this.quitText = null;
  }

  create(): void {
    enter(this);
    music.play('tower');
    const run = this.ctx.run;
    const g = this.add.graphics();
    skyBands(g, [0x1a1030, 0x2a1840, 0x40204a, 0x5c2a48, 0x7a3a40], 0, 360);
    // La torre: bloques de piedra.
    g.fillStyle(0x2a2838).fillRect(COL_X - 44, 14, 88, 346);
    for (let y = 14; y < 360; y += 10)
      for (let x = COL_X - 44 + ((y / 10) % 2 ? 11 : 0); x < COL_X + 44; x += 22) g.fillStyle(0x34324a).fillRect(x, y, 20, 8);

    pxText(this, 420, 14, T.tower.title, { outline: true, color: UI.gold, scale: 2 }).setOrigin(0.5, 0);

    // Escalones.
    for (let i = 0; i <= BOSS_STEP; i++) {
      const y = SLOT_Y0 - i * SLOT_DY;
      drawBox(g, COL_X - 26, y - 24, 52, 48, i === run.step ? 0x3a2f18 : 0x15141f, i === run.step ? UI.gold : 0x4a4860);
      if (i < BOSS_STEP) {
        const f = run.fights[i];
        const done = i < run.step;
        const img = portrait(this, f.rival, 0, done ? 'lose' : 'normal', COL_X, y, 0.46);
        if (done) {
          img.setTint(0x777788);
          pxText(this, COL_X + 30, y - 6, `✓ ${run.scores[i] ?? ''}`, { outline: true, color: UI.green });
        } else {
          pxText(this, COL_X + 32, y - 6, T.venues.names[f.venue], { color: UI.dim });
        }
      } else {
        // El Boss: los cinco en silueta, con signos de pregunta.
        const rivals = bossRivals(run);
        rivals.forEach((c, k) => {
          portrait(this, c, 0, 'normal', COL_X - 16 + k * 8, y + 2, 0.3).setTint(0x000000);
        });
        pxText(this, COL_X, y - 10, '???', { outline: true, color: UI.red, scale: 2 }).setOrigin(0.5, 0);
        pxText(this, COL_X + 32, y - 6, T.tower.boss, { outline: true, color: UI.red });
      }
    }

    // Marcador del jugador (su retrato chiquito al costado del escalón).
    const from = this.climbed ? run.step - 1 : run.step;
    this.marker = this.add.container(COL_X - 62, SLOT_Y0 - from * SLOT_DY);
    const me = portrait(this, run.player, run.outfit, 'win', 0, 0, 0.4);
    const arrow = pxText(this, 22, -6, '▶', { outline: true, color: UI.gold });
    this.marker.add([me, arrow]);

    // Panel del próximo rival.
    drawBox(g, 300, 64, 318, 178, 0x1d1c2b, 0x3a3850);
    if (isBossStep(run)) {
      pxText(this, 459, 76, T.tower.next, { color: UI.dim }).setOrigin(0.5, 0);
      pxText(this, 459, 92, T.tower.boss, { outline: true, color: UI.red, scale: 2 }).setOrigin(0.5, 0);
      const rivals = bossRivals(run);
      rivals.forEach((c, k) => portrait(this, c, 0, 'normal', 459 - 100 + k * 50, 162, 0.62).setTint(0x101010));
      pxText(this, 459, 204, `${T.tower.at} ${T.venues.names.chattahoochee}`, { outline: true, color: UI.cyan }).setOrigin(0.5, 0);
    } else {
      const f = run.fights[run.step];
      pxText(this, 459, 76, T.tower.next, { color: UI.dim }).setOrigin(0.5, 0);
      pxText(this, 459, 92, T.characters[f.rival].name, { outline: true, color: UI.gold, scale: 2 }).setOrigin(0.5, 0);
      portrait(this, f.rival, 0, 'normal', 459, 152, 0.72);
      pxText(this, 459, 192, T.characters[f.rival].club, { color: UI.dim }).setOrigin(0.5, 0);
      pxText(this, 459, 206, `${T.tower.at} ${T.venues.names[f.venue]}`, { outline: true, color: UI.cyan }).setOrigin(0.5, 0);
    }
    pxText(this, 459, 224, `${Math.min(run.step, BOSS_STEP)}/${BOSS_STEP}`, { outline: true, color: UI.dim }).setOrigin(0.5, 0);

    // Betty y Mabel, en su rincón, se van conociendo.
    ensureMystiqueTextures(this);
    drawBox(g, 300, 246, 318, 40, 0x1d1c2b, 0x3a3850);
    const bet = this.add.image(318, 284, 'betty').setOrigin(0.5, 1);
    const mab = this.add.image(600, 284, 'mabel').setOrigin(0.5, 1);
    const lines = T.tower.romance[Math.min(run.step, T.tower.romance.length - 1)];
    const l1 = pxText(this, 459, 252, lines[0], { color: UI.white }).setOrigin(0.5, 0).setAlpha(0);
    const l2 = pxText(this, 459, 266, lines[1], { color: UI.gold }).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: l1, alpha: 1, delay: 900, duration: 200, onStart: () => this.tweens.add({ targets: bet, y: 280, duration: 90, yoyo: true }) });
    this.tweens.add({ targets: l2, alpha: 1, delay: 2300, duration: 200, onStart: () => this.tweens.add({ targets: mab, y: 280, duration: 90, yoyo: true }) });
    pxText(this, 459, 344, T.tower.help, { outline: true, color: UI.dim }).setOrigin(0.5, 0);

    // Don Ganso comenta abajo del panel.
    drawBox(g, 300, 290, 318, 46, 0x101018, 0x3a3850, 0.9);
    const commentText = pxText(this, 308, 296, '', { color: UI.white });
    const comment = { say: (_who: string, text: string) => commentText.setText(wrapText(`DON GANSO: ${text}`, 300)) };
    fullscreenButton(this);

    if (this.climbed) {
      this.time.delayedCall(350, () => {
        sfx.whoosh();
        this.tweens.add({
          targets: this.marker,
          y: SLOT_Y0 - run.step * SLOT_DY,
          duration: 700,
          ease: 'Back.Out',
          onComplete: () => {
            sfx.clinc();
            this.ready = true;
          },
        });
        comment.say('DON GANSO', pick(T.tower.climb));
      });
    } else {
      this.ready = true;
      comment.say('DON GANSO', pick(T.tower.start));
    }
  }

  update(): void {
    if (this.confirmQuit) {
      if (keyboard.anyPressed(CONFIRM)) goTo(this, 'menu');
      else if (keyboard.anyPressed(BACK)) {
        this.confirmQuit = false;
        this.quitText?.destroy();
        this.quitText = null;
      }
    } else if (this.ready && keyboard.anyPressed(CONFIRM)) {
      sfx.ready();
      const run = this.ctx.run;
      if (isBossStep(run)) {
        const rivals = bossRivals(run);
        // Orden de la fila del Boss: mezclado.
        for (let i = rivals.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rivals[i], rivals[j]] = [rivals[j], rivals[i]];
        }
        const boss: BossCtx = { run, used: this.ctx.used, relay: newRelay(rivals), recipe: [false, false, false], fresh: true };
        goTo(this, 'bossIntro', { boss });
      } else goTo(this, 'vs', { ctx: this.ctx });
    } else if (keyboard.anyPressed(BACK)) {
      this.confirmQuit = true;
      this.quitText = pxText(this, 320, 176, T.tower.abandonQ, { outline: true, color: UI.red, scale: 1 }).setOrigin(0.5).setDepth(50);
    }
    keyboard.endFrame();
  }
}
