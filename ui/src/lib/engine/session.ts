// The game session for the web build: a TypeScript port of the Rust `othello-api` Session, so the same
// UI runs unchanged in the browser. Same rules of the road:
//  - forced passes are played automatically and announced with a `passed` event;
//  - every change of game bumps a generation counter, so a computer move that finishes after an
//    undo, new game or resignation is discarded;
//  - undo rolls back to just before your latest placement (vs the computer: the latest one made on
//    your turn), taking automatic passes with it.

import type { ApiError, Awaiting, GameEvent, Mode, Side as ApiSide, Snapshot, Status } from '../api.ts';
import { Rng, chooseMove, type SearchControl } from './ai.ts';
import { chooseBuddy } from './buddy-analysis.ts';
import { chooseOroletto, type Evaluator, type Levels } from './oroletto.ts';
import { PASS, Position, bitsToSquares, moveName, opponent, type Side } from './position.ts';

interface Entry {
  position: Position;
  /** The move that led here and the discs it flipped; null for the start. */
  last: { move: number; flipped: bigint } | null;
}

interface Active {
  history: Entry[];
  /** Resolved: `human` is never 'random'. */
  mode: Mode;
  human: Side | null;
  resigned: Side | null;
}

export interface SessionOptions {
  seed?: number;
  /** The computer waits at least this long before moving, so you see your own move first. */
  minThinkMs?: number;
  /** Time budget of the strongest level. */
  level4BudgetMs?: number;
  /** Oroletto, once loaded (the promise may fail: the classic bots then play instead). */
  oroletto?: Promise<{ evaluator: Evaluator; levels: Levels }>;
}

const fail = (error: ApiError): never => {
  throw error;
};
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class WebSession {
  private active: Active | null = null;
  private generation = 0;
  private readonly listeners = new Set<(event: GameEvent) => void>();
  private readonly rng: Rng;
  private readonly minThinkMs: number;
  private readonly level4BudgetMs: number;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private loading: Promise<void> | undefined;
  private oroletto: { evaluator: Evaluator; levels: Levels } | null = null;

  constructor(options: SessionOptions = {}) {
    this.rng = new Rng(options.seed ?? Date.now());
    this.minThinkMs = options.minThinkMs ?? 650;
    this.level4BudgetMs = options.level4BudgetMs ?? 900;
    // If the model fails to load the bots play instead.
    this.loading = options.oroletto?.then(
      (o) => void (this.oroletto = o),
      () => void (this.oroletto = null)
    );
  }

  /** Oroletto's move if the model is loaded, else the classic bot of that level. */
  private async pickMove(position: Position, level: number, ctl: SearchControl, temperature?: number, buddyTemperature?: number): Promise<number | null> {
    await this.loading; // the first move waits for the model rather than falling back
    if (this.oroletto && buddyTemperature !== undefined) {
      return chooseBuddy(position, buddyTemperature, this.oroletto.evaluator, new Rng(this.rng.nextU64()), {
        cancelled: ctl.cancelled,
        progress: async (f) => {
          ctl.progress(f);
          await sleep(0);
        }
      });
    }
    if (buddyTemperature !== undefined) level = 3; // no model: a middling classic bot stands in for Buddy
    if (this.oroletto) {
      const { evaluator, levels } = this.oroletto;
      return chooseOroletto(position, level, evaluator, levels, new Rng(this.rng.nextU64()), {
        cancelled: ctl.cancelled,
        temperature,
        // Yield to the page between batches of simulations so it keeps animating.
        progress: async (f) => {
          ctl.progress(f);
          await sleep(0);
        }
      });
    }
    return chooseMove(position, temperature === 0 ? 4 : level, new Rng(this.rng.nextU64()), ctl, Math.min(this.level4BudgetMs, temperature === 0 ? 450 : this.level4BudgetMs));
  }

  /** Subscribe to events. Returns the function that unsubscribes. */
  onEvent(handler: (event: GameEvent) => void): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private emit(events: GameEvent[]) {
    for (const e of events) this.listeners.forEach((h) => h(e));
  }

  // ------------------------------------------------------------------ commands

  newGame(mode: Mode, position: Position = Position.initial()): Snapshot {
    if (mode.kind === 'vs_computer' && !(Number.isInteger(mode.difficulty) && mode.difficulty >= 1 && mode.difficulty <= 4)) {
      fail({ code: 'invalid_difficulty', given: mode.difficulty });
    }
    if (mode.kind === 'vs_buddy' && !this.loading) fail({ code: 'buddy_unavailable' }); // Buddy needs Oroletto
    this.cancelSearch();
    let resolved: Mode = mode;
    let human: Side | null = null;
    if (mode.kind === 'vs_computer' || mode.kind === 'vs_buddy') {
      human = mode.human === 'random' ? (this.rng.below(2) === 0 ? 'black' : 'white') : mode.human;
      resolved = mode.kind === 'vs_computer' ? { kind: 'vs_computer', difficulty: mode.difficulty, human } : { kind: 'vs_buddy', temperature: mode.temperature, human };
    }
    this.active = { history: [{ position, last: null }], mode: resolved, human, resigned: null };
    const events = this.advance();
    const snapshot = this.buildSnapshot();
    this.emit(events);
    return snapshot;
  }

  /** A placement by the human (or, in two-player mode, the side to move). Passes are automatic. */
  play(square: number): Snapshot {
    const a = this.need();
    if (this.isOver(a)) fail({ code: 'game_over' });
    if (this.awaiting(a) !== 'human') fail({ code: 'not_your_turn' });
    if (!Number.isInteger(square) || square < 0 || square >= PASS) fail({ code: 'illegal_move', square });
    const position = this.current(a);
    try {
      const played = position.play(square);
      a.history.push({ position: played.position, last: { move: square, flipped: played.flipped } });
    } catch {
      fail({ code: 'illegal_move', square });
    }
    const events = this.advance();
    const snapshot = this.buildSnapshot();
    this.emit(events);
    return snapshot;
  }

  undo(): Snapshot {
    const a = this.need();
    const target = this.undoTarget(a);
    if (target === null) fail({ code: 'nothing_to_undo' });
    this.cancelSearch();
    a.history.length = (target as number) + 1;
    a.resigned = null;
    const events = this.advance();
    const snapshot = this.buildSnapshot();
    this.emit(events);
    return snapshot;
  }

  resign(): Snapshot {
    const a = this.need();
    if (this.isOver(a)) fail({ code: 'game_over' });
    a.resigned = a.human ?? this.current(a).toMove;
    this.cancelSearch();
    const events = this.advance();
    const snapshot = this.buildSnapshot();
    this.emit(events);
    return snapshot;
  }

  /** A suggested square for the human (vs computer, on their turn). */
  async hint(): Promise<number> {
    const a = this.need();
    if (a.mode.kind !== 'vs_computer' || this.awaiting(a) !== 'human') fail({ code: 'hint_unavailable' });
    const position = this.current(a);
    const ctl: SearchControl = { cancelled: () => false, progress: () => {} };
    const move = await this.pickMove(position, 4, ctl, 0);
    if (move === null || move === PASS) fail({ code: 'hint_unavailable' });
    return move as number;
  }

  snapshot(): Snapshot {
    return this.buildSnapshot();
  }

  // ------------------------------------------------------------------ internals

  private need(): Active {
    return this.active ?? fail({ code: 'no_game' });
  }

  private current(a: Active): Position {
    return a.history[a.history.length - 1].position;
  }

  private isOver(a: Active): boolean {
    return a.resigned !== null || this.current(a).isTerminal();
  }

  private status(a: Active): Status {
    if (a.resigned) return { state: 'over', winner: opponent(a.resigned), resigned: true };
    const outcome = this.current(a).outcome();
    if (outcome === null) return { state: 'playing' };
    return { state: 'over', winner: outcome === 'draw' ? null : outcome, resigned: false };
  }

  private awaiting(a: Active): Awaiting {
    if (this.isOver(a)) return 'nobody';
    return a.human !== null && a.human !== this.current(a).toMove ? 'computer' : 'human';
  }

  /** The ply to roll back to: just before the user's latest placement. Passes are never a target. */
  private undoTarget(a: Active): number | null {
    for (let k = a.history.length - 2; k >= 0; k--) {
      const placement = a.history[k + 1].last !== null && a.history[k + 1].last!.move !== PASS;
      const mover = a.history[k].position.toMove;
      if (placement && (a.human === null || mover === a.human)) return k;
    }
    return null;
  }

  private cancelSearch() {
    this.generation++;
    this.stopTicker();
  }

  private stopTicker() {
    if (this.ticker !== null) clearInterval(this.ticker);
    this.ticker = null;
  }

  private buildSnapshot(): Snapshot {
    const a = this.need();
    const pos = this.current(a);
    const { black, white } = pos.counts();
    const board = Array.from({ length: 64 }, (_, i) => {
      const bit = 1n << BigInt(i);
      return pos.black & bit ? 1 : pos.white & bit ? 2 : 0;
    });
    let lastMove: number | null = null;
    let flips = 0n;
    for (let i = a.history.length - 1; i >= 1; i--) {
      const last = a.history[i].last;
      if (last && last.move !== PASS) {
        lastMove = last.move;
        flips = last.flipped;
        break;
      }
    }
    const awaiting = this.awaiting(a);
    return {
      board,
      to_move: pos.toMove as ApiSide,
      awaiting,
      legal: awaiting === 'human' ? pos.legalMoves().filter((m) => m !== PASS) : [],
      last_move: lastMove,
      flipped: bitsToSquares(flips),
      black_count: black,
      white_count: white,
      status: this.status(a),
      mode: a.mode,
      can_undo: this.undoTarget(a) !== null,
      ply: a.history.length - 1,
      history: a.history.slice(1).map((e) => moveName(e.last!.move))
    };
  }

  /** Settle the game after any change: play forced passes, report the state, start the computer if due. */
  private advance(): GameEvent[] {
    const a = this.active;
    const events: GameEvent[] = [];
    if (!a) return events;
    while (!this.isOver(a)) {
      const pos = this.current(a);
      const moves = pos.legalMoves();
      if (moves.length !== 1 || moves[0] !== PASS) break;
      a.history.push({ position: pos.play(PASS).position, last: { move: PASS, flipped: 0n } });
      events.push({ type: 'passed', side: pos.toMove as ApiSide });
    }
    events.push({ type: 'state_changed', snapshot: this.buildSnapshot() });
    const status = this.status(a);
    if (status.state === 'over') {
      const { black, white } = this.current(a).counts();
      events.push({ type: 'game_over', winner: status.winner, resigned: status.resigned, black, white });
    } else if (this.awaiting(a) === 'computer' && a.mode.kind === 'vs_computer') {
      this.startSearch(this.current(a), a.mode.difficulty);
    } else if (this.awaiting(a) === 'computer' && a.mode.kind === 'vs_buddy') {
      this.startSearch(this.current(a), 4, a.mode.temperature);
    }
    return events;
  }

  private startSearch(position: Position, level: number, buddyTemperature?: number) {
    this.cancelSearch();
    const generation = this.generation;
    const started = Date.now();
    const alive = () => generation === this.generation;
    // The indicator creeps up while the computer "thinks", even for instant bots.
    this.ticker = setInterval(() => {
      if (!alive()) return;
      this.emit([{ type: 'thinking', progress: Math.min(0.9, (Date.now() - started) / this.minThinkMs) }]);
    }, 90);
    const ctl: SearchControl = { cancelled: () => !alive(), progress: () => {} };
    this.pickMove(position, level, ctl, undefined, buddyTemperature)
      .then(async (move) => {
        if (move === null || !alive()) return;
        const wait = this.minThinkMs - (Date.now() - started);
        if (wait > 0) await sleep(wait);
        if (!alive()) return;
        const a = this.active;
        if (!a) return;
        this.stopTicker();
        try {
          const played = this.current(a).play(move);
          a.history.push({ position: played.position, last: { move, flipped: played.flipped } });
        } catch {
          return; // an engine bug must not corrupt the game
        }
        this.emit(this.advance());
      })
      .catch(() => this.stopTicker());
  }
}
