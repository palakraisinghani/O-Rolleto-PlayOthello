//! The command/event API between the UI and the engine.
//!
//! The UI never implements rules. It sends commands to a [`Session`] (`new_game`, `play`,
//! `undo`, `resign`, `hint`) and renders the [`Snapshot`]s and [`Event`]s it gets back.
//! This crate has no UI-toolkit dependency; the Tauri shell is a thin wrapper around it.

mod engine;
mod session;
mod settings;
mod types;

pub use engine::{standin_engines, Engine, EngineFactory, SearchControl};
pub use session::{Session, Sink};
pub use settings::Settings;
pub use types::{ApiError, Awaiting, Event, HumanSide, Mode, Side, Snapshot, Status};
