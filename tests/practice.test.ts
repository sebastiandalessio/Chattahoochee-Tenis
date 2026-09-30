import { describe, expect, it } from 'vitest';
import { createRng } from '../src/logic/rng';
import { CHARACTERS } from '../src/game/characters';
import { BASIC_AI, CpuBrain } from '../src/sim/ai';
import { emptyInput } from '../src/sim/input';
import { Match, type MatchEvent } from '../src/sim/match';

describe('práctica con Betty', () => {
  it('Betty tira, se cuentan devoluciones y rachas, y no hay tanteador', () => {
    const m = new Match({
      practice: true,
      venue: 'breckenridge',
      venueEvents: false,
      firstServer: 1,
      players: [
        { name: 'VOS', stats: CHARACTERS.volpi.stats, charId: 'volpi', human: false },
        { name: 'BETTY', stats: CHARACTERS.volpi.stats, human: false },
      ],
      seed: 3,
    });
    const brain = new CpuBrain(0, BASIC_AI, createRng(9));
    const events: MatchEvent[] = [];
    const DT = 1 / 120;
    for (let t = 0; t < 120; t += DT) {
      m.step(DT, [brain.think(m, DT), emptyInput()]);
      events.push(...m.drainEvents());
    }
    const feeds = events.filter((e) => e.type === 'feed');
    const results = events.filter((e) => e.type === 'practice');
    expect(feeds.length).toBeGreaterThan(20);
    expect(results.length).toBeGreaterThan(15);
    expect(m.practiceStats.returns).toBeGreaterThan(5);
    expect(m.practiceStats.best).toBeGreaterThanOrEqual(2);
    // Betty cambió de programa en el camino.
    expect(results.some((e) => e.type === 'practice' && e.newProgram)).toBe(true);
    // Sin tanteador: nadie suma games.
    expect(m.score.games).toEqual([0, 0]);
    expect(events.some((e) => e.type === 'fault')).toBe(false);
    // Betty no se mueve de su lugar.
    expect(Math.abs(m.players[1].y)).toBeGreaterThan(11);
  });
});
