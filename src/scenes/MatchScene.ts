// Escena del partido: corre la simulación a paso fijo y la dibuja.

import Phaser from 'phaser';
import { COURT } from '../logic/court';
import { horizontalSpeed } from '../logic/physics';
import { createRng } from '../logic/rng';
import { describeScore, other, pointLabel, type ScoreEvent, type Side } from '../logic/scoring';
import { NEUTRAL_STATS } from '../logic/stats';
import { keyboard, KEYMAP_1P, KEYMAP_2P_A, KEYMAP_2P_B } from '../input/keyboard';
import { CpuBrain } from '../sim/ai';
import { emptyInput, type PlayerInput } from '../sim/input';
import { Match, type MatchEvent, type PlayerSim } from '../sim/match';
import { pick, T } from '../texts/es';
import { sfx } from '../audio/sfx';
import { project, scaleAt } from '../game/projection';
import { RectPlayerView, type PlayerView } from '../game/rectPlayerView';
import { DEFAULT_SETUP, difficultyParams, surfaceOf, type MatchSetup } from '../game/setup';
import { drawCourtCanvas, drawNetCanvas, addCanvasTexture, GREY_THEME } from '../game/textures';
import { pxText } from '../ui/pixelFont';
import { Bubble, Commentary, UI, banner, drawBox, fullscreenButton } from '../ui/widgets';

const STEP = 1 / 120;

interface Particle {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
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
  private lastScoreCallPending = false;

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
  }

  create(): void {
    const s = this.setup;
    const diff = difficultyParams(s.difficulty);
    const human0 = s.mode !== 'demo';
    const human1 = s.mode === '2p';
    this.names =
      s.mode === '2p'
        ? [T.names.p1, T.names.p2]
        : s.mode === 'demo'
          ? [T.names.cpuB, T.names.cpuA]
          : [T.names.you, T.names.cpu];

    const setupFor = (human: boolean) => ({
      stats: NEUTRAL_STATS,
      human,
      errorMul: human ? 1 : diff.cpuErrorMul,
      assist: human ? diff.humanAssist : 0,
      serveMeterHalfPeriod: human ? diff.humanMeterHalf : 0.42,
    });
    const seed = s.seed ?? Math.floor(Math.random() * 1e9);
    this.match = new Match({
      rules: { gamesPerSet: s.games },
      surface: surfaceOf(s),
      players: [
        { name: this.names[0], ...setupFor(human0) },
        { name: this.names[1], ...setupFor(human1) },
      ],
      seed,
      firstServer: seed % 2 === 0 ? 0 : 1,
    });
    const rng = createRng(seed ^ 0x9e3779b9);
    this.brains = [human0 ? null : new CpuBrain(0, diff.ai, rng), human1 ? null : new CpuBrain(1, diff.ai, rng)];

    // Cancha.
    addCanvasTexture(this, 'court', drawCourtCanvas(GREY_THEME));
    this.add.image(0, 0, 'court').setOrigin(0).setDepth(-10000);
    const netArt = drawNetCanvas();
    addCanvasTexture(this, 'net', netArt.canvas);
    this.netBase = { x: netArt.x, y: netArt.y };
    this.net = this.add.image(netArt.x, netArt.y, 'net').setOrigin(0).setDepth(project(0, 0).sy);

    // Silla del umpire con Don Ganso provisorio.
    const chair = project(-COURT.netPostX - 1.1, 0);
    this.add.image(Math.round(chair.sx), Math.round(chair.sy), 'silla').setOrigin(0.5, 1).setDepth(chair.sy);
    this.add.image(Math.round(chair.sx), Math.round(chair.sy) - 14, 'ganso').setOrigin(0.5, 1).setDepth(chair.sy + 0.1);
    this.umpirePos = { x: Math.round(chair.sx) + 2, y: Math.round(chair.sy) - 30 };

    // Jugadores.
    for (const side of [0, 1] as Side[]) {
      const tag = s.mode === '2p' ? (side === 0 ? 'J1' : 'J2') : this.match.players[side].setup.human ? '' : 'CPU';
      const label = tag ? pxText(this, 0, 0, tag, { outline: true, color: side === 0 ? UI.cyan : UI.red }) : null;
      this.views.push(new RectPlayerView(this, side, label));
    }

    // Pelota.
    this.ballShadow = this.add.image(0, 0, 'shadow').setAlpha(0.4);
    for (let i = 0; i < 4; i++) this.trail.push(this.add.image(0, 0, 'px').setTint(0xd8f04a).setVisible(false));
    this.ball = this.add.image(0, 0, 'ballNear');

    this.createHud();
    this.bubble = new Bubble(this);
    this.commentary = new Commentary(this);
    fullscreenButton(this);

    keyboard.install();
    (window as unknown as { __cht: unknown }).__cht = { scene: this, match: this.match };
    this.handleEvents(this.match.drainEvents());
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
      this.setup.mode === '2p' ? T.hud.controls2P : T.hud.controls1P,
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
    if (m.phase === 'toss' || m.phase === 'preServe') {
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
    this.handleGlobalKeys();

    if (!this.paused) {
      if (this.freeze > 0) {
        this.freeze -= dt;
      } else {
        this.acc += dt * (this.setup.speed ?? 1);
        let steps = 0;
        while (this.acc >= STEP && steps < 60) {
          this.acc -= STEP;
          steps++;
          this.stepSim();
          if (this.match.hitStop > 0) {
            this.freeze = this.match.hitStop / (this.setup.speed ?? 1);
            this.match.hitStop = 0;
            this.acc = 0;
            break;
          }
        }
      }
      this.updateParticles(dt);
    }
    this.render();
    keyboard.endFrame();
  }

  private stepSim(): void {
    const m = this.match;
    const inputs: [PlayerInput, PlayerInput] = [emptyInput(), emptyInput()];
    for (const side of [0, 1] as Side[]) {
      const brain = this.brains[side];
      if (brain) inputs[side] = brain.think(m, STEP);
      else if (this.setup.mode === '2p') inputs[side] = keyboard.readPlayer(side === 0 ? KEYMAP_2P_A : KEYMAP_2P_B);
      else inputs[side] = keyboard.readPlayer(KEYMAP_1P);
    }
    m.step(STEP, inputs);
    this.handleEvents(m.drainEvents());
  }

  private handleGlobalKeys(): void {
    if (this.endUi.length) {
      if (keyboard.anyPressed(['Enter', 'Space', 'KeyZ'])) this.scene.restart(this.setup);
      else if (keyboard.wasPressed('Escape')) this.scene.start('testMenu', this.setup);
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
      else this.scene.start('testMenu', this.setup);
    }
  }

  // ------------------------------------------------------------------ eventos del partido

  private handleEvents(events: MatchEvent[]): void {
    const m = this.match;
    for (const e of events) {
      switch (e.type) {
        case 'pointStart':
          if (this.lastScoreCallPending) {
            this.lastScoreCallPending = false;
            this.callScore();
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
          this.time.delayedCall(1400, () => this.showEnd(e.winner));
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
    const loser = this.match.players[e.loser];
    if (loser.anim === 'dive' && e.reason === 'winner') this.say(pick(T.comments.diveMiss));
    this.lastScoreCallPending = true;
  }

  private onScore(events: ScoreEvent[]): void {
    const names = this.names;
    for (const ev of events) {
      if (ev.type === 'game') {
        this.lastScoreCallPending = false;
        this.call(T.calls.game(names[ev.winner]));
        banner(this, T.banners.game, UI.gold);
      } else if (ev.type === 'set') {
        banner(this, T.banners.set, UI.gold, 120);
      } else if (ev.type === 'match') {
        this.call(T.calls.match(names[ev.winner]), 3000);
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

  private call(text: string, ms = 1500): void {
    this.bubble.show(text, this.umpirePos.x, this.umpirePos.y, ms);
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

  private render(): void {
    const m = this.match;
    for (let i = 0; i < 2; i++) this.views[i].update(m.players[i], m);

    const b = m.ball;
    const ground = project(b.x, b.y);
    const air = project(b.x, b.y, b.z);
    const small = scaleAt(b.y) < 17;
    const inHand = m.phase === 'preServe';
    this.ball.setTexture(small ? 'ballFar' : 'ballNear');
    this.ball.setPosition(Math.round(air.sx), Math.round(air.sy) - 1).setDepth(ground.sy + 0.6);
    this.ball.setVisible(!inHand);
    this.ballShadow
      .setPosition(Math.round(ground.sx), Math.round(ground.sy))
      .setDepth(ground.sy + 0.4)
      .setAlpha(Math.max(0.12, 0.42 - b.z * 0.05))
      .setScale(Math.max(0.5, 1 - b.z * 0.08), 1)
      .setVisible(!inHand);

    // Estela para pelotas rápidas.
    const fast = m.phase === 'rally' && horizontalSpeed(b) > 17;
    this.trailPos.unshift({ x: air.sx, y: air.sy });
    this.trailPos.length = 8;
    this.trail.forEach((t, i) => {
      const p = this.trailPos[(i + 1) * 2 - 1];
      t.setVisible(fast && !!p);
      if (p) t.setPosition(Math.round(p.x), Math.round(p.y)).setDepth(ground.sy + 0.5).setAlpha(0.5 - i * 0.12);
    });

    // La red tiembla cuando la pelota pega.
    if (this.netShake > 0) {
      this.netShake -= 1 / 60;
      this.net.setPosition(this.netBase.x, this.netBase.y + (Math.floor(this.netShake * 40) % 2));
    } else this.net.setPosition(this.netBase.x, this.netBase.y);

    this.refreshHud();
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
    this.pauseUi = [g, title, ...opts];
    this.drawPauseSel();
  }

  private drawPauseSel(): void {
    this.pauseUi.slice(2).forEach((o, i) => {
      (o as Phaser.GameObjects.BitmapText).setTint(i === this.pauseSel ? UI.gold : UI.white);
    });
  }

  private closePause(): void {
    this.paused = false;
    for (const o of this.pauseUi) o.destroy();
    this.pauseUi = [];
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
    ];
    ui.push(pxText(this, 400, 122, this.names[0], { outline: true, color: UI.cyan }).setOrigin(0.5, 0).setDepth(9951));
    ui.push(pxText(this, 470, 122, this.names[1], { outline: true, color: UI.red }).setOrigin(0.5, 0).setDepth(9951));
    rows.forEach(([label, f], i) => {
      const y = 138 + i * 14;
      ui.push(pxText(this, 136, y, label, {}).setDepth(9951));
      ui.push(pxText(this, 400, y, f(m.players[0]), { color: UI.gold }).setOrigin(0.5, 0).setDepth(9951));
      ui.push(pxText(this, 470, y, f(m.players[1]), { color: UI.gold }).setOrigin(0.5, 0).setDepth(9951));
    });
    ui.push(pxText(this, 320, 290, T.end.again, { outline: true, color: UI.dim }).setOrigin(0.5, 0).setDepth(9951));
    this.endUi = ui;
    void other;
  }
}
