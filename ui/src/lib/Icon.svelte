<!-- Line icons for the round control buttons. They take their colour from the button (currentColor). -->
<script lang="ts">
  let { name }: { name: 'home' | 'undo' | 'hint' | 'resign' | 'new' | 'back' | 'next' | 'first' | 'last' } = $props();
</script>

<svg viewBox="0 0 24 24" width="52%" height="52%" fill="none" stroke="currentColor" stroke-width="2.2"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if name === 'home'}
    <path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h4.5v-6h4v6h4.5V10" />
  {:else if name === 'undo'}
    <path d="M9 14 4 9l5-5" /><path d="M4 9h9.5a6 6 0 0 1 0 12H11" />
  {:else if name === 'hint'}
    <path d="M9.5 18h5" /><path d="M10.5 21h3" />
    <path d="M12 3a6 6 0 0 0-3.8 10.6c.8.7 1.3 1.4 1.3 2.4h5c0-1 .5-1.7 1.3-2.4A6 6 0 0 0 12 3z" />
  {:else if name === 'resign'}
    <path d="M5.5 21V4" /><path d="M5.5 4.5h12L15 8.5l2.5 4h-12" />
  {:else if name === 'new'}
    <circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" />
  {:else if name === 'back'}
    <path d="M15 5 8 12l7 7" />
  {:else if name === 'next'}
    <path d="M9 5l7 7-7 7" />
  {:else if name === 'first'}
    <path d="M6 5v14" /><path d="M18 5l-7 7 7 7" />
  {:else if name === 'last'}
    <path d="M18 5v14" /><path d="M6 5l7 7-7 7" />
  {/if}
</svg>
