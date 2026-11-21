// Encodes and writes the recording off the page's main thread (report §45). The page only hands over each new
// picture; the sound comes straight from the audio thread (tap.worklet.js). In Firefox every Reclux page shares one
// main thread (the controls window, the webcam circle on web pages): a busy moment there left holes in the file.
// Writing is unchanged: the writer worker (openSink) puts each finished section on disk at once.
import { AudioSample, AudioSampleSource, Mp4OutputFormat, Output, Quality, StreamTarget, VideoSample, VideoSampleSource, WebMOutputFormat, type AudioCodec } from 'mediabunny';
import type { Format } from './capture';
import { AUDIO_BITRATE, openSink, videoEncoding } from './recorder';
import { soundClock, stamp } from './sound-clock';

const ENCODER_WARMUP_MS = 3000; // never hold the start back longer than this
// The pump may fall this far behind (a short stall) and catch up with repeats. Beyond it, it jumps to "now"
// instead of piling frames up, which is what made V1's encoder fall seconds behind (report §34).
const MAX_BEHIND_SECONDS = 0.25;

export type EncoderMsg =
  | {
      type: 'start';
      name: string;
      ext: Format;
      hardware: boolean;
      sound: AudioCodec;
      fps: number;
      mbps: number;
      /** Set when the picture must be scaled to an even size (H.264 refuses odd ones, report §41). */
      even?: { width: number; height: number };
      /** The sound, from tap.worklet.js. None: a recording without sound. */
      audio?: MessagePort;
    }
  | { type: 'frame'; frame: VideoFrame }
  | { type: 'go' | 'pause' | 'resume' | 'stop' | 'cancel' };

const post = (m: unknown) => (self as unknown as Worker).postMessage(m);
const fail = (what: string) => (e: unknown) => post({ type: 'error', message: `${what}: ${(e as Error)?.name ?? ''} ${(e as Error)?.message ?? e}`.trim() });

let output: Output | undefined;
let sink: Awaited<ReturnType<typeof openSink>> | undefined;
let video: VideoSampleSource | undefined;
let sound: AudioSampleSource | undefined;
let fps = 60;
let latest: VideoFrame | undefined;
let fresh = 0;
let lost = 0;
let running = false; // the clock runs (between go and stop)
let ended = false; // stop or cancel came: pictures still on their way are closed at once
let size = ''; // size of the newest picture, and since when (performance.now())
let sizeSince = 0;
let pausedAt = 0;
let startedAt = 0;
let next = 0; // timestamp of the next frame, in seconds of file time
const soundAt = soundClock(); // timestamp of the next sound block, kept on the picture's clock
let soundChain: Promise<void> = Promise.resolve();
let clock: ReturnType<typeof setInterval> | undefined;
let wake: (() => void) | undefined;
let finished: Promise<void> = Promise.resolve();
let onFrame: (() => void) | undefined;
let gotFirst = () => {};
const first = new Promise<void>((r) => (gotFirst = r));
let gotPacket = () => {};
const firstPacket = new Promise<void>((r) => (gotPacket = r));

const elapsed = () => (performance.now() - startedAt) / 1000;

/** Writes the newest picture at `at` seconds. */
async function add(at: number) {
  const frame = new VideoFrame(latest!, { timestamp: Math.round(at * 1e6), duration: Math.round(1e6 / fps) });
  const sample = new VideoSample(frame, { timestamp: at, duration: 1 / fps });
  try {
    await video!.add(sample); // waits while the encoder or the disk is busy
  } finally {
    sample.close();
  }
}

/**
 * Writes frames on a steady clock at exactly the chosen rate, so the file has a locked frame rate.
 * Screen capture only sends a frame when it has a new picture, and often fewer than asked for (report §31),
 * so the newest picture is repeated until the next one arrives. A worker's clock is not slowed in a hidden tab.
 */
async function loop() {
  while (running) {
    await new Promise<void>((r) => (wake = r));
    if (!latest) continue;
    while (running && !pausedAt && next <= elapsed() + 0.5 / fps) {
      // A short stall is made up with repeats, so the timeline has no hole. A longer one is skipped,
      // so the encoder never builds a lag. Players simply hold the last picture over the gap.
      const behind = elapsed() - next;
      if (behind > MAX_BEHIND_SECONDS) {
        const skip = Math.floor(behind * fps);
        lost += skip;
        next += skip / fps;
      }
      await add(next);
      next += 1 / fps;
    }
  }
}

/** Sound blocks in order, timed by how much sound was recorded, so pauses leave no gap (as the picture). */
function onSound(e: MessageEvent<{ data: Float32Array; frames: number; rate: number }>) {
  if (!running || pausedAt) return;
  const { data, frames, rate } = e.data;
  const at = stamp(soundAt, elapsed(), frames / rate);
  if (at === undefined) return; // the sound ran ahead of the picture: skip one block (sound-clock.ts)
  const sample = new AudioSample({ data, format: 'f32-planar', numberOfChannels: 2, sampleRate: rate, timestamp: at });
  soundChain = soundChain.then(() => sound!.add(sample)).finally(() => sample.close()).catch(fail('audio'));
}

async function stopClock() {
  running = false;
  clearInterval(clock);
  wake?.();
  await finished;
  await soundChain;
}

self.onmessage = async (e: MessageEvent<EncoderMsg>) => {
  const m = e.data;
  try {
    if (m.type === 'frame') {
      if (ended) return m.frame.close(); // a picture left unclosed made the browser complain after every Stop
      latest?.close(); // only the newest picture is kept, so memory stays flat
      latest = m.frame;
      const now = `${latest.codedWidth}x${latest.codedHeight}`;
      if (now !== size) [size, sizeSince] = [now, performance.now()];
      fresh++;
      gotFirst();
      onFrame?.();
    } else if (m.type === 'start') {
      fps = m.fps;
      sink = await openSink(m.name, (bytes) => post({ type: 'size', bytes }));
      output = new Output({
        // appendOnly: the WebM says "length unknown" until finishFile. Without it, the length written at the start
        // covers only the header until Stop, so a file cut short by a crash looked empty to players (report §44).
        format: m.ext === 'mp4' ? new Mp4OutputFormat({ fastStart: 'fragmented' }) : new WebMOutputFormat({ appendOnly: true }),
        // No holding buffer: each finished section goes to disk at once, so a crash keeps every finished section.
        target: new StreamTarget(sink.stream),
      });
      video = new VideoSampleSource({
        ...videoEncoding(m.ext, m.hardware, m.fps, m.mbps),
        sizeChangeBehavior: 'contain', // a resized window must not stop the recording
        ...(m.even ? { transform: { ...m.even, fit: 'contain' as const } } : {}),
        // "realtime" lets a busy encoder skip a frame instead of queueing it, so it never falls behind (report §34).
        latencyMode: 'realtime',
        onEncodedPacket: () => gotPacket(),
      });
      // The frame rate stored in the file.
      output.addVideoTrack(video, { frameRate: m.fps });
      if (m.audio) {
        sound = new AudioSampleSource({ codec: m.sound, quality: new Quality({ bitrate: AUDIO_BITRATE }) });
        output.addAudioTrack(sound);
        m.audio.onmessage = onSound;
      }
      await output.start();
      post({ type: 'ready' });
    } else if (m.type === 'go') {
      // Encodes the first frame and waits for the result, because starting an encoder freezes it for up to a second.
      // Only once recording starts, never during the countdown: a picture from then showed the countdown or the
      // page bar, and the encoder takes its size from it (a shared tab shrinks once it is back in front, §45).
      const timeout = new Promise<void>((r) => setTimeout(r, ENCODER_WARMUP_MS));
      await Promise.race([first, timeout]);
      // And a picture from now, with the user's page back: a hidden tab's last one can still be the old size.
      await Promise.race([new Promise<void>((r) => (onFrame = r)), new Promise((r) => setTimeout(r, 1000))]);
      onFrame = undefined;
      // Whose size has settled: a tab coming back to the front sends a picture or two at an in-between size
      // (1618×932 between 1618×1020 and 1876×1080, Brave), and a frame of that size made every later one slow (§45.4).
      for (const t0 = performance.now(); performance.now() - sizeSince < 200 && performance.now() - t0 < 1000; ) {
        await new Promise((r) => setTimeout(r, 20));
      }
      next = 0;
      if (latest) {
        add(0).catch(fail('video'));
        next = 1 / fps;
        await Promise.race([firstPacket, timeout]);
      }
      // Nothing on screen yet: the clock below starts the file when a picture comes.
      startedAt = performance.now();
      running = true;
      clock = setInterval(() => wake?.(), 1000 / fps);
      finished = loop().catch((err) => {
        if (running) fail('video')(err);
      });
      post({ type: 'started' });
    } else if (m.type === 'pause') {
      pausedAt = performance.now();
    } else if (m.type === 'resume') {
      startedAt += performance.now() - pausedAt;
      pausedAt = 0;
    } else if (m.type === 'stop') {
      ended = true;
      await stopClock();
      latest?.close();
      try {
        await output!.finalize();
      } finally {
        await sink!.close().catch(() => {}); // always free the file, so it can be recovered
      }
      post({ type: 'stopped', fresh, lost });
    } else if (m.type === 'cancel') {
      ended = true;
      await stopClock();
      latest?.close();
      await output?.cancel().catch(() => {});
      await sink?.close().catch(() => {});
      post({ type: 'cancelled' });
    }
  } catch (err) {
    post({ type: 'error', message: (err as Error).message, during: m.type });
  }
};
