<!-- Post-game review: step through the finished game from the first move to the last. On each of your
     moves you get a verdict: was it among the moves the computer would have played from there?
     The judging itself lives in engine/review.ts; this component only shows it. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as api from './api';
  import { squareName, type Side, type Snapshot } from './api';
  import Board, { type Mark } from './Board.svelte';
  import Croupier from './Croupier.svelte';
  import { Dealer, seededRng, type Line } from './dealer';
  import Icon from './Icon.svelte';
  import { orolettoAnalyzer } from './engine/oroletto.ts';
  import { PASS, Position } from './engine/position.ts';
  import { REVIEW_TOP_K, REVIEW_TOP_P, reviewGame, type Review, type ReviewStep, type Verdict } from './engine/review.ts';

  let { snap, onclose }: { snap: Snapshot; onclose: () => void } = $props();

  const human = $derived<Side>(snap.mode.kind !== 'two_players' ? (snap.mode.human as Side) : 'black');
  const label = (s: Side) => (s === 'black' ? 'Black' : 'White');
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  let review = $state<Review | null>(null);
  let progress = $state({ done: 0, total: 0 });
  let failed = $state('');
  /** 0 = the starting position; n = after move n. */
  let index = $state(0);

  onMount(() => {
    let stop = false;
    // With Oroletto in the build it is the judge; otherwise the alpha-beta search stands in.
    const analyzer = async () => {
      if (!api.buddyAvailable) return undefined;
      try {
        const m = await api.model();
        return orolettoAnalyzer(m.evaluator, m.levels.sims, () => stop);
      } catch {
        return undefined;
      }
    };
    analyzer()
      .then((analyze) =>
        reviewGame(snap.history, human, {
          analyze,
          onProgress: (done, total) => (progress = { done, total }),
          cancelled: () => stop
        })
      )
      .then((r) => {
        if (r && !stop) review = r;
      })
      .catch((e) => (failed = String(e?.message ?? e)));
    return () => (stop = true);
  });

  const steps = $derived(review?.steps ?? []);
  const step = $derived<ReviewStep | null>(index > 0 ? (steps[index - 1] ?? null) : null);
  const position = $derived(step ? step.after : Position.initial());
  const last = $derived(steps.length);
  const judgedSteps = $derived(steps.filter((s) => s.feedback));

  /** The board as the Board component expects it (a snapshot of a game that is not being played). */
  const view = $derived.by<Snapshot>(() => {
    const board = Array.from({ length: 64 }, (_, i) => {
      const bit = 1n << BigInt(i);
      return position.black & bit ? 1 : position.white & bit ? 2 : 0;
    });
    const { black, white } = position.counts();
    return {
      board,
      to_move: position.toMove,
      awaiting: 'nobody',
      legal: [],
      last_move: step && step.move !== PASS ? step.move : null,
      flipped: step?.flipped ?? [],
      black_count: black,
      white_count: white,
      status: { state: 'playing' },
      mode: snap.mode,
      can_undo: false,
      ply: index,
      history: snap.history.slice(0, index)
    };
  });

  const PLAYED_BADGE: Record<Verdict, string> = { best: '★', good: '✓', miss: '✗', forced: '•' };

  /** Badges: your move's verdict, and the computer's favourite squares numbered by rank. */
  const marks = $derived.by<Record<number, Mark>>(() => {
    const f = step?.feedback;
    if (!f) return {};
    const out: Record<number, Mark> = {};
    for (const c of f.accepted) out[c.move] = { text: String(c.rank), kind: 'suggest' };
    out[f.played.move] = {
      text: PLAYED_BADGE[f.verdict],
      kind: f.verdict === 'forced' ? 'good' : f.verdict
    };
    return out;
  });

  const go = (i: number) => (index = Math.max(0, Math.min(last, i)));
  const missIndexes = $derived(steps.flatMap((s, i) => (s.feedback?.verdict === 'miss' ? [i + 1] : [])));
  const nextMiss = $derived(missIndexes.find((i) => i > index) ?? null);

  function onKey(e: KeyboardEvent) {
    if (!review || e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key;
    if (key === 'ArrowRight') go(index + 1);
    else if (key === 'ArrowLeft') go(index - 1);
    else if (key === 'Home') go(0);
    else if (key === 'End') go(last);
    else if (key === 'Escape') return onclose();
    else return;
    e.preventDefault();
  }

  const names = (cs: { move: number; rank: number; prob: number }[]) =>
    cs.map((c) => `${squareName(c.move)} (${pct(c.prob)})`).join(', ');

  /** The headline and detail lines for the current step. */
  const note = $derived.by(() => {
    if (!review) return { head: '', tone: 'info', lines: [] as string[] };
    if (index === 0) {
      return {
        head: 'Start of the game',
        tone: 'info',
        lines: [`You played ${label(human)}. Step through with the arrows; every one of your moves gets a verdict.`]
      };
    }
    const s = step!;
    const who = s.mover === human ? 'You' : 'Computer';
    if (s.move === PASS) return { head: `${label(s.mover)} passed`, tone: 'info', lines: ['No legal move, so the turn went to the other side.'] };
    const f = s.feedback;
    if (!f) return { head: `Computer played ${squareName(s.move)}`, tone: 'info', lines: [`${who} flipped ${s.flipped.length} disc${s.flipped.length === 1 ? '' : 's'}.`] };

    const mv = squareName(f.played.move);
    const chance = pct(f.played.prob);
    const picks = names(f.accepted);
    const total = f.candidates.length;
    if (f.verdict === 'forced') return { head: 'Only move', tone: 'good', lines: [`${mv} was your only legal move.`] };
    if (f.verdict === 'best') return { head: 'Best move!', tone: 'best', lines: [`${mv} is exactly what the computer would play (${chance}).`] };
    if (f.verdict === 'good') {
      const why = f.played.rank <= REVIEW_TOP_K ? `in its top ${REVIEW_TOP_K}` : `inside its top ${pct(REVIEW_TOP_P)} of probability`;
      return {
        head: 'Good move',
        tone: 'good',
        lines: [`${mv} ranks ${f.played.rank} of ${total} (${chance}), ${why}.`, `It preferred: ${names(f.candidates.slice(0, 1))}.`]
      };
    }
    return {
      head: 'Not one of its top choices',
      tone: 'miss',
      lines: [`${mv} ranks ${f.played.rank} of ${total} (${chance}).`, `It would have played: ${picks}.`]
    };
  });

  const sum = $derived(review?.summary);

  /** Orolleto's comment on the screen: fixed for each step (seeded), so it does not change when you come back. */
  const salt = Math.floor(Math.random() * 1_000_000_000);
  const comment = $derived.by<Line | null>(() => {
    if (!review) return null;
    const talker = new Dealer({ rng: seededRng(salt + index * 7919) });
    if (index === 0) return talker.reviewIntro(review.summary);
    const st = step;
    if (!st) return null;
    if (st.feedback) return talker.reviewMove(st.feedback.verdict);
    return talker.reviewOther(st.move === PASS ? 'pass' : 'mine');
  });
</script>

<svelte:window onkeydown={onKey} />

<div class="review">
  <header class="topbar">
    <button class="btn icon" onclick={onclose} aria-label="Back to the result"><Icon name="back" /></button>
    <span class="neon mini">Review</span>
  </header>

  <section class="summary plaque" aria-label="Summary">
    {#if failed}
      <p class="muted">Couldn't review this game: {failed}</p>
    {:else if !review}
      <p>Studying your moves… {progress.done}/{progress.total}</p>
      <progress max={Math.max(1, progress.total)} value={progress.done}></progress>
    {:else if sum && sum.judged > 0}
      <p class="score">
        <strong>{pct(sum.hitRate ?? 0)}</strong>
        <span>of your moves matched the computer's top picks</span>
      </p>
      <p class="tally">
        <span class="t best">★ {sum.best} best</span>
        <span class="t good">✓ {sum.good} good</span>
        <span class="t miss">✗ {sum.miss} missed</span>
        {#if sum.forced}<span class="t">• {sum.forced} forced</span>{/if}
      </p>
    {:else}
      <p>No moves of yours to judge in this game.</p>
    {/if}
  </section>

  <div class="stage">
    <Board snap={view} showLegal={false} hintSquare={null} onSquare={() => {}} {marks} />
  </div>

  <section class="note plaque {note.tone}" aria-live="polite">
    <h2>{note.head}</h2>
    {#each note.lines as line}<p>{line}</p>{/each}
    {#if step}<p class="ply">Move {index} of {last}</p>{/if}
    {#if comment}<div class="quip"><Croupier compact width="5rem" mood={comment.mood} say={comment.say} /></div>{/if}
  </section>

  <div class="controls">
    <button class="btn icon" onclick={() => go(0)} disabled={!review || index === 0} aria-label="First position"><Icon name="first" /></button>
    <button class="btn icon" onclick={() => go(index - 1)} disabled={!review || index === 0} aria-label="Previous move"><Icon name="back" /></button>
    <button class="btn icon primary" onclick={() => go(index + 1)} disabled={!review || index === last} aria-label="Next move"><Icon name="next" /></button>
    <button class="btn icon" onclick={() => go(last)} disabled={!review || index === last} aria-label="Last position"><Icon name="last" /></button>
    <button class="btn small" onclick={() => nextMiss !== null && go(nextMiss)} disabled={nextMiss === null}>Next miss</button>
  </div>

  {#if review}
    <nav class="strip" aria-label="Your moves">
      {#each steps as st, i}
        {#if st.feedback}
          <button
            class="pill {st.feedback.verdict}"
            class:current={index === i + 1}
            onclick={() => go(i + 1)}
            aria-label="Move {i + 1}: {squareName(st.move)}, {st.feedback.verdict}"
          >{squareName(st.move)}</button>
        {/if}
      {/each}
      {#if judgedSteps.length === 0}<span class="muted">—</span>{/if}
    </nav>
  {/if}
</div>

<style>
  .review {
    flex: 1;
    min-height: 0;
    display: grid;
    gap: 0.6rem;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr) auto auto auto;
    grid-template-areas: 'top' 'summary' 'stage' 'note' 'controls' 'strip';
  }
  .review > * { margin: 0; min-width: 0; }
  .topbar { grid-area: top; display: flex; justify-content: space-between; align-items: center; }
  .mini { font-size: 1.6rem; }
  .summary { grid-area: summary; padding: 0.6rem 1rem; text-align: center; }
  .stage { grid-area: stage; min-height: 0; container-type: size; display: grid; place-items: center; }
  .note { grid-area: note; padding: 0.7rem 1rem; }
  .controls { grid-area: controls; display: flex; gap: 0.8rem; justify-content: center; align-items: center; flex-wrap: wrap; }
  .strip { grid-area: strip; display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: center; max-height: 5.2rem; overflow-y: auto; }

  .summary p, .note p { font-variant-numeric: lining-nums; }
  .summary p { margin: 0; }
  .score strong { font-family: var(--d-font-serif); font-size: 1.9rem; font-weight: 900; color: var(--d-scoreboard-count-color); text-shadow: 0 0 10px var(--d-scoreboard-count-glow); margin-right: 0.4rem; }
  .score span { font-family: var(--d-font-serif); font-weight: 700; }
  .tally { font-variant-numeric: lining-nums; display: flex; gap: 0.9rem; justify-content: center; flex-wrap: wrap; margin-top: 0.3rem !important; font-family: var(--d-font-serif); font-weight: 700; font-size: 0.9rem; }
  .t.best { color: var(--d-review-best-color); }
  .t.good { color: var(--d-review-good-color); }
  .t.miss { color: var(--d-review-miss-color); }
  progress { width: min(100%, 18rem); accent-color: var(--d-review-best-color); }
  .muted { color: var(--d-ink-dim); }

  .note h2 { margin: 0 0 0.2rem; font-family: var(--d-font-serif); font-size: 1.15rem; }
  .note p { margin: 0.15rem 0 0; line-height: 1.4; font-size: 0.92rem; }
  .quip { margin-top: 0.5rem; }
  .note .ply { opacity: 0.7; font-size: 0.78rem; }
  .note.best h2 { color: var(--d-review-best-color); }
  .note.good h2 { color: var(--d-review-good-color); }
  .note.miss h2 { color: var(--d-review-miss-color); }

  .pill {
    font-family: var(--d-font-serif); font-weight: 900; font-size: 0.78rem; font-variant-numeric: lining-nums;
    padding: 0.25rem 0.55rem; border-radius: 999px; cursor: pointer;
    color: #1a0f08; background: var(--d-review-suggest-color);
    border: 2px solid rgba(0, 0, 0, 0.55);
  }
  .pill.best { background: var(--d-review-best-color); }
  .pill.good, .pill.forced { background: var(--d-review-good-color); }
  .pill.miss { background: var(--d-review-miss-color); color: #fff; }
  .pill.current { outline: 3px solid #fff; outline-offset: 1px; }

  /* Wide windows: board on the left, everything else in a column on the right (like the game). */
  @media (min-aspect-ratio: 5/4) {
    .review {
      gap: 0.7rem 1.6rem;
      grid-template-columns: minmax(0, 1fr) clamp(16rem, 32vw, 23rem);
      grid-template-rows: auto auto auto auto minmax(0, 1fr);
      grid-template-areas: 'stage top' 'stage summary' 'stage note' 'stage controls' 'stage strip';
    }
    .strip { align-self: start; max-height: 100%; }
  }
  @media (max-height: 640px) { .strip { display: none; } }
</style>
