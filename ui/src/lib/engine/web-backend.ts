// The browser backend: the same commands the Tauri shell exposes, served by the TypeScript engine,
// with settings kept in localStorage. Used when the page runs outside the desktop app.

import type { GameEvent, Mode, Settings, Snapshot } from '../api.ts';
import { WebSession } from './session.ts';

const SETTINGS_KEY = 'othello-player.settings';

export const DEFAULT_SETTINGS: Settings = {
  show_legal_moves: true,
  animations: true,
  sound: true,
  default_difficulty: 2,
  default_human_side: 'black'
};

/** Read saved settings; anything missing or malformed falls back to the default. */
export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    const s = { ...DEFAULT_SETTINGS };
    if (typeof raw.show_legal_moves === 'boolean') s.show_legal_moves = raw.show_legal_moves;
    if (typeof raw.animations === 'boolean') s.animations = raw.animations;
    if (typeof raw.sound === 'boolean') s.sound = raw.sound;
    if (Number.isInteger(raw.default_difficulty) && raw.default_difficulty >= 1 && raw.default_difficulty <= 4) {
      s.default_difficulty = raw.default_difficulty;
    }
    if (['black', 'white', 'random'].includes(raw.default_human_side)) s.default_human_side = raw.default_human_side;
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function createWebBackend() {
  const session = new WebSession();
  return {
    newGame: async (mode: Mode): Promise<Snapshot> => session.newGame(mode),
    play: async (square: number): Promise<Snapshot> => session.play(square),
    undo: async (): Promise<Snapshot> => session.undo(),
    resign: async (): Promise<Snapshot> => session.resign(),
    snapshot: async (): Promise<Snapshot> => session.snapshot(),
    hint: (): Promise<number> => session.hint(),
    getSettings: async (): Promise<Settings> => loadSettings(),
    setSettings: async (settings: Settings): Promise<void> => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        /* private mode or storage blocked: settings just won't persist */
      }
    },
    onEvent: (handler: (event: GameEvent) => void): (() => void) => session.onEvent(handler)
  };
}
