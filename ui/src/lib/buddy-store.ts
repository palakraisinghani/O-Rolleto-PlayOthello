// Where your skill trajectory is kept: the phone web view's localStorage, on this device only.
// The website keeps it in memory for the session only (see App.svelte), so nothing is stored in visitors' browsers.

import { NEW_PROFILE, type GameRecord, type Profile } from './engine/buddy.ts';

const KEY = 'othello-player.buddy';

/** Set by vite: true in the GitHub Pages build, where nothing is kept after the session (no storage at all). */
declare const __SESSION_ONLY__: boolean;

const num = (x: unknown, lo: number, hi: number, fallback: number) =>
  typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : fallback;

export function loadProfile(): Profile {
  if (__SESSION_ONLY__) return { ...NEW_PROFILE, games: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return { ...NEW_PROFILE, games: [] };
    const games: GameRecord[] = Array.isArray(raw.games)
      ? raw.games
          .filter((g: GameRecord) => g && typeof g.time === 'number' && typeof g.skill === 'number')
          .map((g: GameRecord) => ({
            time: g.time,
            skill: num(g.skill, 0, 1, 0.5),
            sd: num(g.sd, 0, 1, 0.2),
            moves: num(g.moves, 0, 200, 0),
            opponent: String(g.opponent ?? ''),
            result: g.result === 'win' || g.result === 'loss' ? g.result : 'draw',
            level: num(g.level, 0, 1, 0.5)
          }))
      : [];
    return { level: num(raw.level, 0, 1, 0.5), variance: num(raw.variance, 1e-6, 1, 0.1), games };
  } catch {
    return { ...NEW_PROFILE, games: [] };
  }
}

export function saveProfile(p: Profile): void {
  if (__SESSION_ONLY__) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage blocked (private mode): the trajectory just will not persist */
  }
}

export function clearProfile(): void {
  if (__SESSION_ONLY__) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
