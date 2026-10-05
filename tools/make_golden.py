#!/usr/bin/env python3
"""Generate tests/golden/engine_8x8.json from the OthelloRL reference engine.

The golden file is the contract the Rust engine in this repo is tested against:
perft counts, hand-built rule edge cases, and seeded random games with the full
legal-move list and resulting state at every ply.

Usage:
    python tools/make_golden.py            # (re)write the golden file
    python tools/make_golden.py --check    # fail if the committed file differs

OthelloRL is found via --othellorl, $OTHELLO_RL, or ../OthelloRL.
Bitboards are written as 16-digit hex strings (a u64 does not fit a JSON number).
"""
from __future__ import annotations

import argparse
import json
import os
import random
import subprocess
import sys
from pathlib import Path

N = 8
GAMES = 100
SEED = 20261005
PERFT_DEPTHS = range(1, 8)
OUT = Path(__file__).resolve().parent.parent / "tests" / "golden" / "engine_8x8.json"


def load_reference(path: Path):
    if not (path / "othello" / "env.py").exists():
        sys.exit(f"OthelloRL not found at {path} (use --othellorl or $OTHELLO_RL)")
    sys.path.insert(0, str(path))
    from othello.env import BLACK, OthelloEnv, State  # noqa: E402
    return OthelloEnv, State, BLACK


def git(path: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(path), *args], capture_output=True,
                          text=True, check=True).stdout.strip()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--othellorl", type=Path,
                    default=Path(os.environ.get("OTHELLO_RL", Path(__file__).resolve().parents[2] / "OthelloRL")))
    ap.add_argument("--check", action="store_true", help="compare with the committed file instead of writing")
    args = ap.parse_args()

    OthelloEnv, State, BLACK = load_reference(args.othellorl)
    env = OthelloEnv(N)

    hx = lambda bits: f"{bits:016x}"
    side = lambda p: "black" if p == BLACK else "white"

    def enc(s):
        return {"black": hx(s.black), "white": hx(s.white), "player": side(s.player), "passes": s.passes}

    def perft(s, depth):
        if depth == 0 or env.is_terminal(s):
            return 1
        return sum(perft(env.step(s, m), depth - 1) for m in env.legal_moves(s))

    def play(name, start, choose):
        """Record a game from `start`; `choose(state, legal)` picks each move, None stops."""
        s, plies = start, []
        while not env.is_terminal(s):
            legal = env.legal_moves(s)
            m = choose(s, legal)
            if m is None:
                break
            t = env.step(s, m)
            plies.append({"state": enc(s), "legal": legal, "move": m, "after": enc(t)})
            s = t
        final = {"state": enc(s), "legal": env.legal_moves(s), "terminal": env.is_terminal(s)}
        if final["terminal"]:
            b, w = env.counts(s)
            final.update(black_discs=b, white_discs=w,
                         winner={BLACK: "black", 1 - BLACK: "white", None: "draw"}[env.winner(s)])
        return {"name": name, "start": enc(start), "plies": plies, "final": final}

    bit = lambda r, c: 1 << (r * N + c)
    WHITE = 1 - BLACK
    first = lambda s, legal: legal[0] if legal else None

    # Hand-built edge cases (8x8 versions of OthelloRL's rule tests).
    scripted = lambda moves: (lambda it: lambda s, legal: next(it, None))(iter(moves))
    cases = [
        # White captures black's only disc, then both sides must pass: double-pass ends the game.
        play("forced_pass_then_double_pass",
             State(black=bit(1, 1), white=bit(1, 2), player=WHITE), first),
        # One pass has already happened; a placement must reset the counter.
        play("pass_counter_resets_after_placement",
             State(black=bit(0, 2), white=bit(0, 1), player=BLACK, passes=1), scripted([0])),
        # Full boards: draw, black win, white win (all already terminal).
        play("full_board_draw",
             State(black=env.full & 0xFFFFFFFF, white=env.full & ~0xFFFFFFFF, player=BLACK), first),
        play("full_board_black_win",
             State(black=env.full & ~bit(7, 7), white=bit(7, 7), player=WHITE), first),
        play("full_board_white_win",
             State(black=bit(0, 0), white=env.full & ~bit(0, 0), player=BLACK), first),
        # Last empty square: one move fills the board and ends the game.
        play("last_square_fills_board",
             State(black=env.full & ~(bit(7, 7) | bit(7, 6)), white=bit(7, 6), player=BLACK), first),
    ]

    # Seeded random games from the standard start position.
    rng = random.Random(SEED)
    games = [play(f"random_{i:03d}", env.initial_state(), lambda s, legal: rng.choice(legal) if legal else None)
             for i in range(GAMES)]

    start = env.initial_state()
    ref = args.othellorl
    data = {
        "meta": {
            "board_size": N,
            "generator": "tools/make_golden.py",
            "reference_repo": "OthelloRL",
            "reference_commit": git(ref, "rev-parse", "HEAD"),
            "reference_engine_clean": git(ref, "status", "--short", "othello/") == "",
            "seed": SEED,
            "encoding": {
                "bitboard": "16-digit hex u64; square (row, col) is bit row*8+col; row 0 = '1' (top), col 0 = 'a' (left)",
                "moves": "square index 0..63 (a1=0, b1=1, ..., h8=63); 64 = pass",
                "pass": N * N,
                "start_position": enc(start),
                "terminal": "two consecutive passes, or a full board; terminal states have no legal moves",
            },
        },
        "perft": {str(d): perft(start, d) for d in PERFT_DEPTHS},
        "cases": cases,
        "games": games,
    }

    text = json.dumps(data, separators=(",", ":")) + "\n"
    if args.check:
        if not OUT.exists() or OUT.read_text() != text:
            sys.exit(f"{OUT} is out of date; rerun tools/make_golden.py")
        print(f"{OUT} is up to date")
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text)
    plies = sum(len(g["plies"]) for g in games)
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KiB): "
          f"perft {data['perft']}, {len(cases)} cases, {len(games)} games / {plies} plies")


if __name__ == "__main__":
    main()
