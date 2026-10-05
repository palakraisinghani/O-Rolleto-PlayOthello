# Othello Player — Specification

A desktop application for playing Othello on your own machine. You can play against the computer at several difficulty levels, with the hardest levels played by **Oroletto**, the AlphaZero-style agent trained in the companion research repo [OthelloRL](../OthelloRL). Two people can also play each other on the same computer.

The user interface will be designed in iterations, so the architecture keeps the **UI layer cleanly separate** from the game engine and the AI.

Status: **draft v0.1** — sections marked ❓ need a decision before implementation starts.

---

## 1. Goals and non-goals

**Goals (v1)**
- A real, self-contained **application binary** that anyone can **build from source** on Linux, macOS and Windows. It runs offline, with no Python or ML framework installed.
- A polished, responsive UI that is easy to restyle and iterate on.
- **Play vs Computer** at graded difficulty levels, with Oroletto behind the hardest ones.
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
- Board sizes: **6×6** and **8×8** ❓ (see §8.2). Standard start position; **Black moves first**.
- Legal-move generation, flipping in all 8 directions, **forced pass** when a player has no legal move (shown clearly, never silent), game ending after two consecutive passes or a full board, and disc counts.
- The engine must reproduce OthelloRL's results exactly: perft counts on 8×8 (depth 1–6: 4, 12, 56, 244, 1396, 8200) and the 6×6 rules cases from OthelloRL's test suite.

### 3.2 Game screen
- Board with discs, coordinates (a–h / 1–8), **legal-move hints** (toggleable), **last-move highlight**, and **flip animation**.
- Live disc counts and a whose-turn indicator. In vs-Computer mode, a "thinking…" indicator while the AI moves.
- **Pass banner** ("White has no legal move — Black plays again").
- Controls: **Undo** (vs Computer: undoes your move and the AI's reply; Two Players: one move), **New game**, **Hint** (vs Computer only; optional, uses Oroletto), **Resign**.
- Move list / history panel (optional in v1, desirable).
- Input: mouse/touch click on a square; keyboard navigation (arrows + Enter) for accessibility.

### 3.3 Play vs Computer — difficulty levels
The rule-based levels port the bots from OthelloRL (same evaluation weights). Oroletto plays the harder levels. Its strength is controlled by the number of MCTS simulations, so the same network gives a smooth range of difficulty.

| Level | Name | Engine | Approx. strength (from the OthelloRL report, 6×6) |
|---|---|---|---|
| 1 | Beginner | random legal moves | — |
| 2 | Easy | greedy disc-count bot | barely above random |
| 3 | Medium | tuned heuristic bot (corners 50, mobility 5, discs 1, X-squares −25) | beats random ~90% |
| 4 | Hard | **Oroletto, network only** (no search) | ~level with minimax depth 4 |
| 5 | Expert | **Oroletto + MCTS, 64 simulations** | beats minimax-d4 ~78% |
| 6 | Master | **Oroletto + MCTS, 400 simulations** | stronger still (not yet measured) |

- The AI must respond within **≤ 2 s per move** on a typical laptop at every level. Each level's simulation count is a setting, tuned against this target.
- Small amounts of randomness (tie-breaking, optional low temperature on easy levels) keep games varied.
- ❓ Level names and the exact level-to-engine mapping (§8.3).

### 3.4 Two Players (local)
- Hot-seat play on one screen: same board UI, no AI, optional names, Undo of one move, and a result dialog naming the winner.

### 3.5 Settings
- Show legal moves (on/off), animations (on/off / speed), sound effects (on/off), theme (light / dark / board style), default board size and difficulty. Settings persist between launches.

---

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
- **Board size is a parameter everywhere**, as in OthelloRL.

### 4.1 Proposed technology ❓ (see §8.1)
**Proposal: [Tauri 2](https://tauri.app)**
- **Engine and AI in Rust:** bitboard engine, MCTS, and ONNX inference via the pure-Rust `tract-onnx` crate, so there is no native ML runtime to install.
- **UI in TypeScript + HTML/CSS** (framework: React or Svelte ❓), so the design can be iterated with ordinary web tools.
- **Why:**
  - small native binaries (~10–20 MB) for all three OSes;
  - fast MCTS in Rust;
  - the UI is just web code, the fastest stack for repeated design iteration.
- **Build prerequisites:** the Rust toolchain (rustup) and Node.js. On Linux, also the system WebView libraries (`libwebkit2gtk-4.1-dev` and friends), which need `sudo apt install`.

**Alternative: Python + PySide6 (Qt/QML), packaged with PyInstaller.**
- **Pros:** reuses OthelloRL's Python engine and MCTS almost unchanged; Oroletto runs through `onnxruntime`; no sudo needed to build on Linux.
- **Cons:** larger binaries (~150 MB); UI iteration in QML rather than web tech; slower MCTS (fine up to a few hundred simulations).

### 4.2 Oroletto model contract
- OthelloRL exports Oroletto to **ONNX**, with a new export script to be added there. The file is shipped in this repo under `models/` (~1.2 MB), together with a JSON manifest.
- **Input:** `float32[batch, 3, n, n]`, with planes (own discs, opponent discs, legal moves) from the side to move.
- **Outputs:** `policy_logits float32[batch, n*n+1]` (last index = pass); `value float32[batch]` in [−1, 1] for the side to move.
- **The manifest** (`models/oroletto-6x6.json`) records: board size, planes, `c_puct = 1.5`, default simulations per level, OthelloRL commit hash and run id (`results/alphazero/seed1`), and a SHA-256 of the ONNX file.
- **Search parity:** the app's MCTS matches OthelloRL's (PUCT, no root noise, greedy move by visit count, values negated each ply). A parity test checks that, for a fixed set of positions, the Rust/app search picks the same moves as OthelloRL's Python search with the same seed and simulation count (allowing ties).

---

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
  models/            oroletto-6x6.onnx + manifest
  core/              Rust crate: engine, bots, MCTS, ONNX inference (UI-independent)
  app/               Tauri shell (Rust) wiring core ↔ UI commands
  ui/                TypeScript front-end (screens, board, themes)
  tests/             cross-checks against OthelloRL reference data
  .github/workflows/ CI: test + build release binaries for 3 OSes
```

## 7. Testing and quality
- **Engine:** perft (8×8), forced pass, double-pass end, full-board draw, and dihedral symmetry; cases mirrored from OthelloRL's test suite.
- **Bots:** heuristic and minimax match OthelloRL's choices on fixed positions (deterministic tie-break in test mode).
- **Oroletto:** ONNX outputs match PyTorch outputs within 1e-5 on sample positions, plus the search-parity test (§4.2).
- **App:** UI smoke tests for each screen; a full scripted game in each mode.
- **CI:** every push runs the tests; tagged releases build installable binaries for all three OSes.

## 8. Open decisions ❓
1. **Technology stack:** Tauri (Rust + web UI, recommended) vs PySide6/QML (Python). Also the front-end framework if Tauri: React or Svelte.
2. **Board sizes:** Oroletto is trained on **6×6 only**. Options:
   - (a) v1 offers 6×6 only;
   - (b) offer 8×8 with rule-based levels only, until the 8×8 model from OthelloRL Phase 6 exists;
   - (c) offer 8×8 with minimax as the hard levels for now.
3. **Difficulty ladder:** level names and the engine behind each (§3.3), including whether Hard uses the network alone or a small search.
4. **Design process:** start from a few static mock-ups (home + game screen, light/dark) for you to choose from before building the real UI?
5. **Distribution:** source-only builds for now, or also GitHub Releases with prebuilt binaries? Also code signing for macOS/Windows (later).
6. **Licence** for the repo.
7. **GitHub:** repository name/visibility. The local repo is ready; the remote has not been created.

## 9. Milestones
1. **M0 — Decisions:** close §8, finalise the stack, export Oroletto to ONNX from OthelloRL.
2. **M1 — Core:** engine + bots + rules tests (cross-checked against OthelloRL).
3. **M2 — Oroletto in the app:** ONNX inference + MCTS + parity tests; difficulty ladder tuned to the 2 s budget.
4. **M3 — First playable UI:** home, game screen, both modes, pass/end handling, settings.
5. **M4 — Design iterations:** visual design, animations, themes, How-to-Play.
6. **M5 — Release:** README build guide, CI, release binaries.
