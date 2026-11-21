// Runnable check for sound-clock.ts (no test framework): node src/lib/sound-clock.check.mjs
import assert from 'node:assert/strict';
import { SLACK, soundClock, stamp } from './sound-clock.ts';

const DUR = 1024 / 48000;
/** 2 hours of blocks; the sound card runs `ppm` fast (+) or slow (−); `late(i)` = message delay in seconds. */
function run(ppm, late = () => 0.002) {
  const c = soundClock();
  let last = -1;
  let worst = 0;
  let dropped = 0;
  for (let i = 0; i < (2 * 3600) / DUR; i++) {
    const ended = ((i + 1) * DUR) / (1 + ppm * 1e-6); // picture time at which this block's last sample was heard
    const t = stamp(c, ended + late(i), DUR);
    if (t === undefined) {
      dropped++;
      continue;
    }
    assert.ok(t > last, 'timestamps only go forward');
    last = t;
    worst = Math.max(worst, Math.abs(t - (ended - DUR / (1 + ppm * 1e-6))));
  }
  return { worst, dropped };
}

for (const ppm of [0, 50, -50, 100, -100]) {
  const { worst } = run(ppm);
  assert.ok(worst < SLACK + 0.03, `${ppm} ppm: sound stays within ${SLACK + 0.03} s of the picture (was ${worst.toFixed(3)})`);
}
// Without the correction, 50 ppm over 2 hours is 0.36 s.
assert.ok(2 * 3600 * 50e-6 > 0.3);

// A busy moment: messages 0.4 s late for 1 s, every minute. It must not move the sound (no false correction).
const busy = (i) => ((i * DUR) % 60 < 1 ? 0.4 : 0.002);
const { worst, dropped } = run(0, busy);
assert.ok(worst < 0.01, `late messages do not move the sound (was ${worst.toFixed(3)})`);
assert.equal(dropped, 0, 'and nothing is dropped');

console.log('sound-clock.ts: all checks passed');
