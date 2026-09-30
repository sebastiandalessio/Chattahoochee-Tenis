// La sede viva: fondo pintado, Don Ganso en su silla, extras animados (jubilados de la cancha de
// al lado, chicos, nadadores, pickleballers, kayaks, gansos) y los eventos (pelota, ardilla, polen...).

import Phaser from 'phaser';
import { elSebaArt } from '../art/characters/elSeba';
import { drawGanso, drawGansoIcon, drawUmpireChair, type GansoFrame } from '../art/ganso';
import { NPCS, drawSwimmer } from '../art/npcs';
import * as P from '../art/props';
import { BOSS_LIGHTS, paintVenue } from '../art/venueArt';
import { sfx } from '../audio/sfx';
import { COURT } from '../logic/court';
import type { Match, MatchEvent } from '../sim/match';
import type { VenueId } from '../sim/venues';
import { pick, T } from '../texts/es';
import { pxText } from '../ui/pixelFont';
import { Bubble } from '../ui/widgets';
import { project, scaleAt } from './projection';
import { ensureArtSheets } from './spriteTextures';
import { addCanvasTexture, imageToCanvas } from './textures';

type Sheet = { back: string; front: string; frames: Record<string, number> };

interface Extra {
  img: Phaser.GameObjects.Image;
  sheet: Sheet;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  area?: [number, number, number, number];
  swingT: number;
  t: number;
  offsetY?: number;
}

interface Flyer {
  img: Phaser.GameObjects.Image;
  shadow?: Phaser.GameObjects.Image;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

export interface VenueFxOptions {
  say: (text: string, ms?: number) => void;
  call: (text: string, ms?: number) => void;
}

function tex(scene: Phaser.Scene, key: string, make: () => import('../art/pixelArt').PixelImage): string {
  if (!scene.textures.exists(key)) addCanvasTexture(scene, key, imageToCanvas(make()));
  return key;
}

export class VenueFx {
  readonly id: VenueId;
  private scene: Phaser.Scene;
  private m: Match;
  private o: VenueFxOptions;
  private goose: Phaser.GameObjects.Image;
  private gooseFrame: GansoFrame = 'idle';
  private honkT = 0;
  private blinkT = 2;
  readonly umpireBubbleAt: { x: number; y: number };
  private extras: Extra[] = [];
  private flyers: Flyer[] = [];
  private bubble: Bubble;
  private t = 0;
  // Partido lento de la cancha de al lado (Breckenridge).
  private slowBall: { img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; u: number; dir: 1 | -1 } | null = null;
  private retirees: Extra[] = [];
  // Pickleball (St. Regis).
  private pickle: { a: Extra; b: Extra; ball: Phaser.GameObjects.Image; u: number; dir: 1 | -1; dur: number }[] = [];
  private swimmers: { img: Phaser.GameObjects.Image; x: number; y: number; v: number; key: string }[] = [];
  private leaves: { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; t: number }[] = [];
  private lights: Phaser.GameObjects.Image[] = [];
  private pollen: Phaser.GameObjects.Rectangle;
  private puddle: Phaser.GameObjects.Graphics | null = null;
  private pinaImg: Phaser.GameObjects.Image | null = null;
  private hazardImg: Phaser.GameObjects.Image;
  private hazardShadow: Phaser.GameObjects.Image;
  private lifeguard: Extra | null = null;
  private coach: Extra | null = null;
  private asker: Extra | null = null;
  private sneezeT = -1;
  /** La pelota se la llevó una ardilla o Don Ganso: no dibujarla hasta el próximo punto. */
  ballHidden = false;
  private wasSleeping = false;
  /** Se acaba de despertar (la escena demora el canto del tanteador para no pisarle el globo). */
  justWoke = false;

  constructor(scene: Phaser.Scene, m: Match, id: VenueId, o: VenueFxOptions) {
    this.scene = scene;
    this.m = m;
    this.id = id;
    this.o = o;
    // Fondo y luz (se pintan una sola vez por sede: después se reusa la textura).
    if (!scene.textures.exists(`venueBg_${id}`)) {
      const paint = paintVenue(id);
      addCanvasTexture(scene, `venueBg_${id}`, imageToCanvas(paint.background));
      if (paint.overlay) addCanvasTexture(scene, `venueOv_${id}`, imageToCanvas(paint.overlay));
    }
    scene.add.image(0, 0, `venueBg_${id}`).setOrigin(0).setDepth(-10000);
    if (scene.textures.exists(`venueOv_${id}`)) scene.add.image(0, 0, `venueOv_${id}`).setOrigin(0).setDepth(9300);
    if (id === 'stRegis') {
      const s = project(0, -(m.venue?.fenceY ?? 14.2) - 0.2, 1.9);
      pxText(scene, Math.round(s.sx), Math.round(s.sy), T.venues.windscreen, { outline: true, color: 0xf3f1ea })
        .setOrigin(0.5)
        .setDepth(-9000);
    }

    // Don Ganso en su silla, a la izquierda de la red.
    for (const f of ['idle', 'blink', 'honk', 'sleep', 'look'] as GansoFrame[]) tex(scene, `ganso_${f}`, () => drawGanso(f));
    tex(scene, 'umpireChair', drawUmpireChair);
    tex(scene, 'gansoIcon', drawGansoIcon);
    const chair = project(-COURT.netPostX - 1.2, 0.2);
    const cx = Math.round(chair.sx);
    const cy = Math.round(chair.sy);
    scene.add.image(cx, cy, 'umpireChair').setOrigin(0.5, 1).setDepth(chair.sy);
    this.goose = scene.add.image(cx + 1, cy - 25, 'ganso_idle').setOrigin(0.5, 1).setDepth(chair.sy + 0.1);
    this.umpireBubbleAt = { x: cx + 6, y: cy - 48 };
    this.bubble = new Bubble(scene);

    this.pollen = scene.add.rectangle(320, 180, 640, 360, 0xf2e04a, 0.3).setDepth(9350).setVisible(false);
    tex(scene, 'pickleProp', P.pickleball);
    this.hazardImg = scene.add.image(0, 0, 'pickleProp').setVisible(false);
    this.hazardShadow = scene.add.image(0, 0, 'shadow').setAlpha(0.4).setVisible(false);
    this.setupExtras();
  }

  // ---------------------------------------------------------------- extras

  private npc(key: string): Sheet {
    const art = NPCS[key];
    return ensureArtSheets(this.scene, `npc_${key}`, art, art.outfits[0]);
  }

  private addExtra(sheet: Sheet, x: number, y: number, speed = 0, area?: [number, number, number, number], offsetY = 0): Extra {
    const view = y < 0 ? sheet.front : sheet.back;
    const img = this.scene.add.image(0, 0, view, 'idle_0').setOrigin(0.5, 60 / 64);
    const e: Extra = { img, sheet, x, y, tx: x, ty: y, speed, area, swingT: 0, t: Math.random() * 3, offsetY };
    this.extras.push(e);
    return e;
  }

  private setupExtras(): void {
    const s = this.scene;
    const id = this.id;
    if (id === 'breckenridge' || id === 'chattahoochee') {
      // Partido lentísimo en la cancha de al lado.
      if (id === 'breckenridge') {
        this.retirees = [this.addExtra(this.npc('jubilado1'), 16.8, -12.6), this.addExtra(this.npc('jubilado2'), 18.2, 12.6)];
        tex(s, 'ball4v', () => P.soccerBall());
        this.slowBall = {
          img: s.add.image(0, 0, 'ballNear'),
          shadow: s.add.image(0, 0, 'shadow').setAlpha(0.35),
          u: 0.3,
          dir: 1,
        };
        this.addExtra(this.npc('chico1'), -15, -10, 3.2, [-19, -24, -11, -6]);
        this.addExtra(this.npc('chico2'), -13, -18, 3.6, [-19, -24, -11, -6]);
        this.lifeguard = this.addExtra(this.npc('guardavidas'), -11.1, 15.3, 0, undefined, -22);
      } else {
        // Pescador en la orilla (el Seba con el chaleco de pesca, de incógnito).
        const seba = ensureArtSheets(s, 'npc_pescador', { ...elSebaArt, noRacket: true }, elSebaArt.outfits.find((o) => o.id === 'pesca')!);
        const f = this.addExtra(seba, -10.6, 6);
        const hand = project(-10.9, 6, 1.6);
        const g = s.add.graphics().setDepth(hand.sy + 30);
        g.lineStyle(1, 0x4a3820).lineBetween(hand.sx, hand.sy, hand.sx - 30, hand.sy - 22);
        g.lineStyle(1, 0xdddddd, 0.7).lineBetween(hand.sx - 30, hand.sy - 22, hand.sx - 36, hand.sy + 20);
        void f;
        tex(s, 'goose', P.goose);
        for (let i = 0; i < 3; i++) {
          const img = s.add.image(0, 0, 'goose');
          this.flyers.push({ img, x: 11 + i * 1.2, y: -4 + i * 3, z: 0, vx: 0.4 * (i % 2 ? 1 : -1), vy: 0.2, vz: 0, life: Infinity });
        }
        tex(s, 'kayakA', () => P.kayak('#e0503a'));
        tex(s, 'kayakB', () => P.kayak(PAL_YELLOW));
        this.flyers.push({ img: s.add.image(0, 0, 'kayakA'), x: -13.8, y: -26, z: 0, vx: 0, vy: 1.6, vz: 0, life: Infinity });
        this.flyers.push({ img: s.add.image(0, 0, 'kayakB'), x: -15.5, y: 20, z: 0, vx: 0, vy: -1.2, vz: 0, life: Infinity });
        tex(s, 'poleLit', () => P.lightPole(true));
        for (const [x, y] of BOSS_LIGHTS) {
          const pos = project(x, y);
          const lit = s.add.image(Math.round(pos.sx), Math.round(pos.sy), 'poleLit').setOrigin(0.5, 1).setDepth(pos.sy).setVisible(false);
          this.lights.push(lit);
        }
      }
    }
    if (id === 'springRidge') {
      for (const [i, cap] of ['#e0503a', PAL_YELLOW, '#3a78d0', '#f2f2f2', '#50b060', '#e070b0'].entries()) {
        const k0 = tex(s, `swim0_${i}`, () => drawSwimmer(0, cap));
        tex(s, `swim1_${i}`, () => drawSwimmer(1, cap));
        const img = s.add.image(0, 0, k0);
        this.swimmers.push({ img, x: 12.25 + i * 2.5, y: -15 + Math.random() * 30, v: (1.2 + Math.random()) * (i % 2 ? 1 : -1), key: `swim%_${i}` });
      }
      this.coach = this.addExtra(this.npc('entrenador'), 10.5, -13);
      for (let i = 0; i < 14; i++) this.spawnLeaf(true);
    }
    if (id === 'stRegis') {
      const courts = [
        [-14.5, -6.5],
        [-14.5, 10.5],
      ];
      for (const [i, [cx, cy]] of courts.entries()) {
        const a = this.addExtra(this.npc(i === 0 ? 'pickle1' : 'pickle2'), cx - 0.6, cy - 5.4);
        const b = this.addExtra(this.npc(i === 0 ? 'pickle2' : 'pickle1'), cx + 0.5, cy + 5.4);
        const ball = s.add.image(0, 0, 'pickleProp');
        this.pickle.push({ a, b, ball, u: Math.random(), dir: 1, dur: 1.1 + i * 0.15 });
      }
    }
  }

  private spawnLeaf(anywhere = false): void {
    const colors = [0xd9892e, 0xc9b23a, 0x6aa04a, 0xb85a2e];
    const img = this.scene.add.image(0, 0, 'px').setTint(colors[Math.floor(Math.random() * colors.length)]).setDepth(9200);
    this.leaves.push({ img, x: Math.random() * 640, y: anywhere ? Math.random() * 360 : -4, vx: 6 + Math.random() * 10, vy: 12 + Math.random() * 14, t: Math.random() * 6 });
  }

  // ---------------------------------------------------------------- Don Ganso

  honk(): void {
    this.honkT = 0.45;
  }

  get sleeping(): boolean {
    return this.m.venueEv.sleeping;
  }

  // ---------------------------------------------------------------- eventos

  onEvent(e: MatchEvent): void {
    const ev = T.venues.events;
    if (e.type === 'pointStart') {
      this.ballHidden = false;
      if (!e.fresh) return;
      this.pollen.setVisible(false);
      this.puddle?.destroy();
      this.puddle = null;
      this.pinaImg?.destroy();
      this.pinaImg = null;
      this.justWoke = this.wasSleeping;
      if (this.wasSleeping) {
        this.wasSleeping = false;
        this.bubble.show(T.venues.wake, this.umpireBubbleAt.x, this.umpireBubbleAt.y, 1800);
        sfx.call();
      }
      return;
    }
    if (e.type === 'fence') {
      sfx.clank();
      if (Math.random() < 0.3) this.o.say(pick(T.venues.fence));
      return;
    }
    if (e.type === 'emote' && e.text === 'slip') return;
    if (e.type !== 'venue') return;
    const s = this.scene;
    switch (e.id) {
      case 'pelota': {
        tex(s, 'soccer', P.soccerBall);
        const img = s.add.image(0, 0, 'soccer');
        this.flyers.push({ img, x: e.x ?? -14, y: e.y ?? 0, z: 0.6, vx: 9, vy: 1.5, vz: 2.5, life: 3.5 });
        sfx.kick();
        this.o.call(ev.pelota.call, 1400);
        this.o.say(pick(ev.pelota.say));
        break;
      }
      case 'ardilla': {
        tex(s, 'squirrel', P.squirrel);
        const img = s.add.image(0, 0, 'squirrel');
        const fromLeft = (e.x ?? 0) > 0;
        this.flyers.push({ img, x: e.x ?? 0, y: e.y ?? 0, z: 0, vx: fromLeft ? 7 : -7, vy: 2, vz: 0, life: 3 });
        this.ballHidden = true;
        this.o.call(ev.ardilla.call, 1400);
        this.o.say(pick(ev.ardilla.say));
        break;
      }
      case 'silbato': {
        sfx.whistle();
        const who = this.lifeguard ?? this.coach;
        if (who) this.bubbleAt(who, ev.silbato.bubble);
        this.o.say(pick(ev.silbato.say));
        break;
      }
      case 'bomba': {
        sfx.splash();
        tex(s, 'splash', P.splash);
        const at = project(-13, 9);
        const sp = s.add.image(Math.round(at.sx), Math.round(at.sy), 'splash').setOrigin(0.5, 1).setDepth(at.sy + 1);
        s.tweens.add({ targets: sp, alpha: 0, delay: 700, duration: 500, onComplete: () => sp.destroy() });
        if (this.lifeguard) this.bubbleAt(this.lifeguard, ev.bomba.bubble);
        const z = this.m.venueEv.puddle;
        if (z) {
          const c = project(z.x, z.y);
          const k = scaleAt(z.y);
          // Charco: agua clarita con borde y un par de brillos.
          const w = z.r * 2 * k;
          const h = z.r * 0.9 * k;
          const g = s.add.graphics({ x: Math.round(c.sx), y: Math.round(c.sy) }).setDepth(-9000);
          g.fillStyle(0x2c5d8a, 0.35).fillEllipse(0, 1, w + 2, h + 2);
          g.fillStyle(0xa8e2fb, 0.7).fillEllipse(0, 0, w, h);
          g.fillStyle(0xe8f8ff, 0.9).fillRect(-Math.round(w * 0.25), -Math.round(h * 0.15), Math.round(w * 0.2), 1);
          g.fillRect(Math.round(w * 0.08), Math.round(h * 0.12), Math.round(w * 0.14), 1);
          this.puddle = g;
        }
        this.o.say(pick(ev.bomba.say));
        break;
      }
      case 'pina': {
        tex(s, 'pinecone', P.pineCone);
        if (e.stage === 'start' && e.x !== undefined && e.y !== undefined) {
          const g = project(e.x, e.y);
          this.pinaImg = s.add.image(Math.round(g.sx), Math.round(g.sy) - 60, 'pinecone').setOrigin(0.5, 1).setDepth(g.sy);
          s.tweens.add({ targets: this.pinaImg, y: Math.round(g.sy), duration: 450, ease: 'Bounce.Out' });
          this.o.say(pick(ev.pina.say));
        }
        break;
      }
      case 'polen':
        this.pollen.setVisible(true);
        this.sneezeT = 0.8;
        this.o.say(pick(ev.polen.say));
        break;
      case 'ciervo': {
        tex(s, 'deer', P.deer);
        const img = s.add.image(0, 0, 'deer');
        const x = this.id === 'stRegis' ? 11 : -11.5;
        this.flyers.push({ img, x, y: -22, z: 0, vx: 0, vy: 1.3, vz: 0, life: 22 });
        this.o.say(pick(ev.ciervo.say), 3200);
        break;
      }
      case 'entrenador':
        if (this.coach) this.bubbleAt(this.coach, pick(ev.entrenador.bubbles));
        this.o.say(pick(ev.entrenador.say));
        break;
      case 'pickleball':
        if (e.stage === 'hit') this.o.say(pick(ev.pickleball.hit));
        else this.o.say(pick(ev.pickleball.say));
        sfx.poc();
        break;
      case 'mozo': {
        const w = this.addExtra(this.npc('mozo'), -10, -(this.m.venue?.fenceY ?? 17) + 0.6, 1.8);
        w.tx = 11;
        tex(s, 'tray', P.lemonadeTray);
        const tray = s.add.image(0, 0, 'tray');
        this.flyers.push({ img: tray, x: -10, y: w.y, z: 1.35, vx: 1.8, vy: 0, vz: 0, life: 12 });
        this.o.say(pick(ev.mozo.say));
        this.scene.time.delayedCall(12500, () => {
          w.img.destroy();
          this.extras = this.extras.filter((x) => x !== w);
        });
        break;
      }
      case 'pregunta': {
        const a = this.addExtra(this.npc('pickle1'), -12, 9, 2.5);
        a.tx = -9.2;
        a.ty = 9;
        this.asker = a;
        break;
      }
      case 'gansoDuerme':
        this.wasSleeping = true;
        this.o.say(pick(ev.gansoDuerme.say));
        break;
      case 'gansoRoba':
        this.o.say(pick(ev.gansoRoba.say));
        this.honk();
        break;
    }
  }

  /** Dónde está el que viene a preguntar (para el globo del diálogo). */
  askerHead(): { x: number; y: number } | null {
    if (!this.asker) return null;
    const p = project(this.asker.x, this.asker.y);
    return { x: Math.round(p.sx), y: Math.round(p.sy) - 50 };
  }

  sendAskerAway(): void {
    const a = this.asker;
    if (!a) return;
    a.tx = -14;
    a.ty = 9;
    this.scene.time.delayedCall(2500, () => {
      a.img.destroy();
      this.extras = this.extras.filter((x) => x !== a);
    });
    this.asker = null;
  }

  private bubbleAt(e: Extra, text: string): void {
    const p = project(e.x, e.y);
    this.bubble.show(text, Math.round(p.sx), Math.round(p.sy) - 44 + (e.offsetY ?? 0), 1600);
  }

  // ---------------------------------------------------------------- cada frame

  update(dt: number): void {
    this.t += dt;
    const m = this.m;

    // Don Ganso: parpadea, grazna al cantar y se duerme cuando le toca.
    this.honkT -= dt;
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3;
    let f: GansoFrame = 'idle';
    if (this.sleeping) f = 'sleep';
    else if (this.honkT > 0) f = 'honk';
    else if (this.blinkT < 0) f = 'blink';
    else if (Math.sin(this.t * 0.7) > 0.93) f = 'look';
    if (f !== this.gooseFrame) {
      this.gooseFrame = f;
      this.goose.setTexture(`ganso_${f}`);
    }
    if (this.sleeping && Math.floor(this.t * 0.7) !== Math.floor((this.t - dt) * 0.7)) {
      this.bubble.show(T.venues.zzz, this.umpireBubbleAt.x, this.umpireBubbleAt.y, 900);
    }

    // Extras caminando.
    for (const e of this.extras) {
      e.t += dt;
      e.swingT -= dt;
      const dx = e.tx - e.x;
      const dy = e.ty - e.y;
      const d = Math.hypot(dx, dy);
      let anim = 'idle';
      if (e.speed > 0 && d > 0.1) {
        const k = Math.min(1, (e.speed * dt) / d);
        e.x += dx * k;
        e.y += dy * k;
        anim = 'run';
      } else if (e.area && Math.random() < dt * 0.8) {
        const [x0, y0, x1, y1] = e.area;
        e.tx = x0 + Math.random() * (x1 - x0);
        e.ty = y0 + Math.random() * (y1 - y0);
      }
      if (e.swingT > 0) anim = 'drive';
      const n = e.sheet.frames[anim] ?? 1;
      const fps = anim === 'run' ? 8 : anim === 'drive' ? 10 : 2;
      const frame = anim === 'drive' ? Math.min(n - 1, Math.floor((0.3 - e.swingT) * fps)) : Math.floor(e.t * fps) % n;
      const p = project(e.x, e.y);
      e.img
        .setTexture(e.y < 0 ? e.sheet.front : e.sheet.back, `${anim}_${Math.max(0, frame)}`)
        .setPosition(Math.round(p.sx), Math.round(p.sy) + (e.offsetY ?? 0))
        .setDepth(p.sy + (e.offsetY ? 1 : 0));
    }

    // Partido lentísimo de los jubilados.
    const sb = this.slowBall;
    if (sb && this.retirees.length === 2) {
      sb.u += (dt / 4.5) * sb.dir;
      if (sb.u >= 1 || sb.u <= 0) {
        sb.dir = sb.u >= 1 ? -1 : 1;
        sb.u = Math.max(0, Math.min(1, sb.u));
        this.retirees[sb.dir === -1 ? 1 : 0].swingT = 0.3;
      }
      const [a, b] = this.retirees;
      const x = a.x + (b.x - a.x) * sb.u + 0.4;
      const y = a.y + 0.4 + (b.y - a.y - 0.8) * sb.u;
      const z = 1 + Math.sin(Math.PI * sb.u) * 6;
      const g = project(x, y);
      const air = project(x, y, z);
      sb.img.setPosition(Math.round(air.sx), Math.round(air.sy)).setDepth(g.sy + 0.5);
      sb.shadow.setPosition(Math.round(g.sx), Math.round(g.sy)).setDepth(g.sy);
    }

    // Pickleball: POC... POC... POC...
    for (const pk of this.pickle) {
      pk.u += (dt / pk.dur) * pk.dir;
      if (pk.u >= 1 || pk.u <= 0) {
        pk.dir = pk.u >= 1 ? -1 : 1;
        pk.u = Math.max(0, Math.min(1, pk.u));
        (pk.dir === -1 ? pk.b : pk.a).swingT = 0.3;
        if (Math.random() < 0.7) sfx.poc();
      }
      const x = pk.a.x + (pk.b.x - pk.a.x) * pk.u;
      const y = pk.a.y + (pk.b.y - pk.a.y) * pk.u;
      const z = 0.9 + Math.sin(Math.PI * pk.u) * 1.6;
      const g = project(x, y);
      const air = project(x, y, z);
      pk.ball.setPosition(Math.round(air.sx), Math.round(air.sy)).setDepth(g.sy + 0.5);
    }

    // Nadadores.
    for (const sw of this.swimmers) {
      sw.y += sw.v * dt;
      if (Math.abs(sw.y) > 15) {
        sw.v = -sw.v;
        sw.y = Math.sign(sw.y) * 15;
      }
      const p = project(sw.x, sw.y);
      sw.img.setTexture(sw.key.replace('%', String(Math.floor(this.t * 3 + sw.x) % 2))).setPosition(Math.round(p.sx), Math.round(p.sy)).setDepth(p.sy);
    }

    // Hojas cayendo.
    for (const lf of this.leaves) {
      lf.t += dt;
      lf.x += (lf.vx + Math.sin(lf.t * 2) * 12) * dt;
      lf.y += lf.vy * dt;
      if (lf.y > 364 || lf.x > 644) {
        lf.x = Math.random() * 640 - 60;
        lf.y = -4;
      }
      lf.img.setPosition(Math.round(lf.x), Math.round(lf.y));
    }

    // Cosas que vuelan o caminan (pelota de fútbol, ardilla, ciervo, gansos, kayaks, bandeja).
    for (const fl of this.flyers) {
      fl.life -= dt;
      if (fl.img.texture.key === 'goose') {
        // Gansos: caminan despacio y cambian de rumbo.
        if (Math.random() < dt * 0.3) {
          fl.vx = (Math.random() - 0.5) * 0.8;
          fl.vy = (Math.random() - 0.5) * 0.8;
        }
        fl.x = Math.max(10.5, Math.min(16, fl.x + fl.vx * dt));
        fl.y = Math.max(-16, Math.min(16, fl.y + fl.vy * dt));
        fl.img.setFlipX(fl.vx < 0);
      } else if (fl.img.texture.key === 'deer') {
        // El ciervo camina, se para unos segundos a mirar con desdén y después sigue.
        const staring = fl.life < 16 && fl.life > 12;
        if (!staring) fl.y += fl.vy * dt;
        fl.img.setFlipX(!staring);
        if (fl.life < 4) fl.img.setAlpha(Math.max(0, fl.life / 4));
      } else {
        fl.x += fl.vx * dt;
        fl.y += fl.vy * dt;
        fl.z += fl.vz * dt;
        fl.vz -= 9 * dt;
        if (fl.z < 0) {
          fl.z = 0;
          fl.vz = Math.abs(fl.vz) * 0.5;
        }
        if (fl.img.texture.key.startsWith('kayak')) {
          if (fl.y > 26) fl.y = -26;
          if (fl.y < -26) fl.y = 26;
        }
      }
      const g = project(fl.x, fl.y);
      const air = project(fl.x, fl.y, fl.z);
      fl.img.setPosition(Math.round(air.sx), Math.round(air.sy)).setDepth(g.sy + 0.5);
      fl.img.setOrigin(0.5, 1);
    }
    this.flyers = this.flyers.filter((fl) => {
      if (fl.life > 0) return true;
      fl.img.destroy();
      return false;
    });

    // Bola de pickleball intrusa.
    const hz = m.venueEv.hazard;
    this.hazardImg.setVisible(!!hz);
    this.hazardShadow.setVisible(!!hz);
    if (hz) {
      const g = project(hz.x, hz.y);
      const air = project(hz.x, hz.y, hz.z);
      this.hazardImg.setPosition(Math.round(air.sx), Math.round(air.sy)).setDepth(g.sy + 0.6);
      this.hazardShadow.setPosition(Math.round(g.sx), Math.round(g.sy)).setDepth(g.sy + 0.4);
    }

    // Polen: estornudos.
    if (this.pollen.visible && this.sneezeT > 0) {
      this.sneezeT -= dt;
      if (this.sneezeT <= 0) {
        const p = m.players[Math.random() < 0.5 ? 0 : 1];
        const pos = project(p.x, p.y);
        this.bubble.show(T.venues.sneeze, Math.round(pos.sx), Math.round(pos.sy) - 56, 900);
        sfx.sneeze();
        this.sneezeT = 2.5 + Math.random() * 2;
      }
    }

    // Boss: las luces de la cancha se van prendiendo con el atardecer.
    if (this.lights.length) {
      const on = Math.min(this.lights.length, Math.floor(m.time / 30));
      this.lights.forEach((l, i) => l.setVisible(i < on));
    }
  }

  destroy(): void {
    this.bubble.hide();
  }
}

const PAL_YELLOW = '#f5c42c';
