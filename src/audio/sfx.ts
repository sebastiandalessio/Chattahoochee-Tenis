// Efectos de sonido procedurales con Web Audio (versión mínima; en el hito 6 llega el chiptune completo).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.6;

function ac(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** El navegador solo deja sonar audio después de una tecla o clic. */
export function unlockAudio(): void {
  const once = () => {
    ac();
    window.removeEventListener('keydown', once);
    window.removeEventListener('pointerdown', once);
  };
  window.addEventListener('keydown', once);
  window.addEventListener('pointerdown', once);
}

export function setSfxVolume(v: number): void {
  volume = v;
  if (master) master.gain.value = v;
}

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
};
