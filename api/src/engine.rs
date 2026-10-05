//! The computer opponent as the API sees it. Oroletto (M4) will implement `Engine`;
//! until then `standin_engines` supplies the rule-based bots.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;

use othello_core::{GreedyPlayer, Move, Player, Position, RandomPlayer};

/// Lets a long search stop early and report progress.
pub struct SearchControl<'a> {
    cancel: &'a AtomicBool,
    progress: &'a (dyn Fn(f32) + Sync),
}

impl<'a> SearchControl<'a> {
    pub fn new(cancel: &'a AtomicBool, progress: &'a (dyn Fn(f32) + Sync)) -> SearchControl<'a> {
        SearchControl { cancel, progress }
    }

    /// True once the game was undone, restarted or resigned; the search should return `None`.
    pub fn is_cancelled(&self) -> bool {
        self.cancel.load(Ordering::Relaxed)
    }

    /// Report search progress in 0..=1 (drives the "thinking" indicator).
    pub fn report(&self, fraction: f32) {
        (self.progress)(fraction)
    }
}

/// Chooses the computer's move. Runs on a worker thread, never the UI thread.
pub trait Engine: Send {
    /// A legal move for the side to move, or `None` if cancelled.
    fn choose_move(&mut self, position: &Position, control: &SearchControl) -> Option<Move>;
}

/// Builds the engine for a difficulty level (1..=4).
pub type EngineFactory = Arc<dyn Fn(u8) -> Box<dyn Engine> + Send + Sync>;

struct PlayerEngine<P>(P);

impl<P: Player + Send> Engine for PlayerEngine<P> {
    fn choose_move(&mut self, position: &Position, control: &SearchControl) -> Option<Move> {
        if control.is_cancelled() {
            return None;
        }
        control.report(1.0);
        Some(self.0.choose_move(position))
    }
}

/// Placeholder levels until Oroletto is wired in (M4): level 1 random, levels 2-4 greedy.
/// Each engine gets its own seed derived from `seed`.
pub fn standin_engines(seed: u64) -> EngineFactory {
    let counter = AtomicU64::new(0);
    Arc::new(move |level| {
        let s = seed.wrapping_add(counter.fetch_add(1, Ordering::Relaxed));
        match level {
            1 => Box::new(PlayerEngine(RandomPlayer::new(s))),
            _ => Box::new(PlayerEngine(GreedyPlayer::new(s))),
        }
    })
}
