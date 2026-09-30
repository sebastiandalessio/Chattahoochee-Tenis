import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W } from './game/projection';
import { BootScene } from './scenes/BootScene';
import { MatchScene } from './scenes/MatchScene';
import { TestMenuScene } from './scenes/TestMenuScene';

/** Zoom entero más grande que entra en la ventana (pixel art sin deformar). */
function integerZoom(): number {
  return Math.max(1, Math.floor(Math.min(window.innerWidth / SCREEN_W, window.innerHeight / SCREEN_H)));
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  width: SCREEN_W,
  height: SCREEN_H,
  backgroundColor: '#0d0b14',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: integerZoom(),
  },
  // ?timer=1 usa setTimeout en vez de requestAnimationFrame (útil en navegadores de prueba sin foco).
  fps: { target: 60, forceSetTimeOut: new URLSearchParams(window.location.search).has('timer') },
  input: { keyboard: false, gamepad: true },
  scene: [BootScene, TestMenuScene, MatchScene],
});

const refit = () => game.scale.setZoom(integerZoom());
window.addEventListener('resize', refit);
document.addEventListener('fullscreenchange', () => setTimeout(refit, 50));
