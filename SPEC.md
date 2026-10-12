# Othello Player — Specification

A desktop application for playing Othello on your own machine. You can play against the computer at four difficulty levels, all played by **Oroletto**, the AlphaZero-style agent trained in the companion research repo [OthelloRL](../OthelloRL). Two people can also play each other on the same computer.

The user interface will be designed in iterations, so the architecture keeps the **UI layer cleanly separate** from the game engine and the AI.

Status: **draft v0.2** — sections marked ❓ need a decision before implementation starts. Decided so far: Tauri + Svelte, 8×8 board, four levels from one model weakened only by move temperature.

---

## 1. Goals and non-goals

**Goals (v1)**
- A real, self-contained **application binary** that anyone can **build from source** on Linux, macOS and Windows. It runs offline, with no Python or ML framework installed.
- A polished, responsive UI that is easy to restyle and iterate on.
- **Play vs Computer** at four difficulty levels, all played by Oroletto (weakened by move temperature on the lower levels).
- **Two-player (local, same screen)** mode.
- Correct rules in every situation, including forced passes, double-pass endings and full boards.

**Non-goals (v1)**
- Online or networked multiplayer, accounts, matchmaking, ratings.
- Training or modifying models inside the app; models are produced in OthelloRL and shipped as files.
- Mobile apps (the architecture shouldn't rule them out later).

---

## 2. Users and core flows

1. **Launch** → home screen with: *Play vs Computer*, *Two Players*, *How to Play*, *Settings*.
2. **Play vs Computer** → choose difficulty, your colour (Black / White / Random) and board size → game screen.
3. **Two Players** → optional player names, board size → game screen. Players take turns on the same device.
4. **Game screen** → play to the end → result dialog (score, winner) → *Rematch*, *Swap colours* or *Home*.
5. **How to Play** → short illustrated rules: placing, flipping, passing and the end of the game, with the same examples as the report's rules figure.

---

## 3. Functional requirements

### 3.1 Board and rules
- Board size: **8×8 only** (decided). Standard start position; **Black moves first**.
- Legal-move generation, flipping in all 8 directions, **forced pass** when a player has no legal move (shown clearly, never silent), game ending after two consecutive passes or a full board, and disc counts.
- The engine is **8×8 only** (no other sizes) and must reproduce OthelloRL exactly, as checked against `tests/golden/engine_8x8.json`: perft counts (depth 1–7: 4, 12, 56, 244, 1396, 8200, 55092), forced-pass / double-pass / full-board cases, and 100 seeded random games with legal moves and resulting positions at every ply.
- **Conventions** (same as OthelloRL, since the model layout depends on them): square `(row, col)` = index `row*8 + col`, `a1` = 0 top-left, `h8` = 63, pass = 64; start position white d4/e5, black e4/d5; Black moves first.

### 3.2 Game screen
- Board with discs, coordinates (a–h / 1–8), **legal-move hints** (toggleable), **last-move highlight**, and **flip animation**.
- Live disc counts and a whose-turn indicator. In vs-Computer mode, a "thinking…" indicator while the AI moves.
- **Pass banner** ("White has no legal move — Black plays again").
- Controls: **Undo** (vs Computer: undoes your move and the AI's reply; Two Players: one move), **New game**, **Hint** (vs Computer only; optional, uses Oroletto), **Resign**.
- Move list / history panel (optional in v1, desirable).
- Input: mouse/touch click on a square; keyboard navigation (arrows + Enter) for accessibility.

### 3.3 Play vs Computer — difficulty levels
**Four levels, one model, one knob.** Every level is played by the same network, **the strongest 8×8 Oroletto model**, with the **same MCTS search budget**. Levels differ **only in the move temperature T**:
- After searching, the move is sampled from the root visit counts with probability ∝ N^(1/T).
- **T = 0** plays the most-visited move (full strength). **Higher T** spreads probability over the other moves the search visited, so play becomes more varied and makes more mistakes.
- There is **no root noise** and no change in the number of simulations between levels.

| Level | Name | Simulations | Temperature T |
|---|---|---|---|
| 1 | Easy | shared (≈200) | high (placeholder 2.0) |
| 2 | Medium | shared | placeholder 1.0 |
| 3 | Hard | shared | placeholder 0.25 |
| 4 | Master | shared | 0 (most-visited move) |

The values are **placeholders** until OthelloRL calibrates them on the 8×8 model (OthelloRL PLAN Step 5.7):
- the shared simulation count is the largest that keeps the worst-case move within the 2 s budget;
- the four temperatures are chosen from candidates {0, 0.25, 0.5, 1, 2, 4} so that each level beats the one below it at least 70% of the time.

The calibrated values are delivered in the model manifest (`models/oroletto-8x8.json`, fields `levels.sims` and `levels.ladder[].temperature`). They are read at runtime, not hard-coded.

- The AI must respond within **≤ 2 s per move** on a typical laptop at every level. Every level uses the same search, so they all cost the same.
- The rule-based bots from OthelloRL (random, greedy, heuristic, minimax) are **not** player levels. They are kept as test baselines and as stand-ins during development before the model is ready.
- Temperature applies only to the in-game move choice. Hints and the parity test use temperature 0.

### 3.4 Two Players (local)
- Hot-seat play on one screen: same board UI, no AI, optional names, Undo of one move, and a result dialog naming the winner.

### 3.5 Settings
- Show legal moves (on/off), animations (on/off / speed), sound effects (on/off), animations, default board size and difficulty. Settings persist between launches.

---

### 3.6 Look and design tokens
- One look, a **casino card room**: mahogany wood background and frames, burnished brass rims, **red velvet** button faces with brass rims and round icon buttons (Home, Undo, Hint, Resign, New game), a **green felt** board with grid lines (the same green velvet covers the scoreboard panels, option boxes and result dialog), flat-ish buttons with a thin 3D edge (tunable via `button_depth` and `button_bevel`), glossy black and white discs, a neon-sign title, a plain wood background lit only by an **RGB LED strip** round the window edge (individually coloured bulbs with their own glow, a colour pattern flowing clockwise, two interleaved sets twinkling like the board's marquee bulbs; no vignette or other effects), chasing marquee bulbs on the board frame, and a slow roulette wheel on the home screen.
- **Chip animations:** at the start of every game poker chips are thrown in from the bottom and sides, arc across the screen, land, bounce and fade (about 3 s, never blocks play). When someone wins, chips rain from the top while the result dialog is open (not when you lose to the computer).
- Every colour, texture and timing is a **design token** in the repo-root `design.md`. A Vite plugin turns them into CSS variables, reloads the dev app when the file changes, fails the build if the code uses an undefined token, and warns about unused ones. Textures live in `ui/public/textures/`.
- Board details: discs on a 3D rotor (drop on placement, flips that ripple outward from the new disc and rise as they turn), pulsing rings on legal squares, a frame on the last move.
- **Responsive layout:** every screen fits the window with no scrolling down to the minimum 480x600. The game screen is a grid whose board is sized from both the width and the height left over (so it is never cut off or too big); in wide windows (aspect ratio of 5:4 or wider) the board sits on the left and the scoreboard, controls and move list form a column on the right; the move list is dropped in very short windows. Notices (pass banner, errors) float over the page so they never move the board. Content keeps clear of the LED strip.
- All motion respects Settings > Animations and `prefers-reduced-motion`. Hints are rings and frames, not colour alone.

### 3.7 Web build
- A **single self-contained HTML page** (`web/othello.html`, built by `npm run build:web`) runs the same UI in a browser, for hosting on GitHub Pages or anywhere else. No server or network is needed.
- The UI talks to a backend through `ui/src/lib/api.ts`: inside Tauri that is the Rust engine; in a browser it is a **TypeScript port** of the engine and session (`ui/src/lib/engine/`), with settings in localStorage. The port is verified against the same golden data as the Rust engine and has the same session behaviour (automatic passes, undo rules, stale computer moves discarded).
- The browser build has no neural network, so its four levels are classic bots: random, greedy, alpha-beta depth 3, and time-limited iterative-deepening alpha-beta (about 0.9 s). Oroletto stays desktop-only unless an in-browser model runtime is added later.
- The page is generated: rebuild it after any UI or `design.md` change.

## 4. Architecture

```
┌──────────────────────────────┐
│ UI (iterated design)         │  screens, board rendering, animations, themes
└──────────────┬───────────────┘
               │  narrow command/event API (newGame, play, undo, aiMove, state)
┌──────────────▼───────────────┐
│ Game core                    │  bitboard engine, rules, history/undo, modes
├──────────────────────────────┤
│ AI                           │  rule-based bots · Oroletto (ONNX net + MCTS)
└──────────────────────────────┘
```

- **Separation:** the UI never implements rules. It sends commands and renders the state it receives. The UI can then be redesigned freely without touching the engine or the AI.
- **The AI runs off the UI thread**, can be cancelled (e.g. on Undo or New game), and reports progress for the thinking indicator.
- **8×8 only.** No other board sizes are supported (decided).

### 4.1 Technology — decided: Tauri 2 + Svelte
**[Tauri 2](https://tauri.app)**
- **Engine and AI in Rust:** bitboard engine, MCTS, and ONNX inference via the pure-Rust `tract-onnx` crate, so there is no native ML runtime to install.
- **UI in TypeScript + HTML/CSS** (framework: **Svelte**), so the design can be iterated with ordinary web tools.
- **Why:**
  - small native binaries (~10–20 MB) for all three OSes;
  - fast MCTS in Rust;
  - the UI is just web code, the fastest stack for repeated design iteration.
- **Build prerequisites:** the Rust toolchain (rustup) and Node.js. On Linux, also the system WebView libraries (`libwebkit2gtk-4.1-dev` and friends), which need `sudo apt install`.

**Alternative: Python + PySide6 (Qt/QML), packaged with PyInstaller.**
- **Pros:** reuses OthelloRL's Python engine and MCTS almost unchanged; Oroletto runs through `onnxruntime`; no sudo needed to build on Linux.
- **Cons:** larger binaries (~150 MB); UI iteration in QML rather than web tech; slower MCTS (fine up to a few hundred simulations).

### 4.2 Oroletto model contract
- OthelloRL exports **only the strongest 8×8 model** to **ONNX** (`scripts/export_onnx.py`). It is shipped in this repo as `models/oroletto-8x8.onnx` (~1.8 MB; 6 residual blocks × 64 channels), together with a JSON manifest. If a later OthelloRL training seed is stronger head-to-head, it *replaces* this file; there is never more than one model.
- **Input:** `float32[batch, 3, n, n]`, with planes (own discs, opponent discs, legal moves) from the side to move.
- **Outputs:** `policy_logits float32[batch, n*n+1]` (last index = pass); `value float32[batch]` in [−1, 1] for the side to move.
- **The manifest** (`models/oroletto-8x8.json`) records: board size; input layout (planes, side-to-move perspective, square index, pass index); output shapes; search settings (`c_puct = 1.5`, move choice by N^(1/T), value negated each ply); the **levels** (`sims` shared by all levels, plus one temperature per level, and `levels_calibrated`); network size and training games; OthelloRL commit hash and run id (e.g. `results/alphazero_8x8/seed0`); the ONNX-vs-PyTorch check; and a SHA-256 of the ONNX file.
- **Search parity:** the app's MCTS matches OthelloRL's (PUCT, values negated each ply, ties in selection broken by the first move in legal-move order). OthelloRL ships fixtures in `tests/golden/parity_8x8.json`: for 50 positions, the network's policy logits and value, and the **exact root visit counts** after 16, 64 and 200 simulations. Search without noise is deterministic, so the app must reproduce the visit counts exactly; only the final choice among equally visited moves is random. Temperature (§3.3) is applied after the search and is not part of the parity test.

---

### 4.3 UI ↔ engine API (crate `othello-api`, no Tauri dependency)
The Tauri shell only forwards these to a `Session`; the logic is testable without a UI. Types are serde JSON with snake_case names.

**Commands** (each returns the new `Snapshot` or an `ApiError {code, ...}`):
- `new_game(mode)`: `mode` is `{kind:"vs_computer", difficulty:1..4, human:"black"|"white"|"random"}` or `{kind:"two_players", black_name?, white_name?}`.
- `play(square)`: a placement, square 0–63 (`a1` = 0). Passes are never sent by the UI.
- `undo()`: two-player undoes one move; vs computer undoes your move and the reply. Automatic passes go with them. A computer search in progress is cancelled.
- `resign()`: you lose vs the computer; in two-player mode the side to move loses.
- `hint()`: a suggested square, vs computer on your turn only (blocking; the app calls it off the UI thread).
- `snapshot()`: the current state, e.g. after a reload.
- Settings are a `Settings` struct (`show_legal_moves`, `animations`, `sound`, `theme`, `default_difficulty`, `default_human_side`) loaded from and saved to a JSON file by the shell.

**Snapshot:** `board` (64 cells: 0 empty, 1 black, 2 white), `to_move`, `awaiting` (`human`|`computer`|`nobody`), `legal` (squares the human may play; empty while the computer thinks), `last_move`, `flipped` (for the flip animation), disc counts, `status` (`playing` or `over{winner, resigned}`; no winner is a draw), resolved `mode`, `can_undo`, `ply`, `history` (move names).

**Events** (pushed to the UI): `state_changed{snapshot}`, `passed{side}` (sent before the `state_changed` that follows, for the pass banner), `thinking{progress}`, `game_over{winner, resigned, black, white}`.

**Behaviour that is part of the contract:**
- Forced passes are played automatically and always announced with `passed`; they are never silent and never need a click.
- The computer runs on a worker thread through an `Engine` trait with a cancellation flag and progress reporting. A move that finishes after an undo, new game or resignation is discarded.
- Events are emitted after the internal lock is released.
- There is no separate `cancel_ai` command: cancellation happens implicitly on undo, new game and resign.
- Until Oroletto lands (M4), levels use placeholder bots: level 1 random, levels 2–4 greedy.

## 5. Non-functional requirements
- **Performance:** UI at 60 fps during animations; AI move ≤ 2 s; cold start ≤ 2 s.
- **Offline:** no network access at any time.
- **Portability:** builds and runs on Linux (x86_64), macOS (arm64 + x86_64), Windows 10/11 (x86_64).
- **Accessibility:** keyboard play; colour choices that don't rely on colour alone (black/white discs plus outline markers for hints); scalable UI.
- **Reliability:** no rule bugs; the AI never makes an illegal move (enforced by tests).

---

## 6. Repository layout (proposed, Tauri)
```
Othello-Player/
  SPEC.md            this document
  README.md          what it is + build instructions
  models/            oroletto-8x8.onnx + manifest
  core/              Rust crate: engine, bots, MCTS, ONNX inference (UI-independent)
  app/               Tauri shell (Rust) wiring core ↔ UI commands
  ui/                TypeScript front-end (screens, board, themes)
  tests/golden/      reference data generated from OthelloRL (engine_8x8.json)
  tools/             make_golden.py (regenerates the golden data; see requirements.txt)
  requirements.txt   Python tooling deps only
  .github/workflows/ CI: test + build release binaries for 3 OSes
```

## 7. Testing and quality
- **Engine:** perft (8×8), forced pass, double-pass end, full-board draw, and dihedral symmetry; cases mirrored from OthelloRL's test suite.
- **Bots:** heuristic and minimax match OthelloRL's choices on fixed positions (deterministic tie-break in test mode).
- **Oroletto:** ONNX outputs match PyTorch outputs within 1e-5 on sample positions, plus the search-parity test (§4.2).
- **App:** UI smoke tests for each screen; a full scripted game in each mode.
- **CI:** every push runs the tests; tagged releases build installable binaries for all three OSes.

## 8. Open decisions ❓
1. ~~**Technology stack**~~ — **decided: Tauri 2 + Svelte.**
2. ~~**Board sizes**~~ — **decided: 8×8.** The engine supports 8×8 only. The 8×8 Oroletto is being trained in OthelloRL (Phase 5). It will be exported and copied into `models/` when ready. Until then development uses the rule-based bots as stand-ins.
3. ~~**Difficulty ladder**~~ — **decided: 4 levels, one model (the strongest), weakened only by move temperature**, with a shared simulation count and no root noise (§3.3). The values are calibrated in OthelloRL and delivered in the manifest.
4. **Design process:** start from a few static mock-ups (home + game screen, light/dark) for you to choose from before building the real UI?
5. **Distribution:** source-only builds for now, or also GitHub Releases with prebuilt binaries? Also code signing for macOS/Windows (later).
6. ~~**Licence**~~ — **decided: MIT** (`LICENSE`).
7. ~~**GitHub**~~ — **decided:** [`palakraisinghani/O-Rolleto-PlayOthello`](https://github.com/palakraisinghani/O-Rolleto-PlayOthello).

## 9. Milestones
**Phase A — Backend + API, with a plain throwaway UI** (goal: freeze the command/event API)
1. **M0 — Decisions:** close §8 (remaining: mock-ups, distribution). The Oroletto ONNX export from OthelloRL happens when the 8×8 model is ready (not blocking).
2. **M1 — Core:** 8×8 engine + rule-based bots (test baselines and dev stand-ins) + rules tests (cross-checked against OthelloRL).
3. **M2 — API:** `othello-api` crate (done: commands, events, session, AI worker thread with cancellation, settings; see §4.3), then the thin Tauri shell around it; **API frozen when the shell lands**.
4. **M3 — Plain UI:** unstyled board, counts, pass banner, undo, settings, result; scripted full game in each mode.
5. **M4 — Oroletto in the app:** ONNX inference + MCTS + move temperature, with the parity tests against `tests/golden/parity_8x8.json`. The four levels read the shared `sims` and the per-level temperatures from the manifest, as calibrated by OthelloRL.

**Phase B — Design** (no engine or API changes)
6. **M5 — Design iterations:** first pass done (casino card-room look, chip animations, design tokens; see §3.6); remaining: tuning with `design.md`, How-to-Play illustrations, sound.
7. **M6 — Release:** README build guide, CI, release binaries.

**Post-v1 (not committed)**
8. **Online play:** play a friend on another computer via room code and a small relay server. The engine will have a `Player` abstraction (Human, AI, later Remote) so this needs no API redesign.
