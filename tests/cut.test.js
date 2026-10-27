import test from 'node:test';
import assert from 'node:assert/strict';
import { splitByLine, smallerPart, polygonArea, pointToUnit, lassoRemove, cornerTear, nearestCorner, flameRadius, cutEffect, cutError, cutHash } from '../src/domain/cut.js';
import { createHandout, effectLayer, addLayer, validateHandout } from '../src/domain/handouts.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('splitByLine: a line across the sheet gives two parts that add up to the whole', () => {
  const box = { width: 100, height: 200 };
  const r = splitByLine(box, [[0, 50], [100, 50]]);
  assert.ok(r);
  assert.ok(near(r.areaA + r.areaB, 20000));
  assert.ok(near(Math.min(r.areaA, r.areaB), 5000));
  assert.equal(polygonArea(r.a), r.areaA);
  assert.equal(smallerPart(r), r.areaA <= r.areaB ? 'a' : 'b');

  const diagonal = splitByLine(box, [[0, 0], [100, 200]]);
  assert.ok(near(diagonal.areaA, 10000) && near(diagonal.areaB, 10000));
});

test('splitByLine: a line outside the sheet, or shaving less than 1 %, does not split it', () => {
  const box = { width: 100, height: 100 };
  assert.equal(splitByLine(box, [[0, 200], [100, 200]]), null);
  assert.equal(splitByLine(box, [[0, 0.5], [100, 0.5]]), null);
  assert.ok(splitByLine(box, [[0, 5], [100, 5]]));
});

test('pointToUnit follows a rotated layer box', () => {
  const box = { x: 100, y: 100, width: 200, height: 100, rotation: 0 };
  assert.deepEqual(pointToUnit([200, 150], box).map(n => Math.round(n * 1000) / 1000), [0.5, 0.5]);
  assert.deepEqual(pointToUnit([100, 100], box), [0, 0]);
  const turned = { ...box, rotation: 90 };
  // 90° turn about (200,150): the box's local top-left (0,0) lands at (250,50)
  const [x, y] = pointToUnit([250, 50], turned);
  assert.ok(near(x, 0, 1e-9) && near(y, 0, 1e-9));
});

test('lasso: removes what is outside the trace (box contour plus lasso, even-odd)', () => {
  const lasso = [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]];
  const remove = lassoRemove(lasso);
  assert.equal(remove.length, 2);
  assert.deepEqual(remove[0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  assert.equal(remove[1], lasso);
});

test('corner tear stays at its corner; nearestCorner picks the closest one', () => {
  let n = 0;
  const rand = () => ((n++ * 0.37) % 1);
  const [tri] = cornerTear('ne', 0.2, rand);
  assert.ok(tri.every(([x, y]) => x >= 0.7 && y <= 0.3), JSON.stringify(tri));
  assert.equal(nearestCorner([0.1, 0.9]), 'sw');
  assert.equal(nearestCorner([0.9, 0.1]), 'ne');
});

test('fire that spreads: grows with time up to a maximum, faster with speed', () => {
  assert.equal(flameRadius(10, 0), 10);
  assert.ok(flameRadius(10, 0.6) > flameRadius(10, 0.3));
  assert.ok(flameRadius(10, 0.4, { speed: 2 }) > flameRadius(10, 0.4, { speed: 1 }));
  assert.equal(flameRadius(10, 100), 40, 'stops at the maximum (4× by default)');
  assert.equal(flameRadius(10, 100, { max: 25 }), 25);
});

test('cut effect validation: limits, unit coordinates, radius and seed', () => {
  const ok = cutEffect({ edge: 'rasgado', remove: [[[0, 0], [1, 0], [0, 1]]], holes: [[[0.5, 0.5, 30]]], seed: 7 });
  assert.equal(cutError(ok, 1240, 1754), null);
  assert.match(cutError({ ...ok, edge: 'serra' }), /edge/);
  assert.match(cutError({ ...ok, seed: 1.5 }), /seed/);
  assert.match(cutError({ ...ok, char: 2 }), /char/);
  assert.match(cutError({ ...ok, remove: [[[0, 0], [1, 1]]] }), /3 pontos/);
  assert.match(cutError({ ...ok, remove: [[[0, 0], [2, 0], [0, 1]]] }), /entre 0 e 1/);
  assert.match(cutError({ ...ok, holes: [[[0.5, 0.5, 5000]]] }, 1240, 1754), /raio/);
  assert.match(cutError({ ...ok, holes: [[[0.5, 0.5]]] }), /raio/);
  const many = Array.from({ length: 20001 }, () => [0.5, 0.5, 4]);
  assert.match(cutError({ ...ok, holes: [many] }), /no máximo 20000/);
});

test('a cut layer is a valid document layer and a bad one is rejected with its path', () => {
  const base = createHandout({ name: 'C' });
  const layer = effectLayer({ name: 'Rasgo', width: base.page.width, height: base.page.height, effect: cutEffect({ edge: 'tesoura', remove: [[[0, 0], [1, 0], [1, 0.4], [0, 0.4]]] }) });
  assert.doesNotThrow(() => validateHandout(addLayer(base, layer, 1)));
  const bad = structuredClone(layer);
  bad.effect.remove = [[[0, 0]]];
  assert.throws(() => validateHandout(addLayer(base, bad, 1)), /effect/);
});

test('cutHash changes with the geometry and not with the seed', () => {
  const a = cutEffect({ remove: [[[0, 0], [1, 0], [1, 1]]], seed: 1 });
  const b = cutEffect({ remove: [[[0, 0], [1, 0], [1, 1]]], seed: 99 });
  const c = cutEffect({ remove: [[[0, 0], [1, 0], [1, 0.9]]], seed: 1 });
  assert.equal(cutHash(a), cutHash(b));
  assert.notEqual(cutHash(a), cutHash(c));
});

test('roughenPolygon: deterministic by seed, different by seed, and each edge has its own character', async () => {
  const { roughenPolygon, cutPolygons, holePolygons } = await import('../src/render/handout-effects.js');
  const line = [[0, 100], [400, 100], [400, 300], [0, 300]];
  const a = roughenPolygon(line, 'rasgado', 5, 1, 0.5);
  const b = roughenPolygon(line, 'rasgado', 5, 1, 0.5);
  const c = roughenPolygon(line, 'rasgado', 6, 1, 0.5);
  assert.deepEqual(a, b, 'same seed, same points');
  assert.notDeepEqual(a, c, 'another seed, another edge');

  const deviation = pts => Math.max(...pts.filter(p => p[0] > 20 && p[0] < 380).map(p => Math.abs(p[1] - 100)).filter((_, i, all) => i < all.length / 2));
  const clean = deviation(roughenPolygon(line, 'tesoura', 1, 1));
  const torn = deviation(roughenPolygon(line, 'rasgado', 1, 1, 1));
  assert.ok(clean <= 0.65, `scissors edge stays within ±0.6 px (was ${clean.toFixed(2)})`);
  assert.ok(torn > clean * 3, 'a torn edge wanders much more');

  const zig = roughenPolygon(line, 'picote', 1, 1);
  const ys = zig.filter(p => p[0] > 20 && p[0] < 380 && Math.abs(p[1] - 100) < 4).map(p => Math.round(p[1] - 100));
  assert.ok(ys.includes(-2) || ys.includes(-3));
  assert.ok(ys.includes(2) || ys.includes(3));

  const eff = cutEffect({ edge: 'queimado', remove: [[[0, 0], [1, 0], [1, 0.3], [0, 0.3]]], holes: [[[0.5, 0.5, 20], [0.7, 0.5, 20]]], seed: 3 });
  const polys = cutPolygons(eff, 500, 500, 1);
  assert.equal(polys.remove.length, 1);
  assert.ok(polys.holes.length >= 2, 'the trail between two points is filled with discs');
  assert.deepEqual(polys, cutPolygons(eff, 500, 500, 1));
  assert.equal(holePolygons([], 100, 100, 1).length, 0);
});
