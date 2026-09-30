// Motor de audio compartido: un solo AudioContext con dos canales (efectos y música), cada uno
// con su volumen. El navegador solo deja sonar después de la primera tecla o clic.

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxVol = 0.8;
let musicVol = 0.6;
/** Atenuación de la música durante los partidos (para que se escuchen los golpes). */
let duck = 1;
const listeners: (() => void)[] = [];

export function ac(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
      sfxGain = ctx.createGain();
      sfxGain.gain.value = sfxVol;
      sfxGain.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = musicVol * duck * 0.5;
      musicGain.connect(ctx.destination);
      for (const f of listeners) f();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Avisa cuando el audio arranca (la música espera a la primera tecla). */
export function onAudioReady(f: () => void): void {
  if (ctx) f();
  else listeners.push(f);
}

export function audioStarted(): boolean {
  return !!ctx;
}

export function sfxBus(): GainNode | null {
  ac();
  return sfxGain;
}

export function musicBus(): GainNode | null {
  ac();
  return musicGain;
}

export function setSfxVolume(v: number): void {
  sfxVol = v;
  if (sfxGain) sfxGain.gain.value = v;
}

export function setMusicVolume(v: number): void {
  musicVol = v;
  applyMusic();
}

export function setMusicDuck(k: number): void {
  duck = k;
  applyMusic();
}

function applyMusic(): void {
  if (musicGain && ctx) musicGain.gain.setTargetAtTime(musicVol * duck * 0.5, ctx.currentTime, 0.08);
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
