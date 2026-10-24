import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRulerStep,
  pxToMm,
  mmToPx,
  PX_PER_MM,
} from '../src/editor/rulers.js';

test('conversion between pixels and millimeters at 150 DPI', () => {
  // 150 DPI: 1 inch = 25.4 mm = 150 px -> ~5.9055 px per mm
  assert.ok(Math.abs(PX_PER_MM - 5.9055) < 0.001);

  // 10 mm in px
  const px10 = mmToPx(10);
  assert.ok(Math.abs(px10 - 59.055) < 0.01);

  // Convert back to mm
  const mm10 = pxToMm(px10);
  assert.ok(Math.abs(mm10 - 10) < 0.0001);

  // A4 dimensions: 210 x 297 mm
  assert.ok(Math.abs(mmToPx(210) - 1240.15) < 1.0);
  assert.ok(Math.abs(mmToPx(297) - 1753.93) < 1.0);
});

test('calculateRulerStep chooses step ensuring screen tick distance >= minScreenDistance (default 48 px)', () => {
  // Rule: step * zoom >= 48 (from RULER_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000])

  // At 100% zoom (1.0):
  // step * 1.0 >= 48 -> step must be >= 48 -> 50 px
  const step100 = calculateRulerStep(1.0);
  assert.equal(step100, 50);

  // At 50% zoom (0.5):
  // step * 0.5 >= 48 -> step must be >= 96 -> 100 px
  const step50 = calculateRulerStep(0.5);
  assert.equal(step50, 100);

  // At 10% zoom (0.1):
  // step * 0.1 >= 48 -> step must be >= 480 -> 500 px
  const step10 = calculateRulerStep(0.1);
  assert.equal(step10, 500);

  // At 200% zoom (2.0):
  // step * 2.0 >= 48 -> step must be >= 24 -> 50 px (next available in [1, 2, 5, 10, 20, 50, ...])
  // Wait: 20 * 2 = 40 (< 48), 50 * 2 = 100 (>= 48) -> 50 px
  const step200 = calculateRulerStep(2.0);
  assert.equal(step200, 50);

  // At 400% zoom (4.0):
  // step * 4.0 >= 48 -> step must be >= 12 -> 20 px
  const step400 = calculateRulerStep(4.0);
  assert.equal(step400, 20);

  // In mm unit at 100% zoom:
  // step * PX_PER_MM * 1.0 >= 48 -> step * 5.9055 >= 48 -> step >= 8.128 mm -> 10 mm
  const stepMm100 = calculateRulerStep(1.0, { unit: 'mm' });
  assert.equal(stepMm100, 10);
});

