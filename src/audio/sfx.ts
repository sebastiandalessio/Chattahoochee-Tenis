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
