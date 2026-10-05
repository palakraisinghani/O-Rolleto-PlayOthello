use crate::position::{IllegalMove, Move, Played, Position};

#[derive(Clone, Copy, Debug)]
struct Entry {
    position: Position,
    /// The move that led here and the discs it flipped; `None` for the start.
    last: Option<(Move, u64)>,
}

/// A game in progress: the current position plus history for undo.
/// `Position` stays a plain value type (cheap for search); undo lives here.
#[derive(Clone, Debug)]
pub struct Game {
    history: Vec<Entry>,
}

impl Game {
    pub fn new() -> Game {
        Game::from_position(Position::initial())
    }

    pub fn from_position(position: Position) -> Game {
        Game { history: vec![Entry { position, last: None }] }
    }

    pub fn position(&self) -> &Position {
        &self.history[self.history.len() - 1].position
    }

    /// The last move played and the discs it flipped (for highlight and animation).
    pub fn last_move(&self) -> Option<(Move, u64)> {
        self.history[self.history.len() - 1].last
    }

    /// The most recent *placement* (skipping passes) and the discs it flipped.
    pub fn last_placement(&self) -> Option<(Move, u64)> {
        self.history.iter().rev().filter_map(|e| e.last).find(|(m, _)| !m.is_pass())
    }

    /// The position after `ply` moves (0 = the start).
    pub fn position_at(&self, ply: usize) -> Option<&Position> {
        self.history.get(ply).map(|e| &e.position)
    }

    /// The move played from `ply` to `ply + 1`.
    pub fn move_after(&self, ply: usize) -> Option<Move> {
        self.history.get(ply + 1).and_then(|e| e.last).map(|(m, _)| m)
    }

    /// Roll back to the position after `ply` moves; no-op if `ply` is in the future.
    pub fn undo_to(&mut self, ply: usize) {
        self.history.truncate(ply + 1);
    }

    /// Number of moves (including passes) played so far.
    pub fn ply(&self) -> usize {
        self.history.len() - 1
    }

    /// Moves played so far, oldest first (for a move list).
    pub fn moves(&self) -> impl Iterator<Item = Move> + '_ {
        self.history.iter().filter_map(|e| e.last.map(|(m, _)| m))
    }

    pub fn play(&mut self, mv: Move) -> Result<Played, IllegalMove> {
        let played = self.position().play(mv)?;
        self.history.push(Entry { position: played.position, last: Some((mv, played.flipped)) });
        Ok(played)
    }

    /// Undo the last move. Returns false at the start of the game.
    pub fn undo(&mut self) -> bool {
        self.undo_plies(1) == 1
    }

    /// Undo up to `n` moves; returns how many were undone.
    pub fn undo_plies(&mut self, n: usize) -> usize {
        let n = n.min(self.ply());
        self.history.truncate(self.history.len() - n);
        n
    }
}

impl Default for Game {
    fn default() -> Game {
        Game::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn play_and_undo() {
        let mut g = Game::new();
        let start = *g.position();
        let m = Move::parse("d3").unwrap();
        g.play(m).unwrap();
        assert_eq!(g.ply(), 1);
        assert_eq!(g.last_move().map(|(m, _)| m), Some(m));
        assert!(g.undo());
        assert_eq!(*g.position(), start);
        assert_eq!(g.last_move(), None);
        assert!(!g.undo());
    }

    #[test]
    fn history_access_and_rollback() {
        let mut g = Game::new();
        let (d3, c3) = (Move::parse("d3").unwrap(), Move::parse("c3").unwrap());
        g.play(d3).unwrap();
        g.play(c3).unwrap();
        assert_eq!((g.move_after(0), g.move_after(1), g.move_after(2)), (Some(d3), Some(c3), None));
        assert_eq!(g.last_placement().map(|(m, _)| m), Some(c3));
        let after_first = *g.position_at(1).unwrap();
        g.undo_to(1);
        assert_eq!((g.ply(), *g.position()), (1, after_first));
        g.undo_to(7);
        assert_eq!(g.ply(), 1);
    }

    #[test]
    fn failed_move_changes_nothing() {
        let mut g = Game::new();
        assert!(g.play(Move::parse("a1").unwrap()).is_err());
        assert_eq!(g.ply(), 0);
    }

    #[test]
    fn undo_two_plies_is_clamped() {
        let mut g = Game::new();
        g.play(Move::parse("d3").unwrap()).unwrap();
        assert_eq!(g.undo_plies(5), 1);
        assert_eq!(g.ply(), 0);
    }
}
