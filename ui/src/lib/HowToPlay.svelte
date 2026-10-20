<!-- The How to Play page: short steps, each with a picture drawn from the real board and buttons. -->
<script lang="ts">
  import Icon from './Icon.svelte';
  import MiniBoard from './MiniBoard.svelte';

  let { onback }: { onback: () => void } = $props();
</script>

<div class="plaque panel guide">
  <section class="step">
    <h2><span class="n">1</span> Trap to flip</h2>
    <p>Black moves first. Place a disc so that it traps one or more of your opponent's discs in a straight line between the new disc and another of your own. The trapped discs flip to your colour.</p>
    <div class="figs">
      <figure>
        <MiniBoard rows={['.....', '.BWW.', '.....']} ring={[9]} label="Black can play at the end of the row" />
        <figcaption>Black can play here…</figcaption>
      </figure>
      <span class="arrow" aria-hidden="true">→</span>
      <figure>
        <MiniBoard rows={['.....', '.BBBB', '.....']} placed={9} label="Both white discs have flipped" />
        <figcaption>…and flips both white discs.</figcaption>
      </figure>
    </div>
  </section>

  <section class="step">
    <h2><span class="n">2</span> Any direction</h2>
    <p>Across, up and down, or diagonally: one move can flip discs in several directions at once. You must flip at least one disc.</p>
    <div class="figs">
      <figure>
        <MiniBoard rows={['B.B.B', '.WWW.', '.....']} ring={[12]} label="Black can play below the middle" />
        <figcaption>One square, three lines.</figcaption>
      </figure>
      <span class="arrow" aria-hidden="true">→</span>
      <figure>
        <MiniBoard rows={['B.B.B', '.BBB.', '..B..']} placed={12} label="Three discs flipped" />
        <figcaption>Three discs flip.</figcaption>
      </figure>
    </div>
  </section>

  <section class="step">
    <h2><span class="n">3</span> Passing</h2>
    <p>If you have no legal move you pass, and the other player plays again. You will always see a notice, and passes are never silent.</p>
    <div class="figs"><p class="banner-sample">White has no legal move — Black plays again</p></div>
  </section>

  <section class="step">
    <h2><span class="n">4</span> Winning</h2>
    <p>The game ends when neither player can move or the board is full. The player with the most discs wins.</p>
    <div class="figs">
      <div class="score"><i class="disc b"></i><strong>40</strong></div>
      <span class="vs">to</span>
      <div class="score"><i class="disc w"></i><strong>24</strong></div>
    </div>
  </section>

  <section class="step">
    <h2><span class="n">5</span> Tips from Orolleto</h2>
    <p>Stuck? On Easy and Medium you can ask the dealer for a <b>Tip</b>: he points out the best move he sees, with a glowing square on the board. You get <b>5 tips per game on Easy</b> and <b>3 on Medium</b>; the number left is shown on the button. Hard and Master have no tips, and neither does a game between two players.</p>
    <div class="figs">
      <div class="button-sample">
        <button class="btn icon" tabindex="-1" aria-hidden="true"><Icon name="hint" /></button>
        <span>Tip (5)</span>
      </div>
      <span class="arrow" aria-hidden="true">→</span>
      <figure>
        <MiniBoard rows={['.....', '.BWW.', '.....']} tip={9} label="The tip highlights the best square" />
        <figcaption>The glowing square is his pick.</figcaption>
      </figure>
    </div>
  </section>

  <section class="step">
    <h2><span class="n">6</span> Legal-move rings</h2>
    <p>On Easy, pulsing rings mark every square you can play. From Medium upwards you have to find your moves yourself.</p>
    <div class="figs">
      <figure>
        <MiniBoard rows={['....', '.WB.', '.BW.', '....']} ring={[1, 4, 11, 14]} label="Rings on the four opening moves" />
        <figcaption>Black's four opening moves.</figcaption>
      </figure>
    </div>
  </section>


  <div class="row"><button class="btn small" onclick={onback}>Back</button></div>
</div>

<style>
  .guide { display: flex; flex-direction: column; gap: 1.5rem; padding: 1.4rem 1.2rem; text-align: left; }
  .row { display: flex; justify-content: center; margin-top: 0.2rem; }
  .step { display: flex; flex-direction: column; gap: 0.6rem; }
  .step h2 { margin: 0; font: 700 1.15rem / 1.2 var(--d-font-serif); color: var(--d-ink); display: flex; align-items: center; gap: 0.6rem; }
  .step p { margin: 0; line-height: 1.55; }
  .n {
    display: inline-grid; place-items: center; width: 1.7rem; aspect-ratio: 1; border-radius: 50%;
    font: 900 0.95rem / 1 var(--d-font-serif); color: #1a0f08; background: var(--d-brass);
    box-shadow: 0 0 8px var(--d-brass-light);
  }
  .figs { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.9rem 0.8rem; margin-top: 0.3rem; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 0.55rem; }
  figcaption { font-size: 0.85rem; color: var(--d-ink-dim); text-align: center; max-width: 14rem; }
  .arrow, .vs { font-size: 1.6rem; color: var(--d-brass-light); }
  .vs { font: 700 1rem var(--d-font-serif); }
  .banner-sample {
    text-align: center; padding: 0.6rem 1rem; border-radius: 10px;
    font-family: var(--d-font-serif); font-weight: 700; color: var(--d-banner-text);
    background: var(--d-banner-bg); border: 2px solid var(--d-banner-border); box-shadow: 0 0 22px var(--d-banner-border);
  }
  .score { display: flex; align-items: center; gap: 0.6rem; }
  .score strong { font: 900 2rem / 1 var(--d-font-serif); color: var(--d-scoreboard-count-color); text-shadow: 0 0 10px var(--d-scoreboard-count-glow); }
  .disc { width: 2.2rem; aspect-ratio: 1; border-radius: 50%; display: block; }
  .disc.b { background: var(--d-disc-black-bg); box-shadow: inset 0 0 0 2px var(--d-disc-black-rim); }
  .disc.w { background: var(--d-disc-white-bg); box-shadow: inset 0 0 0 2px var(--d-disc-white-rim); }
  .button-sample { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; font-size: 0.8rem; font-weight: 600; }
  .button-sample .btn { pointer-events: none; width: 3.2rem; height: 3.2rem; flex: none; }
</style>
