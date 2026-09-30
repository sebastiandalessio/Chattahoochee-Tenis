// Arma las hojas de sprites (spritesheets) y los retratos de cada personaje.
// Lo usan el juego (en el navegador) y el script `npm run sprites` (que las guarda en PNG).

import { ANIM_ORDER, FRAME_H, FRAME_W, animFrames, drawFrame, type AnimName } from './body';
import { Painter } from './painter';
import type { PixelImage } from './pixelArt';
import { P_SIZE } from './portraitKit';
import type { CharacterArt, Expression, Outfit } from './characters/types';
import { elRoscoArt } from './characters/elRosco';
import { elSebaArt } from './characters/elSeba';
import { trueTinchoArt } from './characters/trueTincho';
import { volpiArt } from './characters/volpi';
import { elVikingoArt } from './characters/elVikingo';
import { angelitoArt } from './characters/angelito';

export const CHARACTER_ARTS: Record<string, CharacterArt> = {
  elRosco: elRoscoArt,
  elSeba: elSebaArt,
  trueTincho: trueTinchoArt,
  volpi: volpiArt,
  elVikingo: elVikingoArt,
  angelito: angelitoArt,
};

export const MAX_FRAMES = 4;
export const EXPRESSIONS: Expression[] = ['normal', 'win', 'lose'];

export interface SheetLayout {
  frameW: number;
  frameH: number;
  anims: Record<AnimName, { row: number; frames: number }>;
}

export function sheetKey(charId: string, outfitId: string, view: 'back' | 'front'): string {
  return `${charId}_${outfitId}_${view}`;
}

export function portraitKey(charId: string, outfitId: string): string {
  return `${charId}_${outfitId}_retrato`;
}

export function layoutFor(art: CharacterArt): SheetLayout {
  const anims = {} as SheetLayout['anims'];
  ANIM_ORDER.forEach((a, row) => {
    anims[a] = { row, frames: animFrames(art, a).length };
  });
  return { frameW: FRAME_W, frameH: FRAME_H, anims };
}

/** Hoja de sprites: una fila por animación, hasta 4 frames por fila. */
export function buildSheet(art: CharacterArt, outfit: Outfit, view: 'back' | 'front'): PixelImage {
  const sheet = new Painter(FRAME_W * MAX_FRAMES, FRAME_H * ANIM_ORDER.length);
  ANIM_ORDER.forEach((anim, row) => {
    animFrames(art, anim).forEach((pose, col) => {
      const frame = drawFrame(art, outfit, pose, view);
      sheet.paste(frame.img, col * FRAME_W, row * FRAME_H);
    });
  });
  return sheet.img;
}

/** Retratos: normal, ganando y perdiendo, uno al lado del otro. */
export function buildPortraits(art: CharacterArt, outfit: Outfit): PixelImage {
  const sheet = new Painter(P_SIZE * EXPRESSIONS.length, P_SIZE);
  EXPRESSIONS.forEach((e, i) => sheet.paste(art.portrait(e, outfit), i * P_SIZE, 0));
  return sheet.img;
}

/** Lámina de revisión: una fila por personaje con cuadros clave de cada animación. */
export function buildBoard(view: 'back' | 'front', outfitIndex = 0): PixelImage {
  const picks: [AnimName, number][] = [
    ['idle', 0],
    ['run', 0],
    ['drive', 0],
    ['drive', 1],
    ['drive', 2],
    ['backhand', 1],
    ['volley', 1],
    ['serve', 1],
    ['serve', 2],
    ['dive', 1],
    ['taunt', 1],
    ['lament', 1],
  ];
  const arts = Object.values(CHARACTER_ARTS);
  const board = new Painter(FRAME_W * picks.length, FRAME_H * arts.length);
  arts.forEach((art, row) => {
    const outfit = art.outfits[Math.min(outfitIndex, art.outfits.length - 1)];
    picks.forEach(([anim, i], col) => {
      const frames = animFrames(art, anim);
      const pose = frames[Math.min(i, frames.length - 1)];
      board.paste(drawFrame(art, outfit, pose, view).img, col * FRAME_W, row * FRAME_H);
    });
  });
  return board.img;
}

/** Todas las imágenes de todos los personajes y trajes (para exportar a PNG). */
export function allImages(): { name: string; img: PixelImage }[] {
  const out: { name: string; img: PixelImage }[] = [];
  for (const art of Object.values(CHARACTER_ARTS)) {
    for (const outfit of art.outfits) {
      for (const view of ['back', 'front'] as const) out.push({ name: sheetKey(art.id, outfit.id, view), img: buildSheet(art, outfit, view) });
      out.push({ name: portraitKey(art.id, outfit.id), img: buildPortraits(art, outfit) });
    }
  }
  return out;
}
