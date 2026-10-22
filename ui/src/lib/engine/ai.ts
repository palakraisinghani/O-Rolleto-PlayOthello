// Computer opponents for the web build (the desktop app will use Oroletto; this build has no
// neural network, so its four levels are classic bots):
//   1 random · 2 greedy (most discs next move) · 3 alpha-beta depth 3 · 4 alpha-beta, iterative
//   deepening within a time budget. Levels 3 and 4 use the heuristic from OthelloRL's tuned bot
//   (corners 50, mobility 5, discs 1, X-squares -25).
//
// The search runs on a plain 64-cell array (faster than BigInt bitboards), in slices that yield to the
// browser between depths so the page keeps animating while the computer thinks.

import { PASS, Position, type Side } from './position.ts';

/** Small seedable generator (splitmix64), so games can be reproduced in tests. */
export class Rng {
  private state: bigint;
  constructor(seed: number | bigint) {
    this.state = BigInt(seed) & ((1n << 64n) - 1n);
  }
  nextU64(): bigint {
    const M = (1n << 64n) - 1n;
    this.state = (this.state + 0x9e3779b97f4a7c15n) & M;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & M;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & M;
    return z ^ (z >> 31n);
  }
  /** Uniform integer in 0..n-1. */
  below(n: number): number {
    return Number((this.nextU64() * BigInt(n)) >> 64n);
  }
  pick<T>(items: readonly T[]): T {
    return items[this.below(items.length)];
  }
}

export interface SearchControl {
  /** True once the game was undone, restarted or resigned: stop and return null. */
  cancelled(): boolean;
  /** 0..1, drives the "thinking" indicator. */
  progress(fraction: number): void;
}

// ------------------------------------------------------------------ mailbox board

type Board = Int8Array; // 0 empty, 1 black, 2 white
const DR = [-1, -1, -1, 0, 0, 1, 1, 1];
const DC = [-1, 0, 1, -1, 1, -1, 0, 1];
const CORNERS = [0, 7, 56, 63];
// X-squares (diagonal to a corner) paired with their corner.
const X_SQUARES: [number, number][] = [[9, 0], [14, 7], [49, 56], [54, 63]];

const code = (s: Side) => (s === 'black' ? 1 : 2);

function toBoard(p: Position): Board {
  const b = new Int8Array(64);
  for (let i = 0; i < 64; i++) {
    const bit = 1n << BigInt(i);
    b[i] = p.black & bit ? 1 : p.white & bit ? 2 : 0;
  }
  return b;
}

/** Squares flipped if `me` plays `sq` (empty list: not legal). */
function flipsAt(b: Board, sq: number, me: number): number[] {
  if (b[sq] !== 0) return [];
  const them = 3 - me;
  const r0 = sq >> 3;
  const c0 = sq & 7;
  const flips: number[] = [];
  for (let d = 0; d < 8; d++) {
    let r = r0 + DR[d];
    let c = c0 + DC[d];
    const line: number[] = [];
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === them) {
      line.push(r * 8 + c);
      r += DR[d];
      c += DC[d];
    }
    if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === me) flips.push(...line);
  }
  return flips;
}

function movesOf(b: Board, me: number): number[] {
  const out: number[] = [];
  for (let sq = 0; sq < 64; sq++) if (b[sq] === 0 && flipsAt(b, sq, me).length) out.push(sq);
  return out;
}

function mobilityOf(b: Board, me: number): number {
  let n = 0;
  for (let sq = 0; sq < 64; sq++) if (b[sq] === 0 && flipsAt(b, sq, me).length) n++;
  return n;
}

function play(b: Board, sq: number, me: number, flips: number[]): Board {
  const nb = b.slice();
  nb[sq] = me;
  for (const f of flips) nb[f] = me;
  return nb;
}

const discDiff = (b: Board, me: number): number => {
  let d = 0;
  for (let i = 0; i < 64; i++) d += b[i] === me ? 1 : b[i] === 0 ? 0 : -1;
  return d;
};

/** Heuristic value of a position for `me`. */
function evaluate(b: Board, me: number): number {
  const them = 3 - me;
  let corners = 0;
  for (const c of CORNERS) corners += b[c] === me ? 1 : b[c] === them ? -1 : 0;
  let xsq = 0;
  for (const [x, c] of X_SQUARES) if (b[c] === 0) xsq += b[x] === me ? 1 : b[x] === them ? -1 : 0;
  return discDiff(b, me) + 5 * (mobilityOf(b, me) - mobilityOf(b, them)) + 50 * corners - 25 * xsq;
}

const WIN = 100000;
const finalScore = (b: Board, me: number): number => {
  const d = discDiff(b, me);
  return d > 0 ? WIN + d : d < 0 ? -WIN + d : 0;
};

/** Cheap static preference for ordering moves: corners first, X-squares last. */
function order(moves: number[]): number[] {
  const rank = (m: number) => (CORNERS.includes(m) ? 0 : X_SQUARES.some(([x]) => x === m) ? 2 : 1);
  return moves.slice().sort((a, b) => rank(a) - rank(b));
}

class TimeUp extends Error {}

function negamax(
  b: Board,
  me: number,
  depth: number,
  alpha: number,
  beta: number,
  passed: boolean,
  clock: { nodes: number; deadline: number }
): number {
  if ((++clock.nodes & 1023) === 0 && Date.now() > clock.deadline) throw new TimeUp();
  const moves = movesOf(b, me);
  if (moves.length === 0) {
    if (passed) return finalScore(b, me);
    return -negamax(b, 3 - me, depth - 1, -beta, -alpha, true, clock);
  }
  if (depth <= 0) return evaluate(b, me);
  let best = -Infinity;
  for (const m of order(moves)) {
    const v = -negamax(play(b, m, me, flipsAt(b, m, me)), 3 - me, depth - 1, -beta, -alpha, false, clock);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Best root moves (every move tied for the top score) at a fixed depth. Later moves are searched
 * with a window just below the current best, so ties stay exact while worse moves are pruned.
 */
function searchRoot(b: Board, me: number, depth: number, clock: { nodes: number; deadline: number }): { best: number[]; score: number } {
  let best: number[] = [];
  let top = -Infinity;
  for (const m of order(movesOf(b, me))) {
    const alphaRoot = top === -Infinity ? -Infinity : top - 1;
    const v = -negamax(play(b, m, me, flipsAt(b, m, me)), 3 - me, depth - 1, -Infinity, -alphaRoot, false, clock);
    if (v > top) {
      top = v;
      best = [m];
    } else if (v === top) best.push(m);
  }
  return { best, score: top };
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// ------------------------------------------------------------------ the four levels

/** Moves tied for the highest disc difference after one ply (OthelloRL's greedy bot). */
export function greedyBest(p: Position): number[] {
  const legal = p.legalMoves();
  const me = p.toMove;
  const value = (m: number) => {
    const next = p.play(m).position;
    const { black, white } = next.counts();
    const diff = me === 'black' ? black - white : white - black;
    return next.isTerminal() ? (diff > 0 ? 1e6 + diff : diff < 0 ? -1e6 + diff : 0) : diff;
  };
  const values = legal.map(value);
  const top = Math.max(...values);
  return legal.filter((_, i) => values[i] === top);
}

export interface RankedMove {
  move: number;
  /** Search value for the side to move; higher is better. Only differences are meaningful. */
  score: number;
  /** The computer's own chance of choosing this move, when its search provides one (Oroletto's visit shares). */
  prob?: number;
}

/**
 * Every legal placement scored by a full-window search, best first (equal scores keep square order).
 * Unlike `chooseMove` nothing is pruned at the root, so each move gets its true value at this depth.
 * Positions with few empty squares are searched to the end of the game. Deterministic.
 */
export function rankMoves(position: Position, depth = 4): RankedMove[] {
  const b = toBoard(position);
  const me = code(position.toMove);
  let empties = 0;
  for (let i = 0; i < 64; i++) if (b[i] === 0) empties++;
  const plies = empties <= 6 ? 64 : depth;
  const clock = { nodes: 0, deadline: Infinity };
  const ranked = movesOf(b, me).map((move) => ({
    move,
    score: -negamax(play(b, move, me, flipsAt(b, move, me)), 3 - me, plies - 1, -Infinity, Infinity, false, clock)
  }));
  return ranked.sort((x, y) => y.score - x.score || x.move - y.move);
}

/** Time budget for the strongest level, in milliseconds. */
export const LEVEL4_BUDGET_MS = 900;

/**
 * Choose a move for the side to move. `level` is 1 (easiest) to 4. Resolves to null if cancelled.
 * Always returns a legal move (a pass only when no placement exists).
 */
export async function chooseMove(position: Position, level: number, rng: Rng, ctl: SearchControl, budgetMs = LEVEL4_BUDGET_MS): Promise<number | null> {
  const legal = position.legalMoves();
  if (legal.length === 0) return null;
  if (legal.length === 1) return legal[0]; // forced (including a pass)
  if (level <= 1) return rng.pick(legal);
  if (level === 2) return rng.pick(greedyBest(position));

  const b = toBoard(position);
  const me = code(position.toMove);
  if (level === 3) {
    ctl.progress(0.3);
    await tick();
    if (ctl.cancelled()) return null;
    const { best } = searchRoot(b, me, 3, { nodes: 0, deadline: Infinity });
    return rng.pick(best);
  }

  // Level 4: iterative deepening; keep the result of the last depth that finished in time.
  const deadline = Date.now() + budgetMs;
  const MAX_DEPTH = 9;
  let best: number[] = legal;
  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    ctl.progress(Math.min(0.95, (Date.now() - (deadline - budgetMs)) / budgetMs));
    await tick();
    if (ctl.cancelled()) return null;
    try {
      best = searchRoot(b, me, depth, { nodes: 0, deadline }).best;
    } catch (e) {
      if (e instanceof TimeUp) break;
      throw e;
    }
    if (Date.now() >= deadline) break;
  }
  ctl.progress(1);
  return rng.pick(best);
}

export { PASS };
