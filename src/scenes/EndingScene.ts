// Final propio de cada personaje: tres viñetas con texto (estilo Mortal Kombat) y, al final, lo que se
// desbloqueó (traje alternativo y, con las seis torres, Don Ganso jugable).

import Phaser from 'phaser';
import { drawBetty, drawLoader, drawMabel } from '../art/objects';
import { bench, goose } from '../art/props';
import { NPCS } from '../art/npcs';
import { drawChiroTable, drawDrakkar, drawFrame, drawStadium, drawTrophy, drawTrophyPlant } from '../art/cutsceneArt';
import { drawGanso, drawUmpireChair } from '../art/ganso';
import { CHARACTER_ORDER, type CharacterId } from '../game/characters';
import type { BossCtx } from '../game/flow';
import { recordTowerWin, save, updateSave } from '../game/save';
import { ensureArtSheets } from '../game/spriteTextures';
import { keyboard } from '../input/keyboard';
import { sfx } from '../audio/sfx';
import { T } from '../texts/es';
import { pxText, wrapText } from '../ui/pixelFont';
import { Bubble, UI, banner, drawBox, fullscreenButton } from '../ui/widgets';
import { CONFIRM, Puppet, artTexture, enter, goTo, portrait } from '../ui/screens';
import { clinicScene, courtScene, gardenScene, riverScene, stripesScene } from './cinema';

const PX = 40;
const PY = 16;
const PW = 560;
const PH = 236;

/** Herramientas para armar una viñeta (todo en coordenadas de la viñeta). */
class Panel {
  readonly c: Phaser.GameObjects.Container;
  readonly puppets: Puppet[] = [];
  private bubbles: Bubble[] = [];

  constructor(
    private scene: Phaser.Scene,
    readonly who: CharacterId,
    readonly outfit: number,
  ) {
    this.c = scene.add.container(PX, PY);
    const m = scene.make.graphics({}, false);
    m.fillStyle(0xffffff).fillRect(PX, PY, PW, PH);
    this.c.setMask(m.createGeometryMask());
  }

  add = (o: Phaser.GameObjects.GameObject): void => {
    this.c.add(o);
  };

  pup(who: CharacterId | 'quiro', outfit: number, x: number, y: number, scale: number, view: 'front' | 'back' = 'front', anim: Parameters<Puppet['play']>[0] = 'idle', fps = 4): Puppet {
    const src = who === 'quiro' ? ensureArtSheets(this.scene, 'npc_quiro', NPCS.mozo, NPCS.mozo.outfits[0]) : who;
    const p = new Puppet(this.scene, src, outfit, x, y, scale, view).play(anim, fps);
    this.add(p.img);
    this.puppets.push(p);
    return p;
  }

  img(key: string, draw: () => import('../art/pixelArt').PixelImage, x: number, y: number, scale = 2, ox = 0.5, oy = 1): Phaser.GameObjects.Image {
    const i = this.scene.add.image(x, y, artTexture(this.scene, key, draw), undefined).setOrigin(ox, oy).setScale(scale);
    this.add(i);
    return i;
  }

  /** Globo inmediato (se borra con la viñeta). */
  bubble(text: string, x: number, y: number): void {
    const b = new Bubble(this.scene);
    b.show(wrapText(text, 240), PX + x, PY + y, 600000);
    this.bubbles.push(b);
  }

  say(text: string, x: number, y: number, delay = 500): void {
    if (!text) return;
    this.scene.time.delayedCall(delay, () => {
      const b = new Bubble(this.scene);
      b.show(wrapText(text, 200), PX + x, PY + y, 600000);
      this.bubbles.push(b);
      sfx.bip();
    });
  }

  destroy(): void {
    for (const b of this.bubbles) b.destroy();
    this.c.destroy();
  }
}

type Build = (p: Panel, s: Phaser.Scene) => void;

const court = (p: Panel, s: Phaser.Scene) => courtScene(s, p.add, PW, PH);
const trophy = (p: Panel, x: number, y: number, scale = 2) => p.img('trophy', drawTrophy, x, y, scale);

/** Lluvia de papelitos. */
function confetti(p: Panel, s: Phaser.Scene): void {
  const g = s.add.graphics();
  p.add(g);
  const bits = Array.from({ length: 60 }, (_, i) => ({ x: (i * 97) % PW, y: -((i * 53) % PH), c: [0xffd23f, 0xff5a4e, 0x6fe3ff, 0x7cf07c][i % 4] }));
  s.time.addEvent({
    delay: 50,
    loop: true,
    callback: () => {
      g.clear();
      for (const b of bits) {
        b.y += 3;
        b.x += Math.sin(b.y / 20);
        if (b.y > PH) b.y = -4;
        g.fillStyle(b.c).fillRect(Math.round(b.x), Math.round(b.y), 2, 2);
      }
    },
  });
}

const ENDINGS: Record<CharacterId, Build[]> = {
  elRosco: [
    (p, s) => {
      court(p, s);
      p.pup('elRosco', p.outfit, 280, 214, 2.6, 'front', 'taunt', 5);
      const t = trophy(p, 280, 62);
      s.tweens.add({ targets: t, y: 56, duration: 300, yoyo: true, repeat: -1 });
      confetti(p, s);
    },
    (p, s) => {
      court(p, s);
      p.pup('elRosco', p.outfit, 280, 214, 2.6, 'front', 'hurt', 3);
      trophy(p, 350, 214).setAngle(25);
      s.time.delayedCall(300, () => s.cameras.main.shake(300, 0.01));
    },
    (p, s) => {
      clinicScene(s, p.add, PW, PH);
      p.img('chiro', drawChiroTable, 280, 212, 3);
      const r = p.pup('elRosco', p.outfit, 300, 176, 2.1, 'back', 'idle', 2);
      r.img.setAngle(90);
      trophy(p, 214, 186, 1.6).setAngle(-80);
      p.pup('quiro', 0, 420, 214, 2.4, 'front', 'idle', 2);
    },
  ],
  elSeba: [
    (p, s) => {
      court(p, s);
      p.pup('elSeba', p.outfit, 280, 214, 2.6);
      trophy(p, 280, 170, 2);
      s.time.delayedCall(700, () => {
        const t = pxText(s, 280, 120, 'VALIJA DIPLOMÁTICA', { outline: true, color: UI.red, scale: 2 }).setOrigin(0.5).setAngle(-12);
        p.add(t);
        t.setScale(6).setAlpha(0);
        s.tweens.add({ targets: t, scale: 2, alpha: 1, duration: 260, ease: 'Back.In', onComplete: () => sfx.stamp() });
      });
    },
    (p, s) => {
      stripesScene(s, p.add, PW, PH, 0x1f3f9a, 0xf2c230);
      p.pup('elSeba', p.outfit, 280, 226, 2.9, 'front', 'taunt', 6);
      s.time.delayedCall(400, () => s.cameras.main.shake(1400, 0.008));
    },
    (p, s) => {
      riverScene(s, p.add, PW, PH, 84, 176);
      p.pup('elSeba', 1, 190, 224, 2.4, 'back');
      const g = s.add.graphics();
      p.add(g);
      g.lineStyle(1, 0x2a2a2a).lineBetween(214, 120, 150, 176);
      g.lineStyle(2, 0x6b4a2e).lineBetween(204, 170, 216, 118);
      trophy(p, 262, 224, 1.8);
      // Un bagre que salta, entusiasmado.
      const fish = s.add.graphics();
      fish.fillStyle(0x8a8f7a).fillEllipse(0, 0, 18, 7).fillTriangle(8, 0, 14, -5, 14, 5);
      fish.fillStyle(0x1a1a1a).fillRect(-6, -1, 2, 2);
      fish.setPosition(120, 170);
      p.add(fish);
      s.tweens.add({ targets: fish, y: 130, angle: -30, duration: 450, yoyo: true, repeat: -1, repeatDelay: 700, ease: 'Sine.Out' });
    },
  ],
  trueTincho: [
    (p, s) => {
      court(p, s);
      p.img('bench', bench, 330, 214, 3);
      p.pup('trueTincho', p.outfit, 250, 214, 2.6, 'front', 'taunt', 3);
      trophy(p, 350, 190, 1.6);
    },
    (p, s) => {
      stripesScene(s, p.add, PW, PH, 0x6fb7e8, 0xf2f2f2);
      const img = portrait(s, 'trueTincho', p.outfit, 'normal', 280, 130, 1.8);
      p.add(img);
      p.bubble(T.endings.trueTincho[1].caption, 280, 32);
    },
    (p, s) => {
      s.add.graphics();
      const bg = s.add.graphics();
      bg.fillStyle(0x0d0b14).fillRect(0, 0, PW, PH);
      p.add(bg);
      const img = portrait(s, 'trueTincho', p.outfit, 'win', 280, 60, 5);
      p.add(img);
      s.tweens.add({ targets: img, scale: 5.6, duration: 2400, ease: 'Sine.InOut' });
      const label = pxText(s, 420, 196, '← 1 px', { outline: true, color: UI.gold, scale: 2 });
      p.add(label);
    },
  ],
  volpi: [
    (p, s) => {
      court(p, s);
      const betty = p.img('bettyBig', drawBetty, 180, 214, 3).setFlipX(true);
      p.pup('volpi', p.outfit, 400, 214, 2.6, 'front', 'taunt', 6);
      // 400 pelotas (bueno, las que entran en la viñeta).
      s.time.addEvent({
        delay: 60,
        repeat: 80,
        callback: () => {
          const b = s.add.image(betty.x + 38, betty.y - 40, 'ballNear').setScale(2);
          p.add(b);
          s.tweens.add({
            targets: b,
            x: betty.x + 80 + Math.random() * 380,
            y: -20 + Math.random() * 120,
            duration: 700,
            onComplete: () => b.destroy(),
          });
          if (Math.random() < 0.3) sfx.betty();
        },
      });
    },
    (p, s) => {
      court(p, s);
      p.pup('volpi', p.outfit, 280, 214, 2.8, 'front', 'taunt', 7);
      trophy(p, 350, 214).setAngle(-15);
      s.time.addEvent({
        delay: 400,
        repeat: 12,
        callback: () => {
          const t = pxText(s, 220 + Math.random() * 120, 100, 'JA', { outline: true, color: UI.gold, scale: 2 });
          p.add(t);
          s.tweens.add({ targets: t, y: 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
        },
      });
    },
    (p, s) => {
      court(p, s);
      p.img('bettyBig', drawBetty, 250, 214, 3);
      trophy(p, 250, 146, 1.8);
      p.pup('volpi', p.outfit, 390, 214, 2.6);
    },
  ],
  elVikingo: [
    (p, s) => {
      court(p, s);
      p.pup('elVikingo', p.outfit, 280, 214, 2.6);
      trophy(p, 280, 170, 2);
    },
    (p, s) => {
      stripesScene(s, p.add, PW, PH, 0xd8842a, 0xf0b650);
      p.img('mabelDingBig', () => drawMabel('ding'), 280, 214, 4);
      const t = trophy(p, 280, 104, 1.6).setTint(0xd0902a);
      s.tweens.add({ targets: t, y: 98, duration: 400, yoyo: true, repeat: -1 });
      s.time.delayedCall(400, () => sfx.ding());
      s.time.addEvent({
        delay: 180,
        loop: true,
        callback: () => {
          const puff = s.add.circle(262 + Math.random() * 36, 70, 4, 0xf2f2f2, 0.7);
          p.add(puff);
          s.tweens.add({ targets: puff, y: 20, alpha: 0, scale: 2, duration: 900, onComplete: () => puff.destroy() });
        },
      });
    },
    (p, s) => {
      riverScene(s, p.add, PW, PH, 110, 250);
      const ship = p.img('drakkar', drawDrakkar, -40, 206, 2.4);
      const viking = p.pup('elVikingo', 1, -40, 150, 1.6, 'front', 'taunt', 6);
      s.tweens.add({
        targets: [ship, viking.img],
        x: 300,
        duration: 3200,
        ease: 'Sine.Out',
      });
      for (let i = 0; i < 4; i++) {
        const gz = p.img('gooseFly', goose, 600 + i * 30, 40 + (i % 2) * 12, 1.6);
        s.tweens.add({ targets: gz, x: -40 - i * 30, duration: 7000, delay: i * 200 });
      }
    },
  ],
  angelito: [
    (p, s) => {
      gardenScene(s, p.add, PW, PH);
      p.img('trophyPlant', drawTrophyPlant, 340, 214, 3);
      p.pup('angelito', p.outfit, 230, 214, 2.4);
    },
    (p, s) => {
      gardenScene(s, p.add, PW, PH);
      p.img('stadium', drawStadium, 400, 170, 2.2);
      const loader = p.img('loaderBig', drawLoader, 180, 216, 2.6);
      const a = p.pup('angelito', 1, 196, 150, 1.8);
      s.tweens.add({ targets: [loader, a.img], x: '+=40', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      s.time.addEvent({
        delay: 120,
        loop: true,
        callback: () => {
          const d = s.add.circle(loader.x - 40 + Math.random() * 20, 206, 3, 0xb89a70, 0.8);
          p.add(d);
          s.tweens.add({ targets: d, y: 180, alpha: 0, scale: 2, duration: 700, onComplete: () => d.destroy() });
        },
      });
    },
    (p, s) => {
      const bg = s.add.graphics();
      bg.fillStyle(0xe8e2d0).fillRect(0, 0, PW, PH);
      p.add(bg);
      p.img('photoFrame', () => drawFrame(420, 206), 250, 224, 1);
      const others = CHARACTER_ORDER.filter((c) => c !== 'angelito');
      others.forEach((c, i) => p.pup(c, 0, 100 + i * 72 + (i >= 2 ? 50 : 0), 200, 1.5));
      trophy(p, 250, 200, 1.4);
      // Angelito quedó afuera del cuadro, del otro lado del marco.
      p.pup('angelito', p.outfit, 548, 214, 2);
    },
  ],
  donGanso: [
    (p, s) => {
      court(p, s);
      p.pup('donGanso', p.outfit, 280, 214, 2.6, 'front', 'taunt', 5);
      const t = trophy(p, 282, 70);
      s.tweens.add({ targets: t, y: 64, duration: 300, yoyo: true, repeat: -1 });
      confetti(p, s);
    },
    (p, s) => {
      riverScene(s, p.add, PW, PH, 90, 180);
      trophy(p, 280, 222, 3.4);
      p.img('gansoNest', () => drawGanso('sleep'), 280, 150, 3);
    },
    (p, s) => {
      court(p, s);
      p.img('umpireChairBig', drawUmpireChair, 280, 222, 3);
      p.img('gansoHonkBig', () => drawGanso('honk'), 283, 150, 3);
    },
  ],
};

export class EndingScene extends Phaser.Scene {
  private boss!: BossCtx;
  private idx = 0;
  private panel: Panel | null = null;
  private caption!: Phaser.GameObjects.BitmapText;
  private t = 0;
  private unlockShown = false;

  constructor() {
    super('ending');
  }

  init(data: { boss: BossCtx }): void {
    this.boss = data.boss;
    this.idx = 0;
    this.panel = null;
    this.t = 0;
    this.unlockShown = false;
  }

  create(): void {
    enter(this, 500);
    const g = this.add.graphics();
    g.fillStyle(0x0d0b14).fillRect(0, 0, 640, 360);
    drawBox(g, PX - 4, PY - 4, PW + 8, PH + 8, 0x0d0b14, UI.gold);
    drawBox(g, PX - 4, 262, PW + 8, 84, 0x191826, 0x3a3850);
    this.caption = pxText(this, 320, 272, '', { outline: true, color: UI.white, align: 1 }).setOrigin(0.5, 0);
    pxText(this, 596, 334, 'ENTER', { color: UI.dim }).setOrigin(1, 0);
    fullscreenButton(this);
    this.show(0);
  }

  private show(i: number): void {
    const who = this.boss.run.player;
    const panels = ENDINGS[who];
    const texts = T.endings[who];
    this.panel?.destroy();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.panel = new Panel(this, who, this.boss.run.outfit);
    panels[i](this.panel, this);
    const tx = texts[i];
    this.caption.setText(wrapText(tx.caption, 540));
    // Globo arriba del protagonista (en la viñeta 2 de Tincho el globo es la respuesta a la pregunta).
    this.panel.say(tx.bubble, 300, 80, 700);
    this.t = 0;
  }

  private showUnlock(): void {
    this.unlockShown = true;
    this.panel?.destroy();
    this.panel = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    const run = this.boss.run;
    const r = recordTowerWin(save(), run.player);
    updateSave(() => r.data);
    const g = this.add.graphics();
    g.fillStyle(0x0d0b14).fillRect(PX - 4, PY - 4, PW + 8, PH + 8);
    drawBox(g, PX - 4, PY - 4, PW + 8, PH + 8, 0x191826, UI.gold);
    const names = T.outfits[run.player] ?? [];
    const alt = names.slice(1).join(' / ');
    if (r.newOutfit) {
      pxText(this, 320, 34, wrapText(T.unlock.outfit(T.characters[run.player].name, alt), 520), { outline: true, color: UI.gold, align: 1 }).setOrigin(0.5, 0);
      portrait(this, run.player, 1, 'win', 320, 130, 1.1);
      sfx.special();
    } else {
      pxText(this, 320, 34, T.select.towerDone, { outline: true, color: UI.gold, scale: 2 }).setOrigin(0.5, 0);
      portrait(this, run.player, run.outfit, 'win', 320, 130, 1.1);
    }
    if (r.newGanso) {
      banner(this, 'DON GANSO', UI.gold, 110, 3000);
      pxText(this, 320, 196, wrapText(T.unlock.ganso, 520), { outline: true, color: UI.green, align: 1 }).setOrigin(0.5, 0);
    }
    this.caption.setText(`${T.unlock.towers(r.data.towersWon.length)}\n${T.unlock.end}`);
  }

  update(_t: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.t += dt;
    for (const p of this.panel?.puppets ?? []) p.update(dt);
    if (this.t > 0.6 && keyboard.anyPressed(CONFIRM)) {
      if (this.unlockShown) goTo(this, 'testMenu', undefined, 500);
      else if (this.idx < ENDINGS[this.boss.run.player].length - 1) this.show(++this.idx);
      else this.showUnlock();
      this.t = 0;
    }
    keyboard.endFrame();
  }
}
