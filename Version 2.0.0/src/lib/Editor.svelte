<script lang="ts">
  // Screen 3: the editor. Video in the middle, tools and timeline below. Screen 4: "Save video?" before export.
  // Split / Trim / Delete act on the part under the playhead (outlined on the timeline). Zooms are edited in the
  // strip above the timeline. Saving with edits builds a new video and replaces the original (session.applyEdit).
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import Modal from './Modal.svelte';
  import Timeline from './Timeline.svelte';
  import { fmtTime } from './presets';
  import { applyEdit, session } from './session.svelte';
  import { ZOOM_SCALE, fit, zoomAt, type Zoom } from './zoom';
  import { clipAt, remove, split, toOutput, toSource, total, trimIn, trimOut, zoomPieces, type Clip } from './edit';

  let { onsaved }: { onsaved: () => void } = $props();

  let video: HTMLVideoElement | undefined = $state();
  let frame: HTMLDivElement | undefined = $state();
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
    session.zooms.flatMap((z, i) => {
      const ps = zoomPieces(clips, z);
      return ps.map((p, k) => ({ ...p, i, k, scale: z.scale, first: k === 0, last: k === ps.length - 1 }));
    }),
  );
  const edited = $derived(cuts !== null || session.zooms.length > 0);
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
    if (picked >= session.zooms.length) picked = -1;
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
  const can = $derived({
    split: split(clips, current) !== clips,
    in: trimIn(clips, current) !== clips,
    out: trimOut(clips, current) !== clips,
    del: clips.length > 1,
  });

  // Zooms: pick one to change its size, spot, start and end, or remove it. Add one at the playhead.
  const SHORTEST = 0.5;
  let picked = $state(-1);
  const pz = $derived(session.zooms[picked]);
  const setZoom = (patch: Partial<Zoom>) => {
    session.zooms = session.zooms.map((z, i) => (i === picked ? fit({ ...z, ...patch }) : z));
  };
  const changeZoom = (patch: Partial<Zoom>) => {
    remember();
    setZoom(patch);
  };
  const pick = (i: number) => {
    picked = i;
    const p = pieces.find((p) => p.i === i); // its first visible piece (part of it may be cut out)
    if (p) seek(p.at + p.len / 2); // show it zoomed in
  };
  const addZoom = () => {
    const here = session.zooms.findIndex((z) => src >= z.start && src <= z.end);
    if (here >= 0) return pick(here);
    const z = { start: src, end: Math.min(srcDuration, src + 3), x: 0.5, y: 0.5, scale: ZOOM_SCALE };
    if (z.end - z.start < SHORTEST) return;
    remember();
    session.zooms = [...session.zooms, z].sort((a, b) => a.start - b.start);
    pick(session.zooms.findIndex((v) => v.start === z.start));
  };
  const removeZoom = () => {
    remember();
    session.zooms = session.zooms.filter((_, i) => i !== picked);
    picked = -1;
  };
  const edge = (i: number, side: 'start' | 'end', t: number) => {
    const z = session.zooms[i]!;
    const s = toSource(clips, t);
    picked = i;
    setZoom(side === 'start' ? { start: Math.min(s, z.end - SHORTEST) } : { end: Math.max(s, z.start + SHORTEST) });
  };
  // With a zoom picked, clicking the video chooses the spot it zooms into.
  const clickVideo = (e: MouseEvent) => {
    if (picked < 0 || !frame) return toggle();
    const r = frame.getBoundingClientRect();
    changeZoom({
      x: view.x + ((e.clientX - r.left) / r.width - 0.5) / view.scale,
      y: view.y + ((e.clientY - r.top) / r.height - 0.5) / view.scale,
    });
  };

  // Screen 4, then (with edits) building the new video.
  let asking = $state(false);
  let building = $state<number | null>(null); // share done
  let failed = $state('');
  let cancel = false;
  const confirmSave = async () => {
    if (!edited) {
      asking = false;
      return onsaved();
    }
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
  const closeModal = () => {
    if (building !== null) cancel = true; // Esc while building = Cancel
    asking = false;
    failed = '';
  };

  // Keys: Space play/pause, arrows step, Ctrl+B split, I / O trim, Delete, Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y), Esc.
  const onkey = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (asking || el.closest('input, textarea, select')) return;
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
    else if (k === 'delete' || k === 'backspace') run(() => (picked >= 0 ? removeZoom() : cut(remove(clips, active))));
    else if (k === 'escape' && picked >= 0) run(() => (picked = -1));
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
    <Button variant="primary" icon="check" onclick={() => (asking = true)}>Save changes</Button>
  </header>

  <div class="stage">
    <div class="frame" class:aiming={picked >= 0} bind:this={frame} style:--ar={vw / vh || 16 / 9}>
      <!-- svelte-ignore a11y_media_has_caption, a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
      <video
        bind:this={video}
        src={session.url}
        bind:paused
        bind:duration={mediaDuration}
        bind:videoWidth={vw}
        bind:videoHeight={vh}
        onclick={clickVideo}
        preload="metadata"
        style:transform="scale({view.scale}) translate({(0.5 - view.x) * 100}%, {(0.5 - view.y) * 100}%)"
      ></video>
    </div>
  </div>

  <div class="tools glass" role="toolbar" aria-label="Editing tools">
    <div class="group">
      <Button icon="split" label="Split at the playhead (Ctrl+B)" disabled={!can.split} onclick={() => cut(split(clips, current))}>
        Split <kbd>Ctrl+B</kbd>
      </Button>
      <span class="trim"><Icon name="trim" /> Trim</span>
      <Button label="Trim In: cut this part’s start, up to the playhead (I)" disabled={!can.in} onclick={() => cut(trimIn(clips, current))}>
        In <kbd>I</kbd>
      </Button>
      <Button label="Trim Out: cut this part’s end, from the playhead (O)" disabled={!can.out} onclick={() => cut(trimOut(clips, current))}>
        Out <kbd>O</kbd>
      </Button>
      <Button icon="trash" label="Delete the outlined part (Delete)" disabled={!can.del} onclick={() => cut(remove(clips, active))}>Delete</Button>
    </div>
    <div class="transport">
      <Button icon={paused ? 'play' : 'pause'} label={paused ? 'Play (Space)' : 'Pause (Space)'} onclick={toggle} />
      <span class="time"><b>{fmtTime(Math.floor(current))}</b> / {fmtTime(Math.round(duration))}</span>
    </div>
    <div class="group">
      <Button icon="minus" label="Zoom out the timeline" disabled={zoom <= 1} onclick={() => (zoom = Math.max(1, zoom / 2))} />
      <span class="zoomlabel">Zoom</span>
      <Button icon="plus" label="Zoom in the timeline" disabled={zoom >= 32} onclick={() => (zoom = Math.min(32, zoom * 2))} />
    </div>
  </div>

  <div class="zooms" role="group" aria-label="Cursor zoom">
    {#if pz}
      <span class="what"><Icon name="zoom" size={18} /> Zoom {pz.scale}×</span>
      <Button icon="minus" label="Zoom in less" disabled={pz.scale <= 1.2} onclick={() => changeZoom({ scale: Math.round((pz.scale - 0.2) * 10) / 10 })} />
      <Button icon="plus" label="Zoom in more" disabled={pz.scale >= 3} onclick={() => changeZoom({ scale: Math.round((pz.scale + 0.2) * 10) / 10 })} />
      <span class="hint">Click the video to pick the spot. Drag the ends on the timeline, or:</span>
      <Button variant="ghost" disabled={src >= pz.end - SHORTEST} onclick={() => changeZoom({ start: src })}>Start here</Button>
      <Button variant="ghost" disabled={src <= pz.start + SHORTEST} onclick={() => changeZoom({ end: src })}>End here</Button>
      <Button variant="ghost" icon="trash" onclick={removeZoom}>Remove</Button>
      <Button icon="check" onclick={() => (picked = -1)}>Done</Button>
    {:else}
      <span class="what">
        <Icon name="zoom" size={18} />
        {session.zooms.length ? `${session.zooms.length} zoom${session.zooms.length > 1 ? 's' : ''}` : 'No zooms'}
      </span>
      <span class="hint">{session.zooms.length ? 'Click one on the timeline to change it.' : 'Add one to zoom into a part of the screen.'}</span>
      <Button icon="plus" onclick={addZoom}>Add zoom</Button>
    {/if}
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
    onseek={seek}
    onpick={pick}
    ongrab={remember}
    onedge={edge}
  />
</section>

<Modal bind:open={() => asking, (v) => !v && closeModal()} title={edited ? 'Replace the original video?' : 'Save this video?'}>
  {#if building !== null}
    <p role="status">Building your video… {Math.round(building * 100)}%</p>
    <progress max="1" value={building}></progress>
    <p class="note">Keep this tab open. Long videos take a while.</p>
  {:else if failed}
    <p>• Could not build the video: {failed}</p>
    <p>• Your original recording is unchanged.</p>
  {:else if edited}
    <p>• Reclux builds a new video with your cuts and zooms, then it replaces your original recording.</p>
    <p>• This can’t be undone.</p>
  {:else}
    <p>• No edits were made, so the video is kept exactly as recorded.</p>
    <p>• Next, choose a file name and where to export it.</p>
  {/if}
  {#snippet actions()}
    <Button onclick={closeModal}>Cancel</Button>
    {#if building === null}
      <Button variant="primary" onclick={confirmSave}>{failed ? 'Try again' : 'Save video'}</Button>
    {/if}
  {/snippet}
</Modal>

<style>
  .editor {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto auto auto;
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
    flex-wrap: wrap;
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
  /* A zoom is picked: clicking the video picks its spot. */
  .aiming {
    outline: 3px solid var(--c-focus);
    outline-offset: 2px;
  }
  .aiming video {
    cursor: crosshair;
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
  kbd {
    font: 500 var(--t-xs) var(--font);
    color: var(--c-text-muted);
  }
  .trim,
  .what {
    display: inline-flex;
    align-items: center;
    gap: var(--s-1);
    padding: 0 var(--s-1) 0 var(--s-2);
    font-size: var(--t-sm);
    font-weight: 600;
  }
  .zoomlabel {
    font-size: var(--t-xs);
    font-weight: 600;
    color: var(--c-text-muted);
  }
  /* Cursor zoom strip: solid, sits on the page (not a floating control). */
  .zooms {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2);
    min-height: calc(var(--tap) + 2 * var(--s-1));
    padding: var(--s-1) var(--s-2);
    border-radius: var(--r-lg);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
  }
  .hint {
    flex: 1;
    min-width: 12rem;
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
  progress {
    width: 100%;
    height: 8px;
    accent-color: var(--c-lux);
  }
  .note {
    font-size: var(--t-sm);
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
