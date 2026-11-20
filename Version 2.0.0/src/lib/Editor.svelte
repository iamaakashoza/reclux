<script lang="ts">
  // Screen 3: the editor. Full width, no boxed cards (owner's call, 19 Nov 2026): a bar on top, the video, the tools,
  // the timeline. Split / Trim / Delete act on the selected part (under the playhead, outlined red on the timeline).
  // Trim shows arrows on that part's ends to drag. − Zoom + stretches the timeline for exact cuts.
  // Cursor zoom is made automatically while recording; a zoom block can be selected and deleted, nothing more.
  // Save changes: no edits = straight to export; only automatic zooms = built in without asking (owner's call);
  // cuts = "Replace the original video?" first, because the original is replaced.
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import Modal from './Modal.svelte';
  import Timeline from './Timeline.svelte';
  import { fmtTime } from './presets';
  import { applyEdit, session } from './session.svelte';
  import { zoomAt } from './zoom';
  import { clipAt, remove, split, toOutput, toSource, total, trimIn, trimOut, zoomPieces, type Clip } from './edit';

  let { onsaved }: { onsaved: () => void } = $props();

  let video: HTMLVideoElement | undefined = $state();
  let src = $state(0); // playhead, in seconds of the original recording
  let paused = $state(true);
  let mediaDuration = $state(0);
  let zoom = $state(1);
  let vw = $state(16);
  let vh = $state(9);

  // The cut list. null = nothing cut yet: the whole recording.
  const srcDuration = $derived(Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : session.elapsed);
  let cuts = $state<Clip[] | null>(null);
  const clips = $derived(cuts ?? [{ start: 0, end: srcDuration }]);
  const duration = $derived(total(clips));
  const current = $derived(toOutput(clips, src)); // playhead on the edited timeline
  const active = $derived(clipAt(clips, current));
  const parts = $derived(clips.map((c, i) => ({ at: total(clips.slice(0, i)), len: c.end - c.start })));
  const pieces = $derived(
    session.zooms.flatMap((z, i) => zoomPieces(clips, z).map((p, k) => ({ ...p, i, k, scale: z.scale }))),
  );
  const fileLabel = $derived(`${session.name}.${session.ext}`);

  // Cursor zoom preview, in step with playback. currentTime only updates ~4 times a second, so read it every
  // frame while playing; that loop also jumps over cut-out parts and stops at the end of the last part.
  // ponytail: the preview jumps a cut on the next screen refresh (~16 ms late); the export itself is frame-exact.
  $effect(() => {
    if (paused) return;
    let id = requestAnimationFrame(function tick() {
      if (video) {
        const s = video.currentTime;
        const next = clips.find((c) => s < c.end - 0.01);
        if (!next) {
          video.pause();
          src = clips.at(-1)!.end;
        } else if (s < next.start) video.currentTime = src = next.start;
        else src = s;
      }
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  });
  const view = $derived(zoomAt(session.zooms, src));

  const seek = (t: number) => {
    const s = toSource(clips, Math.min(duration, Math.max(0, t)));
    if (video) video.currentTime = s;
    src = s;
  };
  const toggle = () => {
    if (!video) return;
    if (!video.paused) return video.pause();
    if (current >= duration - 0.05) seek(0);
    void video.play();
  };

  // Undo / Redo: snapshots of the cut list and the zooms.
  let past = $state<string[]>([]);
  let future = $state<string[]>([]);
  const snap = () => JSON.stringify({ cuts, zooms: session.zooms });
  const restore = (s: string) => {
    ({ cuts, zooms: session.zooms } = JSON.parse(s));
    picked = -1;
    seek(current);
  };
  const remember = () => {
    past = [...past, snap()];
    future = [];
  };
  const undo = () => {
    if (!past.length) return;
    future = [...future, snap()];
    restore(past.at(-1)!);
    past = past.slice(0, -1);
  };
  const redo = () => {
    if (!future.length) return;
    past = [...past, snap()];
    restore(future.at(-1)!);
    future = future.slice(0, -1);
  };

  // Cuts. Each returns the same list when it would do nothing, which also greys out its button.
  const cut = (next: Clip[]) => {
    if (next === clips) return;
    remember();
    cuts = next;
    seek(current); // the playhead may sit in a part that is gone now
  };
  let trimming = $state(false);
  const trim = (side: 'in' | 'out', t: number) => {
    const before = clips;
    const i = clipAt(clips, t); // the trimmed part keeps its place in the list (t itself may now be in the next one)
    cut(side === 'in' ? trimIn(clips, t) : trimOut(clips, t));
    if (clips === before) return;
    // Show where the part now starts or ends.
    const p = parts[i];
    if (p) seek(side === 'in' ? p.at : Math.max(p.at, p.at + p.len - 0.05));
  };

  // A zoom block can be selected (click it) and deleted.
  let picked = $state(-1);
  const pick = (i: number) => {
    picked = picked === i ? -1 : i;
    const p = pieces.find((p) => p.i === i); // its first visible piece (part of it may be cut out)
    if (picked >= 0 && p) seek(p.at + p.len / 2); // show it zoomed in
  };
  const del = () => {
    if (picked >= 0) {
      remember();
      session.zooms = session.zooms.filter((_, i) => i !== picked);
      picked = -1;
    } else cut(remove(clips, active));
  };
  const can = $derived({ split: split(clips, current) !== clips, del: picked >= 0 || clips.length > 1 });

  // Save changes (Screen 4 only when the original is replaced by cuts).
  const cutsMade = $derived(cuts !== null);
  let asking = $state(false);
  let building = $state<number | null>(null); // share done
  let failed = $state('');
  let cancel = false;
  const build = async () => {
    video?.pause();
    cancel = false;
    failed = '';
    building = 0;
    try {
      await applyEdit($state.snapshot(clips), (s) => (building = s), () => cancel);
      asking = false;
      onsaved();
    } catch (e) {
      if (!cancel) failed = (e as Error).message;
    } finally {
      building = null;
    }
  };
  const save = () => {
    trimming = false;
    if (cutsMade) asking = true; // the original is replaced: ask first
    else if (session.zooms.length) void build(); // only the automatic cursor zoom: build it in, no question
    else onsaved(); // nothing changed: straight to export
  };
  const closeModal = () => {
    if (building !== null) cancel = true; // Esc while building = Cancel
    asking = false;
    failed = '';
  };
  const modalOpen = $derived(asking || building !== null || failed !== '');
  const modalTitle = $derived(
    failed ? 'Could not build the video' : building !== null ? (cutsMade ? 'Building your video' : 'Adding cursor zoom') : 'Replace the original video?',
  );

  // Keys: Space play/pause, arrows step, Ctrl+B split, I / O trim at the playhead, Delete, Ctrl+Z / Ctrl+Shift+Z
  // (or Ctrl+Y), Esc ends trimming or deselects a zoom.
  const onkey = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (modalOpen || el.closest('input, textarea, select')) return;
    const k = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    const run = (fn: () => void) => {
      e.preventDefault();
      fn();
    };
    if (mod && k === 'b') run(() => cut(split(clips, current)));
    else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) run(redo);
    else if (mod && k === 'z') run(undo);
    else if (mod || e.altKey) return;
    else if (k === 'i') run(() => cut(trimIn(clips, current)));
    else if (k === 'o') run(() => cut(trimOut(clips, current)));
    else if (k === 'delete' || k === 'backspace') run(del);
    else if (k === 'escape' && (trimming || picked >= 0)) run(() => ((trimming = false), (picked = -1)));
    else if (el.closest('button, [role="slider"]')) return; // they use Space and the arrows themselves
    else if (k === ' ') run(toggle);
    else if (k === 'arrowleft' || k === 'arrowright') run(() => seek(current + (k === 'arrowleft' ? -1 : 1) * (e.shiftKey ? 5 : 1)));
  };
</script>

<svelte:window onkeydown={onkey} />

<section class="editor" aria-label="Edit recording">
  <header class="top glass">
    <h2 class="title"><Icon name="edit" size={18} /> Edit <span aria-hidden="true">·</span> <span class="name">{fileLabel}</span></h2>
    <div class="group">
      <Button icon="undo" label="Undo (Ctrl+Z)" disabled={!past.length} onclick={undo} />
      <Button icon="redo" label="Redo (Ctrl+Shift+Z)" disabled={!future.length} onclick={redo} />
    </div>
    <Button variant="primary" icon="check" onclick={save}>Save changes</Button>
  </header>

  <div class="stage">
    <div class="frame" style:--ar={vw / vh || 16 / 9}>
      <!-- svelte-ignore a11y_media_has_caption, a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
      <video
        bind:this={video}
        src={session.url}
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
      <Button icon="split" label="Split the selected part at the playhead (Ctrl+B)" disabled={!can.split} onclick={() => cut(split(clips, current))}>Split</Button>
      <Button icon="trim" label="Trim: drag the arrows at the ends of the selected part (I / O trim at the playhead)" pressed={trimming} onclick={() => ((trimming = !trimming), (picked = -1))}>Trim</Button>
      <Button variant="secondary" icon="trash" label={picked >= 0 ? 'Delete the selected zoom (Delete)' : 'Delete the selected part (Delete)'} disabled={!can.del} onclick={del}>
        {picked >= 0 ? 'Delete zoom' : 'Delete'}
      </Button>
    </div>
    <div class="transport">
      <Button icon={paused ? 'play' : 'pause'} label={paused ? 'Play (Space)' : 'Pause (Space)'} onclick={toggle} />
      <span class="time"><b>{fmtTime(Math.floor(current))}</b> / {fmtTime(Math.round(duration))}</span>
    </div>
    <div class="zoomctl" role="group" aria-label="Timeline zoom">
      <Button icon="minus" label="Zoom out the timeline" disabled={zoom <= 1} onclick={() => (zoom = Math.max(1, zoom / 2))} />
      <span>Zoom</span>
      <Button icon="plus" label="Zoom in the timeline, for exact cuts" disabled={zoom >= 32} onclick={() => (zoom = Math.min(32, zoom * 2))} />
    </div>
  </div>

  <Timeline
    {duration}
    {current}
    {zoom}
    label={fileLabel}
    {parts}
    {active}
    zooms={pieces}
    {picked}
    {trimming}
    onseek={seek}
    onpick={pick}
    ontrim={trim}
  />
</section>

<Modal bind:open={() => modalOpen, (v) => !v && closeModal()} title={modalTitle}>
  {#if building !== null}
    <p role="status">{cutsMade ? 'Building your video' : 'Adding the cursor zoom'}… {Math.round(building * 100)}%</p>
    <progress max="1" value={building}></progress>
    <p class="note">Keep this tab open. Long videos take a while. Next: export.</p>
  {:else if failed}
    <p>• {failed}</p>
    <p>• Your original recording is unchanged.</p>
  {:else}
    <p>• Reclux builds a new video with your cuts{session.zooms.length ? ' and the cursor zoom' : ''}, then it replaces your original recording.</p>
    <p>• This can’t be undone.</p>
  {/if}
  {#snippet actions()}
    <Button variant="secondary" onclick={closeModal}>Cancel</Button>
    {#if building === null}
      <Button variant="primary" onclick={() => void build()}>{failed ? 'Try again' : 'Save video'}</Button>
    {/if}
  {/snippet}
</Modal>

<style>
  .editor {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    height: 100%;
    min-height: 0;
  }
  /* Bars reach the window's edges: no rounded cards, no gaps at the sides (owner's call). */
  .top,
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-3);
    padding: var(--s-2) var(--s-5);
    border-radius: 0;
    border-width: 0;
    box-shadow: var(--glass-highlight);
  }
  .top {
    border-bottom: 1px solid var(--c-border);
  }
  .tools {
    justify-content: space-between;
    border-top: 1px solid var(--c-border);
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
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2);
  }
  /* The frame keeps the video's shape and fits the space left for it; zoom happens inside it. */
  .stage {
    display: grid;
    place-items: center;
    min-height: 160px;
    padding: var(--s-4) var(--s-5);
    container-type: size;
  }
  .frame {
    width: min(100cqw, 100cqh * var(--ar));
    aspect-ratio: var(--ar);
    overflow: hidden;
    border-radius: var(--r-md);
    background: var(--black);
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
  /* − Zoom +: one capsule, the word between its two buttons. */
  .zoomctl {
    display: flex;
    align-items: center;
    gap: var(--s-1);
    padding: 0;
    border-radius: var(--r-pill);
    background: var(--fill);
  }
  .zoomctl span {
    padding: 0 var(--s-1);
    font-size: var(--t-sm);
    font-weight: 600;
  }
  .zoomctl :global(button) {
    background: transparent;
  }
  progress {
    width: 100%;
    height: 8px;
    accent-color: var(--c-accent);
  }
  .note {
    font-size: var(--t-sm);
    color: var(--c-text-muted);
  }
  /* Narrow windows and tablets: tools wrap and centre, labels stay. */
  @media (max-width: 760px) {
    .tools {
      justify-content: center;
    }
    .top,
    .tools,
    .stage {
      padding-left: var(--s-4);
      padding-right: var(--s-4);
    }
  }
</style>
