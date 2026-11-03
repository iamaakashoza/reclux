// Real capture helpers: screen picker and audio mixing. Built-in browser APIs only.
import type { Preset } from './presets';

export type Format = 'mp4' | 'webm';

// Ducking: system sound drops to 48% while the mic hears speech, and the voice stays at 100%.
// Only the recording changes, not what you hear on the speakers.
const DUCK_LEVEL = 0.48;
// Speech = louder than the quietest thing heard lately, and not just tiny. Mics differ a lot in level, and
// speakers can leak into the mic as a steady sound, so one fixed threshold cannot work for everyone.
const VOICE_MIN_RMS = 0.004; // ponytail: starting guesses, tune on real mics
const VOICE_OVER_NOISE = 3;
const NOISE_RISE = 0.002; // per tick, so a long sentence is not mistaken for noise
const NOISE_FALL = 0.2;
const HOLD_MS = 500; // stay ducked through the short gaps between words
const DOWN_SECONDS = 0.05;
const UP_SECONDS = 0.25;

function duckWhileSpeaking(ctx: AudioContext, voice: AudioNode, level: AudioParam, onDuck: (ducked: boolean) => void) {
  const band = ctx.createBiquadFilter(); // listen where speech lives, not to hum or hiss
  band.type = 'bandpass';
  band.frequency.value = 1000;
  band.Q.value = 0.7;
  const meter = ctx.createAnalyser();
  meter.fftSize = 2048;
  voice.connect(band).connect(meter); // after the mute switch, so a muted mic never ducks
  const samples = new Float32Array(meter.fftSize);
  let noise = 0;
  let lastHeard = -Infinity;
  let ducked = false;
  // A worker clock, because a hidden tab slows page timers to once a second.
  const ticker = new Worker(new URL('./ticker.worker.ts', import.meta.url), { type: 'module' });
  ticker.onmessage = () => {
    meter.getFloatTimeDomainData(samples);
    const rms = Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
    const now = performance.now();
    if (rms > Math.max(VOICE_MIN_RMS, noise * VOICE_OVER_NOISE)) lastHeard = now;
    noise += (rms - noise) * (rms < noise ? NOISE_FALL : NOISE_RISE);
    const speaking = now - lastHeard < HOLD_MS;
    if (speaking === ducked) return;
    ducked = speaking;
    level.setTargetAtTime(speaking ? DUCK_LEVEL : 1, ctx.currentTime, speaking ? DOWN_SECONDS : UP_SECONDS);
    onDuck(speaking);
  };
  ticker.postMessage(50);
  return () => ticker.terminate();
}

/** Must be called straight from a click, so the browser allows the picker and audio. */
export async function openCapture(
  p: Preset,
  surface: 'browser' | 'window' | 'monitor',
  wantMic: boolean,
  wantSystem: boolean,
  onDuck: (ducked: boolean) => void,
) {
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
      // Raw sound, still playing on the speakers. This is only a request: the browser's own switch has the
      // final say, and no page can tick it for the user (a privacy rule). Asked for no sound, the switch is hidden.
      audio: wantSystem
        ? ({ echoCancellation: false, noiseSuppression: false, autoGainControl: false, suppressLocalAudioPlayback: false } as MediaTrackConstraints)
        : false,
      systemAudio: wantSystem ? 'include' : 'exclude',
      selfBrowserSurface: 'exclude', // recording the recorder page itself is never useful, and the setup hint relies on this
    } as DisplayMediaStreamOptions);

    const notices: string[] = [];
    const system = display.getAudioTracks();
    if (wantSystem && !system.length) {
      notices.push('No system audio was shared. Next time, turn on the audio switch in the browser’s sharing window.');
    }
    if (wantMic) {
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch {
        notices.push('Microphone is blocked, so Reclux is recording without it.');
      }
    }
    // With no system audio the mic is the only way sound gets in, and it can hear the speakers.
    if (!system.length && mic) {
      notices.push('System audio is off, but your microphone can still pick up sound from your speakers. Use headphones to keep it out.');
    }

    // One mixed audio track, so every player hears both sources.
    const stream = new MediaStream(display.getVideoTracks());
    let micGain: GainNode | undefined;
    let stopDucking: (() => void) | undefined;
    if (system.length || mic) {
      await ctx.resume();
      const out = ctx.createMediaStreamDestination();
      const systemGain = ctx.createGain();
      if (system.length) ctx.createMediaStreamSource(new MediaStream(system)).connect(systemGain).connect(out);
      if (mic) {
        micGain = ctx.createGain();
        ctx.createMediaStreamSource(mic).connect(micGain).connect(out);
        if (system.length) stopDucking = duckWhileSpeaking(ctx, micGain, systemGain.gain, onDuck);
      }
      out.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    }

    const video = display.getVideoTracks()[0]!;
    const shown = display;
    const shownMic = mic;
    return {
      stream,
      video,
      /** Size and fps the browser says it delivers. A report, not a measurement. Read live, so it stays right after the frame rate is lowered. */
      get actual() {
        const s = video.getSettings();
        return `${s.width}×${s.height} · ${Math.round(s.frameRate ?? 0)} fps`;
      },
      /** True when system sound dips while the mic hears speech (both must be on). */
      ducks: !!stopDucking,
      notices,
      setMuted: (muted: boolean) => {
        if (micGain) micGain.gain.value = muted ? 0 : 1;
      },
      /** Ask the browser to deliver fewer frames, without restarting the recording. */
      setFps: (fps: number) => video.applyConstraints({ frameRate: { ideal: fps } }),
      close: () => {
        stopDucking?.();
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

export type Capture = Awaited<ReturnType<typeof openCapture>>;
