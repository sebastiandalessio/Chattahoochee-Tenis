// Fichas de los seis personajes: stats y datos de juego. Los textos están en src/texts/es.ts.

import type { Stats } from '../logic/stats';

export type CharacterId = 'elRosco' | 'elSeba' | 'trueTincho' | 'volpi' | 'elVikingo' | 'angelito' | 'donGanso';

export interface CharacterDef {
  id: CharacterId;
  club: 'independiente' | 'boca' | 'racing' | 'river' | 'neutral';
  stats: Stats;
  /** Más bajito: le cuesta llegar a las pelotas altas. */
  short?: boolean;
  /** Arranca lento (poca aceleración). */
  slowStart?: boolean;
}

const s = (velocidad: number, potencia: number, control: number, saque: number, volea: number, aire: number): Stats => ({
  velocidad,
  potencia,
  control,
  saque,
  volea,
  aire,
});

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  elRosco: {
    id: 'elRosco',
    club: 'independiente',
    stats: s(4, 7, 8, 7, 7, 4),
  },
  elSeba: {
    id: 'elSeba',
    club: 'boca',
    stats: s(7, 6, 5, 5, 8, 6),
  },
  trueTincho: {
    id: 'trueTincho',
    club: 'racing',
    stats: s(5, 6, 8, 6, 5, 7),
    slowStart: true,
  },
  volpi: {
    id: 'volpi',
    club: 'river',
    stats: s(5, 6, 7, 8, 5, 6),
  },
  elVikingo: {
    id: 'elVikingo',
    club: 'river',
    stats: s(6, 8, 7, 6, 4, 6),
  },
  angelito: {
    id: 'angelito',
    club: 'neutral',
    stats: s(8, 5, 4, 6, 6, 8),
    short: true,
  },
  // Secreto: se desbloquea ganando la torre con los seis.
  donGanso: {
    id: 'donGanso',
    club: 'neutral',
    stats: s(6, 5, 7, 6, 7, 6),
  },
};

/** Los seis Chattahoochees (los rivales de la torre y del Boss). */
export const CHARACTER_ORDER: CharacterId[] = ['elRosco', 'elSeba', 'trueTincho', 'volpi', 'elVikingo', 'angelito'];

/** El personaje secreto. */
export const SECRET_CHARACTER: CharacterId = 'donGanso';

/** Clásicos: Avellaneda (Rosco–Tincho) y Superclásico (Seba contra los de River). */
export function clasicoOf(a: CharacterId, b: CharacterId): 'avellaneda' | 'superclasico' | null {
  const clubs = [CHARACTERS[a].club, CHARACTERS[b].club].sort().join('-');
  if (clubs === 'independiente-racing') return 'avellaneda';
  if (clubs === 'boca-river') return 'superclasico';
  return null;
}
