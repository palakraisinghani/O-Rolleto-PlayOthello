<!-- Where Orolleto stands on the menu pages: big in the corner of a roomy window, a small figure with
     his bubble above the page content in a narrower one, and nowhere in a window too short for him. -->
<script lang="ts">
  import Croupier from './Croupier.svelte';
  import type { Mood } from './dealer';

  let { mood = 'idle', say = '' }: { mood?: Mood; say?: string } = $props();
</script>

<div class="slot-big"><Croupier width="clamp(11rem, 15vw, 15rem)" {mood} {say} /></div>
<div class="slot-inline"><Croupier compact width="4.4rem" {mood} {say} /></div>

<style>
  .slot-big, .slot-inline { display: none; }
  .slot-inline { justify-content: center; margin-bottom: 0.6rem; }
  @media (min-width: 1100px) and (min-height: 640px) {
    .slot-big { display: block; position: fixed; left: calc(var(--edge-band) + 1.4rem); bottom: calc(var(--edge-band) + 0.6rem); z-index: 2; }
  }
  @media (max-width: 1099px) and (min-height: 700px) {
    .slot-inline { display: flex; }
  }
</style>
