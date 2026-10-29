// Records the live screen + audio straight to a file on disk.
// Video and audio are encoded with WebCodecs and muxed by Mediabunny.
//   MP4  = H.264 + AAC, written as a fragmented MP4 (every piece is playable on its own)
//   WebM = VP9 + Opus, with the duration written at the end
// Nothing is kept in RAM except the piece being encoded.
import {
  MediaStreamAudioTrackSource,
  MediaStreamVideoTrackSource,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
  type StreamTargetChunk,
} from 'mediabunny';
import type { Capture, Format } from './capture';
import type { Preset } from './presets';
import './track-processor'; // gives Firefox the frame reader it lacks
import { getStored, holdStored, removeStored } from './store';

const CODECS = { mp4: { v: 'avc', a: 'aac' }, webm: { v: 'vp9', a: 'opus' } } as const;
const AUDIO_BITRATE = 128_000;

export interface Recorder {
  /** File name in private storage. */
  name: string;
  /** The format really used. It can differ from the one asked for. */
  ext: Format;
  pause(): void;
  resume(): void;
  /** Finish the file. Resolves with the finished file (disk-backed, not in RAM). */
  stop(): Promise<File>;
  /** Throw the recording away. */
  cancel(): Promise<void>;
  /** Let go of the file lock (call when the file is no longer in use). */
  release(): void;
}

async function pickFormat(want: Format, w: number, h: number, bitrate: number, fps: number, audio: boolean) {
  for (const f of want === 'mp4' ? (['mp4', 'webm'] as const) : (['webm', 'mp4'] as const)) {
    const c = CODECS[f];
    const video = await canEncodeVideo(c.v, { width: w, height: h, quality: new Quality({ bitrate }), frameRate: fps });
    const sound =
      !audio || (await canEncodeAudio(c.a, { numberOfChannels: 2, sampleRate: 48000, quality: new Quality({ bitrate: AUDIO_BITRATE }) }));
    if (video && sound) return f;
  }
  throw new Error('This browser cannot encode video as MP4 or WebM.');
}

/** A background worker writes each piece into the file. Its answers slow us down if the disk is slow. */
async function openSink(name: string, onSize: (bytes: number) => void) {
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

export async function startRecorder(
  cap: Capture,
  want: Format,
  preset: Preset,
  onSize: (bytes: number) => void,
  onError: (e: Error) => void,
): Promise<Recorder> {
  const video = cap.video;
  const audio = cap.stream.getAudioTracks()[0];
  const s = video.getSettings();
  const bitrate = preset.mbps * 1e6;

  const ext = await pickFormat(want, s.width ?? 1920, s.height ?? 1080, bitrate, preset.fps, !!audio);
  const codec = CODECS[ext];
  const name = `reclux-${Date.now()}.${ext}`;
  const release = await holdStored(name);

  try {
    const sink = await openSink(name, onSize);
    const output = new Output({
      format: ext === 'mp4' ? new Mp4OutputFormat({ fastStart: 'fragmented' }) : new WebMOutputFormat(),
      // Small chunks, so a crash loses well under a second.
      target: new StreamTarget(sink.stream, { chunked: true, chunkSize: 256 * 1024 }),
    });

    const videoSource = new MediaStreamVideoTrackSource(video as MediaStreamVideoTrack, {
      codec: codec.v,
      quality: new Quality({ bitrate }),
      sizeChangeBehavior: 'contain', // a resized window must not stop the recording
    });
    output.addVideoTrack(videoSource);
    let audioSource: MediaStreamAudioTrackSource | undefined;
    if (audio) {
      audioSource = new MediaStreamAudioTrackSource(audio as MediaStreamAudioTrack, {
        codec: codec.a,
        quality: new Quality({ bitrate: AUDIO_BITRATE }),
      });
      output.addAudioTrack(audioSource);
    }
    await output.start();
    videoSource.errorPromise.catch((e) => onError(new Error(`video: ${e?.name ?? ''} ${e?.message ?? e}`.trim())));
    audioSource?.errorPromise.catch((e) => onError(new Error(`audio: ${e?.name ?? ''} ${e?.message ?? e}`.trim())));

    return {
      name,
      ext,
      release,
      pause: () => {
        videoSource.pause();
        audioSource?.pause();
      },
      resume: () => {
        videoSource.resume();
        audioSource?.resume();
      },
      stop: async () => {
        try {
          await output.finalize();
        } finally {
          await sink.close().catch(() => {}); // always free the file, so it can be recovered
        }
        return getStored(name);
      },
      cancel: async () => {
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
