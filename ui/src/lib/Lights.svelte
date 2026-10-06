<!-- The room: just the mahogany wood, plus the RGB border lighting. The border light is a thin
     conic-gradient ring blurred into a glow (and a wider faint halo); only the glow is visible.
     The blur sits on the wrapper because CSS applies masks after filters, so blurring the masked
     ring itself would leave a hard edge. Values come from design.md (sections 2, 3). -->
<div class="room" aria-hidden="true">
  <div class="wood"></div>
  <div class="tint"></div>
  <div class="edge halo"><i class="ring"></i></div>
  <div class="edge glow"><i class="ring"></i></div>
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
  .wood, .tint, .edge { position: absolute; inset: 0; }
  .wood { background: var(--d-main-bg-image); }
  .tint { background: var(--d-main-bg-tint); }

  .edge { mix-blend-mode: screen; opacity: var(--d-border-light-opacity); }
  .edge.glow { filter: blur(var(--d-border-light-glow)); }
  .edge.halo {
    filter: blur(var(--d-border-light-halo));
    opacity: calc(var(--d-border-light-opacity) * var(--d-border-light-halo-opacity));
  }

  /* A ring around the window's edge, painted with a conic gradient whose start angle spins. */
  .ring {
    position: absolute;
    inset: 0;
    padding: var(--d-border-light-width);
    background: conic-gradient(from var(--edge-angle), var(--d-border-light-pattern));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    animation: edge-spin var(--d-border-light-spin-duration) linear infinite;
  }
</style>
