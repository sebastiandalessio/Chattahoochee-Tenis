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
};

export const CHARACTER_ORDER: CharacterId[] = ['elRosco', 'elSeba', 'trueTincho', 'volpi', 'elVikingo', 'angelito'];
