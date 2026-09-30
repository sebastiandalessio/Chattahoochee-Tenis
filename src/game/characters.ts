// Fichas de los seis personajes: stats y datos de juego. Los textos están en src/texts/es.ts.

import type { Stats } from '../logic/stats';

export type CharacterId = 'elRosco' | 'elSeba' | 'trueTincho' | 'volpi' | 'elVikingo' | 'angelito';

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
    stats: s(3, 6, 7, 5, 5, 3),
  },
  elSeba: {
    id: 'elSeba',
    club: 'boca',
    stats: s(8, 6, 4, 5, 9, 7),
  },
  trueTincho: {
    id: 'trueTincho',
    club: 'racing',
    stats: s(4, 6, 9, 6, 5, 9),
    slowStart: true,
  },
  volpi: {
    id: 'volpi',
    club: 'river',
    stats: s(5, 5, 7, 9, 5, 6),
  },
  elVikingo: {
    id: 'elVikingo',
    club: 'river',
    stats: s(5, 8, 7, 6, 4, 7),
  },
  angelito: {
    id: 'angelito',
    club: 'neutral',
    stats: s(9, 4, 3, 4, 5, 8),
    short: true,
  },
};

export const CHARACTER_ORDER: CharacterId[] = ['elRosco', 'elSeba', 'trueTincho', 'volpi', 'elVikingo', 'angelito'];
