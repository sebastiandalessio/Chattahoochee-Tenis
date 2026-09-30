// Plantilla de cuerpo compartida: un esqueleto simple (caderas, torso, brazos, piernas) que se
// posa con ángulos y se dibuja con contorno. Cada personaje aporta su contextura, su ropa y su
// cabeza (grillas de píxeles). Así las 10 animaciones sirven para los seis sin repetir trabajo.

import { PAL } from './palette';
import { Painter, type Pt } from './painter';
import type { CharacterArt, Outfit } from './characters/types';

export const FRAME_W = 48;
export const FRAME_H = 64;
export const BASE_Y = 60;
const CX = 24;

export interface Build {
  thigh: number;
  shin: number;
  torso: number;
  upperArm: number;
  foreArm: number;
  shoulderW: number;
  hipW: number;
  belly: number;
  legW: number;
  armW: number;
}

export const STANDARD_BUILD: Build = {
  thigh: 8,
  shin: 8,
  torso: 12,
  upperArm: 6,
  foreArm: 6,
  shoulderW: 5.5,
  hipW: 4.5,
  belly: 0,
  legW: 3.2,
  armW: 2.6,
};

export type PropKind = 'mate' | 'guitar' | 'wrench';

export interface Pose {
  crouch?: number;
  lean?: number;
  /** Doblarse hacia adelante (0..1): de frente o de espaldas el torso se ve más corto. */
  bend?: number;
  dx?: number;
  dy?: number;
  /** Pie [x desde el centro, cuánto se levanta]. */
  footR?: [number, number];
  footL?: [number, number];
  /** Ángulos (grados) de brazo y antebrazo. 0 = abajo, 90 = derecha, 180 = arriba, -90 = izquierda. */
  armR: [number, number];
  /** Brazo izquierdo (si el revés es a dos manos, se calcula solo). */
  armL?: [number, number];
  /** Vista de espaldas: el brazo pasa por delante del pecho (queda tapado por el torso). */
  armRBehind?: boolean;
  armLBehind?: boolean;
  /** Ángulo de la raqueta; null = sin raqueta. */
  racket?: number | null;
  /** La raqueta va en la capa contraria a la del brazo (final del drive, sobre el hombro). */
  racketOpposite?: boolean;
  twoHand?: boolean;
  head?: 'normal' | 'shout';
  headDx?: number;
  headDy?: number;
  headRot?: 0 | 1;
  /** Acostado (palomita): las piernas usan ángulos en vez de pies apoyados. */
  lying?: boolean;
  /** Altura de la cadera sobre el piso (px), para poses que no se apoyan en los pies. */
  hipY?: number;
  legR?: [number, number];
  legL?: [number, number];
  prop?: { kind: PropKind; hand: 'R' | 'L'; angle: number };
}

export type AnimName =
  | 'idle'
  | 'run'
  | 'drive'
  | 'backhand'
  | 'volley'
  | 'serve'
  | 'dive'
  | 'taunt'
  | 'lament'
  | 'hurt';

export const ANIM_ORDER: AnimName[] = ['idle', 'run', 'drive', 'backhand', 'volley', 'serve', 'dive', 'taunt', 'lament', 'hurt'];

export const ANIM_FPS: Record<AnimName, number> = {
  idle: 3,
  run: 10,
  drive: 12,
  backhand: 12,
  volley: 10,
  serve: 8,
  dive: 8,
  taunt: 6,
  lament: 3,
  hurt: 4,
};

// ---------------------------------------------------------------- animaciones compartidas
// Poses para un diestro visto de espaldas (derecha del jugador = derecha de la pantalla).

export const SHARED_ANIMS: Record<Exclude<AnimName, 'taunt' | 'backhand'>, Pose[]> & { backhand1: Pose[]; backhand2: Pose[] } = {
  idle: [
    { crouch: 0, armR: [30, 75], racket: 155, armL: [-25, -40] },
    { crouch: 1, armR: [32, 80], racket: 150, armL: [-25, -48] },
  ],
  run: [
    { crouch: 1, footR: [4, 0], footL: [-3, 4], armR: [20, 60], racket: 140, armL: [-35, -70] },
    { crouch: 0, dy: -1, footR: [3, 2], footL: [-3, 1], armR: [30, 70], racket: 150, armL: [-20, -40] },
    { crouch: 1, footR: [3, 4], footL: [-4, 0], armR: [40, 85], racket: 160, armL: [-12, -15] },
    { crouch: 0, dy: -1, footR: [3, 1], footL: [-3, 2], armR: [30, 70], racket: 150, armL: [-20, -40] },
  ],
  drive: [
    { crouch: 3, lean: 4, footR: [6, 0], footL: [-5, 0], armR: [55, 100], racket: 108, armL: [-65, -95] },
    { crouch: 2, footR: [6, 0], footL: [-5, 0], armR: [80, 125], racket: 165, armL: [-45, -70] },
    { crouch: 1, lean: -5, footR: [5, 1], footL: [-5, 0], armR: [-65, -155], armRBehind: true, racket: -140, racketOpposite: true, armL: [-30, -15] },
  ],
  backhand1: [
    { crouch: 3, lean: -4, footR: [5, 0], footL: [-6, 0], armR: [-45, -95], armRBehind: true, racket: -112, armL: [-40, -85], armLBehind: true },
    { crouch: 2, footR: [5, 0], footL: [-6, 0], armR: [-72, -100], racket: -140, armL: [-35, -20] },
    { crouch: 1, lean: 5, footR: [5, 0], footL: [-5, 1], armR: [60, 140], racket: 160, armL: [-30, -20] },
  ],
  backhand2: [
    { crouch: 3, lean: -5, footR: [5, 0], footL: [-6, 0], armR: [-45, -95], armRBehind: true, racket: -112, twoHand: true },
    { crouch: 2, footR: [5, 0], footL: [-6, 0], armR: [-72, -100], racket: -140, twoHand: true },
    { crouch: 1, lean: 6, footR: [5, 0], footL: [-5, 1], armR: [50, 150], racket: 165, twoHand: true },
  ],
  volley: [
    { crouch: 4, footR: [7, 0], footL: [-6, 0], armR: [45, 150], racket: 175, armL: [-40, -120] },
    { crouch: 3, lean: 2, footR: [8, 0], footL: [-5, 0], armR: [62, 165], racket: 182, armL: [-45, -100] },
  ],
  serve: [
    { crouch: 1, footR: [3, 0], footL: [-4, 0], armL: [-172, -178], armR: [45, 30], racket: 25 },
    { crouch: 3, lean: 3, footR: [3, 0], footL: [-4, 0], armL: [-165, -175], armR: [105, 190], racket: 205 },
    { crouch: -2, dy: -2, footR: [3, 1], footL: [-3, 0], armL: [-30, -20], armR: [172, 178], racket: 180 },
    { crouch: 3, lean: -5, footR: [4, 0], footL: [-2, 0], armL: [-20, -10], armR: [-30, -65], armRBehind: true, racket: -40 },
  ],
  dive: [
    { lying: true, lean: 45, dx: -4, hipY: 11, legR: [-55, -70], legL: [-72, -80], armR: [95, 95], racket: 95, armL: [115, 110] },
    { lying: true, lean: 84, dx: -10, hipY: 4, legR: [-95, -95], legL: [-100, -100], armR: [92, 92], racket: 92, armL: [100, 100], headRot: 1 },
  ],
  lament: [
    { crouch: 1, bend: 0.3, headDy: 1, armR: [10, 5], racket: 6, armL: [-10, -5] },
    { crouch: 1, bend: 0.3, headDy: 1, armR: [10, 5], racket: 6, armL: [-125, -178] },
  ],
  hurt: [
    { crouch: 3, bend: 0.6, lean: 8, headDy: 1, armR: [18, 10], racket: 12, armL: [-5, 70] },
    { crouch: 4, bend: 0.7, lean: 12, headDy: 2, armR: [20, 14], racket: 16, armL: [-5, 72] },
  ],
};

export const GENERIC_TAUNT: Pose[] = [
  { crouch: 2, armR: [150, 170], racket: 180, armL: [-40, -80] },
  { crouch: 0, dy: -3, footR: [3, 2], footL: [-3, 2], armR: [165, 178], racket: 185, armL: [-60, -125] },
  { crouch: 1, dy: -1, armR: [155, 172], racket: 180, armL: [-50, -100] },
];

export function animFrames(art: CharacterArt, anim: AnimName): Pose[] {
  if (anim === 'taunt') return art.taunt ?? GENERIC_TAUNT;
  if (anim === 'backhand') return art.twoHandedBackhand ? SHARED_ANIMS.backhand2 : SHARED_ANIMS.backhand1;
  return SHARED_ANIMS[anim];
}

// ---------------------------------------------------------------- geometría

function dirOf(a: number): Pt {
  const r = (a * Math.PI) / 180;
  return [Math.sin(r), Math.cos(r)];
}
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];

/** IK de dos huesos: rodilla/codo que une A con C. bend = +1 dobla hacia la derecha del vector. */
function ik(A: Pt, C: Pt, l1: number, l2: number, bend: number): { mid: Pt; end: Pt } {
  let dx = C[0] - A[0];
  let dy = C[1] - A[1];
  let d = Math.hypot(dx, dy) || 0.001;
  const max = l1 + l2 - 0.01;
  let end = C;
  if (d > max) {
    end = [A[0] + (dx / d) * max, A[1] + (dy / d) * max];
    dx = end[0] - A[0];
    dy = end[1] - A[1];
    d = max;
  }
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const base = Math.atan2(dy, dx) + a * bend;
  return { mid: [A[0] + Math.cos(base) * l1, A[1] + Math.sin(base) * l1], end };
}

export interface Joints {
  hip: Pt;
  neck: Pt;
  up: Pt;
  perp: Pt;
  shoulderR: Pt;
  shoulderL: Pt;
  elbowR: Pt;
  elbowL: Pt;
  handR: Pt;
  handL: Pt;
  hipR: Pt;
  hipL: Pt;
  kneeR: Pt;
  kneeL: Pt;
  footR: Pt;
  footL: Pt;
  racketTip: Pt | null;
}

export function solve(pose: Pose, b: Build): Joints {
  const legLen = b.thigh + b.shin;
  const crouch = pose.crouch ?? 0;
  // Acostado (palomita), la cadera se ubica respecto del piso, sin importar el largo de las piernas.
  const hipY = pose.hipY !== undefined ? BASE_Y - pose.hipY : BASE_Y - legLen + crouch + (pose.dy ?? 0);
  const hip: Pt = [CX + (pose.dx ?? 0), hipY];
  const lean = pose.lean ?? 0;
  const up = dirOf(180 - lean);
  const perp: Pt = [-up[1], up[0]];
  const neck = add(hip, up, b.torso * (1 - 0.35 * (pose.bend ?? 0)));
  const sh = add(neck, up, -1.5);
  const shoulderR = add(sh, perp, b.shoulderW - 0.5);
  const shoulderL = add(sh, perp, -(b.shoulderW - 0.5));
  const hipR = add(hip, perp, b.hipW * 0.5);
  const hipL = add(hip, perp, -b.hipW * 0.5);

  let kneeR: Pt;
  let kneeL: Pt;
  let footR: Pt;
  let footL: Pt;
  if (pose.lying) {
    const lr = pose.legR ?? [-90, -90];
    const ll = pose.legL ?? [-90, -90];
    kneeR = add(hipR, dirOf(lr[0]), b.thigh);
    footR = add(kneeR, dirOf(lr[1]), b.shin);
    kneeL = add(hipL, dirOf(ll[0]), b.thigh);
    footL = add(kneeL, dirOf(ll[1]), b.shin);
  } else {
    // De frente o de espaldas, la rodilla doblada apunta a la cámara: la pierna se ve más corta
    // y apenas abierta, no como un arco.
    const leg = (h: Pt, f: [number, number], side: number): { knee: Pt; foot: Pt } => {
      const target: Pt = [CX + (pose.dx ?? 0) + f[0], BASE_Y - f[1] + Math.min(0, pose.dy ?? 0)];
      const r = ik(h, target, b.thigh, b.shin, side);
      const mid: Pt = [(h[0] + r.end[0]) / 2, (h[1] + r.end[1]) / 2];
      const out = Math.min(1.2, Math.hypot(r.mid[0] - mid[0], r.mid[1] - mid[1]) * 0.25);
      return { knee: [mid[0] + side * -out, mid[1]], foot: r.end };
    };
    const r = leg(hipR, pose.footR ?? [4, 0], -1);
    const l = leg(hipL, pose.footL ?? [-4, 0], 1);
    kneeR = r.knee;
    footR = r.foot;
    kneeL = l.knee;
    footL = l.foot;
  }

  const elbowR = add(shoulderR, dirOf(pose.armR[0]), b.upperArm);
  const handR = add(elbowR, dirOf(pose.armR[1]), b.foreArm);
  let elbowL: Pt;
  let handL: Pt;
  const racket = pose.racket;
  if (pose.twoHand && racket !== null && racket !== undefined) {
    const target = add(handR, dirOf(racket), -2.2);
    const s = ik(shoulderL, target, b.upperArm, b.foreArm, 1);
    elbowL = s.mid;
    handL = s.end;
  } else {
    const armL = pose.armL ?? [-25, -40];
    elbowL = add(shoulderL, dirOf(armL[0]), b.upperArm);
    handL = add(elbowL, dirOf(armL[1]), b.foreArm);
  }
  const racketTip = racket === null || racket === undefined ? null : add(handR, dirOf(racket), 10);
  return { hip, neck, up, perp, shoulderR, shoulderL, elbowR, elbowL, handR, handL, hipR, hipL, kneeR, kneeL, footR, footL, racketTip };
}

// ---------------------------------------------------------------- dibujo

function capsule(p: Painter, a: Pt, b: Pt, w: number, color: string | ((x: number, y: number) => string | null)): void {
  p.line(a, b, w, color);
}

function drawLegs(p: Painter, j: Joints, b: Build, o: Outfit, skin: string, ink: boolean): void {
  const lw = b.legW;
  const pants = o.longPants;
  for (const [hip, knee, foot] of [
    [j.hipL, j.kneeL, j.footL],
    [j.hipR, j.kneeR, j.footR],
  ] as [Pt, Pt, Pt][]) {
    const shoeDir: Pt = [foot[0] >= hip[0] ? 1 : -1, 0];
    if (ink) {
      capsule(p, hip, knee, lw + 2.2, PAL.ink);
      capsule(p, knee, foot, lw + 1.6, PAL.ink);
      capsule(p, add(foot, [0, -0.5]), add(foot, shoeDir, 1.5), 4.4, PAL.ink);
      continue;
    }
    capsule(p, knee, foot, lw - 0.4, pants ? o.shorts : skin);
    // Medias
    const sock = add(foot, [(knee[0] - foot[0]) * 0.3, (knee[1] - foot[1]) * 0.3]);
    if (!pants) capsule(p, foot, sock, lw - 0.4, o.socks);
    capsule(p, hip, knee, lw + 0.2, o.shorts);
    if (!pants) capsule(p, knee, add(knee, [(hip[0] - knee[0]) * 0.1, (hip[1] - knee[1]) * 0.1]), lw + 0.2, o.shorts);
    capsule(p, add(foot, [0, -0.5]), add(foot, shoeDir, 1.5), 2.6, o.shoes);
  }
  // Cintura del short, uniendo las dos piernas.
  const g = ink ? 1 : 0;
  const waist: Pt[] = [
    add(add(j.hipL, j.perp, -0.8 - g), j.up, 1),
    add(add(j.hipR, j.perp, 0.8 + g), j.up, 1),
    add(add(j.hipR, j.up, -2.5 - g), j.perp, 0.2 + g),
    add(add(j.hipL, j.up, -2.5 - g), j.perp, -0.2 - g),
  ];
  p.poly(waist, ink ? PAL.ink : o.shorts);
}

function torsoPoly(j: Joints, b: Build, grow: number): Pt[] {
  const up = j.up;
  const perp = j.perp;
  const top = add(j.neck, up, -0.5 + grow * 0.6);
  const mid = add(j.hip, up, b.torso * 0.45);
  const midW = (b.shoulderW + b.hipW) / 2 + b.belly + grow;
  const bottom = add(j.hip, up, -1 - grow * 0.6);
  return [
    add(top, perp, -(b.shoulderW + grow)),
    add(top, perp, b.shoulderW + grow),
    add(mid, perp, midW),
    add(bottom, perp, b.hipW + b.belly * 0.4 + grow),
    add(bottom, perp, -(b.hipW + b.belly * 0.4 + grow)),
    add(mid, perp, -midW),
  ];
}

function drawTorso(p: Painter, j: Joints, b: Build, o: Outfit, view: 'back' | 'front', skin: string): void {
  const outer = torsoPoly(j, b, 1);
  p.poly(outer, PAL.ink);
  const inner = torsoPoly(j, b, 0);
  const shirt = (x: number, y: number) => {
    const rx = x + 0.5 - j.neck[0];
    const ry = y + 0.5 - j.neck[1];
    const u = rx * j.perp[0] + ry * j.perp[1];
    const v = -(rx * j.up[0] + ry * j.up[1]);
    return o.shirt(u, v, view);
  };
  p.poly(inner, shirt);
  // Cuello
  const neckTop = add(j.neck, j.up, 1.5);
  p.line(j.neck, neckTop, 3, skin);
}

function drawArm(p: Painter, j: Joints, side: 'R' | 'L', b: Build, o: Outfit, skin: string, ink: boolean): void {
  const s = side === 'R' ? j.shoulderR : j.shoulderL;
  const e = side === 'R' ? j.elbowR : j.elbowL;
  const h = side === 'R' ? j.handR : j.handL;
  const w = b.armW;
  if (ink) {
    capsule(p, s, e, w + 2, PAL.ink);
    capsule(p, e, h, w + 1.8, PAL.ink);
    p.ellipse(h[0], h[1], 2.2, 2.2, PAL.ink);
    return;
  }
  const sleeveEnd: Pt = [s[0] + (e[0] - s[0]) * (o.longSleeves ? 1 : 0.55), s[1] + (e[1] - s[1]) * (o.longSleeves ? 1 : 0.55)];
  capsule(p, s, e, w, skin);
  capsule(p, e, h, w - 0.3, o.longSleeves ? o.sleeve : skin);
  capsule(p, s, sleeveEnd, w + 0.4, o.sleeve);
  p.ellipse(h[0], h[1], 1.2, 1.2, skin);
}

function drawRacket(p: Painter, j: Joints, angle: number, frame: string, grip: string, ink: boolean): void {
  const d = dirOf(angle);
  const h = j.handR;
  const handleEnd = add(h, d, 3);
  const c = add(h, d, 6.8);
  const along = d;
  const across: Pt = [-d[1], d[0]];
  const inHead = (x: number, y: number, ra: number, rb: number) => {
    const rx = x - c[0];
    const ry = y - c[1];
    const a = rx * along[0] + ry * along[1];
    const bq = rx * across[0] + ry * across[1];
    return (a / ra) ** 2 + (bq / rb) ** 2 <= 1;
  };
  if (ink) {
    capsule(p, add(h, d, -1), handleEnd, 2.6, PAL.ink);
    p.fillWhere(c[0] - 6, c[1] - 6, c[0] + 6, c[1] + 6, (x, y) => inHead(x, y, 4.9, 3.9), PAL.ink);
    return;
  }
  capsule(p, add(h, d, -0.5), handleEnd, 1, grip);
  p.fillWhere(c[0] - 6, c[1] - 6, c[0] + 6, c[1] + 6, (x, y) => inHead(x, y, 3.9, 2.9), frame);
  p.fillWhere(c[0] - 6, c[1] - 6, c[0] + 6, c[1] + 6, (x, y) => inHead(x, y, 2.6, 1.7), (x, y) => ((x + y) % 2 === 0 ? PAL.grey4 : PAL.white));
}

function drawProp(p: Painter, j: Joints, prop: NonNullable<Pose['prop']>): void {
  const h = prop.hand === 'R' ? j.handR : j.handL;
  const d = dirOf(prop.angle);
  const across: Pt = [-d[1], d[0]];
  if (prop.kind === 'mate') {
    // Mate: calabaza oscura con bombilla plateada.
    const c = add(h, [0, -1.5]);
    p.ellipse(c[0], c[1], 2.6, 3, PAL.ink);
    p.ellipse(c[0], c[1], 1.7, 2.1, PAL.woodDark);
    p.set(c[0] - 1, c[1] - 1, PAL.wood);
    p.thin(add(c, [0.5, -2]), add(c, [2, -5]), PAL.silver);
  } else if (prop.kind === 'wrench') {
    const end = add(h, d, 7);
    capsule(p, h, end, 3, PAL.ink);
    capsule(p, h, end, 1.2, PAL.silver);
    p.ellipse(end[0], end[1], 2.4, 2.4, PAL.ink);
    p.ellipse(end[0], end[1], 1.4, 1.4, PAL.silver);
    p.set(Math.round(end[0] + d[0] * 1.2), Math.round(end[1] + d[1] * 1.2), PAL.ink);
  } else if (prop.kind === 'guitar') {
    // Guitarra eléctrica cruzada sobre el cuerpo: cuerpo en la cadera, mástil hacia la mano izquierda.
    const body = add(j.hip, j.perp, 2);
    const neckEnd = add(j.handL, d, 1);
    capsule(p, body, neckEnd, 3, PAL.ink);
    capsule(p, body, neckEnd, 1.2, PAL.woodDark);
    p.ellipse(body[0], body[1] - 1, 5, 4, PAL.ink);
    p.ellipse(body[0], body[1] - 1, 4, 3, PAL.red);
    p.ellipse(body[0] - 1, body[1] - 2, 1.5, 1, PAL.white);
    p.set(neckEnd[0] + across[0], neckEnd[1] + across[1], PAL.silver);
  }
}

/** Dibuja un frame. view 'front' = de frente (el rival de arriba), se genera espejando. */
export function drawFrame(art: CharacterArt, outfit: Outfit, pose: Pose, view: 'back' | 'front'): Painter {
  const p = new Painter(FRAME_W, FRAME_H);
  const b = art.build;
  const j = solve(pose, b);
  const skin = art.skin;
  // De espaldas, un brazo que cruza por delante del pecho queda tapado por el torso;
  // de frente, ese mismo brazo se ve por encima.
  const rBehind = view === 'back' && !!pose.armRBehind;
  const lBehind = view === 'back' && (pose.twoHand ? !!pose.armRBehind : !!pose.armLBehind);
  const racket = pose.racket;
  const hasRacket = racket !== null && racket !== undefined && !art.noRacket;
  // Al terminar el drive el brazo cruza por delante de la cara pero la raqueta queda detrás
  // del hombro: la raqueta va en la capa contraria a la del brazo.
  const racketBehind = hasRacket && (pose.racketOpposite ? view === 'front' || !rBehind : rBehind);
  const frame = art.racket.frame;
  const grip = art.racket.grip;

  const racketGroup = () => {
    drawRacket(p, j, racket!, frame, grip, true);
    drawRacket(p, j, racket!, frame, grip, false);
  };
  const armGroup = (side: 'R' | 'L') => {
    drawArm(p, j, side, b, outfit, skin, true);
    drawArm(p, j, side, b, outfit, skin, false);
    if (pose.prop && pose.prop.hand === side) drawProp(p, j, pose.prop);
  };

  if (racketBehind) racketGroup();
  if (rBehind) armGroup('R');
  if (lBehind) armGroup('L');
  drawLegs(p, j, b, outfit, skin, true);
  drawLegs(p, j, b, outfit, skin, false);
  drawTorso(p, j, b, outfit, view, skin);
  outfit.extras?.(p, j, view);

  // Cabeza
  const heads = { ...art.heads, ...outfit.heads };
  const headKey = view === 'back' ? 'back' : pose.head === 'shout' && heads.frontShout ? 'frontShout' : 'front';
  const head = heads[headKey]!;
  const accessory = view === 'back' ? outfit.headBack : outfit.headFront;
  const ax = Math.round(j.neck[0] + (pose.headDx ?? 0));
  const ay = Math.round(j.neck[1] + (pose.headDy ?? 0));
  const rot = pose.headRot ?? 0;
  const rows = head.rows;
  const hw = Math.max(...rows.map((r) => r.length));
  // En la vista de frente se dibuja espejado porque al final se espeja todo el frame.
  const flip = view === 'front';
  let ox: number;
  let oy: number;
  if (rot === 1) {
    ox = ax - 1;
    oy = ay - Math.round(hw / 2);
  } else {
    ox = ax - (flip ? hw - 1 - head.anchor[0] : head.anchor[0]);
    oy = ay - head.anchor[1];
  }
  p.grid(rows, art.palette, ox, oy, flip, rot);
  if (accessory && rot === 0) {
    const aw = Math.max(...accessory.rows.map((r) => r.length));
    // Espejado: el borde izquierdo del accesorio queda simétrico respecto de la cabeza.
    const axo = flip ? ox + hw - accessory.offset[0] - aw : ox + accessory.offset[0];
    p.grid(accessory.rows, { ...art.palette, ...accessory.palette }, axo, oy + accessory.offset[1], flip);
  }

  if (hasRacket && !racketBehind) racketGroup();
  if (!rBehind) armGroup('R');
  if (!lBehind) armGroup('L');

  if (view === 'front') {
    const m = new Painter(FRAME_W, FRAME_H);
    m.paste(p.img, 0, 0, true);
    return m;
  }
  return p;
}

