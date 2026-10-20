# Othello Player — Specification

Othello as a desktop application, an Android app and a website. You can play against the computer at four difficulty levels, all played by **Oroletto**, the AlphaZero-style agent trained in the companion research repo [OthelloRL](../OthelloRL); play **Buddy**, which learns your level and plays slightly stronger than you (§3.9); or play a friend on the same device.

The user interface will be designed in iterations, so the architecture keeps the **UI layer cleanly separate** from the game engine and the AI.

Status: **v0.3**. Decided: Tauri + Svelte, 8×8 board, four levels from one model weakened only by move temperature, Oroletto in the browser and Android through ONNX Runtime Web and a TypeScript search, Buddy, GitHub Pages and Android sideloading for distribution (no iOS). **Built:** everything in §3 on the website and Android; on the desktop the UI, API and shell, with placeholder bots until the Rust search lands (M4).

---

## 1. Goals and non-goals

**Goals (v1)**
- A real, self-contained **application binary** that anyone can **build from source** on Linux, macOS and Windows. It runs offline, with no Python or ML framework installed.
- A polished, responsive UI that is easy to restyle and iterate on.
- **Play vs Computer** at four difficulty levels, all played by Oroletto (weakened by move temperature on the lower levels).
- **Two-player (local, same screen)** mode.
- Correct rules in every situation, including forced passes, double-pass endings and full boards.
- **Play Buddy** and **My Progress** (§3.9).
- An **Android app** (a downloadable `.apk`) and a **website** on GitHub Pages, both playing Oroletto in the web view (§3.8).

**Non-goals (v1)**
- Online or networked multiplayer, accounts, matchmaking, ratings.
- Training or modifying models inside the app; models are produced in OthelloRL and shipped as files.
- An iOS app (it would need a paid Apple developer account; the Android app is the mobile target).
- Distribution through app stores (the Android `.apk` is published on GitHub Releases).

---

## 2. Users and core flows

1. **Launch** → home screen with: *Play vs Computer*, *Play Buddy* and *My Progress* (builds with Oroletto), *Two Players*, *How to Play*, *Settings*.
2. **Play vs Computer** → choose difficulty, your colour (Black / White / Random) and board size → game screen.
3. **Two Players** → optional player names, board size → game screen. Players take turns on the same device.
4. **Game screen** → play to the end → result dialog (score, winner) → *Rematch*, *Swap colours* or *Home*.
5. **Play Buddy** → pick your colour (Buddy's level shown) → game screen; the result dialog shows your measured level. **My Progress** shows the trajectory.
6. **How to Play** → short guide with pictures drawn from the real board: trapping and flipping, any direction, passing, winning, the Tip button, legal-move rings.

---

## 3. Functional requirements

### 3.1 Board and rules
- Board size: **8×8 only** (decided). Standard start position; **Black moves first**.
- Legal-move generation, flipping in all 8 directions, **forced pass** when a player has no legal move (shown clearly, never silent), game ending after two consecutive passes or a full board, and disc counts.
- The engine is **8×8 only** (no other sizes) and must reproduce OthelloRL exactly, as checked against `tests/golden/engine_8x8.json`: perft counts (depth 1–7: 4, 12, 56, 244, 1396, 8200, 55092), forced-pass / double-pass / full-board cases, and 100 seeded random games with legal moves and resulting positions at every ply.
- **Conventions** (same as OthelloRL, since the model layout depends on them): square `(row, col)` = index `row*8 + col`, `a1` = 0 top-left, `h8` = 63, pass = 64; start position white d4/e5, black e4/d5; Black moves first.

### 3.2 Game screen
- Board with discs, coordinates (a–h along the top and bottom, 1–8 down both sides; shown during play and in the review, in a band inside the marquee bulbs so the lights are the outermost ring), **legal-move rings** (Easy level only, toggleable in Settings), **last-move highlight**, and **flip animation**.
- Live disc counts and a whose-turn indicator. In vs-Computer mode, a "thinking…" indicator while the AI moves.
- **Pass banner** ("White has no legal move — Black plays again").
- Controls: **New game**, **Tip**, **Resign**. There is **no Undo button** (the backend `undo` command still exists but the UI does not use it). The **Tip** button (the dealer's best-move suggestion, called `hint` in the code and API) is limited per game and only on the lower levels: **5 on Easy, 3 on Medium**, none on Hard, Master or Two Players; the Tip button shows how many are left. Legal-move rings are shown on **Easy only** (never on other levels or in Two Players).
- Move list / history panel (optional in v1, desirable).
- Input: mouse/touch click on a square; keyboard navigation (arrows + Enter) for accessibility.

### 3.3 Play vs Computer — difficulty levels
**Four levels, one model, one knob.** Every level is played by the same network, **the strongest 8×8 Oroletto model**, with the **same MCTS search budget**. Levels differ **only in the move temperature T**:
- After searching, the move is sampled from the root visit counts with probability ∝ N^(1/T).
- **T = 0** plays the most-visited move (full strength). **Higher T** spreads probability over the other moves the search visited, so play becomes more varied and makes more mistakes.
- There is **no root noise** and no change in the number of simulations between levels.

| Level | Name | Simulations | Temperature T |
|---|---|---|---|
| 1 | Easy | 200 (shared) | 8 |
| 2 | Medium | 200 | 2 |
| 3 | Hard | 200 | 1 |
| 4 | Master | 200 | 0 (most-visited move) |

These are the **calibrated values** from OthelloRL (`levels_calibrated: true` in the manifest), chosen so that each level beats the one below it:
- the shared simulation count is the largest that keeps the worst-case move within the 2 s budget;
- the four temperatures come from candidates {0, 0.25, 0.5, 1, 2, 4, 8}.

The calibrated values are delivered in the model manifest (`models/oroletto-8x8.json`, fields `levels.sims` and `levels.ladder[].temperature`). They are read at runtime, not hard-coded.

- The AI must respond within **≤ 2 s per move** on a typical laptop at every level. Every level uses the same search, so they all cost the same.
- The rule-based bots from OthelloRL (random, greedy, heuristic, minimax) are **not** player levels. They are kept as test baselines, as the placeholder computer in the desktop app until the Rust search lands (M4), and as the fallback when the model cannot load in the web or Android build.
- Temperature applies only to the in-game move choice. Tips and the parity test use temperature 0.

### 3.4 Two Players (local)
- Hot-seat play on one screen: same board UI, no AI, optional names, no undo, no tips or legal-move rings, and a result dialog naming the winner.

### 3.5 Settings
- Show legal moves (on/off; only has an effect on Easy), animations (on/off / speed), sound effects (on/off), animations, default board size and difficulty. Settings persist between launches.

---

### 3.6 Look and design tokens
- One look, a **casino card room**: mahogany wood background and frames, burnished brass rims, **red velvet** button faces with brass rims and round icon buttons (Home, Tip, Resign, New game), a **green felt** board with grid lines (the same green velvet covers the scoreboard panels, option boxes and result dialog), flat-ish buttons with a thin 3D edge (tunable via `button_depth` and `button_bevel`), glossy black and white discs, a neon-sign title, a plain wood background lit only by an **RGB LED strip** round the window edge (individually coloured bulbs with their own glow, a colour pattern flowing clockwise, two interleaved sets twinkling like the board's marquee bulbs; no vignette or other effects), chasing marquee bulbs on the board frame, and a slow roulette wheel on the home screen.
- **Chip animations:** at the start of every game a ring of poker chips (144 by default) rushes in from beyond the edges to the middle, then flies straight back out, **once** and fairly slowly (about 4 s in all, never blocks play; chip count, number of bursts and timing are tokens). When someone wins, chips rain from the top while the result dialog is open (not when you lose to the computer).
- Every colour, texture and timing is a **design token** in the repo-root `design.md`. A Vite plugin turns them into CSS variables, reloads the dev app when the file changes, fails the build if the code uses an undefined token, and warns about unused ones. Textures live in `ui/public/textures/`.
- Board details: discs on a 3D rotor (drop on placement, flips that ripple outward from the new disc and rise as they turn), pulsing rings on legal squares, a frame on the last move.
- **Responsive layout:** every screen fits the window with no scrolling down to the minimum 480x600. The game screen is a grid whose board is sized from both the width and the height left over (so it is never cut off or too big); in wide windows (aspect ratio of 5:4 or wider) the board sits on the left and the scoreboard, controls and move list form a column on the right; the move list is dropped in very short windows. Notices (pass banner, errors) float over the page so they never move the board. Content keeps clear of the LED strip.
- All motion respects Settings > Animations and `prefers-reduced-motion`. Hints are rings and frames, not colour alone.

### 3.7 Game review and the dealer
- **Review (vs computer only).** The result dialog offers "Review game": the finished game is replayed from the first move to the last (buttons, arrow keys, Home/End, a strip of your moves, "Next miss"). Each of your moves gets a verdict against the computer's own ranking of the moves from that position: **best** (its first choice), **good** (in its **top-3** moves, or inside the **top-p = 0.2** probability nucleus), **missed** (neither), or **forced** (only legal move; not scored). Board badges mark your move and the computer's favourite squares; a summary shows the share of your moves that matched. Passes and the computer's moves are replayed but not judged.
- The ranking comes from a pluggable analyzer (`ui/src/lib/engine/review.ts`). Until Oroletto is wired in it is the web build's alpha-beta search (every legal move scored at depth 4, exact in the last 6 squares) turned into probabilities with a softmax; with Oroletto it becomes the MCTS root visit shares, and nothing else changes. k, p and the softmax temperature are constants in that file. **Current state:** the review still uses the alpha-beta analyzer in every build, including those that carry Oroletto; switching it to Oroletto's visit shares is a small change not yet made.
- **Orolleto**, the card-room dealer (an SVG character in a green eyeshade and red bow tie, coloured by `design.md` section 21), greets you on the home screen, comments during games against the computer (thinking, corners, big flips, passes, the result) and comments on each reviewed move. He draws on a pool of about 450 kind, welcoming lines grouped by situation and by page (`ui/src/lib/dialogues.ts`); against the computer he is the opponent across the table (named Orolleto on the scoreboard). Two knobs in `ui/src/lib/dealer.ts` control how much he talks: **chattiness** (default 0.55: the chance he remarks on an ordinary move; corners and big flips are 1.6x as likely) and the **hold** (default 6 plies: a line stays up at least that long before an ordinary remark replaces it; corners, big flips, passes, hints, undo and the end of a game speak up at once). He never repeats a line he said recently. His moods (idle, thinking, happy, sad) and his animations obey Settings > Animations.
- **Reloads are harmless:** the page you are on is remembered for the session, and in the desktop app a running game is picked up again from the engine, so a reload of the window (the dev server does that when files change) does not throw you back to the home screen. The web build keeps its game in the page, so a reload there ends the game.

### 3.9 Buddy (adaptive opponent) and My Progress
- A third way to play next to *vs Computer* and *Two Players*: **Play Buddy**. It needs Oroletto, so it is offered only in builds that carry the model (the Android app and the GitHub Pages site; not the single-file page, and not the desktop app until its search is built in Rust).
- **Skill** is a number in [0, 1] tied to the move temperature: `skill = 1 − ln(1+T) / ln(1+T_MAX)` with `T_MAX = 8`, so 1 is Master (T = 0) and 0 is random-like.
- **Measuring a game** (`ui/src/lib/engine/buddy.ts`, `buddy-analysis.ts`): after every game against the computer or Buddy (also a resigned one with ≥ 5 informative moves), each move you chose (forced moves skipped, the last 6 squares count half) is compared with Oroletto's search (100 simulations) visit counts. A player of skill s picks move i with probability ∝ (Nᵢ + 0.5)^(1/T(s)); your game's skill is the posterior mean over s (flat prior) with its standard deviation.
- **Trajectory:** a Kalman filter over games (random-walk drift 0.0008 per game, and 0.02 of extra noise on every game's measurement because one game is a poor sample of how you play; a first game moves the level about 60% of the way to its measurement, an established level about 15%) combines each game's measurement with the running estimate, weighted by how sure each is, so it follows you as you improve. Per-game records (date, opponent, result, skill, running level; last 300) are stored on the device (localStorage). **My Progress** shows your level, Buddy's level, a chart and the recent games, with a reset.
- **Buddy's play:** the same search, choosing among its moves with the *same* temperature model used for measuring, at skill `your level + 0.06` (slightly **stronger** than you, capped at 1). It re-tunes after every game, so a Rematch is already adjusted. No tips and no legal-move rings against Buddy. The result dialog shows your new level and the change.
- **On the website** (GitHub Pages, static files only) everything runs in the visitor's browser and **nothing is stored**: progress lasts for the session (in memory). My Progress shows "Your level to remember"; in a new session you type that number into **Start from my level** (Play Buddy or My Progress) and Buddy carries on from there. The Android app keeps the trajectory on the device instead.
- Tested by simulation (`buddy.test.ts`: synthetic players recovered, the profile follows an improving player, Buddy stays ahead) and with the real network (`buddy-analysis.test.ts`: games played by Oroletto at skills 0.1 / 0.5 / 1.0 are measured in that order).

### 3.8 Web build
- A **single self-contained HTML page** (`web/othello.html`, built by `npm run build:web`; classic bots only, for embedding anywhere). The **GitHub Pages site** in `docs/` is a separate, multi-file build (`npm run build:site`: the page plus `oroletto/` with the 1.8 MB model, and the ~14 MB WebAssembly runtime, about 4 MB over the wire), where **every level is Oroletto** and Buddy and My Progress work runs the same UI in a browser, for hosting on GitHub Pages or anywhere else. No server or network is needed.
- The UI talks to a backend through `ui/src/lib/api.ts`: inside Tauri that is the Rust engine; in a browser it is a **TypeScript port** of the engine and session (`ui/src/lib/engine/`), with settings in localStorage. The port is verified against the same golden data as the Rust engine and has the same session behaviour (automatic passes, undo rules, stale computer moves discarded).
- **Oroletto in the browser** (Pages site and Android): `ui/src/lib/engine/oroletto.ts` is a TypeScript port of OthelloRL's PUCT search (c_puct 1.5, values negated each ply, `sqrt(N+1)` in the exploration term) running the ONNX model through `onnxruntime-web` (`oroletto-ort.ts`, lazily loaded). The search reproduces the exact root visit counts of `tests/golden/parity_8x8.json` for all 50 positions at 16, 64 and 200 simulations (`oroletto.test.ts`). Shared simulations and per-level temperatures come from the manifest. If the model cannot load, the session falls back to classic bots.
- The single-file page (`web/othello.html`) has no model, so its four levels are classic bots: random, greedy, alpha-beta depth 3, and time-limited iterative-deepening alpha-beta (about 0.9 s).
- **Android** (`mobile/`, Capacitor): the same build as the site (`npm run build:mobile`) in a native shell, progress kept on the device, min Android 7.0, debug-signed `.apk`. `.github/workflows/android.yml` builds it and attaches it to a GitHub Release when a `v*` tag is pushed. Built and tested on an Android 14 emulator (a full game against Buddy, progress kept across restarts).
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
- **The AI runs off the UI thread**, can be cancelled (e.g. on New game), and reports progress for the thinking indicator.
- **8×8 only.** No other board sizes are supported (decided).

### 4.1 Technology — decided: Tauri 2 + Svelte
**[Tauri 2](https://tauri.app)**
- **Engine and AI in Rust:** bitboard engine, MCTS, and ONNX inference via the pure-Rust `tract-onnx` crate, so there is no native ML runtime to install.
- **UI in TypeScript + HTML/CSS** (framework: **Svelte**), so the design can be iterated with ordinary web tools.
- **Why:**
  - small native binaries (~10–20 MB) for all three OSes;
  - fast MCTS in Rust;
  - the UI is just web code, the fastest stack for repeated design iteration.
- **Web and Android** use the same UI over a **TypeScript port** of the engine and session instead of the Rust one (§3.8): the network runs in the web view with `onnxruntime-web`, and Android is the web build in a Capacitor shell. This is how Oroletto reached phones and the website before the Rust search exists. The desktop app will get Oroletto through the Rust path above (M4).
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
- `new_game(mode)`: `mode` is `{kind:"vs_computer", difficulty:1..4, human:"black"|"white"|"random"}` `{kind:"vs_buddy", human, temperature}` (the UI computes Buddy's temperature from your profile; web/Android sessions only, `buddy_unavailable` without a model) or `{kind:"two_players", black_name?, white_name?}`.
- `play(square)`: a placement, square 0–63 (`a1` = 0). Passes are never sent by the UI.
- `undo()`: two-player undoes one move; vs computer undoes your move and the reply. Automatic passes go with them. A computer search in progress is cancelled.
- `resign()`: you lose vs the computer; in two-player mode the side to move loses.
- `hint()`: the best square Oroletto sees, vs computer on your turn only (blocking; the app calls it off the UI thread). The UI calls it the **Tip** button, limited per game by level (§3.2). `undo()` still exists in the API but the UI has no Undo button.
- `snapshot()`: the current state, e.g. after a reload.
- Settings are a `Settings` struct (`show_legal_moves`, `animations`, `sound`, `theme`, `default_difficulty`, `default_human_side`) loaded from and saved to a JSON file by the shell.

**Snapshot:** `board` (64 cells: 0 empty, 1 black, 2 white), `to_move`, `awaiting` (`human`|`computer`|`nobody`), `legal` (squares the human may play; empty while the computer thinks), `last_move`, `flipped` (for the flip animation), disc counts, `status` (`playing` or `over{winner, resigned}`; no winner is a draw), resolved `mode`, `can_undo`, `ply`, `history` (move names).

**Events** (pushed to the UI): `state_changed{snapshot}`, `passed{side}` (sent before the `state_changed` that follows, for the pass banner), `thinking{progress}`, `game_over{winner, resigned, black, white}`.

**Behaviour that is part of the contract:**
- Forced passes are played automatically and always announced with `passed`; they are never silent and never need a click.
- The computer runs on a worker thread through an `Engine` trait with a cancellation flag and progress reporting. A move that finishes after an undo, new game or resignation is discarded.
- Events are emitted after the internal lock is released.
- There is no separate `cancel_ai` command: cancellation happens implicitly on undo, new game and resign.
- In the desktop (Rust) backend, until Oroletto lands (M4), levels use placeholder bots: level 1 random, levels 2–4 greedy. The TypeScript backend (web, Android) plays Oroletto, and the classic bots when no model is loaded. The Rust API does not know `vs_buddy` yet.

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
  mobile/            Android app (Capacitor project, icons, README)
  docs/              the GitHub Pages site (built by `npm run build:site`)
  web/               the single-file page and the play-button snippet
  core/              Rust crate: engine, bots, MCTS, ONNX inference (UI-independent)
  app/               Tauri shell (Rust) wiring core ↔ UI commands
  ui/                TypeScript front-end (screens, board, themes)
  tests/golden/      reference data generated from OthelloRL (engine_8x8.json)
  tools/             make_golden.py (regenerates the golden data; see requirements.txt)
  requirements.txt   Python tooling deps only
  .github/workflows/ android.yml builds the .apk on a version tag; desktop CI (test + release binaries for 3 OSes) still to do
```

## 7. Testing and quality
- **Engine:** perft (8×8), forced pass, double-pass end, full-board draw, and dihedral symmetry; cases mirrored from OthelloRL's test suite.
- **Bots:** heuristic and minimax match OthelloRL's choices on fixed positions (deterministic tie-break in test mode).
- **Oroletto:** ONNX outputs match PyTorch outputs within 1e-5 on sample positions, plus the search-parity test (§4.2).
- **TypeScript engine** (`npm test`, 76 tests): the same golden file as Rust, sessions (automatic passes, stale replies, Buddy mode), bots, review, **Oroletto parity** (exact visit counts for 50 positions × 3 simulation counts), **Buddy** (synthetic players recovered, the trajectory follows an improving player, real-network games measured in order of skill, carrying a level over).
- **App:** UI smoke tests for each screen; a full scripted game in each mode (`npm run test:web` for the single-file page). The phone build was also driven in headless Chrome and on an Android 14 emulator (full game against Buddy, progress kept after a restart).
- **CI:** tagged releases (`v*`) build the Android `.apk` (`.github/workflows/android.yml`); running the tests on every push and desktop binaries for three OSes are still to do.

## 8. Open decisions ❓
1. ~~**Technology stack**~~ — **decided: Tauri 2 + Svelte.**
2. ~~**Board sizes**~~ — **decided: 8×8.** The engine supports 8×8 only. The 8×8 Oroletto is being trained in OthelloRL (Phase 5). It will be exported and copied into `models/` when ready. Until then development uses the rule-based bots as stand-ins.
3. ~~**Difficulty ladder**~~ — **decided: 4 levels, one model (the strongest), weakened only by move temperature**, with a shared simulation count and no root noise (§3.3). The values are calibrated in OthelloRL and delivered in the manifest.
4. **Design process:** start from a few static mock-ups (home + game screen, light/dark) for you to choose from before building the real UI?
5. ~~**Distribution**~~ — **decided:** the website on GitHub Pages (`docs/`) and the Android `.apk` on GitHub Releases, no store and no developer account (so no iOS). Desktop: source builds for now; signed binaries later.
6. ~~**Licence**~~ — **decided: MIT** (`LICENSE`).
7. ~~**GitHub**~~ — **decided:** [`palakraisinghani/O-Rolleto-PlayOthello`](https://github.com/palakraisinghani/O-Rolleto-PlayOthello).

## 9. Milestones
**Phase A — Backend + API, with a plain throwaway UI** (goal: freeze the command/event API)
1. **M0 — Decisions:** close §8 (remaining: mock-ups). The Oroletto ONNX export from OthelloRL happens when the 8×8 model is ready (not blocking).
2. **M1 — Core:** 8×8 engine + rule-based bots (test baselines and dev stand-ins) + rules tests (cross-checked against OthelloRL).
3. **M2 — API:** `othello-api` crate (done: commands, events, session, AI worker thread with cancellation, settings; see §4.3), then the thin Tauri shell around it; **API frozen when the shell lands**.
4. **M3 — Plain UI:** unstyled board, counts, pass banner, settings, result; scripted full game in each mode.
5. **M4 — Oroletto in the app:** ONNX inference + MCTS + move temperature, with the parity tests against `tests/golden/parity_8x8.json`. The four levels read the shared `sims` and the per-level temperatures from the manifest, as calibrated by OthelloRL. **Done in TypeScript** (web, Android; §3.8). **Still to do in Rust** for the desktop app.

**Phase B — Design** (no engine or API changes)
6. **M5 — Design iterations:** first pass done (casino card-room look, chip animations, design tokens; see §3.6); How-to-Play pictures done; remaining: tuning with `design.md`, sound.
7. **M6 — Release:** README build guide, CI, release binaries. Android: done by hand and by `android.yml` (first cloud run pending); desktop: to do.

**Added beyond the original plan (done)**
- **M7 — Oroletto on the web and Android:** `onnxruntime-web`, the TypeScript search with exact parity, the Capacitor app and its workflow, the Pages site.
- **M8 — Buddy and My Progress** (§3.9).

**Post-v1 (not committed)**
8. **Online play:** play a friend on another computer via room code and a small relay server. The engine will have a `Player` abstraction (Human, AI, later Remote) so this needs no API redesign.
