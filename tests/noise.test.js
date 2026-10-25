import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mulberry32,
  hash2D,
  valueNoise2D,
  fbm,
  worley2D,
  domainWarp,
} from '../src/domain/noise.js';

test('noise: mulberry32 determinism and uniform range [0, 1)', () => {
  const rand1 = mulberry32(42);
  const rand2 = mulberry32(42);
  const seq1 = Array.from({ length: 100 }, () => rand1());
  const seq2 = Array.from({ length: 100 }, () => rand2());

  assert.deepEqual(seq1, seq2);
  for (const v of seq1) {
    assert.ok(v >= 0 && v < 1, `value ${v} outside [0, 1)`);
  }
});

test('noise: valueNoise2D determinism and range [0, 1]', () => {
  const noiseA = valueNoise2D(12345);
  const noiseB = valueNoise2D(12345);

  const coords = [
    [0, 0],
    [0.5, 0.5],
    [1.2, 3.4],
    [100.75, 200.33],
    [-15.2, -8.7],
  ];

  for (const [x, y] of coords) {
    const vA = noiseA(x, y);
    const vB = noiseB(x, y);
    assert.equal(vA, vB);
    assert.ok(vA >= 0 && vA <= 1, `valueNoise ${vA} outside [0, 1]`);
  }
});

test('noise: fbm smoothness (close neighbors differ little)', () => {
  const noise = valueNoise2D(99);

  for (let i = 0; i < 50; i++) {
    const x = i * 2.37;
    const y = i * 1.81;
    const v1 = fbm(noise, x, y, { octaves: 4 });
    const v2 = fbm(noise, x + 0.001, y + 0.001, { octaves: 4 });

    assert.ok(v1 >= 0 && v1 <= 1, `fbm ${v1} outside [0, 1]`);
    assert.ok(v2 >= 0 && v2 <= 1, `fbm ${v2} outside [0, 1]`);
    const diff = Math.abs(v1 - v2);
    assert.ok(diff < 0.02, `fbm step diff too large: ${diff} at (${x}, ${y})`);
  }
});

test('noise: worley2D determinism and range [0, 1]', () => {
  const w1 = worley2D(777);
  const w2 = worley2D(777);

  for (let i = 0; i < 50; i++) {
    const x = i * 0.73;
    const y = i * 1.15;
    const val1 = w1(x, y);
    const val2 = w2(x, y);
    assert.equal(val1, val2);
    assert.ok(val1 >= 0 && val1 <= 1, `worley ${val1} outside [0, 1]`);
  }
});

test('noise: domainWarp determinism and range [0, 1]', () => {
  const noise = valueNoise2D(321);

  for (let i = 0; i < 50; i++) {
    const x = i * 1.5;
    const y = i * 0.9;
    const w1 = domainWarp(noise, x, y, 1.5);
    const w2 = domainWarp(noise, x, y, 1.5);
    assert.equal(w1, w2);
    assert.ok(w1 >= 0 && w1 <= 1, `domainWarp ${w1} outside [0, 1]`);
  }
});

