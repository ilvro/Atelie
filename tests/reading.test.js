import test from 'node:test';
import assert from 'node:assert/strict';
import { fitPage, neighbors } from '../src/reading/reading-geometry.js';

test('fitPage computes maximum scale within margin, aspect ratio, and centering', () => {
  // A4 portrait (1240 × 1754) in a 1920 × 1080 viewport with 6% margin
  const a4 = { width: 1240, height: 1754 };
  const vp = { width: 1920, height: 1080 };
  const res = fitPage(a4, vp, 0.06);

  // Available height is 1080 * 0.88 = 950.4 px
  // Available width is 1920 * 0.88 = 1689.6 px
  // Height constraint: 950.4 / 1754 ~= 0.5418
  const expectedH = Math.round(1754 * (1080 * 0.88 / 1754));
  assert.equal(res.height, expectedH);
  assert.ok(res.width <= 1920 * 0.88);
  assert.equal(res.x, Math.round((vp.width - res.width) / 2));
  assert.equal(res.y, Math.round((vp.height - res.height) / 2));

  // Landscape page in portrait viewport (constrained by width)
  const landscape = { width: 1754, height: 1240 };
  const portraitVp = { width: 800, height: 1200 };
  const res2 = fitPage(landscape, portraitVp, 0.06);
  const expectedW = Math.round(1754 * (800 * 0.88 / 1754));
  assert.equal(res2.width, expectedW);
  assert.ok(res2.height <= 1200 * 0.88);
  assert.equal(res2.x, Math.round((portraitVp.width - res2.width) / 2));
  assert.equal(res2.y, Math.round((portraitVp.height - res2.height) / 2));

  // Zero or invalid dimensions safe fallback
  assert.deepEqual(fitPage({ width: 0, height: 100 }, vp), { width: 0, height: 0, scale: 1, x: 0, y: 0 });
});

test('neighbors finds circular previous, current, and next in list', () => {
  const items = [
    { id: 'doc-1', name: 'Primeiro' },
    { id: 'doc-2', name: 'Segundo' },
    { id: 'doc-3', name: 'Terceiro' },
  ];

  // Middle item
  const mid = neighbors(items, 'doc-2');
  assert.equal(mid.prev.id, 'doc-1');
  assert.equal(mid.current.id, 'doc-2');
  assert.equal(mid.next.id, 'doc-3');
  assert.equal(mid.index, 1);

  // First item (wrap-around to last)
  const first = neighbors(items, 'doc-1');
  assert.equal(first.prev.id, 'doc-3');
  assert.equal(first.current.id, 'doc-1');
  assert.equal(first.next.id, 'doc-2');
  assert.equal(first.index, 0);

  // Last item (wrap-around to first)
  const last = neighbors(items, 'doc-3');
  assert.equal(last.prev.id, 'doc-2');
  assert.equal(last.current.id, 'doc-3');
  assert.equal(last.next.id, 'doc-1');
  assert.equal(last.index, 2);

  // Single item list
  const single = [{ id: 'doc-solo' }];
  const resSingle = neighbors(single, 'doc-solo');
  assert.equal(resSingle.prev.id, 'doc-solo');
  assert.equal(resSingle.current.id, 'doc-solo');
  assert.equal(resSingle.next.id, 'doc-solo');

  // ID not found defaults to first item
  const notFound = neighbors(items, 'unknown-id');
  assert.equal(notFound.current.id, 'doc-1');
  assert.equal(notFound.prev.id, 'doc-3');
  assert.equal(notFound.next.id, 'doc-2');

  // Empty list
  assert.deepEqual(neighbors([], 'doc-1'), { prev: null, current: null, next: null, index: -1 });
  assert.deepEqual(neighbors(null, 'doc-1'), { prev: null, current: null, next: null, index: -1 });
});

