import { describe, expect, it } from 'vitest';
import {
  describeScore,
  newMatch,
  pointLabel,
  pointWon,
  pressure,
  serveSide,
  tiebreakServer,
  type MatchScore,
  type ScoreEvent,
  type Side,
} from '../src/logic/scoring';

function play(s: MatchScore, seq: Side[]): { score: MatchScore; events: ScoreEvent[] } {
  let events: ScoreEvent[] = [];
  for (const w of seq) {
    const r = pointWon(s, w);
    s = r.score;
    events = events.concat(r.events);
  }
  return { score: s, events };
}

const game = (w: Side): Side[] => [w, w, w, w];

describe('puntos de un game', () => {
  it('cuenta 15-30-40 desde el punto de vista del que saca', () => {
    let s = newMatch({}, 0);
    s = pointWon(s, 0).score;
    expect(describeScore(s)).toEqual({ kind: 'points', server: '15', receiver: '0' });
    s = pointWon(s, 1).score;
    s = pointWon(s, 1).score;
    expect(describeScore(s)).toEqual({ kind: 'points', server: '15', receiver: '30' });
    s = pointWon(s, 0).score;
    s = pointWon(s, 0).score;
    expect(describeScore(s)).toEqual({ kind: 'points', server: '40', receiver: '30' });
  });

  it('game en cero', () => {
    const { score, events } = play(newMatch(), game(0));
    expect(score.games).toEqual([1, 0]);
    expect(score.points).toEqual([0, 0]);
    expect(events.find((e) => e.type === 'game')).toMatchObject({ winner: 0, breakOfServe: false });
  });

  it('iguales, ventaja y vuelta a iguales', () => {
    let { score } = play(newMatch(), [0, 0, 0, 1, 1, 1]);
    expect(describeScore(score)).toEqual({ kind: 'deuce' });
    expect(score.deuceCount).toBe(1);
    score = pointWon(score, 1).score;
    expect(describeScore(score)).toEqual({ kind: 'advantage', side: 1 });
    expect(pointLabel(score, 1)).toBe('AD');
    expect(pointLabel(score, 0)).toBe('40');
    score = pointWon(score, 0).score;
    expect(describeScore(score)).toEqual({ kind: 'deuce' });
    expect(score.deuceCount).toBe(2);
    score = pointWon(score, 0).score;
    score = pointWon(score, 0).score;
    expect(score.games).toEqual([1, 0]);
  });

  it('quiebre de saque', () => {
    const { events } = play(newMatch({}, 0), game(1));
    expect(events.find((e) => e.type === 'game')).toMatchObject({ winner: 1, breakOfServe: true });
  });

  it('el saque cambia cada game', () => {
    let { score } = play(newMatch({}, 0), game(0));
    expect(score.server).toBe(1);
    score = play(score, game(0)).score;
    expect(score.server).toBe(0);
  });

  it('lado de saque: derecha en puntos pares, izquierda en impares', () => {
    let s = newMatch();
    expect(serveSide(s)).toBe('deuce');
    s = pointWon(s, 0).score;
    expect(serveSide(s)).toBe('ad');
    s = pointWon(s, 1).score;
    expect(serveSide(s)).toBe('deuce');
  });
});

describe('punto de oro', () => {
  it('después de más de 3 iguales, el siguiente punto define', () => {
    let { score } = play(newMatch({ goldenPointAfterDeuces: 3 }), [0, 0, 0, 1, 1, 1]);
    // Iguales #1. Tres idas y vueltas más: iguales #2, #3 y #4 (punto de oro).
    for (let i = 0; i < 2; i++) score = play(score, [0, 1]).score;
    expect(score.deuceCount).toBe(3);
    expect(score.goldenPoint).toBe(false);
    const r = play(score, [1, 0]);
    expect(r.events.some((e) => e.type === 'goldenPoint')).toBe(true);
    expect(describeScore(r.score)).toEqual({ kind: 'golden' });
    const fin = pointWon(r.score, 1);
    expect(fin.score.games).toEqual([0, 1]);
    expect(fin.score.goldenPoint).toBe(false);
    expect(fin.score.deuceCount).toBe(0);
  });

  it('sin la regla, las iguales son eternas', () => {
    let { score } = play(newMatch(), [0, 0, 0, 1, 1, 1]);
    for (let i = 0; i < 20; i++) score = play(score, [0, 1]).score;
    expect(score.games).toEqual([0, 0]);
    expect(describeScore(score)).toEqual({ kind: 'deuce' });
  });
});

describe('sets y tie-break', () => {
  it('set a 4 games con 2 de diferencia', () => {
    const seq: Side[] = [...game(0), ...game(0), ...game(0), ...game(0)];
    const { score, events } = play(newMatch({ gamesPerSet: 4 }), seq);
    expect(score.winner).toBe(0);
    expect(score.completedSets).toEqual([[4, 0]]);
    expect(events.some((e) => e.type === 'match')).toBe(true);
  });

  it('4-3 no alcanza, 5-3 sí', () => {
    // 3-3 alternando, luego 4-3 y 5-3.
    let s = newMatch({ gamesPerSet: 4 });
    for (let i = 0; i < 3; i++) s = play(s, [...game(0), ...game(1)]).score;
    expect(s.games).toEqual([3, 3]);
    s = play(s, game(0)).score;
    expect(s.games).toEqual([4, 3]);
    expect(s.winner).toBeNull();
    s = play(s, game(0)).score;
    expect(s.winner).toBe(0);
    expect(s.completedSets).toEqual([[5, 3]]);
  });

  it('tie-break en 4-4, gana a 7 con diferencia de 2', () => {
    let s = newMatch({ gamesPerSet: 4 }, 0);
    for (let i = 0; i < 4; i++) s = play(s, [...game(0), ...game(1)]).score;
    expect(s.games).toEqual([4, 4]);
    expect(s.inTiebreak).toBe(true);
    // 6-6 en el tie-break
    for (let i = 0; i < 6; i++) s = play(s, [0, 1]).score;
    expect(s.points).toEqual([6, 6]);
    expect(s.winner).toBeNull();
    s = pointWon(s, 1).score;
    expect(describeScore(s)).toEqual({ kind: 'tiebreak', a: 6, b: 7 });
    s = pointWon(s, 1).score;
    expect(s.winner).toBe(1);
    expect(s.completedSets).toEqual([[4, 5]]);
  });

  it('tie-break 7-0', () => {
    let s = newMatch({ gamesPerSet: 2 }, 0);
    s = play(s, [...game(0), ...game(1), ...game(0), ...game(1)]).score;
    expect(s.inTiebreak).toBe(true);
    s = play(s, [0, 0, 0, 0, 0, 0]).score;
    expect(s.winner).toBeNull();
    s = pointWon(s, 0).score;
    expect(s.winner).toBe(0);
    expect(s.completedSets).toEqual([[3, 2]]);
  });

  it('en el tie-break el saque rota 1-2-2-2', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((k) => tiebreakServer(0, k))).toEqual([0, 1, 1, 0, 0, 1, 1]);
    let s = newMatch({ gamesPerSet: 2 }, 0);
    s = play(s, [...game(0), ...game(1), ...game(0), ...game(1)]).score;
    const first = s.server;
    expect(s.tiebreakFirstServer).toBe(first);
    s = pointWon(s, 0).score;
    expect(s.server).not.toBe(first);
    s = pointWon(s, 0).score;
    expect(s.server).not.toBe(first);
    s = pointWon(s, 0).score;
    expect(s.server).toBe(first);
  });

  it('cambio de lado en games impares y cada 6 puntos del tie-break', () => {
    let r = play(newMatch({ gamesPerSet: 6 }), game(0));
    expect(r.events.some((e) => e.type === 'changeEnds')).toBe(true);
    r = play(r.score, game(1));
    expect(r.events.some((e) => e.type === 'changeEnds')).toBe(false);
    r = play(r.score, game(1));
    expect(r.events.some((e) => e.type === 'changeEnds')).toBe(true);

    let s = newMatch({ gamesPerSet: 2 }, 0);
    s = play(s, [...game(0), ...game(1), ...game(0), ...game(1)]).score;
    const tb = play(s, [0, 1, 0, 1, 0, 1]);
    expect(tb.events.filter((e) => e.type === 'changeEnds').length).toBe(1);
  });

  it('partido a dos sets: quien recibió primero en el tie-break saca el set siguiente', () => {
    let s = newMatch({ gamesPerSet: 2, setsToWin: 2 }, 0);
    s = play(s, [...game(0), ...game(1), ...game(0), ...game(1)]).score;
    const tbFirst = s.tiebreakFirstServer!;
    s = play(s, [0, 0, 0, 0, 0, 0, 0]).score;
    expect(s.sets).toEqual([1, 0]);
    expect(s.winner).toBeNull();
    expect(s.server).toBe(tbFirst === 0 ? 1 : 0);
  });

  it('no se puede sumar después de terminado el partido', () => {
    let s = play(newMatch({ gamesPerSet: 2 }), [...game(0), ...game(0)]).score;
    expect(s.winner).toBe(0);
    const r = pointWon(s, 1);
    expect(r.events).toEqual([]);
    expect(r.score.games).toEqual(s.games);
  });
});

describe('presión', () => {
  it('detecta punto de quiebre y match point', () => {
    let s = play(newMatch({ gamesPerSet: 2 }, 0), game(0)).score; // 1-0, ahora saca 1
    s = play(s, [0, 0, 0]).score; // 0-40 contra el que saca
    const p = pressure(s);
    expect(p.gamePointFor).toBe(0);
    expect(p.breakPoint).toBe(true);
    expect(p.matchPointFor).toBe(0);
  });
});
