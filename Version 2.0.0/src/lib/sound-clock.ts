// Keeps the sound on the picture's clock (report §45.3). Sound blocks are timed by counting samples, which is smooth,
// but that is the sound card's clock: it runs a few tens of ppm off the computer's clock the picture uses, so over
// 2 hours the sound drifted up to ~0.4 s. Each block is checked against the picture's clock and the count is
// corrected when they part by more than SLACK. Timestamps only ever go forward.

/** How far sound and picture may part before the sound is moved (about a frame or two: not noticeable). */
export const SLACK = 0.04;
/** Blocks per check (about 2 s): a late message (a busy moment) must not look like drift. */
export const WINDOW = 90;

export interface SoundClock {
  /** Timestamp of the next block. */
  at: number;
  /** Smallest lag seen in this window (sound behind the picture, in seconds). */
  low: number;
  /** Blocks in this window. */
  n: number;
}
export const soundClock = (): SoundClock => ({ at: 0, low: Infinity, n: 0 });

/**
 * Timestamp for a block of `dur` seconds that reached the encoder at picture time `now`, or undefined to drop it.
 * Sound ahead of the picture: the block is dropped (never back in time). Behind for a whole window: it moves forward.
 */
export function stamp(c: SoundClock, now: number, dur: number): number | undefined {
  const lag = now - dur - c.at; // the block ended about now, so it began `dur` ago
  if (lag < -SLACK) return undefined; // cannot arrive early: the sound clock runs fast, skip ~20 ms to catch up
  c.low = Math.min(c.low, lag);
  if (++c.n >= WINDOW) {
    // Only the smallest lag counts: a message can arrive late (a busy moment), never early.
    if (c.low > SLACK) c.at += c.low;
    c.low = Infinity;
    c.n = 0;
  }
  const t = c.at;
  c.at += dur;
  return t;
}
