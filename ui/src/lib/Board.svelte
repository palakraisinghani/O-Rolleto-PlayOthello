<!-- The board: walnut frame with chasing marquee bulbs, oak squares, glossy 3D discs.
     It only renders the snapshot it is given; all rules live in the engine. -->
<script lang="ts" module>
  /** A small badge on a square (used by the game review). */
  export interface Mark {
    text: string;
    kind: 'best' | 'good' | 'miss' | 'suggest';
  }
</script>

<script lang="ts">
  import { squareName, type Snapshot } from './api';

  let {
    snap,
    showLegal,
    hintSquare,
    onSquare,
    marks = {}
  }: {
    snap: Snapshot;
    showLegal: boolean;
    hintSquare: number | null;
    onSquare: (square: number) => void;
    marks?: Record<number, Mark>;
  } = $props();

  const cells = Array.from({ length: 64 }, (_, i) => i);

  // Flips ripple outward from the placed disc: --ring is the distance (in squares) minus one;
  // CSS turns it into a delay using the timings in design.md (section 12).
  function ring(i: number): number {
    if (snap.last_move === null || !snap.flipped.includes(i)) return 0;
    const dr = Math.abs(Math.floor(i / 8) - Math.floor(snap.last_move / 8));
    const dc = Math.abs((i % 8) - (snap.last_move % 8));
    return Math.max(dr, dc) - 1;
  }

  const describe = (i: number, cell: number) =>
    `${squareName(i)}${cell === 1 ? ', black' : cell === 2 ? ', white' : ', empty'}${marks[i] ? `, ${marks[i].kind} ${marks[i].text}` : ''}`;
</script>

<div class="frame">
  <div class="bulbs top"><i class="a"></i><i class="b"></i></div>
  <div class="bulbs bottom"><i class="a"></i><i class="b"></i></div>
  <div class="bulbs left"><i class="a"></i><i class="b"></i></div>
  <div class="bulbs right"><i class="a"></i><i class="b"></i></div>

  <div class="board" role="grid" aria-label="Othello board">
    {#each cells as i (i)}
      {@const cell = snap.board[i]}
      {@const legal = snap.legal.includes(i)}
      {@const flipped = snap.flipped.includes(i)}
      <button
        class="cell"
        class:alt={(Math.floor(i / 8) + i) % 2 === 1}
        class:last={snap.last_move === i}
        class:legal={legal}
        class:hint={hintSquare === i}
        class:flipped
        disabled={!legal}
        onclick={() => onSquare(i)}
        aria-label={describe(i, cell)}
      >
        {#if cell !== 0}
          <span class="drop">
            <span class="lift">
              <span class="disc" class:white={cell === 2} style:--ring={ring(i)}>
                <span class="face b"></span>
                <span class="face w"></span>
              </span>
            </span>
          </span>
        {:else if legal && showLegal}
          <span class="ring"></span>
        {/if}
        {#if snap.last_move === i}<span class="marker"></span>{/if}
        {#if marks[i]}<span class="badge {marks[i].kind}" aria-hidden="true">{marks[i].text}</span>{/if}
      </button>
    {/each}
  </div>
</div>

<style>
  /* The frame fills the square the surrounding stage (a size container) allows, so the whole
     board always fits the window; rail and bulbs shrink with it. */
  .frame {
    --s: min(100cqw, 100cqh, var(--d-board-frame-max-size));
    --bulb-size: min(var(--d-bulb-size), calc(var(--s) * 0.05));
    position: relative;
    width: var(--s);
    padding: min(var(--d-board-frame-padding), calc(var(--s) * 0.07));
    border-radius: var(--d-board-frame-radius);
    border: var(--d-board-frame-border-width) ridge var(--d-board-frame-border);
    background: var(--d-board-frame-bg);
    box-shadow:
      inset 0 3px 0 rgba(255, 255, 255, 0.22),
      inset 0 -6px 14px rgba(0, 0, 0, 0.6),
      0 22px 50px rgba(0, 0, 0, 0.65),
      0 0 60px color-mix(in srgb, var(--d-board-frame-glow) 45%, transparent);
  }

  /* Marquee bulbs: two interleaved sets blink in alternation, so the lights chase. */
  .bulbs { position: absolute; pointer-events: none; }
  .bulbs.top, .bulbs.bottom { left: calc(var(--bulb-size) * 0.54); right: calc(var(--bulb-size) * 0.54); height: var(--bulb-size); }
  .bulbs.top { top: calc(var(--bulb-size) * 0.23); }
  .bulbs.bottom { bottom: calc(var(--bulb-size) * 0.23); }
  .bulbs.left, .bulbs.right { top: calc(var(--bulb-size) * 0.54); bottom: calc(var(--bulb-size) * 0.54); width: var(--bulb-size); }
  .bulbs.left { left: calc(var(--bulb-size) * 0.23); }
  .bulbs.right { right: calc(var(--bulb-size) * 0.23); }
  .bulbs i {
    --bulb: var(--d-bulb-color);
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle at 50% 50%, var(--d-bulb-core) 0 22%, var(--bulb) 24% 42%, transparent 46%);
    background-size: calc(var(--bulb-size) * 2) var(--bulb-size);
    background-repeat: repeat-x;
    filter: drop-shadow(0 0 5px var(--bulb)) drop-shadow(0 0 10px var(--bulb));
    animation:
      chase var(--d-bulb-chase-duration) steps(1) infinite,
      bulb-hue var(--d-bulb-hue-cycle-duration) linear infinite;
  }
  .bulbs.left i, .bulbs.right i {
    background-size: var(--bulb-size) calc(var(--bulb-size) * 2);
    background-repeat: repeat-y;
  }
  .bulbs i.b {
    animation-delay: calc(var(--d-bulb-chase-duration) / -2), 0s;
    background-position: var(--bulb-size) 0;
  }
  .bulbs.left i.b, .bulbs.right i.b { background-position: 0 var(--bulb-size); }

  /* Without motion there is no chase: show one evenly spaced set. */
  :global(:root[data-motion='off']) .bulbs i.b { display: none; }
  @media (prefers-reduced-motion: reduce) { .bulbs i.b { display: none; } }

  @keyframes chase {
    0% { opacity: 1; }
    50% { opacity: 0.12; }
  }
  @keyframes bulb-hue {
    to { filter: hue-rotate(360deg) drop-shadow(0 0 5px var(--bulb)) drop-shadow(0 0 10px var(--bulb)); }
  }

  /* The felt: one continuous green velvet surface; squares are just grid lines on it. */
  .board {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);
    aspect-ratio: 1;
    background: var(--d-board-felt);
    border-radius: 4px;
    box-shadow:
      0 0 0 3px var(--d-board-border),
      0 0 0 5px rgba(0, 0, 0, 0.5),
      inset 0 0 28px rgba(0, 0, 0, 0.55),
      0 4px 18px rgba(0, 0, 0, 0.6);
  }

  .cell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    perspective: 500px;
    background: transparent;
    box-shadow: inset 0 0 0 var(--d-board-grid-width) var(--d-board-grid-line);
  }
  .cell.alt { background: var(--d-board-square-alt-tint); }
  .cell:disabled { cursor: default; }
  .cell.legal { cursor: pointer; }
  .cell.legal:hover { background: var(--d-board-square-hover); }
  .cell:focus-visible { outline: 3px solid var(--d-hint-color); outline-offset: -3px; z-index: 2; }

  /* Last move: a pulsing frame (shape, not just colour). */
  .marker {
    position: absolute;
    inset: 3px;
    border: 3px solid var(--d-last-move-color);
    border-radius: 6px;
    box-shadow: 0 0 10px var(--d-last-move-color), inset 0 0 8px color-mix(in srgb, var(--d-last-move-color) 60%, transparent);
    animation: pulse-glow 1.8s ease-in-out infinite;
    pointer-events: none;
  }
  /* Review badges: a round tag in the corner of a square. */
  .badge {
    --c: var(--d-review-suggest-color);
    position: absolute;
    right: 4%;
    top: 4%;
    z-index: 3;
    width: var(--d-review-badge-size);
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 50%;
    font: 900 clamp(0.6rem, calc(var(--s) * 0.032), 1.15rem) / 1 var(--d-font-serif);
    color: #1a0f08;
    background: var(--c);
    border: 2px solid rgba(0, 0, 0, 0.55);
    box-shadow: 0 0 10px var(--c), 0 2px 4px rgba(0, 0, 0, 0.6);
    pointer-events: none;
  }
  .badge.best { --c: var(--d-review-best-color); }
  .badge.good { --c: var(--d-review-good-color); }
  .badge.miss { --c: var(--d-review-miss-color); color: #fff; }
  .badge.suggest { opacity: 0.92; }
  .cell.hint {
    box-shadow: inset 0 0 0 4px var(--d-hint-color), inset 0 0 22px var(--d-hint-color);
    animation: hint-flash 0.9s ease-in-out infinite alternate;
  }
  @keyframes hint-flash { to { filter: brightness(1.35); } }

  /* Legal-move hint: a neon ring whose colour cycles. */
  .ring {
    width: var(--d-legal-hint-size);
    height: var(--d-legal-hint-size);
    border-radius: 50%;
    border: 3px solid var(--d-legal-hint-color);
    box-shadow: 0 0 10px var(--d-legal-hint-color), inset 0 0 8px var(--d-legal-hint-color);
    animation:
      pulse-glow var(--d-legal-hint-pulse-duration) ease-in-out infinite,
      ring-hue var(--d-legal-hint-hue-cycle-duration) linear infinite;
  }
  @keyframes ring-hue { to { filter: hue-rotate(360deg); } }

  /* Discs: two faces on a 3D rotor. The drop, the hop and the flip live on separate
     wrappers so a colour change never replays the drop. */
  .drop {
    width: var(--d-disc-size);
    height: var(--d-disc-size);
    display: block;
    animation: drop var(--d-disc-drop-duration) var(--d-disc-drop-easing) both;
  }
  .lift { width: 100%; height: 100%; display: block; }
  .cell.flipped .lift {
    animation: hop var(--d-disc-flip-duration) ease-in-out both;
    animation-delay: calc(var(--d-disc-flip-first-delay) + var(--ring, 0) * var(--d-disc-flip-ripple-delay));
  }
  .disc {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform var(--d-disc-flip-duration) var(--d-disc-flip-easing);
    transition-delay: calc(var(--d-disc-flip-first-delay) + var(--ring, 0) * var(--d-disc-flip-ripple-delay));
  }
  .disc.white { transform: rotateY(180deg); }
  .face {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .face.b {
    background: var(--d-disc-black-bg);
    box-shadow: inset 0 -4px 6px rgba(255, 255, 255, 0.08), inset 0 0 0 2px var(--d-disc-black-rim), 0 4px 6px var(--d-disc-shadow);
  }
  .face.w {
    transform: rotateY(180deg);
    background: var(--d-disc-white-bg);
    box-shadow: inset 0 -4px 6px rgba(0, 0, 0, 0.16), inset 0 0 0 2px var(--d-disc-white-rim), 0 4px 6px var(--d-disc-shadow);
  }

  /* A newly placed disc drops onto the board. */
  @keyframes drop {
    0% { transform: translateY(var(--d-disc-drop-height)) scale(1.7); opacity: 0; }
    60% { opacity: 1; }
    100% { transform: none; opacity: 1; }
  }
  /* The disc rises while it turns over. */
  @keyframes hop {
    0%, 100% { transform: translateY(0) scale(1); }
    45% { transform: translateY(var(--d-disc-hop-height)) scale(var(--d-disc-hop-scale)); }
  }
</style>
