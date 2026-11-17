// The cut list: which parts of the recording are kept, in order. Times are seconds of the original
// recording ("source"); the edited video plays the kept parts back to back ("output" time).
// Every edit returns a new list, so Undo can keep the old one.
import type { Zoom } from './zoom';

export interface Clip {
  start: number;
  end: number;
}

const MIN = 0.1; // shortest part an edit may leave

export const total = (clips: Clip[]) => clips.reduce((a, c) => a + c.end - c.start, 0);

/** Output time → source time. */
export function toSource(clips: Clip[], t: number) {
  for (const c of clips) {
    if (t < c.end - c.start) return c.start + Math.max(0, t);
    t -= c.end - c.start;
  }
  return clips.at(-1)?.end ?? 0;
}

/** Source time → output time. A time inside a cut-out part maps to where the next kept part starts. */
export function toOutput(clips: Clip[], s: number) {
  let at = 0;
  for (const c of clips) {
    if (s < c.end) return at + Math.max(0, s - c.start);
    at += c.end - c.start;
  }
  return at;
}

/** The part playing at output time t (at a cut: the part after it). */
export function clipAt(clips: Clip[], t: number) {
  let at = 0;
  for (let i = 0; i < clips.length; i++) {
    at += clips[i]!.end - clips[i]!.start;
    if (t < at) return i;
  }
  return clips.length - 1;
}

const swap = (clips: Clip[], i: number, ...parts: Clip[]) => [...clips.slice(0, i), ...parts, ...clips.slice(i + 1)];

/** Split the part under the playhead in two. */
export function split(clips: Clip[], t: number) {
  const i = clipAt(clips, t);
  const c = clips[i]!;
  const s = toSource(clips, t);
  if (s - c.start < MIN || c.end - s < MIN) return clips;
  return swap(clips, i, { start: c.start, end: s }, { start: s, end: c.end });
}

/** Trim In: cut the start of the part under the playhead, up to the playhead. */
export function trimIn(clips: Clip[], t: number) {
  const i = clipAt(clips, t);
  const c = clips[i]!;
  const s = toSource(clips, t);
  return s <= c.start || c.end - s < MIN ? clips : swap(clips, i, { start: s, end: c.end });
}

/** Trim Out: cut the end of the part under the playhead, from the playhead on. */
export function trimOut(clips: Clip[], t: number) {
  const i = clipAt(clips, t);
  const c = clips[i]!;
  const s = toSource(clips, t);
  return s >= c.end || s - c.start < MIN ? clips : swap(clips, i, { start: c.start, end: s });
}

/** Delete one part. The last part left cannot be deleted (the video would be empty). */
export const remove = (clips: Clip[], i: number) => (clips.length > 1 ? clips.filter((_, j) => j !== i) : clips);

/** Where a zoom shows on the edited timeline (output times): one piece per kept part it overlaps. */
export function zoomPieces(clips: Clip[], z: Zoom) {
  const out: { at: number; len: number }[] = [];
  let at = 0;
  for (const c of clips) {
    const s = Math.max(c.start, z.start);
    const e = Math.min(c.end, z.end);
    if (e > s) out.push({ at: at + s - c.start, len: e - s });
    at += c.end - c.start;
  }
  return out;
}
