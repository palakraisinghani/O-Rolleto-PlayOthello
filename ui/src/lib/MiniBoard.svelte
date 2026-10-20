<!-- A tiny illustrative board for the How to Play page. It is drawn with the real board's tokens
     (felt, glossy discs, neon rings), so the pictures look exactly like the game. -->
<script lang="ts">
  let {
    rows,
    ring = [],
    tip = null,
    placed = null,
    label = ''
  }: {
    /** One string per row: '.' empty, 'B' black, 'W' white. */
    rows: string[];
    /** Squares (row * columns + column) that get a legal-move ring. */
    ring?: number[];
    /** The square the Tip points to. */
    tip?: number | null;
    /** The disc that was just placed (framed like the last move). */
    placed?: number | null;
    label?: string;
  } = $props();

  const cols = $derived(rows[0].length);
  const cells = $derived([...rows.join('')]);
</script>

<div class="mini" role="img" aria-label={label} style:--cols={cols}>
  {#each cells as c, i}
    <span class="sq" class:alt={(Math.floor(i / cols) + i) % 2 === 1} class:tip={tip === i}>
      {#if c !== '.'}<i class="disc {c === 'B' ? 'b' : 'w'}"></i>{/if}
      {#if ring.includes(i)}<b class="ring"></b>{/if}
      {#if placed === i}<b class="frame"></b>{/if}
    </span>
  {/each}
</div>

<style>
  .mini {
    --cell: clamp(1.5rem, 6.6vw, 2.4rem);
    display: grid;
    grid-template-columns: repeat(var(--cols), var(--cell));
    grid-auto-rows: var(--cell);
    background: var(--d-board-felt);
    border-radius: 4px;
    box-shadow: 0 0 0 3px var(--d-board-border), 0 0 0 5px rgba(0, 0, 0, 0.5), 0 4px 14px rgba(0, 0, 0, 0.55);
  }
  .sq {
    position: relative;
    display: grid;
    place-items: center;
    box-shadow: inset 0 0 0 var(--d-board-grid-width) var(--d-board-grid-line);
  }
  .sq.alt { background: var(--d-board-square-alt-tint); }
  .sq.tip {
    box-shadow: inset 0 0 0 3px var(--d-hint-color), inset 0 0 14px var(--d-hint-color);
    animation: tip-flash 0.9s ease-in-out infinite alternate;
  }
  .disc { width: 78%; aspect-ratio: 1; border-radius: 50%; display: block; }
  .disc.b { background: var(--d-disc-black-bg); box-shadow: inset 0 0 0 2px var(--d-disc-black-rim), 0 3px 4px var(--d-disc-shadow); }
  .disc.w { background: var(--d-disc-white-bg); box-shadow: inset 0 0 0 2px var(--d-disc-white-rim), 0 3px 4px var(--d-disc-shadow); }
  .ring {
    position: absolute;
    width: var(--d-legal-hint-size);
    aspect-ratio: 1;
    border-radius: 50%;
    border: 3px solid var(--d-legal-hint-color);
    box-shadow: 0 0 8px var(--d-legal-hint-color), inset 0 0 6px var(--d-legal-hint-color);
  }
  .frame {
    position: absolute;
    inset: 2px;
    border: 2px solid var(--d-last-move-color);
    border-radius: 5px;
    box-shadow: 0 0 8px var(--d-last-move-color);
  }
  @keyframes tip-flash { to { filter: brightness(1.35); } }
  :global(:root[data-motion='off']) .sq.tip { animation: none; }
  @media (prefers-reduced-motion: reduce) { .sq.tip { animation: none; } }
</style>
