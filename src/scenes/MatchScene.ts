// Escena del partido: corre la simulación a paso fijo y la dibuja.

import Phaser from 'phaser';
import { horizontalSpeed } from '../logic/physics';
import { createRng } from '../logic/rng';
import { describeScore, other, pointLabel, type ScoreEvent, type Side } from '../logic/scoring';
import { keyboard, keyNames, KEYMAP_1P, KEYMAP_2P_A, KEYMAP_2P_B } from '../input/keyboard';
import { CpuBrain } from '../sim/ai';
import { personalityFor } from '../sim/personalities';
import { emptyInput, type PlayerInput } from '../sim/input';
import { Match, type MatchEvent, type PlayerSetup, type PlayerSim } from '../sim/match';
import { pick, T } from '../texts/es';
import { sfx } from '../audio/sfx';
import { project, scaleAt } from '../game/projection';
import type { PlayerView } from '../game/playerView';
import { SpritePlayerView } from '../game/spritePlayerView';
import { ensureCharacterTextures, type CharacterTextures } from '../game/spriteTextures';
import { MystiqueFx, ensureMystiqueTextures } from '../game/mystiqueFx';
import { BOSS_STEP, towerRamp, winStep } from '../game/tower';
import { currentRival, relayGame } from '../game/bossRelay';
import type { BossCtx } from '../game/flow';
import { drawCan } from '../art/cutsceneArt';
import { CONFIRM, artTexture, goTo } from '../ui/screens';
import { music } from '../audio/music';
import { setMusicDuck } from '../audio/engine';
import type { SongId } from '../audio/songs';
import { clasicoOf } from '../game/characters';
import { RULES } from '../sim/rules';
import { CHARACTERS, type CharacterId } from '../game/characters';
import { DEFAULT_SETUP, difficultyParams, resolveChars, resolveVenue, type MatchSetup } from '../game/setup';
import { drawNetCanvas, addCanvasTexture } from '../game/textures';
import { VenueFx } from '../game/venueFx';
import { pxText, wrapText } from '../ui/pixelFont';
import { Bubble, Commentary, UI, banner, drawBox, fullscreenButton } from '../ui/widgets';

const STEP = 1 / 120;

interface Dialog {
  stage: 'arrive' | 'choose' | 'reply' | 'answer';
  t: number;
  sel: number;
  /** En el modo demo elige solo. */
  auto: boolean;
  choice: number;
  box: Phaser.GameObjects.GameObject[];
  opts: Phaser.GameObjects.BitmapText[];
  cursor: Phaser.GameObjects.BitmapText | null;
  asker: Bubble;
  me: Bubble;
}

interface Particle {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

/** Betty, la lanzapelotas, en la práctica: no se mueve, solo tira. */
class BettyView implements PlayerView {
  private img: Phaser.GameObjects.Image;
  hidden = false;

  constructor(scene: Phaser.Scene) {
    ensureMystiqueTextures(scene);
    this.img = scene.add.image(0, 0, 'betty').setOrigin(0.5, 1).setScale(1.5);
  }

  update(p: PlayerSim): void {
    const pos = project(p.x, p.y);
    this.img.setPosition(Math.round(pos.sx), Math.round(pos.sy)).setDepth(pos.sy).setVisible(!this.hidden);
  }

  destroy(): void {
    this.img.destroy();
  }
}

export class MatchScene extends Phaser.Scene {
  private setup: MatchSetup = DEFAULT_SETUP;
  match!: Match;
  private brains: [CpuBrain | null, CpuBrain | null] = [null, null];
  private views: PlayerView[] = [];
  private ball!: Phaser.GameObjects.Image;
  private ballShadow!: Phaser.GameObjects.Image;
  private trail: Phaser.GameObjects.Image[] = [];
  private trailPos: { x: number; y: number }[] = [];
  private net!: Phaser.GameObjects.Image;
  private netBase = { x: 0, y: 0 };
  private netShake = 0;
  private particles: Particle[] = [];
  private acc = 0;
  private freeze = 0;
  private paused = false;
  private pauseUi: Phaser.GameObjects.GameObject[] = [];
  private pauseSel = 0;
  private endUi: Phaser.GameObjects.GameObject[] = [];
  private hud!: {
    board: Phaser.GameObjects.Graphics;
    names: Phaser.GameObjects.BitmapText[];
    games: Phaser.GameObjects.BitmapText[];
    points: Phaser.GameObjects.BitmapText[];
    meter: Phaser.GameObjects.Graphics;
    kmh: Phaser.GameObjects.BitmapText;
    help: Phaser.GameObjects.BitmapText;
  };
  private bubble!: Bubble;
  private commentary!: Commentary;
  private umpirePos = { x: 0, y: 0 };
  private names: [string, string] = ['', ''];
  private chars: [CharacterId, CharacterId] = ['elRosco', 'elSeba'];
  private fx!: MystiqueFx;
  private venueFx!: VenueFx;
  /** Diálogo de elección múltiple (el del pickleball): mientras está abierto, el partido espera. */
  private dialog: Dialog | null = null;
  private lastScoreCallPending = false;
  /** HUD del relevo del Boss: retratos de la fila y latas. */
  private relayHud: { slots: Map<string, Phaser.GameObjects.Image>; cans: Phaser.GameObjects.Image[] } | null = null;
  /** Betty y Mabel mirando desde el costado (Boss). */
  private fans: { betty: Phaser.GameObjects.Image; mabel: Phaser.GameObjects.Image } | null = null;

  constructor() {
    super('match');
  }

  init(data: Partial<MatchSetup>): void {
    this.setup = { ...DEFAULT_SETUP, ...data };
    this.acc = 0;
    this.freeze = 0;
    this.paused = false;
    this.pauseUi = [];
    this.endUi = [];
    this.particles = [];
    this.trail = [];
    this.trailPos = [];
    this.views = [];
    this.dialog = null;
    this.relayHud = null;
    this.fans = null;
  }

  create(): void {
    const s = this.setup;
    const diff = difficultyParams(s.difficulty);
    const practice = s.mode === 'practice';
    const human0 = s.mode !== 'demo';
    const human1 = s.mode === '2p';
    const seed = s.seed ?? Math.floor(Math.random() * 1e9);
    const rng = createRng(seed ^ 0x9e3779b9);
    const boss = s.boss ?? null;
    const tower = s.tower ?? null;
    const chars: [CharacterId, CharacterId] = boss
      ? [boss.run.player, currentRival(boss.relay) ?? 'elRosco']
      : resolveChars(s.chars, () => rng.next());
    // Espejo (el mismo personaje de los dos lados): el de arriba usa el traje alternativo.
    const outfits: [number, number] = s.outfits ?? (boss ? [boss.run.outfit, 0] : [0, chars[0] === chars[1] ? 1 : 0]);
    this.names = [T.characters[chars[0]].name, T.characters[chars[1]].name];

    // En la torre la CPU se pone más difícil a medida que se sube (y el Boss, un poco más).
    const step = boss ? BOSS_STEP : tower ? tower.ctx.run.step : null;
    const ramp = step !== null ? towerRamp(step) : { errorMul: 1, reaction: 0 };
    const aiProfile = { ...diff.ai, reaction: Math.max(0.08, diff.ai.reaction + ramp.reaction) };
    const personalities = [personalityFor(chars[0], aiProfile), personalityFor(chars[1], aiProfile)];
    // Ventajas: chicana ganada o perdida, y los rivales del Boss con el primer paso de la receta.
    const extra: [Partial<PlayerSetup>, Partial<PlayerSetup>] = [{}, {}];
    // duels[s]: cómo le fue al jugador s contestando la chicana del otro.
    ([0, 1] as Side[]).forEach((me) => {
      const r = s.duels?.[me];
      const them = me === 0 ? 1 : 0;
      if (r === 'won') {
        extra[me].startRecipe = [true, false, false];
        extra[them].firstGameErrorMul = 1.3;
      } else if (r === 'lost') extra[them].startRecipe = [true, false, false];
    });
    void tower;
    if (boss) {
      extra[0].startRecipe = boss.recipe;
      extra[1].startRecipe = [true, false, false];
    }
    const setupFor = (human: boolean, id: CharacterId, side: Side) => ({
      stats: CHARACTERS[id].stats,
      short: CHARACTERS[id].short,
      slowStart: CHARACTERS[id].slowStart,
      charId: id,
      human,
      errorMul: human ? 1 : diff.cpuErrorMul * personalities[side].errorMul * ramp.errorMul,
      assist: human ? diff.humanAssist : 0,
      serveMeterHalfPeriod: human ? diff.humanMeterHalf : 0.42,
      ...extra[side],
    });
    const venue = boss ? 'chattahoochee' : practice ? 'breckenridge' : resolveVenue(s.venue, () => rng.next());
    this.match = new Match({
      // Relevo del Boss: cada game es un mini partido, con punto de oro después de 3 iguales.
      rules: boss ? { gamesPerSet: 1, goldenPointAfterDeuces: 3 } : { gamesPerSet: s.games },
      venue,
      practice,
      venueEvents: !practice,
      players: [
        { name: this.names[0], ...setupFor(human0, chars[0], 0) },
        { name: this.names[1], ...setupFor(human1, chars[1], 1) },
      ],
      seed,
      // En el relevo el saque alterna game a game, como en un partido normal.
      firstServer: practice ? 1 : boss ? (boss.relay.games % 2 === 0 ? 0 : 1) : seed % 2 === 0 ? 0 : 1,
    });
    this.brains = [
      human0 ? null : new CpuBrain(0, personalities[0], rng),
      human1 || practice ? null : new CpuBrain(1, personalities[1], rng),
    ];

    // Sede: escenografía, Don Ganso en su silla y los extras.
    this.venueFx = new VenueFx(this, this.match, venue, {
      say: (t, ms) => this.say(t, ms),
      call: (t, ms) => this.call(t, ms),
    });
    this.umpirePos = this.venueFx.umpireBubbleAt;
    const netArt = drawNetCanvas();
    addCanvasTexture(this, 'net', netArt.canvas);
    this.netBase = { x: netArt.x, y: netArt.y };
    this.net = this.add.image(netArt.x, netArt.y, 'net').setOrigin(0).setDepth(project(0, 0).sy);

    // Jugadores (en 2P, una etiqueta chiquita para saber quién es quién).
    const texs: CharacterTextures[] = [];
    for (const side of [0, 1] as Side[]) {
      const tag = s.mode === '2p' ? (side === 0 ? 'J1' : 'J2') : '';
      const label = tag ? pxText(this, 0, 0, tag, { outline: true, color: side === 0 ? UI.cyan : UI.red }) : null;
      const tex = ensureCharacterTextures(this, chars[side], outfits[side]);
      texs.push(tex);
      this.views.push(practice && side === 1 ? new BettyView(this) : new SpritePlayerView(this, side, tex, label));
    }
    this.chars = chars;

    // Pelota.
    this.ballShadow = this.add.image(0, 0, 'shadow').setAlpha(0.4);
    for (let i = 0; i < 4; i++) this.trail.push(this.add.image(0, 0, 'px').setTint(0xd8f04a).setVisible(false));
    this.ball = this.add.image(0, 0, 'ballNear');

    this.createHud();
    this.bubble = new Bubble(this);
    this.commentary = new Commentary(this);
    fullscreenButton(this);
    this.fx = new MystiqueFx(this, this.match, {
      chars,
      views: this.views,
      textures: [texs[0], texs[1]],
      humans: [human0, human1],
      twoPlayers: s.mode === '2p',
      hideSide: practice ? 1 : undefined,
      say: (t, ms) => this.say(t, ms),
      call: (t, ms) => this.call(t, ms),
    });

    if (boss) this.setupBoss(boss);
    if (chars.includes('donGanso') && !practice) this.time.delayedCall(1200, () => this.say(T.mystique.primo, 3600));

    // Música: la de la sede (o la del Boss, o la de la práctica). En los clásicos, primero el cantito.
    setMusicDuck(0.55);
    const song: SongId = practice ? 'practice' : boss ? 'boss' : venue;
    const clasico = !practice && !boss ? clasicoOf(chars[0], chars[1]) : null;
    if (clasico) {
      music.play('clasico');
      this.time.delayedCall(700, () => banner(this, T.vs.clasico[clasico], UI.gold, 110, 1800));
      this.time.delayedCall(9000, () => {
        if (this.match.phase !== 'matchOver') music.play(song);
      });
    } else music.play(song);
    if (practice) this.setupPractice();

    keyboard.install();
    keyboard.setPadMode(s.mode === '2p' ? '2p' : '1p');
    (window as unknown as { __cht: unknown }).__cht = { scene: this, match: this.match };
    this.handleEvents(this.match.drainEvents());
  }

  // ------------------------------------------------------------------ Boss: relevo por games

  private setupBoss(b: BossCtx): void {
    const g = this.add.graphics().setDepth(9000);
    const order = [...b.relay.queue, ...b.relay.eliminated];
    const x0 = 214;
    drawBox(g, x0, 3, 5 * 27 + 50, 31, 0x14131c, 0x3a3850, 0.85);
    const slots = new Map<string, Phaser.GameObjects.Image>();
    order.forEach((id, i) => {
      const x = x0 + 16 + i * 27;
      const out = b.relay.eliminated.includes(id);
      const img = this.add.image(x, 18, ensureCharacterTextures(this, id, 0).portrait, out ? 'lose' : 'normal').setScale(0.25).setDepth(9001);
      if (out) {
        img.setTint(0x555566);
        this.stampOn(x, 18, false);
      }
      if (i === 0) g.lineStyle(1, UI.gold).strokeRect(x - 13, 5, 26, 26);
      slots.set(id, img);
    });
    const cans: Phaser.GameObjects.Image[] = [];
    artTexture(this, 'canFull', () => drawCan(true));
    artTexture(this, 'canEmpty', () => drawCan(false));
    for (let i = 0; i < 3; i++) {
      cans.push(this.add.image(x0 + 5 * 27 + 12 + i * 12, 18, i < b.relay.cans ? 'canFull' : 'canEmpty').setDepth(9001));
    }
    this.relayHud = { slots, cans };

    // Betty y Mabel, la hinchada, al costado de la cancha.
    ensureMystiqueTextures(this);
    const bp = project(9.4, 4.5);
    const mp = project(9.6, 7.5);
    this.fans = {
      betty: this.add.image(Math.round(bp.sx), Math.round(bp.sy), 'betty').setOrigin(0.5, 1).setDepth(bp.sy),
      mabel: this.add.image(Math.round(mp.sx), Math.round(mp.sy), 'mabel').setOrigin(0.5, 1).setDepth(mp.sy),
    };

    // Presentación del game: quién toca ahora.
    const rival = this.chars[1];
    this.time.delayedCall(300, () => banner(this, T.boss.next(T.characters[rival].name), UI.red, 120, 1300));
    if (b.relay.cans === 1) this.time.delayedCall(1800, () => this.say(T.boss.lastCan, 3000));
    else this.time.delayedCall(1800, () => this.commentary.say(T.characters[rival].name, T.boss.intro[rival], 3000));
  }

  /** Sello rojo de ELIMINADO sobre un retratito del relevo. */
  private stampOn(x: number, y: number, animate: boolean): void {
    const t = pxText(this, x, y, T.boss.eliminated, { outline: true, color: UI.red }).setOrigin(0.5).setAngle(-18).setDepth(9002);
    if (animate) {
      t.setScale(4).setAlpha(0);
      this.tweens.add({ targets: t, scale: 0.9, alpha: 1, duration: 260, ease: 'Back.In', onComplete: () => sfx.stamp() });
    } else t.setScale(0.9);
  }

  /** Betty y Mabel reaccionan a cada punto. */
  private cheer(winner: Side): void {
    const f = this.fans;
    if (!f) return;
    const who = winner === 0 ? f.betty : f.mabel;
    this.tweens.add({ targets: who, y: who.y - 6, duration: 110, yoyo: true, repeat: 1 });
    if (Math.random() < 0.5) {
      const text = who === f.betty ? pick(T.boss.betty) : pick(T.boss.mabel);
      if (who === f.mabel) sfx.ding();
      else sfx.betty();
      const b = new Bubble(this);
      b.show(text, Math.round(who.x), Math.round(who.y - 26), 1100);
      this.time.delayedCall(1300, () => b.destroy());
    }
  }

  /** Terminó un game del relevo. */
  private bossGameEnd(winner: Side): void {
    const b = this.setup.boss!;
    const won = winner === 0;
    const relay = relayGame(b.relay, won);
    const recipe = [...this.match.myst.states[0].recipe] as [boolean, boolean, boolean];
    const rival = this.chars[1];
    const hud = this.relayHud;
    if (won) {
      const slot = hud?.slots.get(rival);
      if (slot) {
        slot.setTint(0x555566).setFrame('lose');
        this.stampOn(slot.x, slot.y, true);
      }
      banner(this, T.boss.eliminated, UI.red, 150, 1600);
      this.say(pick(T.boss.wonGame), 2600);
    } else {
      const can = hud?.cans[relay.cans];
      if (can) {
        this.tweens.add({ targets: can, angle: 90, y: can.y + 4, duration: 300, onComplete: () => can.setTexture('canEmpty').setAngle(0) });
      }
      banner(this, T.boss.backInLine(T.characters[rival].name), UI.gold, 150, 1600);
      this.say(pick(T.boss.lostCan), 2600);
      sfx.whiff();
    }
    this.time.delayedCall(2800, () => {
      const next: BossCtx = { ...b, relay, recipe, fresh: false };
      if (relay.state === 'won') goTo(this, 'bossWin', { boss: next });
      else if (relay.state === 'lost') goTo(this, 'gameover', { boss: next });
      else goTo(this, 'match', { ...this.setup, boss: next, seed: undefined });
    });
  }

  // ------------------------------------------------------------------ HUD

  private createHud(): void {
    const board = this.add.graphics().setDepth(9000);
    const names: Phaser.GameObjects.BitmapText[] = [];
    const games: Phaser.GameObjects.BitmapText[] = [];
    const points: Phaser.GameObjects.BitmapText[] = [];
    for (let i = 0; i < 2; i++) {
      const y = 7 + i * 14;
      names.push(pxText(this, 16, y, this.names[i === 0 ? 1 : 0], { outline: true }).setDepth(9001));
      games.push(pxText(this, 112, y, '0', { outline: true, color: UI.gold }).setDepth(9001));
      points.push(pxText(this, 130, y, '0', { outline: true }).setDepth(9001));
    }
    const meter = this.add.graphics().setDepth(9002);
    const kmh = pxText(this, 634, 16, '', { outline: true, color: UI.gold }).setOrigin(1, 0).setDepth(9001);
    const help = pxText(
      this,
      320,
      347,
      this.setup.mode === '2p' ? T.hud.controls2P(keyNames(KEYMAP_2P_A), keyNames(KEYMAP_2P_B)) : T.hud.controls1P(keyNames(KEYMAP_1P)),
      { outline: true, color: UI.dim },
    )
      .setOrigin(0.5, 0)
      .setDepth(9001);
    this.hud = { board, names, games, points, meter, kmh, help };
  }

  /** Fila 0 del marcador = jugador de arriba (1), fila 1 = jugador de abajo (0), como en la cancha. */
  private refreshHud(): void {
    const m = this.match;
    const h = this.hud;
    const g = h.board;
    g.clear();
    drawBox(g, 3, 3, 152, 31, 0x14131c, 0x3a3850, 0.85);
    for (let row = 0; row < 2; row++) {
      const side = (row === 0 ? 1 : 0) as Side;
      const p = m.players[side];
      const y = 7 + row * 14;
      const lastSet = m.score.completedSets[m.score.completedSets.length - 1];
      const games = m.score.winner !== null && lastSet ? lastSet[side] : m.score.games[side];
      h.games[row].setText(String(games));
      h.points[row].setText(pointLabel(m.score, side));
      if (m.score.server === side) {
        g.fillStyle(0xd8f04a).fillRect(7, y + 4, 4, 4);
        g.fillStyle(0x8fb02a).fillRect(8, y + 7, 2, 1);
      }
      // Barra de aire.
      const w = 40;
      g.fillStyle(0x000000, 0.6).fillRect(16, y + 11, w, 2);
      const col = p.air < 0.25 ? UI.red : p.air < 0.5 ? UI.gold : UI.green;
      g.fillStyle(col).fillRect(16, y + 11, Math.round(w * p.air), 2);
    }
    g.fillStyle(0x3a3850).fillRect(106, 6, 1, 26);
    g.fillRect(124, 6, 1, 26);
    if (m.score.inTiebreak) {
      g.fillStyle(UI.red).fillRect(126, 4, 26, 1);
    }

    // Medidor de saque junto a quien saca.
    const mg = h.meter;
    mg.clear();
    // (Solo para humanos: al CPU no le hace falta y tapa la cancha.)
    if ((m.phase === 'toss' || m.phase === 'preServe') && m.server.setup.human) {
      const srv = m.server;
      const pos = project(srv.x, srv.y);
      const x = Math.round(pos.sx) + srv.rightSign * 16 - 2;
      const y = Math.round(pos.sy) - 46;
      const H = 36;
      drawBox(mg, x - 1, y - 1, 7, H + 2, 0x101018, UI.ink, 0.9);
      mg.fillStyle(0x552222).fillRect(x + 1, y + 1, 3, Math.round(H * 0.15));
      if (m.phase === 'toss') {
        const fill = Math.round((H - 2) * m.meter);
        const col = m.meter > 0.85 ? UI.red : m.meter > 0.6 ? UI.gold : UI.green;
        mg.fillStyle(col).fillRect(x + 1, y + H - 1 - fill, 3, fill);
      }
    }
  }

  // ------------------------------------------------------------------ loop

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    if (this.dialog && !this.paused) this.updateDialog(dt);
    else this.handleGlobalKeys();

    if (!this.paused) {
      if (this.dialog) {
        // Se charla: el partido espera.
      } else if (this.freeze > 0) {
        this.freeze -= dt;
      } else {
        // El Paralelo Académico va en cámara lenta, como la repetición de la TV.
        this.acc += dt * (this.setup.speed ?? 1) * (this.match.slowMo ? 0.35 : 1);
        let steps = 0;
        while (this.acc >= STEP && steps < 60) {
          this.acc -= STEP;
          steps++;
          this.stepSim();
          if (this.dialog) break;
          if (this.match.hitStop > 0) {
            this.freeze = this.match.hitStop / (this.setup.speed ?? 1);
            this.match.hitStop = 0;
            this.acc = 0;
            break;
          }
        }
      }
      this.updateParticles(dt);
      this.fx.update(dt);
      this.venueFx.update(dt);
    }
    this.render(dt);
    keyboard.endFrame();
  }

  private stepSim(): void {
    const m = this.match;
    const inputs: [PlayerInput, PlayerInput] = [emptyInput(), emptyInput()];
    for (const side of [0, 1] as Side[]) {
      const brain = this.brains[side];
      if (brain) inputs[side] = brain.think(m, STEP);
      else if (this.setup.mode === 'practice' && side === 1) inputs[side] = emptyInput();
      else if (this.setup.mode === '2p') inputs[side] = keyboard.readPlayer(side === 0 ? KEYMAP_2P_A : KEYMAP_2P_B);
      else inputs[side] = keyboard.readPlayer(KEYMAP_1P);
    }
    m.step(STEP, inputs);
    this.handleEvents(m.drainEvents());
  }

  private handleGlobalKeys(): void {
    if (this.endUi.length) {
      const tw = this.setup.tower;
      if (tw) {
        if (keyboard.anyPressed(CONFIRM)) this.towerNext();
        return;
      }
      if (keyboard.anyPressed(['Enter', 'Space', 'KeyZ'])) this.scene.restart(this.setup);
      else if (keyboard.wasPressed('Escape')) goTo(this, 'testMenu', this.setup);
      return;
    }
    // Con el partido terminado no hay pausa: Enter y Esc son para la pantalla final.
    if (this.match.phase === 'matchOver') return;
    if (!this.paused) {
      if (keyboard.anyPressed(['Escape', 'Enter'])) this.openPause();
      return;
    }
    if (keyboard.anyPressed(['ArrowUp', 'KeyW'])) this.pauseSel = (this.pauseSel + 2) % 3;
    if (keyboard.anyPressed(['ArrowDown', 'KeyS'])) this.pauseSel = (this.pauseSel + 1) % 3;
    this.drawPauseSel();
    if (keyboard.wasPressed('Escape')) this.closePause();
    else if (keyboard.anyPressed(['Enter', 'KeyZ', 'KeyF', 'KeyK', 'Space'])) {
      if (this.pauseSel === 0) this.closePause();
      else if (this.pauseSel === 1) this.scene.restart(this.setup);
      else this.quitToMenu();
    }
  }

  // ------------------------------------------------------------------ eventos del partido

  private handleEvents(events: MatchEvent[]): void {
    const m = this.match;
    for (const e of events) {
      // Mística: el módulo de efectos puede pedir congelar el partido (cut-in de especial).
      const freeze = this.fx?.onEvent(e) ?? 0;
      this.venueFx?.onEvent(e);
      if (e.type === 'venue' && e.id === 'pregunta') this.startDialog();
      if (freeze > 0) {
        this.freeze = Math.max(this.freeze, freeze);
        this.acc = 0;
      }
      switch (e.type) {
        case 'pointStart':
          if (this.lastScoreCallPending) {
            this.lastScoreCallPending = false;
            // Si Don Ganso se acaba de despertar, primero dice lo suyo.
            if (this.venueFx.justWoke) this.time.delayedCall(1900, () => this.callScore());
            else this.callScore();
          }
          if (e.attempt === 2) this.hud.kmh.setText(T.hud.secondServe);
          break;
        case 'toss':
          sfx.toss();
          break;
        case 'serve':
          this.hud.kmh.setText(T.hud.kmh(e.kmh));
          this.shake(e.power > 0.85 ? 0.004 : 0);
          sfx.hit(e.power);
          break;
        case 'hit': {
          const pos = project(e.x, e.y, e.z);
          const strong = e.kind === 'smash' || e.charge > 0.6;
          if (e.kind === 'smash') sfx.smash();
          else sfx.hit(e.charge);
          this.burst(pos.sx, pos.sy, strong ? 8 : 4, strong ? UI.gold : 0xffffff, strong ? 60 : 35);
          if (strong) this.shake(e.kind === 'smash' ? 0.008 : 0.004);
          if (e.kind === 'smash' || e.charge > 0.3) this.hud.kmh.setText(T.hud.kmh(e.kmh));
          break;
        }
        case 'bounce': {
          const pos = project(e.x, e.y);
          this.burst(pos.sx, pos.sy, e.inPlay ? 5 : 3, 0xcfd3dd, 22, true);
          if (e.speed > 1) sfx.bounce();
          break;
        }
        case 'net':
          this.netShake = 0.25;
          sfx.net();
          break;
        case 'netCord':
          this.netShake = 0.15;
          sfx.net();
          this.say(pick(T.comments.netCord));
          break;
        case 'whiff':
          sfx.whiff();
          if (Math.random() < 0.35) this.say(pick(T.comments.whiff));
          break;
        case 'retoss':
          if (Math.random() < 0.5) this.say(pick(T.comments.retoss));
          break;
        case 'fault':
          if (e.attempt === 1) this.call(T.calls.fault);
          else {
            this.call(T.calls.doubleFault);
            banner(this, T.banners.doubleFault, UI.red);
            this.say(pick(T.comments.doubleFault));
          }
          break;
        case 'let':
          this.call(T.calls.let);
          break;
        case 'point':
          this.onPoint(e);
          break;
        case 'score':
          this.onScore(e.events);
          break;
        case 'matchOver':
          if (this.setup.boss) this.time.delayedCall(900, () => this.bossGameEnd(e.winner));
          else {
            // Fanfarria o bajada triste, según quién ganó (en 2P o mirando, siempre fanfarria).
            const lost = this.setup.mode === 'cpu' && e.winner === 1;
            music.play(lost ? 'defeat' : 'victory');
            this.time.delayedCall(1400, () => this.showEnd(e.winner));
          }
          break;
        case 'feed':
          sfx.betty();
          this.hud.kmh.setText(T.hud.kmh(e.kmh));
          break;
        case 'practice':
          this.onPractice(e);
          break;
        default:
          break;
      }
    }
    void m;
  }

  private onPoint(e: Extract<MatchEvent, { type: 'point' }>): void {
    if (e.reason === 'out') this.call(e.out === 'long' ? T.calls.outLong : T.calls.outWide);
    else if (e.reason === 'net') this.call(T.calls.net);
    else if (e.reason === 'ace') {
      this.call(T.calls.ace);
      banner(this, T.banners.ace, UI.cyan);
      this.say(pick(T.comments.ace));
    }
    if (e.rally >= 12) this.say(pick(T.comments.longRally));
    if (this.setup.boss) this.cheer(e.winner);
    const loser = this.match.players[e.loser];
    if (loser.anim === 'dive' && e.reason === 'winner') this.say(pick(T.comments.diveMiss));
    this.lastScoreCallPending = true;
  }

  private onScore(events: ScoreEvent[]): void {
    const names = this.names;
    for (const ev of events) {
      // En el relevo del Boss cada game es un "partido": no se canta set ni partido.
      if (this.setup.boss && (ev.type === 'set' || ev.type === 'match')) continue;
      if (ev.type === 'game') {
        this.lastScoreCallPending = false;
        this.call(T.calls.game(names[ev.winner]));
        banner(this, T.banners.game, UI.gold);
      } else if (ev.type === 'set') {
        banner(this, T.banners.set, UI.gold, 120);
      } else if (ev.type === 'match') {
        this.call(T.calls.match(names[ev.winner]), 3000, true);
        banner(this, T.banners.match, UI.gold, 150, 2200);
      } else if (ev.type === 'tiebreakStart') {
        this.time.delayedCall(900, () => banner(this, T.banners.tiebreak, UI.red));
      } else if (ev.type === 'changeEnds') {
        this.time.delayedCall(700, () => this.say(pick(T.comments.changeEnds), 3200));
      }
    }
  }

  private callScore(): void {
    const s = this.match.score;
    const c = describeScore(s);
    if (c.kind === 'deuce') this.call(T.calls.deuce);
    else if (c.kind === 'golden') this.call(T.calls.golden);
    else if (c.kind === 'advantage') this.call(T.calls.advantage(this.names[c.side]));
    else if (c.kind === 'tiebreak') this.call(`${c.a}-${c.b}`);
    else if (!(c.server === '0' && c.receiver === '0')) this.call(T.calls.points(c.server, c.receiver));
  }

  /** Canto de Don Ganso desde la silla (si está dormido no canta nada, salvo el final). */
  private call(text: string, ms = 1500, force = false): void {
    if (this.venueFx?.sleeping && !force) return;
    this.bubble.show(text, this.umpirePos.x, this.umpirePos.y, ms);
    this.venueFx?.honk();
    sfx.call();
  }

  private say(text: string, ms = 2600): void {
    this.commentary.say('DON GANSO', text, ms);
  }

  private shake(intensity: number): void {
    if (intensity > 0) this.cameras.main.shake(90, intensity);
  }

  // ------------------------------------------------------------------ partículas

  private burst(x: number, y: number, n: number, tint: number, speed: number, ground = false): void {
    for (let i = 0; i < n; i++) {
      const a = ground ? Math.PI + Math.random() * Math.PI : Math.random() * Math.PI * 2;
      const sp = speed * (0.5 + Math.random() * 0.7);
      const img = this.add.image(x, y, 'px').setTint(tint).setDepth(y + 1);
      const life = 0.18 + Math.random() * 0.2;
      this.particles.push({ img, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * (ground ? 0.5 : 1), life, max: life });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      p.img.setPosition(Math.round(p.x), Math.round(p.y)).setAlpha(Math.max(0, p.life / p.max));
    }
    this.particles = this.particles.filter((p) => {
      if (p.life > 0) return true;
      p.img.destroy();
      return false;
    });
  }

  // ------------------------------------------------------------------ dibujo

  private render(dt: number): void {
    const m = this.match;
    for (let i = 0; i < 2; i++) this.views[i].update(m.players[i], m);

    const b = m.ball;
    const ground = project(b.x, b.y);
    const air = project(b.x, b.y, b.z);
    const small = scaleAt(b.y) < 17;
    const inHand = m.phase === 'preServe';
    this.ball.setTexture(this.fx.ballTexture() ?? (small ? 'ballFar' : 'ballNear'));
    this.ball.setPosition(Math.round(air.sx), Math.round(air.sy) - 1).setDepth(ground.sy + 0.6);
    const hidden = inHand || this.venueFx.ballHidden;
    this.ball.setVisible(!hidden);
    this.ballShadow
      .setPosition(Math.round(ground.sx), Math.round(ground.sy))
      .setDepth(ground.sy + 0.4)
      .setAlpha(Math.max(0.12, 0.42 - b.z * 0.05))
      .setScale(Math.max(0.5, 1 - b.z * 0.08), 1)
      .setVisible(!hidden);

    // Estela para pelotas rápidas.
    const fast = m.phase === 'rally' && horizontalSpeed(b) > 17;
    this.trailPos.unshift({ x: air.sx, y: air.sy });
    this.trailPos.length = 8;
    this.trail.forEach((t, i) => {
      const p = this.trailPos[(i + 1) * 2 - 1];
      t.setVisible(fast && !!p && !hidden);
      if (p) t.setPosition(Math.round(p.x), Math.round(p.y)).setDepth(ground.sy + 0.5).setAlpha(0.5 - i * 0.12);
    });

    // La red tiembla cuando la pelota pega.
    if (this.netShake > 0) {
      this.netShake -= 1 / 60;
      this.net.setPosition(this.netBase.x, this.netBase.y + (Math.floor(this.netShake * 40) % 2));
    } else this.net.setPosition(this.netBase.x, this.netBase.y);

    this.refreshHud();
    this.fx.render(dt);
  }

  // ------------------------------------------------------------------ diálogo (la pregunta del pickleball)

  private startDialog(): void {
    if (this.dialog) return;
    this.dialog = {
      stage: 'arrive',
      t: 1.3,
      sel: 0,
      auto: this.setup.mode === 'demo',
      choice: 0,
      box: [],
      opts: [],
      cursor: null,
      asker: new Bubble(this),
      me: new Bubble(this),
    };
  }

  private updateDialog(dt: number): void {
    const d = this.dialog!;
    const q = T.venues.events.pregunta;
    d.t -= dt * (d.auto ? (this.setup.speed ?? 1) : 1);
    if (d.stage === 'arrive') {
      if (d.t > 0) return;
      const head = this.venueFx.askerHead() ?? { x: 110, y: 190 };
      d.asker.show(wrapText(q.ask, 200), head.x, head.y, 600000);
      sfx.bip();
      const g = this.add.graphics().setDepth(9700);
      drawBox(g, 36, 262, 568, 70, 0x191826, UI.gold, 0.95);
      d.opts = q.options.map((o, i) =>
        pxText(this, 56, 269 + i * 15, o, { outline: true }).setDepth(9701),
      );
      d.cursor = pxText(this, 44, 269, '▶', { outline: true, color: UI.gold }).setDepth(9701);
      d.box = [g, ...d.opts, d.cursor];
      d.stage = 'choose';
      // Si nadie contesta en un rato, contesta solo (con la más corta).
      d.t = d.auto ? 2.4 : 14;
      this.paintDialogSel();
      return;
    }
    if (d.stage === 'choose') {
      if (d.auto) {
        if (d.t <= 0) this.chooseDialog(Math.floor(Math.random() * q.options.length));
        return;
      }
      const n = q.options.length;
      if (d.t <= 0) {
        this.chooseDialog(n - 1);
        return;
      }
      if (keyboard.anyPressed(['ArrowUp', 'KeyW', 'KeyI'])) {
        d.sel = (d.sel + n - 1) % n;
        sfx.bip();
      }
      if (keyboard.anyPressed(['ArrowDown', 'KeyS'])) {
        d.sel = (d.sel + 1) % n;
        sfx.bip();
      }
      this.paintDialogSel();
      if (keyboard.anyPressed(['Enter', 'Space', 'KeyZ', 'KeyF', 'KeyK'])) this.chooseDialog(d.sel);
      return;
    }
    if (d.stage === 'reply' && d.t <= 0) {
      const head = this.venueFx.askerHead() ?? { x: 110, y: 190 };
      d.me.hide();
      d.asker.show(wrapText(q.answers[d.choice], 220), head.x, head.y, 600000);
      d.stage = 'answer';
      d.t = 3.2;
      return;
    }
    if (d.stage === 'answer' && d.t <= 0) {
      d.asker.destroy();
      d.me.destroy();
      this.venueFx.sendAskerAway();
      this.say(pick(q.comment));
      this.dialog = null;
      this.acc = 0;
    }
  }

  private paintDialogSel(): void {
    const d = this.dialog!;
    d.opts.forEach((t, i) => t.setTint(i === d.sel ? UI.gold : UI.white));
    d.cursor?.setY(269 + d.sel * 15);
  }

  private chooseDialog(i: number): void {
    const d = this.dialog!;
    const q = T.venues.events.pregunta;
    d.choice = i;
    d.sel = i;
    for (const o of d.box) o.destroy();
    d.box = [];
    d.opts = [];
    d.cursor = null;
    d.asker.hide();
    // Contesta el de abajo (en 1P es el humano; en la demo, el CPU de abajo).
    const p = this.match.players[0];
    const at = project(p.x, p.y);
    d.me.show(wrapText(q.options[i], 220), Math.round(at.sx), Math.round(at.sy) - 62, 600000);
    sfx.ready();
    d.stage = 'reply';
    d.t = 2.2;
  }

  // ------------------------------------------------------------------ pausa y final

  private openPause(): void {
    this.paused = true;
    this.pauseSel = 0;
    const g = this.add.graphics().setDepth(9950);
    g.fillStyle(0x000000, 0.55).fillRect(0, 0, 640, 360);
    drawBox(g, 220, 110, 200, 110, 0x191826, UI.gold);
    const title = pxText(this, 320, 118, T.pause.title, { outline: true, color: UI.gold, scale: 2 })
      .setOrigin(0.5, 0)
      .setDepth(9951);
    const opts = [T.pause.resume, T.pause.restart, T.pause.quit].map((txt, i) =>
      pxText(this, 320, 152 + i * 18, txt, { outline: true }).setOrigin(0.5, 0).setDepth(9951),
    );
    // Recetas de los dos, para saber qué falta para el especial.
    drawBox(g, 110, 230, 420, 70, 0x191826, 0x3a3850);
    const extra: Phaser.GameObjects.GameObject[] = [];
    ([0, 1] as Side[]).forEach((side, row) => {
      const who = this.chars[side];
      const st = this.match.myst.states[side];
      const steps = RULES[who].recipe
        .map((id, i) => `${st.recipe[i] ? '✓' : '·'} ${T.steps[id]}`)
        .join('   ');
      const y = 236 + row * 32;
      extra.push(pxText(this, 118, y, `${this.names[side]} — ${T.specials[RULES[who].special].name}`, { outline: true, color: UI.gold }).setDepth(9951));
      extra.push(pxText(this, 118, y + 13, steps, {}).setDepth(9951));
    });
    this.pauseUi = [g, title, ...opts, ...extra];
    this.drawPauseSel();
  }

  private drawPauseSel(): void {
    this.pauseUi.slice(2, 5).forEach((o, i) => {
      (o as Phaser.GameObjects.BitmapText).setTint(i === this.pauseSel ? UI.gold : UI.white);
    });
  }

  private closePause(): void {
    this.paused = false;
    for (const o of this.pauseUi) o.destroy();
    this.pauseUi = [];
  }

  /** Salir desde la pausa: el amistoso vuelve a su pantalla; la torre, el Boss y la práctica, al menú. */
  private quitToMenu(): void {
    const s = this.setup;
    if (s.tower || s.boss || s.mode === 'practice') goTo(this, 'menu');
    else goTo(this, 'testMenu', s);
  }

  // ------------------------------------------------------------------ práctica con Betty

  private practiceText: Phaser.GameObjects.BitmapText | null = null;

  private setupPractice(): void {
    const h = this.hud;
    for (const t of [...h.names, ...h.games, ...h.points]) t.setVisible(false);
    h.board.setVisible(false);
    const g = this.add.graphics().setDepth(9000);
    drawBox(g, 3, 3, 300, 18, 0x14131c, 0x3a3850, 0.85);
    this.practiceText = pxText(this, 10, 7, T.practice.stats(0, 0, 0), { outline: true, color: UI.gold }).setDepth(9001);
    h.help.setText(T.hud.controls1P(keyNames(KEYMAP_1P)));
    this.time.delayedCall(600, () => this.bettySays(T.practice.hello, 3600));
  }

  private bettySays(text: string, ms = 2600): void {
    this.commentary.say('BETTY', text, ms);
    sfx.voice('betty', text);
  }

  private onPractice(e: Extract<MatchEvent, { type: 'practice' }>): void {
    this.practiceText?.setText(T.practice.stats(e.returns, e.streak, e.best));
    if (e.newProgram) {
      this.bettySays(T.practice.programs[e.newProgram], 2400);
      return;
    }
    if (e.good && e.streak > 0 && e.streak % 5 === 0) this.bettySays(T.practice.streak(e.streak));
    else if (e.good && Math.random() < 0.25) this.bettySays(pick(T.practice.good));
    else if (!e.good && Math.random() < 0.4) this.bettySays(pick(T.practice.miss));
    else if (Math.random() < 0.08) this.bettySays(pick(T.practice.mabel));
  }

  /** Torre: ganó → sube un escalón; perdió → ¿CONTINUAR? */
  private towerNext(): void {
    const tw = this.setup.tower!;
    const sc = this.match.score;
    if (sc.winner === 0) {
      const set = sc.completedSets[0];
      goTo(this, 'tower', { ctx: { ...tw.ctx, run: winStep(tw.ctx.run, set ? `${set[0]}-${set[1]}` : '') }, climbed: true });
    } else goTo(this, 'gameover', { tower: tw.ctx });
  }

  private showEnd(winner: Side): void {
    if (this.paused) this.closePause();
    const m = this.match;
    const g = this.add.graphics().setDepth(9950);
    g.fillStyle(0x000000, 0.6).fillRect(0, 0, 640, 360);
    drawBox(g, 120, 50, 400, 260, 0x191826, UI.gold);
    const ui: Phaser.GameObjects.GameObject[] = [g];
    ui.push(
      pxText(this, 320, 60, T.end.winner(this.names[winner]), { outline: true, color: UI.gold, scale: 2 })
        .setOrigin(0.5, 0)
        .setDepth(9951),
    );
    const sets = m.score.completedSets.map((s) => `${s[0]}-${s[1]}`).join('  ');
    ui.push(pxText(this, 320, 88, sets, { outline: true }).setOrigin(0.5, 0).setDepth(9951));
    ui.push(pxText(this, 320, 104, T.end.stats, { color: UI.dim }).setOrigin(0.5, 0).setDepth(9951));
    const rows: [string, (p: PlayerSim) => string][] = [
      [T.end.rows.points, (p) => String(p.counters.pointsWon)],
      [T.end.rows.aces, (p) => String(p.counters.aces)],
      [T.end.rows.doubleFaults, (p) => String(p.counters.doubleFaults)],
      [T.end.rows.winners, (p) => String(p.counters.winners)],
      [T.end.rows.unforced, (p) => String(p.counters.unforcedErrors)],
      [T.end.rows.dives, (p) => String(p.counters.dives)],
      [T.end.rows.whiffs, (p) => String(p.counters.whiffs)],
      [T.end.rows.distance, (p) => String(Math.round(p.counters.distance))],
      [T.end.rows.maxKmh, (p) => `${p.counters.maxKmh}`],
      [T.end.rows.taunts, (p) => String(p.counters.taunts)],
      [T.end.rows.specials, (p) => String(p.counters.specials)],
      [T.end.rows.lumbar, (p) => String(p.counters.lumbar)],
    ];
    ui.push(pxText(this, 400, 122, this.names[0], { outline: true, color: UI.cyan }).setOrigin(0.5, 0).setDepth(9951));
    ui.push(pxText(this, 470, 122, this.names[1], { outline: true, color: UI.red }).setOrigin(0.5, 0).setDepth(9951));
    rows.forEach(([label, f], i) => {
      const y = 136 + i * 12;
      ui.push(pxText(this, 136, y, label, {}).setDepth(9951));
      ui.push(pxText(this, 400, y, f(m.players[0]), { color: UI.gold }).setOrigin(0.5, 0).setDepth(9951));
      ui.push(pxText(this, 470, y, f(m.players[1]), { color: UI.gold }).setOrigin(0.5, 0).setDepth(9951));
    });
    // La estadística absurda de cada uno (las cargadas, con nombre propio).
    const absurd = ([0, 1] as Side[]).map((sd) => `${this.names[sd]}: ${T.result.absurd[this.chars[sd]]} ${m.players[sd].counters.taunts}`).join('  ·  ');
    ui.push(pxText(this, 320, 280, absurd, { color: UI.cyan }).setOrigin(0.5, 0).setDepth(9951));
    const tw = this.setup.tower;
    const again = tw ? (winner === 0 ? T.result.towerNext : T.result.towerLost) : T.end.again;
    if (tw)
      ui.push(
        pxText(this, 320, 36, winner === 0 ? T.result.won : T.result.lost, { outline: true, color: winner === 0 ? UI.green : UI.red, scale: 2 })
          .setOrigin(0.5, 0)
          .setDepth(9951),
      );
    ui.push(pxText(this, 320, 294, again, { outline: true, color: UI.dim }).setOrigin(0.5, 0).setDepth(9951));
    this.endUi = ui;
    void other;
  }
}
