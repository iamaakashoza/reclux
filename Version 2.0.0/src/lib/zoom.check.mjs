// Runnable check for zoom.ts (no test framework): node src/lib/zoom.check.mjs
import assert from 'node:assert/strict';
import { autoZoom, zoomAt } from './zoom.ts';

const path = (from, to, at) =>
  Array.from({ length: Math.round((to - from) * 20) }, (_, i) => {
    const t = from + i / 20;
    const [x, y] = at(t);
    return { t, x, y };
  });

// 1. Working in the top-left for 3 s, still for 4 s, then working bottom-right for 2 s → two zooms.
const pts = [
  ...path(1, 4, (t) => [0.2 + 0.02 * Math.sin(t * 5), 0.2 + 0.02 * Math.cos(t * 5)]),
  ...path(8, 10, (t) => [0.8 + 0.02 * Math.sin(t * 5), 0.85]),
];
const z = autoZoom(pts, 12);
assert.equal(z.length, 2, 'two separate areas give two zooms');
assert.ok(z[0].start < 1 && z[0].end > 4 && z[0].end <= 5.6, 'first zoom covers the work and ends after it stops');
assert.ok(z[1].x > 0.6 && z[1].y > 0.6, 'second zoom is bottom-right');
// Clamped: a 1.6x view centred near a corner must not show past the edge.
assert.ok(z[1].y <= 1 - 0.5 / 1.6 + 1e-9, 'centre is kept inside the video');

// 2. A still cursor never zooms; a short flick (< 1 s) is not worth a zoom.
assert.equal(autoZoom(path(0, 5, () => [0.5, 0.5]), 6).length, 0, 'no movement, no zoom');
assert.equal(autoZoom(path(2, 2.5, (t) => [t / 10, 0.5]), 6).length, 0, 'half a second is too short');

// 3. Easing: 1 outside, full scale in the middle, in between at the edges.
const one = autoZoom(path(1, 5, (t) => [0.4 + 0.01 * Math.sin(t * 9), 0.5]), 10)[0];
assert.equal(zoomAt([one], 0.1).scale, 1);
assert.ok(Math.abs(zoomAt([one], 3).scale - one.scale) < 1e-9);
const edge = zoomAt([one], one.start + 0.25).scale;
assert.ok(edge > 1 && edge < one.scale, 'eases in');

console.log('zoom.ts: all checks passed');
