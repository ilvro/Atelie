import test from 'node:test';
import assert from 'node:assert/strict';
import { cssFilter, applyAdjustPixels, blendChannel } from '../src/domain/handout-pixels.js';
import { fitRect, clipGroups, visibleIn } from '../src/render/handout-render.js';

test('cssFilter produces empty string for defaults and proper CSS filter tokens with scale', () => {
  assert.equal(cssFilter({}), '');
  assert.equal(cssFilter(), '');

  const filter = cssFilter({ grayscale: 1, brightness: 0.2, hue: 30, blur: 4 }, 0.5);
  assert.ok(filter.includes('grayscale(1)'), 'must include grayscale(1)');
  assert.ok(filter.includes('brightness(1.2)'), 'must include brightness(1.2)');
  assert.ok(filter.includes('hue-rotate(30deg)'), 'must include hue-rotate(30deg)');
  assert.ok(filter.includes('blur(2px)'), 'must include blur(2px)');
});

test('applyAdjustPixels applies grayscale, invert, and curve to RGBA bytes', () => {
  // 1. Grayscale
  const red = new Uint8Array([255, 0, 0, 255]);
  applyAdjustPixels(red, { grayscale: 1 });
  assert.equal(red[0], red[1]);
  assert.equal(red[1], red[2]);
  assert.equal(red[0], 54); // Math.round(0.2126 * 255) === 54
  assert.equal(red[3], 255); // Alpha preserved

  // 2. Invert
  const bytes = new Uint8Array([10, 20, 30, 128]);
  applyAdjustPixels(bytes, { invert: true });
  assert.deepEqual(Array.from(bytes), [245, 235, 225, 128]);

  // 3. Curve
  const mid = new Uint8Array([128, 128, 128, 255]);
  applyAdjustPixels(mid, { curve: [[0, 0], [128, 200], [255, 255]] });
  assert.equal(mid[0], 200);
  assert.equal(mid[1], 200);
  assert.equal(mid[2], 200);
});

test('blendChannel matches standard separable blend formulas', () => {
  assert.equal(blendChannel('multiply', 0.5, 0.5), 0.25);
  assert.equal(blendChannel('screen', 0.5, 0.5), 0.75);
  assert.equal(blendChannel('linear-burn', 0.3, 0.4), 0);
  assert.equal(blendChannel('overlay', 0.25, 0.5), 0.25);
});

test('fitRect computes correct source and destination coordinates for contain, cover, and stretch', () => {
  const box = { width: 100, height: 100 };

  // contain: 200x100 into 100x100 draws 100x50 centered
  const contain = fitRect(200, 100, box, 'contain');
  assert.equal(contain.dw, 100);
  assert.equal(contain.dh, 50);
  assert.equal(contain.dx, -50);
  assert.equal(contain.dy, -25);
  assert.equal(contain.sw, 200);
  assert.equal(contain.sh, 100);

  // cover: uses central 100x100 region of 200x100 image
  const cover = fitRect(200, 100, box, 'cover');
  assert.equal(cover.dw, 100);
  assert.equal(cover.dh, 100);
  assert.equal(cover.dx, -50);
  assert.equal(cover.dy, -50);
  assert.equal(cover.sw, 100);
  assert.equal(cover.sh, 100);
  assert.equal(cover.sx, 50); // Centered crop
  assert.equal(cover.sy, 0);

  // stretch: 100x100 destination with entire 200x100 source
  const stretch = fitRect(200, 100, box, 'stretch');
  assert.equal(stretch.dw, 100);
  assert.equal(stretch.dh, 100);
  assert.equal(stretch.dx, -50);
  assert.equal(stretch.dy, -50);
  assert.equal(stretch.sx, 0);
  assert.equal(stretch.sy, 0);
  assert.equal(stretch.sw, 200);
  assert.equal(stretch.sh, 100);
});

test('clipGroups organizes clipping groups according to base and clipped rules', () => {
  const A = { id: 'A', visible: true, clip: false, light: 'both' };
  const B = { id: 'B', visible: true, clip: true, light: 'both' };
  const C = { id: 'C', visible: true, clip: true, light: 'both' };
  const D = { id: 'D', visible: true, clip: false, light: 'both' };
  const E = { id: 'E', visible: false, clip: true, light: 'both' };

  const groups = clipGroups([A, B, C, D, E], 'normal');
  assert.equal(groups.length, 2);
  assert.equal(groups[0].base.id, 'A');
  assert.deepEqual(groups[0].clipped.map(l => l.id), ['B', 'C']);
  assert.equal(groups[1].base.id, 'D');
  assert.deepEqual(groups[1].clipped.map(l => l.id), []);

  // When A is invisible, B becomes base of first group
  const A_inv = { ...A, visible: false };
  const groups2 = clipGroups([A_inv, B, C, D, E], 'normal');
  assert.equal(groups2.length, 2);
  assert.equal(groups2[0].base.id, 'B');
  assert.deepEqual(groups2[0].clipped.map(l => l.id), ['C']);
  assert.equal(groups2[1].base.id, 'D');

  // Under UV light, 'both' layers are grouped first and 'uv' layers afterwards
  const both1 = { id: 'both1', visible: true, clip: false, light: 'both' };
  const uvMiddle = { id: 'uvMiddle', visible: true, clip: false, light: 'uv' };
  const both2 = { id: 'both2', visible: true, clip: false, light: 'both' };
  const normalLayer = { id: 'normalLayer', visible: true, clip: false, light: 'normal' };

  const uvGroups = clipGroups([both1, uvMiddle, both2, normalLayer], 'uv');
  assert.equal(uvGroups.length, 3);
  assert.equal(uvGroups[0].base.id, 'both1');
  assert.equal(uvGroups[1].base.id, 'both2');
  assert.equal(uvGroups[2].base.id, 'uvMiddle');
});

test('visibleIn correctly respects visibility and light modes', () => {
  const invisible = { visible: false, light: 'both' };
  assert.equal(visibleIn(invisible, 'normal'), false);
  assert.equal(visibleIn(invisible, 'uv'), false);

  const both = { visible: true, light: 'both' };
  assert.equal(visibleIn(both, 'normal'), true);
  assert.equal(visibleIn(both, 'uv'), true);

  const normalOnly = { visible: true, light: 'normal' };
  assert.equal(visibleIn(normalOnly, 'normal'), true);
  assert.equal(visibleIn(normalOnly, 'uv'), false);

  const uvOnly = { visible: true, light: 'uv' };
  assert.equal(visibleIn(uvOnly, 'normal'), false);
  assert.equal(visibleIn(uvOnly, 'uv'), true);
});

