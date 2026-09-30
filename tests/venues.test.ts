import { describe, expect, it } from 'vitest';
import { Rally } from '../src/logic/referee';
import { createRng } from '../src/logic/rng';
import { CHARACTERS, type CharacterId } from '../src/game/characters';
import { CpuBrain } from '../src/sim/ai';
import { Match, type MatchEvent } from '../src/sim/match';
import { personalityFor } from '../src/sim/personalities';
import { VENUES, type VenueId } from '../src/sim/venues';

const DT = 1 / 120;

function play(venue: VenueId, a: CharacterId, b: CharacterId, seed: number) {
  const setup = (id: CharacterId) => ({ name: id, stats: CHARACTERS[id].stats, charId: id, human: false, short: CHARACTERS[id].short });
  const m = new Match({ rules: { gamesPerSet: 2 }, venue, players: [setup(a), setup(b)], seed });
  // Más eventos que lo normal para probarlos todos.
  (m.venue as { eventChance: number }).eventChance = 0.9;
  const rng = createRng(seed + 99);
  const brains = [new CpuBrain(0, personalityFor(a), rng), new CpuBrain(1, personalityFor(b), rng)];
  const events: MatchEvent[] = [];
  let t = 0;
  while (m.phase !== 'matchOver' && t < 60 * 30) {
    m.step(DT, [brains[0].think(m, DT), brains[1].think(m, DT)]);
    events.push(...m.drainEvents());
    t += DT;
    const bl = m.ball;
    if (!Number.isFinite(bl.x + bl.y + bl.z)) throw new Error('pelota con NaN');
    for (const p of m.players) {
      if (!Number.isFinite(p.x + p.y)) throw new Error('jugador con NaN');
      if (m.venue?.fenceY) expect(Math.abs(p.y)).toBeLessThanOrEqual(m.venue.fenceY);
    }
  }
  // Restaurar la probabilidad original (los datos de las sedes son compartidos).
  return { m, events };
}

describe('alambrado de St. Regis', () => {
  it('pegar en el alambrado sin picar es afuera', () => {
    const r = new Rally(0, 'deuce');
    r.onServe();
    r.onBounce(-2, -4);
    r.onHit(1);
    expect(r.onFence()).toMatchObject({ type: 'point', winner: 0, reason: 'out' });
  });
  it('después de un pique bueno, el punto es de quien pegó', () => {
    const r = new Rally(0, 'deuce');
    r.onServe();
    r.onBounce(-2, -4);
    r.onHit(1);
    r.onBounce(1, 10);
    expect(r.onFence()).toMatchObject({ type: 'point', winner: 1, reason: 'winner' });
  });
});

describe('partidos en las cuatro sedes, con eventos', () => {
  const original = Object.fromEntries(Object.entries(VENUES).map(([k, v]) => [k, v.eventChance]));
  const cases: [VenueId, CharacterId, CharacterId][] = [
    ['breckenridge', 'elRosco', 'elSeba'],
    ['springRidge', 'trueTincho', 'volpi'],
    ['stRegis', 'elVikingo', 'angelito'],
    ['chattahoochee', 'elSeba', 'trueTincho'],
  ];
  for (const [venue, a, b] of cases) {
    it(`${venue}: termina y pasan eventos`, () => {
      const { m, events } = play(venue, a, b, 5);
      VENUES[venue].eventChance = original[venue];
      expect(m.phase).toBe('matchOver');
      const venueEvents = events.filter((e) => e.type === 'venue');
      expect(venueEvents.length).toBeGreaterThan(2);
      // Los eventos pertenecen a la sede.
      for (const e of venueEvents) if (e.type === 'venue') expect(VENUES[venue].events).toContain(e.id);
      if (venue === 'stRegis') expect(events.some((e) => e.type === 'fence')).toBe(true);
    });
  }

  it('repetir el punto no suma para nadie', () => {
    const { events } = play('breckenridge', 'volpi', 'angelito', 12);
    VENUES.breckenridge.eventChance = original.breckenridge;
    const replays = events.filter((e) => e.type === 'replay').length;
    const points = events.filter((e) => e.type === 'point').length;
    const scoreEvents = events.filter((e) => e.type === 'score').length;
    expect(scoreEvents).toBe(points);
    expect(replays).toBeGreaterThanOrEqual(0);
  });
});

describe('eventos de sede y el segundo saque', () => {
  const setup = (id: CharacterId) => ({ name: id, stats: CHARACTERS[id].stats, charId: id, human: false, short: CHARACTERS[id].short });

  it('el evento llega después del pointStart (la escena limpia y después dibuja)', () => {
    const m = new Match({ rules: { gamesPerSet: 2 }, venue: 'breckenridge', players: [setup('elRosco'), setup('elSeba')], seed: 3 });
    m.drainEvents();
    m.venueEv.force = 'bomba';
    m.venueEv.onPointStart(true);
    m.emit({ type: 'pointStart', server: 0, serveSide: 'deuce', attempt: 1, fresh: true });
    expect(m.venueEv.puddle).not.toBeNull();
    // Y en la simulación real: forzar y jugar hasta el próximo punto.
    const m2 = new Match({ rules: { gamesPerSet: 2 }, venue: 'breckenridge', players: [setup('elRosco'), setup('elSeba')], seed: 4 });
    m2.venueEv.force = 'polen';
    const rng = createRng(1);
    const brains = [new CpuBrain(0, personalityFor('elRosco'), rng), new CpuBrain(1, personalityFor('elSeba'), rng)];
    const seen: MatchEvent[] = [];
    for (let t = 0; t < 40 && !seen.some((e) => e.type === 'venue'); t += DT) {
      m2.step(DT, [brains[0].think(m2, DT), brains[1].think(m2, DT)]);
      seen.push(...m2.drainEvents());
    }
    const iv = seen.findIndex((e) => e.type === 'venue');
    expect(iv).toBeGreaterThan(0);
    const before = seen.slice(0, iv).reverse().find((e) => e.type === 'pointStart');
    expect(before && before.type === 'pointStart' && before.fresh).toBe(true);
  });

  it('en el segundo saque el charco y el ganso dormido siguen', () => {
    const m = new Match({ rules: { gamesPerSet: 2 }, venue: 'breckenridge', players: [setup('elRosco'), setup('elSeba')], seed: 3 });
    m.venueEv.force = 'bomba';
    m.venueEv.onPointStart(true);
    const puddle = m.venueEv.puddle;
    expect(puddle).not.toBeNull();
    m.venueEv.onPointStart(false);
    expect(m.venueEv.puddle).toBe(puddle);
    m.venueEv.force = 'gansoDuerme';
    m.venueEv.onPointStart(true);
    expect(m.venueEv.puddle).toBeNull();
    expect(m.venueEv.sleeping).toBe(true);
    m.venueEv.onPointStart(false);
    expect(m.venueEv.sleeping).toBe(true);
    m.venueEv.onPointStart(true);
    expect(m.venueEv.sleeping).toBe(false);
  });
});
