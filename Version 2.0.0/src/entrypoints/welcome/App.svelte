<script lang="ts">
  // First-run setup, redesigned for 2.0.0 (owner's call, 20 Nov 2026): steps on the left, an animated picture of
  // Reclux on the right that follows the step and the choices made. Saves the same settings the popup uses.
  import { tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import Banner from '../../lib/Banner.svelte';
  import Button from '../../lib/Button.svelte';
  import Icon from '../../lib/Icon.svelte';
  import Logo from '../../lib/Logo.svelte';
  import PageFeatures from '../../lib/PageFeatures.svelte';
  import QualityPicker from '../../lib/QualityPicker.svelte';
  import Toggle from '../../lib/Toggle.svelte';
  import { findPreset } from '../../lib/presets';
  import { loadSettings, saveSettings, suggestedPreset, systemAudioWorks } from '../../lib/settings';
  import { openRecorder } from '../../lib/window';
  import Demo from './Demo.svelte';

  const s = $state(loadSettings());
  void suggestedPreset().then((id) => id && (s.presetId = id)); // first run: 720p on PCs with no hardware encoder
  $effect(() => saveSettings({ ...s }));

  const isFirefox = navigator.userAgent.includes('Firefox/');
  const STEPS = ['Welcome', 'Your defaults', 'How it works', 'Ready'];
  const p = $derived(findPreset(s.presetId));

  let step = $state(0);
  let heading = $state<HTMLElement>();
  // Short and snappy; nothing moves for anyone who turned motion off in their computer's settings.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const enter = { y: 12, duration: still ? 0 : 260, delay: still ? 0 : 60 };

  // Move focus to the new step's heading, so keyboard and screen reader users start at the top of it.
  async function go(to: number) {
    step = Math.min(STEPS.length - 1, Math.max(0, to));
    await tick();
    heading?.focus({ focusVisible: false } as FocusOptions);
  }

  // A double click opens one Reclux tab, not two (each one recorded). Free again a second after it opened: Firefox
  // brings the new tab to the front a moment after it is made, and a fast third click landed in between. This page
  // may start another recording later.
  let starting = false;
  const start = async () => {
    if (starting) return;
    starting = true;
    await openRecorder(await browser.tabs.getCurrent()).catch(() => {});
    setTimeout(() => (starting = false), 1000);
  };

  const FEATURES = [
    { icon: 'camera', title: 'Webcam circle', text: 'Your face in a round bubble you can drag anywhere.' },
    { icon: 'zoom', title: 'Cursor zoom', text: 'Zooms in where you work, by itself.' },
    { icon: 'split', title: 'Quick edits', text: 'Split, trim and delete parts before you export.' },
    { icon: 'folder', title: 'Save anywhere', text: 'Any folder or drive, such as D: or E:.' },
  ];
</script>

<div class="page">
  <header>
    <Logo height={26} />
    {#if step < STEPS.length - 1}
      <Button variant="ghost" onclick={() => go(STEPS.length - 1)}>Skip setup</Button>
    {/if}
  </header>

  <main>
    <section class="steps" aria-labelledby="step-title">
      <nav aria-label="Setup progress">
        <ol>
          {#each STEPS as name, i (name)}
            <li class:done={i < step} class:now={i === step} aria-current={i === step ? 'step' : undefined}>
              <span class="track"></span>
              <span class="name"><span class="num">0{i + 1}</span> {name}</span>
            </li>
          {/each}
        </ol>
      </nav>

      {#key step}
        <div class="content" in:fly={enter}>
          {#if step === 0}
            <p class="eyebrow">Reclux 2.0</p>
            <h1 id="step-title" tabindex="-1" bind:this={heading}>Record your screen. Keep it on your computer.</h1>
            <p class="lead">No account, no upload, no internet needed. Your videos never leave this computer.</p>
            <ul class="features">
              {#each FEATURES as f (f.title)}
                <li><span class="ic"><Icon name={f.icon} size={18} /></span><span><strong>{f.title}</strong>{f.text}</span></li>
              {/each}
            </ul>
            <details class="why">
              <summary><Icon name="shield" size={18} /> Why Reclux asks for permissions <Icon name="chevron" size={16} /></summary>
              <ul>
                <li><strong>Downloads:</strong> shows the “Save as” window, so you pick the folder.</li>
                <li><strong>Unlimited storage:</strong> keeps long recordings safe while you record.</li>
                {#if !isFirefox}<li><strong>Power:</strong> keeps the computer awake while recording.</li>{/if}
                <li><strong>Web pages (only for Webcam):</strong> shows the webcam circle and follows your cursor for cursor zoom. Asked when you pick Webcam, never at install.</li>
              </ul>
              <p>Your browser always asks before Reclux can see your screen or hear your microphone.</p>
            </details>
          {:else if step === 1}
            <p class="eyebrow">Step 2 of 4</p>
            <h1 id="step-title" tabindex="-1" bind:this={heading}>Choose your defaults</h1>
            <p class="lead">Change them any time in the toolbar popup.</p>
            <div class="form">
              <PageFeatures bind:camera={s.camera} legend="What you record" />
              <div class="pair"><QualityPicker name="wiz" bind:value={s.presetId} /></div>
              <div class="field">
                <label for="wiz-format">Format</label>
                <select id="wiz-format" bind:value={s.format}>
                  <option value="mp4">MP4 (recommended)</option>
                  <option value="webm">WebM</option>
                </select>
              </div>
              <div class="field">
                <span class="label">Audio</span>
                <Toggle icon="mic" label="Microphone" bind:checked={s.mic} />
                {#if systemAudioWorks}<Toggle icon="speaker" label="System audio" bind:checked={s.system} />{/if}
              </div>
              {#if isFirefox}
                <Banner kind="info" title="Firefox">Firefox always saves MP4 and cannot record system audio.</Banner>
              {/if}
            </div>
          {:else if step === 2}
            <p class="eyebrow">Step 3 of 4</p>
            <h1 id="step-title" tabindex="-1" bind:this={heading}>How a recording works</h1>
            <ol class="how">
              <li><span class="n">1</span><span><strong>Start recording</strong> from the toolbar. Your browser asks what to share: a tab, a window or your whole screen.{#if !isFirefox}{' '}Keep its audio switch on for sound.{/if}</span></li>
              <li><span class="n">2</span><span><strong>5 · 4 · 3 · 2 · 1</strong>, then it records. Work in any tab or app.</span></li>
              <li><span class="n">3</span><span><strong>Pause, stop or mute</strong> from the small controls window. The pin keeps it on top.</span></li>
              <li><span class="n">4</span><span><strong>Edit, then export.</strong> Split and trim, then choose any folder.</span></li>
            </ol>
            <Banner kind="warning" title="Always export your video">
              Until you export it, it lives in the browser’s private storage. Clearing browser data deletes it. After a crash,
              Reclux offers to recover it.
            </Banner>
          {:else}
            <p class="eyebrow">All set</p>
            <h1 id="step-title" tabindex="-1" bind:this={heading}>You’re ready to record</h1>
            <p class="lead">Your browser asks what to share, then Reclux counts down from 5 and records.</p>
            <Banner kind="info" title="Tip: pin Reclux to the toolbar">
              Click the puzzle piece in your browser’s toolbar, then the pin next to Reclux.
            </Banner>
            <div class="cta">
              <Button variant="primary" size="lg" icon="record" onclick={start}>Start recording</Button>
            </div>
          {/if}
        </div>
      {/key}

      <footer>
        {#if step > 0}<Button variant="secondary" onclick={() => go(step - 1)}>Back</Button>{:else}<span></span>{/if}
        {#if step < STEPS.length - 1}
          <Button variant="primary" onclick={() => go(step + 1)}>{step === 0 ? 'Get started' : 'Next'}</Button>
        {/if}
      </footer>
    </section>

    <aside class="stage glass">
      <Demo {step} camera={s.camera} info="{p.height}p · {p.fps} fps" />
    </aside>
  </main>
</div>

<style>
  .page {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 100vh;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-4);
    min-height: calc(var(--tap) + 2 * var(--s-3)); /* the same height on the last step, without Skip setup */
    padding: var(--s-3) var(--s-6);
    border-bottom: 1px solid var(--c-border);
  }
  /* Steps left, the animated picture right. */
  main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: var(--s-6);
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: var(--s-6);
  }
  .steps {
    display: flex;
    flex-direction: column;
    gap: var(--s-5);
    min-width: 0;
  }
  nav ol {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--s-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  nav li {
    display: grid;
    gap: var(--s-2);
    font-size: var(--t-xs);
    font-weight: 600;
    color: var(--c-text-muted);
  }
  .track {
    height: 4px;
    border-radius: var(--r-pill);
    background: var(--c-border);
    transition: background var(--ease);
  }
  .done .track,
  .now .track {
    background: var(--c-accent);
  }
  .now {
    color: var(--c-text);
  }
  .num {
    font-family: var(--font-mono);
  }
  .content {
    display: grid;
    align-content: start;
    gap: var(--s-4);
    flex: 1;
  }
  .eyebrow {
    font-size: var(--t-xs);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--c-accent-text);
  }
  h1 {
    font-size: var(--t-2xl);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.025em;
    outline: none;
  }
  .lead {
    font-size: var(--t-md);
    color: var(--c-text-muted);
    max-width: 34rem;
  }
  .features {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .features li {
    display: flex;
    gap: var(--s-3);
    padding: var(--s-3);
    border-radius: var(--r-lg);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    font-size: var(--t-sm);
    color: var(--c-text-muted);
  }
  .features strong {
    display: block;
    color: var(--c-text);
  }
  .ic {
    display: grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--c-accent) 10%, transparent);
    color: var(--c-accent-text);
  }
  .why {
    border-radius: var(--r-lg);
    border: 1px solid var(--c-border);
    background: var(--c-surface);
    font-size: var(--t-sm);
  }
  .why summary {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    min-height: var(--tap);
    padding: 0 var(--s-4);
    font-weight: 600;
    list-style: none;
    cursor: pointer;
  }
  .why summary::-webkit-details-marker {
    display: none;
  }
  .why summary :global(svg:last-child) {
    margin-left: auto;
    transition: transform var(--ease);
  }
  .why[open] summary :global(svg:last-child) {
    transform: rotate(180deg);
  }
  .why ul {
    display: grid;
    gap: var(--s-2);
    margin: 0;
    padding: 0 var(--s-4) var(--s-2) calc(var(--s-4) + 18px);
    color: var(--c-text-muted);
  }
  .why strong {
    color: var(--c-text);
  }
  .why p {
    padding: 0 var(--s-4) var(--s-4);
    color: var(--c-text-muted);
  }
  .form {
    display: grid;
    gap: var(--s-4);
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-3);
  }
  .field {
    display: grid;
    gap: var(--s-2);
  }
  label[for],
  .label {
    font-size: var(--t-sm);
    font-weight: 600;
  }
  .how {
    display: grid;
    gap: var(--s-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .how li {
    display: flex;
    gap: var(--s-3);
    align-items: flex-start;
    color: var(--c-text-muted);
  }
  .how strong {
    color: var(--c-text);
  }
  .n {
    display: grid;
    place-items: center;
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--c-text);
    color: var(--c-bg);
    font: 700 var(--t-sm) / 1 var(--font-mono);
  }
  .cta :global(.lg) {
    min-width: 14rem;
  }
  footer {
    display: flex;
    justify-content: space-between;
    gap: var(--s-3);
    padding-top: var(--s-4);
    border-top: 1px solid var(--c-border);
  }
  /* Frosted glass over soft red and ink light, so the glass reads as glass. */
  .stage {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 480px;
    padding: var(--s-5);
    border-radius: var(--r-xl);
    overflow: hidden;
    isolation: isolate;
  }
  .stage::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: radial-gradient(40% 35% at 18% 20%, rgb(242 11 24 / 22%), transparent 70%),
      radial-gradient(45% 40% at 85% 85%, color-mix(in srgb, var(--c-text) 14%, transparent), transparent 70%);
    filter: blur(24px);
  }
  /* Narrow windows: the picture goes under the steps, smaller. */
  @media (max-width: 900px) {
    main {
      grid-template-columns: 1fr;
      padding: var(--s-4);
    }
    header {
      padding: var(--s-3) var(--s-4);
    }
    .stage {
      min-height: 360px;
    }
    .features {
      grid-template-columns: 1fr;
    }
  }
</style>
