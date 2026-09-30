// Splash ("Chattahoochees Games presenta..."), pantalla de título con el logo animado y menú
// principal con Don Ganso describiendo cada opción (estilo aventura gráfica).

import Phaser from 'phaser';
import { drawGanso, drawUmpireChair, type GansoFrame } from '../art/ganso';
import { goose as gooseProp, kayak } from '../art/props';
import { Painter } from '../art/painter';
import { PAL } from '../art/palette';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { keyboard } from '../input/keyboard';
import { T } from '../texts/es';
import { pxText, wrapText } from '../ui/pixelFont';
import { Bubble, UI, drawBox, fullscreenButton } from '../ui/widgets';
import { BACK, CONFIRM, artTexture, enter, goTo } from '../ui/screens';
import { riverScene } from './cinema';

function gansoTextures(scene: Phaser.Scene): void {
  for (const f of ['idle', 'blink', 'honk', 'sleep', 'look'] as GansoFrame[]) artTexture(scene, `ganso_${f}`, () => drawGanso(f));
  artTexture(scene, 'umpireChair', drawUmpireChair);
}

/** La raqueta del logo, con su pelota. */
function drawLogoRacket() {
  const p = new Painter(56, 90);
  p.ellipse(28, 26, 22, 25, PAL.red);
  for (let x = 12; x <= 44; x += 4) p.thin([x, 6], [x, 46], '#e8e2d0');
  for (let y = 8; y <= 44; y += 4) p.thin([8, y], [48, y], '#e8e2d0');
  // Limpiar afuera del aro (las cuerdas solo adentro).
  for (let y = 0; y < 56; y++)
    for (let x = 0; x < 56; x++) {
      const dx = (x - 28) / 18;
      const dy = (y - 26) / 21;
      const inside = dx * dx + dy * dy <= 1;
      const ring = (((x - 28) / 22) ** 2 + ((y - 26) / 25) ** 2 <= 1) && !inside;
      if (!inside && !ring) p.clear(x, y);
    }
  for (let a = 0; a < Math.PI * 2; a += 0.01) p.set(28 + Math.cos(a) * 21, 26 + Math.sin(a) * 24, PAL.red);
  p.rect(25, 50, 6, 10, PAL.red);
  p.rect(24, 60, 8, 28, '#2b2735');
  p.outline(PAL.ink);
  return p.img;
}

function drawLogoBall() {
  const p = new Painter(14, 14);
  p.ellipse(7, 7, 6, 6, '#dcf53c');
  p.thin([2, 4], [6, 7], '#f7ffd0');
  p.thin([6, 7], [12, 9], '#f7ffd0');
  p.outline(PAL.ink);
  return p.img;
}

// ---------------------------------------------------------------- splash

export class SplashScene extends Phaser.Scene {
  private t = 0;
  private done = false;

  constructor() {
    super('splash');
  }

  init(): void {
    this.t = 0;
    this.done = false;
  }

  create(): void {
    enter(this, 500);
    gansoTextures(this);
    this.add.graphics().fillStyle(0x0b0a10).fillRect(0, 0, 640, 360);
    const studio = pxText(this, 320, 140, T.splash.studio, { outline: true, color: UI.gold, scale: 3 }).setOrigin(0.5).setAlpha(0);
    const presents = pxText(this, 320, 176, T.splash.presents, { color: UI.dim, scale: 2 }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: studio, alpha: 1, duration: 600, delay: 200 });
    this.tweens.add({ targets: presents, alpha: 1, duration: 600, delay: 1000 });
    // Don Ganso cruza caminando y grazna.
    const g = this.add.image(-40, 300, 'ganso_idle').setOrigin(0.5, 1).setScale(2);
    this.tweens.add({
      targets: g,
      x: 320,
      duration: 1600,
      delay: 1500,
      onComplete: () => {
        g.setTexture('ganso_honk');
        sfx.call();
        new Bubble(this).show(T.splash.goose, 330, 250, 2000);
      },
    });
    fullscreenButton(this);
  }

  update(_t: number, deltaMs: number): void {
    this.t += deltaMs / 1000;
    if (!this.done && (this.t > 5.2 || (this.t > 0.3 && keyboard.anyKeyPressed()))) {
      this.done = true;
      goTo(this, 'title', undefined, 400);
    }
    keyboard.endFrame();
  }
}

// ---------------------------------------------------------------- título

export class TitleScene extends Phaser.Scene {
  private t = 0;
  private press!: Phaser.GameObjects.BitmapText;
  private geese: Phaser.GameObjects.Image[] = [];
  private kayakImg!: Phaser.GameObjects.Image;
  private ball!: Phaser.GameObjects.Image;
  private done = false;

  constructor() {
    super('title');
  }

  init(): void {
    this.t = 0;
    this.geese = [];
    this.done = false;
  }

  create(): void {
    enter(this, 500);
    music.play('title');
    riverScene(this, () => {}, 640, 360, 190, 300);
    this.kayakImg = this.add.image(-40, 250, artTexture(this, 'kayakOrange', () => kayak('#e2862f'))).setScale(2);
    for (let i = 0; i < 5; i++) {
      this.geese.push(this.add.image(700 + i * 26, 60 + (i % 2) * 10 + i * 4, artTexture(this, 'gooseProp', gooseProp)).setScale(1.5).setFlipX(true));
    }

    // Logo: letras que caen una por una, con la raqueta y la pelota.
    const word = 'CHATTAHOOCHEE';
    const scale = 4;
    const spacing = 30;
    const x0 = 320 - ((word.length - 1) * spacing) / 2;
    [...word].forEach((ch, i) => {
      const l = pxText(this, x0 + i * spacing, -40, ch, { outline: true, color: UI.gold, scale }).setOrigin(0.5);
      this.tweens.add({ targets: l, y: 70, duration: 500, delay: 200 + i * 70, ease: 'Bounce.Out' });
    });
    const tenis = pxText(this, 320, 118, 'TENIS', { outline: true, color: UI.white, scale: 5 }).setOrigin(0.5).setAlpha(0).setScale(8);
    this.tweens.add({
      targets: tenis,
      alpha: 1,
      scale: 5,
      duration: 350,
      delay: 1300,
      ease: 'Back.Out',
      onStart: () => sfx.smash(),
    });
    const racket = this.add.image(560, 150, artTexture(this, 'logoRacket', drawLogoRacket)).setScale(1.2).setAngle(25).setAlpha(0);
    this.tweens.add({ targets: racket, alpha: 1, angle: 15, duration: 400, delay: 1500 });
    this.ball = this.add.image(560, 60, artTexture(this, 'logoBall', drawLogoBall)).setScale(1.2).setAlpha(0);
    this.tweens.add({ targets: this.ball, alpha: 1, duration: 200, delay: 1700 });

    this.press = pxText(this, 320, 318, T.titleScreen.press, { outline: true, color: UI.white, scale: 2 }).setOrigin(0.5);
    pxText(this, 320, 338, T.titleScreen.pressSub, { outline: true, color: UI.dim }).setOrigin(0.5);
    pxText(this, 636, 352, T.titleScreen.version, { color: 0xc8a0a0 }).setOrigin(1, 0.5);
    fullscreenButton(this);
  }

  update(_t: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.t += dt;
    this.press.setVisible(Math.floor(this.t * 2) % 2 === 0);
    this.kayakImg.x += dt * 22;
    if (this.kayakImg.x > 700) this.kayakImg.x = -60;
    for (const g of this.geese) {
      g.x -= dt * 38;
      if (g.x < -40) g.x += 800;
    }
    // La pelota pica en la raqueta.
    this.ball.y = 60 + Math.abs(Math.sin(this.t * 3)) * -30 + 30;
    if (!this.done && this.t > 0.6 && keyboard.anyKeyPressed()) {
      this.done = true;
      sfx.ready();
      goTo(this, 'menu', undefined, 300);
    }
    keyboard.endFrame();
  }
}

// ---------------------------------------------------------------- menú principal

export class MainMenuScene extends Phaser.Scene {
  private sel = 0;
  private items: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  private bubble!: Bubble;
  private goose!: Phaser.GameObjects.Image;

  constructor() {
    super('menu');
  }

  init(data: { sel?: number }): void {
    this.sel = data?.sel ?? 0;
    this.items = [];
  }

  create(): void {
    enter(this);
    music.play('menu');
    gansoTextures(this);
    riverScene(this, () => {}, 640, 360, 150, 262);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRect(0, 0, 640, 360);
    pxText(this, 320, 12, T.title, { outline: true, color: UI.gold, scale: 3 }).setOrigin(0.5, 0);
    drawBox(g, 276, 70, 340, 206, 0x191826, UI.gold, 0.94);
    T.mainMenu.items.forEach((it, i) => {
      this.items.push(pxText(this, 306, 88 + i * 30, it.label, { outline: true }));
    });
    this.cursor = pxText(this, 290, 0, '▶', { outline: true, color: UI.gold });
    this.add.image(70, 348, 'umpireChair').setOrigin(0.5, 1).setScale(2);
    this.goose = this.add.image(72, 298, 'ganso_idle').setOrigin(0.5, 1).setScale(2);
    this.bubble = new Bubble(this);
    pxText(this, 446, 346, T.mainMenu.help, { outline: true, color: UI.dim }).setOrigin(0.5, 0);
    fullscreenButton(this);
    this.refresh(false);
  }

  private refresh(sound: boolean): void {
    this.items.forEach((t, i) => t.setTint(i === this.sel ? UI.gold : UI.white));
    this.cursor.setY(88 + this.sel * 30);
    const it = T.mainMenu.items[this.sel];
    this.bubble.show(wrapText(it.desc, 190), 84, 234, 600000);
    this.goose.setTexture('ganso_honk');
    this.time.delayedCall(220, () => this.goose.setTexture('ganso_idle'));
    if (sound) sfx.bip();
  }

  update(): void {
    const n = this.items.length;
    if (keyboard.anyPressed(['ArrowUp', 'KeyW'])) {
      this.sel = (this.sel + n - 1) % n;
      this.refresh(true);
    }
    if (keyboard.anyPressed(['ArrowDown', 'KeyS'])) {
      this.sel = (this.sel + 1) % n;
      this.refresh(true);
    }
    if (keyboard.anyPressed(CONFIRM)) {
      sfx.ready();
      const id = T.mainMenu.items[this.sel].id;
      if (id === 'tower') goTo(this, 'select');
      else if (id === 'friendly') goTo(this, 'testMenu');
      else if (id === 'practice') goTo(this, 'select', { mode: 'practice' });
      else if (id === 'options') goTo(this, 'options');
      else if (id === 'howto') goTo(this, 'howto');
      else goTo(this, 'credits');
    } else if (keyboard.anyPressed(BACK)) goTo(this, 'title');
    keyboard.endFrame();
  }
}
