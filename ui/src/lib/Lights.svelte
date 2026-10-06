<!-- Animated disco backdrop: drifting colour glows, slow rotating light beams, vignette.
     Colours and speeds come from design.md (sections 1 and 2). -->
<div class="lights" aria-hidden="true">
  <div class="beams"></div>
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <div class="blob b4"></div>
  <div class="vignette"></div>
</div>

<style>
  .lights {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    background: radial-gradient(ellipse at 50% 20%, var(--d-main-bg-glow), var(--d-main-bg) 70%);
    pointer-events: none;
  }
  .blob {
    position: absolute;
    width: 60vmax;
    height: 60vmax;
    border-radius: 50%;
    filter: blur(var(--d-blobs-blur));
    opacity: var(--d-blobs-opacity);
    mix-blend-mode: var(--d-blobs-blend);
    will-change: transform;
  }
  .b1 { background: var(--d-neon-pink); top: -25vmax; left: -20vmax; animation: drift1 calc(22s * var(--d-blobs-drift-slowness)) ease-in-out infinite alternate; }
  .b2 { background: var(--d-neon-cyan); top: 10vmax; right: -28vmax; opacity: calc(var(--d-blobs-opacity) * 0.75); animation: drift2 calc(27s * var(--d-blobs-drift-slowness)) ease-in-out infinite alternate; }
  .b3 { background: var(--d-neon-purple); bottom: -30vmax; left: 5vmax; animation: drift3 calc(31s * var(--d-blobs-drift-slowness)) ease-in-out infinite alternate; }
  .b4 { background: var(--d-neon-yellow); bottom: -35vmax; right: -10vmax; width: 45vmax; height: 45vmax; opacity: calc(var(--d-blobs-opacity) * 0.5); animation: drift4 calc(25s * var(--d-blobs-drift-slowness)) ease-in-out infinite alternate; }

  /* Rotating spotlight beams from above, like a disco ball. */
  .beams {
    --pink: color-mix(in srgb, var(--d-neon-pink) 90%, transparent);
    --cyan: color-mix(in srgb, var(--d-neon-cyan) 85%, transparent);
    --yellow: color-mix(in srgb, var(--d-neon-yellow) 75%, transparent);
    --purple: color-mix(in srgb, var(--d-neon-purple) 90%, transparent);
    --lime: color-mix(in srgb, var(--d-neon-lime) 65%, transparent);
    position: absolute;
    left: 50%;
    top: -60vmax;
    width: 160vmax;
    height: 160vmax;
    margin-left: -80vmax;
    background: conic-gradient(
      from 0deg,
      transparent 0deg 8deg, var(--pink) 12deg, transparent 18deg 50deg,
      var(--cyan) 55deg, transparent 62deg 100deg,
      var(--yellow) 106deg, transparent 112deg 150deg,
      var(--purple) 156deg, transparent 163deg 200deg,
      var(--lime) 205deg, transparent 211deg 255deg,
      var(--pink) 260deg, transparent 267deg 310deg,
      var(--cyan) 316deg, transparent 323deg 360deg
    );
    mix-blend-mode: screen;
    opacity: var(--d-beams-opacity);
    filter: blur(6px);
    animation: spin var(--d-beams-spin-duration) linear infinite;
  }
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 45%, var(--d-vignette-color) 100%);
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes drift1 { to { transform: translate(35vmax, 22vmax) scale(1.2); } }
  @keyframes drift2 { to { transform: translate(-40vmax, 30vmax) scale(0.85); } }
  @keyframes drift3 { to { transform: translate(30vmax, -26vmax) scale(1.15); } }
  @keyframes drift4 { to { transform: translate(-35vmax, -30vmax) scale(1.3); } }
</style>
