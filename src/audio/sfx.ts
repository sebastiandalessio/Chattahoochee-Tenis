// Efectos de sonido procedurales con Web Audio, estilo sfxr.

import { ac, sfxBus } from './engine';
export { setSfxVolume, unlockAudio } from './engine';

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
  const c = ac();
  const master = sfxBus();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function burst(dur: number, vol: number, freq: number, q = 1, delay = 0): void {
  const c = ac();
  const master = sfxBus();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** Voces de cada uno: tono, largo de cada bip, separación y forma de onda. */
const VOICES: Record<string, { freq: number; len: number; gap: number; wave: OscillatorType; jump: boolean; slide?: number }> = {
  elRosco: { freq: 200, len: 0.07, gap: 0.09, wave: 'square', jump: true },
  elSeba: { freq: 560, len: 0.04, gap: 0.05, wave: 'square', jump: true },
  trueTincho: { freq: 230, len: 0.08, gap: 0.11, wave: 'triangle', jump: false },
  volpi: { freq: 380, len: 0.05, gap: 0.07, wave: 'square', jump: true, slide: 1.2 },
  elVikingo: { freq: 115, len: 0.09, gap: 0.11, wave: 'sawtooth', jump: true },
  angelito: { freq: 470, len: 0.05, gap: 0.06, wave: 'square', jump: true },
  donGanso: { freq: 300, len: 0.08, gap: 0.1, wave: 'sawtooth', jump: false, slide: 0.7 },
  betty: { freq: 880, len: 0.05, gap: 0.08, wave: 'square', jump: false },
  mabel: { freq: 1250, len: 0.04, gap: 0.09, wave: 'sine', jump: false },
  narrador: { freq: 330, len: 0.04, gap: 0.07, wave: 'triangle', jump: true },
};

export const sfx = {
  hit(power = 0): void {
    tone(520 + power * 180, 0.07, 'square', 0.12, 180);
    burst(0.05, 0.5 + power * 0.3, 1800, 1.2);
  },
  smash(): void {
    tone(700, 0.12, 'square', 0.16, 120);
    burst(0.12, 0.8, 1200, 0.8);
  },
  bounce(): void {
    tone(300, 0.05, 'triangle', 0.18, 140);
  },
  net(): void {
    burst(0.18, 0.5, 300, 0.7);
  },
  whiff(): void {
    burst(0.12, 0.25, 3200, 2);
  },
  toss(): void {
    tone(440, 0.06, 'sine', 0.08, 660);
  },
  /** Canto del umpire (un bocinazo de ganso). */
  call(): void {
    tone(330, 0.09, 'sawtooth', 0.12, 280);
    tone(300, 0.12, 'sawtooth', 0.1, 220, 0.1);
  },
  point(): void {
    tone(660, 0.08, 'square', 0.08);
    tone(880, 0.12, 'square', 0.08, undefined, 0.08);
  },
  bip(): void {
    tone(900, 0.03, 'square', 0.05);
  },
  /** ¡Clinc! Un paso de la receta. */
  clinc(): void {
    tone(1320, 0.06, 'square', 0.08);
    tone(1980, 0.12, 'triangle', 0.1, undefined, 0.05);
  },
  ready(): void {
    [660, 830, 990, 1320].forEach((f, i) => tone(f, 0.1, 'square', 0.07, undefined, 0.12 + i * 0.07));
  },
  special(): void {
    tone(220, 0.35, 'sawtooth', 0.1, 880);
    burst(0.4, 0.3, 2400, 0.8, 0.05);
  },
  whoosh(): void {
    burst(0.25, 0.4, 1600, 0.6);
    tone(900, 0.2, 'sine', 0.06, 300);
  },
  betty(): void {
    for (let i = 0; i < 3; i++) {
      tone(180, 0.06, 'square', 0.12, 90, i * 0.05);
      burst(0.05, 0.4, 900, 1, i * 0.05);
    }
    tone(700, 0.25, 'square', 0.05, 350, 0.18); // "voz" de computadora vieja
  },
  ding(): void {
    tone(1568, 0.5, 'sine', 0.14);
    tone(2093, 0.4, 'sine', 0.06, undefined, 0.01);
  },
  laugh(): void {
    for (let i = 0; i < 4; i++) tone(520 - i * 30, 0.07, 'square', 0.06, 380, i * 0.1);
  },
  stamp(): void {
    burst(0.15, 0.9, 200, 0.6);
    tone(90, 0.2, 'square', 0.15, 50);
  },
  engine(): void {
    for (let i = 0; i < 6; i++) tone(70 + (i % 2) * 15, 0.1, 'sawtooth', 0.08, undefined, i * 0.1);
  },
  /** El POC del pickleball (bajito, que es constante). */
  poc(): void {
    tone(640, 0.04, 'triangle', 0.035, 420);
  },
  whistle(): void {
    tone(2600, 0.5, 'square', 0.05, 2900);
    tone(2450, 0.5, 'square', 0.03, 2700, 0.02);
  },
  splash(): void {
    burst(0.5, 0.5, 900, 0.5);
    burst(0.3, 0.3, 2400, 0.8, 0.1);
  },
  sneeze(): void {
    tone(700, 0.08, 'sawtooth', 0.06, 900);
    burst(0.18, 0.5, 3000, 0.7, 0.1);
  },
  clank(): void {
    tone(900, 0.08, 'square', 0.06, 700);
    burst(0.12, 0.3, 2000, 2);
  },
  kick(): void {
    tone(160, 0.08, 'sine', 0.2, 80);
  },
  /** La cargada de cada uno tiene su sonidito. */
  /**
   * "Voz" de un personaje cuando habla en un globo, como en los juegos de rol viejos: una tira de
   * bips con el tono de cada uno (grave el Vikingo, agudo y rápido Seba, monótono Tincho...).
   */
  voice(who: string, text: string): void {
    const v = VOICES[who] ?? VOICES.narrador;
    const n = Math.max(2, Math.min(10, Math.ceil(text.replace(/s/g, '').length / 5)));
    for (let i = 0; i < n; i++) {
      const f = v.freq * (1 + (v.jump ? ((i * 7919) % 5) / 10 - 0.2 : 0));
      tone(f, v.len, v.wave, 0.05, v.slide ? f * v.slide : undefined, i * v.gap);
    }
  },
  taunt(who: string): void {
    if (who === 'elSeba') {
      // ¡HEEEY! Voz sintetizada: una vocal que sube.
      tone(260, 0.5, 'sawtooth', 0.12, 420);
      tone(520, 0.5, 'square', 0.04, 840);
    } else if (who === 'elVikingo') {
      // Riff chiptune en quinta.
      [196, 196, 233, 262, 196].forEach((f, i) => {
        tone(f, 0.12, 'square', 0.08, undefined, i * 0.12);
        tone(f * 1.5, 0.12, 'square', 0.05, undefined, i * 0.12);
      });
    } else if (who === 'volpi' || who === 'elRosco') {
      this.laugh();
    } else if (who === 'donGanso') {
      this.call();
    } else if (who === 'trueTincho') {
      burst(0.4, 0.2, 700, 3); // sorbo de mate
    } else {
      // Llave inglesa: clanc clanc.
      tone(1400, 0.05, 'square', 0.08, undefined, 0);
      tone(1250, 0.05, 'square', 0.08, undefined, 0.15);
    }
  },
};
