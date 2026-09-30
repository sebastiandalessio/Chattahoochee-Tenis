// Progreso guardado en localStorage: torres ganadas, trajes desbloqueados, Don Ganso jugable,
// réplicas de chicanas aprendidas y opciones. Si el navegador no deja guardar (modo privado,
// archivo abierto con doble clic en algunos navegadores), el juego sigue andando sin guardar.

import { CHARACTER_ORDER, type CharacterId } from './characters';

export interface Options {
  difficulty: 0 | 1 | 2;
  games: 2 | 4 | 6;
  /** 0..1 */
  music: number;
  sfx: number;
}

export interface SaveData {
  v: 1;
  /** Personajes con los que se ganó la torre (en orden). */
  towersWon: CharacterId[];
  /** Personajes con el traje alternativo desbloqueado. */
  unlockedOutfits: CharacterId[];
  /** Ganó la torre con los seis: Don Ganso jugable. */
  ganso: boolean;
  /** Chicanas cuya réplica correcta ya se aprendió (por id). */
  learned: string[];
  options: Options;
}

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SAVE_KEY = 'chattahoochee-tenis-v1';

export const DEFAULT_OPTIONS: Options = { difficulty: 1, games: 4, music: 0.6, sfx: 0.8 };

export function emptySave(): SaveData {
  return { v: 1, towersWon: [], unlockedOutfits: [], ganso: false, learned: [], options: { ...DEFAULT_OPTIONS } };
}

function browserKV(): KV | null {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    // Algunos navegadores tiran error recién al escribir.
    ls.setItem('__cht_probe', '1');
    ls.removeItem('__cht_probe');
    return ls;
  } catch {
    return null;
  }
}

const isChar = (c: unknown): c is CharacterId => typeof c === 'string' && (CHARACTER_ORDER as string[]).includes(c);

/** Lee lo guardado; si no hay nada o está roto, devuelve un guardado vacío. */
export function loadSave(kv: KV | null = browserKV()): SaveData {
  const base = emptySave();
  if (!kv) return base;
  try {
    const raw = kv.getItem(SAVE_KEY);
    if (!raw) return base;
    const d = JSON.parse(raw) as Partial<SaveData>;
    const o = { ...DEFAULT_OPTIONS, ...(d.options ?? {}) };
    return {
      v: 1,
      towersWon: (d.towersWon ?? []).filter(isChar),
      unlockedOutfits: (d.unlockedOutfits ?? []).filter(isChar),
      ganso: !!d.ganso,
      learned: (d.learned ?? []).filter((x) => typeof x === 'string'),
      options: {
        difficulty: [0, 1, 2].includes(o.difficulty) ? o.difficulty : 1,
        games: [2, 4, 6].includes(o.games) ? o.games : 4,
        music: clamp01(o.music),
        sfx: clamp01(o.sfx),
      },
    };
  } catch {
    return base;
  }
}

function clamp01(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0.7;
  return Math.max(0, Math.min(1, n));
}

export function writeSave(data: SaveData, kv: KV | null = browserKV()): boolean {
  if (!kv) return false;
  try {
    kv.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Ganó la torre con un personaje: desbloquea su traje y, con los seis, a Don Ganso. */
export function recordTowerWin(data: SaveData, id: CharacterId): { data: SaveData; newOutfit: boolean; newGanso: boolean } {
  const towersWon = data.towersWon.includes(id) ? data.towersWon : [...data.towersWon, id];
  const newOutfit = !data.unlockedOutfits.includes(id);
  const unlockedOutfits = newOutfit ? [...data.unlockedOutfits, id] : data.unlockedOutfits;
  const all = CHARACTER_ORDER.every((c) => towersWon.includes(c));
  const newGanso = all && !data.ganso;
  return { data: { ...data, towersWon, unlockedOutfits, ganso: data.ganso || all }, newOutfit, newGanso };
}

export function learnChicana(data: SaveData, id: string): SaveData {
  return data.learned.includes(id) ? data : { ...data, learned: [...data.learned, id] };
}

/** Guardado global de la partida en curso (se lee una vez y se escribe en cada cambio). */
let current: SaveData | null = null;

export function save(): SaveData {
  if (!current) current = loadSave();
  return current;
}

export function updateSave(f: (d: SaveData) => SaveData): SaveData {
  current = f(save());
  writeSave(current);
  return current;
}
