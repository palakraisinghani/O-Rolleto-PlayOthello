//! Drives the API the way the UI will: commands in, snapshots and events out.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Receiver};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use othello_api::*;
use othello_core::{Color, Move, Position};

const WAIT: Duration = Duration::from_secs(5);

fn session_with(engines: Option<EngineFactory>) -> (Session, Receiver<Event>) {
    let (tx, rx) = channel();
    let tx = Mutex::new(tx);
    let sink: Sink = Arc::new(move |e| {
        let _ = tx.lock().unwrap().send(e);
    });
    let session = match engines {
        Some(f) => Session::with_engines(sink, f, 1),
        None => Session::with_engines(sink, standin_engines(1), 1),
    };
    (session, rx)
}

fn session() -> (Session, Receiver<Event>) {
    session_with(None)
}

fn two_players() -> Mode {
    Mode::TwoPlayers { black_name: None, white_name: None }
}

fn vs(human: HumanSide, difficulty: u8) -> Mode {
    Mode::VsComputer { difficulty, human }
}

fn sq(name: &str) -> u8 {
    Move::parse(name).unwrap().index()
}

/// Wait for the next state_changed that satisfies `pred`, skipping other events.
fn wait_state(rx: &Receiver<Event>, pred: impl Fn(&Snapshot) -> bool) -> Snapshot {
    loop {
        match rx.recv_timeout(WAIT).expect("timed out waiting for an event") {
            Event::StateChanged { snapshot } if pred(&snapshot) => return snapshot,
            _ => {}
        }
    }
}

fn drain(rx: &Receiver<Event>) -> Vec<Event> {
    std::iter::from_fn(|| rx.try_recv().ok()).collect()
}

#[test]
fn commands_fail_before_a_game_exists() {
    let (s, _rx) = session();
    assert_eq!(s.snapshot(), Err(ApiError::NoGame));
    assert_eq!(s.play(19), Err(ApiError::NoGame));
    assert_eq!(s.undo(), Err(ApiError::NoGame));
    assert_eq!(s.resign(), Err(ApiError::NoGame));
}

#[test]
fn new_two_player_game_snapshot() {
    let (s, rx) = session();
    let snap = s.new_game(two_players()).unwrap();
    assert_eq!(snap.board.len(), 64);
    assert_eq!((snap.black_count, snap.white_count), (2, 2));
    assert_eq!(snap.to_move, Side::Black);
    assert_eq!(snap.awaiting, Awaiting::Human);
    assert_eq!(snap.legal, vec![sq("d3"), sq("c4"), sq("f5"), sq("e6")]);
    assert_eq!(snap.status, Status::Playing);
    assert!(!snap.can_undo && snap.last_move.is_none() && snap.history.is_empty());
    // d4 and e5 white, e4 and d5 black.
    assert_eq!((snap.board[27], snap.board[28], snap.board[35], snap.board[36]), (2, 1, 1, 2));
    assert!(matches!(rx.recv_timeout(WAIT).unwrap(), Event::StateChanged { .. }));
}

#[test]
fn play_updates_state_and_reports_flips() {
    let (s, _rx) = session();
    s.new_game(two_players()).unwrap();
    let snap = s.play(sq("d3")).unwrap();
    assert_eq!(snap.last_move, Some(sq("d3")));
    assert_eq!(snap.flipped, vec![sq("d4")]);
    assert_eq!((snap.black_count, snap.white_count), (4, 1));
    assert_eq!(snap.to_move, Side::White);
    assert_eq!(snap.history, ["d3"]);
    assert!(snap.can_undo);
}

#[test]
fn bad_moves_are_rejected_and_change_nothing() {
    let (s, _rx) = session();
    let before = s.new_game(two_players()).unwrap();
    assert_eq!(s.play(0), Err(ApiError::IllegalMove { square: 0 }));
    assert_eq!(s.play(27), Err(ApiError::IllegalMove { square: 27 })); // occupied
    assert_eq!(s.play(64), Err(ApiError::IllegalMove { square: 64 })); // passes are automatic
    assert_eq!(s.play(200), Err(ApiError::IllegalMove { square: 200 }));
    assert_eq!(s.snapshot().unwrap(), before);
}

#[test]
fn invalid_difficulty_is_rejected() {
    let (s, _rx) = session();
    assert_eq!(s.new_game(vs(HumanSide::Black, 0)), Err(ApiError::InvalidDifficulty { given: 0 }));
    assert_eq!(s.new_game(vs(HumanSide::Black, 5)), Err(ApiError::InvalidDifficulty { given: 5 }));
    assert_eq!(s.snapshot(), Err(ApiError::NoGame));
}

#[test]
fn computer_replies_after_the_human_moves() {
    let (s, rx) = session();
    let snap = s.new_game(vs(HumanSide::Black, 2)).unwrap();
    assert_eq!(snap.awaiting, Awaiting::Human);
    let snap = s.play(sq("d3")).unwrap();
    assert_eq!((snap.awaiting, snap.to_move), (Awaiting::Computer, Side::White));
    assert!(snap.legal.is_empty(), "no hints while the computer thinks");
    assert_eq!(s.play(sq("c3")), Err(ApiError::NotYourTurn));
    let after = wait_state(&rx, |x| x.ply == 2);
    assert_eq!((after.awaiting, after.to_move), (Awaiting::Human, Side::Black));
    assert_eq!(s.snapshot().unwrap(), after);
}

#[test]
fn computer_moves_first_when_the_human_is_white() {
    let (s, rx) = session();
    let snap = s.new_game(vs(HumanSide::White, 1)).unwrap();
    assert_eq!(snap.awaiting, Awaiting::Computer);
    let snap = wait_state(&rx, |x| x.ply == 1);
    assert_eq!((snap.awaiting, snap.to_move), (Awaiting::Human, Side::White));
    assert!(!snap.can_undo, "cannot undo the computer's opening move");
    assert_eq!(s.undo(), Err(ApiError::NothingToUndo));
}

#[test]
fn random_side_is_resolved_in_the_snapshot() {
    let (s, _rx) = session();
    let mut seen = std::collections::HashSet::new();
    for _ in 0..30 {
        match s.new_game(vs(HumanSide::Random, 1)).unwrap().mode {
            Mode::VsComputer { human, .. } => seen.insert(human == HumanSide::Black),
            _ => unreachable!(),
        };
    }
    assert_eq!(seen.len(), 2, "random should produce both colours");
}

#[test]
fn undo_against_computer_rolls_back_move_and_reply() {
    let (s, rx) = session();
    let start = s.new_game(vs(HumanSide::Black, 2)).unwrap();
    s.play(sq("d3")).unwrap();
    wait_state(&rx, |x| x.ply == 2);
    let snap = s.undo().unwrap();
    assert_eq!((snap.ply, snap.board.clone(), snap.awaiting), (0, start.board, Awaiting::Human));
    assert!(!snap.can_undo);
}

#[test]
fn undo_two_players_removes_one_move() {
    let (s, _rx) = session();
    s.new_game(two_players()).unwrap();
    s.play(sq("d3")).unwrap();
    s.play(sq("c3")).unwrap();
    let snap = s.undo().unwrap();
    assert_eq!((snap.ply, snap.to_move, snap.history), (1, Side::White, vec!["d3".to_string()]));
}

/// An engine that thinks for a while, ignoring cancellation, then plays the first legal move.
fn slow_engines(done: Arc<AtomicBool>) -> EngineFactory {
    struct Slow(Arc<AtomicBool>);
    impl Engine for Slow {
        fn choose_move(&mut self, p: &Position, _: &SearchControl) -> Option<Move> {
            std::thread::sleep(Duration::from_millis(300));
            self.0.store(true, Ordering::SeqCst);
            p.legal_moves().first().copied()
        }
    }
    Arc::new(move |_| Box::new(Slow(done.clone())))
}

#[test]
fn a_computer_move_that_finishes_after_undo_is_discarded() {
    let done = Arc::new(AtomicBool::new(false));
    let (s, rx) = session_with(Some(slow_engines(done.clone())));
    s.new_game(vs(HumanSide::Black, 3)).unwrap();
    s.play(sq("d3")).unwrap(); // computer starts thinking (300 ms)
    let snap = s.undo().unwrap(); // roll back while it thinks
    assert_eq!(snap.ply, 0);
    while !done.load(Ordering::SeqCst) {
        std::thread::sleep(Duration::from_millis(20));
    }
    std::thread::sleep(Duration::from_millis(100));
    assert_eq!(s.snapshot().unwrap().ply, 0, "stale computer move must not be applied");
    assert!(drain(&rx).iter().all(|e| !matches!(e, Event::StateChanged { snapshot } if snapshot.ply > 1)));
}

#[test]
fn starting_a_new_game_discards_a_pending_computer_move() {
    let done = Arc::new(AtomicBool::new(false));
    let (s, _rx) = session_with(Some(slow_engines(done.clone())));
    s.new_game(vs(HumanSide::White, 3)).unwrap(); // computer (black) thinks first
    s.new_game(two_players()).unwrap();
    std::thread::sleep(Duration::from_millis(500));
    assert!(done.load(Ordering::SeqCst));
    assert_eq!(s.snapshot().unwrap().ply, 0);
}

#[test]
fn forced_passes_are_automatic_and_announced() {
    // White to move can capture black's only disc; then both sides must pass.
    let bit = |r: usize, c: usize| 1u64 << (r * 8 + c);
    let pos = Position::from_parts(bit(1, 1), bit(1, 2), Color::White, 0).unwrap();
    let (s, rx) = session();
    s.new_game_from(two_players(), pos).unwrap();
    drain(&rx);
    let snap = s.play(sq("a2")).unwrap();
    assert_eq!(snap.status, Status::Over { winner: Some(Side::White), resigned: false });
    assert_eq!((snap.black_count, snap.white_count), (0, 3));
    assert_eq!(snap.history, ["a2", "pass", "pass"]);
    assert_eq!(snap.last_move, Some(sq("a2")), "passes do not move the last-move highlight");
    let events = drain(&rx);
    assert!(matches!(events[0], Event::Passed { side: Side::Black }));
    assert!(matches!(events[1], Event::Passed { side: Side::White }));
    assert!(matches!(events[2], Event::StateChanged { .. }));
    assert!(matches!(events[3], Event::GameOver { winner: Some(Side::White), resigned: false, black: 0, white: 3 }));
    assert_eq!(s.play(sq("a1")), Err(ApiError::GameOver));
    // Undo goes back before the move, taking the passes with it.
    let snap = s.undo().unwrap();
    assert_eq!((snap.ply, snap.status), (0, Status::Playing));
}

#[test]
fn resigning_against_the_computer_loses() {
    let (s, rx) = session();
    s.new_game(vs(HumanSide::White, 1)).unwrap();
    wait_state(&rx, |x| x.ply == 1);
    drain(&rx);
    let snap = s.resign().unwrap();
    assert_eq!(snap.status, Status::Over { winner: Some(Side::Black), resigned: true });
    assert_eq!(snap.awaiting, Awaiting::Nobody);
    assert!(drain(&rx).iter().any(|e| matches!(e, Event::GameOver { resigned: true, .. })));
    assert_eq!(s.resign(), Err(ApiError::GameOver));
    assert_eq!(s.play(0), Err(ApiError::GameOver));
}

#[test]
fn hints_only_vs_computer_on_the_humans_turn() {
    let (s, _rx) = session();
    s.new_game(two_players()).unwrap();
    assert_eq!(s.hint(), Err(ApiError::HintUnavailable));
    let snap = s.new_game(vs(HumanSide::Black, 2)).unwrap();
    assert!(snap.legal.contains(&s.hint().unwrap()));
}

#[test]
fn a_full_game_against_the_computer_stays_consistent() {
    let (s, rx) = session();
    let mut snap = s.new_game(vs(HumanSide::Black, 1)).unwrap();
    let mut turn = 0u8;
    while snap.status == Status::Playing {
        if snap.awaiting == Awaiting::Computer {
            snap = wait_state(&rx, |x| x.ply > snap.ply);
            continue;
        }
        turn = turn.wrapping_add(1);
        let square = snap.legal[usize::from(turn) % snap.legal.len()];
        snap = s.play(square).unwrap();
        let discs = snap.board.iter().filter(|&&c| c != 0).count() as u32;
        assert_eq!(discs, snap.black_count + snap.white_count);
        assert!(snap.black_count + snap.white_count >= 4);
    }
    assert!(matches!(snap.status, Status::Over { resigned: false, .. }));
    assert!(drain(&rx).iter().any(|e| matches!(e, Event::GameOver { .. })));
}

#[test]
fn json_shapes_match_what_the_ui_expects() {
    let mode: Mode = serde_json::from_str(r#"{"kind":"vs_computer","difficulty":3,"human":"random"}"#).unwrap();
    assert_eq!(mode, vs(HumanSide::Random, 3));
    let mode: Mode = serde_json::from_str(r#"{"kind":"two_players"}"#).unwrap();
    assert_eq!(mode, two_players());
    let (s, _rx) = session();
    let snap = s.new_game(two_players()).unwrap();
    let json = serde_json::to_value(Event::StateChanged { snapshot: snap }).unwrap();
    assert_eq!(json["type"], "state_changed");
    assert_eq!(json["snapshot"]["status"]["state"], "playing");
    assert_eq!(json["snapshot"]["awaiting"], "human");
    assert_eq!(json["snapshot"]["to_move"], "black");
    assert_eq!(json["snapshot"]["mode"]["kind"], "two_players");
    let over = serde_json::to_value(Event::GameOver { winner: None, resigned: false, black: 32, white: 32 }).unwrap();
    assert_eq!(over["type"], "game_over");
    let err = serde_json::to_value(ApiError::IllegalMove { square: 3 }).unwrap();
    assert_eq!((err["code"].as_str(), err["square"].as_u64()), (Some("illegal_move"), Some(3)));
}

#[test]
fn settings_round_trip_and_tolerate_bad_files() {
    let dir = std::env::temp_dir().join(format!("othello-settings-{}", std::process::id()));
    let path = dir.join("settings.json");
    assert_eq!(Settings::load(&path), Settings::default());
    let custom = Settings { sound: false, theme: "dark".into(), default_difficulty: 4, ..Settings::default() };
    custom.save(&path).unwrap();
    assert_eq!(Settings::load(&path), custom);
    std::fs::write(&path, r#"{"sound": false, "some_future_field": 1}"#).unwrap();
    assert_eq!(Settings::load(&path), Settings { sound: false, ..Settings::default() });
    std::fs::write(&path, "not json").unwrap();
    assert_eq!(Settings::load(&path), Settings::default());
    std::fs::remove_dir_all(dir).ok();
}
