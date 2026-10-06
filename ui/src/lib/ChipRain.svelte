<!-- Victory: poker chips rain from the top of the screen, tumbling as they fall.
     Counts, colours, size and speed come from design.md (section 17). -->
<script lang="ts">
  const css = getComputedStyle(document.documentElement);
  const COLORS = css.getPropertyValue('--d-chip-colors').split(',').map((c) => c.trim()).filter(Boolean);
  const COUNT = Math.max(0, Number.parseInt(css.getPropertyValue('--d-chip-rain-count'), 10) || 0);
  const SLOWNESS = Number.parseFloat(css.getPropertyValue('--d-chip-rain-slowness')) || 1;
  const VALUES = ['5', '10', '25', '50', '100', '500'];

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  const chips = Array.from({ length: COUNT }, (_, i) => ({
    color: COLORS[i % COLORS.length] ?? '#b3202a',
    value: VALUES[i % VALUES.length],
    left: rand(0, 100),
    delay: rand(0, 2.4),
    duration: rand(2.6, 4.8) * SLOWNESS,
    scale: rand(0.7, 1.2),
    drift: rand(-14, 14),
    spinZ: (Math.random() < 0.5 ? -1 : 1) * rand(180, 720),
    spinX: (Math.random() < 0.5 ? -1 : 1) * rand(360, 1080)
  }));
</script>

<div class="rain" aria-hidden="true">
  {#each chips as c}
    <div
      class="drop"
      style="left:{c.left}%; --delay:{c.delay}s; --dur:{c.duration}s; --k:{c.scale};
             --drift:{c.drift}vw; --sz:{c.spinZ}deg; --sx:{c.spinX}deg"
    >
      <span class="pchip" data-v={c.value} style="--c:{c.color}"></span>
    </div>
  {/each}
</div>

<style>
  .rain {
    position: fixed;
    inset: 0;
    z-index: 25;
    pointer-events: none;
    overflow: hidden;
    perspective: 800px;
  }
  .drop {
    position: absolute;
    top: 0;
    margin-left: calc(var(--d-chip-size) / -2);
    opacity: 0;
    transform-style: preserve-3d;
    animation: rain var(--dur) cubic-bezier(0.35, 0.05, 0.75, 0.6) var(--delay) infinite;
  }
  @keyframes rain {
    0% { transform: translate3d(0, -14vh, 0) scale(var(--k)) rotateX(0deg) rotateZ(0deg); opacity: 1; }
    92% { opacity: 1; }
    100% { transform: translate3d(var(--drift), 112vh, 0) scale(var(--k)) rotateX(var(--sx)) rotateZ(var(--sz)); opacity: 1; }
  }
</style>
