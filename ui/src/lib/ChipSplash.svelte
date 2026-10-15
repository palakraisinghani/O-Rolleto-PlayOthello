<!-- Start of a game: poker chips burst across the screen three times. In each burst a ring of chips
     rushes in from beyond the edges to the middle of the table, then flies straight back out.
     Counts, colours, size and timing come from design.md (section 18).
     Calls `ondone` when the last chip has left so the parent can remove it. -->
<script lang="ts">
  import { onMount } from 'svelte';

  let { ondone }: { ondone?: () => void } = $props();

  const css = getComputedStyle(document.documentElement);
  const num = (name: string, fallback: number) => Number.parseFloat(css.getPropertyValue(name)) || fallback;
  const COLORS = css.getPropertyValue('--d-chip-colors').split(',').map((c) => c.trim()).filter(Boolean);
  const PER_BURST = Math.max(0, Math.round(num('--d-chip-splash-count', 24)));
  const BURSTS = Math.max(1, Math.round(num('--d-chip-splash-bursts', 3)));
  const DURATION = num('--d-chip-splash-duration', 2.2); // seconds for one burst (in and out)
  const GAP = num('--d-chip-splash-burst-gap', 0.8); // seconds between the starts of two bursts
  const VALUES = ['5', '10', '25', '50', '100', '500'];
  const JITTER = 0.25; // chips of one burst do not leave in perfect lockstep

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  // Positions are percentages of the viewport, measured from its centre. A radius of 62 is beyond
  // every edge (the half-width is 50), so chips enter and leave out of sight.
  const EDGE = 64;
  const point = (angle: number, radius: number) => ({
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius
  });

  const chips = Array.from({ length: BURSTS * PER_BURST }, (_, i) => {
    const burst = Math.floor(i / PER_BURST);
    const n = i % PER_BURST;
    // Spread each burst evenly round the circle; each burst is turned a little from the last.
    const angle = (n / PER_BURST) * Math.PI * 2 + burst * 0.4 + rand(-0.12, 0.12);
    const start = point(angle, EDGE + rand(0, 6));
    const mid = point(angle, rand(1, 7));
    const out = point(angle + rand(-0.05, 0.05), EDGE + rand(2, 10));
    return {
      color: COLORS[i % COLORS.length] ?? '#b3202a',
      value: VALUES[i % VALUES.length],
      sx: start.x, sy: start.y,
      mx: mid.x, my: mid.y,
      ox: out.x, oy: out.y,
      r1: rand(-360, 360),
      r2: rand(-720, 720),
      tilt: Math.random() < 0.5 ? -1 : 1,
      delay: burst * GAP + rand(0, JITTER),
      scale: rand(0.85, 1.25)
    };
  });

  onMount(() => {
    const timer = setTimeout(() => ondone?.(), ((BURSTS - 1) * GAP + JITTER + DURATION + 0.3) * 1000);
    return () => clearTimeout(timer);
  });
</script>

<div class="splash" aria-hidden="true">
  {#each chips as c}
    <div
      class="flight"
      style="--sx:{c.sx}vw; --sy:{c.sy}vh; --mx:{c.mx}vw; --my:{c.my}vh; --ox:{c.ox}vw; --oy:{c.oy}vh;
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
    animation: burst var(--d-chip-splash-duration) linear var(--delay) both;
  }
  /* The chip spins edge-over-edge while it is in the air. */
  .tumble {
    transform-style: preserve-3d;
    animation: tumble 0.5s linear var(--delay) 5 both;
  }
  /* In: speeding up towards the middle. Out: shooting away, slowing as it leaves. */
  @keyframes burst {
    0% {
      transform: translate(var(--sx), var(--sy)) scale(0.5) rotate(0deg);
      opacity: 0;
      animation-timing-function: cubic-bezier(0.45, 0, 0.85, 0.6);
    }
    6% { opacity: 1; }
    46% {
      transform: translate(var(--mx), var(--my)) scale(calc(var(--k) * 1.2)) rotate(var(--r1));
      opacity: 1;
      animation-timing-function: cubic-bezier(0.1, 0.5, 0.3, 1);
    }
    100% {
      transform: translate(var(--ox), var(--oy)) scale(calc(var(--k) * 0.8)) rotate(var(--r2));
      opacity: 1;
    }
  }
  @keyframes tumble {
    from { transform: rotateX(0deg); }
    to { transform: rotateX(calc(360deg * var(--tilt))); }
  }
</style>
