// Orolleto's reactions. Run with:  npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Snapshot } from './api.ts';
import { reactToEnd, reactToMove, reviewLine, thinking, welcome } from './dealer.ts';

const always = (x: number) => () => x;

/** A snapshot of a game where `human` plays and `square` was just placed by `by`. */
function snap(opts: { ply: number; square: number | null; by?: 'black' | 'white'; flips?: number; over?: 'human' | 'computer' | 'draw' }): Snapshot {
  const board = Array<number>(64).fill(0);
  if (opts.square !== null) board[opts.square] = opts.by === 'white' ? 2 : 1;
  const winner = opts.over === 'human' ? 'black' : opts.over === 'computer' ? 'white' : null;
  return {
    board,
    to_move: 'black',
    awaiting: 'human',
    legal: [],
    last_move: opts.square,
    flipped: Array.from({ length: opts.flips ?? 1 }, (_, i) => 20 + i),
    black_count: 2,
    white_count: 2,
    status: opts.over ? { state: 'over', winner, resigned: false } : { state: 'playing' },
    mode: { kind: 'vs_computer', difficulty: 2, human: 'black' },
    can_undo: false,
    ply: opts.ply,
    history: []
  };
}

test('he welcomes players differently in one- and two-player games', () => {
  assert.notEqual(welcome(false, always(0)).say, welcome(true, always(0)).say);
  assert.equal(welcome(false).mood, 'happy');
});

test('while the computer thinks he looks thoughtful', () => {
  assert.equal(thinking().mood, 'think');
});

test('he stays quiet without a new move, and in two-player games', () => {
  const a = snap({ ply: 3, square: 19 });
  assert.equal(reactToMove(a, a), null);
  assert.equal(reactToMove(null, a), null);
  const two = { ...snap({ ply: 4, square: 0, by: 'black' }), mode: { kind: 'two_players' } } as Snapshot;
  assert.equal(reactToMove(snap({ ply: 3, square: 19 }), two), null);
});

test('he admires the player\'s corner and big flips, and is silent on ordinary moves', () => {
  const prev = snap({ ply: 2, square: 19 });
  const corner = reactToMove(prev, snap({ ply: 3, square: 7, by: 'black' }), always(0));
  assert.ok(corner && /corner/i.test(corner.say) && corner.mood === 'sad');
  const big = reactToMove(prev, snap({ ply: 3, square: 27, by: 'black', flips: 6 }), always(0));
  assert.ok(big && big.mood === 'sad');
  assert.equal(reactToMove(prev, snap({ ply: 3, square: 27, by: 'black', flips: 2 }), always(0)), null);
});

test('he gloats about the computer\'s corner and sometimes comments on its other moves', () => {
  const prev = snap({ ply: 3, square: 19 });
  const corner = reactToMove(prev, snap({ ply: 4, square: 63, by: 'white' }), always(0));
  assert.ok(corner && /corner/i.test(corner.say) && corner.mood === 'happy');
  assert.ok(reactToMove(prev, snap({ ply: 4, square: 27, by: 'white' }), always(0.1))); // < 0.4: comments
  assert.equal(reactToMove(prev, snap({ ply: 4, square: 27, by: 'white' }), always(0.9)), null);
});

test('the result line depends on who won', () => {
  assert.equal(reactToEnd(snap({ ply: 60, square: 1, over: 'human' }), always(0)).mood, 'sad');
  assert.equal(reactToEnd(snap({ ply: 60, square: 1, over: 'computer' }), always(0)).mood, 'happy');
  assert.equal(reactToEnd(snap({ ply: 60, square: 1, over: 'draw' }), always(0)).mood, 'idle');
});

test('he comments on every kind of reviewed move', () => {
  assert.equal(reviewLine('best').mood, 'happy');
  assert.equal(reviewLine('good').mood, 'happy');
  assert.equal(reviewLine('miss').mood, 'sad');
  assert.equal(reviewLine('forced').mood, 'idle');
});
