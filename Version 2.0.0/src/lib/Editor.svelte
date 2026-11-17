<script lang="ts">
  // Screen 3: the editor. Video in the middle, tools and timeline below. Screen 4: "Save video?" before export.
  // ponytail: Split / Trim / Delete / Undo are shown but switched on in Phase 6 (they need the cut list).
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import Modal from './Modal.svelte';
  import Timeline from './Timeline.svelte';
  import { fmtTime } from './presets';
  import { session } from './session.svelte';
  import { zoomAt } from './zoom';

  let { onsaved }: { onsaved: () => void } = $props();

  let video: HTMLVideoElement | undefined = $state();
  let current = $state(0);
  let paused = $state(true);
  let mediaDuration = $state(0);
  let zoom = $state(1);
  let asking = $state(false);
  let vw = $state(16);
  let vh = $state(9);
  const edited = false; // Phase 6: true once a cut exists

  // Cursor zoom preview. currentTime only updates ~4 times a second, so read it every frame while playing.
  let t = $state(0);
  $effect(() => {
    if (paused) return void (t = current);
    let id = requestAnimationFrame(function frame() {
      t = video?.currentTime ?? 0;
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  });
  const view = $derived(zoomAt(session.zooms, t));

  const duration = $derived(Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : session.elapsed);
  const fileLabel = $derived(`${session.name}.${session.ext}`);

  const toggle = () => (video?.paused ? video.play() : video?.pause());
  const seek = (t: number) => {
    if (video) video.currentTime = t;
    current = t;
  };

  // Space plays and pauses, arrows step (unless typing or on a button that uses the key itself).
  const onkey = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (asking || el.closest('input, textarea, select, [role="slider"]')) return;
    if (e.key === ' ' && !el.closest('button')) {
      e.preventDefault();
      void toggle();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      seek(Math.min(duration, Math.max(0, current + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 5 : 1))));
    }
  };

  const confirmSave = () => {
    asking = false;
    onsaved();
  };
</script>

<svelte:window onkeydown={onkey} />

<section class="editor" aria-label="Edit recording">
  <header class="top glass">
    <h2 class="title"><Icon name="edit" size={18} /> Edit <span aria-hidden="true">·</span> <span class="name">{fileLabel}</span></h2>
    <div class="group">
      <Button icon="undo" label="Undo" disabled />
      <Button icon="redo" label="Redo" disabled />
    </div>
    <Button variant="primary" icon="check" onclick={() => (asking = true)}>Save changes</Button>
  </header>

  <div class="stage">
    <div class="frame" style:--ar={vw / vh || 16 / 9}>
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        bind:this={video}
        src={session.url}
        bind:currentTime={current}
        bind:paused
        bind:duration={mediaDuration}
        bind:videoWidth={vw}
        bind:videoHeight={vh}
        onclick={toggle}
        preload="metadata"
        style:transform="scale({view.scale}) translate({(0.5 - view.x) * 100}%, {(0.5 - view.y) * 100}%)"
      ></video>
    </div>
  </div>

  <div class="tools glass" role="toolbar" aria-label="Editing tools">
    <div class="group">
      <Button icon="split" disabled label="Split at the playhead (Ctrl+B)">Split <kbd>Ctrl+B</kbd></Button>
      <Button icon="trim" disabled label="Trim: keep only between the in and out points">Trim <span class="sub">In–Out</span></Button>
      <Button icon="trash" disabled label="Delete the selected part">Delete</Button>
    </div>
    <div class="transport">
      <Button icon={paused ? 'play' : 'pause'} label={paused ? 'Play (Space)' : 'Pause (Space)'} onclick={toggle} />
      <span class="time"><b>{fmtTime(Math.floor(current))}</b> / {fmtTime(Math.round(duration))}</span>
    </div>
    <div class="group zoom">
      <Button icon="minus" label="Zoom out the timeline" disabled={zoom <= 1} onclick={() => (zoom = Math.max(1, zoom / 2))} />
      <span class="zoomlabel">Zoom</span>
      <Button icon="plus" label="Zoom in the timeline" disabled={zoom >= 32} onclick={() => (zoom = Math.min(32, zoom * 2))} />
    </div>
  </div>

  <Timeline {duration} {current} {zoom} label={fileLabel} zooms={session.zooms} onseek={seek} />
</section>

<Modal bind:open={asking} title={edited ? 'Replace the original video?' : 'Save this video?'}>
  {#if edited}
    <p>• Saving replaces your original recording with this edited version. The cut parts are gone after saving.</p>
    <p>• This can’t be undone.</p>
  {:else}
    <p>• No edits were made, so the video is kept exactly as recorded.</p>
    <p>• Next, choose a file name and where to export it.</p>
  {/if}
  {#snippet actions()}
    <Button onclick={() => (asking = false)}>Cancel</Button>
    <Button variant="primary" onclick={confirmSave}>Save video</Button>
  {/snippet}
</Modal>

<style>
  .editor {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    gap: var(--s-3);
    height: 100%;
    min-height: 0;
  }
  .top,
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-3);
    padding: var(--s-2) var(--s-2) var(--s-2) var(--s-4);
    border-radius: var(--r-pill);
  }
  .tools {
    padding: var(--s-2);
    justify-content: space-between;
  }
  .title {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    flex: 1;
    min-width: 0;
    font-size: var(--t-md);
    font-weight: 600;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--c-text-muted);
    font-weight: 500;
  }
  .group {
    display: flex;
    align-items: center;
    gap: var(--s-1);
  }
  /* The frame keeps the video's shape and fits the space left for it; zoom happens inside it. */
  .stage {
    display: grid;
    place-items: center;
    min-height: 160px;
    container-type: size;
  }
  .frame {
    width: min(100cqw, 100cqh * var(--ar));
    aspect-ratio: var(--ar);
    overflow: hidden;
    border-radius: var(--r-lg);
    background: #000;
    box-shadow: var(--shadow);
  }
  video {
    display: block;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
  .transport {
    display: flex;
    align-items: center;
    gap: var(--s-2);
  }
  .time {
    font: 500 var(--t-sm) / 1 var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--c-text-muted);
  }
  .time b {
    color: var(--c-text);
  }
  kbd,
  .sub {
    font: 500 var(--t-xs) var(--font);
    color: var(--c-text-muted);
  }
  .zoomlabel {
    font-size: var(--t-xs);
    font-weight: 600;
    color: var(--c-text-muted);
  }
  /* Narrow windows and tablets: tools wrap into two rows, labels stay. */
  @media (max-width: 760px) {
    .tools {
      border-radius: var(--r-xl);
      justify-content: center;
    }
    .top {
      border-radius: var(--r-xl);
    }
  }
</style>
