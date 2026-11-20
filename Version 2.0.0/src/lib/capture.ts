// Real capture helpers: screen picker and audio mixing. Built-in browser APIs only.
import type { Preset } from './presets';

export type Format = 'mp4' | 'webm';

// Ducking: system sound drops to 20% while the mic hears speech, and the voice stays at 100%.
// When speech stops it glides back to 100%. Only the recording changes, not what you hear on the speakers.
const DUCK_LEVEL = 0.2;
// Speech = louder than the quietest thing heard lately, and not just tiny. Mics differ a lot in level, and
// speakers can leak into the mic as a steady sound, so one fixed threshold cannot work for everyone.
const VOICE_MIN_RMS = 0.004; // ponytail: starting guesses, tune on real mics
const VOICE_OVER_NOISE = 3;
const NOISE_RISE = 0.002; // per tick, so a long sentence is not mistaken for noise
const NOISE_FALL = 0.2;
const HOLD_MS = 500; // stay ducked through the short gaps between words
// Time constants: drops fast so the first word is clear, comes back slowly (about 1.5 s) so it does not jump.
const DOWN_SECONDS = 0.05;
const UP_SECONDS = 0.5;

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

/** The webcam failed: say why, so the user knows what to do (Firefox, Issue 8d: the circle silently stayed away). */
const cameraProblem = (e: DOMException) =>
  e?.name === 'NotReadableError' || e?.name === 'AbortError'
    ? 'Webcam is busy: another app or browser is using it. Close it there, then start again.'
    : e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError'
      ? 'No webcam found.'
      : 'Webcam is blocked for Reclux. Allow the camera in the browser’s site settings, then start again.';

/** Must be called straight from a click, so the browser allows the picker and audio. */
export async function openCapture(
  p: Preset,
  wantMic: boolean,
  wantSystem: boolean,
  wantCamera: boolean,
  onDuck: (ducked: boolean) => void,
) {
  const ctx = new AudioContext(); // created before any await, inside the click
  // Sharing a tab or window normally jumps to it at once. Stay on the Reclux tab instead, so the countdown is seen
  // there; Reclux brings the user's page back when recording begins (Chromium; other browsers do not jump).
  const Controller = (globalThis as { CaptureController?: new () => object }).CaptureController;
  const controller = Controller ? new Controller() : undefined;
  let display: MediaStream | undefined;
  let mic: MediaStream | undefined;
  let camera: MediaStream | undefined;
  try {
    display = await navigator.mediaDevices.getDisplayMedia({
      video: {
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
      selfBrowserSurface: 'exclude', // recording the recorder page itself is never useful
      ...(controller ? { controller } : {}),
    } as DisplayMediaStreamOptions);
    try {
      (controller as unknown as { setFocusBehavior?: (b: string) => void })?.setFocusBehavior?.('no-focus-change');
    } catch {} // a whole screen has nothing to jump to

    const notices: string[] = [];
    const system = display.getAudioTracks();
    if (wantSystem && !system.length) {
      notices.push('No system audio was shared. Next time, turn on the audio switch in the browser’s sharing window.');
    }
    // Mic and camera in one request, so the browser asks once. If that fails, try each alone,
    // so a blocked camera does not also lose the mic.
    const MIC = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    const CAM = { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' };
    const ask = (c: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(c);
    let cameraError = '';
    if (wantMic || wantCamera) {
      try {
        const both = await ask({ audio: wantMic && MIC, video: wantCamera && CAM });
        if (wantMic) mic = new MediaStream(both.getAudioTracks());
        if (wantCamera) camera = new MediaStream(both.getVideoTracks());
      } catch {
        if (wantMic) mic = await ask({ audio: MIC }).catch(() => undefined);
        if (wantCamera) camera = await ask({ video: CAM }).catch((e: DOMException) => void (cameraError = cameraProblem(e)));
      }
      if (wantMic && !mic) notices.push('Microphone is blocked, so Reclux is recording without it.');
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
    return {
      stream,
      video,
      /** The webcam (to ask permission once, and for the circle in the floating window). */
      camera,
      /** Why the webcam did not start, in plain words ('' when it did or was not wanted). */
      cameraError,
      /** True when system sound dips while the mic hears speech (both must be on). */
      ducks: !!stopDucking,
      notices,
      setMuted: (muted: boolean) => {
        if (micGain) micGain.gain.value = muted ? 0 : 1;
      },
      close: () => {
        stopDucking?.();
        display?.getTracks().forEach((t) => t.stop());
        mic?.getTracks().forEach((t) => t.stop());
        camera?.getTracks().forEach((t) => t.stop());
        void ctx.close();
      },
    };
  } catch (e) {
    display?.getTracks().forEach((t) => t.stop());
    mic?.getTracks().forEach((t) => t.stop());
    camera?.getTracks().forEach((t) => t.stop());
    void ctx.close();
    throw e;
  }
}

export type Capture = Awaited<ReturnType<typeof openCapture>>;
