// Builds the edited video: only the kept parts, with the cursor zoom drawn in, encoded again into a new file in
// private storage (never RAM, so a 2-hour recording works too). The original is untouched until the new file is
// complete; a crash leaves only a ".tmp" file, which the next start cleans up.
import {
  ALL_FORMATS,
  AudioSampleSink,
  AudioSampleSource,
  BlobSource,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
  VideoSample,
  VideoSampleSink,
  VideoSampleSource,
  WebMOutputFormat,
} from 'mediabunny';
import type { Format } from './capture';
import { total, type Clip } from './edit';
import type { Preset } from './presets';
import { AUDIO_BITRATE, openSink, pickFormat, videoEncoding } from './recorder';
import { getStored, holdStored, removeStored, replaceStored } from './store';
import { zoomAt, type Zoom } from './zoom';

export async function renderEdit(
  from: string,
  clips: Clip[],
  zooms: Zoom[],
  preset: Preset,
  onProgress: (share: number) => void,
  cancelled: () => boolean,
) {
  const input = new Input({ source: new BlobSource(await getStored(from)), formats: ALL_FORMATS });
  const tmpName = `reclux-${Date.now()}`;
  let tmp = '';
  let sink: Awaited<ReturnType<typeof openSink>> | undefined;
  let output: Output | undefined;
  try {
    const video = await input.getPrimaryVideoTrack();
    if (!video) throw new Error('the recording has no picture');
    const audio = await input.getPrimaryAudioTrack();
    const W = video.displayWidth;
    const H = video.displayHeight;
    // The file's own frame rate (a recovered file may not match today's setting). The rate it was recorded at, not
    // the average: a file that skipped frames averaged 27 fps where it was made at 60 (report §45).
    const fps = Math.round((await video.computeFrameRateMetrics()).bestGuessFrameRate) || preset.fps;
    const want: Format = from.endsWith('.webm') ? 'webm' : 'mp4';
    const { ext, hardware, sound } = await pickFormat(want, W, H, preset.mbps * 1e6, !!audio);
    const name = `${tmpName}.${ext}`;
    tmp = `${name}.tmp`;
    sink = await openSink(tmp, () => {});
    output = new Output({
      format: ext === 'mp4' ? new Mp4OutputFormat({ fastStart: false }) : new WebMOutputFormat(),
      target: new StreamTarget(sink.stream, { chunked: true, chunkSize: 1024 * 1024 }),
    });
    const videoOut = new VideoSampleSource(videoEncoding(ext, hardware, fps, preset.mbps));
    output.addVideoTrack(videoOut, { frameRate: fps });
    const audioOut = audio && new AudioSampleSource({ codec: sound, quality: new Quality({ bitrate: AUDIO_BITRATE }) });
    if (audioOut) output.addAudioTrack(audioOut);
    await output.start();

    const length = total(clips);
    const stopIfCancelled = () => {
      if (cancelled()) throw new Error('cancelled');
    };

    // Pictures: each kept part in turn, re-timed to follow the previous one. Zoomed moments are drawn
    // cropped and enlarged, the same math as the editor preview (zoomAt).
    const pictures = async () => {
      const canvas = new OffscreenCanvas(W, H);
      const ctx = canvas.getContext('2d', { alpha: false })!;
      ctx.imageSmoothingQuality = 'high';
      const frames = new VideoSampleSink(video);
      let at = 0;
      let last = -1;
      for (const c of clips) {
        for await (const s of frames.samples(c.start, c.end)) {
          try {
            stopIfCancelled();
            // On the frame grid, so a cut never makes two frames share a time.
            const t = Math.round((at + Math.max(0, s.timestamp - c.start)) * fps) / fps;
            if (t <= last) continue;
            last = t;
            const v = zoomAt(zooms, s.timestamp);
            if (v.scale === 1) {
              s.setTimestamp(t);
              await videoOut.add(s);
            } else {
              const sw = W / v.scale;
              const sh = H / v.scale;
              s.draw(ctx, v.x * W - sw / 2, v.y * H - sh / 2, sw, sh, 0, 0, W, H);
              const z = new VideoSample(canvas, { timestamp: t, duration: 1 / fps });
              try {
                await videoOut.add(z);
              } finally {
                z.close();
              }
            }
            onProgress(Math.min(1, t / length));
          } finally {
            s.close();
          }
        }
        at += c.end - c.start;
      }
    };

    // Sound: the same parts, back to back.
    // ponytail: a cut lands on the nearest sound block (~20 ms), fine for speech; sample-exact cuts if anyone hears it.
    const sounds = async () => {
      if (!audio || !audioOut) return;
      const blocks = new AudioSampleSink(audio);
      let at = 0;
      let end = 0;
      for (const c of clips) {
        for await (const s of blocks.samples(c.start, c.end)) {
          try {
            stopIfCancelled();
            const t = Math.max(end, at + s.timestamp - c.start);
            s.setTimestamp(t);
            end = t + s.duration;
            await audioOut.add(s);
          } finally {
            s.close();
          }
        }
        at += c.end - c.start;
      }
    };

    // Both at once: the file interleaves picture and sound, so feeding one track alone would pile up in memory.
    await Promise.all([pictures(), sounds()]);
    await output.finalize();
    await sink.close();
    sink = undefined; // closed: a second close would wait forever on the stopped worker
    const release = await holdStored(name);
    await replaceStored(tmp, name);
    return { name, ext, release, file: await getStored(name), duration: length };
  } catch (e) {
    await output?.cancel().catch(() => {});
    await sink?.close().catch(() => {});
    if (tmp) await removeStored(tmp);
    throw e;
  } finally {
    input.dispose();
  }
}
