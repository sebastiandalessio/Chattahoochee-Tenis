import { describe, expect, it } from 'vitest';
import { createRng } from '../src/logic/rng';
import { newMatch, pointWon, type MatchScore, type Side } from '../src/logic/scoring';
import { CHARACTER_ORDER, clasicoOf } from '../src/game/characters';
import { BOSS_STEP, continueRun, currentFight, isBossStep, newTower, towerRamp, winStep } from '../src/game/tower';
import { currentRival, newRelay, relayGame } from '../src/game/bossRelay';
import { emptySave, learnChicana, loadSave, recordTowerWin, SAVE_KEY, writeSave, type KV } from '../src/game/save';
import { bankOf, makeRound, pickChicana, sharedBank } from '../src/game/chicanas';

const rnd = (seed: number) => {
  const r = createRng(seed);
  return () => r.next();
};

describe('torre', () => {
  it('cinco rivales distintos, sin el propio, y las sedes rotan', () => {
    for (let seed = 1; seed < 30; seed++) {
      const run = newTower('volpi', 0, rnd(seed));
      const rivals = run.fights.map((f) => f.rival);
      expect(rivals).toHaveLength(5);
      expect(new Set(rivals).size).toBe(5);
      expect(rivals).not.toContain('volpi');
      for (let i = 1; i < run.fights.length; i++) expect(run.fights[i].venue).not.toBe(run.fights[i - 1].venue);
    }
  });

  it('se sube de a un escalón y arriba está el Boss', () => {
    let run = newTower('elRosco', 0, rnd(3));
    for (let i = 0; i < 5; i++) {
      expect(isBossStep(run)).toBe(false);
      expect(currentFight(run)).not.toBeNull();
      run = winStep(run, '4-2');
    }
    expect(run.step).toBe(BOSS_STEP);
    expect(isBossStep(run)).toBe(true);
    expect(currentFight(run)).toBeNull();
    expect(run.scores).toHaveLength(5);
    const again = continueRun(run);
    expect(again.step).toBe(run.step);
    expect(again.continues).toBe(1);
  });

  it('la CPU se pone más difícil a medida que se sube', () => {
    const a = towerRamp(0);
    const b = towerRamp(4);
    const boss = towerRamp(BOSS_STEP);
    expect(b.errorMul).toBeLessThan(a.errorMul);
    expect(boss.errorMul).toBeLessThan(b.errorMul);
    expect(boss.reaction).toBeLessThan(a.reaction);
  });

  it('clásicos', () => {
    expect(clasicoOf('elRosco', 'trueTincho')).toBe('avellaneda');
    expect(clasicoOf('trueTincho', 'elRosco')).toBe('avellaneda');
    expect(clasicoOf('elSeba', 'volpi')).toBe('superclasico');
    expect(clasicoOf('elVikingo', 'elSeba')).toBe('superclasico');
    expect(clasicoOf('volpi', 'elVikingo')).toBeNull();
    expect(clasicoOf('angelito', 'elSeba')).toBeNull();
  });
});

describe('relevo del Boss', () => {
  const rivals = CHARACTER_ORDER.filter((c) => c !== 'angelito');

  it('ganando cinco games seguidos, campeón', () => {
    let r = newRelay(rivals);
    for (let i = 0; i < 5; i++) {
      expect(currentRival(r)).toBe(rivals[i]);
      r = relayGame(r, true);
    }
    expect(r.state).toBe('won');
    expect(r.eliminated).toEqual(rivals);
    expect(r.cans).toBe(3);
    expect(currentRival(r)).toBeNull();
  });

  it('perder un game cuesta una lata y el rival vuelve al final de la fila', () => {
    let r = newRelay(rivals);
    r = relayGame(r, false);
    expect(r.cans).toBe(2);
    expect(r.queue[r.queue.length - 1]).toBe(rivals[0]);
    expect(currentRival(r)).toBe(rivals[1]);
    expect(r.state).toBe('playing');
  });

  it('sin latas, game over; con dos derrotas todavía se puede ganar', () => {
    let r = newRelay(rivals);
    r = relayGame(r, false);
    r = relayGame(r, false);
    expect(r.state).toBe('playing');
    for (let i = 0; i < 5; i++) r = relayGame(r, true);
    expect(r.state).toBe('won');
    expect(r.cans).toBe(1);
    expect(r.games).toBe(7);

    let s = newRelay(rivals);
    for (let i = 0; i < 3; i++) s = relayGame(s, false);
    expect(s.state).toBe('lost');
    expect(s.cans).toBe(0);
    // Terminado, ya no cambia.
    expect(relayGame(s, true)).toBe(s);
  });

  it('un partido de 1 game termina al primer game (cada game del relevo)', () => {
    let s: MatchScore = newMatch({ gamesPerSet: 1, goldenPointAfterDeuces: 3 }, 0);
    for (let i = 0; i < 4; i++) s = pointWon(s, 1).score;
    expect(s.winner).toBe(1);
    expect(s.completedSets).toEqual([[0, 1]]);
  });

  it('punto de oro después de 3 iguales', () => {
    let s: MatchScore = newMatch({ gamesPerSet: 1, goldenPointAfterDeuces: 3 }, 0);
    const p = (side: Side) => {
      s = pointWon(s, side).score;
    };
    for (let i = 0; i < 3; i++) {
      p(0);
      p(1);
    }
    // 40-40 (1ª vez); ventaja y vuelta (2ª); ventaja y vuelta (3ª).
    p(0);
    p(1);
    p(1);
    p(0);
    expect(s.deuceCount).toBe(3);
    // 4ª vez: punto de oro.
    p(0);
    p(1);
    expect(s.goldenPoint).toBe(true);
    p(1);
    expect(s.winner).toBe(1);
  });
});

describe('guardado', () => {
  const memKV = (): KV & { data: Record<string, string> } => {
    const data: Record<string, string> = {};
    return {
      data,
      getItem: (k) => data[k] ?? null,
      setItem: (k, v) => {
        data[k] = v;
      },
    };
  };

  it('ida y vuelta por el almacenamiento', () => {
    const kv = memKV();
    let d = emptySave();
    d = recordTowerWin(d, 'elSeba').data;
    d = learnChicana(d, 'ro1');
    d = { ...d, options: { ...d.options, difficulty: 2, games: 6 } };
    expect(writeSave(d, kv)).toBe(true);
    const back = loadSave(kv);
    expect(back.towersWon).toEqual(['elSeba']);
    expect(back.unlockedOutfits).toEqual(['elSeba']);
    expect(back.learned).toEqual(['ro1']);
    expect(back.options.difficulty).toBe(2);
    expect(back.options.games).toBe(6);
  });

  it('si lo guardado está roto o no hay almacenamiento, arranca vacío', () => {
    const kv = memKV();
    kv.data[SAVE_KEY] = '{esto no es JSON';
    expect(loadSave(kv)).toEqual(emptySave());
    expect(loadSave(null)).toEqual(emptySave());
    kv.data[SAVE_KEY] = JSON.stringify({ towersWon: ['elSeba', 'pirulo'], options: { difficulty: 9, music: 7 } });
    const d = loadSave(kv);
    expect(d.towersWon).toEqual(['elSeba']);
    expect(d.options.difficulty).toBe(1);
    expect(d.options.music).toBe(1);
  });

  it('ganar la torre con los seis desbloquea a Don Ganso (una sola vez)', () => {
    let d = emptySave();
    let gansos = 0;
    for (const c of CHARACTER_ORDER) {
      const r = recordTowerWin(d, c);
      expect(r.newOutfit).toBe(true);
      if (r.newGanso) gansos++;
      d = r.data;
    }
    expect(gansos).toBe(1);
    expect(d.ganso).toBe(true);
    const again = recordTowerWin(d, 'volpi');
    expect(again.newOutfit).toBe(false);
    expect(again.newGanso).toBe(false);
    expect(again.data.towersWon).toHaveLength(6);
  });

  it('aprender una chicana no la duplica', () => {
    const d = learnChicana(learnChicana(emptySave(), 'sh1'), 'sh1');
    expect(d.learned).toEqual(['sh1']);
  });
});

describe('chicanas', () => {
  it('al menos 8 por personaje, con ids únicos y réplicas malas', () => {
    const ids = new Set<string>();
    for (const c of CHARACTER_ORDER) {
      const bank = bankOf(c);
      expect(bank.length).toBeGreaterThanOrEqual(8);
      for (const ch of bank) {
        expect(ids.has(ch.id)).toBe(false);
        ids.add(ch.id);
        expect(ch.bad.length).toBeGreaterThanOrEqual(2);
        expect(ch.bad).not.toContain(ch.good);
      }
    }
    for (const ch of sharedBank()) expect(ids.has(ch.id)).toBe(false);
  });

  it('las opciones se mezclan y la correcta es la buena', () => {
    const r = rnd(8);
    for (let i = 0; i < 40; i++) {
      const ch = pickChicana('angelito', r);
      const round = makeRound(ch, r);
      expect(round.options[round.correct]).toBe(ch.good);
      expect(new Set(round.options).size).toBe(round.options.length);
    }
  });

  it('no repite las que ya salieron mientras queden otras', () => {
    const r = rnd(2);
    const used: string[] = [];
    for (let i = 0; i < 8; i++) {
      const ch = pickChicana('volpi', r, used);
      expect(used).not.toContain(ch.id);
      used.push(ch.id);
    }
  });
});

describe('ventajas de la chicana y del Boss en el partido', () => {
  it('receta con el primer paso tildado y rival "calentito" solo en el primer game', async () => {
    const { Match } = await import('../src/sim/match');
    const { CHARACTERS } = await import('../src/game/characters');
    const setup = (id: 'elRosco' | 'volpi', extra = {}) => ({ name: id, stats: CHARACTERS[id].stats, charId: id, human: false, ...extra });
    const m = new Match({
      rules: { gamesPerSet: 4 },
      players: [setup('elRosco', { startRecipe: [true, false, false] }), setup('volpi', { errorMul: 1, firstGameErrorMul: 1.3 })],
      seed: 1,
    });
    expect(m.myst.states[0].recipe).toEqual([true, false, false]);
    expect(m.myst.states[1].recipe).toEqual([false, false, false]);
    expect(m.drainEvents().some((e) => e.type === 'recipe' && e.side === 0)).toBe(true);
    expect(m.errorMulOf(m.players[1])).toBeCloseTo(1.3);
    m.score = { ...m.score, games: [1, 0] };
    expect(m.errorMulOf(m.players[1])).toBeCloseTo(1);
  });
});

describe('Don Ganso (secreto)', () => {
  it('su torre tiene 5 de los seis y el Boss son esos mismos cinco', async () => {
    const { bossRivals } = await import('../src/game/tower');
    for (let seed = 1; seed < 20; seed++) {
      const run = newTower('donGanso', 0, rnd(seed));
      const rivals = run.fights.map((f) => f.rival);
      expect(rivals).toHaveLength(5);
      expect(new Set(rivals).size).toBe(5);
      for (const r of rivals) expect(CHARACTER_ORDER).toContain(r);
      expect(bossRivals(run)).toEqual(rivals);
    }
  });

  it('su cargada después de ganar pone nervioso al que saca (salvo a Tincho)', async () => {
    const { Match } = await import('../src/sim/match');
    const { CHARACTERS } = await import('../src/game/characters');
    const setup = (id: 'donGanso' | 'volpi' | 'trueTincho') => ({ name: id, stats: CHARACTERS[id].stats, charId: id, human: false });
    const m = new Match({ rules: { gamesPerSet: 2 }, players: [setup('donGanso'), setup('volpi')], seed: 2 });
    m.myst.onTaunt(m.players[0], true);
    expect(m.players[1].mods.serveErrorMul).toBeCloseTo(1.4);
    const m2 = new Match({ rules: { gamesPerSet: 2 }, players: [setup('donGanso'), setup('trueTincho')], seed: 2 });
    m2.myst.onTaunt(m2.players[0], true);
    expect(m2.players[1].mods.serveErrorMul).toBe(1);
  });
});
