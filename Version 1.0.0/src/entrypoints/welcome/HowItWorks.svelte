<script lang="ts">
  // The "How a recording works" step: four small cards, each with a looping micro-animation.
  // The sentence under each picture says the same thing, so the pictures are hidden from screen readers.
  import { gsap } from 'gsap';
  import { onMount } from 'svelte';
  import Icon from '../../lib/Icon.svelte';

  let { isFirefox }: { isFirefox: boolean } = $props();
  let root: HTMLElement;

  onMount(() => {
    const motion = gsap.matchMedia(root);
    // Anyone who turned off animations in their system settings sees the finished picture, with nothing moving.
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const loop = (delay = 0) => gsap.timeline({ repeat: -1, repeatDelay: 1.2, delay });

      // 1. The pointer presses Start, then the browser's window opens and its audio switch turns on.
      loop()
        .set('.pointer', { x: 56, y: 30, opacity: 1 })
        .set('.start', { scale: 1, opacity: 1 })
        .set('.picker', { opacity: 0, y: 8 })
        .set('.knob', { x: 0 })
        .set('.switch', { backgroundColor: 'var(--c-border)' })
        .to('.pointer', { x: 0, y: 0, duration: 0.7, ease: 'power2.inOut' })
        .to('.start', { scale: 0.92, duration: 0.1 })
        .to('.start', { scale: 1, duration: 0.15 })
        .to('.start', { opacity: 0, duration: 0.15 })
        .to('.pointer', { x: 40, y: 18, duration: 0.4, ease: 'power2.inOut' }, '<')
        .to('.picker', { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, '<')
        .to('.knob', { x: 12, duration: 0.2 }, '+=0.3')
        .to('.switch', { backgroundColor: 'var(--c-accent)', duration: 0.2 }, '<');

      // 2. 3, 2, 1, then the red recording dot.
      const count = loop(0.4).set('.rec', { opacity: 0 });
      gsap.utils.toArray<HTMLElement>('.digit').forEach((digit) => {
        count
          .set(digit, { opacity: 1, scale: 1.3 })
          .to(digit, { scale: 1, duration: 0.65, ease: 'power2.out' })
          .set(digit, { opacity: 0 });
      });
      count
        .set('.rec', { opacity: 1 })
        .fromTo('.rec-dot', { scale: 1 }, { scale: 1.35, duration: 0.45, repeat: 3, yoyo: true, ease: 'sine.inOut' });

      // 3. Pause, Stop and Mute light up in turn.
      const keys = loop(0.8);
      gsap.utils.toArray<HTMLElement>('.key').forEach((key) => {
        keys.to(key, { backgroundColor: 'var(--c-accent)', color: '#fff', duration: 0.2 }).to(key, {
          backgroundColor: 'var(--c-surface-2)',
          color: 'var(--c-text-muted)',
          duration: 0.3,
          delay: 0.35,
        });
      });

      // 4. The file drops into the folder, and the tick appears.
      loop(1.2)
        .set('.file', { y: -26, opacity: 0, scale: 1 })
        .set('.tick', { scale: 0, opacity: 0 })
        .to('.file', { y: 0, opacity: 1, duration: 0.6, ease: 'bounce.out' })
        .to('.file', { y: 10, scale: 0.6, opacity: 0, duration: 0.25, delay: 0.3 })
        .to('.tick', { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.5)' });
    });
    return () => motion.revert();
  });
</script>

<ol class="how" bind:this={root}>
  <li>
    <div class="art" aria-hidden="true">
      <span class="start"><Icon name="record" size={12} /> Start</span>
      <div class="picker">
        <span class="row">Share screen</span>
        <span class="row small">Share audio <span class="switch"><span class="knob"></span></span></span>
      </div>
      <svg class="pointer" width="16" height="16" viewBox="0 0 24 24"><path d="M5 3l14 9-6 1.5L10 20z" /></svg>
    </div>
    <p><span class="n">1</span><span><strong>Press Start recording.</strong> Your browser asks what to share: a tab, a window or the whole screen.{#if !isFirefox}{' '}Keep its audio switch on to include sound.{/if}</span></p>
  </li>
  <li>
    <div class="art" aria-hidden="true">
      <span class="digit">3</span><span class="digit">2</span><span class="digit">1</span>
      <span class="rec"><span class="rec-dot"></span> REC</span>
    </div>
    <p><span class="n">2</span><span><strong>3 … 2 … 1, then it records.</strong> Switch to other tabs or apps as you like. It keeps recording.</span></p>
  </li>
  <li>
    <div class="art" aria-hidden="true">
      <span class="keys">
        <span class="key"><Icon name="pause" size={16} /></span>
        <span class="key"><Icon name="stop" size={16} /></span>
        <span class="key"><Icon name="mic" size={16} /></span>
      </span>
    </div>
    <p><span class="n">3</span><span><strong>Pause, Stop or Mute</strong> from the recorder page.</span></p>
  </li>
  <li>
    <div class="art" aria-hidden="true">
      <span class="file">MP4</span>
      <span class="folder">
        <Icon name="folder" size={40} />
        <span class="tick"><Icon name="check" size={14} /></span>
      </span>
    </div>
    <p><span class="n">4</span><span><strong>Press Save file.</strong> Choose any folder or drive.</span></p>
  </li>
</ol>

<style>
  .how {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--s-3);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  @media (max-width: 520px) {
    .how {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  li {
    display: grid;
    align-content: start;
    gap: var(--s-3);
    padding: var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-bg);
  }
  p {
    display: flex;
    gap: var(--s-2);
    align-items: flex-start;
    font-size: var(--t-sm);
  }
  .n {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--c-accent);
    color: var(--c-on-accent);
    font-size: var(--t-xs);
    font-weight: 700;
  }
  .art {
    position: relative;
    display: grid;
    place-items: center;
    height: 96px;
    overflow: hidden;
    border-radius: var(--r-sm);
    background: var(--c-surface-2);
    color: var(--c-text-muted);
  }
  /* Everything in a card shares one spot, and the animation decides what shows when. */
  .art > * {
    grid-area: 1 / 1;
  }
  .start {
    display: inline-flex;
    align-items: center;
    gap: var(--s-1);
    padding: var(--s-1) var(--s-3);
    border-radius: var(--r-pill);
    background: var(--c-accent);
    color: var(--c-on-accent);
    font-size: var(--t-xs);
    font-weight: 700;
    opacity: 0; /* the still picture without animation shows the finished state: the open window */
  }
  .picker {
    display: grid;
    gap: var(--s-1);
    width: 80%;
    padding: var(--s-2);
    border: 1px solid var(--c-border);
    border-radius: var(--r-sm);
    background: var(--c-bg);
    box-shadow: var(--shadow);
    color: var(--c-text);
    font-size: var(--t-xs);
    font-weight: 600;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .row.small {
    font-weight: 400;
    color: var(--c-text-muted);
  }
  .switch {
    display: inline-block;
    flex: none;
    width: 26px;
    height: 14px;
    padding: 2px;
    border-radius: var(--r-pill);
    background: var(--c-accent);
  }
  .knob {
    display: block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #fff;
    transform: translateX(12px);
  }
  .pointer {
    opacity: 0;
    fill: var(--c-text);
    stroke: var(--c-bg);
    stroke-width: 2;
  }
  .digit {
    opacity: 0;
    font: 800 var(--t-xl) / 1 var(--font-mono);
    color: var(--c-text);
  }
  .rec {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    font-size: var(--t-sm);
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--c-accent-text);
  }
  .rec-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c-accent);
  }
  .keys {
    display: flex;
    gap: var(--s-2);
  }
  .key {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: var(--r-sm);
    background: var(--c-surface-2);
    box-shadow: inset 0 0 0 1px var(--c-border);
  }
  .file {
    position: relative;
    z-index: 1;
    margin-top: -40px;
    padding: 2px var(--s-2);
    border-radius: 4px;
    background: var(--c-accent);
    color: var(--c-on-accent);
    font-size: 10px;
    font-weight: 700;
    opacity: 0;
  }
  .folder {
    position: relative;
    display: inline-grid;
    margin-top: var(--s-3);
  }
  .tick {
    position: absolute;
    right: -6px;
    bottom: -2px;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--c-ok);
    color: var(--c-bg);
  }
</style>
