// Post-game review: judging a move against the computer's ranked opinion, and replaying whole games.
// Run with:  npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Rng, rankMoves, type RankedMove } from './ai.ts';
import { PASS, Position, moveName, parseMove, type Side } from './position.ts';
import { REVIEW_TOP_K, REVIEW_TOP_P, judge, reviewGame, toCandidates } from './review.ts';

const ranked = (scores: number[]): RankedMove[] => scores.map((score, i) => ({ move: 10 + i, score }));

/** Play a whole game; `chooser` picks the move for each side. Returns the move names. */
function playGame(chooser: (pos: Position, side: Side) => number): string[] {
  const names: string[] = [];
  let pos = Position.initial();
  while (!pos.isTerminal()) {
    const side = pos.toMove;
    const legal = pos.legalMoves();
    const move = legal.length === 1 ? legal[0] : chooser(pos, side);
    names.push(moveName(move));
    pos = pos.play(move).position;
  }
  return names;
}

test('the defaults are top-3 and top-p 0.2', () => {
  assert.equal(REVIEW_TOP_K, 3);
  assert.equal(REVIEW_TOP_P, 0.2);
});

test('probabilities sum to one, best first, and equal scores share a rank', () => {
  const c = toCandidates(ranked([10, 40, 40, 5]));
  assert.deepEqual(c.map((x) => x.score), [40, 40, 10, 5]);
  assert.deepEqual(c.map((x) => x.rank), [1, 1, 3, 4]);
  assert.ok(Math.abs(c.reduce((s, x) => s + x.prob, 0) - 1) < 1e-12);
  assert.ok(c[0].prob === c[1].prob && c[1].prob > c[2].prob && c[2].prob > c[3].prob);
});

test('best, good (top 3) and miss', () => {
  const r = ranked([50, 40, 30, 10, 0]);
  assert.equal(judge(r, 10).verdict, 'best');
  assert.equal(judge(r, 11).verdict, 'good');
  assert.equal(judge(r, 12).verdict, 'good');
  assert.equal(judge(r, 13).verdict, 'miss');
  assert.equal(judge(r, 14).verdict, 'miss');
  assert.deepEqual(judge(r, 14).accepted.map((c) => c.move), [10, 11, 12]);
  assert.equal(judge(r, 13).played.rank, 4);
});

test('a lone legal move is forced', () => {
  const f = judge(ranked([7]), 10);
  assert.equal(f.verdict, 'forced');
  assert.equal(f.played.prob, 1);
});

test('a move tied with the best is best, and ties at the cut-off are kept', () => {
  assert.equal(judge(ranked([30, 30, 30, 30, 0]), 13).verdict, 'best');
  // 4th and 5th share rank 3: both are inside the top-3 by rank.
  const r = ranked([50, 40, 20, 20, 0]);
  assert.equal(judge(r, 13).verdict, 'good');
});

test('the top-p nucleus accepts a move that top-k alone would not', () => {
  // 25 moves with nearly equal values: each gets about 4%, so 20% of the mass needs five moves.
  const flat = ranked(Array.from({ length: 25 }, (_, i) => 100 - i * 0.1));
  assert.equal(judge(flat, 14).verdict, 'good'); // 5th place, outside top-3
  assert.equal(judge(flat, 14, { p: 0.0001 }).verdict, 'miss'); // without the nucleus
  assert.equal(judge(flat, 20).verdict, 'miss'); // 11th place is outside both
});

test('judging a move that was not legal is an error', () => {
  assert.throws(() => judge(ranked([5, 4]), 99), /not among the legal moves/);
});

test('rankMoves is deterministic, covers every legal move and orders best first', () => {
  const pos = Position.initial().play(parseMove('d3')!).position;
  const a = rankMoves(pos);
  const b = rankMoves(pos);
  assert.deepEqual(a, b);
  assert.deepEqual(a.map((m) => m.move).sort((x, y) => x - y), pos.legalMoves());
  for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].score >= a[i].score);
});

test('the four opening moves are mirror images, so all are "best"', () => {
  const r = rankMoves(Position.initial());
  assert.equal(new Set(r.map((m) => m.score)).size, 1);
  for (const m of r) assert.equal(judge(r, m.move).verdict, 'best');
});

test('a player who always takes the computer\'s top move scores 100%', async () => {
  const human: Side = 'black';
  const history = playGame((pos, side) => (side === human ? rankMoves(pos)[0].move : new Rng(7).pick(pos.legalMoves())));
  const review = await reviewGame(history, human);
  assert.ok(review);
  assert.equal(review!.steps.length, history.length);
  assert.equal(review!.summary.miss, 0);
  assert.equal(review!.summary.good, 0);
  assert.equal(review!.summary.hitRate, 1);
  // Computer moves and passes carry no feedback.
  for (const s of review!.steps) assert.equal(s.feedback !== null, s.mover === human && s.move !== PASS);
});

test('a random player misses some moves, and every judged move is consistent', async () => {
  const rng = new Rng(3);
  const history = playGame((pos) => rng.pick(pos.legalMoves()));
  const review = await reviewGame(history, 'white');
  assert.ok(review);
  const { summary, steps } = review!;
  assert.equal(summary.judged, summary.best + summary.good + summary.miss);
  assert.ok(summary.miss > 0, 'a random player should miss the top moves sometimes');
  for (const s of steps) {
    if (!s.feedback) continue;
    const f = s.feedback;
    assert.equal(f.played.move, s.move);
    assert.ok(f.candidates.some((c) => c.move === s.move));
    if (f.verdict === 'best') assert.equal(f.played.rank, 1);
    if (f.verdict === 'miss') assert.ok(!f.accepted.some((c) => c.move === s.move));
    if (f.verdict === 'good') assert.ok(f.accepted.some((c) => c.move === s.move) && f.played.rank > 1);
  }
  // The steps reproduce the real game: the last position's discs match a straight replay.
  let pos = Position.initial();
  for (const name of history) pos = pos.play(parseMove(name)!).position;
  assert.equal(steps[steps.length - 1].after.black, pos.black);
});

test('passes are replayed but never judged', async () => {
  let history: string[] | null = null;
  for (let seed = 1; seed < 60 && !history; seed++) {
    const rng = new Rng(seed);
    const h = playGame((pos) => rng.pick(pos.legalMoves()));
    if (h.includes('pass')) history = h;
  }
  assert.ok(history, 'expected some random game to contain a pass');
  const review = await reviewGame(history!, 'black');
  assert.ok(review);
  assert.equal(review!.steps.length, history!.length);
  for (const s of review!.steps) if (s.move === PASS) assert.equal(s.feedback, null);
});

test('progress is reported, and a cancelled review resolves to null', async () => {
  const rng = new Rng(11);
  const history = playGame((pos) => rng.pick(pos.legalMoves()));
  const seen: [number, number][] = [];
  const full = await reviewGame(history, 'black', { onProgress: (d, t) => seen.push([d, t]) });
  assert.ok(full);
  assert.equal(seen.length, seen[0][1]);
  assert.deepEqual(seen[seen.length - 1], [seen[0][1], seen[0][1]]);

  let calls = 0;
  const cancelled = await reviewGame(history, 'black', { cancelled: () => ++calls > 2 });
  assert.equal(cancelled, null);
});

test('a custom analyzer (such as Oroletto later) is honoured', async () => {
  const history = ['d3', 'c3'];
  // This analyzer thinks only d3 is any good: ranks e6 and c4 and f5 below it.
  const review = await reviewGame(history, 'black', {
    analyze: (pos) => pos.legalMoves().map((move) => ({ move, score: move === parseMove('d3') ? 100 : 0 }))
  });
  assert.equal(review!.steps[0].feedback!.verdict, 'best');
  assert.equal(review!.steps[1].feedback, null);
});

test('an unreadable history is reported', async () => {
  await assert.rejects(() => reviewGame(['d3', 'zz'], 'black'), /unreadable move/);
});
