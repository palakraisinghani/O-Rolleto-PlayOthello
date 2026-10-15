// Orolleto, the card-room dealer: decides what he says and how he looks at each moment of the app.
// The lines themselves live in dialogues.ts; this file chooses among them.
//
// Two kinds of randomness shape what you see:
//  - which line: picked at random from a big pool, never one he said recently;
//  - whether he speaks at all, for the optional comments on ordinary moves: `chattiness` is the
//    chance that he comments on a plain move (0 = silent, 1 = every move). Corners and big flips are
//    1.6x as likely to get a comment. Greetings, the start and the end of a game, passes, hints,
//    undo and the review verdicts are always spoken.

import type { Snapshot } from './api.ts';
import { POOLS, type PoolName } from './dialogues.ts';

export type Mood = 'idle' | 'think' | 'happy' | 'sad';
export interface Line {
  say: string;
  mood: Mood;
  /** A big moment (a corner, a big flip): may replace what he is saying before the hold is over. */
  special?: boolean;
  /** A "thinking…" line: shown only while the computer thinks, and never held. */
  transient?: boolean;
}
export type Rng = () => number;
export type Page = 'home' | 'setup-computer' | 'setup-two' | 'settings' | 'help';

export const DEALER_NAME = 'Orolleto';
/** Default chance that he comments on an ordinary move. */
export const DEFAULT_CHATTINESS = 0.55;
/**
 * He keeps what he has said on screen for at least this many plies (half-moves) before an ordinary
 * remark or a "thinking" line may replace it, so the bubble does not change with every move.
 * Corners, big flips, passes, hints, undo and the end of a game speak up at once.
 */
export const DEFAULT_HOLD_PLIES = 6;
/** How many of his latest lines of one kind he will not repeat. */
export const DEFAULT_MEMORY = 8;

const CORNERS = [0, 7, 56, 63];
const SPECIAL_WEIGHT = 1.6;

/** A small deterministic random generator (mulberry32), so tests and the review can pin the choice. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DealerOptions {
  chattiness?: number;
  rng?: Rng;
  memory?: number;
}

export class Dealer {
  readonly chattiness: number;
  private readonly rng: Rng;
  private readonly memory: number;
  private readonly recent = new Map<PoolName, string[]>();

  constructor(options: DealerOptions = {}) {
    this.chattiness = Math.min(1, Math.max(0, options.chattiness ?? DEFAULT_CHATTINESS));
    this.rng = options.rng ?? Math.random;
    this.memory = options.memory ?? DEFAULT_MEMORY;
  }

  /** A random line from `pool`, avoiding the ones used lately. */
  private say(pool: PoolName, mood: Mood): Line {
    const lines: readonly string[] = POOLS[pool];
    const recent = this.recent.get(pool) ?? [];
    const fresh = lines.filter((l) => !recent.includes(l));
    const choices = fresh.length ? fresh : lines;
    const say = choices[Math.min(choices.length - 1, Math.floor(this.rng() * choices.length))];
    this.recent.set(pool, [...recent, say].slice(-Math.min(this.memory, lines.length - 1)));
    return { say, mood };
  }

  /** True with probability chattiness × weight. */
  private chance(weight = 1): boolean {
    return this.rng() < this.chattiness * weight;
  }

  // ------------------------------------------------------------------ pages

  /** What he says on a menu page. */
  page(page: Page): Line {
    const pool: PoolName =
      page === 'home' ? 'home' : page === 'setup-computer' ? 'setupComputer' : page === 'setup-two' ? 'setupTwo' : page;
    return this.say(pool, 'happy');
  }

  // ------------------------------------------------------------------ in a game

  /** The first words of a new game. */
  start(snap: Snapshot): Line {
    if (snap.mode.kind === 'two_players') return this.say('startTwo', 'happy');
    return this.say(snap.awaiting === 'computer' ? 'startComputerFirst' : 'startComputer', 'happy');
  }

  /** While the computer works out its move. */
  thinking(): Line {
    return { ...this.say('thinking', 'think'), transient: true };
  }

  /**
   * His reaction when the game moves from `prev` to `next`, or null to stay quiet (always null in
   * two-player games, and for most ordinary moves unless he is feeling chatty).
   */
  afterMove(prev: Snapshot | null, next: Snapshot): Line | null {
    if (!prev || next.mode.kind !== 'vs_computer' || next.ply <= prev.ply || next.last_move === null) return null;
    if (next.status.state === 'over') return null; // the result has its own line
    const human = next.mode.human;
    const byHuman = (next.board[next.last_move] === 1 ? 'black' : 'white') === human;
    const mine = byHuman ? 'human' : 'computer';

    if (CORNERS.includes(next.last_move)) {
      return this.chance(SPECIAL_WEIGHT) ? { ...this.say(byHuman ? 'humanCorner' : 'computerCorner', 'happy'), special: true } : null;
    }
    if (next.flipped.length >= 5) {
      return this.chance(SPECIAL_WEIGHT) ? { ...this.say(byHuman ? 'humanBig' : 'computerBig', 'happy'), special: true } : null;
    }
    if (!this.chance()) return null;

    // An ordinary move: sometimes a remark about the move, sometimes about the state of the game.
    const pools: PoolName[] = [mine === 'human' ? 'humanPlain' : 'computerPlain'];
    if (next.ply <= 10) pools.push('opening');
    else if (next.ply >= 24 && next.ply <= 40) pools.push('middle');
    else if (next.ply >= 48) pools.push('ending');
    if (next.ply >= 14) {
      const diff = (human === 'black' ? next.black_count - next.white_count : next.white_count - next.black_count);
      if (diff >= 8) pools.push('youLead');
      else if (diff <= -8) pools.push('iLead');
      else if (Math.abs(diff) <= 2 && next.ply >= 20) pools.push('close');
    }
    const pool = pools[Math.min(pools.length - 1, Math.floor(this.rng() * pools.length))];
    return this.say(pool, mine === 'human' ? 'happy' : 'idle');
  }

  /** A forced pass was announced. */
  passed(humanPassed: boolean): Line {
    return this.say(humanPassed ? 'passHuman' : 'passComputer', 'happy');
  }

  hint(): Line {
    return this.say('hint', 'happy');
  }

  undo(): Line {
    return this.say('undo', 'happy');
  }

  /** The words at the end of a game (the snapshot's status must be "over"). */
  end(snap: Snapshot): Line {
    if (snap.mode.kind === 'two_players') return this.say('endTwo', 'happy');
    const status = snap.status;
    if (status.state !== 'over' || status.winner === null) return this.say('draw', 'happy');
    if (status.resigned && status.winner !== snap.mode.human) return this.say('resigned', 'idle');
    return this.say(status.winner === snap.mode.human ? 'youWin' : 'iWin', 'happy');
  }

  // ------------------------------------------------------------------ the review

  /** Words on the first screen of the review, depending on how many moves matched his. */
  reviewIntro(summary: { judged: number; hitRate: number | null } | null): Line {
    if (!summary || summary.judged === 0 || summary.hitRate === null) return this.say('reviewEmpty', 'idle');
    const pool: PoolName = summary.hitRate >= 0.75 ? 'reviewGreat' : summary.hitRate >= 0.45 ? 'reviewGood' : 'reviewKind';
    return this.say(pool, 'happy');
  }

  reviewStart(): Line {
    return this.say('reviewStart', 'happy');
  }

  /** His verdict on one of your moves. */
  reviewMove(verdict: 'best' | 'good' | 'miss' | 'forced'): Line {
    switch (verdict) {
      case 'best':
        return this.say('reviewBest', 'happy');
      case 'good':
        return this.say('reviewGoodMove', 'happy');
      case 'miss':
        return this.say('reviewMiss', 'idle');
      default:
        return this.say('reviewForced', 'idle');
    }
  }

  /** An occasional word on a move of his own or a pass in the review (null when he is quiet). */
  reviewOther(kind: 'mine' | 'pass'): Line | null {
    return this.chance() ? this.say(kind === 'mine' ? 'reviewMine' : 'reviewPass', 'idle') : null;
  }
}

/** What is on screen: a line, and the ply of the game it was said at. */
export interface Shown {
  line: Line;
  ply: number;
}

export const SILENT: Line = { say: '', mood: 'idle' };

/**
 * Decide what he shows after a game event. `candidate` is the line the dealer came up with (or null).
 * An ordinary candidate only replaces the current line once `hold` plies have passed (or if the
 * current line is empty or a "thinking" line); a special one always does; with no candidate the
 * current line stays, except that a stale "thinking" line is cleared when `clearTransient` is set.
 */
export function settle(shown: Shown, candidate: Line | null, ply: number, clearTransient = false, hold = DEFAULT_HOLD_PLIES): Shown {
  if (!candidate) return clearTransient && shown.line.transient ? { line: SILENT, ply } : shown;
  const held = ply - shown.ply < hold && ply >= shown.ply && !shown.line.transient && shown.line.say !== '';
  return candidate.special || !held ? { line: candidate, ply } : shown;
}

/** The one dealer the app talks through. */
export const dealer = new Dealer();
