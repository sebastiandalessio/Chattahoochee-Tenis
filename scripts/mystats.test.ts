// Herramienta de ajuste (TUNE=1 npx vitest run): cuánto se completan las recetas y se usan los especiales.
import { it } from 'vitest';
import { createRng } from '../src/logic/rng';
import { CHARACTERS, CHARACTER_ORDER, type CharacterId } from '../src/game/characters';
import { CpuBrain } from '../src/sim/ai';
import { Match } from '../src/sim/match';
import { personalityFor } from '../src/sim/personalities';
import { RULES } from '../src/sim/rules';

it('mística', () => {
  const DT = 1 / 120;
  const stats: Record<string, { matches: number; won: number; specials: number; steps: Record<string, number>; taunts: number; minutes: number; points: number }> = {};
  for (const id of CHARACTER_ORDER) stats[id] = { matches: 0, won: 0, specials: 0, steps: {}, taunts: 0, minutes: 0, points: 0 };
  let seed = Number(process.env.SEED ?? 100);
  for (const a of CHARACTER_ORDER) {
    for (const b of CHARACTER_ORDER) {
      if (a === b) continue;
      const setup = (id: CharacterId) => ({ name: id, stats: CHARACTERS[id].stats, short: CHARACTERS[id].short, slowStart: CHARACTERS[id].slowStart, charId: id, human: false, errorMul: 1.15 * personalityFor(id).errorMul });
      const m = new Match({ rules: { gamesPerSet: 4 }, players: [setup(a), setup(b)], seed: seed++ });
      const rng = createRng(seed * 3);
      const brains = [new CpuBrain(0, personalityFor(a), rng), new CpuBrain(1, personalityFor(b), rng)];
      let t = 0;
      while (m.phase !== 'matchOver' && t < 3600) {
        m.step(DT, [brains[0].think(m, DT), brains[1].think(m, DT)]);
        t += DT;
        for (const e of m.drainEvents()) {
          const who = e.type === 'recipe' || e.type === 'special' || e.type === 'taunt' ? [a, b][e.side] : null;
          if (!who) continue;
          if (e.type === 'special') stats[who].specials++;
          if (e.type === 'taunt') stats[who].taunts++;
          if (e.type === 'recipe') {
            const step = RULES[who as CharacterId].recipe[e.step];
            stats[who].steps[step] = (stats[who].steps[step] ?? 0) + 1;
          }
        }
      }
      for (const [i, id] of [a, b].entries()) {
        stats[id].matches++;
        stats[id].minutes += t / 60;
        if (m.score.winner === i) stats[id].won++;
        stats[id].points += m.players[i].counters.pointsWon;
      }
    }
  }
  for (const [id, s] of Object.entries(stats)) {
    console.log(
      `${id.padEnd(11)} ganó ${s.won}/${s.matches}  especiales/partido ${(s.specials / s.matches).toFixed(2)}  cargadas/partido ${(s.taunts / s.matches).toFixed(1)}  min/partido ${(s.minutes / s.matches).toFixed(1)}  pasos: ${JSON.stringify(s.steps)}`,
    );
  }
});
