// Las sedes: superficie, límites de la cancha y eventos que pueden pasar en cada una.
// Datos puros (la escenografía se dibuja en src/art/venueArt.ts y src/game/venueFx.ts).

import { SURFACES, type Surface } from '../logic/physics';

export type VenueId = 'breckenridge' | 'springRidge' | 'stRegis' | 'chattahoochee';

export type VenueEventId =
  | 'pelota' // Breckenridge: pelota de fútbol del playground → se repite el punto
  | 'silbato' // Breckenridge: el silbato del guardavidas confunde a todos
  | 'bomba' // Breckenridge: alguien se tira de bomba a la pileta → charco resbaladizo
  | 'ardilla' // Spring Ridge: una ardilla se roba la pelota
  | 'pina' // Spring Ridge: cae una piña en la cancha
  | 'polen' // Spring Ridge: nube de polen amarillo
  | 'ciervo' // Spring Ridge: pasa un ciervo mirando con desdén
  | 'entrenador' // Spring Ridge: el entrenador de natación grita cosas
  | 'pickleball' // St. Regis: entra una bola de pickleball y hay que esquivarla
  | 'pregunta' // St. Regis: "¿Nos prestan la cancha cuando terminen?"
  | 'mozo' // St. Regis: un mozo cruza con limonadas
  | 'gansoDuerme' // Don Ganso se duerme
  | 'gansoRoba'; // Don Ganso se roba una pelota

export interface VenueDef {
  id: VenueId;
  surface: Surface;
  /** Alambrado cerca del fondo (St. Regis): la pelota rebota. */
  fenceY?: number;
  /** Probabilidad de que pase un evento en cada punto. */
  eventChance: number;
  events: VenueEventId[];
  /** Tramos de musgo (sede del Boss): pique bajo y lento. */
  moss?: { x: number; y: number; r: number }[];
}

const GANSO: VenueEventId[] = ['gansoDuerme', 'gansoRoba'];

export const VENUES: Record<VenueId, VenueDef> = {
  breckenridge: {
    id: 'breckenridge',
    // Cemento verde y azul: pique medio y rápido.
    surface: { id: 'breckenridge', restitution: 0.74, friction: 0.83, slide: 0 },
    eventChance: 0.16,
    events: ['pelota', 'silbato', 'bomba', ...GANSO],
  },
  springRidge: {
    id: 'springRidge',
    // Polvo verde: más lento y más alto; los jugadores se deslizan.
    surface: { ...SURFACES.clay, id: 'springRidge' },
    eventChance: 0.18,
    events: ['ardilla', 'pina', 'polen', 'ciervo', 'entrenador', ...GANSO],
  },
  stRegis: {
    id: 'stRegis',
    // Cemento azul: la más rápida. Poco lugar atrás: la pelota rebota en el alambrado.
    surface: { ...SURFACES.fast, id: 'stRegis' },
    fenceY: 14.2,
    eventChance: 0.16,
    events: ['pickleball', 'pregunta', 'mozo', ...GANSO],
  },
  chattahoochee: {
    id: 'chattahoochee',
    // Cemento con tramos de musgo.
    surface: { id: 'chattahoochee', restitution: 0.74, friction: 0.8, slide: 0.05 },
    eventChance: 0.2,
    events: ['pelota', 'silbato', 'bomba', 'ardilla', 'pina', 'polen', 'ciervo', 'pickleball', 'mozo', ...GANSO],
    moss: [
      { x: -3.1, y: -9.2, r: 1.1 },
      { x: 2.4, y: 4.6, r: 1.0 },
      { x: 3.4, y: -3.0, r: 0.8 },
      { x: -2.6, y: 9.8, r: 0.9 },
    ],
  },
};

export const VENUE_ORDER: VenueId[] = ['breckenridge', 'springRidge', 'stRegis'];

export function isVenueId(v: unknown): v is VenueId {
  return typeof v === 'string' && v in VENUES;
}
