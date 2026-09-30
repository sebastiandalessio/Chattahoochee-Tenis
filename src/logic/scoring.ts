// Puntuación del tenis: lógica pura, sin Phaser, cubierta por tests.
// Los jugadores se identifican como 0 y 1 (0 = el de abajo en la pantalla).

export type Side = 0 | 1;

export interface MatchRules {
  /** Games para ganar el set (2, 4 o 6). El tie-break se juega en N-N. */
  gamesPerSet: number;
  /** Sets que hay que ganar (1 = partido a un set). */
  setsToWin: number;
  /** Puntos del tie-break (7, con diferencia de 2). */
  tiebreakPoints: number;
  /** Si no es null: al llegar a 40-40 más de N veces en un game, el siguiente punto define ("punto de oro"). */
  goldenPointAfterDeuces: number | null;
}

export const DEFAULT_RULES: MatchRules = {
  gamesPerSet: 4,
  setsToWin: 1,
  tiebreakPoints: 7,
  goldenPointAfterDeuces: null,
};

export interface MatchScore {
  rules: MatchRules;
  /** Puntos del game actual (o del tie-break), como conteo crudo. */
  points: [number, number];
  games: [number, number];
  sets: [number, number];
  completedSets: Array<[number, number]>;
  inTiebreak: boolean;
  server: Side;
  /** Quién sacó primero en el tie-break (para saber quién saca el set siguiente). */
  tiebreakFirstServer: Side | null;
  /** Veces que se llegó a 40-40 en el game actual. */
  deuceCount: number;
  /** El punto actual define el game (punto de oro). */
  goldenPoint: boolean;
  winner: Side | null;
  totalPointsPlayed: number;
}

export type ScoreEvent =
  | { type: 'point'; winner: Side }
  | { type: 'deuce'; count: number }
  | { type: 'advantage'; side: Side }
  | { type: 'goldenPoint' }
  | { type: 'game'; winner: Side; games: [number, number]; breakOfServe: boolean }
  | { type: 'tiebreakStart' }
  | { type: 'set'; winner: Side; score: [number, number] }
  | { type: 'match'; winner: Side }
  | { type: 'changeEnds' }
  | { type: 'serverChange'; server: Side };

export function other(s: Side): Side {
  return s === 0 ? 1 : 0;
}

export function newMatch(rules: Partial<MatchRules> = {}, firstServer: Side = 0): MatchScore {
  return {
    rules: { ...DEFAULT_RULES, ...rules },
    points: [0, 0],
    games: [0, 0],
    sets: [0, 0],
    completedSets: [],
    inTiebreak: false,
    server: firstServer,
    tiebreakFirstServer: null,
    deuceCount: 0,
    goldenPoint: false,
    winner: null,
    totalPointsPlayed: 0,
  };
}

function cloneScore(s: MatchScore): MatchScore {
  return {
    ...s,
    points: [s.points[0], s.points[1]],
    games: [s.games[0], s.games[1]],
    sets: [s.sets[0], s.sets[1]],
    completedSets: s.completedSets.map((x) => [x[0], x[1]] as [number, number]),
  };
}

/** Quién saca en el punto k (0-based) de un tie-break. */
export function tiebreakServer(first: Side, k: number): Side {
  return Math.floor((k + 1) / 2) % 2 === 0 ? first : other(first);
}

/** Lado desde el que se saca: 'deuce' = derecha del que saca, 'ad' = izquierda. */
export function serveSide(s: MatchScore): 'deuce' | 'ad' {
  return (s.points[0] + s.points[1]) % 2 === 0 ? 'deuce' : 'ad';
}

/** Aplica un punto ganado y devuelve el nuevo estado con los eventos que produjo. */
export function pointWon(prev: MatchScore, winner: Side): { score: MatchScore; events: ScoreEvent[] } {
  if (prev.winner !== null) return { score: prev, events: [] };
  const s = cloneScore(prev);
  const events: ScoreEvent[] = [{ type: 'point', winner }];
  s.totalPointsPlayed++;
  s.points[winner]++;

  if (s.inTiebreak) {
    const [a, b] = s.points;
    const target = s.rules.tiebreakPoints;
    if ((a >= target || b >= target) && Math.abs(a - b) >= 2) {
      winGame(s, winner, events);
    } else {
      const k = a + b;
      if (k % 6 === 0) events.push({ type: 'changeEnds' });
      const next = tiebreakServer(s.tiebreakFirstServer ?? s.server, k);
      if (next !== s.server) {
        s.server = next;
        events.push({ type: 'serverChange', server: next });
      }
    }
    return { score: s, events };
  }

  const [a, b] = s.points;
  if (s.goldenPoint) {
    winGame(s, winner, events);
    return { score: s, events };
  }
  if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 2) {
    winGame(s, winner, events);
  } else if (a >= 3 && b >= 3) {
    if (a === b) {
      s.deuceCount++;
      const limit = s.rules.goldenPointAfterDeuces;
      if (limit !== null && s.deuceCount > limit) {
        s.goldenPoint = true;
        events.push({ type: 'goldenPoint' });
      } else {
        events.push({ type: 'deuce', count: s.deuceCount });
      }
    } else {
      events.push({ type: 'advantage', side: a > b ? 0 : 1 });
    }
  }
  return { score: s, events };
}

function winGame(s: MatchScore, winner: Side, events: ScoreEvent[]) {
  const wasTiebreak = s.inTiebreak;
  const breakOfServe = !wasTiebreak && winner !== s.server;
  s.games[winner]++;
  s.points = [0, 0];
  s.deuceCount = 0;
  s.goldenPoint = false;
  events.push({ type: 'game', winner, games: [s.games[0], s.games[1]], breakOfServe });

  const n = s.rules.gamesPerSet;
  const [g0, g1] = s.games;
  const setWon = wasTiebreak || ((g0 >= n || g1 >= n) && Math.abs(g0 - g1) >= 2);

  if (setWon) {
    const setScore: [number, number] = [g0, g1];
    s.completedSets.push(setScore);
    s.sets[winner]++;
    events.push({ type: 'set', winner, score: setScore });
    const totalGames = g0 + g1;
    s.games = [0, 0];
    s.inTiebreak = false;
    // Saca el set siguiente quien no empezó sacando el tie-break; si no hubo tie-break, se alterna normal.
    const nextServer = wasTiebreak ? other(s.tiebreakFirstServer ?? s.server) : other(s.server);
    s.tiebreakFirstServer = null;
    if (s.sets[winner] >= s.rules.setsToWin) {
      s.winner = winner;
      events.push({ type: 'match', winner });
      return;
    }
    if (totalGames % 2 === 1) events.push({ type: 'changeEnds' });
    s.server = nextServer;
    events.push({ type: 'serverChange', server: nextServer });
    return;
  }

  if ((g0 + g1) % 2 === 1) events.push({ type: 'changeEnds' });
  s.server = other(s.server);
  events.push({ type: 'serverChange', server: s.server });

  if (g0 === n && g1 === n) {
    s.inTiebreak = true;
    s.tiebreakFirstServer = s.server;
    events.push({ type: 'tiebreakStart' });
  }
}

export type ScoreCall =
  | { kind: 'points'; server: string; receiver: string }
  | { kind: 'deuce' }
  | { kind: 'advantage'; side: Side }
  | { kind: 'golden' }
  | { kind: 'tiebreak'; a: number; b: number };

const POINT_NAMES = ['0', '15', '30', '40'];

/** Descripción del marcador del game actual, lista para que la capa de textos la cante. */
export function describeScore(s: MatchScore): ScoreCall {
  if (s.inTiebreak) return { kind: 'tiebreak', a: s.points[0], b: s.points[1] };
  if (s.goldenPoint) return { kind: 'golden' };
  const [a, b] = s.points;
  if (a >= 3 && b >= 3) {
    if (a === b) return { kind: 'deuce' };
    return { kind: 'advantage', side: a > b ? 0 : 1 };
  }
  const srv = s.server;
  return {
    kind: 'points',
    server: POINT_NAMES[Math.min(s.points[srv], 3)],
    receiver: POINT_NAMES[Math.min(s.points[other(srv)], 3)],
  };
}

/** Puntos del game de un jugador como texto corto para el marcador ("15", "40", "AD"). */
export function pointLabel(s: MatchScore, side: Side): string {
  if (s.inTiebreak) return String(s.points[side]);
  const [a, b] = s.points;
  const mine = s.points[side];
  if (a >= 3 && b >= 3) {
    if (a === b) return '40';
    return mine > Math.min(a, b) ? 'AD' : '40';
  }
  return POINT_NAMES[Math.min(mine, 3)];
}

/** Situaciones calientes para el relato: ¿el próximo punto define game, set o partido? */
export function pressure(s: MatchScore): {
  gamePointFor: Side | null;
  breakPoint: boolean;
  setPointFor: Side | null;
  matchPointFor: Side | null;
} {
  let gamePointFor: Side | null = null;
  let setPointFor: Side | null = null;
  let matchPointFor: Side | null = null;
  for (const side of [0, 1] as Side[]) {
    const { events } = pointWon(s, side);
    if (events.some((e) => e.type === 'game')) gamePointFor = side;
    if (events.some((e) => e.type === 'set')) setPointFor = side;
    if (events.some((e) => e.type === 'match')) matchPointFor = side;
  }
  return {
    gamePointFor,
    breakPoint: gamePointFor !== null && gamePointFor !== s.server && !s.inTiebreak,
    setPointFor,
    matchPointFor,
  };
}
