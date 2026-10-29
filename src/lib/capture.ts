// Real capture helpers: screen picker and audio mixing. Built-in browser APIs only.
import type { Preset } from './presets';

export type Format = 'mp4' | 'webm';

export interface Capture {
  stream: MediaStream;
  video: MediaStreamTrack;
  /** Size and fps the browser says it delivers. A report, not a measurement. */
  actual: string;
  notices: string[];
  setMuted(muted: boolean): void;
  /** Ask the browser to deliver fewer frames, without restarting the recording. */
  setFps(fps: number): Promise<void>;
  close(): void;
}

/** Must be called straight from a click, so the browser allows the picker and audio. */
export async function openCapture(
  p: Preset,
  surface: 'browser' | 'window' | 'monitor',
  wantMic: boolean,
  wantSystem: boolean,
): Promise<Capture> {
  const ctx = new AudioContext(); // created before any await, inside the click
  let display: MediaStream | undefined;
  let mic: MediaStream | undefined;
  try {
    display = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: surface, // only a hint for the picker
        width: { ideal: p.height === 720 ? 1280 : 1920 },
        height: { ideal: p.height },
        frameRate: { ideal: p.fps },
      } as MediaTrackConstraints,
      audio: wantSystem,
    });

    const notices: string[] = [];
    const system = display.getAudioTracks();
    if (wantSystem && !system.length) {
      notices.push('No system audio was shared. Next time, tick “Also share audio” in the picker.');
    }
    if (wantMic) {
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        notices.push('Microphone is blocked, so Reclux is recording without it.');
      }
    }

    // One mixed audio track, so every player hears both sources.
    const stream = new MediaStream(display.getVideoTracks());
    let micGain: GainNode | undefined;
    if (system.length || mic) {
      await ctx.resume();
      const out = ctx.createMediaStreamDestination();
      if (system.length) ctx.createMediaStreamSource(new MediaStream(system)).connect(out);
      if (mic) {
        micGain = ctx.createGain();
        ctx.createMediaStreamSource(mic).connect(micGain).connect(out);
      }
      out.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    }

    const video = display.getVideoTracks()[0]!;
    const shown = display;
    const shownMic = mic;
    return {
      stream,
      video,
      // Read live, so it stays right after the frame rate is lowered.
      get actual() {
        const s = video.getSettings();
        return `${s.width}×${s.height} · ${Math.round(s.frameRate ?? 0)} fps`;
      },
      notices,
      setMuted: (muted) => {
        if (micGain) micGain.gain.value = muted ? 0 : 1;
      },
      setFps: (fps) => video.applyConstraints({ frameRate: { ideal: fps } }),
      close: () => {
        shown.getTracks().forEach((t) => t.stop());
        shownMic?.getTracks().forEach((t) => t.stop());
        void ctx.close();
      },
    };
  } catch (e) {
    display?.getTracks().forEach((t) => t.stop());
    mic?.getTracks().forEach((t) => t.stop());
    void ctx.close();
    throw e;
  }
}
