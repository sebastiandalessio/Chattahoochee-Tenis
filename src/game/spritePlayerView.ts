// Jugador dibujado con su sprite: elige el cuadro de la hoja según lo que está haciendo en la simulación.

import Phaser from 'phaser';
import { ANIM_FPS } from '../art/body';
import type { Match, PlayerSim } from '../sim/match';
import { project } from './projection';
import type { CharacterTextures } from './spriteTextures';
import type { PlayerView } from './playerView';

const ORIGIN_X = 24 / 48;
const ORIGIN_Y = 60 / 64;

export class SpritePlayerView implements PlayerView {
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.BitmapText | null;
  private tex: CharacterTextures;
  private key: string;

  constructor(scene: Phaser.Scene, side: 0 | 1, tex: CharacterTextures, label: Phaser.GameObjects.BitmapText | null) {
    this.tex = tex;
    // El de abajo se ve de espaldas; el de arriba, de frente.
    this.key = side === 0 ? tex.back : tex.front;
    this.shadow = scene.add.image(0, 0, 'pshadow').setAlpha(0.35);
    this.sprite = scene.add.image(0, 0, this.key, 'idle_0').setOrigin(ORIGIN_X, ORIGIN_Y);
    this.label = label;
  }

  private frame(anim: string, i: number): string {
    const n = this.tex.frames[anim] ?? 1;
    return `${anim}_${Math.max(0, Math.min(n - 1, i))}`;
  }

  private loop(anim: keyof typeof ANIM_FPS, t: number, speed = 1): string {
    const n = this.tex.frames[anim] ?? 1;
    return `${anim}_${Math.floor(t * ANIM_FPS[anim] * speed) % n}`;
  }

  update(p: PlayerSim, m: Match): void {
    const { sx, sy } = project(p.x, p.y);
    const x = Math.round(sx);
    const y = Math.round(sy);
    const t = p.animT;
    let flip = false;
    let frame: string;
    switch (p.anim) {
      case 'run': {
        const speed = Math.hypot(p.vx, p.vy) / p.phys.maxSpeed;
        frame = this.loop('run', t, 0.7 + speed * 0.5);
        break;
      }
      case 'prep': {
        // Preparado: raqueta atrás del lado por donde viene la pelota.
        const forehand = (m.ball.x - p.x) * p.rightSign >= 0;
        frame = this.frame(forehand ? 'drive' : 'backhand', 0);
        break;
      }
      case 'drive':
      case 'backhand':
      case 'whiff': {
        const anim = p.anim === 'backhand' ? 'backhand' : 'drive';
        const k = p.anim === 'whiff' ? 0.07 : 0.09;
        frame = this.frame(anim, t < k * 0.6 ? 0 : t < k * 1.8 ? 1 : 2);
        break;
      }
      case 'volley':
        frame = this.frame('volley', t < 0.08 ? 0 : 1);
        break;
      case 'smash':
      case 'serve':
        frame = this.frame('serve', t < 0.09 ? 2 : 3);
        break;
      case 'toss':
        frame = this.frame('serve', m.ball.vz > 0.8 ? 0 : 1);
        break;
      case 'dive': {
        frame = this.frame('dive', p.diveT > 0 ? 0 : 1);
        // Los cuadros de palomita vuelan hacia la derecha de espaldas y hacia la izquierda de frente.
        const dir = Math.sign(p.vx) || 1;
        flip = p.side === 0 ? dir < 0 : dir > 0;
        break;
      }
      case 'celebrate':
        frame = this.loop('taunt', t);
        break;
      case 'lament':
        frame = this.loop('lament', t);
        break;
      default:
        frame = this.loop('idle', t);
    }
    this.sprite.setFrame(frame).setFlipX(flip).setPosition(x, y).setDepth(y);
    this.shadow.setPosition(x, y).setDepth(y - 0.5);
    if (this.label) this.label.setPosition(Math.round(x - this.label.width / 2), y - 58).setDepth(5000);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.label?.destroy();
  }
}
