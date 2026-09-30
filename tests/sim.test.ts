import { describe, expect, it } from 'vitest';
import { createRng } from '../src/logic/rng';
import { NEUTRAL_STATS } from '../src/logic/stats';
import { BASIC_AI, CpuBrain } from '../src/sim/ai';
import { Match, type MatchEvent } from '../src/sim/match';

const DT = 1 / 120;

function cpuMatch(seed: number, games = 2) {
  const m = new Match({
    rules: { gamesPerSet: games },
    players: [
      { name: 'A', stats: NEUTRAL_STATS, human: false },
      { name: 'B', stats: NEUTRAL_STATS, human: false },
    ],
    seed,
  });
  const rng = createRng(seed + 1);
  const brains = [new CpuBrain(0, BASIC_AI, rng), new CpuBrain(1, BASIC_AI, rng)];
  const events: MatchEvent[] = [];
  let t = 0;
  while (m.phase !== 'matchOver' && t < 60 * 30) {
    const inputs = [brains[0].think(m, DT), brains[1].think(m, DT)] as const;
    m.step(DT, [inputs[0], inputs[1]]);
    events.push(...m.drainEvents());
    t += DT;
    for (const p of m.players) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
    expect(Number.isFinite(m.ball.x + m.ball.y + m.ball.z)).toBe(true);
  }
  return { m, events, t };
}

describe('partido CPU contra CPU', () => {
  it('se juega completo y termina con un ganador', () => {
    const { m, events } = cpuMatch(7);
    expect(m.phase).toBe('matchOver');
    expect(m.score.winner).not.toBeNull();
    const points = events.filter((e) => e.type === 'point');
    expect(points.length).toBeGreaterThan(7);
  });

  it('hay peloteos de verdad (no todo es error o ace)', () => {
    let rallies = 0;
    let points = 0;
    for (const seed of [1, 2, 3]) {
      const { events } = cpuMatch(seed);
      for (const e of events) {
        if (e.type === 'point') {
          points++;
          if (e.rally >= 4) rallies++;
        }
      }
    }
    expect(rallies / points).toBeGreaterThan(0.2);
  });
});
