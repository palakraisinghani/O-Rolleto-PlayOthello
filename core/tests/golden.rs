//! Checks the engine against tests/golden/engine_8x8.json, generated from the
//! OthelloRL reference engine by tools/make_golden.py.

use othello_core::{Color, Move, Outcome, Position};
use serde_json::Value;

fn golden() -> Value {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../tests/golden/engine_8x8.json");
    serde_json::from_str(&std::fs::read_to_string(path).expect("golden file")).unwrap()
}

fn position(v: &Value) -> Position {
    let bits = |k: &str| u64::from_str_radix(v[k].as_str().unwrap(), 16).unwrap();
    let side = if v["player"] == "black" { Color::Black } else { Color::White };
    Position::from_parts(bits("black"), bits("white"), side, v["passes"].as_u64().unwrap() as u8).unwrap()
}

fn indices(v: &Value) -> Vec<u8> {
    v.as_array().unwrap().iter().map(|m| m.as_u64().unwrap() as u8).collect()
}

fn perft(p: &Position, depth: u32) -> u64 {
    if depth == 0 || p.is_terminal() {
        return 1;
    }
    p.legal_moves().into_iter().map(|m| perft(&p.play(m).unwrap().position, depth - 1)).sum()
}

#[test]
fn start_position_matches_reference() {
    assert_eq!(Position::initial(), position(&golden()["meta"]["encoding"]["start_position"]));
}

#[test]
fn perft_matches_reference() {
    let g = golden();
    for (depth, expected) in g["perft"].as_object().unwrap() {
        let d: u32 = depth.parse().unwrap();
        assert_eq!(perft(&Position::initial(), d), expected.as_u64().unwrap(), "perft depth {d}");
    }
}

/// Replays a recorded game: legal moves, resulting positions and the final result.
fn replay(game: &Value) {
    let name = game["name"].as_str().unwrap();
    let mut pos = position(&game["start"]);
    for (i, ply) in game["plies"].as_array().unwrap().iter().enumerate() {
        assert_eq!(pos, position(&ply["state"]), "{name} ply {i}: position drifted");
        let legal: Vec<u8> = pos.legal_moves().iter().map(|m| m.index()).collect();
        assert_eq!(legal, indices(&ply["legal"]), "{name} ply {i}: legal moves");
        let mv = Move::from_index(ply["move"].as_u64().unwrap() as u8).unwrap();
        pos = pos.play(mv).unwrap_or_else(|e| panic!("{name} ply {i}: {e}")).position;
        assert_eq!(pos, position(&ply["after"]), "{name} ply {i}: position after {mv}");
    }
    let fin = &game["final"];
    assert_eq!(pos, position(&fin["state"]), "{name}: final position");
    assert_eq!(pos.is_terminal(), fin["terminal"].as_bool().unwrap(), "{name}: terminal");
    let legal: Vec<u8> = pos.legal_moves().iter().map(|m| m.index()).collect();
    assert_eq!(legal, indices(&fin["legal"]), "{name}: final legal moves");
    if pos.is_terminal() {
        let (b, w) = pos.counts();
        assert_eq!(u64::from(b), fin["black_discs"].as_u64().unwrap(), "{name}: black discs");
        assert_eq!(u64::from(w), fin["white_discs"].as_u64().unwrap(), "{name}: white discs");
        let expected = match fin["winner"].as_str().unwrap() {
            "black" => Outcome::Winner(Color::Black),
            "white" => Outcome::Winner(Color::White),
            _ => Outcome::Draw,
        };
        assert_eq!(pos.outcome(), Some(expected), "{name}: outcome");
    }
}

#[test]
fn rule_cases_match_reference() {
    let g = golden();
    let cases = g["cases"].as_array().unwrap();
    assert!(!cases.is_empty());
    cases.iter().for_each(replay);
}

#[test]
fn random_games_match_reference() {
    let g = golden();
    let games = g["games"].as_array().unwrap();
    assert!(!games.is_empty());
    games.iter().for_each(replay);
}
