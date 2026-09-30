// Herramienta de ajuste (TUNE=1 npx vitest run scripts/servestats): cuántas faltas y dobles faltas
// hace cada personaje, y por qué (red, larga, ancha), en partidos CPU contra CPU.
import { it } from 'vitest';
import { createRng } from '../src/logic/rng';
import { CHARACTERS, CHARACTER_ORDER, type CharacterId } from '../src/game/characters';
import { CpuBrain } from '../src/sim/ai';
import { Match } from '../src/sim/match';
import { personalityFor } from '../src/sim/personalities';

it('saques', () => {
  const DT = 1 / 120;
  type S = { first: number; firstFault: number; second: number; df: number; reasons: Record<string, number>; powerSum: number; faultPowerSum: number; matches: number; kmh: number };
  const stats: Record<string, S> = {};
  for (const id of CHARACTER_ORDER) stats[id] = { first: 0, firstFault: 0, second: 0, df: 0, reasons: {}, powerSum: 0, faultPowerSum: 0, matches: 0, kmh: 0 };
  let seed = 500;
  for (let rep = 0; rep < 2; rep++)
    for (const a of CHARACTER_ORDER) {
      for (const b of CHARACTER_ORDER) {
        if (a === b) continue;
        const setup = (id: CharacterId) => ({ name: id, stats: CHARACTERS[id].stats, short: CHARACTERS[id].short, slowStart: CHARACTERS[id].slowStart, charId: id, human: false, errorMul: 1.15 * personalityFor(id).errorMul });
        const m = new Match({ rules: { gamesPerSet: 4 }, players: [setup(a), setup(b)], seed: seed++, venueEvents: false });
        const rng = createRng(seed * 7);
        const brains = [new CpuBrain(0, personalityFor(a), rng), new CpuBrain(1, personalityFor(b), rng)];
        let t = 0;
        let lastPower = 0;
        while (m.phase !== 'matchOver' && t < 3600) {
          m.step(DT, [brains[0].think(m, DT), brains[1].think(m, DT)]);
          t += DT;
          for (const e of m.drainEvents()) {
            if (e.type === 'serve') {
              const s = stats[[a, b][e.side]];
              if (m.attempt === 1) s.first++;
              else s.second++;
              s.powerSum += e.power;
              s.kmh += e.kmh;
              lastPower = e.power;
            }
            if (e.type === 'fault') {
              const s = stats[[a, b][e.side]];
              if (e.attempt === 1) s.firstFault++;
              else s.df++;
              const k = `${e.attempt}:${e.reason}`;
              s.reasons[k] = (s.reasons[k] ?? 0) + 1;
              s.faultPowerSum += lastPower;
            }
          }
        }
        stats[a].matches++;
        stats[b].matches++;
      }
    }
  for (const [id, s] of Object.entries(stats)) {
    const serves = s.first + s.second;
    console.log(
      `${id.padEnd(11)} 1er saque adentro ${(100 - (100 * s.firstFault) / s.first).toFixed(0)}%  2do adentro ${(100 - (100 * s.df) / Math.max(1, s.second)).toFixed(0)}%  dobles/partido ${(s.df / s.matches).toFixed(2)}  potencia media ${(s.powerSum / serves).toFixed(2)} (en faltas ${(s.faultPowerSum / Math.max(1, s.firstFault + s.df)).toFixed(2)})  km/h ${(s.kmh / serves).toFixed(0)}  ${JSON.stringify(s.reasons)}`,
    );
  }
}, 600000);
