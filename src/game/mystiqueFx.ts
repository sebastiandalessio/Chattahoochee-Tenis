// Todo lo que se ve de la mística: checklist de recetas en el HUD, globitos de los personajes,
// cut-in de los especiales, Betty, Mabel, la minicargadora, la obra, el sello EXENTO, etc.

import Phaser from 'phaser';
import { drawBetty, drawCone, drawFriedBall, drawLoader, drawMabel, drawPothole, drawSign } from '../art/objects';
import { sfx } from '../audio/sfx';
import { other, type Side } from '../logic/scoring';
import type { Match, MatchEvent } from '../sim/match';
import { RULES, STEP_TARGET } from '../sim/rules';
import { pick, T } from '../texts/es';
import { measure, pxText } from '../ui/pixelFont';
import { Bubble, UI, drawBox } from '../ui/widgets';
import type { CharacterId } from './characters';
import type { PlayerView } from './playerView';
import { project, scaleAt } from './projection';
import type { CharacterTextures } from './spriteTextures';
import { addCanvasTexture, imageToCanvas } from './textures';

const CLUB_COLORS: Record<CharacterId, [number, number]> = {
  elRosco: [0xd7262d, 0x2b2735],
  elSeba: [0x1f45a6, 0xf5c42c],
  trueTincho: [0x78c8f0, 0xf6f3ea],
  volpi: [0xf6f3ea, 0xd7262d],
  elVikingo: [0x6e6a7c, 0xa0592e],
  angelito: [0xf5c42c, 0x2b2735],
};

export interface FxOptions {
  chars: [CharacterId, CharacterId];
  views: PlayerView[];
  textures: [CharacterTextures, CharacterTextures];
  humans: [boolean, boolean];
  twoPlayers: boolean;
  say: (text: string, ms?: number) => void;
  call: (text: string, ms?: number) => void;
}

interface Puff {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

export function ensureMystiqueTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('betty')) return;
  addCanvasTexture(scene, 'betty', imageToCanvas(drawBetty()));
  addCanvasTexture(scene, 'mabel', imageToCanvas(drawMabel('normal')));
  addCanvasTexture(scene, 'mabelDing', imageToCanvas(drawMabel('ding')));
  addCanvasTexture(scene, 'mabelCelosa', imageToCanvas(drawMabel('celosa')));
  addCanvasTexture(scene, 'loader', imageToCanvas(drawLoader()));
  addCanvasTexture(scene, 'cone', imageToCanvas(drawCone()));
  addCanvasTexture(scene, 'pothole', imageToCanvas(drawPothole()));
  addCanvasTexture(scene, 'sign', imageToCanvas(drawSign()));
  addCanvasTexture(scene, 'friedBall', imageToCanvas(drawFriedBall()));
}

export class MystiqueFx {
  private scene: Phaser.Scene;
  private m: Match;
  private o: FxOptions;
  private hud: Phaser.GameObjects.Graphics;
  private chipText: Phaser.GameObjects.BitmapText[][] = [];
  private readyText: Phaser.GameObjects.BitmapText[] = [];
  private bubbles: [Bubble, Bubble];
  private betty: Phaser.GameObjects.Image;
  private mabel: Phaser.GameObjects.Image;
  private helperSide: Side | null = null;
  private helperKind: 'betty' | 'mabel' | null = null;
  private helperT = 0;
  private helperLeave = -1;
  private loaders: Phaser.GameObjects.Image[];
  private obraParts: Phaser.GameObjects.GameObject[] = [];
  private obraKey = '';
  private ghostImgs: Phaser.GameObjects.Image[] = [];
  private ghostShadows: Phaser.GameObjects.Image[] = [];
  private trailG: Phaser.GameObjects.Graphics;
  private trail: { x: number; y: number }[] = [];
  private replay: Phaser.GameObjects.BitmapText;
  private puffs: Puff[] = [];
  private puffT = 0;
  private toasts: (Phaser.GameObjects.BitmapText | null)[] = [null, null];
  private lastSpecial: { side: Side; id: string } | null = null;

  constructor(scene: Phaser.Scene, m: Match, o: FxOptions) {
    this.scene = scene;
    this.m = m;
    this.o = o;
    ensureMystiqueTextures(scene);
    this.hud = scene.add.graphics().setDepth(9000);
    // Fila 0 = jugador de arriba (1); fila 1 = de abajo (0), igual que el marcador.
    for (let row = 0; row < 2; row++) {
      const texts: Phaser.GameObjects.BitmapText[] = [];
      for (let i = 0; i < 3; i++) texts.push(pxText(scene, 0, 0, '', { color: UI.dim }).setDepth(9002));
      this.chipText.push(texts);
      this.readyText.push(pxText(scene, 202, 7 + row * 14, '', { outline: true, color: UI.gold }).setDepth(9002));
    }
    this.bubbles = [new Bubble(scene), new Bubble(scene)];
    this.betty = scene.add.image(0, 0, 'betty').setOrigin(0.5, 1).setVisible(false);
    this.mabel = scene.add.image(0, 0, 'mabel').setOrigin(0.5, 1).setVisible(false);
    this.loaders = [0, 1].map(() => scene.add.image(0, 0, 'loader').setOrigin(0.5, 0.92).setVisible(false));
    for (let i = 0; i < 2; i++) {
      this.ghostShadows.push(scene.add.image(0, 0, 'shadow').setAlpha(0.4).setVisible(false));
      this.ghostImgs.push(scene.add.image(0, 0, 'ballNear').setVisible(false));
    }
    this.trailG = scene.add.graphics();
    this.replay = pxText(scene, 320, 40, `● ${T.hud.replay}`, { outline: true, color: UI.red })
      .setOrigin(0.5, 0)
      .setDepth(9100)
      .setVisible(false);
  }

  // ---------------------------------------------------------------- eventos

  /** Devuelve cuántos segundos hay que congelar el partido (para el cut-in). */
  onEvent(e: MatchEvent): number {
    const m = this.m;
    switch (e.type) {
      case 'recipe': {
        const id = RULES[this.o.chars[e.side]].recipe[e.step];
        sfx.clinc();
        this.toast(e.side, `✓ ${T.steps[id]}`, UI.gold);
        if (e.ready) sfx.ready();
        return 0;
      }
      case 'recipeCount':
        if (e.count < e.target) this.toast(e.side, `${T.steps[e.step]} ${e.count}/${e.target}`, UI.white);
        return 0;
      case 'special':
        this.lastSpecial = { side: e.side, id: e.id };
        this.cutIn(e.side, e.id);
        if (e.id === 'betty') this.showHelper(e.side, 'betty');
        if (e.id === 'frita') this.showHelper(e.side, 'mabel');
        if (e.id === 'dinein') this.scene.time.delayedCall(1300, () => this.scene.cameras.main.shake(450, 0.009));
        if (e.id === 'minicargadora') sfx.engine();
        return 1.35;
      case 'specialHit':
        if (e.id === 'betty') {
          sfx.betty();
          this.helperLeave = this.helperT + 1.6;
        } else if (e.id === 'frita') {
          this.mabel.setTexture('mabelDing');
          this.bubbleOver(e.side, T.emotes.ding, 900, true);
          sfx.ding();
          this.helperLeave = this.helperT + 1.2;
        } else if (e.id === 'paralelo') {
          sfx.whoosh();
        } else if (e.id === 'reyDeCopas') {
          sfx.whoosh();
        }
        return 0;
      case 'taunt': {
        const who = this.o.chars[e.side];
        this.bubbleOver(e.side, T.tauntShouts[who], 1300);
        sfx.taunt(who);
        if (!e.good && m.lastPointWinner === other(e.side)) this.o.say(pick(T.mystique.badTaunt));
        return 0;
      }
      case 'emote': {
        const text = T.emotes[e.text];
        this.bubbleOver(e.side, text, e.text === '?' ? 500 : 1300);
        if (e.text === 'jaja') sfx.laugh();
        if (e.text === 'lumbar') this.o.say(pick(T.mystique.lumbar));
        if (e.text === 'noChase' && Math.random() < 0.5) this.o.say(pick(T.mystique.noChase));
        return 0;
      }
      case 'passive':
        if (e.id === 'poker') this.o.say(pick(T.mystique.poker), 3000);
        if (e.id === 'carcajada') this.o.say(pick(T.mystique.carcajada));
        return 0;
      case 'weakness':
        if (e.id === 'tienta') this.o.say(pick(T.mystique.tentado));
        if (e.id === 'apurado' && Math.random() < 0.5) this.o.say(pick(T.mystique.apurado));
        if (e.id === 'red') this.o.say(pick(T.mystique.confused));
        return 0;
      case 'exento':
        this.stamp();
        return 0.3;
      case 'burn':
        this.bubbleOver(e.side, T.emotes.burn, 1000);
        this.flames(e.side);
        if (Math.random() < 0.6) this.o.say(pick(T.mystique.burn));
        return 0;
      case 'obra':
        this.o.say(pick(T.mystique.obra));
        return 0;
      case 'obraBounce':
        this.o.say(pick(T.mystique.obraBounce));
        return 0;
      case 'ghostPuff': {
        const pos = project(e.x, e.y);
        for (let i = 0; i < 6; i++) this.puff(pos.sx, pos.sy - 2, 0xc8c6d2, 30);
        return 0;
      }
      case 'point':
        if (this.lastSpecial && this.lastSpecial.side === e.winner) this.o.say(T.specialWins[this.lastSpecial.id], 3000);
        this.lastSpecial = null;
        // A veces el que gana tira una frase.
        if (Math.random() < 0.18) {
          const who = this.o.chars[e.winner];
          this.bubbleOver(e.winner, pick(T.characters[who].phrases), 1600);
        }
        return 0;
      case 'pointStart':
        this.lastSpecial = null;
        return 0;
      default:
        return 0;
    }
  }

  // ---------------------------------------------------------------- piezas

  /** Aviso corto debajo del marcador: uno por jugador; el nuevo reemplaza al anterior. */
  private toast(side: Side, text: string, color: number): void {
    const row = side === 1 ? 0 : 1;
    const y = 36 + row * 13;
    this.toasts[row]?.destroy();
    const t = pxText(this.scene, 6, y, text, { outline: true, color }).setDepth(9050);
    this.toasts[row] = t;
    this.scene.tweens.add({
      targets: t,
      alpha: 0,
      delay: 1800,
      duration: 400,
      onComplete: () => {
        if (this.toasts[row] === t) this.toasts[row] = null;
        t.destroy();
      },
    });
  }

  private headOf(side: Side): { x: number; y: number } {
    const p = this.m.players[side];
    const pos = project(p.x, p.y);
    const tall = this.o.chars[side] === 'angelito' ? 50 : 56;
    return { x: Math.round(pos.sx), y: Math.max(26, Math.round(pos.sy) - tall) };
  }

  private bubbleOver(side: Side, text: string, ms: number, _big = false): void {
    const h = this.headOf(side);
    this.bubbles[side].show(text, h.x, h.y, ms, true);
  }

  private showHelper(side: Side, kind: 'betty' | 'mabel'): void {
    this.helperSide = side;
    this.helperKind = kind;
    this.helperT = 0;
    this.helperLeave = -1;
    if (kind === 'mabel') this.mabel.setTexture('mabel');
  }

  private cutIn(side: Side, id: string): void {
    const s = this.scene;
    const who = this.o.chars[side];
    const [c1, c2] = CLUB_COLORS[who];
    const objs: Phaser.GameObjects.GameObject[] = [];
    const g = s.add.graphics().setDepth(9700);
    g.fillStyle(0x000000, 0.55).fillRect(0, 0, 640, 360);
    g.fillStyle(c1).fillPoints([new Phaser.Math.Vector2(0, 112), new Phaser.Math.Vector2(640, 84), new Phaser.Math.Vector2(640, 252), new Phaser.Math.Vector2(0, 280)], true);
    g.fillStyle(c2, 0.9);
    for (let x = -200; x < 700; x += 36) {
      g.fillPoints([new Phaser.Math.Vector2(x, 280), new Phaser.Math.Vector2(x + 12, 280), new Phaser.Math.Vector2(x + 72, 84), new Phaser.Math.Vector2(x + 60, 84)], true);
    }
    g.fillStyle(0x000000, 0.35).fillRect(0, 128, 640, 110);
    objs.push(g);
    const portrait = s.add
      .image(-120, 186, this.o.textures[side].portrait, 'win')
      .setScale(2)
      .setDepth(9701);
    s.tweens.add({ targets: portrait, x: 140, duration: 220, ease: 'Back.Out' });
    objs.push(portrait);
    const sp = T.specials[id];
    const name = sp.name.length > 22 ? sp.name.replace(' EN ESTE', '\nEN ESTE') : sp.name;
    const scale = measure(name) * 2 > 380 ? 1 : 2;
    const title = pxText(s, 440, 150, name, { outline: true, color: UI.gold, scale, align: 1 }).setOrigin(0.5).setDepth(9702);
    title.setScale(scale * 3).setAlpha(0);
    s.tweens.add({ targets: title, scale, alpha: 1, duration: 200, delay: 120, ease: 'Back.Out' });
    objs.push(title);
    const line = pxText(s, 440, 200, sp.line, { outline: true, align: 1 }).setOrigin(0.5).setDepth(9702);
    objs.push(line);
    sfx.special();
    s.tweens.add({
      targets: objs,
      alpha: 0,
      delay: 1150,
      duration: 200,
      onComplete: () => objs.forEach((o) => o.destroy()),
    });
  }

  private stamp(): void {
    const s = this.scene;
    // Sello de goma: todo relativo al centro del contenedor.
    const g = s.add.graphics();
    g.lineStyle(4, UI.red).strokeRect(-120, -45, 240, 90);
    g.lineStyle(1, UI.red).strokeRect(-114, -39, 228, 78);
    const t1 = pxText(s, 0, -14, T.mystique.exento, { outline: true, color: UI.red, scale: 4 }).setOrigin(0.5);
    const t2 = pxText(s, 0, 26, T.mystique.vienna, { outline: true, color: UI.red }).setOrigin(0.5);
    const c = s.add.container(320, 165, [g, t1, t2]).setDepth(9750);
    c.setAngle(-8).setScale(2.2).setAlpha(0);
    s.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 160, ease: 'Quad.In' });
    s.time.delayedCall(170, () => {
      sfx.stamp();
      s.cameras.main.shake(120, 0.006);
      this.o.call(T.mystique.exentoUmpire, 2400);
      this.o.say(T.mystique.exentoComment, 3000);
    });
    s.tweens.add({ targets: c, alpha: 0, delay: 1900, duration: 400, onComplete: () => c.destroy() });
  }

  private flames(side: Side): void {
    const p = this.m.players[side];
    const pos = project(p.x, p.y);
    for (let i = 0; i < 14; i++) {
      this.puff(pos.sx + (Math.random() - 0.5) * 16, pos.sy - 24, Math.random() < 0.5 ? 0xf28a22 : 0xf5c42c, 25, -40);
    }
  }

  private puff(x: number, y: number, tint: number, speed: number, vy0 = 0): void {
    const a = Math.random() * Math.PI * 2;
    const img = this.scene.add.image(x, y, 'px').setTint(tint).setDepth(y + 2);
    const life = 0.25 + Math.random() * 0.25;
    this.puffs.push({ img, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * 0.6 + vy0, life, max: life });
  }

  // ---------------------------------------------------------------- dibujo

  update(dt: number): void {
    this.helperT += dt;
    for (const p of this.puffs) {
      p.life -= dt;
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      p.img.setAlpha(Math.max(0, p.life / p.max));
    }
    this.puffs = this.puffs.filter((p) => {
      if (p.life > 0) return true;
      p.img.destroy();
      return false;
    });
  }

  /** Textura de la pelota según el golpe especial que lleva. */
  ballTexture(): string | null {
    return this.m.ball.tag === 'frita' ? 'friedBall' : null;
  }

  render(dt: number): void {
    const m = this.m;
    this.renderHud();

    // Betty / Mabel al lado de quien las llamó.
    const helper = this.helperKind === 'betty' ? this.betty : this.mabel;
    const otherHelper = this.helperKind === 'betty' ? this.mabel : this.betty;
    otherHelper.setVisible(false);
    if (this.helperKind && this.helperSide !== null && (this.helperLeave < 0 || this.helperT < this.helperLeave)) {
      const p = m.players[this.helperSide];
      const bx = this.helperKind === 'betty' && m.betty ? m.betty.x : p.x + p.rightSign * 1.6;
      const roll = Math.max(0, 1 - this.helperT / 0.3) * 4 * p.rightSign;
      const pos = project(bx + roll, p.y + 0.2);
      helper.setVisible(true).setPosition(Math.round(pos.sx), Math.round(pos.sy)).setDepth(pos.sy);
      helper.setFlipX(p.rightSign < 0);
    } else {
      helper.setVisible(false);
      if (this.helperLeave >= 0 && this.helperT >= this.helperLeave) this.helperKind = null;
    }

    // Minicargadora: reemplaza al jugador mientras dura.
    for (const side of [0, 1] as Side[]) {
      const p = m.players[side];
      const on = p.mods.pointBuff === 'minicargadora';
      this.o.views[side].hidden = on;
      const img = this.loaders[side];
      img.setVisible(on);
      if (on) {
        const pos = project(p.x, p.y);
        img.setPosition(Math.round(pos.sx), Math.round(pos.sy)).setDepth(pos.sy);
        if (Math.abs(p.vx) > 0.3) img.setFlipX(p.vx < 0);
        this.puffT -= dt;
        if (this.puffT <= 0 && Math.hypot(p.vx, p.vy) > 1) {
          this.puffT = 0.05;
          this.puff(pos.sx, pos.sy - 2, 0xcfd3dd, 20);
        }
      }
      // Dinein: estela azul y amarilla.
      if (p.mods.pointBuff === 'dinein' && Math.hypot(p.vx, p.vy) > 2 && Math.random() < 0.6) {
        const pos = project(p.x, p.y);
        this.puff(pos.sx - Math.sign(p.vx) * 8, pos.sy - 12 - Math.random() * 20, Math.random() < 0.5 ? 0x1f45a6 : 0xf5c42c, 10);
      }
    }

    this.renderObra();

    // Pelotas fantasma de Betty: iguales a la de verdad.
    this.ghostImgs.forEach((img, i) => {
      const g = m.ghosts[i];
      const sh = this.ghostShadows[i];
      if (!g) {
        img.setVisible(false);
        sh.setVisible(false);
        return;
      }
      const b = g.ball;
      const ground = project(b.x, b.y);
      const air = project(b.x, b.y, b.z);
      img.setVisible(true).setTexture(scaleAt(b.y) < 17 ? 'ballFar' : 'ballNear').setPosition(Math.round(air.sx), Math.round(air.sy) - 1).setDepth(ground.sy + 0.6);
      sh.setVisible(true).setPosition(Math.round(ground.sx), Math.round(ground.sy)).setDepth(ground.sy + 0.4);
    });

    // Estelas: paralelo (láser celeste) y dejadita del Rey de Copas (dorada). Humo de la pelota frita.
    const b = m.ball;
    const tag = m.phase === 'rally' || m.phase === 'dead' ? b.tag : null;
    this.trailG.clear();
    if (tag === 'paralelo' || tag === 'reyDeCopas') {
      const pos = project(b.x, b.y, b.z);
      this.trail.unshift({ x: pos.sx, y: pos.sy });
      this.trail.length = Math.min(this.trail.length, 14);
      const col = tag === 'paralelo' ? UI.cyan : UI.gold;
      const ground = project(b.x, b.y);
      this.trailG.setDepth(ground.sy + 0.3);
      for (let i = 1; i < this.trail.length; i++) {
        this.trailG.lineStyle(i < 4 ? 3 : 1, i < 4 ? 0xffffff : col, 1 - i / this.trail.length);
        this.trailG.lineBetween(this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y);
      }
    } else this.trail = [];
    if (tag === 'frita' && Math.random() < 0.5) {
      const pos = project(b.x, b.y, b.z);
      this.puff(pos.sx, pos.sy - 3, Math.random() < 0.5 ? 0x9a97a8 : 0xc8c6d2, 8, -25);
    }
    this.replay.setVisible(m.slowMo && Math.floor(m.time * 3) % 2 === 0);
  }

  private renderObra(): void {
    const o = this.m.obra;
    const key = o ? `${o.x.toFixed(2)},${o.y.toFixed(2)}` : '';
    if (key === this.obraKey) return;
    this.obraKey = key;
    this.obraParts.forEach((p) => p.destroy());
    this.obraParts = [];
    if (!o) return;
    const s = this.scene;
    const pos = project(o.x, o.y);
    const k = scaleAt(o.y);
    const hole = s.add.image(Math.round(pos.sx), Math.round(pos.sy), 'pothole').setDepth(-9000);
    hole.setScale((o.r * 2 * k) / 26, (o.r * 2 * k * 0.4) / 10);
    this.obraParts.push(hole);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const c = project(o.x + Math.cos(a) * (o.r + 0.35), o.y + Math.sin(a) * (o.r + 0.35));
      this.obraParts.push(s.add.image(Math.round(c.sx), Math.round(c.sy), 'cone').setOrigin(0.5, 1).setDepth(c.sy));
    }
    const sp = project(o.x + o.r + 1.2, o.y);
    const text = pxText(s, 0, 0, T.obraSign, { color: UI.ink });
    const w = text.width + 8;
    const sign = s.add.image(Math.round(sp.sx), Math.round(sp.sy), 'sign').setOrigin(0.5, 1).setDisplaySize(w, 20).setDepth(sp.sy);
    text.setPosition(Math.round(sp.sx - text.width / 2), Math.round(sp.sy - 18)).setDepth(sp.sy + 0.1);
    this.obraParts.push(sign, text);
  }

  private renderHud(): void {
    const g = this.hud;
    g.clear();
    for (let row = 0; row < 2; row++) {
      const side = (row === 0 ? 1 : 0) as Side;
      const who = this.o.chars[side];
      const rules = RULES[who];
      const st = this.m.myst.states[side];
      const ready = this.m.myst.ready(this.m.players[side]);
      const used = st.usedThisGame;
      const y = 5 + row * 14;
      drawBox(g, 157, y - 1, 42, 13, 0x14131c, ready ? UI.gold : 0x3a3850, 0.85);
      rules.recipe.forEach((step, i) => {
        const x = 159 + i * 13;
        const done = st.recipe[i];
        g.fillStyle(done ? UI.gold : 0x2b2735).fillRect(x, y + 1, 11, 9);
        const t = this.chipText[row][i];
        const count = st.counts[step] ?? 0;
        const target = STEP_TARGET[step];
        const label = !done && target && count > 0 ? String(count) : T.stepIcons[step];
        t.setText(label).setTint(done ? UI.ink : UI.dim);
        t.setPosition(x + Math.round((11 - t.width) / 2), y - 1);
      });
      const blink = Math.floor(this.m.time * 4) % 2 === 0;
      let text = '';
      if (ready) {
        const key = this.o.humans[side] ? (this.o.twoPlayers ? T.hud.specialKey2P[side] : T.hud.specialKey1P) : '';
        text = blink ? `${T.hud.specialReady} ${key}` : '';
      } else if (used) text = '';
      this.readyText[row].setText(text);
    }
  }

  destroy(): void {
    this.bubbles.forEach((b) => b.hide());
  }
}
