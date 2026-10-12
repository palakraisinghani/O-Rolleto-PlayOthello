# Othello Player

A desktop app for playing Othello (8×8) on your own machine, offline. Play the computer at four difficulty levels, or play a friend on the same computer. The computer is **Oroletto**, an AlphaZero-style agent trained in the companion research repo [OthelloRL](../OthelloRL); one model (the strongest) plays every level, and the four levels differ only in the move temperature.

> **Status: early development.** The Rust engine, baseline bots, UI-facing API, Tauri shell and a playable, styled UI exist. Oroletto is not built yet. See [Roadmap](#roadmap).

## Planned stack

- **Core and AI:** Rust: bitboard engine, MCTS, and ONNX inference with the pure-Rust `tract-onnx` crate (no ML runtime to install).
- **App shell:** [Tauri 2](https://tauri.app).
- **UI:** Svelte + TypeScript.
- **Targets:** Linux, macOS and Windows, built from source.

The UI never implements rules: it sends commands (`new_game`, `play`, `undo`, ...) and renders the state it gets back, so the design can change without touching the engine. Details, requirements and open decisions are in [`SPEC.md`](SPEC.md).

## Repository layout

```
SPEC.md                    specification, decisions, milestones
launch.sh                  launches the app in development mode
design.md                  design tokens for the whole look (edit to tune the UI)
web/othello.html           the whole game as one self-contained page for GitHub Pages (built by `npm run build:web`)
Cargo.toml                 Rust workspace
core/                      Rust crate `othello-core`: engine, rules, history/undo, random + greedy bots
api/                       Rust crate `othello-api`: the command/event API the UI talks to (see SPEC §4.3)
app/                       Tauri shell: forwards UI commands to the API, engine events to the UI
ui/                        Svelte + TypeScript front-end (design-token driven; see design.md)
LICENSE                    MIT
requirements.txt           Python tooling dependencies (not needed to run the app)
tools/make_golden.py       generates the golden test data from OthelloRL
tests/golden/              reference data the Rust engine is tested against
```

Planned (not yet created): MCTS and Oroletto in `core/`, and `models/` (Oroletto ONNX + manifest).

## Conventions

These match OthelloRL exactly, because the Oroletto model's input and output layouts depend on them.

- **Squares:** `(row, col)` is bit/index `row * 8 + col`. Row 0 is the top and is labelled `1`; column 0 is the left and is labelled `a`. So `a1 = 0`, `b1 = 1`, `h1 = 7`, `a2 = 8`, `h8 = 63`.
- **Pass:** move index `64`. It is legal only when the side to move has no placement.
- **Start position:** white on d4 and e5, black on e4 and d5. **Black moves first.**
- **Game end:** two consecutive passes, or a full board. A player with no move must pass explicitly. A pass is never silent in the UI.
- **Bitboards:** one `u64` per colour.

## Golden test data

`tests/golden/engine_8x8.json` is produced by OthelloRL's reference engine and is the contract the Rust engine must reproduce:

- perft counts for depths 1–7 (4, 12, 56, 244, 1396, 8200, 55092);
- six hand-built rule cases (forced pass, double-pass ending, pass-counter reset, full-board draw / black win / white win, last square);
- 100 seeded random games, each ply with its legal moves, the greedy bot's tied-best moves and the resulting position (including forced passes).

Bitboards are stored as 16-digit hex strings, since a `u64` does not fit a JSON number. The file records the OthelloRL commit it came from.

To regenerate it (only needed if the reference engine changes):

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python tools/make_golden.py            # write the file
python tools/make_golden.py --check    # verify the committed file is current
```

OthelloRL is expected at `../OthelloRL`; override with `--othellorl PATH` or `$OTHELLO_RL`. No Python is needed to build or run the app itself.

## Run the tests

With the Rust toolchain installed:

```bash
cargo test      # engine + API tests, incl. the golden-file checks against OthelloRL
(cd ui && npm test)   # the TypeScript engine used by the web page, against the same golden file
```

## Web version (host it on GitHub Pages)

[`web/othello.html`](web/othello.html) is the whole game as **one self-contained file** (about 260 KB: the code, fonts and textures are all inside it). It looks and plays like the desktop app: same wood, brass, velvet, LED strip and chip animations. It needs no server and no network, and it even works opened straight from disk.

**To put it on your GitHub Pages site**, copy the file into your site's repository and link to it:

```
your-site/othello/index.html     <- a copy of web/othello.html
```
```html
<a href="/othello/">Play Othello</a>
<!-- or embed it in a page -->
<iframe src="/othello/" title="Othello" style="width:100%;height:90vh;border:0"></iframe>
```
(If you copy it as `othello.html` instead, link to `/othello.html`.)

Differences from the desktop app:
- The computer is a classic bot, not Oroletto (the neural network is not in the browser build). The four levels are **1 Easy** random, **2 Medium** greedy (most discs next move), **3 Hard** alpha-beta search 3 moves deep, **4 Master** alpha-beta with iterative deepening for about 0.9 s per move.
- Settings are kept in the browser (localStorage).

Rebuild it after changing the UI or `design.md` (this regenerates `web/othello.html`):

```bash
cd ui && npm install     # once
npm run build:web
```

The page runs on a TypeScript port of the Rust engine (`ui/src/lib/engine/`). `npm test` checks that port against the same golden file as the Rust engine (perft, hand-built rule cases and 100 recorded games), plus the session logic and the bots; `npm run test:web` drives the built page end to end in a headless DOM (start a game, play, undo, play a whole game, change a setting).

## Tuning the look: `design.md`

The UI is a casino card room: mahogany wood, burnished brass rims, red velvet buttons, green felt for the board, scoreboard and panels, glossy discs, a neon title and an RGB LED strip (individually coloured, twinkling bulbs with a flowing colour pattern) round the window edge over plain wood. Poker chips splash across the screen at the start of every game and rain down when someone wins.

[`design.md`](design.md) holds every tunable value: the wooden background, option boxes, buttons and icon buttons, scoreboard, board frame and border, bulbs, felt and squares, discs, disc flip/drop animations, hints, dialogs, the poker chips and the roulette wheel. Edit a value, save, and the running app reloads with it. The build checks that tokens and code agree (a missing token fails the build, an unused one warns). Textures (`wood.jpg`, `red-velvet.jpg`, `green-velvet.jpg`) are in `ui/public/textures/`; to use your own, drop an image there and point a token at it.

## Run the app (development)

```bash
bash launch.sh
```

This installs the UI dependencies on the first run, then starts the Vite dev server and opens the app window. Edits to `ui/` reload live, and edits to Rust code rebuild. The first launch compiles the Rust side and takes a minute or two. `bash launch.sh --check` only verifies that Rust and Node are installed.

## Build prerequisites (for the app)

The engine and API only need the Rust toolchain ([rustup](https://rustup.rs)). The app also needs Node.js (an LTS release; [nvm](https://github.com/nvm-sh/nvm) works without sudo). On Linux you also need the Tauri system libraries: `sudo apt install libwebkit2gtk-4.1-dev build-essential libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev` (see the [Tauri prerequisites](https://tauri.app/start/prerequisites/)). Release packaging instructions will be added with M6.

## Roadmap

**Phase A: backend and API, with a plain UI:** M0 decisions → M1 Rust engine and baseline bots → M2 Tauri command/event API (frozen here) → M3 plain playable UI → M4 Oroletto and the four levels (needs the 8×8 model).
**Phase B: design:** M5 visual design (casino card-room look and chip animations; first pass done, tuned via `design.md`) → M6 release.
Online play against a friend is a possible post-v1 feature. See [`SPEC.md`](SPEC.md) §9.

## Licence

[MIT](LICENSE)
