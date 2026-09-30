// Duelo de Chicanas: el rival tira una chicana y vos elegís la réplica. Si acertás, arrancás con el
// primer paso de tu receta tildado y el rival "calentito"; si errás, el rival arranca con ventaja.
// Las réplicas correctas se aprenden (quedan guardadas y la próxima vez aparecen marcadas).
// Sirve para la torre y para el amistoso (en 2 jugadores, una ronda para cada uno).

import Phaser from 'phaser';
import { flowMode } from '../game/autoplay';
import { makeRound, pickChicana, type DuelRound } from '../game/chicanas';
import type { CharacterId } from '../game/characters';
import type { DuelResult, TowerCtx } from '../game/flow';
import { learnChicana, save, updateSave } from '../game/save';
import type { MatchSetup } from '../game/setup';
import { keyboard } from '../input/keyboard';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { T, pick } from '../texts/es';
import { pxText, wrapText } from '../ui/pixelFont';
import { Bubble, Commentary, UI, drawBox, fullscreenButton } from '../ui/widgets';
import { CONFIRM, enter, goTo, portrait } from '../ui/screens';

const OPT_Y = 262;
const OPT_DY = 24;

export interface FriendlyDuel {
  setup: Partial<MatchSetup>;
  /** Ronda 0: contesta el de abajo (J1); ronda 1 (solo en 2P): contesta el de arriba (J2). */
  round: 0 | 1;
  results: [DuelResult, DuelResult];
}

export interface DuelData {
  ctx?: TowerCtx;
  friendly?: FriendlyDuel;
}

export class DuelScene extends Phaser.Scene {
  private data0: DuelData = {};
  private ctx: TowerCtx | null = null;
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
  /** Quién tira la chicana y quién contesta (con qué traje). */
  private attacker!: { id: CharacterId; outfit: number };
  private answerer!: { id: CharacterId; outfit: number };
  private keys = { up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], ok: CONFIRM };

  constructor() {
    super('duel');
  }

  init(data: DuelData): void {
    this.data0 = data;
    this.ctx = data.ctx ?? null;
    this.sel = 0;
    this.stage = 'intro';
    this.t = 0;
    this.opts = [];
    this.result = null;
    this.keys = { up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], ok: CONFIRM };
    if (this.ctx) {
      const run = this.ctx.run;
      this.attacker = { id: run.fights[run.step].rival, outfit: 0 };
      this.answerer = { id: run.player, outfit: run.outfit };
    } else {
      const f = data.friendly!;
      const chars = f.setup.chars as [CharacterId, CharacterId];
      const outfits: [number, number] = [0, chars[0] === chars[1] ? 1 : 0];
      const me = f.round;
      const them = me === 0 ? 1 : 0;
      this.attacker = { id: chars[them], outfit: outfits[them] };
      this.answerer = { id: chars[me], outfit: outfits[me] };
      // En 2 jugadores cada uno contesta con sus teclas.
      if (f.setup.mode === '2p') {
        this.keys =
          me === 0
            ? { up: ['KeyW'], down: ['KeyS'], ok: ['KeyF', 'Space'] }
            : { up: ['ArrowUp'], down: ['ArrowDown'], ok: ['KeyK', 'Enter'] };
      }
    }
  }

  create(): void {
    enter(this);
    if (this.data0.friendly?.setup.mode === '2p') keyboard.setPadMode('2p');
    music.play('tower');
    const used = this.ctx?.used ?? [];
    const ch = pickChicana(this.attacker.id, Math.random, used);
    if (this.ctx) this.ctx = { ...this.ctx, used: [...this.ctx.used, ch.id] };
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
    const f = this.data0.friendly;
    if (f?.setup.mode === '2p') {
      const who = f.round === 0 ? 'J1' : 'J2';
      pxText(this, 320, 30, `Contesta ${who}`, { outline: true, color: f.round === 0 ? UI.cyan : UI.red }).setOrigin(0.5, 0);
    }

    this.rivalImg = portrait(this, this.attacker.id, this.attacker.outfit, 'normal', 520, 128, 1.4, true);
    portrait(this, this.answerer.id, this.answerer.outfit, 'normal', 120, 170, 1.4);
    pxText(this, 520, 200, T.characters[this.attacker.id].name, { outline: true, color: UI.red }).setOrigin(0.5, 0);
    pxText(this, 120, 242, T.characters[this.answerer.id].name, { outline: true, color: UI.cyan }).setOrigin(0.5, 0);

    this.box = this.add.graphics().setDepth(20);
    this.cursor = pxText(this, 0, 0, '▶', { outline: true, color: UI.gold }).setDepth(21).setVisible(false);
    this.rivalBubble = new Bubble(this);
    this.meBubble = new Bubble(this);
    this.comment = new Commentary(this, 342);
    fullscreenButton(this);

    // El rival tira la chicana.
    this.time.delayedCall(450, () => {
      this.rivalBubble.show(wrapText(this.round.chicana.line, 250), 470, 76, 600000);
      sfx.voice(this.attacker.id, this.round.chicana.line);
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
    this.opts.forEach((t, i) => {
      if (i >= this.round.options.length) return;
      t.setTint(i === this.sel ? UI.gold : learned && i === this.round.correct ? UI.green : UI.white);
    });
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
    sfx.voice(this.answerer.id, this.round.options[i]);
    this.result = i === this.round.correct ? 'won' : 'lost';
  }

  private react(): void {
    const tincho = this.attacker.id === 'trueTincho';
    this.stage = 'react';
    this.t = 0;
    this.meBubble.hide();
    const rivalName = T.characters[this.attacker.id].name;
    if (this.result === 'won') {
      this.rivalImg.setFrame('lose');
      const line = tincho ? T.duel.tinchoHurt : pick(T.duel.rivalHurt);
      this.rivalBubble.show(line, 470, 76, 600000);
      sfx.voice(this.attacker.id, line);
      this.comment.say('DON GANSO', pick(T.duel.gansoWin), 60000);
      sfx.clinc();
      const wasLearned = save().learned.includes(this.round.chicana.id);
      updateSave((d) => learnChicana(d, this.round.chicana.id));
      const lines = [T.duel.win(rivalName)];
      if (!wasLearned) lines.push(T.duel.learnedNow);
      pxText(this, 400, 250, wrapText(lines.join('\n'), 400), { outline: true, color: UI.green, align: 1 }).setOrigin(0.5, 0);
    } else {
      this.rivalImg.setFrame('win');
      const line = tincho ? T.duel.tinchoLaugh : pick(T.duel.rivalLaugh);
      this.rivalBubble.show(line, 470, 76, 600000);
      sfx.voice(this.attacker.id, line);
      this.comment.say('DON GANSO', pick(T.duel.gansoLose), 60000);
      sfx.laugh();
      pxText(this, 400, 250, wrapText(T.duel.lose(rivalName), 400), { outline: true, color: UI.red, align: 1 }).setOrigin(0.5, 0);
    }
    pxText(this, 400, 300, 'ENTER', { outline: true, color: UI.dim }).setOrigin(0.5, 0);
  }

  private next(): void {
    const o = save().options;
    if (this.ctx) {
      const run = this.ctx.run;
      const fight = run.fights[run.step];
      const setup: Partial<MatchSetup> = {
        ...flowMode(),
        games: o.games,
        difficulty: o.difficulty,
        venue: fight.venue,
        chars: [run.player, fight.rival],
        outfits: [run.outfit, 0],
        tower: { ctx: this.ctx },
        duels: [this.result, null],
      };
      goTo(this, 'match', setup);
      return;
    }
    const f = this.data0.friendly!;
    const results: [DuelResult, DuelResult] = [...f.results];
    results[f.round] = this.result;
    if (f.round === 0 && f.setup.mode === '2p') goTo(this, 'duel', { friendly: { ...f, round: 1, results } });
    else goTo(this, 'match', { ...f.setup, duels: results });
  }

  update(_t: number, deltaMs: number): void {
    this.t += deltaMs / 1000;
    if (this.stage === 'intro' && this.t > 1.2) {
      this.stage = 'choose';
      this.showOptions();
    } else if (this.stage === 'choose') {
      const n = this.round.options.length;
      if (keyboard.anyPressed(this.keys.up)) {
        this.sel = (this.sel + n - 1) % n;
        sfx.bip();
      }
      if (keyboard.anyPressed(this.keys.down)) {
        this.sel = (this.sel + 1) % n;
        sfx.bip();
      }
      this.paint();
      if (keyboard.anyPressed(this.keys.ok)) this.choose(this.sel);
    } else if (this.stage === 'reply' && this.t > 1.8) {
      this.react();
    } else if (this.stage === 'react' && this.t > 0.8 && keyboard.anyPressed([...this.keys.ok, ...CONFIRM])) {
      this.stage = 'done';
      this.next();
    }
    keyboard.endFrame();
  }
}
