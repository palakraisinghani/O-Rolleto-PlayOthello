<!-- The room: mahogany wood wall, a warm lamp glow, slow coloured light washes and a golden
     glint sweeping across the grain, with a vignette. All values come from design.md (sections 1, 2). -->
<div class="lights" aria-hidden="true">
  <div class="wood"></div>
  <div class="tint"></div>
  <div class="lamp"></div>
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <div class="glint"></div>
  <div class="vignette"></div>
</div>

<style>
  .lights {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    background: var(--d-main-bg);
    pointer-events: none;
  }
  .wood, .tint, .lamp, .vignette { position: absolute; inset: 0; }
  .wood { background: var(--d-main-bg-image); }
  .tint { background: var(--d-main-bg-tint); }
  .lamp { background: radial-gradient(ellipse at 50% 8%, var(--d-main-bg-glow), transparent 62%); }
  .vignette { background: radial-gradient(ellipse at center, transparent 42%, var(--d-vignette-color) 100%); }

  .blob {
    position: absolute;
    width: 55vmax;
    height: 55vmax;
    border-radius: 50%;
    filter: blur(var(--d-blobs-blur));
    opacity: var(--d-blobs-opacity);
    mix-blend-mode: var(--d-blobs-blend);
    will-change: transform;
  }
  .b1 { background: var(--d-neon-pink); top: -22vmax; left: -22vmax; animation: drift1 calc(22s * var(--d-blobs-drift-slowness)) ease-in-out infinite alternate; }
  .b2 { background: var(--d-neon-cyan); top: 12vmax; right: -30vmax; opacity: calc(var(--d-blobs-opacity) * 0.75); animation: drift2 calc(27s * var(--d-blobs-drift-slowness)) ease-in-out infinite alternate; }
  .b3 { background: var(--d-neon-purple); bottom: -30vmax; left: 8vmax; animation: drift3 calc(31s * var(--d-blobs-drift-slowness)) ease-in-out infinite alternate; }

  /* A slow golden reflection crossing the polished wood. */
  .glint {
    position: absolute;
    inset: -30%;
    background: linear-gradient(105deg, transparent 42%, var(--d-glint-color) 50%, transparent 58%);
    opacity: var(--d-glint-opacity);
    mix-blend-mode: screen;
    animation: sweep var(--d-glint-duration) ease-in-out infinite;
  }

  @keyframes sweep { 0% { transform: translateX(-60%); } 100% { transform: translateX(60%); } }
  @keyframes drift1 { to { transform: translate(35vmax, 22vmax) scale(1.2); } }
  @keyframes drift2 { to { transform: translate(-40vmax, 30vmax) scale(0.85); } }
  @keyframes drift3 { to { transform: translate(30vmax, -26vmax) scale(1.15); } }
</style>
