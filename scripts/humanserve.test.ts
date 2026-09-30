// Herramienta de ajuste (TUNE=1 npx vitest run scripts/humanserve): saques "humanos". Se tira la
// pelota y se le pega cuando el medidor llega a cierta potencia (subiendo o bajando, como hace una
// persona), y se mide qué porcentaje entra según el personaje.
import { it } from 'vitest';
import { CHARACTERS, CHARACTER_ORDER, type CharacterId } from '../src/game/characters';
import { Match } from '../src/sim/match';
import { emptyInput, type PlayerInput } from '../src/sim/input';

it('saque humano', () => {
  const DT = 1 / 120;
  const powers = [0.25, 0.45, 0.65, 0.85];
  for (const id of CHARACTER_ORDER) {
    const row: string[] = [];
    for (const target of powers) {
      let serves = 0;
      let faults = 0;
      let doubles = 0;
      const reasons: Record<string, number> = {};
      let heights = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const setup = (c: CharacterId) => ({ name: c, stats: CHARACTERS[c].stats, short: CHARACTERS[c].short, charId: c, human: true, serveMeterHalfPeriod: 0.42 });
        const m = new Match({ rules: { gamesPerSet: 99 }, players: [setup(id), setup('elSeba')], seed: seed * 31, venueEvents: false, firstServer: 0 });
        let t = 0;
        let pressed = false;
        let wasToss = false;
        let hitHeld = false;
        while (serves < seed * 25 && t < 3000) {
          const inp: [PlayerInput, PlayerInput] = [emptyInput(), emptyInput()];
          const srv = m.rally.server;
          // Solo saca el personaje medido: el otro no hace nada (y pierde sus saques por tiempo... no:
          // se lo hace sacar también, pero no se cuenta).
          if (m.phase === 'preServe' && m.phaseT > 0.4 && !hitHeld) inp[srv].hit = true;
          if (m.phase === 'toss') {
            if (!wasToss) pressed = false;
            // Le pega cuando el medidor pasa por la potencia buscada (subiendo o bajando).
            if (!pressed && Math.abs(m.meter - target) < 0.04 && m.ball.z >= 1.7 && !hitHeld) {
              inp[srv].hit = true;
              // Apuntando: a veces abierto, a veces a la T, a veces al medio.
              inp[srv].moveX = [-1, 0, 1][(serves + seed) % 3];
              pressed = true;
              if (srv === 0) heights += m.ball.z;
            }
          }
          wasToss = m.phase === 'toss';
          hitHeld = inp[srv].hit;
          m.step(DT, inp);
          t += DT;
          for (const e of m.drainEvents()) {
            if (e.type === 'serve' && e.side === 0) serves++;
            if (e.type === 'fault' && e.side === 0) {
              faults++;
              if (e.attempt === 2) doubles++;
              reasons[e.reason] = (reasons[e.reason] ?? 0) + 1;
            }
          }
        }
      }
      row.push(`p${target}: ${(100 - (100 * faults) / serves).toFixed(0)}% adentro, dobles ${doubles} ${JSON.stringify(reasons)}`);
    }
    console.log(id.padEnd(11), row.join('  |  '));
  }
}, 600000);
