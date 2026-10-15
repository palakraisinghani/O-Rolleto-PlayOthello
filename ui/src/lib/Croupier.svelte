<!-- Orolleto, the card-room dealer: drawn in SVG (no image files), coloured by design.md (section 21).
     `mood` changes his face; `say` shows a speech bubble. `compact` puts the bubble beside him
     instead of above, for the narrow top bar. -->
<script lang="ts">
  import { DEALER_NAME, type Mood } from './dealer';

  let {
    mood = 'idle',
    say = '',
    compact = false,
    width = '8rem'
  }: { mood?: Mood; say?: string; compact?: boolean; width?: string } = $props();
</script>

<div class="croupier {mood}" class:compact style:--w={width}>
  {#if say}
    {#key say}<p class="bubble">{say}</p>{/key}
  {/if}
  <svg viewBox="0 0 160 200" role="img" aria-label="{DEALER_NAME}, the dealer ({mood})">
    <g class="figure">
      <!-- jacket, lapels, shirt and bow tie -->
      <path class="jacket" d="M6 200 C6 156 36 142 80 142 C124 142 154 156 154 200 Z" />
      <path class="lapel" d="M56 144 L80 190 L48 200 L26 200 L28 162 Z" />
      <path class="lapel" d="M104 144 L80 190 L112 200 L134 200 L132 162 Z" />
      <path class="shirt" d="M62 144 L80 192 L98 144 Z" />
      <circle class="pin" cx="116" cy="170" r="3.2" />
      <rect class="skin" x="68" y="118" width="24" height="32" rx="6" />
      <path class="tie" d="M80 152 L58 141 L58 163 Z M80 152 L102 141 L102 163 Z" />
      <rect class="tie knot" x="75" y="146" width="10" height="12" rx="3" />

      <!-- head -->
      <circle class="skin" cx="46" cy="94" r="6.5" />
      <circle class="skin" cx="114" cy="94" r="6.5" />
      <ellipse class="skin" cx="80" cy="90" rx="34" ry="40" />
      <path class="hair" d="M46 84 C42 52 66 40 80 40 C98 40 118 52 114 84 C108 66 96 58 80 58 C64 58 52 66 46 84 Z" />

      <!-- green dealer's eyeshade with a brass band -->
      <path class="visor" d="M42 74 Q80 52 118 74 L118 82 Q80 62 42 82 Z" />
      <path class="band" d="M42 78 Q80 57 118 78" />
      <path class="visor brim" d="M32 86 Q80 64 128 86 Q80 78 32 86 Z" />

      <!-- face -->
      <g class="eyes">
        <ellipse class="white" cx="66" cy="98" rx="7" ry="6" />
        <ellipse class="white" cx="94" cy="98" rx="7" ry="6" />
        <circle class="pupil" cx="67" cy="99" r="3" />
        <circle class="pupil" cx="95" cy="99" r="3" />
      </g>
      <path class="brow l" d="M57 90 Q66 85 75 90" />
      <path class="brow r" d="M85 90 Q94 85 103 90" />
      <path class="nose" d="M80 100 Q75 111 82 112" />
      <path class="hair" d="M58 117 Q69 107 80 114 Q91 107 102 117 Q91 123 80 118 Q69 123 58 117 Z" />
      {#if mood === 'happy'}
        <path class="mouth open" d="M69 125 Q80 142 91 125 Z" />
      {:else if mood === 'sad'}
        <path class="mouth" d="M72 132 Q80 124 88 132" />
      {:else if mood === 'think'}
        <path class="mouth" d="M75 129 H87" />
      {:else}
        <path class="mouth" d="M71 127 Q80 134 89 127" />
      {/if}

      <!-- the chip he is always flipping -->
      <g transform="translate(134 128)">
        <g class="chip">
          <circle r="12" class="chip-face" />
          <circle r="12" class="chip-notch" />
          <circle r="6.5" class="chip-ring" />
        </g>
      </g>
    </g>
  </svg>
</div>

<style>
  .croupier {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    max-width: 100%;
  }
  svg { width: var(--w); height: auto; flex: none; overflow: visible; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.55)); }

  /* ---- palette ---- */
  .jacket { fill: var(--d-croupier-jacket); }
  .lapel { fill: var(--d-croupier-lapel); stroke: rgba(0, 0, 0, 0.5); stroke-width: 1.2; }
  .shirt { fill: var(--d-croupier-shirt); }
  .pin { fill: var(--d-brass-light); stroke: rgba(0, 0, 0, 0.5); stroke-width: 0.8; }
  .tie { fill: var(--d-croupier-tie); stroke: rgba(0, 0, 0, 0.45); stroke-width: 1; }
  .skin { fill: var(--d-croupier-skin); }
  .hair { fill: var(--d-croupier-hair); }
  .visor { fill: var(--d-croupier-visor); stroke: rgba(0, 0, 0, 0.4); stroke-width: 1; }
  .visor.brim { stroke-width: 1.4; }
  .band { fill: none; stroke: var(--d-brass-light); stroke-width: 3; stroke-linecap: round; }
  .white { fill: #fffdf5; stroke: rgba(0, 0, 0, 0.35); stroke-width: 0.8; }
  .pupil { fill: #1b120d; }
  .brow { fill: none; stroke: var(--d-croupier-hair); stroke-width: 3.4; stroke-linecap: round; }
  .nose { fill: none; stroke: rgba(90, 50, 20, 0.45); stroke-width: 2; stroke-linecap: round; }
  .mouth { fill: none; stroke: #7a2e2e; stroke-width: 3; stroke-linecap: round; }
  .mouth.open { fill: #7a1f1f; stroke: #5a1313; stroke-width: 1.5; stroke-linejoin: round; }
  .chip-face { fill: var(--d-croupier-chip); stroke: rgba(0, 0, 0, 0.5); stroke-width: 1; }
  .chip-notch { fill: none; stroke: #f6f0e4; stroke-width: 4; stroke-dasharray: 4.2 5.1; }
  .chip-ring { fill: none; stroke: rgba(255, 255, 255, 0.6); stroke-width: 1.4; }

  /* ---- moods ---- */
  .brow, .pupil { transform-box: fill-box; transform-origin: center; transition: transform 0.3s ease; }
  .happy .brow { transform: translateY(-3px); }
  .sad .brow.l { transform: rotate(14deg) translateY(1px); }
  .sad .brow.r { transform: rotate(-14deg) translateY(1px); }
  .think .brow.r { transform: translateY(-3px) rotate(-6deg); }
  .think .pupil { transform: translate(2.2px, -2.4px); }

  /* ---- motion ---- */
  .figure { transform-box: fill-box; transform-origin: 50% 100%; animation: bob 3.2s ease-in-out infinite; }
  .eyes { transform-box: fill-box; transform-origin: center; animation: blink 5s infinite; }
  .chip { transform-box: fill-box; transform-origin: center; animation: flip 2.6s ease-in-out infinite; }
  .happy .figure { animation: bounce 0.8s ease-in-out infinite; }
  .sad .figure { animation: droop 3.2s ease-in-out infinite; }
  @keyframes bob { 50% { transform: translateY(-2px) rotate(0.6deg); } }
  @keyframes bounce { 50% { transform: translateY(-5px); } }
  @keyframes droop { 50% { transform: translateY(1px) rotate(-0.8deg); } }
  @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.08); } }
  @keyframes flip { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(-1) translateY(-3px); } }
  :global(:root[data-motion='off']) .croupier * { animation: none !important; transition: none !important; }
  @media (prefers-reduced-motion: reduce) { .croupier * { animation: none !important; transition: none !important; } }

  /* ---- speech bubble ---- */
  .bubble {
    position: relative;
    margin: 0;
    max-width: 17rem;
    padding: 0.5rem 0.8rem;
    border-radius: 14px;
    border: 2px solid var(--d-croupier-bubble-border);
    background: var(--d-croupier-bubble-bg);
    color: var(--d-croupier-bubble-text);
    font: 700 0.88rem / 1.3 var(--d-font-serif);
    text-align: center;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
    animation: pop-in 0.35s cubic-bezier(0.2, 1.4, 0.5, 1);
  }
  .bubble::after { /* tail pointing down at him */
    content: '';
    position: absolute;
    left: 50%;
    bottom: -9px;
    width: 14px;
    height: 14px;
    transform: translateX(-50%) rotate(45deg);
    background: inherit;
    border-right: 2px solid var(--d-croupier-bubble-border);
    border-bottom: 2px solid var(--d-croupier-bubble-border);
  }
  @keyframes pop-in { from { transform: scale(0.7) translateY(6px); opacity: 0; } }

  .compact { flex-direction: row; gap: 0.7rem; align-items: center; min-width: 0; }
  .compact .bubble { order: 2; text-align: left; font-size: 0.8rem; padding: 0.35rem 0.65rem; max-width: none; min-width: 0; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .compact .bubble::after { left: -8px; bottom: auto; top: 50%; transform: translateY(-50%) rotate(135deg); }
</style>
