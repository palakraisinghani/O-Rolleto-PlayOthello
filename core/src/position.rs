use std::fmt;

pub const SIZE: usize = 8;
pub const NUM_SQUARES: usize = SIZE * SIZE;
/// Squares plus the pass move.
pub const NUM_MOVES: usize = NUM_SQUARES + 1;
pub const FULL: u64 = !0;

const COL_A: u64 = 0x0101_0101_0101_0101;
const COL_H: u64 = COL_A << 7;

/// (shift, mask of squares a shifted bit may land on). Positive shifts go left.
/// The mask stops bits wrapping across the board edge.
const DIRS: [(i8, u64); 8] = [
    (-9, !COL_H), // up-left
    (-8, FULL),   // up
    (-7, !COL_A), // up-right
    (-1, !COL_H), // left
    (1, !COL_A),  // right
    (7, !COL_H),  // down-left
    (8, FULL),    // down
    (9, !COL_A),  // down-right
];

#[inline]
fn shift(x: u64, s: i8, mask: u64) -> u64 {
    (if s > 0 { x << s } else { x >> -s }) & mask
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Color {
    Black,
    White,
}

impl Color {
    pub fn opponent(self) -> Color {
        match self {
            Color::Black => Color::White,
            Color::White => Color::Black,
        }
    }
}

/// A square index 0..=63 or the pass move (64).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Move(u8);

impl Move {
    pub const PASS: Move = Move(NUM_SQUARES as u8);

    /// `idx` in 0..=64 (64 = pass).
    pub fn from_index(idx: u8) -> Option<Move> {
        (usize::from(idx) < NUM_MOVES).then_some(Move(idx))
    }

    pub fn from_row_col(row: usize, col: usize) -> Option<Move> {
        (row < SIZE && col < SIZE).then(|| Move((row * SIZE + col) as u8))
    }

    pub fn index(self) -> u8 {
        self.0
    }

    pub fn is_pass(self) -> bool {
        self == Move::PASS
    }

    /// `(row, col)` of a placement, `None` for a pass.
    pub fn row_col(self) -> Option<(usize, usize)> {
        (!self.is_pass()).then(|| (usize::from(self.0) / SIZE, usize::from(self.0) % SIZE))
    }

    /// Algebraic name: `a1`..`h8`, or `pass`.
    pub fn name(self) -> String {
        match self.row_col() {
            None => "pass".to_string(),
            Some((r, c)) => format!("{}{}", (b'a' + c as u8) as char, r + 1),
        }
    }

    pub fn parse(s: &str) -> Option<Move> {
        let s = s.trim().to_ascii_lowercase();
        if s == "pass" {
            return Some(Move::PASS);
        }
        let b = s.as_bytes();
        if b.len() != 2 || !(b'a'..=b'h').contains(&b[0]) || !(b'1'..=b'8').contains(&b[1]) {
            return None;
        }
        Move::from_row_col(usize::from(b[1] - b'1'), usize::from(b[0] - b'a'))
    }

    fn bit(self) -> u64 {
        1u64 << self.0
    }
}

impl fmt::Display for Move {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.name())
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum IllegalMove {
    GameOver,
    /// Placement on an occupied square or one that flips nothing.
    NotLegal(Move),
    /// A pass while the side to move still has a placement.
    PassNotAllowed,
}

impl fmt::Display for IllegalMove {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IllegalMove::GameOver => write!(f, "the game is over"),
            IllegalMove::NotLegal(m) => write!(f, "{m} is not a legal move"),
            IllegalMove::PassNotAllowed => write!(f, "cannot pass while a legal move exists"),
        }
    }
}

impl std::error::Error for IllegalMove {}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Outcome {
    Winner(Color),
    Draw,
}

/// The result of playing a move: the new position and the discs it flipped
/// (a bitboard; empty for a pass). The UI uses `flipped` to animate.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Played {
    pub position: Position,
    pub flipped: u64,
}

/// An immutable game position. Cheap to copy, so search can keep copies freely.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct Position {
    black: u64,
    white: u64,
    to_move: Color,
    /// Consecutive passes so far; 2 ends the game.
    passes: u8,
}

impl Position {
    /// Standard start: white on d4/e5, black on e4/d5, Black to move.
    pub fn initial() -> Position {
        let bit = |r: usize, c: usize| 1u64 << (r * SIZE + c);
        Position {
            black: bit(3, 4) | bit(4, 3),
            white: bit(3, 3) | bit(4, 4),
            to_move: Color::Black,
            passes: 0,
        }
    }

    /// Build an arbitrary position; `None` if the colours overlap or `passes > 2`.
    pub fn from_parts(black: u64, white: u64, to_move: Color, passes: u8) -> Option<Position> {
        (black & white == 0 && passes <= 2).then_some(Position { black, white, to_move, passes })
    }

    pub fn black(&self) -> u64 {
        self.black
    }

    pub fn white(&self) -> u64 {
        self.white
    }

    pub fn to_move(&self) -> Color {
        self.to_move
    }

    pub fn passes(&self) -> u8 {
        self.passes
    }

    /// Discs of the side to move.
    pub fn own(&self) -> u64 {
        match self.to_move {
            Color::Black => self.black,
            Color::White => self.white,
        }
    }

    /// Discs of the side not to move.
    pub fn opp(&self) -> u64 {
        match self.to_move {
            Color::Black => self.white,
            Color::White => self.black,
        }
    }

    /// `(black, white)` disc counts.
    pub fn counts(&self) -> (u32, u32) {
        (self.black.count_ones(), self.white.count_ones())
    }

    /// Two consecutive passes, or a full board.
    pub fn is_terminal(&self) -> bool {
        self.passes >= 2 || (self.black | self.white) == FULL
    }

    /// Bitboard of squares where the side to move can place a disc.
    pub fn legal_bits(&self) -> u64 {
        let (own, opp) = (self.own(), self.opp());
        let empty = !(own | opp);
        let mut moves = 0;
        for (s, m) in DIRS {
            let mut x = shift(own, s, m) & opp;
            for _ in 0..SIZE - 3 {
                x |= shift(x, s, m) & opp;
            }
            moves |= shift(x, s, m) & empty;
        }
        moves
    }

    /// Legal moves in ascending square order. `[PASS]` if there is no placement,
    /// and empty once the game is over.
    pub fn legal_moves(&self) -> Vec<Move> {
        if self.is_terminal() {
            return Vec::new();
        }
        let mut bits = self.legal_bits();
        if bits == 0 {
            return vec![Move::PASS];
        }
        let mut moves = Vec::with_capacity(bits.count_ones() as usize);
        while bits != 0 {
            moves.push(Move(bits.trailing_zeros() as u8));
            bits &= bits - 1;
        }
        moves
    }

    fn flips(&self, mv: Move) -> u64 {
        let (own, opp) = (self.own(), self.opp());
        let mut flips = 0;
        for (s, m) in DIRS {
            let mut line = 0;
            let mut x = shift(mv.bit(), s, m);
            while x & opp != 0 {
                line |= x;
                x = shift(x, s, m);
            }
            if x & own != 0 {
                flips |= line;
            }
        }
        flips
    }

    /// Play a move, validating it. A pass is accepted only when there is no placement.
    pub fn play(&self, mv: Move) -> Result<Played, IllegalMove> {
        if self.is_terminal() {
            return Err(IllegalMove::GameOver);
        }
        let next = self.to_move.opponent();
        if mv.is_pass() {
            if self.legal_bits() != 0 {
                return Err(IllegalMove::PassNotAllowed);
            }
            let position = Position { to_move: next, passes: self.passes + 1, ..*self };
            return Ok(Played { position, flipped: 0 });
        }
        if (self.black | self.white) & mv.bit() != 0 {
            return Err(IllegalMove::NotLegal(mv));
        }
        let flipped = self.flips(mv);
        if flipped == 0 {
            return Err(IllegalMove::NotLegal(mv));
        }
        let own = self.own() | flipped | mv.bit();
        let opp = self.opp() & !flipped;
        let (black, white) = match self.to_move {
            Color::Black => (own, opp),
            Color::White => (opp, own),
        };
        Ok(Played { position: Position { black, white, to_move: next, passes: 0 }, flipped })
    }

    /// Result of a finished game; `None` while it is still being played.
    pub fn outcome(&self) -> Option<Outcome> {
        if !self.is_terminal() {
            return None;
        }
        let (b, w) = self.counts();
        Some(match b.cmp(&w) {
            std::cmp::Ordering::Greater => Outcome::Winner(Color::Black),
            std::cmp::Ordering::Less => Outcome::Winner(Color::White),
            std::cmp::Ordering::Equal => Outcome::Draw,
        })
    }
}

impl fmt::Display for Position {
    /// Text board: `X` black, `O` white, `.` empty.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "  a b c d e f g h")?;
        for r in 0..SIZE {
            write!(f, "{}", r + 1)?;
            for c in 0..SIZE {
                let b = 1u64 << (r * SIZE + c);
                let ch = if self.black & b != 0 {
                    'X'
                } else if self.white & b != 0 {
                    'O'
                } else {
                    '.'
                };
                write!(f, " {ch}")?;
            }
            writeln!(f)?;
        }
        let side = if self.to_move == Color::Black { "X (black)" } else { "O (white)" };
        write!(f, "to move: {side}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bit(r: usize, c: usize) -> u64 {
        1u64 << (r * SIZE + c)
    }

    fn names(moves: &[Move]) -> Vec<String> {
        moves.iter().map(|m| m.name()).collect()
    }

    #[test]
    fn initial_position() {
        let p = Position::initial();
        assert_eq!(p.counts(), (2, 2));
        assert_eq!(p.to_move(), Color::Black);
        assert_eq!(names(&p.legal_moves()), ["d3", "c4", "f5", "e6"]);
    }

    #[test]
    fn move_names_round_trip() {
        for i in 0..=64u8 {
            let m = Move::from_index(i).unwrap();
            assert_eq!(Move::parse(&m.name()), Some(m));
        }
        assert_eq!(Move::parse("a1").unwrap().index(), 0);
        assert_eq!(Move::parse("h8").unwrap().index(), 63);
        assert_eq!(Move::parse("i1"), None);
        assert_eq!(Move::from_index(65), None);
    }

    #[test]
    fn first_move_flips_one_disc() {
        let played = Position::initial().play(Move::parse("d3").unwrap()).unwrap();
        assert_eq!(played.flipped, bit(3, 3));
        assert_eq!(played.position.counts(), (4, 1));
        assert_eq!(played.position.to_move(), Color::White);
    }

    #[test]
    fn illegal_moves_are_rejected() {
        let p = Position::initial();
        assert_eq!(p.play(Move::parse("a1").unwrap()), Err(IllegalMove::NotLegal(Move::parse("a1").unwrap())));
        // Occupied square.
        assert!(p.play(Move::parse("d4").unwrap()).is_err());
        // Pass while placements exist.
        assert_eq!(p.play(Move::PASS), Err(IllegalMove::PassNotAllowed));
    }

    #[test]
    fn forced_pass_and_double_pass_end() {
        // White captures black's only disc, then both sides must pass.
        let p = Position::from_parts(bit(1, 1), bit(1, 2), Color::White, 0).unwrap();
        assert_eq!(names(&p.legal_moves()), ["a2"]);
        let p = p.play(Move::parse("a2").unwrap()).unwrap().position;
        assert_eq!(p.counts(), (0, 3));
        assert_eq!(p.legal_moves(), [Move::PASS]);
        let p = p.play(Move::PASS).unwrap().position;
        assert_eq!((p.passes(), p.is_terminal()), (1, false));
        let p = p.play(Move::PASS).unwrap().position;
        assert!(p.is_terminal());
        assert_eq!(p.outcome(), Some(Outcome::Winner(Color::White)));
        assert!(p.legal_moves().is_empty());
        assert_eq!(p.play(Move::PASS), Err(IllegalMove::GameOver));
    }

    #[test]
    fn full_board_is_terminal() {
        let p = Position::from_parts(0xFFFF_FFFF, !0xFFFF_FFFFu64, Color::Black, 0).unwrap();
        assert!(p.is_terminal());
        assert_eq!(p.outcome(), Some(Outcome::Draw));
    }

    #[test]
    fn rejects_overlapping_colours() {
        assert!(Position::from_parts(1, 1, Color::Black, 0).is_none());
        assert!(Position::from_parts(1, 2, Color::Black, 3).is_none());
    }

    #[test]
    fn edges_do_not_wrap() {
        // Black on h3, white on a4 (next row, far side): no capture across the edge.
        let p = Position::from_parts(bit(2, 7), bit(3, 0), Color::Black, 0).unwrap();
        assert_eq!(p.legal_bits(), 0);
    }

    #[test]
    fn transposing_the_board_transposes_moves() {
        let transpose = |bits: u64| {
            (0..SIZE)
                .flat_map(|r| (0..SIZE).map(move |c| (r, c)))
                .filter(|&(r, c)| bits & bit(r, c) != 0)
                .fold(0, |acc, (r, c)| acc | bit(c, r))
        };
        let mut p = Position::initial();
        for _ in 0..30 {
            let t = Position::from_parts(transpose(p.black()), transpose(p.white()), p.to_move(), 0).unwrap();
            assert_eq!(transpose(p.legal_bits()), t.legal_bits());
            let Some(&m) = p.legal_moves().last() else { break };
            p = p.play(m).unwrap().position;
        }
    }
}
