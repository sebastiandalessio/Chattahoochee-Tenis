// Reglas del peloteo: decide si un pique es bueno, si es falta, let, o quién gana el punto.
// Lógica pura, sin Phaser.

import { COURT, halfOf, inServiceBox, inSinglesCourt } from './court';
import { other, type Side } from './scoring';

export type PointReason =
  | 'out' // la pelota picó afuera
  | 'net' // se la comió la red
  | 'winner' // el rival no llegó (doble pique)
  | 'ace' // saque que el que recibe ni tocó
  | 'doubleFault';

export type FaultReason = 'net' | 'long' | 'wide';

export type Decision =
  | { type: 'continue' }
  | { type: 'fault'; reason: FaultReason }
  | { type: 'let' }
  | { type: 'point'; winner: Side; reason: PointReason; out?: 'long' | 'wide' };

export class Rally {
  server: Side;
  serveSide: 'deuce' | 'ad';
  isServe = false;
  lastHitter: Side | null = null;
  bouncesSinceHit = 0;
  lastBounce: { x: number; y: number } | null = null;
  netTouchedSinceHit = false;
  /** Golpes en el punto, contando el saque. */
  shots = 0;
  decided = false;

  constructor(server: Side, serveSide: 'deuce' | 'ad') {
    this.server = server;
    this.serveSide = serveSide;
  }

  get receiver(): Side {
    return other(this.server);
  }

  onServe(): void {
    this.isServe = true;
    this.lastHitter = this.server;
    this.bouncesSinceHit = 0;
    this.lastBounce = null;
    this.netTouchedSinceHit = false;
    this.shots = 1;
  }

  onHit(side: Side): void {
    if (this.isServe && side === this.receiver) this.isServe = false;
    this.lastHitter = side;
    this.bouncesSinceHit = 0;
    this.lastBounce = null;
    this.netTouchedSinceHit = false;
    this.shots++;
  }

  /** La pelota pegó en la red y no pasó. */
  onNet(): Decision {
    if (this.decided || this.lastHitter === null) return { type: 'continue' };
    this.netTouchedSinceHit = true;
    this.decided = true;
    if (this.isServe) return { type: 'fault', reason: 'net' };
    return { type: 'point', winner: other(this.lastHitter), reason: 'net' };
  }

  /** Rozó la faja y pasó. */
  onNetCord(): void {
    this.netTouchedSinceHit = true;
  }

  onBounce(x: number, y: number): Decision {
    if (this.decided || this.lastHitter === null) return { type: 'continue' };
    this.bouncesSinceHit++;
    this.lastBounce = { x, y };
    const hitter = this.lastHitter;
    const target = other(hitter);

    if (this.bouncesSinceHit === 1) {
      if (this.isServe) {
        if (inServiceBox(x, y, this.receiver, this.serveSide)) {
          if (this.netTouchedSinceHit) {
            this.decided = true;
            return { type: 'let' };
          }
          return { type: 'continue' };
        }
        this.decided = true;
        if (halfOf(y) !== this.receiver) return { type: 'fault', reason: 'net' };
        return { type: 'fault', reason: Math.abs(y) > COURT.serviceLine ? 'long' : 'wide' };
      }
      if (halfOf(y) !== target) {
        this.decided = true;
        return { type: 'point', winner: target, reason: 'net' };
      }
      if (!inSinglesCourt(x, y)) {
        this.decided = true;
        const out = Math.abs(y) > COURT.halfLength + COURT.lineTolerance ? 'long' : 'wide';
        return { type: 'point', winner: target, reason: 'out', out };
      }
      return { type: 'continue' };
    }

    // Segundo pique sin que el rival la toque.
    this.decided = true;
    return { type: 'point', winner: hitter, reason: this.isServe ? 'ace' : 'winner' };
  }

  /** La pelota quedó rodando (se murió): equivale al segundo pique. */
  onDead(): Decision {
    if (this.decided || this.lastHitter === null) return { type: 'continue' };
    if (this.bouncesSinceHit >= 1) {
      this.decided = true;
      return { type: 'point', winner: this.lastHitter, reason: this.isServe ? 'ace' : 'winner' };
    }
    return { type: 'continue' };
  }
}
