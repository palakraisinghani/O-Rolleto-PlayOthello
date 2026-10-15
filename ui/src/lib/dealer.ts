// Orolleto, the card-room dealer: what he says and how he looks at each moment of a game.
// Pure functions of the game state (plus a random source, so tests can pin the choice).

import type { Snapshot } from './api.ts';

export type Mood = 'idle' | 'think' | 'happy' | 'sad';
export interface Line {
  say: string;
  mood: Mood;
}

export const DEALER_NAME = 'Orolleto';

type Rng = () => number;
const pick = <T>(items: readonly T[], rng: Rng): T => items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

const CORNERS = [0, 7, 56, 63];

const WELCOME = [
  "Welcome to the table. I'm Orolleto. Place your discs!",
  'Cards are dealt, discs are cut. Your move, friend.',
  'The house is open. Show me what you have.'
];
const WELCOME_TWO = ['Two players, one table. May the best disc win.', 'A friendly hand! I will keep the score.'];
const THINKING = ['Hmm, let me think…', 'Studying the felt…', 'One moment, I am counting discs…', 'Interesting. Very interesting…'];
const COMPUTER_CORNER = ['A corner. The house will take that.', 'Corner secured. House rules.'];
const COMPUTER_BIG = ['Count them: that is a big flip!', 'Turn them over, all of them.'];
const COMPUTER_PLAIN = ['Your turn.', 'The house plays.', 'Your move, friend.', "Let's see you answer that."];
const HUMAN_CORNER = ['A corner! Nicely played.', 'Ooh, you took a corner. I felt that.'];
const HUMAN_BIG = ['Whoa, that is a lot of discs!', 'Careful, you are cleaning me out.'];
const PASS_HUMAN = ['No move for you, so I play again.'];
const PASS_COMPUTER = ['I have to pass! Go again, friend.'];
const WIN = ['You cleaned me out! Take a bow.', 'The house pays out. Well played!'];
const LOSS = ['The house always wins… this time.', 'Better luck next hand, friend.'];
const DRAW = ['A push! Honours even.'];
const REVIEW_BEST = ['Perfect read. That is what I would play.', 'Spot on!'];
const REVIEW_GOOD = ['Solid. A good player sees that.', 'A fine choice.'];
const REVIEW_MISS = ['Ah, that one cost you a little.', 'Hmm, I would have looked elsewhere.'];
const REVIEW_FORCED = ['No choice there, friend.'];

export const welcome = (twoPlayers: boolean, rng: Rng = Math.random): Line => ({
  say: pick(twoPlayers ? WELCOME_TWO : WELCOME, rng),
  mood: 'happy'
});

export const thinking = (rng: Rng = Math.random): Line => ({ say: pick(THINKING, rng), mood: 'think' });

export const passed = (humanPassed: boolean, rng: Rng = Math.random): Line => ({
  say: pick(humanPassed ? PASS_HUMAN : PASS_COMPUTER, rng),
  mood: humanPassed ? 'happy' : 'sad'
});

/** How the dealer reacts when the game moves from `prev` to `next`; null to stay quiet. */
export function reactToMove(prev: Snapshot | null, next: Snapshot, rng: Rng = Math.random): Line | null {
  if (!prev || next.mode.kind !== 'vs_computer' || next.ply <= prev.ply || next.last_move === null) return null;
  if (next.status.state === 'over') return null; // the result has its own line
  const mover = next.board[next.last_move] === 1 ? 'black' : 'white';
  const byHuman = mover === next.mode.human;
  const corner = CORNERS.includes(next.last_move);
  const big = next.flipped.length >= 5;
  if (byHuman) {
    if (corner) return { say: pick(HUMAN_CORNER, rng), mood: 'sad' };
    if (big) return { say: pick(HUMAN_BIG, rng), mood: 'sad' };
    return null;
  }
  if (corner) return { say: pick(COMPUTER_CORNER, rng), mood: 'happy' };
  if (big) return { say: pick(COMPUTER_BIG, rng), mood: 'happy' };
  return rng() < 0.4 ? { say: pick(COMPUTER_PLAIN, rng), mood: 'idle' } : null;
}

/** The dealer's line when a game ends. */
export function reactToEnd(snap: Snapshot, rng: Rng = Math.random): Line {
  if (snap.status.state !== 'over' || snap.status.winner === null) return { say: pick(DRAW, rng), mood: 'idle' };
  if (snap.mode.kind !== 'vs_computer') return { say: pick(WIN, rng), mood: 'happy' };
  return snap.status.winner === snap.mode.human
    ? { say: pick(WIN, rng), mood: 'sad' }
    : { say: pick(LOSS, rng), mood: 'happy' };
}

/** His comment on one reviewed move. */
export function reviewLine(verdict: 'best' | 'good' | 'miss' | 'forced', rng: Rng = Math.random): Line {
  switch (verdict) {
    case 'best':
      return { say: pick(REVIEW_BEST, rng), mood: 'happy' };
    case 'good':
      return { say: pick(REVIEW_GOOD, rng), mood: 'happy' };
    case 'miss':
      return { say: pick(REVIEW_MISS, rng), mood: 'sad' };
    default:
      return { say: pick(REVIEW_FORCED, rng), mood: 'idle' };
  }
}
