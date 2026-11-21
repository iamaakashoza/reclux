// Firefox (and Safari on a normal page) have no MediaStreamTrackProcessor, which the frame pump (recorder.ts) uses
// to read frames from a live stream. This stand-in provides it for video. Chrome never uses it.
// A hidden <video> is read on a steady clock, at a fixed frame rate. The page's own frame callbacks stop in a
// hidden tab, so they cannot be used. A still screen repeats frames.
// Sound needs no stand-in: Mediabunny reads it its own way where the browser has no MediaStreamTrackProcessor.

function videoFrames(track: MediaStreamTrack): ReadableStream<VideoFrame> {
  const video = document.createElement('video');
  const ticker = new Worker(new URL('./ticker.worker.ts', import.meta.url), { type: 'module' });
  return new ReadableStream<VideoFrame>(
    {
      start(ctl) {
        video.muted = true;
        video.srcObject = new MediaStream([track]);
        void video.play();
        const fps = Math.min(60, Math.max(5, Math.round(track.getSettings().frameRate || 30)));
        ticker.onmessage = () => {
          if (video.readyState < 2 || (ctl.desiredSize ?? 0) <= 0) return; // no picture yet, or the encoder is behind
          ctl.enqueue(new VideoFrame(video, { timestamp: Math.round(performance.now() * 1000) }));
        };
        ticker.postMessage(1000 / fps);
      },
      cancel() {
        ticker.postMessage(0);
        ticker.terminate();
        video.srcObject = null;
      },
    },
    { highWaterMark: 2 },
  );
}

/** The video frame reader, for browsers without MediaStreamTrackProcessor. */
export class VideoProcessor {
  readable: ReadableStream<VideoFrame>;
  constructor({ track }: { track: MediaStreamTrack }) {
    this.readable = videoFrames(track);
  }
}

/** True where the stand-in is in use (Firefox). */
export const isPolyfill = !(globalThis as { MediaStreamTrackProcessor?: unknown }).MediaStreamTrackProcessor;
