<script lang="ts">
  import { onMount } from 'svelte';
  import * as api from './lib/api';
  import type { GameEvent, HumanSide, Mode, Settings, Side, Snapshot } from './lib/api';

  type Screen = 'home' | 'setup-computer' | 'setup-two' | 'game' | 'settings' | 'help';

  let screen = $state<Screen>('home');
  let snap = $state<Snapshot | null>(null);
  let settings = $state<Settings>({
    show_legal_moves: true,
    animations: true,
    sound: true,
    theme: 'system',
    default_difficulty: 2,
    default_human_side: 'black'
  });
  let banner = $state('');
  let thinking = $state<number | null>(null);
  let hintSquare = $state<number | null>(null);
  let error = $state('');

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
    return snap.mode.human === s ? `${label(s)} (you)` : `${label(s)} (computer)`;
  }

  function onEvent(e: GameEvent) {
    if (e.type === 'state_changed') {
      snap = e.snapshot;
      hintSquare = null;
      if (e.snapshot.awaiting !== 'computer') thinking = null;
    } else if (e.type === 'passed') {
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
      screen = 'game';
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
    if (s) snap = s;
  }

  async function doResign() {
    const s = await run(api.resign);
    if (s) snap = s;
  }

  async function doHint() {
    const sq = await run(api.hint);
    if (sq !== undefined) hintSquare = sq;
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

  $effect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  });

  onMount(() => {
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
  const resultText = $derived.by(() => {
    if (!over || !snap) return '';
    if (over.winner === null) return 'Draw';
    const who = playerName(over.winner);
    return over.resigned ? `${who} wins by resignation` : `${who} wins`;
  });
</script>

<main>
  {#if screen === 'home'}
    <h1>Othello</h1>
    <nav class="stack">
      <button onclick={() => (screen = 'setup-computer')}>Play vs Computer</button>
      <button onclick={() => (screen = 'setup-two')}>Two Players</button>
      <button onclick={() => (screen = 'help')}>How to Play</button>
      <button onclick={() => (screen = 'settings')}>Settings</button>
    </nav>
  {:else if screen === 'setup-computer'}
    <h1>Play vs Computer</h1>
    <form class="stack" onsubmit={(e) => { e.preventDefault(); startComputer(); }}>
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
      <button type="submit">Start</button>
      <button type="button" onclick={() => (screen = 'home')}>Back</button>
    </form>
  {:else if screen === 'setup-two'}
    <h1>Two Players</h1>
    <form class="stack" onsubmit={(e) => { e.preventDefault(); startTwo(); }}>
      <label>Black <input bind:value={blackName} placeholder="Black" /></label>
      <label>White <input bind:value={whiteName} placeholder="White" /></label>
      <p class="muted">Board: 8×8</p>
      <button type="submit">Start</button>
      <button type="button" onclick={() => (screen = 'home')}>Back</button>
    </form>
  {:else if screen === 'settings'}
    <h1>Settings</h1>
    <div class="stack">
      <label><input type="checkbox" bind:checked={settings.show_legal_moves} onchange={saveSettings} /> Show legal moves</label>
      <label><input type="checkbox" bind:checked={settings.animations} onchange={saveSettings} /> Animations</label>
      <label><input type="checkbox" bind:checked={settings.sound} onchange={saveSettings} /> Sound effects</label>
      <label>Theme
        <select bind:value={settings.theme} onchange={saveSettings}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
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
      <button onclick={() => (screen = 'home')}>Back</button>
    </div>
  {:else if screen === 'help'}
    <h1>How to Play</h1>
    <div class="stack">
      <p>Black moves first. Place a disc so that it traps one or more of your opponent's discs in a straight line (any direction) between the new disc and another of your own discs. Trapped discs flip to your colour.</p>
      <p>You must flip at least one disc. If you have no legal move you pass, and the other player plays again. The game ends when neither player can move or the board is full. Most discs wins.</p>
      <button onclick={() => (screen = 'home')}>Back</button>
    </div>
  {:else if screen === 'game' && snap}
    <header class="bar">
      <button onclick={() => (screen = 'home')}>Home</button>
      <span class="score">⚫ {snap.black_count} – {snap.white_count} ⚪</span>
      <span>
        {#if over}Game over
        {:else if snap.awaiting === 'computer'}Computer is thinking…{#if thinking !== null} {Math.round(thinking * 100)}%{/if}
        {:else}{playerName(snap.to_move)} to move{/if}
      </span>
    </header>

    {#if banner}<p class="banner" role="status">{banner}</p>{/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}

    <div class="board" role="grid" aria-label="Othello board">
      {#each snap.board as cell, i}
        {@const legal = settings.show_legal_moves && snap.legal.includes(i)}
        <button
          class="cell"
          class:last={snap.last_move === i}
          class:hint={hintSquare === i}
          class:flipped={settings.animations && snap.flipped.includes(i)}
          disabled={!snap.legal.includes(i)}
          onclick={() => onSquare(i)}
          aria-label={`${api.squareName(i)}${cell === 1 ? ', black' : cell === 2 ? ', white' : ''}`}
        >
          {#if cell}<span class="disc {cell === 1 ? 'black' : 'white'}"></span>
          {:else if legal}<span class="dot"></span>{/if}
        </button>
      {/each}
    </div>

    <div class="bar controls">
      <button onclick={doUndo} disabled={!snap.can_undo}>Undo</button>
      {#if snap.mode.kind === 'vs_computer'}
        <button onclick={doHint} disabled={snap.awaiting !== 'human'}>Hint</button>
      {/if}
      <button onclick={doResign} disabled={!!over}>Resign</button>
      <button onclick={() => rematch(false)}>New game</button>
    </div>

    <p class="muted history">{snap.history.join(' ')}</p>

    {#if over}
      <div class="overlay">
        <div class="dialog" role="dialog" aria-label="Game result">
          <h2>{resultText}</h2>
          <p>⚫ {snap.black_count} – {snap.white_count} ⚪</p>
          <div class="bar">
            <button onclick={() => rematch(false)}>Rematch</button>
            <button onclick={() => rematch(true)}>Swap colours</button>
            <button onclick={() => (screen = 'home')}>Home</button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</main>

<style>
  main { max-width: 34rem; margin: 0 auto; padding: 1rem; }
  h1 { text-align: center; }
  .stack { display: flex; flex-direction: column; gap: 0.7rem; }
  label { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
  .muted { opacity: 0.65; margin: 0; }
  .bar { display: flex; gap: 0.5rem; align-items: center; justify-content: space-between; flex-wrap: wrap; margin: 0.6rem 0; }
  .controls { justify-content: center; }
  .score { font-weight: 600; }
  .banner { background: #ffe9a8; color: #3a2e00; padding: 0.5rem 0.8rem; border-radius: 6px; }
  .error { background: #ffd0d0; color: #5b0000; padding: 0.5rem 0.8rem; border-radius: 6px; }
  .history { word-break: break-word; font-size: 0.85rem; }

  .board {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2px;
    background: var(--line);
    padding: 2px;
    aspect-ratio: 1;
    width: 100%;
  }
  .cell {
    background: var(--board);
    border: none;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .cell:not(:disabled):hover { filter: brightness(1.2); }
  .cell:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; }
  .cell.last { box-shadow: inset 0 0 0 3px #f5c542; }
  .cell.hint { box-shadow: inset 0 0 0 4px #4aa3ff; }
  .disc { width: 78%; height: 78%; border-radius: 50%; border: 2px solid rgba(0, 0, 0, 0.55); }
  .disc.black { background: #111; }
  .disc.white { background: #f2f2f2; }
  .cell.flipped .disc { animation: flip 0.35s ease; }
  @keyframes flip { from { transform: scaleX(0.1); } to { transform: scaleX(1); } }
  /* Hints are outlined rings, not colour alone */
  .dot { width: 26%; height: 26%; border-radius: 50%; border: 3px solid rgba(255, 255, 255, 0.8); }

  .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; }
  .dialog { background: var(--panel); padding: 1.5rem 2rem; border-radius: 10px; text-align: center; }
</style>
