<!-- Celebration: confetti falling over the screen. Pure CSS animation, generated once per mount. -->
<script lang="ts">
  // Colours and count come from design.md (section 14), read from the injected CSS variables.
  const css = getComputedStyle(document.documentElement);
  const COLORS = css.getPropertyValue('--d-confetti-colors').split(',').map((c) => c.trim()).filter(Boolean);
  const COUNT = Math.max(0, Number.parseInt(css.getPropertyValue('--d-confetti-count'), 10) || 0);
  const pieces = Array.from({ length: COUNT }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 1.8,
    duration: 3 + Math.random() * 2.5,
    color: COLORS[i % COLORS.length] ?? '#fff',
    size: 7 + Math.random() * 8,
    spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
    drift: (Math.random() - 0.5) * 30
  }));
</script>

<div class="confetti" aria-hidden="true">
  {#each pieces as p}
    <span
      style="left:{p.left}%; width:{p.size}px; height:{p.size * 0.5}px; background:{p.color};
             animation-delay:{p.delay}s; animation-duration:{p.duration}s;
             --spin:{p.spin}deg; --drift:{p.drift}vw"
    ></span>
  {/each}
</div>

<style>
  .confetti { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 20; }
  span {
    position: absolute;
    top: -5vh;
    border-radius: 2px;
    opacity: 0;
    animation-name: fall;
    animation-timing-function: cubic-bezier(0.3, 0.1, 0.6, 1);
    animation-iteration-count: infinite;
  }
  @keyframes fall {
    0% { transform: translate3d(0, 0, 0) rotate(0); opacity: 1; }
    100% { transform: translate3d(var(--drift), 110vh, 0) rotate(var(--spin)); opacity: 1; }
  }
</style>
