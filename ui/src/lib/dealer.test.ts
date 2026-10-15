// Orolleto: the dialogue pools and how he chooses from them. Run with:  npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Snapshot } from './api.ts';
import { Dealer, seededRng, type Page } from './dealer.ts';
import { POOLS, POOL_SIZE, type PoolName } from './dialogues.ts';

const inPool = (pool: PoolName, say: string) => (POOLS[pool] as readonly string[]).includes(say);

/** A snapshot of a game against the computer (human = Black) in which `square` was just placed. */
function snap(opts: {
  ply: number;
  square: number | null;
  by?: 'black' | 'white';
  flips?: number;
  black?: number;
  white?: number;
  over?: 'human' | 'computer' | 'draw' | 'resigned';
  awaiting?: 'human' | 'computer';
}): Snapshot {
  const board = Array<number>(64).fill(0);
  if (opts.square !== null) board[opts.square] = opts.by === 'white' ? 2 : 1;
  const winner = opts.over === 'human' ? 'black' : opts.over === 'computer' || opts.over === 'resigned' ? 'white' : null;
  return {
    board,
    to_move: 'black',
    awaiting: opts.awaiting ?? 'human',
    legal: [],
    last_move: opts.square,
    flipped: Array.from({ length: opts.flips ?? 1 }, (_, i) => 20 + i),
    black_count: opts.black ?? 10,
    white_count: opts.white ?? 10,
    status: opts.over ? { state: 'over', winner, resigned: opts.over === 'resigned' } : { state: 'playing' },
    mode: { kind: 'vs_computer', difficulty: 2, human: 'black' },
    can_undo: false,
    ply: opts.ply,
    history: []
  };
}

const twoPlayer = (s: Snapshot): Snapshot => ({ ...s, mode: { kind: 'two_players' } });

// ------------------------------------------------------------------ the pools

test('there is a huge pool of lines, and no pool repeats itself', () => {
  assert.ok(POOL_SIZE >= 380, `only ${POOL_SIZE} lines`);
  for (const [name, lines] of Object.entries(POOLS)) {
    assert.ok(lines.length >= 3, `${name} is too small`);
    assert.equal(new Set(lines).size, lines.length, `${name} has a duplicate line`);
    for (const line of lines) assert.ok(line.trim() === line && line.length > 2, `${name}: bad line "${line}"`);
  }
});

test('every menu page has its own lines', () => {
  const pages: Page[] = ['home', 'setup-computer', 'setup-two', 'settings', 'help'];
  const seen = new Set<string>();
  const d = new Dealer({ rng: seededRng(1) });
  for (const page of pages) {
    const line = d.page(page);
    assert.equal(line.mood, 'happy');
    assert.ok(!seen.has(line.say), 'a line was reused across pages');
    seen.add(line.say);
  }
  assert.ok(inPool('home', new Dealer({ rng: seededRng(2) }).page('home').say));
  assert.ok(inPool('setupComputer', new Dealer({ rng: seededRng(2) }).page('setup-computer').say));
  assert.ok(inPool('setupTwo', new Dealer({ rng: seededRng(2) }).page('setup-two').say));
  assert.ok(inPool('settings', new Dealer({ rng: seededRng(2) }).page('settings').say));
  assert.ok(inPool('help', new Dealer({ rng: seededRng(2) }).page('help').say));
});

// ------------------------------------------------------------------ choosing lines

test('the generator is deterministic for a seed', () => {
  const a = seededRng(42);
  const b = seededRng(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  for (let i = 0; i < 100; i++) {
    const x = a();
    assert.ok(x >= 0 && x < 1);
  }
});

test('he never repeats a line he said recently', () => {
  const d = new Dealer({ rng: seededRng(7), memory: 8 });
  const said: string[] = [];
  for (let i = 0; i < 60; i++) said.push(d.thinking().say);
  for (let i = 0; i < said.length; i++) {
    for (let j = Math.max(0, i - 8); j < i; j++) assert.notEqual(said[i], said[j], `repeated within 8 lines at ${i}`);
  }
  assert.ok(new Set(said).size >= 15, 'should use most of the pool');
});

test('a small pool still works once every line has been used', () => {
  const d = new Dealer({ rng: seededRng(3) });
  for (let i = 0; i < 40; i++) assert.ok(inPool('reviewPass', d.reviewOther('pass')?.say ?? POOLS.reviewPass[0]));
});

test('the same seed gives the same conversation, other seeds differ', () => {
  const talk = (seed: number) => {
    const d = new Dealer({ rng: seededRng(seed) });
    return [d.page('home').say, d.thinking().say, d.hint().say, d.undo().say].join('|');
  };
  assert.equal(talk(5), talk(5));
  assert.notEqual(talk(5), talk(6));
});

// ------------------------------------------------------------------ chattiness

test('chattiness 0 keeps him silent on moves, 1 makes him comment on every ordinary move', () => {
  const prev = snap({ ply: 2, square: 19 });
  const plain = snap({ ply: 3, square: 27, by: 'black', flips: 1 });
  const quiet = new Dealer({ chattiness: 0, rng: seededRng(1) });
  const chatty = new Dealer({ chattiness: 1, rng: seededRng(1) });
  for (let i = 0; i < 25; i++) {
    assert.equal(quiet.afterMove(prev, plain), null);
    assert.ok(chatty.afterMove(prev, plain));
  }
});

test('in between, he comments on roughly that share of ordinary moves', () => {
  const prev = snap({ ply: 2, square: 19 });
  const plain = snap({ ply: 3, square: 27, by: 'white', flips: 1 });
  const d = new Dealer({ chattiness: 0.5, rng: seededRng(11) });
  let spoke = 0;
  const n = 2000;
  for (let i = 0; i < n; i++) if (d.afterMove(prev, plain)) spoke++;
  assert.ok(spoke > n * 0.45 && spoke < n * 0.55, `spoke ${spoke} of ${n}`);
});

test('corners and big flips are commented on more often than plain moves', () => {
  const prev = snap({ ply: 2, square: 19 });
  const count = (next: Snapshot) => {
    const d = new Dealer({ chattiness: 0.5, rng: seededRng(21) });
    let n = 0;
    for (let i = 0; i < 2000; i++) if (d.afterMove(prev, next)) n++;
    return n;
  };
  const plain = count(snap({ ply: 3, square: 27, by: 'black' }));
  assert.ok(count(snap({ ply: 3, square: 7, by: 'black' })) > plain * 1.3);
  assert.ok(count(snap({ ply: 3, square: 27, by: 'black', flips: 6 })) > plain * 1.3);
});

// ------------------------------------------------------------------ reactions

test('he praises your corner and big flips, and owns up kindly to his own', () => {
  const prev = snap({ ply: 2, square: 19 });
  const d = new Dealer({ chattiness: 1, rng: seededRng(4) });
  assert.ok(inPool('humanCorner', d.afterMove(prev, snap({ ply: 3, square: 7, by: 'black' }))!.say));
  assert.ok(inPool('humanBig', d.afterMove(prev, snap({ ply: 3, square: 27, by: 'black', flips: 6 }))!.say));
  assert.ok(inPool('computerCorner', d.afterMove(prev, snap({ ply: 3, square: 63, by: 'white' }))!.say));
  assert.ok(inPool('computerBig', d.afterMove(prev, snap({ ply: 3, square: 27, by: 'white', flips: 7 }))!.say));
});

test('ordinary moves draw on the move pools, the stage of the game and the score', () => {
  const prev = snap({ ply: 1, square: 19 });
  const said = new Set<string>();
  const next = (ply: number, black: number, white: number, by: 'black' | 'white') => snap({ ply, square: 27, by, black, white });
  for (let i = 0; i < 300; i++) {
    const rng = seededRng(i);
    const dealer = new Dealer({ chattiness: 1, rng });
    for (const s of [next(5, 8, 8, 'black'), next(30, 30, 12, 'black'), next(30, 12, 30, 'white'), next(30, 20, 20, 'white'), next(55, 40, 15, 'black')]) {
      const line = dealer.afterMove(prev, s);
      if (line) said.add(line.say);
    }
  }
  const pools: PoolName[] = ['humanPlain', 'computerPlain', 'opening', 'middle', 'ending', 'youLead', 'iLead', 'close'];
  for (const pool of pools) assert.ok([...said].some((l) => inPool(pool, l)), `never drew from ${pool}`);
});

test('he stays quiet without a new move, at the end of a game, and in two-player games', () => {
  const d = new Dealer({ chattiness: 1, rng: seededRng(1) });
  const a = snap({ ply: 3, square: 19 });
  assert.equal(d.afterMove(a, a), null);
  assert.equal(d.afterMove(null, a), null);
  assert.equal(d.afterMove(snap({ ply: 3, square: 1 }), snap({ ply: 4, square: 2, over: 'human' })), null);
  assert.equal(d.afterMove(snap({ ply: 2, square: 19 }), twoPlayer(snap({ ply: 3, square: 7, by: 'black' }))), null);
});

test('the start of a game depends on who moves first and on the mode', () => {
  const d = new Dealer({ rng: seededRng(1) });
  assert.ok(inPool('startComputer', d.start(snap({ ply: 0, square: null, awaiting: 'human' })).say));
  assert.ok(inPool('startComputerFirst', d.start(snap({ ply: 0, square: null, awaiting: 'computer' })).say));
  assert.ok(inPool('startTwo', d.start(twoPlayer(snap({ ply: 0, square: null }))).say));
});

test('he is kind at the end whoever wins', () => {
  const d = new Dealer({ rng: seededRng(1) });
  assert.ok(inPool('youWin', d.end(snap({ ply: 60, square: 1, over: 'human' })).say));
  assert.ok(inPool('iWin', d.end(snap({ ply: 60, square: 1, over: 'computer' })).say));
  assert.ok(inPool('draw', d.end(snap({ ply: 60, square: 1, over: 'draw' })).say));
  assert.ok(inPool('resigned', d.end(snap({ ply: 20, square: 1, over: 'resigned' })).say));
  assert.ok(inPool('endTwo', d.end(twoPlayer(snap({ ply: 60, square: 1, over: 'human' }))).say));
  assert.equal(d.end(snap({ ply: 60, square: 1, over: 'computer' })).mood, 'happy');
});

test('passes, hints and undo have their own lines', () => {
  const d = new Dealer({ rng: seededRng(2) });
  assert.ok(inPool('passHuman', d.passed(true).say));
  assert.ok(inPool('passComputer', d.passed(false).say));
  assert.ok(inPool('hint', d.hint().say));
  assert.ok(inPool('undo', d.undo().say));
  assert.equal(d.thinking().mood, 'think');
});

// ------------------------------------------------------------------ the review

test('the review intro follows how well you matched him', () => {
  const d = new Dealer({ rng: seededRng(3) });
  assert.ok(inPool('reviewGreat', d.reviewIntro({ judged: 20, hitRate: 0.9 }).say));
  assert.ok(inPool('reviewGood', d.reviewIntro({ judged: 20, hitRate: 0.6 }).say));
  assert.ok(inPool('reviewKind', d.reviewIntro({ judged: 20, hitRate: 0.2 }).say));
  assert.ok(inPool('reviewEmpty', d.reviewIntro({ judged: 0, hitRate: null }).say));
  assert.ok(inPool('reviewEmpty', d.reviewIntro(null).say));
});

test('he comments on every kind of reviewed move, gently when it was a miss', () => {
  const d = new Dealer({ rng: seededRng(5) });
  assert.ok(inPool('reviewBest', d.reviewMove('best').say));
  assert.ok(inPool('reviewGoodMove', d.reviewMove('good').say));
  assert.ok(inPool('reviewMiss', d.reviewMove('miss').say));
  assert.ok(inPool('reviewForced', d.reviewMove('forced').say));
  assert.notEqual(d.reviewMove('miss').mood, 'sad');
  assert.ok(inPool('reviewStart', d.reviewStart().say));
});

test('he is only sometimes chatty about his own moves in the review', () => {
  const quiet = new Dealer({ chattiness: 0, rng: seededRng(1) });
  const chatty = new Dealer({ chattiness: 1, rng: seededRng(1) });
  assert.equal(quiet.reviewOther('mine'), null);
  assert.ok(inPool('reviewMine', chatty.reviewOther('mine')!.say));
  assert.ok(inPool('reviewPass', chatty.reviewOther('pass')!.say));
});
