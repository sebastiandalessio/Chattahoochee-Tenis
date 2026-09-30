// Qué tiene que definir cada personaje para que el generador de sprites lo dibuje.

import type { Build, Joints, Pose } from '../body';
import type { Painter } from '../painter';
import type { PixelImage } from '../pixelArt';

export interface HeadGrid {
  rows: string[];
  /** Punto del cuello dentro de la grilla (columna, fila). */
  anchor: [number, number];
}

export interface Accessory {
  rows: string[];
  palette: Record<string, string>;
  /** Desplazamiento respecto de la esquina de la cabeza. */
  offset: [number, number];
}

export interface Outfit {
  id: string;
  /** Color de la remera en un punto del torso: u = hacia la derecha del jugador, v = hacia abajo desde el cuello. */
  shirt: (u: number, v: number, view: 'back' | 'front') => string | null;
  sleeve: string;
  longSleeves?: boolean;
  shorts: string;
  longPants?: boolean;
  socks: string;
  shoes: string;
  headFront?: Accessory;
  headBack?: Accessory;
  /** Cabezas propias de este traje (por ejemplo, Volpi con gorra solo con la remera negra). */
  heads?: Partial<CharacterArt['heads']>;
  /** Detalles extra sobre el cuerpo (corbata, credencial, cinturón de herramientas). */
  extras?: (p: Painter, j: Joints, view: 'back' | 'front') => void;
}

export type Expression = 'normal' | 'win' | 'lose';

export interface CharacterArt {
  id: string;
  build: Build;
  skin: string;
  palette: Record<string, string>;
  heads: { front: HeadGrid; back: HeadGrid; frontShout?: HeadGrid };
  outfits: Outfit[];
  racket: { frame: string; grip: string };
  /** Extras que no juegan (guardavidas, mozo, chicos): sin raqueta. */
  noRacket?: boolean;
  twoHandedBackhand?: boolean;
  taunt?: Pose[];
  portrait: (expr: Expression, outfit: Outfit) => PixelImage;
}
