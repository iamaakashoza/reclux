// Runs on the browser's audio thread. Hands the mixed sound (capture.ts) straight to the encoder worker
// (encoder.worker.ts) in blocks of about 20 ms, so the sound never waits on a busy page (report §45).
// Plain JavaScript in public/: loaded as a file of its own (audioWorklet.addModule), which the extension's security
// rules require (the build would otherwise inline it, and inline code is blocked).
const BLOCK = 1024; // sample frames per message

class Tap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.out = undefined; // the encoder worker's port, sent by recorder.ts
    this.port.onmessage = (e) => (this.out = e.data);
    this.fill = 0;
    this.buf = new Float32Array(2 * BLOCK); // left channel, then right channel
  }

  process(inputs) {
    const input = inputs[0];
    if (!this.out) return true;
    const n = input[0]?.length ?? 128;
    for (let c = 0; c < 2; c++) {
      // Nothing connected yet (or a gap) is silence.
      const ch = input[c] ?? input[0];
      if (ch) this.buf.set(ch, c * BLOCK + this.fill);
      else this.buf.fill(0, c * BLOCK + this.fill, c * BLOCK + this.fill + n);
    }
    this.fill += n;
    if (this.fill >= BLOCK) {
      this.out.postMessage({ data: this.buf, frames: this.fill, rate: sampleRate }, [this.buf.buffer]);
      this.buf = new Float32Array(2 * BLOCK);
      this.fill = 0;
    }
    return true; // keep running, it only listens (its output is silence)
  }
}

registerProcessor('reclux-tap', Tap);
