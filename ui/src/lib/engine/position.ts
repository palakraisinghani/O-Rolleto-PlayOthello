// 8x8 Othello on BigInt bitboards: a TypeScript port of the Rust `othello-core` Position, used by the
// web build (the desktop app uses the Rust engine). Same conventions: square (row, col) is bit
// row*8+col, a1 = 0 (top-left), h8 = 63, pass = 64, Black moves first. It is checked against the same
// golden file as the Rust engine (see engine.test.ts).
//
// Written in "erasable" TypeScript (no enums or parameter properties) so Node can run it directly.

export type Side = 'black' | 'white';
export type Outcome = 'black' | 'white' | 'draw';

export const SIZE = 8;
export const NUM_SQUARES = 64;
export const PASS = 64;
export const FULL = (1n << 64n) - 1n;

const COL_A = 0x0101010101010101n;
const COL_H = COL_A << 7n;

/** [shift left?, shift amount, mask of squares a shifted bit may land on] */
const DIRS: [boolean, bigint, bigint][] = [
  [false, 9n, FULL ^ COL_H], // up-left
  [false, 8n, FULL], // up
  [false, 7n, FULL ^ COL_A], // up-right
  [false, 1n, FULL ^ COL_H], // left
  [true, 1n, FULL ^ COL_A], // right
  [true, 7n, FULL ^ COL_H], // down-left
  [true, 8n, FULL], // down
  [true, 9n, FULL ^ COL_A] // down-right
];

const shift = (x: bigint, left: boolean, n: bigint, mask: bigint): bigint =>
  (left ? x << n : x >> n) & mask;

export const popcount = (x: bigint): number => {
  let n = 0;
  while (x) {
    x &= x - 1n;
    n++;
  }
  return n;
};

export const opponent = (s: Side): Side => (s === 'black' ? 'white' : 'black');

/** Why a move was refused. */
export class IllegalMoveError extends Error {
  readonly reason: 'game_over' | 'not_legal' | 'pass_not_allowed';
  constructor(reason: 'game_over' | 'not_legal' | 'pass_not_allowed', message: string) {
    super(message);
    this.reason = reason;
  }
}

export interface Played {
  position: Position;
  /** Bitboard of the discs this move flipped (0n for a pass). */
  flipped: bigint;
}

/** An immutable position. Cheap to copy, so search and history can keep copies freely. */
export class Position {
  readonly black: bigint;
  readonly white: bigint;
  readonly toMove: Side;
  /** Consecutive passes so far; 2 ends the game. */
  readonly passes: number;

  constructor(black: bigint, white: bigint, toMove: Side, passes = 0) {
    if (black & white) throw new Error('black and white discs overlap');
    if (passes < 0 || passes > 2) throw new Error('passes must be 0..2');
    this.black = black;
    this.white = white;
    this.toMove = toMove;
    this.passes = passes;
  }

  /** Standard start: white on d4/e5, black on e4/d5, Black to move. */
  static initial(): Position {
    const bit = (r: number, c: number) => 1n << BigInt(r * SIZE + c);
    return new Position(bit(3, 4) | bit(4, 3), bit(3, 3) | bit(4, 4), 'black', 0);
  }

  get own(): bigint {
    return this.toMove === 'black' ? this.black : this.white;
  }

  get opp(): bigint {
    return this.toMove === 'black' ? this.white : this.black;
  }

  counts(): { black: number; white: number } {
    return { black: popcount(this.black), white: popcount(this.white) };
  }

  /** Two consecutive passes, or a full board. */
  isTerminal(): boolean {
    return this.passes >= 2 || (this.black | this.white) === FULL;
  }

  /** Bitboard of squares where the side to move can place a disc. */
  legalBits(): bigint {
    const own = this.own;
    const opp = this.opp;
    const empty = FULL ^ (own | opp);
    let moves = 0n;
    for (const [left, n, mask] of DIRS) {
      let x = shift(own, left, n, mask) & opp;
      for (let i = 0; i < SIZE - 3; i++) x |= shift(x, left, n, mask) & opp;
      moves |= shift(x, left, n, mask) & empty;
    }
    return moves;
  }

  /** Legal moves in ascending square order: [PASS] if there is no placement, [] once the game is over. */
  legalMoves(): number[] {
    if (this.isTerminal()) return [];
    let bits = this.legalBits();
    if (bits === 0n) return [PASS];
    const moves: number[] = [];
    for (let sq = 0; bits; sq++, bits >>= 1n) if (bits & 1n) moves.push(sq);
    return moves;
  }

  private flipsFor(sq: number): bigint {
    const own = this.own;
    const opp = this.opp;
    const start = 1n << BigInt(sq);
    let flips = 0n;
    for (const [left, n, mask] of DIRS) {
      let line = 0n;
      let x = shift(start, left, n, mask);
      while (x & opp) {
        line |= x;
        x = shift(x, left, n, mask);
      }
      if (x & own) flips |= line;
    }
    return flips;
  }

  /** Play a move, validating it. A pass is accepted only when there is no placement. */
  play(move: number): Played {
    if (this.isTerminal()) throw new IllegalMoveError('game_over', 'the game is over');
    const next = opponent(this.toMove);
    if (move === PASS) {
      if (this.legalBits() !== 0n) {
        throw new IllegalMoveError('pass_not_allowed', 'cannot pass while a legal move exists');
      }
      return { position: new Position(this.black, this.white, next, this.passes + 1), flipped: 0n };
    }
    if (!Number.isInteger(move) || move < 0 || move >= NUM_SQUARES) {
      throw new IllegalMoveError('not_legal', `square ${move} is not a legal move`);
    }
    const bit = 1n << BigInt(move);
    if ((this.black | this.white) & bit) throw new IllegalMoveError('not_legal', `square ${move} is occupied`);
    const flipped = this.flipsFor(move);
    if (flipped === 0n) throw new IllegalMoveError('not_legal', `square ${move} flips nothing`);
    const own = this.own | flipped | bit;
    const opp = this.opp & ~flipped;
    const position =
      this.toMove === 'black' ? new Position(own, opp, next, 0) : new Position(opp, own, next, 0);
    return { position, flipped };
  }

  /** Result of a finished game; null while it is still being played. */
  outcome(): Outcome | null {
    if (!this.isTerminal()) return null;
    const { black, white } = this.counts();
    return black > white ? 'black' : white > black ? 'white' : 'draw';
  }
}

/** Algebraic name: "a1".."h8", or "pass". */
export const moveName = (move: number): string =>
  move === PASS ? 'pass' : 'abcdefgh'[move % SIZE] + (Math.floor(move / SIZE) + 1);

/** Parse "d3" (or "pass") into a move index; null if invalid. */
export const parseMove = (name: string): number | null => {
  const s = name.trim().toLowerCase();
  if (s === 'pass') return PASS;
  const m = /^([a-h])([1-8])$/.exec(s);
  return m ? (Number(m[2]) - 1) * SIZE + (m[1].charCodeAt(0) - 97) : null;
};

/** Squares set in a bitboard, ascending. */
export const bitsToSquares = (bits: bigint): number[] => {
  const out: number[] = [];
  for (let sq = 0; bits; sq++, bits >>= 1n) if (bits & 1n) out.push(sq);
  return out;
};
