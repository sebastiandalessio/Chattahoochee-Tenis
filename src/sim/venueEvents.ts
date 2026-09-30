// Eventos de las sedes durante el partido. Los que cambian el juego (repetir el punto, charco,
// piña, bola de pickleball) se resuelven acá; los de color los dibuja la escena.

import { COURT, facingOf } from '../logic/court';
import type { Side } from '../logic/scoring';
import type { Match } from './match';
import type { VenueDef, VenueEventId } from './venues';

export interface Zone {
  x: number;
  y: number;
  r: number;
}

export interface Hazard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  hitSides: Side[];
}

interface Scheduled {
  id: VenueEventId;
  /** Momento del punto (segundos desde el saque) en que pasa. */
  at: number;
  fired: boolean;
}

/** Eventos que pasan en pleno peloteo. Los demás arrancan al empezar el punto. */
const RALLY_EVENTS: VenueEventId[] = ['pelota', 'silbato', 'ardilla', 'pickleball', 'entrenador'];

export class VenueEvents {
  readonly venue: VenueDef | null;
  private m: Match;
  scheduled: Scheduled | null = null;
  /** Charco resbaladizo (bomba en la pileta), dura un punto. */
  puddle: Zone | null = null;
  /** Piña de pino en la cancha, dura un punto. */
  pina: Zone | null = null;
  /** Nube de polen: menos visibilidad durante el punto. */
  pollen = false;
  /** Don Ganso dormido: no canta este punto. */
  sleeping = false;
  hazard: Hazard | null = null;
  private rallyT = 0;
  private pointsSinceEvent = 0;
  /** Para pruebas: el próximo punto trae sí o sí este evento. */
  force: VenueEventId | null = null;

  constructor(m: Match, venue: VenueDef | null) {
    this.m = m;
    this.venue = venue;
  }

  /** fresh = punto nuevo; en el segundo saque (o un let) sigue todo como estaba. */
  onPointStart(fresh = true): void {
    this.rallyT = 0;
    this.hazard = null;
    if (!fresh) return;
    this.puddle = null;
    this.pina = null;
    this.pollen = false;
    this.sleeping = false;
    this.scheduled = null;
    const v = this.venue;
    if (!v || !this.m.eventsEnabled) return;
    this.pointsSinceEvent++;
    const forced = this.force;
    this.force = null;
    // No dos eventos seguidos.
    if (!forced && (this.pointsSinceEvent < 2 || !this.m.rng.chance(v.eventChance))) return;
    this.pointsSinceEvent = 0;
    const id = forced ?? this.m.rng.pick(v.events);
    const rng = this.m.rng;
    if (RALLY_EVENTS.includes(id)) {
      this.scheduled = { id, at: rng.range(0.9, 2.8), fired: false };
      return;
    }
    // Eventos que arrancan con el punto.
    if (id === 'bomba') {
      const side = rng.chance(0.5) ? 0 : 1;
      const f = facingOf(side as Side);
      this.puddle = { x: rng.range(-3, 3), y: -f * rng.range(5, 10), r: 1.5 };
      this.m.emit({ type: 'venue', id, stage: 'start', x: this.puddle.x, y: this.puddle.y });
    } else if (id === 'pina') {
      const f = rng.chance(0.5) ? 1 : -1;
      this.pina = { x: rng.range(-3.2, 3.2), y: f * rng.range(2.5, 9.5), r: 0.55 };
      this.m.emit({ type: 'venue', id, stage: 'start', x: this.pina.x, y: this.pina.y });
    } else if (id === 'polen') {
      this.pollen = true;
      this.m.emit({ type: 'venue', id, stage: 'start' });
    } else if (id === 'gansoDuerme') {
      this.sleeping = true;
      this.m.emit({ type: 'venue', id, stage: 'start' });
    } else {
      // ciervo, mozo, pregunta, gansoRoba: de color (los dibuja la escena).
      this.m.emit({ type: 'venue', id, stage: 'start' });
    }
  }

  step(dt: number): void {
    const m = this.m;
    if (m.phase === 'rally') this.rallyT += dt;
    const s = this.scheduled;
    if (s && !s.fired && m.phase === 'rally' && this.rallyT >= s.at) {
      s.fired = true;
      this.fire(s.id);
    }
    this.stepHazard(dt);
  }

  private fire(id: VenueEventId): void {
    const m = this.m;
    const rng = m.rng;
    if (id === 'pelota') {
      // Una pelota de fútbol entra desde el costado: "¡PELOTA!" y se repite el punto.
      const y = rng.range(-8, 8);
      m.emit({ type: 'venue', id, stage: 'start', x: -COURT.doublesHalfWidth - 3, y });
      m.forceReplay('pelota');
    } else if (id === 'ardilla') {
      // La ardilla se roba la pelota del piso: se repite el punto.
      m.emit({ type: 'venue', id, stage: 'start', x: m.ball.x, y: m.ball.y });
      m.forceReplay('ardilla');
    } else if (id === 'silbato') {
      // Pitó el guardavidas: los dos se quedan congelados un instante.
      for (const p of m.players) {
        p.mods.frozenT = Math.max(p.mods.frozenT, 0.5);
        p.mods.frozenAnim = 'idle';
      }
      m.emit({ type: 'venue', id, stage: 'start' });
    } else if (id === 'entrenador') {
      m.emit({ type: 'venue', id, stage: 'start' });
    } else if (id === 'pickleball') {
      // Una bola de pickleball cruza la cancha a la altura de uno de los jugadores.
      const target = m.players[rng.chance(0.5) ? 0 : 1];
      const fromLeft = rng.chance(0.5);
      this.hazard = {
        x: fromLeft ? -9 : 9,
        y: target.y,
        vx: (fromLeft ? 1 : -1) * rng.range(4.5, 6),
        vy: 0,
        z: 0.3,
        vz: 2.5,
        hitSides: [],
      };
      m.emit({ type: 'venue', id, stage: 'start', x: this.hazard.x, y: this.hazard.y });
    }
  }

  private stepHazard(dt: number): void {
    const h = this.hazard;
    if (!h) return;
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    h.z += h.vz * dt;
    h.vz -= 9 * dt;
    if (h.z < 0) {
      h.z = 0;
      h.vz = Math.abs(h.vz) * 0.6;
    }
    for (const p of this.m.players) {
      if (h.hitSides.includes(p.side)) continue;
      if (Math.hypot(p.x - h.x, p.y - h.y) < 0.55 && h.z < 0.6) {
        // No la esquivó: se tropieza.
        h.hitSides.push(p.side);
        p.mods.frozenT = Math.max(p.mods.frozenT, 0.7);
        p.mods.frozenAnim = 'lament';
        this.m.emit({ type: 'venue', id: 'pickleball', stage: 'hit', side: p.side, x: h.x, y: h.y });
      }
    }
    if (Math.abs(h.x) > 12) this.hazard = null;
  }

  /** ¿Está el jugador parado en el charco? */
  inPuddle(x: number, y: number): boolean {
    const z = this.puddle;
    return !!z && Math.hypot(x - z.x, y - z.y) < z.r;
  }

  /** Pique en musgo o en la piña: devuelve cómo cambia el pique, o null. */
  bounceZone(x: number, y: number): 'moss' | 'pina' | null {
    const pn = this.pina;
    if (pn && Math.hypot(x - pn.x, y - pn.y) < pn.r) return 'pina';
    for (const mz of this.venue?.moss ?? []) if (Math.hypot(x - mz.x, y - mz.y) < mz.r) return 'moss';
    return null;
  }
}
