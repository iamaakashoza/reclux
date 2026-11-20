// Records the live screen + audio straight to a file on disk.
// Video and audio are encoded with WebCodecs and muxed by Mediabunny.
//   MP4  = H.264 + AAC (or Opus where the browser has no AAC encoder, as in Firefox), written as a fragmented MP4 (every piece is playable on its own, so a crash loses little),
//          then rebuilt as a regular MP4 on Stop, because Windows misreads the frame rate and length of a fragmented one
//   WebM = VP9 + Opus, only where VP9 runs on the graphics chip; otherwise MP4 is used (report §34)
// Nothing is kept in RAM except the piece being encoded.
import {
  ALL_FORMATS,
  BlobSource,
  Conversion,
  Input,
  MediaStreamAudioTrackSource,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
  VideoSample,
  VideoSampleSource,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
  type AudioCodec,
  type StreamTargetChunk,
} from 'mediabunny';
import type { Capture, Format } from './capture';
import type { Preset } from './presets';
import { isPolyfill } from './track-processor'; // also gives Firefox the frame reader it lacks
import { getStored, holdStored, markSaved, removeStored, replaceStored } from './store';

const CODECS = {
  mp4: { v: 'avc', a: ['aac', 'opus'] },
  webm: { v: 'vp9', a: ['opus'] },
} as const;
export const AUDIO_BITRATE = 128_000;
const ENCODER_WARMUP_MS = 3000; // never hold the start back longer than this
// The pump may fall this far behind (a short stall) and catch up with repeats. Beyond it, it jumps to "now"
// instead of piling frames up, which is what made V1's encoder fall seconds behind (report §34).
const MAX_BEHIND_SECONDS = 0.25;

// Hardware keeps text sharp: measured 41 dB against 28 dB for software H.264 at the same bitrate (report §31).
// WebM is only used with a hardware VP9 encoder: software VP9 managed about 5 fps at 1080p (report §31).
// Firefox's hardware answer cannot be trusted before 143, so Firefox always gets MP4 (H.264 was 26+ fps there).
// A browser's "can you encode this?" answer can stall (seen with a busy or flaky graphics driver).
// Never wait forever: no answer in time counts as "no". Firefox's answer is a real test frame, which took longer
// than 3 s at the busy moment sharing starts (Issue 7, report §41), so it gets more time and a second try.
const PROBE_MS = 3000;
const SOFTWARE_PROBE_MS = 8000;
const answer = (probe: Promise<boolean>, ms = PROBE_MS) =>
  Promise.race([probe.catch(() => false), new Promise<boolean>((r) => setTimeout(() => r(false), ms))]);
/** Asked twice: the library remembers a slow answer, so the second ask gets it as soon as it arrives. */
const answerTwice = async (ask: () => Promise<boolean>) => (await answer(ask(), SOFTWARE_PROBE_MS)) || answer(ask(), SOFTWARE_PROBE_MS);

export async function pickFormat(want: Format, w: number, h: number, bitrate: number, audio: boolean) {
  for (const ext of want === 'webm' ? (['webm', 'mp4'] as const) : (['mp4'] as const)) {
    const c = CODECS[ext];
    const opts = { width: w, height: h, quality: new Quality({ bitrate }) };
    const hardware = !isPolyfill && (await answer(canEncodeVideo(c.v, { ...opts, hardwareAcceleration: 'prefer-hardware' })));
    const soft = () => canEncodeVideo(c.v, opts);
    const video = hardware || (ext === 'mp4' && (await (isPolyfill ? answerTwice(soft) : answer(soft()))));
    let sound: AudioCodec | undefined;
    for (const a of c.a) {
      if (sound) break;
      if (await answer(canEncodeAudio(a, { numberOfChannels: 2, sampleRate: 48000, quality: new Quality({ bitrate: AUDIO_BITRATE }) }))) sound = a;
    }
    if (video && (sound || !audio)) return { ext, hardware, sound: sound ?? 'opus' };
  }
  throw new Error('the browser did not confirm it can encode MP4 video. Restart the browser and try again.');
}

/** A background worker writes each piece into the file. Its answers slow us down if the disk is slow. */
export async function openSink(name: string, onSize: (bytes: number) => void) {
  const worker = new Worker(new URL('./writer.worker.ts', import.meta.url), { type: 'module' });
  const call = (msg: unknown) =>
    new Promise<{ size?: number }>((resolve, reject) => {
      worker.onmessage = (e) => (e.data.type === 'error' ? reject(new Error(e.data.message)) : resolve(e.data));
      worker.postMessage(msg);
    });
  await call({ type: 'open', name });
  return {
    stream: new WritableStream<StreamTargetChunk>({
      async write(chunk) {
        const r = await call({ type: 'write', data: chunk.data, position: chunk.position });
        if (r.size) onSize(r.size);
      },
    }),
    close: async () => {
      await call({ type: 'close' });
      worker.terminate();
    },
  };
}

/** Video encoder settings, shared by the recording and the edited export. */
export function videoEncoding(ext: Format, hardware: boolean, fps: number, mbps: number) {
  // Hardware VP9 runs without a frame rate hint (below), so it assumes 30 fps and spends the bitrate per frame.
  const bitrate = (hardware && ext === 'webm' ? 30 / fps : 1) * mbps * 1e6;
  // "constant" keeps small text sharper on hardware H.264 for nearly the same file size (report §32).
  const bitrateMode = hardware && ext === 'mp4' ? 'constant' : 'variable';
  return {
    codec: CODECS[ext].v,
    quality: new Quality({ bitrate, bitrateMode }),
    ...(hardware ? { hardwareAcceleration: 'prefer-hardware' as const } : {}),
    // Told 50 or 60 fps, this VP9 chip is refused and slow software takes over, yet it copes without the hint (report §31).
    onEncoderConfig: (c: VideoEncoderConfig) => {
      if (hardware && ext === 'webm') delete c.framerate;
    },
  };
}

/** Rebuilds a fragmented MP4 as a regular one by copying its packets. No re-encoding, so it is quick and lossless. */
async function makeRegularMp4(name: string, onProgress: (share: number) => void) {
  const tmp = `${name}.tmp`; // crash recovery ignores this until it is complete
  const sink = await openSink(tmp, () => {});
  const input = new Input({ source: new BlobSource(await getStored(name)), formats: ALL_FORMATS });
  try {
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: false }),
      target: new StreamTarget(sink.stream, { chunked: true, chunkSize: 1024 * 1024 }),
    });
    const conversion = await Conversion.init({ input, output, showWarnings: false });
    conversion.onProgress = onProgress;
    await conversion.execute();
    await sink.close();
    await replaceStored(tmp, name);
  } catch (e) {
    // Disk full or similar. The fragmented file is still complete and playable, so keep it.
    console.warn('Reclux: kept the fragmented file.', e);
    await sink.close().catch(() => {});
    await removeStored(tmp);
  } finally {
    input.dispose();
  }
}

interface FrameReader {
  read(): Promise<{ value?: VideoFrame; done: boolean }>;
  cancel(): Promise<void>;
}
type ProcessorCtor = new (init: { track: MediaStreamTrack }) => { readable: { getReader(): FrameReader } };

/**
 * Writes frames on a steady clock at exactly the chosen rate, so the file has a locked frame rate.
 * Screen capture only sends a frame when it has a new picture, and often fewer than asked for (report §31),
 * so the newest picture is repeated until the next one arrives.
 */
function startPump(track: MediaStreamTrack, source: VideoSampleSource, fps: number, onError: (e: Error) => void) {
  const { MediaStreamTrackProcessor: Processor } = globalThis as unknown as { MediaStreamTrackProcessor: ProcessorCtor };
  const reader = new Processor({ track }).readable.getReader();
  let latest: VideoFrame | undefined;
  let gotFirst = () => {};
  const first = new Promise<void>((r) => (gotFirst = r));
  let fresh = 0;
  let lost = 0;
  let running = true;
  void (async () => {
    while (running) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      latest?.close(); // only the newest picture is kept, so memory stays flat
      latest = value;
      fresh++;
      gotFirst();
    }
  })().catch(() => {}); // the track ended: Stop is on its way

  // A worker clock, because a hidden tab slows page timers to once a second.
  const ticker = new Worker(new URL('./ticker.worker.ts', import.meta.url), { type: 'module' });
  let wake: (() => void) | undefined;
  ticker.onmessage = () => wake?.();

  let next = 0; // timestamp of the next frame, in seconds of file time
  let startedAt = 0;
  let pausedAt = 0;
  let finished: Promise<void> = Promise.resolve();
  const elapsed = () => (performance.now() - startedAt) / 1000;

  const add = async (at: number) => {
    const frame = new VideoFrame(latest!, { timestamp: Math.round(at * 1e6), duration: Math.round(1e6 / fps) });
    const sample = new VideoSample(frame, { timestamp: at, duration: 1 / fps });
    try {
      await source.add(sample); // waits while the encoder or the disk is busy
    } finally {
      sample.close();
    }
  };

  const loop = async () => {
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
  };

  return {
    stats: () => ({ fresh, lost }),
    pause: () => {
      pausedAt = performance.now();
    },
    resume: () => {
      startedAt += performance.now() - pausedAt;
      pausedAt = 0;
    },
    /** Encodes the first frame and waits for the result, because starting an encoder freezes it for up to a second. */
    warmUp: async (firstPacket: Promise<void>) => {
      const timeout = new Promise<void>((r) => setTimeout(r, ENCODER_WARMUP_MS));
      await Promise.race([first, timeout]);
      if (!latest) return; // nothing on screen yet: the clock below starts the file when a picture comes
      add(0).catch(onError);
      next = 1 / fps;
      await Promise.race([firstPacket, timeout]);
    },
    run: () => {
      startedAt = performance.now();
      ticker.postMessage(1000 / fps);
      finished = loop().catch((e) => {
        if (running) onError(e as Error);
      });
    },
    stop: async () => {
      running = false;
      wake?.();
      await finished;
      ticker.terminate();
      void reader.cancel().catch(() => {});
      latest?.close();
    },
  };
}

export async function startRecorder(
  cap: Capture,
  want: Format,
  preset: Preset,
  onSize: (bytes: number) => void,
  onError: (e: Error) => void,
) {
  const audio = cap.stream.getAudioTracks()[0];
  const s = cap.video.getSettings();
  // H.264 needs an even width and height, and a shared tab or window is often odd (1037 × 766): the encoder refused
  // it and recording failed with "could not encode MP4" (Issue 7, report §41). Such a picture is scaled 1 px to fit.
  const [w0, h0] = [s.width ?? 1920, s.height ?? 1080];
  const [w, h] = [w0 & ~1, h0 & ~1];
  const even = w === w0 && h === h0 ? {} : { transform: { width: w, height: h, fit: 'contain' as const } };

  const { ext, hardware, sound } = await pickFormat(want, w, h, preset.mbps * 1e6, !!audio);
  const name = `reclux-${Date.now()}.${ext}`;
  const release = await holdStored(name);
  // The file is made during the countdown. If the window is closed before 0, it holds no recording, so it must not
  // be offered as "never saved" later: marked as nothing to recover until recording starts (go, below).
  markSaved(name);

  try {
    const sink = await openSink(name, onSize);
    const output = new Output({
      format: ext === 'mp4' ? new Mp4OutputFormat({ fastStart: 'fragmented' }) : new WebMOutputFormat(),
      // No holding buffer: each finished section goes to disk at once, so a crash keeps every finished section.
      target: new StreamTarget(sink.stream),
    });

    let gotPacket = () => {};
    const firstPacket = new Promise<void>((r) => (gotPacket = r));
    const videoSource = new VideoSampleSource({
      ...videoEncoding(ext, hardware, preset.fps, preset.mbps),
      sizeChangeBehavior: 'contain', // a resized window must not stop the recording
      ...even,
      // "realtime" lets a busy encoder skip a frame instead of queueing it, so it never falls behind (report §34).
      latencyMode: 'realtime',
      onEncodedPacket: () => gotPacket(),
    });
    // The frame rate stored in the file.
    output.addVideoTrack(videoSource, { frameRate: preset.fps });
    let audioSource: MediaStreamAudioTrackSource | undefined;
    if (audio) {
      audioSource = new MediaStreamAudioTrackSource(audio as MediaStreamAudioTrack, {
        codec: sound,
        quality: new Quality({ bitrate: AUDIO_BITRATE }),
      });
      output.addAudioTrack(audioSource);
      audioSource.errorPromise.catch((e) => onError(new Error(`audio: ${e?.name ?? ''} ${e?.message ?? e}`.trim())));
      audioSource.pause(); // sound starts together with the first real frame, below
    }
    await output.start();

    const pump = startPump(cap.video, videoSource, preset.fps, (e) => onError(new Error(`video: ${e.name} ${e.message}`.trim())));
    await pump.warmUp(firstPacket);

    // Everything above runs during the countdown, so recording really starts the moment it reaches 0.
    return {
      /** Start recording (the end of the countdown). */
      go: () => {
        markSaved(name, false);
        audioSource?.resume();
        pump.run();
      },
      /** File name in private storage. */
      name,
      /** The format really used. It can differ from the one asked for. */
      ext,
      /** False when this PC has no hardware encoder for it. Software is slower and heavier. */
      hardware,
      /** Let go of the file lock (call when the file is no longer in use). */
      release,
      /** Running totals: new pictures from the capture, and frames the file had to skip. */
      stats: pump.stats,
      pause: () => {
        pump.pause();
        audioSource?.pause();
      },
      resume: () => {
        pump.resume();
        audioSource?.resume();
      },
      /** Finish the file. Resolves with the finished file (disk-backed, not in RAM). */
      stop: async (onProgress: (share: number) => void) => {
        await pump.stop();
        try {
          await output.finalize();
        } finally {
          await sink.close().catch(() => {}); // always free the file, so it can be recovered
        }
        if (ext === 'mp4') await makeRegularMp4(name, onProgress);
        return getStored(name);
      },
      /** Throw the recording away. */
      cancel: async () => {
        await pump.stop();
        await output.cancel().catch(() => {});
        await sink.close().catch(() => {});
        await removeStored(name);
        release();
      },
    };
  } catch (e) {
    release();
    await removeStored(name);
    throw e;
  }
}

export type Recorder = Awaited<ReturnType<typeof startRecorder>>;
