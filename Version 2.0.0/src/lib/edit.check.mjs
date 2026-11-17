// Runnable check for edit.ts (no test framework): node src/lib/edit.check.mjs
import assert from 'node:assert/strict';
import { clipAt, remove, split, toOutput, toSource, total, trimIn, trimOut, zoomPieces } from './edit.ts';

let c = [{ start: 0, end: 10 }];
c = split(c, 4); // 0–4 | 4–10
assert.deepEqual(c, [{ start: 0, end: 4 }, { start: 4, end: 10 }]);
assert.equal(clipAt(c, 4), 1, 'at a cut, the part after it is current');
assert.equal(split(c, 4), c, 'splitting on a cut does nothing');

c = split(c, 6); // 0–4 | 4–6 | 6–10
c = remove(c, 1); // 0–4 | 6–10
assert.equal(total(c), 8);
assert.equal(toSource(c, 5), 7, 'after the cut, output 5 s is source 7 s');
assert.equal(toOutput(c, 7), 5);
assert.equal(toOutput(c, 5), 4, 'a deleted moment maps to the start of the next part');

c = trimIn(c, 5); // 0–4 | 7–10
assert.deepEqual(c[1], { start: 7, end: 10 });
c = trimOut(c, 2); // 0–2 | 7–10
assert.deepEqual(c, [{ start: 0, end: 2 }, { start: 7, end: 10 }]);
assert.equal(trimIn(c, 2), c, 'Trim In at the start of a part does nothing');
assert.equal(trimOut(c, 5), c, 'Trim Out at the very end does nothing');
assert.equal(remove([{ start: 0, end: 3 }], 0).length, 1, 'the last part cannot be deleted');

// A zoom over 1–8 s shows as two pieces on the edited timeline: 1–2 and 2–3.
assert.deepEqual(zoomPieces(c, { start: 1, end: 8, x: 0.5, y: 0.5, scale: 2 }), [
  { at: 1, len: 1 },
  { at: 2, len: 1 },
]);
console.log('edit.ts: all checks passed');
