import Phaser from 'phaser';
import { makeBasicTextures } from '../game/textures';
import type { MatchSetup } from '../game/setup';
import { keyboard } from '../input/keyboard';
import { buildFonts } from '../ui/pixelFont';
import { unlockAudio } from '../audio/sfx';

/** Genera fuentes y texturas, y arranca (el menú, o directo un partido si la URL lo pide). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    buildFonts(this);
    makeBasicTextures(this);
    keyboard.install();
    unlockAudio();

    // Atajos para pruebas automáticas: ?demo=1&speed=4&games=2&seed=5
    const q = new URLSearchParams(window.location.search);
    if (q.has('demo') || q.has('play')) {
      const setup: Partial<MatchSetup> = {
        mode: q.has('demo') ? 'demo' : 'cpu',
        games: (Number(q.get('games')) || 2) as 2 | 4 | 6,
        difficulty: (Number(q.get('diff') ?? 1) || 0) as 0 | 1 | 2,
        surface: (q.get('surface') as MatchSetup['surface']) ?? 'hard',
        speed: Number(q.get('speed')) || 1,
        seed: q.has('seed') ? Number(q.get('seed')) : undefined,
      };
      this.scene.start('match', setup);
      return;
    }
    this.scene.start('testMenu');
  }
}
