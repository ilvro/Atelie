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
