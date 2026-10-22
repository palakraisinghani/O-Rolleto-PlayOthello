// Post-game review: replay a finished game and, for every move the human played, say whether it was
// among the moves the computer itself would have chosen from the same position.
//
// The computer's opinion of a position is a ranked list of moves, each with a probability. A move is
// "good" if it is in the top-k moves OR inside the top-p nucleus (the shortest prefix of the list whose
// probabilities add up to p); the single best move is "best". Moves that are the only legal move are
// "forced" and left out of the score.
//
// Where the opinion comes from is pluggable (`Analyzer`). With Oroletto in the build it is Oroletto's MCTS
// root visit shares (see `orolettoAnalyzer`); otherwise it is the web build's alpha-beta search with a
// softmax over the move values. Nothing else here changes.

import { rankMoves, type RankedMove } from './ai.ts';
import { PASS, Position, parseMove, type Side } from './position.ts';

/** A move counts as good when it is among the computer's top K moves… */
export const REVIEW_TOP_K = 3;
/** …or inside the smallest set of its best moves whose probabilities add up to this. */
export const REVIEW_TOP_P = 0.2;
/** Softmax temperature turning search values into probabilities (value units: roughly one disc). */
export const REVIEW_TEMPERATURE = 12;

export interface Candidate {
  move: number;
  score: number;
  /** The computer's chance of choosing this move; the candidates of a position add up to 1. */
  prob: number;
  /** 1 = best. Moves with equal scores share a rank. */
  rank: number;
}

export type Verdict = 'best' | 'good' | 'miss' | 'forced';

export interface Feedback {
  verdict: Verdict;
  played: Candidate;
  /** Every legal move, best first. */
  candidates: Candidate[];
  /** The moves that would have been accepted (top-k plus the top-p nucleus), best first. */
  accepted: Candidate[];
}

export type Analyzer = (position: Position) => RankedMove[] | Promise<RankedMove[]>;

export interface JudgeOptions {
  k?: number;
  p?: number;
  temperature?: number;
}

/** Turn ranked values into candidates with probabilities (softmax) and competition ranks. */
export function toCandidates(ranked: RankedMove[], temperature = REVIEW_TEMPERATURE): Candidate[] {
  const sorted = ranked.slice().sort((a, b) => b.score - a.score || a.move - b.move);
  if (sorted.length === 0) return [];
  // An analyzer that knows its own probabilities (Oroletto: visit shares) supplies them; otherwise turn the
  // search values into probabilities with a softmax.
  const top = sorted[0].score;
  const given = sorted.every((r) => typeof r.prob === 'number');
  const weights = given ? sorted.map((r) => r.prob as number) : sorted.map((r) => Math.exp((r.score - top) / temperature));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return sorted.map((r, i) => ({
    move: r.move,
    score: r.score,
    prob: weights[i] / total,
    rank: 1 + sorted.filter((o) => o.score > r.score).length
  }));
}

/** Judge one move against the computer's ranked opinion of the position it was played in. */
export function judge(ranked: RankedMove[], played: number, options: JudgeOptions = {}): Feedback {
  const { k = REVIEW_TOP_K, p = REVIEW_TOP_P, temperature = REVIEW_TEMPERATURE } = options;
  const candidates = toCandidates(ranked, temperature);
  const mine = candidates.find((c) => c.move === played);
  if (!mine) throw new Error(`move ${played} is not among the legal moves`);

  // Top-k by rank (ties at the boundary stay in), plus the nucleus of probability mass p.
  const inTopK = candidates.filter((c) => c.rank <= k);
  let mass = 0;
  let cut = 0;
  while (cut < candidates.length && mass < p) mass += candidates[cut++].prob;
  const lastScore = cut > 0 ? candidates[cut - 1].score : -Infinity;
  const inNucleus = candidates.filter((c, i) => i < cut || c.score === lastScore);
  const accepted = candidates.filter((c) => inTopK.includes(c) || inNucleus.includes(c));

  const verdict: Verdict =
    candidates.length === 1 ? 'forced' : mine.rank === 1 ? 'best' : accepted.includes(mine) ? 'good' : 'miss';
  return { verdict, played: mine, candidates, accepted };
}

export interface ReviewStep {
  /** 1-based ply: the first move of the game is 1. */
  ply: number;
  mover: Side;
  /** The move played (a square 0..63, or PASS). */
  move: number;
  /** Squares flipped by it. */
  flipped: number[];
  /** The position after the move. */
  after: Position;
  /** Feedback on the move, only for placements by the human. */
  feedback: Feedback | null;
}

export interface ReviewSummary {
  /** Human placements that were judged (forced moves excluded). */
  judged: number;
  best: number;
  good: number;
  miss: number;
  forced: number;
  /** (best + good) / judged, or null if nothing was judged. */
  hitRate: number | null;
}

export interface Review {
  human: Side;
  steps: ReviewStep[];
  summary: ReviewSummary;
}

export interface ReviewOptions extends JudgeOptions {
  analyze?: Analyzer;
  /** Called after every judged move with (done, total). */
  onProgress?: (done: number, total: number) => void;
  /** Return true to abandon the review (resolves to null). */
  cancelled?: () => boolean;
}

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function summarize(steps: ReviewStep[]): ReviewSummary {
  const count = (v: Verdict) => steps.filter((s) => s.feedback?.verdict === v).length;
  const best = count('best');
  const good = count('good');
  const miss = count('miss');
  const judged = best + good + miss;
  return { judged, best, good, miss, forced: count('forced'), hitRate: judged ? (best + good) / judged : null };
}

/**
 * Replay `history` (move names from the standard start, e.g. ["d3", "c3", "pass", …]) and judge every
 * placement made by `human`. Resolves to null if cancelled.
 */
export async function reviewGame(history: string[], human: Side, options: ReviewOptions = {}): Promise<Review | null> {
  const analyze: Analyzer = options.analyze ?? ((pos) => rankMoves(pos));
  const moves = history.map((name) => {
    const m = parseMove(name);
    if (m === null) throw new Error(`unreadable move "${name}"`);
    return m;
  });

  // Replay first (cheap), so the total is known for the progress bar.
  const replay: { before: Position; step: Omit<ReviewStep, 'feedback'> }[] = [];
  let position = Position.initial();
  moves.forEach((move, i) => {
    const played = position.play(move);
    const flipped: number[] = [];
    for (let sq = 0; sq < 64; sq++) if (played.flipped & (1n << BigInt(sq))) flipped.push(sq);
    replay.push({ before: position, step: { ply: i + 1, mover: position.toMove, move, flipped, after: played.position } });
    position = played.position;
  });
  const total = replay.filter((r) => r.step.mover === human && r.step.move !== PASS).length;

  const steps: ReviewStep[] = [];
  let done = 0;
  for (const { before, step } of replay) {
    let feedback: Feedback | null = null;
    if (step.mover === human && step.move !== PASS) {
      if (options.cancelled?.()) return null;
      feedback = judge(await analyze(before), step.move, options);
      options.onProgress?.(++done, total);
      await yieldToBrowser(); // let the page paint between positions
    }
    steps.push({ ...step, feedback });
  }
  return { human, steps, summary: summarize(steps) };
}
