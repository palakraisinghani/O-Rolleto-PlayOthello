<!-- The website keeps nothing after the session. Instead you note your level and type it in next time. -->
<script lang="ts">
  import { parseLevel, skillName, type Profile } from './engine/buddy.ts';

  let { profile, onset }: { profile: Profile; onset: (level: number) => void } = $props();

  let text = $state('');
  let problem = $state('');
  let applied = $state(false);

  function apply(e: Event) {
    e.preventDefault();
    const v = parseLevel(text);
    if (v === null) {
      problem = 'Type a number from 0 to 1, for example 0.62';
      applied = false;
      return;
    }
    problem = '';
    onset(v);
    applied = true;
    text = '';
  }
</script>

<div class="carry">
  <p class="keep">
    <span>Your level to remember</span>
    <strong>{profile.level.toFixed(2)}</strong>
    <span class="name">{skillName(profile.level)}</span>
  </p>
  <p class="note">Nothing is saved when you close this page. Note your level, and type it in next time to carry on from there.</p>
  <form onsubmit={apply}>
    <label>
      <span>Start from my level</span>
      <input bind:value={text} inputmode="decimal" placeholder="0.62" aria-label="Your level, 0 to 1" autocomplete="off" />
    </label>
    <button class="btn small" type="submit">Set</button>
  </form>
  {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
  {#if applied}<p class="ok" role="status">Level set. Buddy will now play a little above it.</p>{/if}
</div>

<style>
  .carry { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.8rem; border-radius: 10px; background: rgba(0, 0, 0, 0.22); }
  .keep { margin: 0; display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; justify-content: center; }
  .keep strong { font: 900 1.6rem / 1 var(--d-font-serif); color: var(--d-scoreboard-count-color); text-shadow: 0 0 10px var(--d-scoreboard-count-glow); }
  .name { font: 700 0.9rem var(--d-font-serif); }
  .note { margin: 0; font-size: 0.85rem; line-height: 1.45; color: var(--d-ink-dim); text-align: center; }
  form { display: flex; align-items: center; justify-content: center; gap: 0.6rem; flex-wrap: wrap; }
  label { display: flex; align-items: center; gap: 0.5rem; font: 700 0.9rem var(--d-font-serif); }
  input { width: 5rem; text-align: center; }
  .problem { margin: 0; color: var(--d-review-miss-color); font-size: 0.85rem; text-align: center; }
  .ok { margin: 0; color: var(--d-review-best-color); font-size: 0.85rem; text-align: center; }
</style>
