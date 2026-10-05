//! Data that crosses the UI boundary. Everything here is serde-serialisable and uses
//! plain numbers and snake_case strings, so the TypeScript side can mirror it directly.
//!
//! Squares are indices 0..=63 (`a1` = 0, `h8` = 63; see `othello-core`).

use othello_core::Color;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Side {
    Black,
    White,
}

impl From<Color> for Side {
    fn from(c: Color) -> Side {
        match c {
            Color::Black => Side::Black,
            Color::White => Side::White,
        }
    }
}

impl From<Side> for Color {
    fn from(s: Side) -> Color {
        match s {
            Side::Black => Color::Black,
            Side::White => Color::White,
        }
    }
}

/// Which colour the human takes against the computer.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HumanSide {
    Black,
    White,
    Random,
}

/// How a game is played. A snapshot always reports a *resolved* mode (`human` is never `random`).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Mode {
    /// `difficulty` is 1 (easiest) to 4 (hardest).
    VsComputer { difficulty: u8, human: HumanSide },
    TwoPlayers {
        #[serde(default)]
        black_name: Option<String>,
        #[serde(default)]
        white_name: Option<String>,
    },
}

/// Who must act next.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Awaiting {
    Human,
    Computer,
    Nobody,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum Status {
    Playing,
    /// `winner: None` is a draw.
    Over { winner: Option<Side>, resigned: bool },
}

/// Everything the UI needs to draw the game. The UI never computes rules; it renders this.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Snapshot {
    /// 64 cells, row-major from a1: 0 empty, 1 black, 2 white.
    pub board: Vec<u8>,
    pub to_move: Side,
    pub awaiting: Awaiting,
    /// Squares the human may play now (empty unless `awaiting` is `human`).
    pub legal: Vec<u8>,
    /// The latest disc placed (passes are skipped), for the last-move highlight.
    pub last_move: Option<u8>,
    /// Squares flipped by that placement, for the flip animation.
    pub flipped: Vec<u8>,
    pub black_count: u32,
    pub white_count: u32,
    pub status: Status,
    pub mode: Mode,
    pub can_undo: bool,
    /// Moves played so far, including passes.
    pub ply: usize,
    /// Move names for a history panel: "d3", ..., or "pass".
    pub history: Vec<String>,
}

/// Pushed from the engine to the UI.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Event {
    /// The game changed (a move, an undo, a new game, a resignation).
    StateChanged { snapshot: Snapshot },
    /// A side had no legal move and was passed automatically. Sent before the
    /// `state_changed` that follows, so the UI can show the pass banner.
    Passed { side: Side },
    /// The computer is searching. `progress` is 0..=1.
    Thinking { progress: f32 },
    GameOver { winner: Option<Side>, resigned: bool, black: u32, white: u32 },
}

/// Why a command was refused. Serialises as `{"code": "...", ...}`.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "code", rename_all = "snake_case")]
pub enum ApiError {
    NoGame,
    InvalidDifficulty { given: u8 },
    GameOver,
    NotYourTurn,
    IllegalMove { square: u8 },
    NothingToUndo,
    HintUnavailable,
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ApiError::NoGame => write!(f, "no game in progress"),
            ApiError::InvalidDifficulty { given } => write!(f, "difficulty must be 1-4, got {given}"),
            ApiError::GameOver => write!(f, "the game is over"),
            ApiError::NotYourTurn => write!(f, "it is not your turn"),
            ApiError::IllegalMove { square } => write!(f, "square {square} is not a legal move"),
            ApiError::NothingToUndo => write!(f, "nothing to undo"),
            ApiError::HintUnavailable => write!(f, "hints are only available against the computer on your turn"),
        }
    }
}

impl std::error::Error for ApiError {}
