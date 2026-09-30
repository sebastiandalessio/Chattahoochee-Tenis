// Texturas de personajes para Phaser: se generan desde el código (src/art/) al empezar un partido.
// Si en public/sprites/override/ hay un PNG con el mismo nombre, se usa ese en lugar del generado.

import Phaser from 'phaser';
import { ANIM_ORDER, FRAME_H, FRAME_W } from '../art/body';
import { CHARACTER_ARTS, buildPortraits, buildSheet, layoutFor, portraitKey, sheetKey } from '../art/sheets';
import { imageToCanvas } from './textures';
import type { CharacterId } from './characters';

// Los PNG de reemplazo se empaquetan con el juego (en el archivo único quedan embebidos).
const OVERRIDES = import.meta.glob('/public/sprites/override/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function overrideUrl(name: string): string | undefined {
  return OVERRIDES[`/public/sprites/override/${name}.png`];
}

/** Carga (en el preload de una escena) todos los PNG de reemplazo que existan. */
export function preloadOverrides(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(OVERRIDES)) {
    const name = path.split('/').pop()!.replace('.png', '');
    scene.load.image(`ovr_${name}`, url);
  }
}

function addFrames(tex: Phaser.Textures.Texture, frames: { name: string; x: number; y: number; w: number; h: number }[]): void {
  for (const f of frames) tex.add(f.name, 0, f.x, f.y, f.w, f.h);
}

function useSource(scene: Phaser.Scene, key: string, make: () => HTMLCanvasElement): Phaser.Textures.Texture {
  if (scene.textures.exists(key)) return scene.textures.get(key);
  const ovr = `ovr_${key}`;
  let tex: Phaser.Textures.Texture;
  if (scene.textures.exists(ovr)) {
    const src = scene.textures.get(ovr).getSourceImage() as HTMLImageElement;
    tex = scene.textures.addImage(key, src)!;
  } else {
    tex = scene.textures.addCanvas(key, make())!;
  }
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return tex;
}

export interface CharacterTextures {
  back: string;
  front: string;
  portrait: string;
  frames: Record<string, number>;
}

/** Genera (una sola vez) las hojas de un personaje con un traje. Frames: "<anim>_<n>". */
export function ensureCharacterTextures(scene: Phaser.Scene, id: CharacterId, outfitIndex = 0): CharacterTextures {
  const art = CHARACTER_ARTS[id];
  const outfit = art.outfits[Math.min(outfitIndex, art.outfits.length - 1)];
  const layout = layoutFor(art);
  const frameList: { name: string; x: number; y: number; w: number; h: number }[] = [];
  const counts: Record<string, number> = {};
  ANIM_ORDER.forEach((anim, row) => {
    const n = layout.anims[anim].frames;
    counts[anim] = n;
    for (let i = 0; i < n; i++) frameList.push({ name: `${anim}_${i}`, x: i * FRAME_W, y: row * FRAME_H, w: FRAME_W, h: FRAME_H });
  });
  const keys = {
    back: sheetKey(id, outfit.id, 'back'),
    front: sheetKey(id, outfit.id, 'front'),
    portrait: portraitKey(id, outfit.id),
  };
  for (const view of ['back', 'front'] as const) {
    const key = keys[view];
    if (scene.textures.exists(key)) continue;
    const tex = useSource(scene, key, () => imageToCanvas(buildSheet(art, outfit, view)));
    addFrames(tex, frameList);
  }
  if (!scene.textures.exists(keys.portrait)) {
    const tex = useSource(scene, keys.portrait, () => imageToCanvas(buildPortraits(art, outfit)));
    addFrames(tex, ['normal', 'win', 'lose'].map((name, i) => ({ name, x: i * 96, y: 0, w: 96, h: 96 })));
  }
  return { ...keys, frames: counts };
}

/** Por si alguna hoja de reemplazo se quiere revisar: dice si hay override cargado. */
export function hasOverride(name: string): boolean {
  return !!overrideUrl(name);
}
