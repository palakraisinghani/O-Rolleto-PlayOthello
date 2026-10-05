//! 8x8 Othello engine on `u64` bitboards.
//!
//! Conventions match OthelloRL exactly (the Oroletto model layout depends on them):
//! square `(row, col)` is bit `row * 8 + col`, `a1` = 0 (top-left), `h8` = 63,
//! and the pass move is index 64. Black moves first.

mod game;
mod position;

pub use game::Game;
pub use position::{
    Color, IllegalMove, Move, Outcome, Played, Position, FULL, NUM_MOVES, NUM_SQUARES, SIZE,
};
