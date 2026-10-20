<!-- "My progress": how well you play, game by game, and where Buddy is playing. -->
<script lang="ts">
  import { buddySkill, skillName, type Profile } from './engine/buddy.ts';

  let { profile, onback, onreset }: { profile: Profile; onback: () => void; onreset: () => void } = $props();

  const games = $derived(profile.games);
  const W = 300;
  const H = 130;
  const PAD = 8;
  const x = (i: number) => (games.length <= 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (games.length - 1));
  const y = (v: number) => H - PAD - v * (H - 2 * PAD);
  const line = $derived(games.map((g, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(g.level).toFixed(1)}`).join(' '));
  const when = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const pct = (v: number) => Math.round(v * 100);
  let confirming = $state(false);
</script>

<div class="plaque panel progress">
  <div class="levels">
    <div class="big">
      <span class="label">Your level</span>
      <strong>{profile.level.toFixed(2)}</strong>
      <span class="name">{skillName(profile.level)}{games.length ? '' : ' (not measured yet)'}</span>
    </div>
    <div class="big buddy">
      <span class="label">Buddy plays at</span>
      <strong>{buddySkill(profile).toFixed(2)}</strong>
      <span class="name">a little above you</span>
    </div>
  </div>

  {#if games.length === 0}
    <p class="muted">No games measured yet. Play a few games against the computer or Buddy, and your level appears here.</p>
  {:else}
    <svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Your level over {games.length} games">
      {#each [0, 0.5, 1] as v}
        <line x1={PAD} x2={W - PAD} y1={y(v)} y2={y(v)} class="grid" />
        <text x={W - PAD} y={y(v) - 2} class="tick" text-anchor="end">{v}</text>
      {/each}
      {#each games as g, i}
        <circle cx={x(i)} cy={y(g.skill)} r="2.5" class="game" />
      {/each}
      <path d={line} class="trail" />
      {#if games.length}<circle cx={x(games.length - 1)} cy={y(games[games.length - 1].level)} r="4" class="now" />{/if}
    </svg>
    <p class="legend"><i class="dot-line"></i> your level <i class="dot-game"></i> each game</p>

    <ul class="recent">
      {#each games.slice(-6).reverse() as g}
        <li>
          <span>{when(g.time)}</span>
          <span>{g.opponent}</span>
          <span class={g.result}>{g.result}</span>
          <span>{pct(g.skill)}%</span>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="row">
    <button class="btn small" onclick={onback}>Back</button>
    {#if games.length}
      {#if confirming}
        <button class="btn small" onclick={() => { confirming = false; onreset(); }}>Really reset?</button>
      {:else}
        <button class="btn small" onclick={() => (confirming = true)}>Reset</button>
      {/if}
    {/if}
  </div>
</div>

<style>
  .progress { display: flex; flex-direction: column; gap: 1rem; padding: 1.4rem 1.2rem; }
  .row { display: flex; gap: 0.8rem; justify-content: center; flex-wrap: wrap; }
  .muted { margin: 0; color: var(--d-ink-dim); line-height: 1.5; }
  .levels { display: flex; gap: 1rem; justify-content: space-around; text-align: center; }
  .big { display: flex; flex-direction: column; gap: 0.15rem; }
  .big strong { font: 900 2.4rem / 1 var(--d-font-serif); color: var(--d-scoreboard-count-color); text-shadow: 0 0 10px var(--d-scoreboard-count-glow); }
  .big.buddy strong { color: var(--d-hint-color); text-shadow: 0 0 10px var(--d-hint-color); }
  .label { font-size: 0.8rem; color: var(--d-ink-dim); }
  .name { font: 700 0.9rem var(--d-font-serif); }
  .chart { width: 100%; height: auto; background: rgba(0, 0, 0, 0.25); border-radius: 8px; }
  .grid { stroke: rgba(255, 255, 255, 0.15); stroke-width: 1; }
  .tick { fill: var(--d-ink-dim); font-size: 8px; }
  .trail { fill: none; stroke: var(--d-last-move-color); stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; filter: drop-shadow(0 0 3px var(--d-last-move-color)); }
  .game { fill: var(--d-ink-dim); opacity: 0.7; }
  .now { fill: var(--d-last-move-color); stroke: #1a0f08; stroke-width: 1.5; }
  .legend { margin: 0; font-size: 0.8rem; color: var(--d-ink-dim); text-align: center; }
  .dot-line, .dot-game { display: inline-block; vertical-align: middle; margin: 0 0.3rem 0 0.6rem; }
  .dot-line { width: 1.2rem; height: 3px; background: var(--d-last-move-color); border-radius: 2px; }
  .dot-game { width: 7px; height: 7px; background: var(--d-ink-dim); border-radius: 50%; }
  .recent { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9rem; }
  .recent li { display: grid; grid-template-columns: 4.2rem 1fr 3.5rem 3rem; gap: 0.5rem; padding: 0.25rem 0.1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
  .recent .win { color: var(--d-review-best-color); }
  .recent .loss { color: var(--d-review-miss-color); }
  .recent span:last-child { text-align: right; }
</style>
