<script lang="ts">
  // The right half of the welcome page: a small animated picture of Reclux for the step on the left
  // (owner's call, 20 Nov 2026). Pictures only: the words on the left say the same, so this is hidden from
  // screen readers. GSAP is already part of Reclux (packed in, no download). With "reduce motion" on in the
  // computer's settings, each picture stays still.
  import { gsap } from 'gsap';
  import Icon from '../../lib/Icon.svelte';
  import Logo from '../../lib/Logo.svelte';

  let { step, camera, info }: { step: number; camera: boolean; info: string } = $props();
  let root: HTMLElement | undefined = $state();

  const loop = (delay = 0) => gsap.timeline({ repeat: -1, repeatDelay: 1, delay });
  const SCENES: (() => void)[] = [
    // 1. The popup: pick Webcam, then press Start recording.
    () => {
      loop(0.3)
        .set('.ptr', { x: 250, y: 330, opacity: 0 })
        .set('.pill', { x: 0 })
        .set('.go', { scale: 1 })
        .to('.ptr', { opacity: 1, duration: 0.2 })
        .to('.ptr', { x: 205, y: 104, duration: 0.7, ease: 'power2.inOut' })
        .to('.ptr', { scale: 0.85, duration: 0.08, yoyo: true, repeat: 1 })
        .to('.pill', { x: '100%', duration: 0.3, ease: 'power3.out' }, '<')
        .to('.ptr', { x: 150, y: 222, duration: 0.6, ease: 'power2.inOut' }, '+=0.3')
        .to('.go', { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 })
        .to('.ptr', { opacity: 0, duration: 0.3 }, '+=0.6');
    },
    // 2. Recording: the bar counts, the webcam circle floats on the page.
    () => {
      const clock = { s: 0 };
      loop()
        .set(clock, { s: 0 })
        .to(clock, {
          s: 12,
          duration: 12,
          ease: 'none',
          onUpdate: () => {
            const t = root?.querySelector('.timer');
            if (t) t.textContent = `00:00:${String(Math.floor(clock.s)).padStart(2, '0')}`;
          },
        });
      gsap.to('.circle', { x: -26, y: -14, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    },
    // 3. Start → share → 3·2·1 → record with cursor zoom → trim → export.
    () => {
      const tl = loop(0.2).set('.f', { autoAlpha: 0 }).set('.cap', { opacity: 0.4 });
      const show = (n: number) => tl.set('.f', { autoAlpha: 0 }).set(`.f${n}`, { autoAlpha: 1 }).set('.cap', { opacity: 0.4 }).set(`.c${n}`, { opacity: 1 });
      show(1)
        .fromTo('.f1 .share', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' })
        .to('.f1 .tabpick', { backgroundColor: 'var(--fill-hover)', duration: 0.2 }, '+=0.5')
        .to({}, { duration: 0.6 });
      show(2);
      for (const d of [3, 2, 1]) tl.call(() => void (root!.querySelector('.f2 .digit')!.textContent = String(d))).fromTo('.f2 .digit', { scale: 1.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out' });
      show(3)
        .set('.f3 .page', { scale: 1 })
        .fromTo('.f3 .mouse', { x: 30, y: 120 }, { x: 150, y: 70, duration: 0.8, ease: 'power2.inOut' })
        .to('.f3 .page', { scale: 1.6, duration: 0.7, ease: 'power3.inOut' }, '+=0.2')
        .to('.f3 .page', { scale: 1, duration: 0.6, ease: 'power3.inOut' }, '+=0.9');
      show(4)
        .set('.f4 .keep', { left: '0%', right: '0%' })
        .to('.f4 .keep', { left: '16%', right: '12%', duration: 0.8, ease: 'power2.inOut' })
        .fromTo('.f4 .done', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.2)' }, '+=0.3')
        .to({}, { duration: 1 });
    },
    // 4. Pin Reclux to the toolbar: puzzle piece → pin → the Reclux icon appears.
    () => {
      loop(0.3)
        .set('.ptr', { x: 330, y: 160, opacity: 0 })
        .set('.menu', { autoAlpha: 0, y: -6 })
        .set('.pinned', { scale: 0, opacity: 0 })
        .to('.ptr', { opacity: 1, duration: 0.2 })
        .to('.ptr', { x: 309, y: 20, duration: 0.7, ease: 'power2.inOut' })
        .to('.ptr', { scale: 0.85, duration: 0.08, yoyo: true, repeat: 1 })
        .to('.menu', { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' })
        .to('.ptr', { x: 304, y: 70, duration: 0.6, ease: 'power2.inOut' }, '+=0.2')
        .to('.ptr', { scale: 0.85, duration: 0.08, yoyo: true, repeat: 1 })
        .to('.menu', { autoAlpha: 0, duration: 0.2 }, '+=0.15')
        .to('.pinned', { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.5)' })
        .to('.ptr', { opacity: 0, duration: 0.3 }, '+=0.8');
    },
  ];

  $effect(() => {
    const scene = SCENES[step];
    if (!root) return;
    const motion = gsap.matchMedia(root);
    motion.add('(prefers-reduced-motion: no-preference)', () => scene?.());
    return () => motion.revert();
  });

  const POINTER = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 3l14 9-6 1.5L10 20z" fill="#080808" stroke="#f7f7f5" stroke-width="1.5" stroke-linejoin="round"/></svg>';
</script>

<div class="demo" bind:this={root} aria-hidden="true">
  {#key step}
    {#if step === 0}
      <div class="popup">
        <Logo height={16} />
        <p class="q">What are you recording today?</p>
        <div class="seg"><span class="pill"></span><span>Normal</span><span>Webcam</span></div>
        <div class="tog"><Icon name="mic" size={14} /> Microphone <span class="sw on"></span></div>
        <div class="tog"><Icon name="speaker" size={14} /> System audio <span class="sw on"></span></div>
        <div class="go"><Icon name="record" size={12} /> Start recording</div>
        <span class="ptr">{@html POINTER}</span>
      </div>
    {:else if step === 1}
      <div class="screen">
        <div class="lines"><i></i><i></i><i class="short"></i><i></i><i class="short"></i></div>
        {#if camera}<span class="circle"><Icon name="camera" size={22} /></span>{/if}
        <div class="bar">
          <span class="rec"><span class="dot"></span> Recording</span>
          <span class="b stop"><Icon name="stop" size={12} /></span>
          <span class="timer">00:00:00</span>
          <span class="meta">{info}</span>
        </div>
      </div>
    {:else if step === 2}
      <div class="screen flow">
        <div class="f f1">
          <div class="share">
            <b>Choose what to share</b>
            <span class="opt tabpick"><Icon name="tab" size={14} /> A tab</span>
            <span class="opt"><Icon name="window" size={14} /> A window</span>
            <span class="opt"><Icon name="screen" size={14} /> Entire screen</span>
          </div>
        </div>
        <div class="f f2"><span class="digit">3</span></div>
        <div class="f f3">
          <div class="page"><div class="lines"><i></i><i></i><i class="short"></i><i></i></div><span class="mouse">{@html POINTER}</span></div>
        </div>
        <div class="f f4">
          <div class="track"><span class="keep"><b class="in"></b><b class="out"></b></span></div>
          <span class="done"><Icon name="check" size={16} /> Exported</span>
        </div>
      </div>
      <ol class="caps"><li class="cap c1">Share</li><li class="cap c2">3·2·1</li><li class="cap c3">Record</li><li class="cap c4">Edit &amp; export</li></ol>
    {:else}
      <div class="toolbar">
        <span class="url"></span>
        <span class="pinned"><img src="/icon/32.png" alt="" width="18" height="18" /></span>
        <span class="tb"><Icon name="puzzle" size={16} /></span>
        <div class="menu">
          <span class="item"><img src="/icon/32.png" alt="" width="16" height="16" /> Reclux <span class="pin"><Icon name="pin" size={14} /></span></span>
        </div>
        <span class="ptr">{@html POINTER}</span>
      </div>
    {/if}
  {/key}
</div>

<style>
  .demo {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    min-height: 420px;
    color: var(--c-text);
  }
  .ptr {
    opacity: 0; /* shown by the animation */
  }
  .ptr,
  .mouse {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
    filter: drop-shadow(0 2px 4px rgb(8 8 8 / 30%));
  }
  /* 1. Popup */
  .popup {
    position: relative;
    display: grid;
    gap: 12px;
    width: 300px;
    padding: 18px;
    border-radius: var(--r-xl);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    box-shadow: var(--glass-shadow);
    font-size: 12px;
    font-weight: 600;
  }
  .q {
    font-size: 15px;
    font-weight: 700;
  }
  .seg {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 3px;
    border-radius: var(--r-pill);
    background: var(--fill);
    text-align: center;
  }
  .seg span:not(.pill) {
    position: relative;
    padding: 7px 0;
  }
  .pill {
    position: absolute;
    inset: 3px auto 3px 3px;
    width: calc(50% - 3px);
    border-radius: var(--r-pill);
    background: var(--fill-strong);
    box-shadow: var(--shadow);
  }
  .tog {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 6px 6px 12px;
    border-radius: var(--r-pill);
    background: var(--fill);
  }
  .sw {
    margin-left: auto;
    width: 30px;
    height: 18px;
    border-radius: var(--r-pill);
    background: var(--c-lux);
    position: relative;
  }
  .sw::after {
    content: '';
    position: absolute;
    top: 2px;
    right: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c-on-lux);
  }
  .go {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 44px;
    border-radius: var(--r-pill);
    background: var(--c-accent);
    color: var(--c-on-accent);
    box-shadow: 0 4px 14px rgb(242 11 24 / 26%);
  }
  /* 2–3. A page on screen */
  .screen {
    position: relative;
    width: min(100%, 420px);
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border-radius: var(--r-xl);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    box-shadow: var(--glass-shadow);
  }
  .lines {
    display: grid;
    gap: 10px;
    padding: 28px;
  }
  .lines i {
    height: 10px;
    border-radius: 5px;
    background: var(--fill-hover);
  }
  .lines i:first-child {
    width: 55%;
    height: 16px;
    background: var(--c-text);
    opacity: 0.8;
  }
  .lines .short {
    width: 70%;
  }
  .circle {
    position: absolute;
    right: 22px;
    bottom: 70px;
    display: grid;
    place-items: center;
    width: 76px;
    height: 76px;
    border-radius: 50%;
    border: 3px solid var(--off-white);
    background: radial-gradient(circle at 50% 38%, #c9b5a6 0 22%, transparent 23%), radial-gradient(circle at 50% 100%, #6b7d92 0 45%, transparent 46%), #2a3442;
    color: transparent;
    box-shadow: var(--shadow);
  }
  .bar {
    position: absolute;
    left: 50%;
    bottom: 14px;
    translate: -50% 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px 6px 8px;
    border-radius: var(--r-pill);
    background: var(--glass-bg-solid);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }
  .rec {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: var(--r-pill);
    color: var(--c-success);
    background: var(--c-success-bg);
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c-success-icon);
    animation: pulse 1.4s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }
  .b {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
  }
  .stop {
    background: var(--c-accent);
    color: var(--c-on-accent);
  }
  .timer {
    font: 700 14px var(--font-mono);
    font-variant-numeric: tabular-nums;
  }
  .meta {
    color: var(--c-text-muted);
    font-weight: 600;
  }
  /* 3. The flow */
  .f {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .f + .f {
    visibility: hidden; /* until the animation shows them (still picture: the first one) */
  }
  .share {
    display: grid;
    gap: 6px;
    width: 220px;
    padding: 14px;
    border-radius: var(--r-md);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    box-shadow: var(--glass-shadow);
    font-size: 12px;
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--r-sm);
  }
  .f2 {
    background: color-mix(in srgb, var(--c-text) 8%, transparent);
  }
  .digit {
    display: grid;
    place-items: center;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    font: 700 64px / 1 var(--font);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(8px);
  }
  .f3 {
    place-items: stretch;
  }
  .page {
    position: relative;
    transform-origin: 40% 35%;
  }
  .track {
    position: relative;
    width: 78%;
    height: 44px;
    border-radius: var(--r-md);
    background: var(--fill);
  }
  .keep {
    position: absolute;
    inset: 0;
    border-radius: var(--r-md);
    background: var(--c-text);
    opacity: 0.85;
  }
  .keep b {
    position: absolute;
    top: 50%;
    width: 0;
    height: 0;
    border: 7px solid transparent;
    translate: 0 -50%;
  }
  .in {
    left: 2px;
    border-left-color: var(--red) !important;
  }
  .out {
    right: 2px;
    border-right-color: var(--red) !important;
  }
  .done {
    position: absolute;
    bottom: 22%;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: var(--r-pill);
    font-size: 12px;
    font-weight: 700;
    color: var(--c-success);
    background: var(--c-success-bg);
    border: 1px solid var(--c-success-border);
  }
  .caps {
    display: flex;
    gap: 6px;
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
    font-size: 12px;
    font-weight: 700;
  }
  .cap {
    padding: 3px 10px;
    border-radius: var(--r-pill);
    background: var(--fill);
  }
  /* 4. Toolbar */
  .toolbar {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: min(100%, 340px);
    padding: 10px 12px;
    border-radius: var(--r-md);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    box-shadow: var(--glass-shadow);
  }
  .url {
    flex: 1;
    height: 26px;
    border-radius: var(--r-pill);
    background: var(--fill);
  }
  .tb,
  .pinned {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
  }
  .tb {
    background: var(--fill);
  }
  .menu {
    position: absolute;
    top: 52px;
    right: 8px;
    padding: 6px;
    border-radius: var(--r-md);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    box-shadow: var(--glass-shadow);
    font-size: 12px;
    font-weight: 600;
    visibility: hidden;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
  }
  .pin {
    display: grid;
    margin-left: 16px;
    color: var(--c-text-muted);
  }
</style>
