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
