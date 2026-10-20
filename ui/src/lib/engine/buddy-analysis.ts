// Turns a finished game into skill measurements: replay it, and at every move the human chose (forced moves
// skipped) ask Oroletto's search how it would spread its visits over the legal moves.

import { Position, PASS, parseMove, type Side } from './position.ts';
import { search, type Evaluator } from './oroletto.ts';
import type { Rng } from './ai.ts';
import { estimateSkill, sampleMove, type MoveSample, type SkillEstimate } from './buddy.ts';

/** Simulations per analysed position (fewer than in play: it only has to rank the moves). */
export const ANALYSIS_SIMS = 100;
/** Moves played when this few squares remain count half: nearly everything wins there. */
const ENDGAME_EMPTIES = 6;

export interface AnalysisOptions {
  sims?: number;
  onProgress?: (done: number, total: number) => void;
  cancelled?: () => boolean;
}

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const empties = (p: Position) => 64 - p.counts().black - p.counts().white;

/** Measurements for every informative move `human` played in `history` (move names from the standard start). */
export async function sampleGame(history: string[], human: Side, ev: Evaluator, options: AnalysisOptions = {}): Promise<MoveSample[] | null> {
  const sims = options.sims ?? ANALYSIS_SIMS;
  let position = Position.initial();
  const todo: { before: Position; move: number }[] = [];
  for (const name of history) {
    const move = parseMove(name);
    if (move === null) throw new Error(`unreadable move "${name}"`);
    if (position.toMove === human && move !== PASS && position.legalMoves().length > 1) todo.push({ before: position, move });
    position = position.play(move).position;
  }

  const samples: MoveSample[] = [];
  for (const { before, move } of todo) {
    if (options.cancelled?.()) return null;
    const r = await search(before, sims, ev, { cancelled: options.cancelled });
    if (!r) return null;
    samples.push({
      visits: r.visits,
      chosen: r.moves.indexOf(move),
      weight: empties(before) <= ENDGAME_EMPTIES ? 0.5 : 1
    });
    options.onProgress?.(samples.length, todo.length);
    await yieldToBrowser();
  }
  return samples;
}

/** Skill shown by `human` in a finished game; null when too few moves to say anything. */
export async function measureGame(history: string[], human: Side, ev: Evaluator, options: AnalysisOptions = {}): Promise<SkillEstimate | null> {
  const samples = await sampleGame(history, human, ev, options);
  return samples && samples.length >= 5 ? estimateSkill(samples) : null;
}

/** Buddy's move: Oroletto's search, then a choice at Buddy's temperature. Null if cancelled. */
export async function chooseBuddy(
  position: Position,
  temperature: number,
  ev: Evaluator,
  rng: Rng,
  options: { sims?: number; cancelled?: () => boolean; progress?: (fraction: number) => Promise<void> | void } = {}
): Promise<number | null> {
  const legal = position.legalMoves();
  if (legal.length === 0) return null;
  if (legal.length === 1) return legal[0];
  const r = await search(position, options.sims ?? ANALYSIS_SIMS * 2, ev, { cancelled: options.cancelled, progress: options.progress });
  if (!r) return null;
  return r.moves[sampleMove(r.visits, temperature, rng)];
}
