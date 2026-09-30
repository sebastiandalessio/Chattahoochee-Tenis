import Phaser from 'phaser';
import { flowMode } from '../game/autoplay';
import { makeBasicTextures } from '../game/textures';
import { CHARACTER_ORDER, type CharacterId } from '../game/characters';
import type { CharacterPick, MatchSetup } from '../game/setup';
import { preloadOverrides } from '../game/spriteTextures';
import { keyboard } from '../input/keyboard';
import { buildFonts } from '../ui/pixelFont';
import { unlockAudio } from '../audio/sfx';
import { isVenueId, type VenueId } from '../sim/venues';
import { BOSS_STEP, bossRivals, newTower, winStep } from '../game/tower';
import { newRelay } from '../game/bossRelay';
import type { BossCtx, TowerCtx } from '../game/flow';
import { save } from '../game/save';
import { mulberry } from './CharSelectScene';

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

    // Atajos para pruebas automáticas: ?demo=1&speed=4&games=2&seed=5&p1=volpi&p2=angelito&venue=stRegis
    const q = new URLSearchParams(window.location.search);
    if (this.flowShortcut(q)) return;
    if (q.has('demo') || q.has('play')) {
      const pickOf = (v: string | null): CharacterPick =>
        v && (CHARACTER_ORDER as string[]).includes(v) ? (v as CharacterId) : 'azar';
      const setup: Partial<MatchSetup> = {
        mode: q.has('demo') ? 'demo' : 'cpu',
        games: (Number(q.get('games')) || 2) as 2 | 4 | 6,
        difficulty: (Number(q.get('diff') ?? 1) || 0) as 0 | 1 | 2,
        venue: isVenueId(q.get('venue')) ? (q.get('venue') as VenueId) : 'sorteo',
        chars: [pickOf(q.get('p1')), pickOf(q.get('p2'))],
        speed: Number(q.get('speed')) || 1,
        seed: q.has('seed') ? Number(q.get('seed')) : undefined,
      };
      this.scene.start('match', setup);
      return;
    }
    this.scene.start('testMenu');
  }

  /**
   * Atajos para probar la torre y el Boss sin jugar todo:
   * ?select=1 · ?tower=volpi&step=2 · ?vs=volpi · ?duel=volpi · ?gameover=volpi
   * ?boss=volpi (llegada) · ?bossmatch=volpi · ?bosswin=volpi · ?ending=volpi
   */
  private flowShortcut(q: URLSearchParams): boolean {
    if (q.has('select')) {
      this.scene.start('select');
      return true;
    }
    const keys = ['tower', 'vs', 'duel', 'gameover', 'boss', 'bossmatch', 'bosswin', 'ending'] as const;
    const key = keys.find((k) => q.has(k));
    if (!key) return false;
    const who = q.get(key);
    const player: CharacterId = who && ([...CHARACTER_ORDER, 'donGanso'] as string[]).includes(who) ? (who as CharacterId) : 'elRosco';
    const seed = Number(q.get('seed') ?? 7);
    let run = newTower(player, Number(q.get('outfit') ?? 0), mulberry(seed), seed);
    const step = key.startsWith('boss') || key === 'ending' ? BOSS_STEP : Number(q.get('step') ?? 0);
    for (let i = 0; i < step; i++) run = winStep(run, '4-2');
    const ctx: TowerCtx = { run, used: [] };
    const rivals = bossRivals(run);
    const boss: BossCtx = { run, used: [], relay: newRelay(rivals), recipe: [false, false, false], fresh: true };
    const o = save().options;
    if (key === 'tower') this.scene.start('tower', { ctx });
    else if (key === 'vs') this.scene.start('vs', { ctx });
    else if (key === 'duel') this.scene.start('duel', { ctx });
    else if (key === 'gameover') this.scene.start('gameover', { tower: ctx });
    else if (key === 'boss') this.scene.start('bossIntro', { boss });
    else if (key === 'bossmatch')
      this.scene.start('match', { ...flowMode(), games: o.games, difficulty: o.difficulty, venue: 'chattahoochee', boss: { ...boss, fresh: false }, speed: Number(q.get('speed')) || 1 });
    else if (key === 'bosswin') this.scene.start('bossWin', { boss });
    else this.scene.start('ending', { boss });
    return true;
  }
}
