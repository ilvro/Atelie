import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boxCorners,
  pointInBox,
  moveBox,
  resizeBox,
  rotateBox,
  snapBox,
  layerAtPoint,
} from '../src/editor/geometry.js';

test('1. boxCorners of a box 100 × 50 rotated 90° around center', () => {
  const box = { x: 0, y: 0, width: 100, height: 50, rotation: 90 };
  const corners = boxCorners(box);
  // nw, ne, se, sw
  assert.equal(corners.length, 4);

  // [75, -25], [75, 75], [25, 75], [25, -25]
  assert.ok(Math.abs(corners[0][0] - 75) < 0.001);
  assert.ok(Math.abs(corners[0][1] - (-25)) < 0.001);

  assert.ok(Math.abs(corners[1][0] - 75) < 0.001);
  assert.ok(Math.abs(corners[1][1] - 75) < 0.001);

  assert.ok(Math.abs(corners[2][0] - 25) < 0.001);
  assert.ok(Math.abs(corners[2][1] - 75) < 0.001);

  assert.ok(Math.abs(corners[3][0] - 25) < 0.001);
  assert.ok(Math.abs(corners[3][1] - (-25)) < 0.001);
});

test('2. pointInBox with box rotated 45°: center inside, unrotated corner outside', () => {
  const box = { x: 100, y: 100, width: 100, height: 100, rotation: 45 };
  // Center is (150, 150)
  assert.equal(pointInBox([150, 150], box), true);

  // Unrotated corner is (100, 100)
  // Distance from center is sqrt(50^2 + 50^2) = ~70.7
  // When rotated 45°, (100, 100) lies along local axis at distance 70.7, but half-size is 50.
  assert.equal(pointInBox([100, 100], box), false);
});

test('3. resizeBox by se from (0,0,100,100) to (150,120)', () => {
  const box = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };

  // Free resize
  const r1 = resizeBox(box, 'se', [150, 120]);
  assert.equal(r1.x, 0);
  assert.equal(r1.y, 0);
  assert.equal(r1.width, 150);
  assert.equal(r1.height, 120);

  // keepAspect: deltaW = 50, deltaH = 20 -> larger is width (150) -> height becomes 150
  const r2 = resizeBox(box, 'se', [150, 120], { keepAspect: true });
  assert.equal(r2.x, 0);
  assert.equal(r2.y, 0);
  assert.equal(r2.width, 150);
  assert.equal(r2.height, 150);

  // fromCenter: center (50, 50) stays fixed
  const r3 = resizeBox(box, 'se', [150, 120], { fromCenter: true });
  assert.equal(r3.x + r3.width / 2, 50);
  assert.equal(r3.y + r3.height / 2, 50);
  assert.equal(r3.width, 200); // 2 * |150 - 50|
  assert.equal(r3.height, 140); // 2 * |120 - 50|
});

test('4. resizeBox on a box rotated 90°: opposite anchor stays in same world position', () => {
  const box = { x: 100, y: 100, width: 100, height: 60, rotation: 90 };
  const cornersBefore = boxCorners(box);
  // nw corner is cornersBefore[0]
  const nwWorldBefore = cornersBefore[0];

  // Drag 'se' handle to a new position
  const resized = resizeBox(box, 'se', [300, 300]);
  const cornersAfter = boxCorners(resized);
  const nwWorldAfter = cornersAfter[0];

  assert.ok(Math.abs(nwWorldBefore[0] - nwWorldAfter[0]) < 0.001);
  assert.ok(Math.abs(nwWorldBefore[1] - nwWorldAfter[1]) < 0.001);
});

test('5. rotateBox with pointer to the right of center -> 90°; with snap, 97° becomes 90°', () => {
  const box = { x: 100, y: 100, width: 100, height: 100, rotation: 0 };
  // Center is (150, 150). Pointer to the right of center: (250, 150)
  const deg1 = rotateBox(box, [250, 150]);
  assert.equal(deg1, 90);

  // dx = 100, dy = tan(7°) * 100 = ~12.28 -> total angle ~97°
  const rad7 = (7 * Math.PI) / 180;
  const pointer97 = [150 + 100 * Math.cos(rad7), 150 + 100 * Math.sin(rad7)];
  const degUnsnapped = rotateBox(box, pointer97);
  assert.ok(Math.abs(degUnsnapped - 97) < 0.5);

  const degSnapped = rotateBox(box, pointer97, { snap: true });
  assert.equal(degSnapped, 90);
});

test('6. snapBox with box 4 px from page center and threshold 6 -> snaps; at 8 px, does not', () => {
  const pageWidth = 1000;
  const pageCenter = pageWidth / 2; // 500
  const targets = { x: [pageCenter], y: [] };

  // Box width 100. Center is at x + 50.
  // We want center to be 4 px away from 500, e.g. at 504 -> x = 454
  const box4 = { x: 454, y: 100, width: 100, height: 100, rotation: 0 };
  const res4 = snapBox(box4, targets, 6);
  assert.equal(res4.box.x, 450); // Snapped so center is 500
  assert.equal(res4.guides.length, 1);
  assert.equal(res4.guides[0].axis, 'x');
  assert.equal(res4.guides[0].at, 500);

  // At 8 px away: center at 508 -> x = 458
  const box8 = { x: 458, y: 100, width: 100, height: 100, rotation: 0 };
  const res8 = snapBox(box8, targets, 6);
  assert.equal(res8.box.x, 458); // Not snapped
  assert.equal(res8.guides.length, 0);
});

test('7. layerAtPoint ignores invisible and locked layers and chooses the top one', () => {
  const handout = {
    layers: [
      { id: '1', visible: true, locked: false, x: 0, y: 0, width: 200, height: 200, rotation: 0 },
      { id: '2', visible: false, locked: false, x: 50, y: 50, width: 100, height: 100, rotation: 0 },
      { id: '3', visible: true, locked: true, x: 50, y: 50, width: 100, height: 100, rotation: 0 },
      { id: '4', visible: true, locked: false, x: 60, y: 60, width: 80, height: 80, rotation: 0 },
    ],
  };

  // At (70, 70), layers 1, 2, 3, 4 all cover the point.
  // 4 is visible and unlocked -> should be chosen
  const top = layerAtPoint(handout, [70, 70]);
  assert.equal(top.id, '4');

  // At (55, 55): layer 1, 2, 3 cover it.
  // 3 is locked, 2 is invisible -> layer 1 should be chosen
  const lower = layerAtPoint(handout, [55, 55]);
  assert.equal(lower.id, '1');

  // At (300, 300): outside all layers
  const none = layerAtPoint(handout, [300, 300]);
  assert.equal(none, null);
});


test('rotateBoxBy adds the swept angle to the starting rotation, with 15° snapping', async () => {
  const { rotateBoxBy } = await import('../src/editor/geometry.js');
  const center = [100, 100];
  // Pointer sweeps a quarter turn clockwise (screen coordinates: +y is down)
  assert.equal(rotateBoxBy(0, center, [200, 100], [100, 200]), 90);
  assert.equal(rotateBoxBy(30, center, [200, 100], [100, 200]), 120);
  // Counter-clockwise below zero wraps
  assert.equal(rotateBoxBy(10, center, [200, 100], [100, 0]), 280);
  // No movement keeps the rotation (no fixed +90°)
  assert.equal(rotateBoxBy(37, center, [150, 150], [150, 150]), 37);
  // Shift snaps to multiples of 15
  assert.equal(rotateBoxBy(0, center, [200, 100], [190, 130], { snap: true }) % 15, 0);
});

test('layersAtPoint lists the whole stack topmost first and nextStackedLayer walks down it', async () => {
  const { layersAtPoint, nextStackedLayer } = await import('../src/editor/geometry.js');
  const mk = (id, extra = {}) => ({ id, x: 0, y: 0, width: 100, height: 100, rotation: 0, visible: true, locked: false, ...extra });
  const doc = { layers: [mk('paper'), mk('mid'), mk('hidden', { visible: false }), mk('top'), mk('far', { x: 500 })] };
  const hits = layersAtPoint(doc, [50, 50]);
  assert.deepEqual(hits.map(l => l.id), ['top', 'mid', 'paper']);
  assert.equal(nextStackedLayer(hits, null).id, 'top');
  assert.equal(nextStackedLayer(hits, 'top').id, 'mid');
  assert.equal(nextStackedLayer(hits, 'paper').id, 'top', 'wraps around');
  assert.equal(nextStackedLayer([], 'x'), null);
});
