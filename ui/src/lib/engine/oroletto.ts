// Oroletto: the AlphaZero-style network plus PUCT search (a port of OthelloRL's MCTS, see SPEC §4.2).
// The network is reached through the small `Evaluator` interface, so tests can use onnxruntime in node
// and the app can use onnxruntime-web (WebAssembly) on phones and in browsers.

import { PASS, Position } from './position.ts';
import type { Rng } from './ai.ts';

export interface Evaluation {
  /** 65 raw policy logits (64 squares + pass), from the side to move's view. */
  logits: Float32Array | number[];
  /** Expected result in [-1, 1] for the side to move. */
  value: number;
}

export interface Evaluator {
  evaluate(planes: Float32Array): Promise<Evaluation>;
}

export const C_PUCT = 1.5;

/** The 3x8x8 input: own discs, opponent discs, legal moves (all from the side to move's view). */
export function encode(p: Position): Float32Array {
  const out = new Float32Array(3 * 64);
  const own = p.own;
  const opp = p.opp;
  const legal = p.legalBits();
  for (let i = 0; i < 64; i++) {
    const bit = 1n << BigInt(i);
    if (own & bit) out[i] = 1;
    if (opp & bit) out[64 + i] = 1;
    if (legal & bit) out[128 + i] = 1;
  }
  return out;
}

class Node {
  readonly moves: number[];
  readonly prior: number[];
  readonly visits: number[];
  readonly total: number[]; // sum of values from this node's side to move
  readonly children: (Node | null)[];
  n = 0;
  readonly position: Position;
  constructor(position: Position, moves: number[], prior: number[]) {
    this.position = position;
    this.moves = moves;
    this.prior = prior;
    this.visits = moves.map(() => 0);
    this.total = moves.map(() => 0);
    this.children = moves.map(() => null);
  }
}

async function expand(p: Position, ev: Evaluator): Promise<{ node: Node | null; value: number }> {
  const moves = p.legalMoves();
  if (moves.length === 0) {
    // Game over: the exact result for the side to move.
    const o = p.outcome();
    return { node: null, value: o === 'draw' || o === null ? 0 : o === p.toMove ? 1 : -1 };
  }
  const { logits, value } = await ev.evaluate(encode(p));
  const max = Math.max(...moves.map((m) => logits[m]));
  const exps = moves.map((m) => Math.exp(logits[m] - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return { node: new Node(p, moves, exps.map((x) => x / sum)), value };
}

export interface SearchResult {
  /** Legal moves of the root, ascending, with their visit counts. */
  moves: number[];
  visits: number[];
  /** Network value of the root for the side to move. */
  value: number;
}

export interface SearchOptions {
  cancelled?: () => boolean;
  /** Called every few simulations with progress in 0..1 (also a chance to yield to the UI). */
  progress?: (fraction: number) => Promise<void> | void;
}

/** PUCT search without noise: deterministic for a given network. Returns null if cancelled. */
export async function search(root: Position, sims: number, ev: Evaluator, opts: SearchOptions = {}): Promise<SearchResult | null> {
  const first = await expand(root, ev);
  if (!first.node) return { moves: [], visits: [], value: first.value };
  const rootNode = first.node;

  for (let s = 0; s < sims; s++) {
    if (opts.cancelled?.()) return null;
    if (opts.progress && s % 8 === 0) await opts.progress(s / sims);

    // Select down to an unexpanded edge, remembering the path.
    const path: [Node, number][] = [];
    let node = rootNode;
    let value: number;
    for (;;) {
      const sqrtN = Math.sqrt(node.n + 1); // as OthelloRL: the root's own expansion counts as one visit
      let best = 0;
      let bestScore = -Infinity;
      for (let i = 0; i < node.moves.length; i++) {
        const q = node.visits[i] ? node.total[i] / node.visits[i] : 0;
        const score = q + C_PUCT * node.prior[i] * sqrtN / (1 + node.visits[i]);
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      }
      path.push([node, best]);
      const child = node.children[best];
      if (child) {
        node = child;
        continue;
      }
      const next = node.position.play(node.moves[best]).position;
      const e = await expand(next, ev);
      node.children[best] = e.node;
      value = -e.value; // seen from `node`'s side to move
      break;
    }
    // Back up, negating at every ply (a pass flips the side to move too).
    for (let k = path.length - 1; k >= 0; k--) {
      const [nd, i] = path[k];
      nd.visits[i] += 1;
      nd.total[i] += value;
      nd.n += 1;
      value = -value;
    }
  }
  return { moves: rootNode.moves, visits: rootNode.visits, value: first.value };
}

/** Pick a move from visit counts: T = 0 most visited (random among ties), else sample by N^(1/T). */
export function pickMove(r: SearchResult, temperature: number, rng: Rng): number {
  const { moves, visits } = r;
  if (temperature <= 1e-6) {
    const top = Math.max(...visits);
    return rng.pick(moves.filter((_, i) => visits[i] === top));
  }
  const weights = visits.map((n) => Math.pow(n, 1 / temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return rng.pick(moves);
  let x = (rng.below(1_000_000) / 1_000_000) * total;
  for (let i = 0; i < moves.length; i++) {
    x -= weights[i];
    if (x < 0) return moves[i];
  }
  return moves[moves.length - 1];
}

export { PASS };

/** From the manifest (models/oroletto-8x8.json): shared simulations and one temperature per level. */
export interface Levels {
  sims: number;
  /** Temperature for level 1..4 (index 0..3). */
  temperatures: number[];
}

export const DEFAULT_LEVELS: Levels = { sims: 200, temperatures: [8, 2, 1, 0] };

export function levelsFromManifest(m: { levels?: { sims?: number; ladder?: { temperature: number }[] } }): Levels {
  const ladder = m.levels?.ladder;
  if (!m.levels?.sims || !ladder || ladder.length !== 4) return DEFAULT_LEVELS;
  return { sims: m.levels.sims, temperatures: ladder.map((l) => l.temperature) };
}

/** Oroletto's move at a level (1..4); `temperature` overrides the level's (hints use 0). Null if cancelled. */
export async function chooseOroletto(
  position: Position,
  level: number,
  ev: Evaluator,
  levels: Levels,
  rng: Rng,
  opts: SearchOptions & { temperature?: number } = {}
): Promise<number | null> {
  const legal = position.legalMoves();
  if (legal.length === 0) return null;
  if (legal.length === 1) return legal[0];
  const r = await search(position, levels.sims, ev, opts);
  if (!r) return null;
  return pickMove(r, opts.temperature ?? levels.temperatures[Math.min(Math.max(level, 1), 4) - 1], rng);
}
