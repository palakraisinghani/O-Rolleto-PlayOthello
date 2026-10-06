<!-- Start of a game: poker chips are thrown in from the bottom and the sides, arc across the
     screen, land, bounce and fade. Counts, colours, size and timing come from design.md (section 17).
     Calls `ondone` when the last chip has faded so the parent can remove it. -->
<script lang="ts">
  import { onMount } from 'svelte';

  let { ondone }: { ondone?: () => void } = $props();

  const css = getComputedStyle(document.documentElement);
  const COLORS = css.getPropertyValue('--d-chip-colors').split(',').map((c) => c.trim()).filter(Boolean);
  const COUNT = Math.max(0, Number.parseInt(css.getPropertyValue('--d-chip-splash-count'), 10) || 0);
  const DURATION = Number.parseFloat(css.getPropertyValue('--d-chip-splash-duration')) || 2.8; // seconds
  const VALUES = ['5', '10', '25', '50', '100', '500'];
  const MAX_DELAY = 0.7;

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  // Launch points: bottom-left corner, bottom-centre, bottom-right corner (all just off screen).
  const ORIGINS = [
    { x: -6, y: 104 },
    { x: 50, y: 110 },
    { x: 106, y: 104 }
  ];

  const chips = Array.from({ length: COUNT }, (_, i) => {
    const o = ORIGINS[i % ORIGINS.length];
    const tx = rand(5, 95);
    const ty = rand(10, 88);
    return {
      color: COLORS[i % COLORS.length] ?? '#b3202a',
      value: VALUES[i % VALUES.length],
      sx: o.x, sy: o.y,
      mx: (o.x + tx) / 2 + rand(-8, 8),
      my: Math.min(o.y, ty) - rand(14, 32),
      tx, ty,
      r1: rand(-300, 300),
      r2: rand(-540, 540),
      tilt: rand(0, 1) < 0.5 ? -1 : 1,
      delay: (i / Math.max(COUNT, 1)) * MAX_DELAY + rand(0, 0.12),
      scale: rand(0.85, 1.25)
    };
  });

  onMount(() => {
    const timer = setTimeout(() => ondone?.(), (DURATION + MAX_DELAY + 0.4) * 1000);
    return () => clearTimeout(timer);
  });
</script>

<div class="splash" aria-hidden="true">
  {#each chips as c}
    <div
      class="flight"
      style="--sx:{c.sx}vw; --sy:{c.sy}vh; --mx:{c.mx}vw; --my:{c.my}vh; --tx:{c.tx}vw; --ty:{c.ty}vh;
             --r1:{c.r1}deg; --r2:{c.r2}deg; --delay:{c.delay}s; --k:{c.scale}"
    >
      <div class="tumble" style="--tilt:{c.tilt}">
        <span class="pchip" data-v={c.value} style="--c:{c.color}"></span>
      </div>
    </div>
  {/each}
</div>

<style>
  .splash {
    position: fixed;
    inset: 0;
    z-index: 25;
    pointer-events: none;
    overflow: hidden;
    perspective: 700px;
  }
  .flight {
    position: absolute;
    left: 0;
    top: 0;
    margin: calc(var(--d-chip-size) / -2) 0 0 calc(var(--d-chip-size) / -2);
    opacity: 0;
    animation: splash var(--d-chip-splash-duration) cubic-bezier(0.3, 0.6, 0.4, 1) var(--delay) both;
  }
  /* The chip spins edge-over-edge while it is in the air. */
  .tumble {
    transform-style: preserve-3d;
    animation: tumble 0.55s linear var(--delay) 4 both;
  }
  @keyframes splash {
    0% { transform: translate(var(--sx), var(--sy)) scale(0.3) rotate(0deg); opacity: 0; }
    8% { opacity: 1; }
    45% { transform: translate(var(--mx), var(--my)) scale(calc(var(--k) * 1.15)) rotate(var(--r1)); }
    72% { transform: translate(var(--tx), var(--ty)) scale(var(--k)) rotate(var(--r2)); opacity: 1; }
    80% { transform: translate(var(--tx), calc(var(--ty) - 2.5vh)) scale(var(--k)) rotate(var(--r2)); }
    88% { transform: translate(var(--tx), var(--ty)) scale(var(--k)) rotate(var(--r2)); opacity: 1; }
    100% { transform: translate(var(--tx), var(--ty)) scale(var(--k)) rotate(var(--r2)); opacity: 0; }
  }
  @keyframes tumble {
    from { transform: rotateX(0deg); }
    to { transform: rotateX(calc(360deg * var(--tilt))); }
  }
</style>
