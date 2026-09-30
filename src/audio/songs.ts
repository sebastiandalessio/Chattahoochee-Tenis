// Los temas chiptune del juego. Cada tema tiene la melodía escrita a mano (nota:duración en
// semicorcheas) y los acordes de cada compás; el bajo, el arpegio y la batería salen de un estilo.
// Todo original (salvo que se diga), escrito para el juego.

export type BassStyle = 'root8' | 'rootFifth' | 'walking' | 'boogie' | 'bossa' | 'pedal' | 'none';
export type DrumStyle = 'rock' | 'four' | 'shuffle' | 'march' | 'bossa' | 'soft' | 'none';

export interface SongSpec {
  bpm: number;
  /** Un acorde por compás: C, Am, F#m, G7, Bb, Fmaj7, Em7... */
  chords: string;
  /** Melodía: tokens "NOTA:dur" (dur en semicorcheas; 16 = un compás). "r" = silencio. */
  lead: string;
  bass: BassStyle;
  drums: DrumStyle;
  /** Arpegio de acompañamiento en semicorcheas (bajito). */
  arp?: boolean;
  /** Si se repite (los temas de victoria y derrota suenan una vez). */
  loop: boolean;
  /** Timbre de la melodía: ancho de pulso del cuadrado (0.125, 0.25, 0.5) o triángulo. */
  leadWave?: 0.125 | 0.25 | 0.5 | 'triangle';
  /** Swing: cuánto se atrasan las semicorcheas pares (0..0.5). */
  swing?: number;
}

export type SongId =
  | 'title'
  | 'menu'
  | 'select'
  | 'tower'
  | 'breckenridge'
  | 'springRidge'
  | 'stRegis'
  | 'chattahoochee'
  | 'boss'
  | 'victory'
  | 'defeat'
  | 'wedding'
  | 'clasico'
  | 'practice';

export const SONGS: Record<SongId, SongSpec> = {
  // Título: aventura, sol, raquetas.
  title: {
    bpm: 140,
    chords: 'C G Am F C G F G',
    lead: `E5:2 G5:2 C6:4 B5:2 A5:2 G5:4 | D5:2 G5:2 B5:4 A5:2 G5:2 D5:4 | C5:2 E5:2 A5:4 G5:2 E5:2 C5:4 | F5:4 E5:2 D5:2 C5:4 A4:4 |
           E5:2 G5:2 C6:4 D6:2 E6:2 D6:2 C6:2 | B5:4 G5:2 A5:2 B5:4 D6:4 | C6:2 A5:2 F5:2 A5:2 C6:4 A5:4 | B5:4 A5:2 G5:2 G5:8`,
    bass: 'root8',
    drums: 'rock',
    arp: true,
    loop: true,
  },
  // Menú: tranquilo, para leer las descripciones de Don Ganso.
  menu: {
    bpm: 108,
    chords: 'F Dm Bb C F Dm Bb C',
    lead: `A4:4 C5:4 F5:6 E5:2 | D5:4 F5:4 A5:6 G5:2 | F5:4 D5:4 Bb4:4 D5:4 | E5:4 G5:4 C5:8 |
           A5:4 G5:2 F5:2 C5:4 F5:4 | A5:4 G5:2 F5:2 D5:8 | D5:2 F5:2 Bb5:4 A5:4 G5:4 | G5:4 E5:4 C5:4 r:4`,
    bass: 'rootFifth',
    drums: 'soft',
    arp: true,
    loop: true,
    leadWave: 0.25,
  },
  // Selección de personaje: saltarín.
  select: {
    bpm: 150,
    chords: 'G Em C D G Em C D',
    lead: `G5:2 r:2 G5:2 A5:2 B5:4 G5:4 | E5:2 r:2 E5:2 F#5:2 G5:4 E5:4 | C5:2 E5:2 G5:2 C6:2 B5:4 A5:4 | D5:2 F#5:2 A5:2 D6:2 C6:4 A5:4 |
           B5:2 r:2 B5:2 C6:2 D6:4 B5:4 | G5:2 r:2 G5:2 A5:2 B5:4 G5:4 | E5:2 G5:2 C6:4 A5:2 C6:2 E6:4 | D6:4 C6:2 B5:2 A5:4 F#5:4`,
    bass: 'root8',
    drums: 'four',
    loop: true,
    leadWave: 0.5,
  },
  // La torre: épico, en menor.
  tower: {
    bpm: 128,
    chords: 'Dm Bb C A Dm Bb C A',
    lead: `D5:6 E5:2 F5:4 A5:4 | Bb5:6 A5:2 G5:4 F5:4 | G5:6 F5:2 E5:4 C5:4 | E5:4 C#5:4 A4:8 |
           D5:2 F5:2 A5:4 D6:4 C6:4 | Bb5:4 D6:4 F6:4 D6:4 | C6:4 G5:4 E5:4 C6:4 | A5:4 E5:4 C#5:4 E5:4`,
    bass: 'root8',
    drums: 'march',
    arp: true,
    loop: true,
  },
  // Breckenridge: verano, pileta, pelotas de fútbol.
  breckenridge: {
    bpm: 145,
    chords: 'A D E A F#m D E E',
    lead: `C#5:2 E5:2 A5:2 E5:2 C#5:2 E5:2 A5:4 | D5:2 F#5:2 A5:2 F#5:2 D5:2 F#5:2 A5:4 | E5:2 G#5:2 B5:2 G#5:2 E5:2 B5:2 E6:4 | C#6:4 B5:2 A5:2 E5:8 |
           F#5:4 A5:4 C#6:4 A5:4 | D6:4 C#6:2 B5:2 A5:4 F#5:4 | G#5:4 B5:4 E6:4 D6:2 C#6:2 | B5:4 G#5:4 E5:4 r:4`,
    bass: 'root8',
    drums: 'rock',
    loop: true,
    leadWave: 0.25,
  },
  // Spring Ridge: bosque, ciervos, polen.
  springRidge: {
    bpm: 112,
    chords: 'Em C G D Em C B7 Em',
    lead: `E5:4 G5:4 B5:6 A5:2 | G5:4 E5:4 C5:8 | D5:4 G5:4 B5:4 A5:2 G5:2 | F#5:4 A5:4 D5:8 |
           E5:2 F#5:2 G5:4 B5:4 E6:4 | D6:2 C6:2 B5:4 G5:4 E5:4 | D#5:4 F#5:4 B5:4 A5:4 | G5:4 F#5:4 E5:8`,
    bass: 'rootFifth',
    drums: 'soft',
    arp: true,
    loop: true,
    leadWave: 'triangle',
  },
  // St. Regis: lounge del club, con mozo y limonadas.
  stRegis: {
    bpm: 116,
    chords: 'Fmaj7 Em7 Dm7 G7 Fmaj7 Em7 Dm7 G7',
    lead: `A5:3 G5:1 F5:2 E5:2 A5:4 r:4 | G5:3 F5:1 E5:2 D5:2 G5:4 r:4 | F5:3 E5:1 D5:2 C5:2 F5:4 A5:4 | B5:4 D6:2 B5:2 G5:8 |
           C6:3 A5:1 F5:2 A5:2 C6:4 E6:4 | D6:3 B5:1 G5:2 E5:2 G5:8 | F5:2 A5:2 C6:2 E6:2 D6:4 C6:4 | B5:2 D6:2 G5:4 F5:4 r:4`,
    bass: 'bossa',
    drums: 'bossa',
    loop: true,
    leadWave: 0.125,
    swing: 0.15,
  },
  // Orillas del Chattahoochee: blues de atardecer.
  chattahoochee: {
    bpm: 100,
    chords: 'A7 A7 D7 A7 E7 D7 A7 E7',
    lead: `A4:3 C5:1 E5:4 G5:3 A5:1 r:4 | G5:3 E5:1 D5:4 C5:3 A4:1 r:4 | D5:3 F#5:1 A5:4 C6:3 A5:1 r:4 | A5:3 G5:1 E5:4 C5:4 A4:4 |
           B4:3 D5:1 E5:4 G#5:4 B5:4 | A5:3 F#5:1 D5:4 C5:4 A4:4 | A4:2 C5:2 C#5:2 E5:2 A5:4 G5:4 | E5:4 G#5:4 B5:4 E5:4`,
    bass: 'boogie',
    drums: 'shuffle',
    loop: true,
    leadWave: 0.25,
    swing: 0.3,
  },
  // El Boss: rápido y en menor.
  boss: {
    bpm: 162,
    chords: 'Cm Ab Bb G Cm Ab Bb G',
    lead: `C5:2 C5:2 G5:2 C5:2 Eb5:2 G5:2 C6:4 | Ab5:2 G5:2 Eb5:2 C5:2 Ab4:4 C5:4 | Bb4:2 D5:2 F5:2 Bb5:2 A5:2 F5:2 D5:4 | G5:4 F5:2 Eb5:2 D5:4 B4:4 |
           C6:4 G5:2 Eb5:2 C6:4 D6:4 | Eb6:4 D6:2 C6:2 Ab5:8 | Bb5:4 F5:2 D5:2 Bb5:4 C6:4 | D6:4 B5:4 G5:4 F5:2 D5:2`,
    bass: 'root8',
    drums: 'rock',
    arp: true,
    loop: true,
    leadWave: 0.5,
  },
  // Victoria: fanfarria corta.
  victory: {
    bpm: 150,
    chords: 'C C',
    lead: `C5:2 E5:2 G5:2 C6:6 G5:2 C6:2 | E6:12 r:4`,
    bass: 'pedal',
    drums: 'none',
    loop: false,
    leadWave: 0.25,
  },
  // Derrota: bajadita triste.
  defeat: {
    bpm: 90,
    chords: 'Am Am',
    lead: `E5:4 D5:4 C5:4 B4:4 | A4:12 r:4`,
    bass: 'pedal',
    drums: 'none',
    loop: false,
    leadWave: 'triangle',
  },
  // Casamiento de Betty y Mabel: marcha nupcial (propia, con aire de marcha nupcial).
  wedding: {
    bpm: 104,
    chords: 'C F G C Am Dm G C',
    lead: `G4:2 G4:1 G4:1 G4:4 C5:8 | A4:2 A4:1 A4:1 A4:4 F5:8 | G5:4 F5:2 E5:2 D5:4 B4:4 | C5:8 E5:4 G5:4 |
           A5:6 G5:2 E5:4 C5:4 | D5:6 E5:2 F5:4 A5:4 | G5:4 B5:4 D6:4 B5:4 | C6:12 r:4`,
    bass: 'rootFifth',
    drums: 'march',
    arp: true,
    loop: true,
    leadWave: 0.25,
  },
  // Clásico: cantito de tribuna (con bombo).
  clasico: {
    bpm: 120,
    chords: 'D A D A',
    lead: `D5:4 D5:4 D5:4 A4:4 | D5:2 E5:2 F#5:4 E5:4 D5:4 | F#5:4 F#5:4 F#5:4 E5:4 | D5:2 E5:2 C#5:4 D5:8`,
    bass: 'rootFifth',
    drums: 'march',
    loop: true,
    leadWave: 0.5,
  },
  // Práctica con Betty: arpegios robóticos.
  practice: {
    bpm: 100,
    chords: 'C Am F G C Am F G',
    lead: `C5:4 r:4 G5:4 r:4 | A4:4 r:4 E5:4 r:4 | F5:4 r:4 C5:4 A4:4 | G4:4 B4:4 D5:4 r:4 |
           E5:4 r:4 C6:4 r:4 | C5:4 r:4 A5:4 r:4 | A5:4 r:4 F5:4 C5:4 | B4:4 D5:4 G5:4 r:4`,
    bass: 'pedal',
    drums: 'soft',
    arp: true,
    loop: true,
    leadWave: 0.125,
  },
};

// ---------------------------------------------------------------- lectura de la notación

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#5" → número MIDI (C4 = 60). */
export function noteToMidi(n: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  if (!m) throw new Error(`Nota inválida: ${n}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + acc;
}

export interface NoteEvent {
  step: number;
  midi: number;
  len: number;
}

export function parseLead(lead: string): { notes: NoteEvent[]; steps: number } {
  const notes: NoteEvent[] = [];
  let step = 0;
  for (const tok of lead.replace(/\|/g, ' ').split(/\s+/).filter(Boolean)) {
    const [n, d] = tok.split(':');
    const len = Number(d);
    if (!Number.isFinite(len) || len <= 0) throw new Error(`Duración inválida: ${tok}`);
    if (n !== 'r') notes.push({ step, midi: noteToMidi(n), len });
    step += len;
  }
  return { notes, steps: step };
}

export interface Chord {
  root: number;
  /** Intervalos desde la fundamental (0, 3 o 4, 7, y a veces la séptima). */
  tones: number[];
}

export function parseChord(name: string): Chord {
  const m = /^([A-G])(#|b)?(m|maj7|m7|7|dim)?$/.exec(name);
  if (!m) throw new Error(`Acorde inválido: ${name}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const root = (NOTE_INDEX[m[1]] + acc + 12) % 12;
  const q = m[3] ?? '';
  const tones =
    q === 'm' ? [0, 3, 7] : q === 'maj7' ? [0, 4, 7, 11] : q === 'm7' ? [0, 3, 7, 10] : q === '7' ? [0, 4, 7, 10] : q === 'dim' ? [0, 3, 6] : [0, 4, 7];
  return { root, tones };
}

export function parseChords(chords: string): Chord[] {
  return chords.split(/\s+/).filter(Boolean).map(parseChord);
}

/** Bajo generado según el estilo, una octava abajo (alrededor de C2..C3). */
export function bassLine(chords: Chord[], style: BassStyle): NoteEvent[] {
  const out: NoteEvent[] = [];
  chords.forEach((c, bar) => {
    const base = 36 + c.root; // C2 = 36
    const fifth = base + 7;
    const third = base + c.tones[1];
    const s = bar * 16;
    const add = (step: number, midi: number, len: number) => out.push({ step: s + step, midi, len });
    switch (style) {
      case 'root8':
        for (let i = 0; i < 8; i++) add(i * 2, i % 2 ? base + 12 : base, 2);
        break;
      case 'rootFifth':
        [base, fifth, base, fifth].forEach((m, i) => add(i * 4, m, 4));
        break;
      case 'walking':
        [base, third, fifth, base + 9].forEach((m, i) => add(i * 4, m, 4));
        break;
      case 'boogie':
        [base, third + (c.tones[1] === 3 ? 1 : 0), fifth, base + 9].forEach((m, i) => {
          add(i * 4, m, 3);
          add(i * 4 + 3, m, 1);
        });
        break;
      case 'bossa':
        add(0, base, 3);
        add(6, fifth, 2);
        add(8, base, 3);
        add(14, fifth, 2);
        break;
      case 'pedal':
        add(0, base, 16);
        break;
      case 'none':
        break;
    }
  });
  return out;
}

/** Arpegio suave en semicorcheas con las notas del acorde (octava 4). */
export function arpLine(chords: Chord[]): NoteEvent[] {
  const out: NoteEvent[] = [];
  chords.forEach((c, bar) => {
    const tones = [...c.tones, 12];
    for (let i = 0; i < 16; i++) out.push({ step: bar * 16 + i, midi: 60 + c.root + tones[i % tones.length], len: 1 });
  });
  return out;
}

export type Drum = 'k' | 's' | 'h' | 'o';

const DRUM_BARS: Record<DrumStyle, string> = {
  // 16 pasos por compás: k = bombo, s = redoblante, h = hi-hat, o = hi-hat abierto.
  rock: 'k.h.s.h.k.h.s.hh',
  four: 'k.h.k.h.k.h.k.ho',
  shuffle: 'k..hs..hk..hs..h',
  march: 'k.s.s.s.k.s.ssss',
  bossa: 'k..h..k.k.hs..h.',
  soft: 'k...h...k...h..h',
  none: '................',
};

export function drumLine(style: DrumStyle, bars: number): { step: number; drum: Drum }[] {
  const pat = DRUM_BARS[style];
  const out: { step: number; drum: Drum }[] = [];
  for (let b = 0; b < bars; b++)
    for (let i = 0; i < 16; i++) {
      const ch = pat[i] as Drum | '.';
      if (ch !== '.') out.push({ step: b * 16 + i, drum: ch });
    }
  return out;
}

export function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}
