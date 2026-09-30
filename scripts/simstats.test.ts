// Herramienta de ajuste (no es un test de verdad): corre muchos partidos CPU vs CPU e imprime estadísticas.
// Uso: npx vitest run scripts/simstats.test.ts --config vite.config.ts --dir scripts
import { it } from 'vitest';
import { createRng } from '../src/logic/rng';
import { NEUTRAL_STATS } from '../src/logic/stats';
import { BASIC_AI, CpuBrain } from '../src/sim/ai';
import { Match } from '../src/sim/match';

it('estadísticas', () => {
  const DT = 1 / 120;
  const reasons: Record<string, number> = {};
  const rallies: number[] = [];
  let faults = 0;
  let serves = 0;
  let dives = 0;
  let whiffs = 0;
  let unforced = 0;
  let hits = 0;
  const kinds: Record<string, number> = {};
  let simTime = 0;
  let pointsTotal = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const m = new Match({
      rules: { gamesPerSet: 4 },
      players: [
        { name: 'A', stats: NEUTRAL_STATS, human: false, errorMul: 1.2 },
        { name: 'B', stats: NEUTRAL_STATS, human: false, errorMul: 1.2 },
      ],
      seed,
    });
    const rng = createRng(seed * 13);
    const brains = [new CpuBrain(0, BASIC_AI, rng), new CpuBrain(1, BASIC_AI, rng)];
    let t = 0;
    while (m.phase !== 'matchOver' && t < 3600) {
      m.step(DT, [brains[0].think(m, DT), brains[1].think(m, DT)]);
      t += DT;
      for (const e of m.drainEvents()) {
        if (e.type === 'point') {
          reasons[e.reason] = (reasons[e.reason] ?? 0) + 1;
          rallies.push(e.rally);
          if (e.unforced) unforced++;
          pointsTotal++;
        }
        if (e.type === 'fault') faults++;
        if (e.type === 'serve') serves++;
        if (e.type === 'dive') dives++;
        if (e.type === 'whiff') whiffs++;
        if (e.type === 'hit') {
          hits++;
          kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
        }
      }
    }
    simTime += t;
  }
  rallies.sort((a, b) => a - b);
  const avg = rallies.reduce((a, b) => a + b, 0) / rallies.length;
  console.log(
    JSON.stringify(
      {
        points: pointsTotal,
        minutesPerMatch: +(simTime / 12 / 60).toFixed(1),
        avgRally: +avg.toFixed(2),
        medianRally: rallies[Math.floor(rallies.length / 2)],
        maxRally: rallies[rallies.length - 1],
        reasons,
        faultPct: +((faults / serves) * 100).toFixed(1),
        unforcedPct: +((unforced / pointsTotal) * 100).toFixed(1),
        dives,
        whiffs,
        hits,
        kinds,
      },
      null,
      1,
    ),
  );
});
