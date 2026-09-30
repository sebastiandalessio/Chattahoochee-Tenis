import { describe, expect, it } from 'vitest';
import { Rally } from '../src/logic/referee';
import { createRng } from '../src/logic/rng';
import { CHARACTERS, CHARACTER_ORDER, type CharacterId } from '../src/game/characters';
import { CpuBrain } from '../src/sim/ai';
import { Match, type MatchEvent } from '../src/sim/match';
import { personalityFor } from '../src/sim/personalities';

const DT = 1 / 120;

function mkMatch(a: CharacterId, b: CharacterId, seed = 1, games = 2) {
  const setup = (id: CharacterId) => ({
    name: id,
    stats: CHARACTERS[id].stats,
    short: CHARACTERS[id].short,
    slowStart: CHARACTERS[id].slowStart,
    charId: id,
    human: false,
  });
  return new Match({ rules: { gamesPerSet: games }, players: [setup(a), setup(b)], seed });
}

function playCpu(a: CharacterId, b: CharacterId, seed: number, games = 2) {
  const m = mkMatch(a, b, seed, games);
  const rng = createRng(seed * 7 + 3);
  const brains = [new CpuBrain(0, personalityFor(a), rng), new CpuBrain(1, personalityFor(b), rng)];
  const events: MatchEvent[] = [];
  let t = 0;
  while (m.phase !== 'matchOver' && t < 60 * 25) {
    m.step(DT, [brains[0].think(m, DT), brains[1].think(m, DT)]);
    events.push(...m.drainEvents());
    t += DT;
    const b = m.ball;
    if (!Number.isFinite(b.x + b.y + b.z)) throw new Error('pelota con NaN');
  }
  return { m, events };
}

describe('recetas', () => {
  it('Rosco: ganar con dejadita tilda el primer paso', () => {
    const m = mkMatch('elRosco', 'elSeba');
    const rosco = m.players[0];
    m.myst.states[0].lastShotKind = 'drop';
    m.myst.onPointFinished({ winner: 0, loser: 1, reason: 'winner', rally: 3, server: 0 });
    expect(m.myst.states[0].recipe).toEqual([true, false, false]);
    void rosco;
  });

  it('Tincho: la receta se carga yendo abajo (y el mate solo cuenta perdiendo)', () => {
    const m = mkMatch('trueTincho', 'volpi');
    const tincho = m.players[0];
    m.myst.onTaunt(tincho, false);
    expect(m.myst.states[0].recipe[1]).toBe(false);
    m.score = { ...m.score, points: [0, 2] };
    m.myst.onPointStart();
    expect(m.myst.states[0].recipe[0]).toBe(true);
    m.myst.onTaunt(tincho, false);
    expect(m.myst.states[0].recipe[1]).toBe(true);
  });

  it('Angelito: hay que devolver 3 imposibles', () => {
    const m = mkMatch('angelito', 'elRosco');
    const a = m.players[0];
    for (let i = 0; i < 2; i++) m.myst.onContact(a, { kind: 'drive', dove: true, stretched: false, cross: false, depth: 12 });
    expect(m.myst.states[0].recipe[0]).toBe(false);
    m.myst.onContact(a, { kind: 'drive', dove: false, stretched: true, cross: false, depth: 12 });
    expect(m.myst.states[0].recipe[0]).toBe(true);
  });

  it('especial: con los 3 pasos está listo, se usa una vez por game y la receta se reinicia', () => {
    const m = mkMatch('volpi', 'elVikingo');
    const v = m.players[0];
    expect(m.myst.ready(v)).toBe(false);
    m.myst.tick(v, 0);
    m.myst.tick(v, 1);
    m.myst.tick(v, 2);
    expect(m.myst.ready(v)).toBe(true);
    expect(m.myst.tryActivate(v)).toBe('betty');
    expect(m.myst.states[0].recipe).toEqual([false, false, false]);
    m.myst.tick(v, 0);
    m.myst.tick(v, 1);
    m.myst.tick(v, 2);
    expect(m.myst.tryActivate(v)).toBeNull();
    m.myst.onScoreChanged(true);
    expect(m.myst.tryActivate(v)).toBe('betty');
  });

  it('Tincho es inmune a las cargadas; Volpi se tienta', () => {
    const m = mkMatch('elSeba', 'trueTincho');
    m.myst.onTaunt(m.players[0], true);
    const ev = m.drainEvents();
    expect(ev.some((e) => e.type === 'passive' && e.id === 'poker')).toBe(true);
    const m2 = mkMatch('elSeba', 'volpi');
    m2.myst.onTaunt(m2.players[0], true);
    expect(m2.players[1].mods.weakServe).toBe(true);
  });
});

describe('árbitro con efectos', () => {
  it('si la pelota picó bien y vuelve contra la red, el punto es de quien pegó', () => {
    const r = new Rally(0, 'deuce');
    r.onServe();
    r.onBounce(-2, -4);
    r.onHit(1);
    r.onBounce(0, 1.2);
    expect(r.onNet()).toMatchObject({ type: 'point', winner: 1, reason: 'winner' });
  });
});

describe('partidos CPU contra CPU con los seis', () => {
  it('todas las parejas terminan, y se ven especiales, recetas y cargadas', () => {
    const seen = { special: 0, recipe: 0, taunt: 0, exento: 0 };
    const specialsBy = new Set<string>();
    let seed = 11;
    for (const a of CHARACTER_ORDER) {
      const b = CHARACTER_ORDER[(CHARACTER_ORDER.indexOf(a) + 1) % CHARACTER_ORDER.length];
      const { m, events } = playCpu(a, b, seed++);
      expect(m.phase, `${a} vs ${b}`).toBe('matchOver');
      for (const e of events) {
        if (e.type === 'special') {
          seen.special++;
          specialsBy.add(e.id);
        }
        if (e.type === 'recipe') seen.recipe++;
        if (e.type === 'taunt') seen.taunt++;
        if (e.type === 'exento') seen.exento++;
      }
      const sebaSide = [a, b].indexOf('elSeba');
      if (sebaSide >= 0) {
        expect(events.filter((e) => e.type === 'exento').length).toBeLessThanOrEqual(1);
      }
    }
    expect(seen.recipe).toBeGreaterThan(10);
    expect(seen.taunt).toBeGreaterThan(3);
    expect(seen.special).toBeGreaterThan(0);
  });
});
