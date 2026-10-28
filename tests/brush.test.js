import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStroke, denormalizeStroke, appendStroke, strokesOf, pressureFactor, thinPoints, pointsError, MAX_PATH_POINTS } from '../src/domain/brush.js';
import { createHandout, shapeLayer, addLayer, validateHandout } from '../src/domain/handouts.js';
import { drawPathShape } from '../src/render/handout-path.js';

const strokeLayer = (points, width = 4) => {
  const n = normalizeStroke(points, width);
  return shapeLayer({ name: 'Pincel', ...n.box, shape: { type: 'path', fill: null, stroke: '#aa0000', strokeWidth: width, points: n.points } });
};

test('normalizeStroke: box grown by the stroke width, points inside 0–1, round trip back to page space', () => {
  const pts = [[100, 200, 0.5], [160, 230, 0.7], [220, 210, 0.3]];
  const { box, points } = normalizeStroke(pts, 6);
  assert.deepEqual(box, { x: 94, y: 194, width: 132, height: 42 });
  for (const p of points) {
    assert.ok(p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1);
  }
  const layer = shapeLayer({ ...box, shape: { type: 'path', fill: null, stroke: '#000000', strokeWidth: 6, points } });
  const back = denormalizeStroke(layer);
  back.forEach((p, i) => {
    assert.ok(Math.abs(p[0] - pts[i][0]) < 0.05 && Math.abs(p[1] - pts[i][1]) < 0.05);
  });
});

test('normalizeStroke: a straight horizontal stroke still gets a box with height', () => {
  const { box } = normalizeStroke([[10, 50], [90, 50]], 4);
  assert.ok(box.height > 0 && box.width > 0);
  assert.equal(normalizeStroke([], 4), null);
});

test('appendStroke joins a second stroke to the layer with a separator, keeping both', () => {
  const layer = strokeLayer([[0, 0], [50, 50]]);
  const joined = appendStroke(layer, [[200, 10], [260, 80]]);
  assert.equal(strokesOf(joined.points).length, 2);
  assert.ok(joined.box.x <= layer.x && joined.box.width > layer.width);
  assert.equal(joined.points.filter(p => p === null).length, 1);
});

test('pressure: the mouse (0.5) gives exactly the chosen width; the extremes are bounded', () => {
  assert.equal(pressureFactor(0.5), 1);
  assert.equal(pressureFactor(undefined), 1);
  assert.equal(pressureFactor(1), 2);
  assert.equal(pressureFactor(0), 0.2);
});

test('thinPoints drops near-duplicates but keeps the last point', () => {
  const out = thinPoints([[0, 0], [0.5, 0], [1, 0], [10, 0], [10.2, 0]], 2);
  assert.deepEqual(out.map(p => p[0]), [0, 10, 10.2]);
});

test('path shape validation: accepts good data, rejects bad points and more than 20 000', () => {
  const base = createHandout({ name: 'P' });
  const good = strokeLayer([[10, 10], [80, 40], [150, 20]]);
  assert.doesNotThrow(() => validateHandout(addLayer(base, good, 1)));
  assert.equal(pointsError(good.shape.points), null);

  assert.match(pointsError([[2, 0.5]]), /entre 0 e 1/);
  assert.match(pointsError([['a', 1]]), /\[x, y/);
  assert.match(pointsError([]), /ao menos um/);
  assert.match(pointsError(Array.from({ length: MAX_PATH_POINTS + 1 }, () => [0.5, 0.5])), /20000/);
  assert.equal(pointsError(Array.from({ length: MAX_PATH_POINTS }, () => [0.5, 0.5])), null);

  const bad = structuredClone(good);
  bad.shape.points = [[0.1, 5]];
  assert.throws(() => validateHandout(addLayer(base, bad, 1)), /points/);
  const noPoints = structuredClone(good);
  delete noPoints.shape.points;
  assert.throws(() => validateHandout(addLayer(base, noPoints, 1)), /points/);
});

test('drawPathShape: one curve per segment, width follows pressure, dots for single points', () => {
  const calls = [];
  const ctx = {
    beginPath() {}, moveTo() {}, arc: (...a) => calls.push(['arc', a[2]]), fill() {},
    quadraticCurveTo() {}, stroke() { calls.push(['stroke', ctx.lineWidth]); }, setLineDash() {},
  };
  drawPathShape(ctx, { stroke: '#000', strokeWidth: 10, points: [[0, 0, 0.5], [0.5, 0.5, 1], [1, 1, 0.5]] }, 100, 100, 1);
  assert.deepEqual(calls.map(c => c[0]), ['stroke', 'stroke']);
  assert.deepEqual(calls.map(c => c[1]), [20, 10], 'pressure 1 doubles the width, 0.5 keeps it');

  calls.length = 0;
  drawPathShape(ctx, { stroke: '#000', strokeWidth: 10, points: [[0.5, 0.5, 0.5]] }, 100, 100, 1);
  assert.deepEqual(calls, [['arc', 5]]);

  calls.length = 0;
  drawPathShape(ctx, { stroke: null, strokeWidth: 10, points: [[0, 0], [1, 1]] }, 100, 100, 1);
  assert.equal(calls.length, 0, 'no ink colour, nothing drawn');
});

// --- Brush tips (Phase 1) ---
import { BRUSH_KINDS, brushError, newBrushSeed } from '../src/domain/brush.js';
import { varyLayer } from '../src/domain/handouts.js';
import { brushCoverage, sampleStroke } from '../src/render/brush-raster.js';

const wave = (n = 40) => Array.from({ length: n }, (_, i) => [i / (n - 1), 0.5 + 0.25 * Math.sin(i / 5), 0.5]);
const tipShape = (kind, extra = {}) => ({
  type: 'path', fill: null, stroke: '#222222', strokeWidth: 12, points: wave(),
  brush: { kind, grain: 0.5, seed: 4821 }, ...extra,
});
const covered = cov => cov.data.reduce((n, a) => n + (a > 0 ? 1 : 0), 0);

test('brush validation: kinds, grain 0–1 and integer seed; no brush stays valid', () => {
  const base = createHandout({ name: 'B' });
  const plain = strokeLayer([[10, 10], [80, 40]]);
  assert.doesNotThrow(() => validateHandout(addLayer(base, plain, 1)), 'a path without brush is a pen');
  for (const k of BRUSH_KINDS) {
    const l = structuredClone(plain);
    l.shape.brush = { kind: k.id, grain: 0.3, seed: 12 };
    assert.doesNotThrow(() => validateHandout(addLayer(base, l, 1)), k.id);
  }
  assert.equal(BRUSH_KINDS.length, 6);
  for (const bad of [{ kind: 'spray', grain: 0.5, seed: 1 }, { kind: 'chalk', grain: 2, seed: 1 }, { kind: 'chalk', grain: -0.1, seed: 1 }, { kind: 'chalk', grain: 0.5, seed: 1.5 }, { kind: 'chalk', grain: 0.5 }, null, 'chalk']) {
    const l = structuredClone(plain);
    l.shape.brush = bad;
    assert.throws(() => validateHandout(addLayer(base, l, 1)), /brush/, JSON.stringify(bad));
  }
  assert.equal(brushError({ kind: 'pen', grain: 0, seed: 3 }), null);
  const s = newBrushSeed(() => 0.5);
  assert.ok(Number.isInteger(s) && s >= 1);
});

test('varyLayer gives a brush stroke a new seed; appendStroke keeps the brush of the layer', () => {
  const layer = strokeLayer([[0, 0], [50, 50]]);
  layer.shape.brush = { kind: 'chalk', grain: 0.4, seed: 10 };
  const patch = varyLayer(layer, () => 0.25);
  assert.equal(patch.shape.brush.kind, 'chalk');
  assert.equal(patch.shape.brush.grain, 0.4);
  assert.notEqual(patch.shape.brush.seed, 10);
  assert.equal(varyLayer(strokeLayer([[0, 0], [5, 5]]), () => 0.25).shape, undefined, 'a plain pen has nothing to vary');

  const joined = appendStroke(layer, [[200, 10], [260, 80]]);
  const next = { ...layer.shape, points: joined.points };
  assert.deepEqual(next.brush, layer.shape.brush);
});

test('textured tips: same seed → same pixels, other seed → other pixels', () => {
  for (const kind of ['pencil', 'chalk', 'drybrush']) {
    const a = brushCoverage(tipShape(kind), 300, 120, 1);
    const b = brushCoverage(tipShape(kind), 300, 120, 1);
    const c = brushCoverage(tipShape(kind, { brush: { kind, grain: 0.5, seed: 99 } }), 300, 120, 1);
    assert.deepEqual(a.data, b.data, `${kind}: deterministic`);
    assert.notDeepEqual(a.data, c.data, `${kind}: the seed changes the grain`);
  }
});

test('pencil covers less than the pen line; more grain covers less', () => {
  const solid = brushCoverage(tipShape('marker', { brush: { kind: 'marker', grain: 0, seed: 1 }, strokeWidth: 12 }), 300, 120, 1);
  const pencil = brushCoverage(tipShape('pencil'), 300, 120, 1);
  const full = brushCoverage(tipShape('pencil', { brush: { kind: 'pencil', grain: 0, seed: 4821 } }), 300, 120, 1);
  const rough = brushCoverage(tipShape('pencil', { brush: { kind: 'pencil', grain: 1, seed: 4821 } }), 300, 120, 1);
  const sum = c => c.data.reduce((n, a) => n + a, 0);
  assert.ok(covered(pencil) > 0);
  assert.ok(sum(pencil) < sum(full), 'grain removes ink');
  assert.ok(sum(rough) < sum(pencil), 'more grain removes more');
  assert.ok(sum(pencil) < sum(solid), 'the pencil leaves paper showing');
});

test('light pressure makes the pencil lighter, not only thinner', () => {
  const lightPts = wave().map(p => [p[0], p[1], 0.2]);
  const hardPts = wave().map(p => [p[0], p[1], 0.8]);
  const peak = pts => Math.max(...brushCoverage(tipShape('pencil', { points: pts, brush: { kind: 'pencil', grain: 0, seed: 1 } }), 300, 120, 1).data);
  assert.ok(peak(lightPts) < peak(hardPts) - 40);
});

test('marker: crossing its own stroke does not darken the crossing', () => {
  const cross = [[0.1, 0.5, 0.5], [0.9, 0.5, 0.5], null, [0.5, 0.1, 0.5], [0.5, 0.9, 0.5]];
  const cov = brushCoverage({ type: 'path', stroke: '#f2d23c', strokeWidth: 20, points: cross, brush: { kind: 'marker', grain: 0, seed: 3 } }, 200, 200, 1);
  assert.equal(cov.data[100 * 200 + 100], 255, 'the crossing is as strong as the rest');
  assert.equal(cov.data[100 * 200 + 60], 255);
  assert.equal(Math.max(...cov.data), 255);
});

test('nib: wide across the nib angle, thin along it', () => {
  const along = (angle) => {
    const dx = Math.cos(angle) * 0.4;
    const dy = Math.sin(angle) * 0.4;
    const pts = [[0.5 - dx, 0.5 - dy, 0.5], [0.5 + dx, 0.5 + dy, 0.5]];
    const cov = brushCoverage({ type: 'path', stroke: '#000000', strokeWidth: 16, points: pts, brush: { kind: 'nib', grain: 0, seed: 1 } }, 240, 240, 1);
    return cov.data.reduce((n, a) => n + a, 0) / 255 / (Math.hypot(dx, dy) * 2 * 240);
  };
  const across = along((50 * Math.PI) / 180); // perpendicular to the -40° nib
  const parallel = along((-40 * Math.PI) / 180);
  assert.ok(across > parallel * 4, `across ${across.toFixed(1)} vs along ${parallel.toFixed(1)}`);
  assert.ok(parallel >= 0.8, 'never thinner than the minimum');
});

test('grain size is in page pixels: the same stroke at 2× scale has the same grain, only sharper', () => {
  const small = brushCoverage(tipShape('chalk'), 300, 120, 1);
  const big = brushCoverage(tipShape('chalk', { strokeWidth: 12 }), 600, 240, 2);
  const ratio = covered(big) / covered(small);
  assert.ok(ratio > 3.4 && ratio < 4.6, `coverage grows with area (${ratio.toFixed(2)})`);
});

test('drawPathShape without a canvas falls back to the smooth line; huge boxes are not rasterized', () => {
  const calls = [];
  const ctx = { beginPath() {}, moveTo() {}, arc() {}, fill() {}, quadraticCurveTo() {}, stroke() { calls.push('stroke'); }, setLineDash() {}, drawImage() { calls.push('image'); } };
  drawPathShape(ctx, tipShape('chalk'), 300, 120, 1);
  assert.ok(calls.length > 0 && calls.every(c => c === 'stroke'));
  assert.equal(brushCoverage(tipShape('chalk'), 8000, 8000, 1), null);
  assert.equal(brushCoverage(tipShape('pen'), 300, 120, 1), null);
  assert.ok(sampleStroke([[0, 0, 0.5], [30, 0, 0.5]], 1).x.length >= 30);
});

// --- Properties of a brush stroke (Phase 2) ---
import { growBoxForWidth } from '../src/domain/brush.js';

test('growBoxForWidth: a wider stroke gets room around the same centre, points stay put on the page', () => {
  const layer = strokeLayer([[100, 200], [160, 230], [220, 210]], 6);
  const patch = growBoxForWidth(layer, 40);
  assert.ok(patch);
  assert.equal(patch.x + patch.width / 2, layer.x + layer.width / 2, 'same centre');
  assert.equal(patch.y + patch.height / 2, layer.y + layer.height / 2);
  const grown = { ...layer, ...patch, shape: { ...layer.shape, strokeWidth: 40, points: patch.points } };
  const before = denormalizeStroke(layer);
  denormalizeStroke(grown).forEach((p, i) => {
    assert.ok(Math.abs(p[0] - before[i][0]) < 0.1 && Math.abs(p[1] - before[i][1]) < 0.1);
  });
  assert.equal(pointsError(patch.points), null, 'points stay in 0–1');
  assert.equal(growBoxForWidth(layer, 4), null, 'a thinner stroke needs nothing');
  assert.equal(growBoxForWidth(shapeLayer({ shape: { type: 'rect' } }), 50), null, 'only paths');
});

// --- Stabilizer (Phase 3) ---
import { stabilize, stabilizerRadius } from '../src/domain/brush.js';

test('stabilize: radius 0 is the identity; inside the rope the brush stays; outside it walks the excess', () => {
  assert.deepEqual(stabilize([0, 0], [7, 3], 0), [7, 3]);
  assert.deepEqual(stabilize([5, 5], [8, 9], 5), [5, 5], 'distance 5 is inside a rope of 5');
  assert.deepEqual(stabilize([5, 5], [6, 6], 10), [5, 5]);
  const [x, y] = stabilize([0, 0], [10, 0], 4);
  assert.ok(Math.abs(x - 6) < 1e-9 && y === 0, 'walked 10 − 4');
  const diag = stabilize([0, 0], [30, 40], 10);
  assert.ok(Math.abs(Math.hypot(30 - diag[0], 40 - diag[1]) - 10) < 1e-9, 'always ends exactly one rope away');
  assert.equal(stabilizerRadius(0, 2), 0);
  assert.equal(stabilizerRadius(100, 1), 30);
  assert.equal(stabilizerRadius(100, 2), 15, 'zoomed in, the same screen rope is shorter on the page');
});

test('stabilize: a zigzag comes out with a smaller amplitude and ends one rope from the cursor', () => {
  const cursor = Array.from({ length: 60 }, (_, i) => [i * 4, i % 2 ? 12 : -12]);
  const run = radius => {
    let brush = cursor[0];
    return cursor.map(c => (brush = stabilize(brush, c, radius)));
  };
  const amplitude = pts => Math.max(...pts.slice(10).map(p => p[1])) - Math.min(...pts.slice(10).map(p => p[1]));
  assert.equal(amplitude(run(0)), 24);
  assert.ok(amplitude(run(30)) < 6, `smoothed amplitude ${amplitude(run(30)).toFixed(1)}`);
  const last = run(30).at(-1);
  assert.ok(Math.hypot(cursor.at(-1)[0] - last[0], cursor.at(-1)[1] - last[1]) <= 30 + 1e-9);
});
