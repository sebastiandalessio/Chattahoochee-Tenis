import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W } from './game/projection';
import { BootScene } from './scenes/BootScene';
import { keyboard } from './input/keyboard';
import { MatchScene } from './scenes/MatchScene';
import { TestMenuScene } from './scenes/TestMenuScene';
import { CharSelectScene } from './scenes/CharSelectScene';
import { TowerScene } from './scenes/TowerScene';
import { VsScene } from './scenes/VsScene';
import { DuelScene } from './scenes/DuelScene';
import { GameOverScene } from './scenes/GameOverScene';
import { BossIntroScene } from './scenes/BossIntroScene';
import { BossWinScene } from './scenes/BossWinScene';
import { EndingScene } from './scenes/EndingScene';
import { MainMenuScene, SplashScene, TitleScene } from './scenes/TitleScenes';
import { HowToScene, KeysScene, OptionsScene } from './scenes/OptionsScenes';
import { CreditsScene } from './scenes/CreditsScene';

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
  scene: [BootScene, TestMenuScene, MatchScene, CharSelectScene, TowerScene, VsScene, DuelScene, GameOverScene, BossIntroScene, BossWinScene, EndingScene, SplashScene, TitleScene, MainMenuScene, OptionsScene, KeysScene, HowToScene, CreditsScene],
});

// Joysticks: se leen una vez por frame, antes de que corran las escenas.
game.events.on(Phaser.Core.Events.PRE_STEP, () => keyboard.pollPads());

// Para las pruebas automáticas (qué pantalla está activa).
(window as unknown as { __game: Phaser.Game }).__game = game;

const refit = () => game.scale.setZoom(integerZoom());
window.addEventListener('resize', refit);
document.addEventListener('fullscreenchange', () => setTimeout(refit, 50));
