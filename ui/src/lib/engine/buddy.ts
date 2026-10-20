// Buddy: learns how well you play and plays a little better than you.
//
// Skill is a number in [0, 1] tied to Oroletto's move temperature T (T = 0 plays its best move every time,
// larger T plays more loosely):  skill = 1 - ln(1 + T) / ln(1 + T_MAX).  So 1 is Master, 0 is T_MAX (random-like).
//
// How a game is measured: at every move you chose (forced moves skipped) Oroletto's search gives visit counts
// per legal move. A player of skill s would pick move i with probability ∝ (N_i + α)^(1/T(s)) (smoothed so no
// move is impossible). Your skill is the posterior over s given the moves you really played (flat prior).
//
// How it is tracked over time: a Kalman filter on a random walk. Each game is one noisy measurement (its
// posterior mean and variance); the running estimate moves towards it in proportion to how sure each side is,
// and slowly forgets, so it follows you as you improve. Buddy then plays at skill + BUDDY_EDGE: slightly
// stronger than you.

export const T_MAX = 8;
/** How much stronger than you Buddy plays (in skill units, 0..1). */
export const BUDDY_EDGE = 0.06;
/** Pseudo-visits added to every move before applying the temperature, so unvisited moves are merely unlikely. */
const ALPHA = 0.5;
/** Chance mass spread over all legal moves, so one odd move cannot sink a whole estimate. */
const EPS = 0.02;
/** Resolution of the skill grid used for the posterior. */
const GRID = 101;

const LN = Math.log(1 + T_MAX);
export const skillFromT = (t: number): number => 1 - Math.log(1 + Math.max(0, t)) / LN;
export const tFromSkill = (s: number): number => Math.max(0, Math.exp((1 - Math.min(1, Math.max(0, s))) * LN) - 1);

/** One move you played: Oroletto's visit counts for each legal move, and which one you chose. */
export interface MoveSample {
  visits: number[];
  chosen: number;
  /** How much this move counts (default 1). */
  weight?: number;
}

/** Probability that a player of temperature `t` picks each move, given the visit counts. */
export function moveProbabilities(visits: number[], t: number, eps = EPS): number[] {
  const n = visits.length;
  let p: number[];
  if (t < 1e-3) {
    const top = Math.max(...visits);
    const ties = visits.filter((v) => v === top).length;
    p = visits.map((v) => (v === top ? 1 / ties : 0));
  } else {
    const w = visits.map((v) => Math.pow(v + ALPHA, 1 / t));
    const sum = w.reduce((a, b) => a + b, 0);
    p = w.map((x) => x / sum);
  }
  return p.map((x) => (1 - eps) * x + eps / n);
}

/** Choose a move index as a player of temperature `t` would (the same model the estimate assumes). */
export function sampleMove(visits: number[], t: number, rng: { below(n: number): number }): number {
  const p = moveProbabilities(visits, t, 0);
  let x = rng.below(1_000_000) / 1_000_000;
  for (let i = 0; i < p.length; i++) {
    x -= p[i];
    if (x < 0) return i;
  }
  return p.length - 1;
}

export interface SkillEstimate {
  /** Posterior mean skill, 0..1. */
  skill: number;
  /** Posterior standard deviation. */
  sd: number;
  /** Number of moves it is based on. */
  moves: number;
}

/** Posterior over skill given the moves played in a game. */
export function estimateSkill(samples: MoveSample[]): SkillEstimate | null {
  const used = samples.filter((s) => s.visits.length > 1);
  if (used.length === 0) return null;
  const logLik = new Array<number>(GRID).fill(0);
  for (let g = 0; g < GRID; g++) {
    const t = tFromSkill(g / (GRID - 1));
    for (const s of used) logLik[g] += (s.weight ?? 1) * Math.log(moveProbabilities(s.visits, t)[s.chosen]);
  }
  const max = Math.max(...logLik);
  const post = logLik.map((l) => Math.exp(l - max));
  const total = post.reduce((a, b) => a + b, 0);
  let mean = 0;
  for (let g = 0; g < GRID; g++) mean += (post[g] / total) * (g / (GRID - 1));
  let variance = 0;
  for (let g = 0; g < GRID; g++) variance += (post[g] / total) * (g / (GRID - 1) - mean) ** 2;
  return { skill: mean, sd: Math.sqrt(variance), moves: used.length };
}

// ------------------------------------------------------------------ trajectory

export interface GameRecord {
  /** Epoch milliseconds. */
  time: number;
  /** This game's own estimate. */
  skill: number;
  sd: number;
  moves: number;
  /** What you played against: "buddy" or "level 1".."level 4". */
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  /** The running estimate right after this game. */
  level: number;
}

export interface Profile {
  /** Running skill estimate and its variance. */
  level: number;
  variance: number;
  games: GameRecord[];
}

/** Before any game: medium skill, quite unsure. */
export const NEW_PROFILE: Profile = { level: 0.5, variance: 0.04, games: [] };
/** How much your true level may drift between games (variance added per game). Small: skill changes slowly. */
const DRIFT = 0.0008;
/** Game-to-game noise on top of a game's own measurement error: one game is a poor sample of how you play
 *  (a lucky or off day, an unusual opponent). Together with DRIFT this settles a game's pull at roughly
 *  15% of the gap once the estimate is established, and about 60% for the very first game. */
const GAME_NOISE = 0.02;
const MAX_GAMES = 300;

export function updateProfile(p: Profile, game: SkillEstimate, meta: Pick<GameRecord, 'time' | 'opponent' | 'result'>): Profile {
  const predicted = p.variance + DRIFT;
  const r = game.sd ** 2 + GAME_NOISE;
  const gain = predicted / (predicted + r);
  const level = Math.min(1, Math.max(0, p.level + gain * (game.skill - p.level)));
  const variance = (1 - gain) * predicted;
  const record: GameRecord = { ...meta, skill: game.skill, sd: game.sd, moves: game.moves, level };
  return { level, variance, games: [...p.games, record].slice(-MAX_GAMES) };
}

/** The skill Buddy plays at: a little above yours (capped at 1). */
export const buddySkill = (p: Profile): number => Math.min(1, p.level + BUDDY_EDGE);
/** The move temperature Buddy plays with. */
export const buddyTemperature = (p: Profile): number => tFromSkill(buddySkill(p));

/** A profile that starts at a level you already know (e.g. carried over from an earlier session). */
export function profileAtLevel(level: number): Profile {
  const l = Math.min(1, Math.max(0, level));
  return { level: l, variance: 0.015, games: [] };
}

/** Read a level typed by a person: "0.62", "0,62" or "62%". Null if it is not a number from 0 to 1. */
export function parseLevel(text: string): number | null {
  const t = text.trim().replace(',', '.');
  const pct = t.endsWith('%');
  const n = Number(pct ? t.slice(0, -1) : t);
  if (t === '' || !Number.isFinite(n)) return null;
  const v = pct ? n / 100 : n;
  return v >= 0 && v <= 1 ? v : null;
}

/** A short name for a skill level. */
export function skillName(s: number): string {
  return s >= 0.85 ? 'Master' : s >= 0.65 ? 'Strong' : s >= 0.4 ? 'Steady' : s >= 0.2 ? 'Learning' : 'Beginner';
}
