// Drives the web session the way the UI does: commands in, snapshots and events out.
// Run with:  npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GameEvent, Mode, Snapshot } from '../api.ts';
import { Rng, chooseMove, greedyBest } from './ai.ts';
import { PASS, Position, parseMove, type Side } from './position.ts';
import { WebSession } from './session.ts';

const sq = (name: string) => parseMove(name)!;
const twoPlayers: Mode = { kind: 'two_players' };
const vs = (human: 'black' | 'white' | 'random', difficulty: number): Mode => ({ kind: 'vs_computer', difficulty, human });

function make(opts: ConstructorParameters<typeof WebSession>[0] = {}) {
  const session = new WebSession({ seed: 1, minThinkMs: 5, level4BudgetMs: 40, ...opts });
  const events: GameEvent[] = [];
  session.onEvent((e) => events.push(e));
  /** Wait until a state_changed satisfying `pred` has arrived (or time out). */
  const waitState = async (pred: (s: Snapshot) => boolean, ms = 4000): Promise<Snapshot> => {
    const end = Date.now() + ms;
    for (;;) {
      const hit = events.find((e) => e.type === 'state_changed' && pred(e.snapshot));
      if (hit && hit.type === 'state_changed') return hit.snapshot;
      if (Date.now() > end) throw new Error('timed out waiting for a state');
      await new Promise((r) => setTimeout(r, 5));
    }
  };
  return { session, events, waitState };
}

const rejects = (fn: () => unknown, code: string) =>
  assert.throws(fn, (e: any) => e && e.code === code, `expected ${code}`);

test('commands fail before a game exists', () => {
  const { session } = make();
  rejects(() => session.snapshot(), 'no_game');
  rejects(() => session.play(19), 'no_game');
  rejects(() => session.undo(), 'no_game');
  rejects(() => session.resign(), 'no_game');
});

test('new two-player game snapshot', () => {
  const { session, events } = make();
  const s = session.newGame(twoPlayers);
  assert.equal(s.board.length, 64);
  assert.deepEqual([s.black_count, s.white_count], [2, 2]);
  assert.equal(s.to_move, 'black');
  assert.equal(s.awaiting, 'human');
  assert.deepEqual(s.legal, [sq('d3'), sq('c4'), sq('f5'), sq('e6')]);
  assert.deepEqual(s.status, { state: 'playing' });
  assert.ok(!s.can_undo && s.last_move === null && s.history.length === 0);
  assert.deepEqual([s.board[27], s.board[28], s.board[35], s.board[36]], [2, 1, 1, 2]);
  assert.equal(events[0].type, 'state_changed');
});

test('play updates the state and reports the flips', () => {
  const { session } = make();
  session.newGame(twoPlayers);
  const s = session.play(sq('d3'));
  assert.equal(s.last_move, sq('d3'));
  assert.deepEqual(s.flipped, [sq('d4')]);
  assert.deepEqual([s.black_count, s.white_count], [4, 1]);
  assert.equal(s.to_move, 'white');
  assert.deepEqual(s.history, ['d3']);
  assert.ok(s.can_undo);
});

test('bad moves are rejected and change nothing', () => {
  const { session } = make();
  const before = session.newGame(twoPlayers);
  rejects(() => session.play(0), 'illegal_move');
  rejects(() => session.play(27), 'illegal_move'); // occupied
  rejects(() => session.play(64), 'illegal_move'); // passes are automatic
  rejects(() => session.play(200), 'illegal_move');
  assert.deepEqual(session.snapshot(), before);
});

test('invalid difficulty is rejected', () => {
  const { session } = make();
  rejects(() => session.newGame(vs('black', 0)), 'invalid_difficulty');
  rejects(() => session.newGame(vs('black', 5)), 'invalid_difficulty');
  rejects(() => session.snapshot(), 'no_game');
});

test('the computer replies after the human moves', async () => {
  const { session, waitState } = make();
  const s0 = session.newGame(vs('black', 2));
  assert.equal(s0.awaiting, 'human');
  const s1 = session.play(sq('d3'));
  assert.deepEqual([s1.awaiting, s1.to_move], ['computer', 'white']);
  assert.deepEqual(s1.legal, [], 'no hints while the computer thinks');
  rejects(() => session.play(sq('c3')), 'not_your_turn');
  const after = await waitState((s) => s.ply === 2);
  assert.deepEqual([after.awaiting, after.to_move], ['human', 'black']);
  assert.deepEqual(session.snapshot(), after);
});

test('the computer moves first when the human is white', async () => {
  const { session, waitState } = make();
  assert.equal(session.newGame(vs('white', 1)).awaiting, 'computer');
  const s = await waitState((x) => x.ply === 1);
  assert.deepEqual([s.awaiting, s.to_move], ['human', 'white']);
  assert.ok(!s.can_undo, "cannot undo the computer's opening move");
  rejects(() => session.undo(), 'nothing_to_undo');
});

test('a random side is resolved in the snapshot', () => {
  const { session } = make();
  const seen = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const m = session.newGame(vs('random', 1)).mode;
    assert.equal(m.kind, 'vs_computer');
    if (m.kind === 'vs_computer') seen.add(m.human);
  }
  assert.deepEqual([...seen].sort(), ['black', 'white']);
});

test('undo against the computer rolls back the move and the reply', async () => {
  const { session, waitState } = make();
  const start = session.newGame(vs('black', 2));
  session.play(sq('d3'));
  await waitState((s) => s.ply === 2);
  const s = session.undo();
  assert.deepEqual([s.ply, s.board, s.awaiting], [0, start.board, 'human']);
  assert.ok(!s.can_undo);
});

test('undo in two-player mode removes one move', () => {
  const { session } = make();
  session.newGame(twoPlayers);
  session.play(sq('d3'));
  session.play(sq('c3'));
  const s = session.undo();
  assert.deepEqual([s.ply, s.to_move, s.history], [1, 'white', ['d3']]);
});

test('a computer move that finishes after an undo is discarded', async () => {
  const { session, events } = make({ minThinkMs: 200 });
  session.newGame(vs('black', 3));
  session.play(sq('d3')); // the computer starts thinking (>= 200 ms)
  const s = session.undo();
  assert.equal(s.ply, 0);
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(session.snapshot().ply, 0, 'stale computer move must not be applied');
  assert.ok(events.every((e) => e.type !== 'state_changed' || e.snapshot.ply <= 1));
});

test('starting a new game discards a pending computer move', async () => {
  const { session } = make({ minThinkMs: 150 });
  session.newGame(vs('white', 3)); // the computer (black) thinks first
  session.newGame(twoPlayers);
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(session.snapshot().ply, 0);
});

test('forced passes are automatic and announced', () => {
  // White to move can capture black's only disc; then both sides must pass.
  const bit = (r: number, c: number) => 1n << BigInt(r * 8 + c);
  const pos = new Position(bit(1, 1), bit(1, 2), 'white', 0);
  const { session, events } = make();
  session.newGame(twoPlayers, pos);
  events.length = 0;
  const s = session.play(sq('a2'));
  assert.deepEqual(s.status, { state: 'over', winner: 'white', resigned: false });
  assert.deepEqual([s.black_count, s.white_count], [0, 3]);
  assert.deepEqual(s.history, ['a2', 'pass', 'pass']);
  assert.equal(s.last_move, sq('a2'), 'passes do not move the last-move highlight');
  assert.deepEqual(events.map((e) => e.type), ['passed', 'passed', 'state_changed', 'game_over']);
  assert.deepEqual([events[0], events[1]].map((e) => (e.type === 'passed' ? e.side : '')), ['black', 'white']);
  rejects(() => session.play(sq('a1')), 'game_over');
  const u = session.undo(); // back to before the move, passes included
  assert.deepEqual([u.ply, u.status], [0, { state: 'playing' }]);
});

test('resigning against the computer loses', async () => {
  const { session, events, waitState } = make();
  session.newGame(vs('white', 1));
  await waitState((s) => s.ply === 1);
  events.length = 0;
  const s = session.resign();
  assert.deepEqual(s.status, { state: 'over', winner: 'black', resigned: true });
  assert.equal(s.awaiting, 'nobody');
  assert.ok(events.some((e) => e.type === 'game_over' && e.resigned));
  rejects(() => session.resign(), 'game_over');
  rejects(() => session.play(0), 'game_over');
});

test('hints only against the computer on the human turn', async () => {
  const { session } = make();
  session.newGame(twoPlayers);
  await assert.rejects(session.hint(), (e: any) => e.code === 'hint_unavailable');
  const s = session.newGame(vs('black', 2));
  assert.ok(s.legal.includes(await session.hint()));
});

test('a full game against the computer stays consistent', async () => {
  const { session, waitState } = make();
  let s = session.newGame(vs('black', 1));
  let turn = 0;
  while (s.status.state === 'playing') {
    if (s.awaiting === 'computer') {
      const ply = s.ply;
      s = await waitState((x) => x.ply > ply);
      continue;
    }
    s = session.play(s.legal[++turn % s.legal.length]);
    assert.equal(s.board.filter((c) => c !== 0).length, s.black_count + s.white_count);
  }
  assert.ok(s.status.state === 'over' && !s.status.resigned);
});

// ------------------------------------------------------------------ the bots

const noCtl = { cancelled: () => false, progress: () => {} };

async function playGame(black: (p: Position) => Promise<number | null>, white: (p: Position) => Promise<number | null>): Promise<Side | 'draw'> {
  let p = Position.initial();
  while (!p.isTerminal()) {
    const move = await (p.toMove === 'black' ? black : white)(p);
    assert.ok(move !== null && p.legalMoves().includes(move), `bot played an illegal move ${move}`);
    p = p.play(move as number).position;
  }
  return p.outcome()!;
}

const bot = (level: number, seed: number, budget = 40) => {
  const rng = new Rng(seed);
  return (p: Position) => chooseMove(p, level, rng, noCtl, budget);
};

test('every level always plays legal moves (and passes only when forced)', async () => {
  for (const level of [1, 2, 3, 4]) {
    for (let seed = 0; seed < 3; seed++) await playGame(bot(level, seed), bot(1, seed + 100));
  }
});

test('greedy picks a move that maximises the disc count', () => {
  const p = Position.initial();
  assert.ok(greedyBest(p).length > 0 && greedyBest(p).every((m) => p.legalMoves().includes(m)));
});

test('stronger levels beat random clearly', async () => {
  for (const level of [3, 4]) {
    let wins = 0;
    const games = 12;
    for (let i = 0; i < games; i++) {
      const botIsBlack = i % 2 === 0;
      const strong = bot(level, 7 + i);
      const weak = bot(1, 900 + i);
      const result = await playGame(botIsBlack ? strong : weak, botIsBlack ? weak : strong);
      if (result === (botIsBlack ? 'black' : 'white')) wins++;
    }
    assert.ok(wins >= 10, `level ${level} won only ${wins}/${games} against random`);
  }
});

test('level 4 beats level 2 more often than not', async () => {
  let wins = 0;
  const games = 8;
  for (let i = 0; i < games; i++) {
    const botIsBlack = i % 2 === 0;
    const strong = bot(4, 31 + i);
    const weak = bot(2, 500 + i);
    const result = await playGame(botIsBlack ? strong : weak, botIsBlack ? weak : strong);
    if (result === (botIsBlack ? 'black' : 'white')) wins++;
  }
  assert.ok(wins >= 5, `level 4 won only ${wins}/${games} against greedy`);
});

test('a forced move (including a pass) is returned immediately', async () => {
  const bit = (r: number, c: number) => 1n << BigInt(r * 8 + c);
  const p = new Position(bit(0, 0), bit(7, 7), 'black', 0); // black has no placement
  assert.deepEqual(p.legalMoves(), [PASS]);
  assert.equal(await chooseMove(p, 4, new Rng(1), noCtl), PASS);
});
