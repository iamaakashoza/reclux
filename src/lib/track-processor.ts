// Firefox (and Safari on a normal page) have no MediaStreamTrackProcessor, which Mediabunny uses to read
// frames and sound from a live stream. This stand-in provides the same thing. Chrome never uses it.
//   Video: a hidden <video> is read on a steady clock, at a fixed frame rate. The page's own frame
//          callbacks stop in a hidden tab, so they cannot be used. A still screen repeats frames.
//   Audio: a ScriptProcessor turns the sound into AudioData.
// ponytail: ScriptProcessor is deprecated but works everywhere. Move to an AudioWorklet if browsers drop it.

type Frame = VideoFrame | AudioData;

function videoFrames(track: MediaStreamTrack): ReadableStream<Frame> {
  const video = document.createElement('video');
  const ticker = new Worker(new URL('./ticker.worker.ts', import.meta.url), { type: 'module' });
  return new ReadableStream<Frame>(
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

function audioFrames(track: MediaStreamTrack): ReadableStream<Frame> {
  let ctx: AudioContext | undefined;
  let node: ScriptProcessorNode | undefined;
  return new ReadableStream<Frame>({
    async start(ctl) {
      ctx = new AudioContext({ sampleRate: track.getSettings().sampleRate });
      const source = ctx.createMediaStreamSource(new MediaStream([track]));
      node = ctx.createScriptProcessor(4096, 2, 2);
      node.onaudioprocess = (e) => {
        const b = e.inputBuffer;
        const data = new Float32Array(b.length * b.numberOfChannels);
        for (let c = 0; c < b.numberOfChannels; c++) data.set(b.getChannelData(c), c * b.length);
        ctl.enqueue(
          new AudioData({
            format: 'f32-planar',
            sampleRate: b.sampleRate,
            numberOfFrames: b.length,
            numberOfChannels: b.numberOfChannels,
            timestamp: Math.round(e.playbackTime * 1e6),
            data,
          }),
        );
      };
      source.connect(node);
      node.connect(ctx.destination); // needed for the node to run. It outputs silence.
      await ctx.resume();
    },
    cancel() {
      node?.disconnect();
      void ctx?.close();
    },
  });
}

class TrackProcessor {
  static isPolyfill = true;
  readable: ReadableStream<Frame>;
  constructor({ track }: { track: MediaStreamTrack }) {
    this.readable = track.kind === 'video' ? videoFrames(track) : audioFrames(track);
  }
}

const g = globalThis as unknown as { MediaStreamTrackProcessor?: unknown };
if (!g.MediaStreamTrackProcessor && typeof VideoFrame !== 'undefined' && typeof AudioData !== 'undefined') {
  g.MediaStreamTrackProcessor = TrackProcessor;
}
