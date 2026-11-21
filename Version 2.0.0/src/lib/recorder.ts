// Records the live screen + audio straight to a file on disk.
// Video and audio are encoded with WebCodecs and muxed by Mediabunny, in a worker (encoder.worker.ts, report §45).
//   MP4  = H.264 + AAC (or Opus where the browser has no AAC encoder, as in Firefox), written as a fragmented MP4 (every piece is playable on its own, so a crash loses little),
//          then rebuilt as a regular MP4 on Stop, because Windows misreads the frame rate and length of a fragmented one
//   WebM = VP9 + Opus, only where VP9 runs on the graphics chip; otherwise MP4 is used (report §34).
//          Written as a live WebM ("length unknown"), then rebuilt on Stop the same way (report §44)
// Nothing is kept in RAM except the piece being encoded.
import {
  ALL_FORMATS,
  BlobSource,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
  type AudioCodec,
  type StreamTargetChunk,
} from 'mediabunny';
import type { Capture, Format } from './capture';
import type { EncoderMsg } from './encoder.worker';
import type { Preset } from './presets';
import { VideoProcessor, isPolyfill } from './track-processor';
import { getStored, holdStored, markSaved, removeStored, replaceStored } from './store';

const CODECS = {
  mp4: { v: 'avc', a: ['aac', 'opus'] },
  webm: { v: 'vp9', a: ['opus'] },
} as const;
export const AUDIO_BITRATE = 128_000;

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

/**
 * Rebuilds the crash-safe recording as a regular file by copying its packets (no re-encoding, so quick and lossless).
 * MP4: fragmented → regular, because Windows misreads a fragmented one's frame rate and length.
 * WebM: "length unknown" → length, seek index and duration filled in (report §44).
 * Resolves false when it could not (disk full or similar): the crash-safe file is kept as it is.
 */
export async function finishFile(name: string, onProgress: (share: number) => void) {
  const tmp = `${name}.tmp`; // crash recovery ignores this until it is complete
  const sink = await openSink(tmp, () => {});
  const input = new Input({ source: new BlobSource(await getStored(name)), formats: ALL_FORMATS });
  try {
    const output = new Output({
      format: name.endsWith('.webm') ? new WebMOutputFormat() : new Mp4OutputFormat({ fastStart: false }),
      target: new StreamTarget(sink.stream, { chunked: true, chunkSize: 1024 * 1024 }),
    });
    const conversion = await Conversion.init({ input, output, showWarnings: false });
    conversion.onProgress = onProgress;
    await conversion.execute();
    await sink.close();
    await replaceStored(tmp, name);
    return true;
  } catch (e) {
    // Disk full or similar. The crash-safe file is still complete and playable, so keep it.
    console.warn('Reclux: kept the crash-safe file.', e);
    await sink.close().catch(() => {});
    await removeStored(tmp);
    return false;
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
 * Starts the encoder worker (encoder.worker.ts) for this capture. Everything heavy runs there: the frame clock,
 * the encoders and the file. This page only reads the screen and passes each new picture on (report §45).
 */
export async function startRecorder(
  cap: Capture,
  want: Format,
  preset: Preset,
  onSize: (bytes: number) => void,
  onError: (e: Error) => void,
) {
  const s = cap.video.getSettings();
  // H.264 needs an even width and height, and a shared tab or window is often odd (1037 × 766): the encoder refused
  // it and recording failed with "could not encode MP4" (Issue 7, report §41). Such a picture is scaled 1 px to fit.
  const [w0, h0] = [s.width ?? 1920, s.height ?? 1080];
  const [w, h] = [w0 & ~1, h0 & ~1];

  const { ext, hardware, sound } = await pickFormat(want, w, h, preset.mbps * 1e6, !!cap.tap);
  const name = `reclux-${Date.now()}.${ext}`;
  const release = await holdStored(name);
  // The file is made during the countdown. If the window is closed before 0, it holds no recording, so it must not
  // be offered as "never saved" later: marked as nothing to recover until recording starts (go, below).
  markSaved(name);

  const worker = new Worker(new URL('./encoder.worker.ts', import.meta.url), { type: 'module' });
  // One answer awaited at a time: ready, started, stopped or cancelled. An error rejects it, or ends the recording.
  let waiting: { type: string; done: (m: { fresh?: number; lost?: number }) => void; fail: (e: Error) => void } | undefined;
  const failed = (message: string) => (waiting ? waiting.fail(new Error(message)) : onError(new Error(message)));
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'size') return onSize(m.bytes);
    if (m.type === 'error') return failed(m.message);
    if (waiting && m.type === waiting.type) waiting.done(m);
  };
  // The worker itself failed (it did not load, or an error outside its own handling): otherwise nothing would answer,
  // and the countdown or Stop would wait forever. The session stops, and what was written can be recovered.
  worker.onerror = (e) => failed(`the encoder stopped (${e.message || 'worker error'})`);
  worker.onmessageerror = () => failed('the encoder could not read a message');
  const ask = (msg: EncoderMsg, answer: string, transfer: Transferable[] = []) =>
    new Promise<{ fresh?: number; lost?: number }>((done, fail) => {
      waiting = { type: answer, done, fail };
      worker.postMessage(msg, transfer);
    }).finally(() => (waiting = undefined));

  // Firefox has no frame reader of its own: it gets the stand-in, which must stay on this page.
  const Processor = (globalThis as unknown as { MediaStreamTrackProcessor?: ProcessorCtor }).MediaStreamTrackProcessor ?? VideoProcessor;
  const reader = new Processor({ track: cap.video }).readable.getReader();
  try {
    // The sound goes from the audio thread to the worker over its own line.
    const line = cap.tap ? new MessageChannel() : undefined;
    if (line) cap.tap!.port.postMessage(line.port1, [line.port1]);
    const even = w === w0 && h === h0 ? undefined : { width: w, height: h };
    await ask({ type: 'start', name, ext, hardware, sound, fps: preset.fps, mbps: preset.mbps, even, audio: line?.port2 }, 'ready', line ? [line.port2] : []);
    // Each new picture is handed over (moved, not copied); the worker keeps only the newest.
    let reading = true;
    void (async () => {
      for (;;) {
        const { value, done } = await reader.read();
        if (done || !value) break;
        if (!reading) {
          value.close(); // after Stop: never left for the garbage collector (the browser complains)
          break;
        }
        worker.postMessage({ type: 'frame', frame: value } satisfies EncoderMsg, [value]);
      }
    })().catch(() => {}); // the track ended: Stop is on its way
    const stopReading = () => {
      reading = false;
      void reader.cancel().catch(() => {});
    };

    const end = () => {
      stopReading();
      worker.terminate();
    };
    // Everything above runs during the countdown, so recording starts as soon as it reaches 0.
    return {
      /** Start recording (the end of the countdown). Resolves once the encoder has started. */
      go: async () => {
        await ask({ type: 'go' }, 'started');
        markSaved(name, false);
      },
      /** File name in private storage. */
      name,
      /** The format really used. It can differ from the one asked for. */
      ext,
      /** False when this PC has no hardware encoder for it. Software is slower and heavier. */
      hardware,
      /** Let go of the file lock (call when the file is no longer in use). */
      release,
      pause: () => worker.postMessage({ type: 'pause' } satisfies EncoderMsg),
      resume: () => worker.postMessage({ type: 'resume' } satisfies EncoderMsg),
      /**
       * Finish the file. Resolves with the file (disk-backed, not in RAM), whether it could be made regular, and
       * the totals: new pictures from the capture, and frames the file had to skip.
       */
      stop: async (onProgress: (share: number) => void) => {
        let totals;
        stopReading(); // no new pictures while the file is finished
        try {
          totals = await ask({ type: 'stop' }, 'stopped');
        } finally {
          end(); // the file is closed (or the worker failed): either way it can be recovered
        }
        const regular = await finishFile(name, onProgress);
        return { file: await getStored(name), regular, fresh: totals.fresh ?? 0, lost: totals.lost ?? 0 };
      },
      /** Throw the recording away. */
      cancel: async () => {
        stopReading();
        await ask({ type: 'cancel' }, 'cancelled').catch(() => {});
        end();
        await removeStored(name);
        release();
      },
    };
  } catch (e) {
    void reader.cancel().catch(() => {});
    worker.terminate();
    release();
    await removeStored(name);
    throw e;
  }
}

export type Recorder = Awaited<ReturnType<typeof startRecorder>>;
