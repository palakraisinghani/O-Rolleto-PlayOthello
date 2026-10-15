<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import * as api from './lib/api';
  import type { GameEvent, HumanSide, Mode, Settings, Side, Snapshot } from './lib/api';
  import Board from './lib/Board.svelte';
  import ChipRain from './lib/ChipRain.svelte';
  import ChipSplash from './lib/ChipSplash.svelte';
  import Croupier from './lib/Croupier.svelte';
  import DealerSlot from './lib/DealerSlot.svelte';
  import { DEALER_NAME, SILENT, dealer as orolleto, settle, type Line, type Shown } from './lib/dealer';
  import Icon from './lib/Icon.svelte';
  import Lights from './lib/Lights.svelte';
  import Review from './lib/Review.svelte';

  type Screen = 'home' | 'setup-computer' | 'setup-two' | 'game' | 'review' | 'settings' | 'help';

  // A reload of the page (the dev server does that when files change or its connection drops) must not
  // throw you back to the start: the screen is remembered, and a running game is picked up again from
  // the engine (the desktop app keeps it; the web build, which lives in the page, has none to restore).
  const SCREEN_KEY = 'othello-player.screen';
  const RESTORABLE_PAGES = ['setup-computer', 'setup-two', 'settings', 'help'];
  const restoreTo = (() => {
    try {
      return sessionStorage.getItem(SCREEN_KEY);
    } catch {
      return null;
    }
  })();

  let screen = $state<Screen>('home');
  let snap = $state<Snapshot | null>(null);
  let settings = $state<Settings>({
    show_legal_moves: true,
    animations: true,
    sound: true,
    default_difficulty: 2,
    default_human_side: 'black'
  });
  let banner = $state('');
  let thinking = $state<number | null>(null);
  let hintSquare = $state<number | null>(null);
  let error = $state('');
  /** Incremented at the start of every game to (re)play the opening chip splash. */
  let splashKey = $state(0);
  let splashing = $state(false);

  /** What Orolleto is saying (and when, so ordinary remarks do not replace it move after move). */
  let shown = $state<Shown>({ line: SILENT, ply: 0 });
  const speech = $derived(shown.line);
  /** Say something now, whatever he was saying. */
  const say = (line: Line, ply = snap?.ply ?? 0) => (shown = { line, ply });

  // Setup form
  let difficulty = $state(2);
  let human = $state<HumanSide>('black');
  let blackName = $state('');
  let whiteName = $state('');

  const LEVELS = ['Easy', 'Medium', 'Hard', 'Master'];
  const label = (s: Side) => (s === 'black' ? 'Black' : 'White');
  const other = (s: Side): Side => (s === 'black' ? 'white' : 'black');

  let bannerTimer: ReturnType<typeof setTimeout> | undefined;

  function playerName(s: Side): string {
    if (!snap) return label(s);
    if (snap.mode.kind === 'two_players') {
      return (s === 'black' ? snap.mode.black_name : snap.mode.white_name) || label(s);
    }
    return snap.mode.human === s ? `${label(s)} (you)` : `${label(s)} (${DEALER_NAME})`;
  }

  /** Orolleto's reaction to the game moving on. He keeps a line up for a while rather than changing it every move. */
  function reactDealer(prev: Snapshot | null, next: Snapshot) {
    if (prev && next.ply < prev.ply) return; // an undo: its own line is set by the button
    if (next.status.state === 'over') {
      say(orolleto.end(next), next.ply);
      return;
    }
    if (next.mode.kind !== 'vs_computer') return;
    const reaction = orolleto.afterMove(prev, next);
    if (next.awaiting === 'computer') {
      const candidate = reaction ?? (prev?.awaiting !== 'computer' ? orolleto.thinking() : null);
      if (candidate) shown = settle(shown, candidate, next.ply);
    } else {
      shown = settle(shown, reaction, next.ply, true);
    }
  }

  function onEvent(e: GameEvent) {
    if (e.type === 'state_changed') {
      const prev = snap;
      snap = e.snapshot;
      hintSquare = null;
      if (e.snapshot.awaiting !== 'computer') thinking = null;
      reactDealer(prev, e.snapshot);
    } else if (e.type === 'passed') {
      if (snap?.mode.kind === 'vs_computer') say(orolleto.passed(snap.mode.human === e.side));
      banner = `${label(e.side)} has no legal move — ${label(other(e.side))} plays again`;
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => (banner = ''), 3500);
    } else if (e.type === 'thinking') {
      thinking = e.progress;
    }
  }

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    error = '';
    try {
      return await action();
    } catch (err) {
      error = typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : String(err);
      return undefined;
    }
  }

  async function start(mode: Mode) {
    banner = '';
    const s = await run(() => api.newGame(mode));
    if (s) {
      snap = s;
      say(orolleto.start(s), s.ply);
      screen = 'game';
      if (settings.animations) {
        splashKey += 1;
        splashing = true;
      }
    }
  }

  const startComputer = () => start({ kind: 'vs_computer', difficulty, human });
  const startTwo = () => start({ kind: 'two_players', black_name: blackName || null, white_name: whiteName || null });

  async function onSquare(i: number) {
    if (!snap || snap.awaiting !== 'human' || !snap.legal.includes(i)) return;
    const s = await run(() => api.play(i));
    if (s) snap = s;
  }

  async function doUndo() {
    const s = await run(api.undo);
    if (s) {
      snap = s;
      say(orolleto.undo(), s.ply);
    }
  }

  async function doResign() {
    const s = await run(api.resign);
    if (s) snap = s;
  }

  async function doHint() {
    const sq = await run(api.hint);
    if (sq !== undefined) {
      hintSquare = sq;
      say(orolleto.hint());
    }
  }

  function rematch(swap: boolean) {
    if (!snap) return;
    const m = snap.mode;
    if (m.kind === 'vs_computer') {
      start({ ...m, human: swap ? (other(m.human as Side)) : m.human });
    } else {
      start(
        swap
          ? { kind: 'two_players', black_name: m.white_name, white_name: m.black_name }
          : m
      );
    }
  }

  async function saveSettings() {
    await run(() => api.setSettings($state.snapshot(settings) as Settings));
  }

  // Each menu page gets its own words from Orolleto.
  $effect(() => {
    const page = screen;
    if (page !== 'game' && page !== 'review') untrack(() => say(orolleto.page(page), 0));
  });

  $effect(() => {
    const root = document.documentElement;
    root.setAttribute('data-motion', settings.animations ? 'on' : 'off');
  });

  // Remember where you are, for the reload case above.
  $effect(() => {
    const s = screen;
    try {
      sessionStorage.setItem(SCREEN_KEY, s === 'review' ? 'game' : s);
    } catch {
      /* storage may be unavailable; nothing to remember then */
    }
  });

  onMount(() => {
    if (restoreTo === 'game') {
      api.snapshot().then((s) => {
        snap = s;
        screen = 'game';
        shown = { line: s.status.state === 'over' ? orolleto.end(s) : SILENT, ply: s.ply };
      }).catch(() => {});
    } else if (restoreTo && RESTORABLE_PAGES.includes(restoreTo)) {
      screen = restoreTo as Screen;
    }
    let unlisten: (() => void) | undefined;
    api.onGameEvent(onEvent).then((u) => (unlisten = u));
    api.getSettings().then((s) => {
      settings = s;
      difficulty = s.default_difficulty;
      human = s.default_human_side;
    }).catch(() => {});
    return () => unlisten?.();
  });

  const over = $derived(snap?.status.state === 'over' ? snap.status : null);
  /** Chip rain for a win, unless you lost to the computer. */
  const celebrate = $derived(
    !!over &&
      over.winner !== null &&
      !(snap?.mode.kind === 'vs_computer' && over.winner !== snap.mode.human)
  );
  const sideName = (side: Side) =>
    (snap?.mode.kind === 'two_players' && (side === 'black' ? snap.mode.black_name : snap.mode.white_name)) || label(side);

  /** Short neon headline for the result dialog, plus a detail line under it. */
  const result = $derived.by(() => {
    if (!over || !snap) return { headline: '', detail: '' };
    if (over.winner === null) return { headline: 'Draw', detail: 'Honours even' };
    if (snap.mode.kind === 'vs_computer') {
      const won = over.winner === snap.mode.human;
      return {
        headline: won ? 'You win!' : `${DEALER_NAME} wins`,
        detail: over.resigned ? 'You resigned' : won ? 'Well played' : 'Better luck next hand'
      };
    }
    return { headline: `${sideName(over.winner)} wins`, detail: over.resigned ? 'by resignation' : '' };
  });
</script>

<Lights />

<main class:in-game={screen === 'game' || screen === 'review'}>
  {#if screen === 'home'}
    <section class="home">
      <div class="hero" aria-hidden="true">
        <div class="wheel"><i class="ball"></i></div>
        <div class="hub"></div>
        <div class="coin">
          <span class="coin-face black"></span>
          <span class="coin-face white"></span>
        </div>
      </div>
      <h1 class="neon logo">Othello</h1>
      <p class="tagline">Place your discs · Take the table</p>
      <DealerSlot mood={speech.mood} say={speech.say} />
      <nav class="menu">
        <button class="btn primary" onclick={() => (screen = 'setup-computer')}>Play vs Computer</button>
        <button class="btn" onclick={() => (screen = 'setup-two')}>Two Players</button>
        <button class="btn" onclick={() => (screen = 'help')}>How to Play</button>
        <button class="btn" onclick={() => (screen = 'settings')}>Settings</button>
      </nav>
    </section>
  {:else if screen === 'setup-computer'}
    <h1 class="neon title">Play vs Computer</h1>
    <DealerSlot mood={speech.mood} say={speech.say} />
    <form class="plaque panel" onsubmit={(e) => { e.preventDefault(); startComputer(); }}>
      <label>Difficulty
        <select bind:value={difficulty}>
          {#each LEVELS as name, i}<option value={i + 1}>{i + 1} – {name}</option>{/each}
        </select>
      </label>
      <label>You play
        <select bind:value={human}>
          <option value="black">Black (moves first)</option>
          <option value="white">White</option>
          <option value="random">Random</option>
        </select>
      </label>
      <p class="muted">Board: 8×8</p>
      <div class="row">
        <button type="submit" class="btn primary">Deal me in</button>
        <button type="button" class="btn small" onclick={() => (screen = 'home')}>Back</button>
      </div>
    </form>
  {:else if screen === 'setup-two'}
    <h1 class="neon title">Two Players</h1>
    <DealerSlot mood={speech.mood} say={speech.say} />
    <form class="plaque panel" onsubmit={(e) => { e.preventDefault(); startTwo(); }}>
      <label>Black <input bind:value={blackName} placeholder="Black" /></label>
      <label>White <input bind:value={whiteName} placeholder="White" /></label>
      <p class="muted">Board: 8×8</p>
      <div class="row">
        <button type="submit" class="btn primary">Start</button>
        <button type="button" class="btn small" onclick={() => (screen = 'home')}>Back</button>
      </div>
    </form>
  {:else if screen === 'settings'}
    <h1 class="neon title">Settings</h1>
    <DealerSlot mood={speech.mood} say={speech.say} />
    <div class="plaque panel">
      <label><span>Show legal moves</span><input type="checkbox" bind:checked={settings.show_legal_moves} onchange={saveSettings} /></label>
      <label><span>Animations</span><input type="checkbox" bind:checked={settings.animations} onchange={saveSettings} /></label>
      <label><span>Sound effects</span><input type="checkbox" bind:checked={settings.sound} onchange={saveSettings} /></label>
      <label>Default difficulty
        <select bind:value={settings.default_difficulty} onchange={saveSettings}>
          {#each LEVELS as name, i}<option value={i + 1}>{i + 1} – {name}</option>{/each}
        </select>
      </label>
      <label>Default colour
        <select bind:value={settings.default_human_side} onchange={saveSettings}>
          <option value="black">Black</option>
          <option value="white">White</option>
          <option value="random">Random</option>
        </select>
      </label>
      <div class="row"><button class="btn small" onclick={() => (screen = 'home')}>Back</button></div>
    </div>
  {:else if screen === 'help'}
    <h1 class="neon title">How to Play</h1>
    <DealerSlot mood={speech.mood} say={speech.say} />
    <div class="plaque panel prose">
      <p>Black moves first. Place a disc so that it traps one or more of your opponent's discs in a straight line (any direction) between the new disc and another of your own. Trapped discs flip to your colour.</p>
      <p>You must flip at least one disc. If you have no legal move you pass, and the other player plays again. The game ends when neither player can move or the board is full. Most discs wins.</p>
      <div class="row"><button class="btn small" onclick={() => (screen = 'home')}>Back</button></div>
    </div>
  {:else if screen === 'review' && snap}
    <Review {snap} onclose={() => (screen = 'game')} />
  {:else if screen === 'game' && snap}
    <div class="game">
      <header class="topbar">
        <button class="btn icon" onclick={() => (screen = 'home')} aria-label="Home"><Icon name="home" /></button>
        <div class="dealer-top"><Croupier compact width="4.4rem" mood={speech.mood} say={speech.say} /></div>
      </header>

      <section class="scoreboard" aria-label="Score">
        {#each ['black', 'white'] as const as side}
          <div class="player" class:active={!over && snap.to_move === side}>
            <span class="chip {side}"></span>
            <span class="who">{playerName(side)}</span>
            {#key side === 'black' ? snap.black_count : snap.white_count}
              <strong class="count">{side === 'black' ? snap.black_count : snap.white_count}</strong>
            {/key}
          </div>
        {/each}
      </section>

      <p class="status" role="status" aria-live="polite">
        {#if over}Game over
        {:else if snap.awaiting === 'computer'}<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span> {DEALER_NAME} is thinking{#if thinking !== null && thinking < 1} · {Math.round(thinking * 100)}%{/if}
        {:else}{playerName(snap.to_move)} to move{/if}
      </p>

      <div class="stage">
        <Board {snap} showLegal={settings.show_legal_moves} {hintSquare} onSquare={onSquare} />
      </div>

      <div class="controls">
        <div class="ctl">
          <button class="btn icon" onclick={doUndo} disabled={!snap.can_undo} aria-label="Undo"><Icon name="undo" /></button>
          <span>Undo</span>
        </div>
        {#if snap.mode.kind === 'vs_computer'}
          <div class="ctl">
            <button class="btn icon" onclick={doHint} disabled={snap.awaiting !== 'human'} aria-label="Hint"><Icon name="hint" /></button>
            <span>Hint</span>
          </div>
        {/if}
        <div class="ctl">
          <button class="btn icon" onclick={doResign} disabled={!!over} aria-label="Resign"><Icon name="resign" /></button>
          <span>Resign</span>
        </div>
        <div class="ctl">
          <button class="btn icon primary" onclick={() => rematch(false)} aria-label="New game"><Icon name="new" /></button>
          <span>New game</span>
        </div>
      </div>

      <div class="dealer-wide"><Croupier width="clamp(9rem, 16vw, 14rem)" mood={speech.mood} say={speech.say} /></div>

      <p class="history">{snap.history.join(' · ')}</p>
    </div>

    <!-- Notices float over the page, so they never move the board. -->
    {#if banner}<p class="toast banner" role="status">{banner}</p>{/if}
    {#if error}<p class="toast error" role="alert">{error}</p>{/if}

    {#if over}
      {#if celebrate && settings.animations}<ChipRain />{/if}
      <div class="overlay">
        <div class="plaque dialog" role="dialog" aria-label="Game result">
          <div class="dialog-dealer"><Croupier width="9rem" mood={speech.mood} say={speech.say} /></div>
          <h2 class="neon result">{result.headline}</h2>
          {#if result.detail}<p class="detail">{result.detail}</p>{/if}
          <p class="final"><span class="chip black"></span> {snap.black_count} – {snap.white_count} <span class="chip white"></span></p>
          <div class="row">
            <button class="btn primary" onclick={() => rematch(false)}>Rematch</button>
            {#if snap.mode.kind === 'vs_computer' && snap.history.length > 0}
              <button class="btn" onclick={() => (screen = 'review')}>Review game</button>
            {/if}
            <button class="btn" onclick={() => rematch(true)}>Swap colours</button>
            <button class="btn" onclick={() => (screen = 'home')}>Home</button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</main>

{#if splashing}
  {#key splashKey}<ChipSplash ondone={() => (splashing = false)} />{/key}
{/if}

<style>
  main {
    max-width: 40rem;
    margin: 0 auto;
    padding: var(--edge-band);
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  /* The game screen fills the window exactly (no scrolling): the board takes whatever room is left. */
  main.in-game {
    max-width: none;
    height: 100vh;
    height: 100dvh;
    justify-content: flex-start;
  }
  .muted { opacity: 0.7; margin: 0; color: var(--d-ink-dim); }
  .row { display: flex; gap: 0.8rem; justify-content: center; flex-wrap: wrap; margin-top: 0.4rem; }

  /* ---- home ---- */
  .home { display: flex; flex-direction: column; align-items: center; }
  .logo { font-size: clamp(2.2rem, min(13vw, 11vh), 6.5rem); margin: 0.2em 0 0; text-align: center; line-height: 1.05; }
  .tagline {
    font-family: var(--d-font-serif);
    font-style: italic;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 0.9rem;
    color: var(--d-ink-dim);
    margin: 0.3rem 0 clamp(0.8rem, 3.5vh, 2rem);
    text-align: center;
  }
  .menu { display: flex; flex-direction: column; gap: clamp(0.5rem, 1.8vh, 1.1rem); width: min(100%, 20rem); }
  /* Hero: a slow roulette wheel with the black/white coin spinning on its hub. */
  .hero { position: relative; width: min(var(--d-wheel-size), 22vh); height: min(var(--d-wheel-size), 22vh); display: grid; place-items: center; margin-bottom: 0.4rem; }
  .wheel {
    position: absolute; inset: 0; border-radius: 50%;
    background: repeating-conic-gradient(var(--d-wheel-red) 0 15deg, var(--d-wheel-black) 15deg 30deg);
    border: 7px ridge var(--d-brass);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.55), 0 10px 26px rgba(0, 0, 0, 0.65), 0 0 40px color-mix(in srgb, var(--d-brass-light) 40%, transparent), inset 0 0 22px rgba(0, 0, 0, 0.7);
    animation: wheel-spin var(--d-wheel-spin-duration) linear infinite;
  }
  .wheel::before { /* gilt ring between the pockets and the hub */
    content: ''; position: absolute; inset: 16%; border-radius: 50%;
    background: var(--d-brass-gradient); background-size: 300% 100%;
    box-shadow: inset 0 0 0 3px rgba(0, 0, 0, 0.35), 0 0 12px rgba(0, 0, 0, 0.6);
  }
  .ball { position: absolute; left: 50%; top: 4%; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff, #bbb); box-shadow: 0 1px 3px #000; }
  .hub { position: absolute; width: 44%; height: 44%; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #f7e6a8, #b98a35 55%, #5e4313); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.7), inset 0 0 0 3px rgba(0, 0, 0, 0.3); }
  .coin { position: relative; width: 30%; height: 30%; transform-style: preserve-3d; animation: coin-spin 4.5s linear infinite; }
  .coin-face {
    position: absolute; inset: 0; border-radius: 50%; backface-visibility: hidden;
    box-shadow: 0 0 16px var(--d-brass-light), 0 4px 10px rgba(0, 0, 0, 0.6);
  }
  .coin-face.black { background: var(--d-disc-black-bg); border: 2px solid var(--d-disc-black-rim); }
  .coin-face.white { transform: rotateY(180deg); background: var(--d-disc-white-bg); border: 2px solid var(--d-disc-white-rim); }
  @keyframes coin-spin { to { transform: rotateY(360deg); } }
  @keyframes wheel-spin { to { transform: rotate(360deg); } }

  /* ---- sub-screens ---- */
  .title { font-size: clamp(1.8rem, 8vw, 3rem); text-align: center; margin: 0 0 clamp(0.8rem, 3vh, 1.4rem); }
  .panel { display: flex; flex-direction: column; gap: 1rem; padding: 1.6rem; }
  .panel label { display: flex; justify-content: space-between; align-items: center; gap: 1rem; font-family: var(--d-font-serif); font-weight: 700; }
  .prose p { margin: 0; line-height: 1.55; }

  /* ---- game ---- */
  .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
  .mini { font-size: 1.6rem; }
  .scoreboard { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-bottom: 0.6rem; }
  .player {
    display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.6rem;
    padding: 0.55rem 0.9rem;
    border-radius: 14px;
    background: var(--d-scoreboard-bg);
    border: 2px solid var(--d-scoreboard-border);
    transition: box-shadow 0.3s, border-color 0.3s, transform 0.3s;
  }
  .player.active {
    border-color: var(--d-scoreboard-active-border);
    transform: translateY(-2px);
    box-shadow: 0 0 22px var(--d-scoreboard-active-glow), 0 0 40px color-mix(in srgb, var(--d-neon-pink) 60%, transparent);
    animation: pulse-border var(--d-scoreboard-pulse-duration) ease-in-out infinite alternate;
  }
  @keyframes pulse-border {
    to {
      box-shadow: 0 0 34px var(--d-scoreboard-active-glow-alt), 0 0 60px color-mix(in srgb, var(--d-neon-purple) 70%, transparent);
      border-color: var(--d-scoreboard-active-glow-alt);
    }
  }
  .chip { width: 28px; height: 28px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.6); }
  .chip.black { background: var(--d-disc-black-bg); border: 2px solid var(--d-disc-black-rim); outline: 1px solid rgba(255, 255, 255, 0.35); }
  .chip.white { background: var(--d-disc-white-bg); border: 2px solid var(--d-disc-white-rim); }
  .who { font-family: var(--d-font-serif); font-weight: 700; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--d-ink); }
  .count {
    font-family: var(--d-font-serif); font-size: 1.9rem; font-weight: 900;
    color: var(--d-scoreboard-count-color);
    text-shadow: 0 0 10px var(--d-scoreboard-count-glow), 0 0 22px var(--d-scoreboard-count-glow-far);
    animation: bump 0.4s ease-out;
  }
  @keyframes bump { 0% { transform: scale(1.7); color: var(--d-neon-yellow); } 100% { transform: scale(1); } }

  .status { text-align: center; margin: 0.4rem 0 0.8rem; font-family: var(--d-font-serif); font-weight: 700; letter-spacing: 0.05em; min-height: 1.5em; color: var(--d-ink); }
  .dots { display: inline-flex; gap: 4px; vertical-align: middle; margin-right: 0.3rem; }
  .dots i { width: 8px; height: 8px; border-radius: 50%; background: var(--d-neon-pink); animation: dot 1s ease-in-out infinite; }
  .dots i:nth-child(2) { background: var(--d-neon-cyan); animation-delay: 0.15s; }
  .dots i:nth-child(3) { background: var(--d-neon-yellow); animation-delay: 0.3s; }
  @keyframes dot { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-7px); opacity: 1; } }

  .banner {
    text-align: center; padding: 0.6rem 1rem; border-radius: 10px;
    font-family: var(--d-font-serif); font-weight: 700; color: var(--d-banner-text);
    background: var(--d-banner-bg);
    border: 2px solid var(--d-banner-border);
    box-shadow: 0 0 22px var(--d-banner-border);
    animation: toast-in 0.4s ease-out;
  }
  @keyframes toast-in { from { transform: translate(-50%, -14px) scale(0.96); opacity: 0; } }
  .error { text-align: center; padding: 0.5rem 1rem; border-radius: 10px; background: var(--d-error-bg); border: 2px solid var(--d-error-border); color: var(--d-error-text); }

  .controls { display: flex; gap: 1.4rem; justify-content: center; flex-wrap: wrap; margin-top: 1.6rem; }
  .ctl { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .ctl span { font-family: var(--d-font-serif); font-weight: 700; font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--d-ink-dim); }
  .history { text-align: center; color: var(--d-ink-dim); font-size: 0.85rem; line-height: 1.5; margin-top: 1rem; word-break: break-word; }

  /* ---- result ---- */
  .overlay {
    position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; padding: 1rem;
    background: var(--d-overlay-bg);
    backdrop-filter: blur(var(--d-overlay-blur));
    animation: fade-in 0.3s ease-out;
  }
  @keyframes fade-in { from { opacity: 0; } }
  .dialog {
    background: var(--d-dialog-bg);
    padding: 2rem 2.2rem; text-align: center; max-width: 30rem;
    animation: pop 0.5s cubic-bezier(0.2, 1.5, 0.5, 1);
  }
  @keyframes pop { from { transform: scale(0.6); opacity: 0; } }
  .result { font-size: clamp(1.6rem, 7vw, 2.6rem); margin: 0 0 0.6rem; line-height: 1.2; }
  .detail { font-family: var(--d-font-serif); font-style: italic; letter-spacing: 0.08em; margin: 0 0 0.8rem; }
  .final { display: flex; align-items: center; justify-content: center; gap: 0.7rem; font-family: var(--d-font-serif); font-weight: 900; font-size: 1.7rem; margin: 0 0 1.4rem; color: var(--d-option-box-text); }

  /* ---- game layout: everything fits the window ---- */
  .game {
    flex: 1;
    min-height: 0;
    display: grid;
    gap: 0.6rem;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto auto minmax(0, 1fr) auto auto;
    grid-template-areas: 'top' 'score' 'status' 'stage' 'controls' 'history';
  }
  .game > * { margin: 0; min-width: 0; }
  /* Room for the little dealer and up to four lines of his bubble, so the board does not jump when he talks. */
  .topbar { grid-area: top; min-height: 5.6rem; }
  .dealer-top { flex: 1; min-width: 0; display: flex; justify-content: flex-end; }
  .dealer-wide { display: none; grid-area: dealer; justify-self: center; }
  .dialog-dealer { display: flex; justify-content: center; margin: 0 0 1.4rem; }
  .scoreboard { grid-area: score; }
  .status { grid-area: status; }
  .stage { grid-area: stage; min-height: 0; container-type: size; display: grid; place-items: center; }
  .controls { grid-area: controls; }
  .history { grid-area: history; }

  /* Wide windows: the board on the left filling the height, everything else in a column on the right. */
  @media (min-aspect-ratio: 5/4) {
    .game {
      gap: 0.7rem 1.6rem;
      grid-template-columns: minmax(0, 1fr) clamp(15rem, 30vw, 21rem);
      grid-template-rows: auto auto auto auto auto minmax(0, 1fr);
      grid-template-areas: 'stage top' 'stage score' 'stage status' 'stage controls' 'stage dealer' 'stage history';
    }
    .topbar { min-height: 0; }
    .dealer-top { display: none; }
    .dealer-wide { display: block; max-width: 100%; }
    .scoreboard { grid-template-columns: 1fr; }
    .controls { gap: 1rem; }
    .history { overflow-y: auto; align-self: start; max-height: 100%; }
  }
  /* Wide but short: the big dealer would not fit, so the little one rejoins the top bar. */
  @media (min-aspect-ratio: 5/4) and (max-height: 840px) {
    .dealer-top { display: flex; }
    .dealer-wide { display: none; }
  }
  /* Short windows: drop the least important line to give the board room. */
  @media (max-height: 640px) { .history { display: none; } }

  /* Floating notices (pass banner, errors). */
  .toast {
    position: fixed;
    top: calc(var(--edge-band) + 4px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    margin: 0;
    max-width: min(34rem, calc(100vw - 2 * var(--edge-band)));
  }
  .dialog { max-height: 92dvh; overflow-y: auto; }
</style>
