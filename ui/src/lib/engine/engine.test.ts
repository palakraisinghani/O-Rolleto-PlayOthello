// Checks the TypeScript engine against tests/golden/engine_8x8.json, the same reference data the
// Rust engine is tested against (generated from OthelloRL by tools/make_golden.py).
// Run with:  npm test   (Node's built-in test runner)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Position, PASS, moveName, parseMove, type Outcome, type Side } from './position.ts';

const golden = JSON.parse(
  readFileSync(new URL('../../../../tests/golden/engine_8x8.json', import.meta.url), 'utf8')
);

interface State { black: string; white: string; player: Side; passes: number }
const position = (s: State) => new Position(BigInt('0x' + s.black), BigInt('0x' + s.white), s.player, s.passes);
const perft = (p: Position, depth: number): number =>
  depth === 0 || p.isTerminal() ? 1 : p.legalMoves().reduce((n, m) => n + perft(p.play(m).position, depth - 1), 0);

test('start position matches the reference', () => {
  const start = position(golden.meta.encoding.start_position);
  const p = Position.initial();
  assert.equal(p.black, start.black);
  assert.equal(p.white, start.white);
  assert.equal(p.toMove, 'black');
});

test('perft matches the reference (depth 1-7)', () => {
  for (const [depth, expected] of Object.entries(golden.perft)) {
    assert.equal(perft(Position.initial(), Number(depth)), expected, `perft depth ${depth}`);
  }
});

function replay(game: any) {
  const name: string = game.name;
  let pos = position(game.start);
  game.plies.forEach((ply: any, i: number) => {
    const where = `${name} ply ${i}`;
    const expected = position(ply.state);
    assert.ok(pos.black === expected.black && pos.white === expected.white && pos.toMove === expected.toMove && pos.passes === expected.passes, `${where}: position drifted`);
    assert.deepEqual(pos.legalMoves(), ply.legal, `${where}: legal moves`);
    pos = pos.play(ply.move).position;
    const after = position(ply.after);
    assert.ok(pos.black === after.black && pos.white === after.white && pos.toMove === after.toMove && pos.passes === after.passes, `${where}: position after ${moveName(ply.move)}`);
  });
  const fin = game.final;
  const end = position(fin.state);
  assert.ok(pos.black === end.black && pos.white === end.white && pos.passes === end.passes, `${name}: final position`);
  assert.equal(pos.isTerminal(), fin.terminal, `${name}: terminal`);
  assert.deepEqual(pos.legalMoves(), fin.legal, `${name}: final legal moves`);
  if (pos.isTerminal()) {
    const { black, white } = pos.counts();
    assert.equal(black, fin.black_discs, `${name}: black discs`);
    assert.equal(white, fin.white_discs, `${name}: white discs`);
    assert.equal(pos.outcome() as Outcome, fin.winner, `${name}: outcome`);
  }
}

test('hand-built rule cases match the reference', () => {
  assert.ok(golden.cases.length > 0);
  golden.cases.forEach(replay);
});

test('100 seeded random games match the reference', () => {
  assert.ok(golden.games.length > 0);
  golden.games.forEach(replay);
});

test('illegal moves are refused', () => {
  const p = Position.initial();
  assert.throws(() => p.play(0), /not a legal move|flips nothing/);
  assert.throws(() => p.play(27), /occupied/);
  assert.throws(() => p.play(PASS), /cannot pass/);
  assert.throws(() => p.play(99), /not a legal move/);
});

test('move names round-trip', () => {
  for (let i = 0; i <= 64; i++) assert.equal(parseMove(moveName(i)), i);
  assert.equal(parseMove('i1'), null);
  assert.equal(moveName(19), 'd3');
});
