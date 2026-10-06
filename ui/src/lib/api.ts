// Typed mirror of the `othello-api` crate (see SPEC §4.3). The UI never computes rules:
// it sends these commands and renders the snapshots and events it receives.
//
// Two backends serve the same commands: inside the desktop app they go to the Rust engine through
// Tauri; in a plain browser (the single-file web build) they go to the TypeScript engine in ./engine.
//
// Squares are indices 0..63 (a1 = 0, h8 = 63). Board cells: 0 empty, 1 black, 2 white.

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { createWebBackend } from './engine/web-backend.ts';

export type Side = 'black' | 'white';
export type HumanSide = Side | 'random';

export type Mode =
  | { kind: 'vs_computer'; difficulty: number; human: HumanSide }
  | { kind: 'two_players'; black_name?: string | null; white_name?: string | null };

export type Awaiting = 'human' | 'computer' | 'nobody';

export type Status =
  | { state: 'playing' }
  | { state: 'over'; winner: Side | null; resigned: boolean };

export interface Snapshot {
  board: number[];
  to_move: Side;
  awaiting: Awaiting;
  legal: number[];
  last_move: number | null;
  flipped: number[];
  black_count: number;
  white_count: number;
  status: Status;
  mode: Mode;
  can_undo: boolean;
  ply: number;
  history: string[];
}

export type GameEvent =
  | { type: 'state_changed'; snapshot: Snapshot }
  | { type: 'passed'; side: Side }
  | { type: 'thinking'; progress: number }
  | { type: 'game_over'; winner: Side | null; resigned: boolean; black: number; white: number };

export interface Settings {
  show_legal_moves: boolean;
  animations: boolean;
  sound: boolean;
  default_difficulty: number;
  default_human_side: HumanSide;
}

export type ApiError =
  | { code: 'no_game' }
  | { code: 'invalid_difficulty'; given: number }
  | { code: 'game_over' }
  | { code: 'not_your_turn' }
  | { code: 'illegal_move'; square: number }
  | { code: 'nothing_to_undo' }
  | { code: 'hint_unavailable' };

/** True inside the Tauri desktop app. */
const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const web = inTauri ? null : createWebBackend();

export const newGame = (mode: Mode): Promise<Snapshot> => (web ? web.newGame(mode) : invoke('new_game', { mode }));
export const play = (square: number): Promise<Snapshot> => (web ? web.play(square) : invoke('play', { square }));
export const undo = (): Promise<Snapshot> => (web ? web.undo() : invoke('undo'));
export const resign = (): Promise<Snapshot> => (web ? web.resign() : invoke('resign'));
export const snapshot = (): Promise<Snapshot> => (web ? web.snapshot() : invoke('snapshot'));
export const hint = (): Promise<number> => (web ? web.hint() : invoke('hint'));
export const getSettings = (): Promise<Settings> => (web ? web.getSettings() : invoke('get_settings'));
export const setSettings = (settings: Settings): Promise<void> =>
  web ? web.setSettings(settings) : invoke('set_settings', { settings });

/** Subscribe to engine events. Returns the function that unsubscribes. */
export const onGameEvent = (handler: (event: GameEvent) => void): Promise<UnlistenFn> =>
  web
    ? Promise.resolve(web.onEvent(handler))
    : listen<GameEvent>('game-event', (e) => handler(e.payload));

/** "d3" for square 19; "pass" for 64. */
export const squareName = (square: number): string =>
  square === 64 ? 'pass' : 'abcdefgh'[square % 8] + (Math.floor(square / 8) + 1);
