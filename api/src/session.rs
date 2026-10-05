//! The game session: owns the game, runs the computer on a worker thread, and pushes
//! events to a sink (in the app, the sink emits Tauri events).
//!
//! Rules of the road:
//! - Forced passes are played automatically (and announced with `Event::Passed`), so the
//!   user only ever chooses between placements.
//! - Events are emitted after the internal lock is released, so a sink may call back in.
//! - Every change of game bumps a generation counter; a computer move that finishes after
//!   an undo, new game or resignation is discarded.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};

use othello_core::{Color, Game, Move, Outcome, Position, Rng};

use crate::engine::{standin_engines, EngineFactory, SearchControl};
use crate::types::{ApiError, Awaiting, Event, HumanSide, Mode, Snapshot, Status};

/// Receives every event the session produces.
pub type Sink = Arc<dyn Fn(Event) + Send + Sync>;

const HINT_LEVEL: u8 = 4;

struct Active {
    game: Game,
    /// Resolved: `human` is never `Random`.
    mode: Mode,
    human: Option<Color>,
    resigned: Option<Color>,
}

impl Active {
    fn is_over(&self) -> bool {
        self.resigned.is_some() || self.game.position().is_terminal()
    }

    fn status(&self) -> Status {
        if let Some(loser) = self.resigned {
            return Status::Over { winner: Some(loser.opponent().into()), resigned: true };
        }
        match self.game.position().outcome() {
            None => Status::Playing,
            Some(Outcome::Draw) => Status::Over { winner: None, resigned: false },
            Some(Outcome::Winner(c)) => Status::Over { winner: Some(c.into()), resigned: false },
        }
    }

    fn awaiting(&self) -> Awaiting {
        if self.is_over() {
            Awaiting::Nobody
        } else if self.human.is_some_and(|h| h != self.game.position().to_move()) {
            Awaiting::Computer
        } else {
            Awaiting::Human
        }
    }

    fn difficulty(&self) -> Option<u8> {
        match self.mode {
            Mode::VsComputer { difficulty, .. } => Some(difficulty),
            Mode::TwoPlayers { .. } => None,
        }
    }

    /// The ply to roll back to: just before the user's latest placement (against the
    /// computer, the latest one made on the human's turn). Passes are never a target.
    fn undo_target(&self) -> Option<usize> {
        (0..self.game.ply()).rev().find(|&k| {
            let mover = self.game.position_at(k).map(Position::to_move);
            let placement = self.game.move_after(k).is_some_and(|m| !m.is_pass());
            placement && self.human.is_none_or(|h| mover == Some(h))
        })
    }

    fn snapshot(&self) -> Snapshot {
        let pos = self.game.position();
        let (black, white) = pos.counts();
        let bit = |i: u64, bits: u64| bits >> i & 1 == 1;
        let board = (0..64).map(|i| if bit(i, pos.black()) { 1 } else if bit(i, pos.white()) { 2 } else { 0 }).collect();
        let (last_move, flips) = match self.game.last_placement() {
            Some((m, f)) => (Some(m.index()), f),
            None => (None, 0),
        };
        let legal = if self.awaiting() == Awaiting::Human {
            pos.legal_moves().iter().filter(|m| !m.is_pass()).map(|m| m.index()).collect()
        } else {
            Vec::new()
        };
        Snapshot {
            board,
            to_move: pos.to_move().into(),
            awaiting: self.awaiting(),
            legal,
            last_move,
            flipped: (0..64u8).filter(|&i| bit(u64::from(i), flips)).collect(),
            black_count: black,
            white_count: white,
            status: self.status(),
            mode: self.mode.clone(),
            can_undo: self.undo_target().is_some(),
            ply: self.game.ply(),
            history: self.game.moves().map(|m| m.name()).collect(),
        }
    }
}

struct Inner {
    active: Option<Active>,
    generation: u64,
    cancel: Option<Arc<AtomicBool>>,
    rng: Rng,
}

impl Inner {
    /// Stop any running search and invalidate its result.
    fn cancel_search(&mut self) {
        self.generation += 1;
        if let Some(flag) = self.cancel.take() {
            flag.store(true, Ordering::Relaxed);
        }
    }

    fn active(&mut self) -> Result<&mut Active, ApiError> {
        self.active.as_mut().ok_or(ApiError::NoGame)
    }
}

/// Cheap to clone; all clones share one game.
#[derive(Clone)]
pub struct Session {
    inner: Arc<Mutex<Inner>>,
    sink: Sink,
    engines: EngineFactory,
}

impl Session {
    /// A session using the placeholder bots and a time-based seed.
    pub fn new(sink: Sink) -> Session {
        let seed = SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_nanos() as u64);
        Session::with_engines(sink, standin_engines(seed), seed)
    }

    pub fn with_engines(sink: Sink, engines: EngineFactory, seed: u64) -> Session {
        let inner = Inner { active: None, generation: 0, cancel: None, rng: Rng::new(seed) };
        Session { inner: Arc::new(Mutex::new(inner)), sink, engines }
    }

    fn lock(&self) -> MutexGuard<'_, Inner> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn emit(&self, events: Vec<Event>) {
        events.into_iter().for_each(|e| (self.sink)(e));
    }

    // ------------------------------------------------------------------ commands

    /// Start a new game, replacing any game in progress.
    pub fn new_game(&self, mode: Mode) -> Result<Snapshot, ApiError> {
        self.start(mode, Position::initial())
    }

    /// Like `new_game` but from a given position (puzzles and tests).
    pub fn new_game_from(&self, mode: Mode, position: Position) -> Result<Snapshot, ApiError> {
        self.start(mode, position)
    }

    fn start(&self, mode: Mode, position: Position) -> Result<Snapshot, ApiError> {
        if let Mode::VsComputer { difficulty, .. } = mode {
            if !(1..=4).contains(&difficulty) {
                return Err(ApiError::InvalidDifficulty { given: difficulty });
            }
        }
        let mut inner = self.lock();
        inner.cancel_search();
        let (mode, human) = match mode {
            Mode::VsComputer { difficulty, human } => {
                let color = match human {
                    HumanSide::Black => Color::Black,
                    HumanSide::White => Color::White,
                    HumanSide::Random if inner.rng.below(2) == 0 => Color::Black,
                    HumanSide::Random => Color::White,
                };
                let resolved = if color == Color::Black { HumanSide::Black } else { HumanSide::White };
                (Mode::VsComputer { difficulty, human: resolved }, Some(color))
            }
            two_players => (two_players, None),
        };
        inner.active = Some(Active { game: Game::from_position(position), mode, human, resigned: None });
        let events = self.advance(&mut inner);
        let snapshot = inner.active()?.snapshot();
        drop(inner);
        self.emit(events);
        Ok(snapshot)
    }

    /// The human (or, in two-player mode, the side to move) plays a placement.
    /// Passes are automatic, so square 64 is not accepted.
    pub fn play(&self, square: u8) -> Result<Snapshot, ApiError> {
        let mut inner = self.lock();
        let active = inner.active()?;
        if active.is_over() {
            return Err(ApiError::GameOver);
        }
        if active.awaiting() != Awaiting::Human {
            return Err(ApiError::NotYourTurn);
        }
        let mv = Move::from_index(square).filter(|m| !m.is_pass()).ok_or(ApiError::IllegalMove { square })?;
        active.game.play(mv).map_err(|_| ApiError::IllegalMove { square })?;
        let events = self.advance(&mut inner);
        let snapshot = inner.active()?.snapshot();
        drop(inner);
        self.emit(events);
        Ok(snapshot)
    }

    /// Two-player: undo the last move. Vs computer: undo your last move and the reply.
    /// Automatic passes are undone along with the move before them.
    pub fn undo(&self) -> Result<Snapshot, ApiError> {
        let mut inner = self.lock();
        let target = inner.active()?.undo_target().ok_or(ApiError::NothingToUndo)?;
        inner.cancel_search();
        let active = inner.active()?;
        active.game.undo_to(target);
        active.resigned = None;
        let events = self.advance(&mut inner);
        let snapshot = inner.active()?.snapshot();
        drop(inner);
        self.emit(events);
        Ok(snapshot)
    }

    /// Resign: against the computer you lose; in two-player mode the side to move does.
    pub fn resign(&self) -> Result<Snapshot, ApiError> {
        let mut inner = self.lock();
        let active = inner.active()?;
        if active.is_over() {
            return Err(ApiError::GameOver);
        }
        active.resigned = Some(active.human.unwrap_or(active.game.position().to_move()));
        inner.cancel_search();
        let events = self.advance(&mut inner);
        let snapshot = inner.active()?.snapshot();
        drop(inner);
        self.emit(events);
        Ok(snapshot)
    }

    /// A suggested square for the human (vs computer, on their turn). Runs the strongest
    /// engine synchronously, so the app should call it from a background command.
    pub fn hint(&self) -> Result<u8, ApiError> {
        let position = {
            let mut inner = self.lock();
            let active = inner.active()?;
            if active.difficulty().is_none() || active.awaiting() != Awaiting::Human {
                return Err(ApiError::HintUnavailable);
            }
            *active.game.position()
        };
        let never = AtomicBool::new(false);
        let ignore = |_: f32| {};
        let mv = (self.engines)(HINT_LEVEL).choose_move(&position, &SearchControl::new(&never, &ignore));
        mv.map(|m| m.index()).ok_or(ApiError::HintUnavailable)
    }

    pub fn snapshot(&self) -> Result<Snapshot, ApiError> {
        Ok(self.lock().active()?.snapshot())
    }

    // ------------------------------------------------------------------ internals

    /// Settle the game after any change: play forced passes, report the state, and start
    /// the computer if it is its turn. Returns the events to emit once the lock is released.
    fn advance(&self, inner: &mut Inner) -> Vec<Event> {
        let mut events = Vec::new();
        let Some(active) = inner.active.as_mut() else { return events };
        while !active.is_over() && active.game.position().legal_moves() == [Move::PASS] {
            let side = active.game.position().to_move();
            active.game.play(Move::PASS).expect("a forced pass is legal");
            events.push(Event::Passed { side: side.into() });
        }
        events.push(Event::StateChanged { snapshot: active.snapshot() });
        let mut job = None;
        match active.status() {
            Status::Over { winner, resigned } => {
                let (black, white) = active.game.position().counts();
                events.push(Event::GameOver { winner, resigned, black, white });
            }
            Status::Playing if active.awaiting() == Awaiting::Computer => {
                job = active.difficulty().map(|level| (*active.game.position(), level));
            }
            Status::Playing => {}
        }
        if let Some((position, level)) = job {
            self.start_search(inner, position, level);
        }
        events
    }

    fn start_search(&self, inner: &mut Inner, position: Position, level: u8) {
        inner.cancel_search();
        let generation = inner.generation;
        let cancel = Arc::new(AtomicBool::new(false));
        inner.cancel = Some(cancel.clone());
        let session = self.clone();
        std::thread::spawn(move || {
            let sink = session.sink.clone();
            let progress = move |p: f32| sink(Event::Thinking { progress: p });
            let mv = (session.engines)(level).choose_move(&position, &SearchControl::new(&cancel, &progress));
            let Some(mv) = mv else { return };
            let events = {
                let mut inner = session.lock();
                if inner.generation != generation {
                    return; // undone, restarted or resigned while thinking
                }
                inner.cancel = None;
                let Some(active) = inner.active.as_mut() else { return };
                if active.game.play(mv).is_err() {
                    return; // an engine bug must not corrupt the game
                }
                session.advance(&mut inner)
            };
            session.emit(events);
        });
    }
}
