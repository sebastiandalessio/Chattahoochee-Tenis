// Duelo de Chicanas: el rival tira una chicana y vos elegís la réplica. Si acertás, arrancás con el
// primer paso de tu receta tildado y el rival "calentito"; si errás, el rival arranca con ventaja.
// Las réplicas correctas se aprenden (quedan guardadas y la próxima vez aparecen marcadas).

import Phaser from 'phaser';
import { flowMode } from '../game/autoplay';
import { makeRound, pickChicana, type DuelRound } from '../game/chicanas';
import type { DuelResult, TowerCtx } from '../game/flow';
import { learnChicana, save, updateSave } from '../game/save';
import type { MatchSetup } from '../game/setup';
import { keyboard } from '../input/keyboard';
import { sfx } from '../audio/sfx';
import { T, pick } from '../texts/es';
import { pxText, wrapText } from '../ui/pixelFont';
import { Bubble, Commentary, UI, drawBox, fullscreenButton } from '../ui/widgets';
import { CONFIRM, enter, goTo, portrait } from '../ui/screens';

const OPT_Y = 262;
const OPT_DY = 24;

export class DuelScene extends Phaser.Scene {
  private ctx!: TowerCtx;
  private round!: DuelRound;
  private sel = 0;
  private stage: 'intro' | 'choose' | 'reply' | 'react' | 'done' = 'intro';
  private t = 0;
  private opts: Phaser.GameObjects.BitmapText[] = [];
  private box!: Phaser.GameObjects.Graphics;
  private cursor!: Phaser.GameObjects.BitmapText;
  private rivalImg!: Phaser.GameObjects.Image;
  private rivalBubble!: Bubble;
  private meBubble!: Bubble;
  private comment!: Commentary;
  private result: DuelResult = null;

  constructor() {
    super('duel');
  }

  init(data: { ctx: TowerCtx }): void {
    this.ctx = data.ctx;
    this.sel = 0;
    this.stage = 'intro';
    this.t = 0;
    this.opts = [];
    this.result = null;
  }

  create(): void {
    enter(this);
    const run = this.ctx.run;
    const rival = run.fights[run.step].rival;
    const ch = pickChicana(rival, Math.random, this.ctx.used);
    this.ctx = { ...this.ctx, used: [...this.ctx.used, ch.id] };
    this.round = makeRound(ch, Math.random);

    const g = this.add.graphics();
    g.fillStyle(0x1a1626).fillRect(0, 0, 640, 360);
    // Telón de fondo con rayos, como pelea de dibujito.
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2;
      const a1 = a0 + Math.PI / 24;
      g.fillStyle(i % 2 ? 0x221d33 : 0x1a1626).fillTriangle(320, 130, 320 + Math.cos(a0) * 700, 130 + Math.sin(a0) * 700, 320 + Math.cos(a1) * 700, 130 + Math.sin(a1) * 700);
    }
    pxText(this, 320, 8, T.duel.title, { outline: true, color: UI.gold, scale: 2 }).setOrigin(0.5, 0);

    this.rivalImg = portrait(this, rival, 0, 'normal', 520, 128, 1.4, true);
    portrait(this, run.player, run.outfit, 'normal', 120, 170, 1.4);
    pxText(this, 520, 200, T.characters[rival].name, { outline: true, color: UI.red }).setOrigin(0.5, 0);
    pxText(this, 120, 242, T.characters[run.player].name, { outline: true, color: UI.cyan }).setOrigin(0.5, 0);

    this.box = this.add.graphics().setDepth(20);
    this.cursor = pxText(this, 0, 0, '▶', { outline: true, color: UI.gold }).setDepth(21).setVisible(false);
    this.rivalBubble = new Bubble(this);
    this.meBubble = new Bubble(this);
    this.comment = new Commentary(this, 342);
    fullscreenButton(this);

    // El rival tira la chicana.
    this.time.delayedCall(450, () => {
      this.rivalBubble.show(wrapText(this.round.chicana.line, 250), 470, 76, 600000);
      sfx.taunt(rival);
    });
  }

  private showOptions(): void {
    const learned = save().learned.includes(this.round.chicana.id);
    drawBox(this.box, 176, OPT_Y - 8, 448, OPT_DY * this.round.options.length + 12, 0x191826, UI.gold, 0.95);
    const prompt = pxText(this, 184, OPT_Y - 20, T.duel.prompt, { outline: true, color: UI.dim }).setDepth(21);
    this.opts = this.round.options.map((o, i) => {
      let text = wrapText(o, 410);
      if (learned && i === this.round.correct) text += `  ${T.duel.learned}`;
      return pxText(this, 200, OPT_Y + i * OPT_DY, text, { outline: true }).setDepth(21);
    });
    this.opts.push(prompt);
    this.cursor.setVisible(true);
    this.paint();
  }

  private paint(): void {
    const learned = save().learned.includes(this.round.chicana.id);
    this.opts.forEach((t, i) => t.setTint(i === this.sel ? UI.gold : learned && i === this.round.correct ? UI.green : UI.white));
    this.cursor.setPosition(186, OPT_Y + this.sel * OPT_DY);
  }

  private choose(i: number): void {
    this.stage = 'reply';
    this.t = 0;
    this.box.clear();
    for (const o of this.opts) o.destroy();
    this.opts = [];
    this.cursor.setVisible(false);
    this.rivalBubble.hide();
    this.meBubble.show(wrapText(this.round.options[i], 250), 170, 110, 600000);
    sfx.bip();
    this.result = i === this.round.correct ? 'won' : 'lost';
  }

  private react(): void {
    const run = this.ctx.run;
    const rival = run.fights[run.step].rival;
    const tincho = rival === 'trueTincho';
    this.stage = 'react';
    this.t = 0;
    this.meBubble.hide();
    const rivalName = T.characters[rival].name;
    if (this.result === 'won') {
      this.rivalImg.setFrame('lose');
      this.rivalBubble.show(tincho ? T.duel.tinchoHurt : pick(T.duel.rivalHurt), 470, 76, 600000);
      this.comment.say('DON GANSO', pick(T.duel.gansoWin), 60000);
      sfx.clinc();
      const wasLearned = save().learned.includes(this.round.chicana.id);
      updateSave((d) => learnChicana(d, this.round.chicana.id));
      const lines = [T.duel.win(rivalName)];
      if (!wasLearned) lines.push(T.duel.learnedNow);
      pxText(this, 400, 250, wrapText(lines.join('\n'), 400), { outline: true, color: UI.green, align: 1 }).setOrigin(0.5, 0);
    } else {
      this.rivalImg.setFrame('win');
      this.rivalBubble.show(tincho ? T.duel.tinchoLaugh : pick(T.duel.rivalLaugh), 470, 76, 600000);
      this.comment.say('DON GANSO', pick(T.duel.gansoLose), 60000);
      sfx.laugh();
      pxText(this, 400, 250, wrapText(T.duel.lose(rivalName), 400), { outline: true, color: UI.red, align: 1 }).setOrigin(0.5, 0);
    }
    pxText(this, 400, 300, 'ENTER', { outline: true, color: UI.dim }).setOrigin(0.5, 0);
  }

  private startMatch(): void {
    const run = this.ctx.run;
    const fight = run.fights[run.step];
    const o = save().options;
    const setup: Partial<MatchSetup> = {
      ...flowMode(), games: o.games,
      difficulty: o.difficulty,
      venue: fight.venue,
      chars: [run.player, fight.rival],
      outfits: [run.outfit, 0],
      tower: { ctx: this.ctx, duel: this.result },
    };
    goTo(this, 'match', setup);
  }

  update(_t: number, deltaMs: number): void {
    this.t += deltaMs / 1000;
    if (this.stage === 'intro' && this.t > 1.2) {
      this.stage = 'choose';
      this.showOptions();
    } else if (this.stage === 'choose') {
      const n = this.round.options.length;
      if (keyboard.anyPressed(['ArrowUp', 'KeyW'])) {
        this.sel = (this.sel + n - 1) % n;
        sfx.bip();
      }
      if (keyboard.anyPressed(['ArrowDown', 'KeyS'])) {
        this.sel = (this.sel + 1) % n;
        sfx.bip();
      }
      this.paint();
      if (keyboard.anyPressed(CONFIRM)) this.choose(this.sel);
    } else if (this.stage === 'reply' && this.t > 1.8) {
      this.react();
    } else if (this.stage === 'react' && this.t > 0.8 && keyboard.anyPressed(CONFIRM)) {
      this.stage = 'done';
      this.startMatch();
    }
    keyboard.endFrame();
  }
}
