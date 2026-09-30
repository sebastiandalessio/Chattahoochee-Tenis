import Phaser from 'phaser';
import { makeBasicTextures } from '../game/textures';
import { CHARACTER_ORDER, type CharacterId } from '../game/characters';
import type { CharacterPick, MatchSetup } from '../game/setup';
import { preloadOverrides } from '../game/spriteTextures';
import { keyboard } from '../input/keyboard';
import { buildFonts } from '../ui/pixelFont';
import { unlockAudio } from '../audio/sfx';

/** Genera fuentes y texturas, y arranca (el menú, o directo un partido si la URL lo pide). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    // Sprites retocados a mano en public/sprites/override/ (si hay).
    preloadOverrides(this);
  }

  create(): void {
    buildFonts(this);
    makeBasicTextures(this);
    keyboard.install();
    unlockAudio();

    // Atajos para pruebas automáticas: ?demo=1&speed=4&games=2&seed=5&p1=volpi&p2=angelito
    const q = new URLSearchParams(window.location.search);
    if (q.has('demo') || q.has('play')) {
      const pickOf = (v: string | null): CharacterPick =>
        v && (CHARACTER_ORDER as string[]).includes(v) ? (v as CharacterId) : 'azar';
      const setup: Partial<MatchSetup> = {
        mode: q.has('demo') ? 'demo' : 'cpu',
        games: (Number(q.get('games')) || 2) as 2 | 4 | 6,
        difficulty: (Number(q.get('diff') ?? 1) || 0) as 0 | 1 | 2,
        surface: (q.get('surface') as MatchSetup['surface']) ?? 'hard',
        chars: [pickOf(q.get('p1')), pickOf(q.get('p2'))],
        speed: Number(q.get('speed')) || 1,
        seed: q.has('seed') ? Number(q.get('seed')) : undefined,
      };
      this.scene.start('match', setup);
      return;
    }
    this.scene.start('testMenu');
  }
}
