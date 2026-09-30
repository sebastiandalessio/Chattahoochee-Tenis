// Reproductor de los temas chiptune: programa las notas un poquito antes de que suenen (con el
// reloj de Web Audio, que no se atrasa) y cambia de tema con un fundido cortito.

import { ac, musicBus, onAudioReady } from './engine';
import { SONGS, arpLine, bassLine, drumLine, midiToFreq, parseChords, parseLead, type Drum, type NoteEvent, type SongId, type SongSpec } from './songs';

interface Compiled {
  spec: SongSpec;
  steps: number;
  stepDur: number;
  lead: Map<number, NoteEvent[]>;
  bass: Map<number, NoteEvent[]>;
  arp: Map<number, NoteEvent[]>;
  drums: Map<number, Drum[]>;
}

const cache = new Map<SongId, Compiled>();

function byStep<T extends { step: number }>(list: T[]): Map<number, T[]> {
  const m = new Map<number, T[]>();
  for (const e of list) {
    if (!m.has(e.step)) m.set(e.step, []);
    m.get(e.step)!.push(e);
  }
  return m;
}

function compile(id: SongId): Compiled {
  const hit = cache.get(id);
  if (hit) return hit;
  const spec = SONGS[id];
  const chords = parseChords(spec.chords);
  const { notes, steps } = parseLead(spec.lead);
  const drums = new Map<number, Drum[]>();
  for (const d of drumLine(spec.drums, chords.length)) {
    if (!drums.has(d.step)) drums.set(d.step, []);
    drums.get(d.step)!.push(d.drum);
  }
  const c: Compiled = {
    spec,
    steps,
    stepDur: 60 / spec.bpm / 4,
    lead: byStep(notes),
    bass: byStep(bassLine(chords, spec.bass)),
    arp: byStep(spec.arp ? arpLine(chords) : []),
    drums,
  };
  cache.set(id, c);
  return c;
}

// ---------------------------------------------------------------- instrumentos

const waves = new Map<string, PeriodicWave>();

/** Onda cuadrada con ancho de pulso (12,5%, 25%, 50%), como las consolas de 8 bits. */
function pulse(c: AudioContext, duty: number): PeriodicWave {
  const key = String(duty);
  const hit = waves.get(key);
  if (hit) return hit;
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  const w = c.createPeriodicWave(real, imag);
  waves.set(key, w);
  return w;
}

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function voice(c: AudioContext, out: AudioNode, t: number, dur: number, freq: number, wave: number | 'triangle', vol: number): void {
  const o = c.createOscillator();
  if (wave === 'triangle') o.type = 'triangle';
  else o.setPeriodicWave(pulse(c, wave));
  o.frequency.setValueAtTime(freq, t);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.setValueAtTime(vol * 0.75, t + Math.min(dur * 0.4, 0.08));
  g.gain.linearRampToValueAtTime(0, t + dur * 0.95);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function drum(c: AudioContext, out: AudioNode, t: number, d: Drum): void {
  if (d === 'k') {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    const g = c.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.16);
    return;
  }
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const f = c.createBiquadFilter();
  const g = c.createGain();
  const len = d === 's' ? 0.12 : d === 'o' ? 0.16 : 0.035;
  f.type = d === 's' ? 'bandpass' : 'highpass';
  f.frequency.value = d === 's' ? 1800 : 7000;
  g.gain.setValueAtTime(d === 's' ? 0.3 : 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + len + 0.02);
}

// ---------------------------------------------------------------- reproductor

let current: SongId | null = null;
let wanted: SongId | null = null;
let songGain: GainNode | null = null;
let step = 0;
let nextTime = 0;
let timer: number | null = null;
let compiled: Compiled | null = null;

function tick(): void {
  const c = ac();
  if (!c || !compiled || !songGain) return;
  const s = compiled;
  while (nextTime < c.currentTime + 0.15) {
    if (step >= s.steps) {
      if (!s.spec.loop) {
        stopTimer();
        current = null;
        return;
      }
      step = 0;
    }
    const swing = step % 2 === 1 ? (s.spec.swing ?? 0) * s.stepDur : 0;
    const t = nextTime + swing;
    const out = songGain;
    for (const n of s.lead.get(step) ?? []) voice(c, out, t, n.len * s.stepDur, midiToFreq(n.midi), s.spec.leadWave ?? 0.25, 0.16);
    for (const n of s.bass.get(step) ?? []) voice(c, out, t, n.len * s.stepDur, midiToFreq(n.midi), 'triangle', 0.3);
    for (const n of s.arp.get(step) ?? []) voice(c, out, t, s.stepDur * 0.9, midiToFreq(n.midi), 0.125, 0.045);
    for (const d of s.drums.get(step) ?? []) drum(c, out, t, d);
    nextTime += s.stepDur;
    step++;
  }
}

function stopTimer(): void {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
}

function start(id: SongId): void {
  const c = ac();
  const bus = musicBus();
  if (!c || !bus) return;
  // Fundido del tema anterior.
  if (songGain) {
    const old = songGain;
    old.gain.setTargetAtTime(0, c.currentTime, 0.08);
    window.setTimeout(() => old.disconnect(), 600);
  }
  stopTimer();
  songGain = c.createGain();
  songGain.gain.value = 1;
  songGain.connect(bus);
  compiled = compile(id);
  current = id;
  step = 0;
  nextTime = c.currentTime + 0.06;
  timer = window.setInterval(tick, 25);
  tick();
}

export const music = {
  /** Toca un tema (si ya está sonando, sigue sin cortar). */
  play(id: SongId): void {
    wanted = id;
    if (current === id && (timer !== null || !SONGS[id].loop)) return;
    onAudioReady(() => {
      if (wanted === id) start(id);
    });
  },
  stop(): void {
    wanted = null;
    current = null;
    const c = ac();
    stopTimer();
    if (songGain && c) {
      const old = songGain;
      old.gain.setTargetAtTime(0, c.currentTime, 0.1);
      window.setTimeout(() => old.disconnect(), 700);
    }
    songGain = null;
  },
  get current(): SongId | null {
    return current;
  },
};
