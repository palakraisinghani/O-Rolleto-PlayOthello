//! Simple bots, and the `Player` trait every move-chooser implements
//! (bots now; Oroletto and remote players later).
//!
//! These are not difficulty levels (those are all Oroletto); they are test
//! baselines and stand-ins while the app is built.

use crate::position::{Move, Position};

/// Anything that can choose a move: a bot, the AI, later a remote player.
pub trait Player {
    /// Choose a legal move for the side to move. The position must not be terminal.
    fn choose_move(&mut self, position: &Position) -> Move;
}

/// Small seedable generator (splitmix64), so runs are reproducible without a dependency.
#[derive(Clone, Debug)]
pub struct Rng(u64);

impl Rng {
    pub fn new(seed: u64) -> Rng {
        Rng(seed)
    }

    pub fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    /// Uniform in `0..n` (`n > 0`).
    pub fn below(&mut self, n: usize) -> usize {
        ((u128::from(self.next_u64()) * n as u128) >> 64) as usize
    }

    pub fn choose<'a, T>(&mut self, items: &'a [T]) -> &'a T {
        &items[self.below(items.len())]
    }
}

/// Plays a uniformly random legal move.
#[derive(Clone, Debug)]
pub struct RandomPlayer {
    rng: Rng,
}

impl RandomPlayer {
    pub fn new(seed: u64) -> RandomPlayer {
        RandomPlayer { rng: Rng::new(seed) }
    }
}

impl Player for RandomPlayer {
    fn choose_move(&mut self, position: &Position) -> Move {
        *self.rng.choose(&position.legal_moves())
    }
}

/// Plays the move that leaves the best disc difference (one ply), choosing
/// uniformly among ties. Matches OthelloRL's heuristic bot with only the disc weight.
#[derive(Clone, Debug)]
pub struct GreedyPlayer {
    rng: Rng,
}

impl GreedyPlayer {
    pub fn new(seed: u64) -> GreedyPlayer {
        GreedyPlayer { rng: Rng::new(seed) }
    }

    /// Every move tied for the best value (exposed so tests can be deterministic).
    pub fn best_moves(position: &Position) -> Vec<Move> {
        let legal = position.legal_moves();
        let me = position.to_move();
        let value = |mv: Move| {
            let next = position.play(mv).expect("legal move").position;
            let (b, w) = next.counts();
            let diff = if me == crate::Color::Black { i64::from(b) - i64::from(w) } else { i64::from(w) - i64::from(b) };
            // A finished game is worth far more than any disc margin (as in OthelloRL).
            match next.is_terminal() {
                true if diff > 0 => 1_000_000 + diff,
                true if diff < 0 => -1_000_000 + diff,
                _ => diff,
            }
        };
        let values: Vec<i64> = legal.iter().map(|&m| value(m)).collect();
        let top = values.iter().copied().max().expect("at least one legal move");
        legal.into_iter().zip(values).filter(|&(_, v)| v == top).map(|(m, _)| m).collect()
    }
}

impl Player for GreedyPlayer {
    fn choose_move(&mut self, position: &Position) -> Move {
        *self.rng.choose(&GreedyPlayer::best_moves(position))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Game;

    fn play_out(black: &mut dyn Player, white: &mut dyn Player) -> Game {
        let mut game = Game::new();
        while !game.position().is_terminal() {
            let p: &mut dyn Player = if game.position().to_move() == crate::Color::Black { black } else { white };
            let mv = p.choose_move(game.position());
            game.play(mv).expect("bot played an illegal move");
        }
        game
    }

    #[test]
    fn bots_never_play_illegal_moves() {
        for seed in 0..50 {
            play_out(&mut RandomPlayer::new(seed), &mut GreedyPlayer::new(seed + 1000));
            play_out(&mut GreedyPlayer::new(seed), &mut RandomPlayer::new(seed + 1000));
        }
    }

    #[test]
    fn same_seed_same_game() {
        let moves = |seed| play_out(&mut RandomPlayer::new(seed), &mut RandomPlayer::new(seed + 1)).moves().collect::<Vec<_>>();
        assert_eq!(moves(7), moves(7));
        assert_ne!(moves(7), moves(8));
    }

    #[test]
    fn greedy_takes_the_biggest_capture() {
        // Black has several captures of different sizes; greedy must pick one that leaves
        // black with the most discs.
        let bit = |r: usize, c: usize| 1u64 << (r * 8 + c);
        let black = bit(0, 2) | bit(0, 4) | bit(3, 3);
        let white = bit(0, 1) | bit(2, 1) | bit(1, 2);
        let p = Position::from_parts(black, white, crate::Color::Black, 0).unwrap();
        assert!(p.legal_moves().len() > 1);
        let best = GreedyPlayer::best_moves(&p);
        let played = p.play(best[0]).unwrap();
        for m in p.legal_moves() {
            assert!(played.position.counts().0 >= p.play(m).unwrap().position.counts().0);
        }
    }

    #[test]
    fn greedy_beats_random_more_often_than_not() {
        // OthelloRL's own greedy bot wins ~58% against random on 8x8: a weak bot, as the
        // SPEC says. Seeds are fixed, so this is deterministic; the bound leaves margin.
        let as_black = (0..200)
            .filter(|&s| {
                let g = play_out(&mut GreedyPlayer::new(s), &mut RandomPlayer::new(s + 500));
                g.position().outcome() == Some(crate::Outcome::Winner(crate::Color::Black))
            })
            .count();
        let as_white = (0..200)
            .filter(|&s| {
                let g = play_out(&mut RandomPlayer::new(s + 500), &mut GreedyPlayer::new(s));
                g.position().outcome() == Some(crate::Outcome::Winner(crate::Color::White))
            })
            .count();
        assert!(as_black + as_white >= 210, "greedy won only {}/400 against random", as_black + as_white);
    }

    #[test]
    fn rng_below_stays_in_range() {
        let mut r = Rng::new(1);
        let mut seen = [false; 5];
        for _ in 0..200 {
            seen[r.below(5)] = true;
        }
        assert!(seen.iter().all(|&s| s));
    }
}
