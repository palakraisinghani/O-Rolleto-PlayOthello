<!-- The room: just the mahogany wood, plus an RGB LED strip round the window edge.
     Each bulb is a dot cut (mask) out of a colour gradient that slides along the strip, so every
     bulb has its own colour; a blurred copy behind it is the glow. Two interleaved sets twinkle in
     alternation, like the bulbs on the board frame. Values come from design.md (sections 2, 3). -->
<script lang="ts">
  const edges = ['top', 'right', 'bottom', 'left'] as const;
</script>

<div class="room" aria-hidden="true">
  <div class="wood"></div>
  <div class="tint"></div>
  {#each edges as edge}
    <div class="strip {edge}">
      {#each ['a', 'b'] as set}
        <span class="set {set}">
          <span class="halo"><i class="led"></i></span>
          <i class="led"></i>
        </span>
      {/each}
    </div>
  {/each}
</div>

<style>
  .room {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    background: var(--d-main-bg);
    pointer-events: none;
  }
  .wood, .tint { position: absolute; inset: 0; }
  .wood { background: var(--d-main-bg-image); }
  .tint { background: var(--d-main-bg-tint); }

  .strip {
    --sz: var(--d-border-light-bulb-size);
    --pitch: var(--d-border-light-spacing);
    --gap: var(--d-border-light-inset);
    position: absolute;
  }
  .strip.top, .strip.bottom { left: var(--gap); right: var(--gap); height: var(--sz); }
  .strip.top { top: var(--gap); }
  .strip.bottom { bottom: var(--gap); }
  .strip.left, .strip.right { top: calc(var(--gap) + var(--sz)); bottom: calc(var(--gap) + var(--sz)); width: var(--sz); }
  .strip.left { left: var(--gap); }
  .strip.right { right: var(--gap); }

  /* Two interleaved sets of bulbs blink in alternation. */
  .set { position: absolute; inset: 0; animation: chase var(--d-border-light-chase-duration) steps(1) infinite; }
  .set.b { animation-delay: calc(var(--d-border-light-chase-duration) / -2); }

  .halo {
    position: absolute;
    inset: 0;
    filter: blur(var(--d-border-light-glow));
    opacity: var(--d-border-light-glow-opacity);
  }

  /* One bulb per `--pitch * 2` tile: a round hole in the mask over a sliding colour gradient. */
  .led {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, var(--d-border-light-pattern)) 0 0 / 200% 100% repeat-x;
    -webkit-mask-image: radial-gradient(circle closest-side, #000 0 62%, transparent 100%);
    mask-image: radial-gradient(circle closest-side, #000 0 62%, transparent 100%);
    -webkit-mask-size: calc(var(--pitch) * 2) 100%;
    mask-size: calc(var(--pitch) * 2) 100%;
    -webkit-mask-repeat: repeat-x;
    mask-repeat: repeat-x;
    animation: flow-right var(--d-border-light-flow-duration) linear infinite;
  }
  .led::after { /* the hot white centre of each bulb */
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle closest-side, var(--d-border-light-core) 0 30%, transparent 62%) 0 0 / calc(var(--pitch) * 2) 100% repeat-x;
  }
  .set.b .led { -webkit-mask-position: var(--pitch) 0; mask-position: var(--pitch) 0; }
  .set.b .led::after { background-position: var(--pitch) 0; }

  /* Vertical edges: the same, turned. */
  .strip.left .led, .strip.right .led {
    background: linear-gradient(180deg, var(--d-border-light-pattern)) 0 0 / 100% 200% repeat-y;
    -webkit-mask-size: 100% calc(var(--pitch) * 2);
    mask-size: 100% calc(var(--pitch) * 2);
    -webkit-mask-repeat: repeat-y;
    mask-repeat: repeat-y;
  }
  .strip.left .led::after, .strip.right .led::after {
    background: radial-gradient(circle closest-side, var(--d-border-light-core) 0 30%, transparent 62%) 0 0 / 100% calc(var(--pitch) * 2) repeat-y;
  }
  .strip.left .set.b .led, .strip.right .set.b .led { -webkit-mask-position: 0 var(--pitch); mask-position: 0 var(--pitch); }
  .strip.left .set.b .led::after, .strip.right .set.b .led::after { background-position: 0 var(--pitch); }

  /* The colours travel clockwise: right along the top, down the right, left along the bottom, up the left. */
  .strip.bottom .led { animation-name: flow-left; }
  .strip.right .led { animation-name: flow-down; }
  .strip.left .led { animation-name: flow-up; }

  /* Static fallbacks: with no motion there is no twinkle, so show every bulb. */
  @keyframes chase { 0% { opacity: 1; } 50% { opacity: var(--d-border-light-dim); } }
  @keyframes flow-right { to { background-position: -200% 0; } }
  @keyframes flow-left { to { background-position: 200% 0; } }
  @keyframes flow-down { to { background-position: 0 -200%; } }
  @keyframes flow-up { to { background-position: 0 200%; } }
</style>
