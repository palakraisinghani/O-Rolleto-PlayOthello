# UI (Svelte + TypeScript + Vite)

The front-end for every build: the desktop app (Tauri), the website, the single-file page and the Android app. It never implements rules: it sends commands to a backend (`src/lib/api.ts`) and renders the snapshots it gets back.

## Layout

```
src/App.svelte               screens (home, setup, game, review, progress, settings, help)
src/lib/*.svelte             Board, Review, HowToPlay, MiniBoard, Progress, LevelCarry, dealer, chips, lights
src/lib/api.ts               picks the backend: Tauri (Rust) or the TypeScript one below
src/lib/dealer.ts, dialogues.ts   Orolleto the dealer and his lines
src/lib/buddy-store.ts       where your Buddy trajectory is kept (device storage, or memory only on the website)
src/lib/engine/              TypeScript engine, session, classic bots, review, Oroletto search (oroletto.ts,
                             oroletto-ort.ts), Buddy (buddy.ts, buddy-analysis.ts), and their tests
design-plugin.ts             turns ../design.md into CSS variables (the look is tuned there)
scripts/                     build helpers and the end-to-end test
```

## Commands

```bash
npm install
npm run dev            # Vite dev server (the Tauri app loads it via ../launch.sh)
npm run check          # svelte-check + type checks
npm test               # 76 tests: engine vs golden data, Oroletto parity, sessions, bots, review, Buddy
npm run build:web      # ../web/othello.html: one self-contained page, classic bots only
npm run test:web       # drives that page end to end in a headless DOM
npm run build:site     # ../docs/: the GitHub Pages site with Oroletto, Buddy, session-only progress
npm run build:mobile   # dist-mobile/: the Android app's web content (see ../mobile/README.md)
```

`build:site` and `build:mobile` first copy the model into `mobile-public/` (`scripts/prepare-mobile.mjs`) and need `onnxruntime-web` (installed by `npm install`). Serve `docs/` or `dist-mobile/` over http to try them (the model cannot load from `file://`).
