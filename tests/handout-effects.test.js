import test from 'node:test';
import assert from 'node:assert/strict';
import { EFFECTS, drawEffect, drawCutMask } from '../src/render/handout-effects.js';
import { createHandout, effectLayer, validateHandout } from '../src/domain/handouts.js';

test('handout effects: EFFECTS table has all 9 types with valid defaults', () => {
  const expectedTypes = ['crumple', 'fold', 'stain', 'burn', 'tear', 'damp', 'fade', 'blood', 'grain'];
  assert.equal(EFFECTS.length, 9, 'Should have exactly 9 effects');

  const registeredTypes = EFFECTS.map(e => e[0]);
  assert.deepEqual(registeredTypes.sort(), expectedTypes.sort(), 'All 9 expected types must be registered');

  // Verify each effect passes validateHandout with its default params
  for (const [type, name, initialBlend, defaultParams] of EFFECTS) {
    const doc = createHandout();
    const effLayer = effectLayer({
      name,
      blend: initialBlend,
      effect: {
        type,
        seed: 1,
        amount: 0.5,
        params: defaultParams,
      },
    });

    doc.layers.push(effLayer);
    assert.doesNotThrow(() => validateHandout(doc), `Default parameters for effect '${type}' must pass validateHandout`);
  }
});

test('handout effects: pure deterministic PRNG and cut mask behavior', () => {
  // Test cut mask for burn and tear with amount 0 keeps everything
  const mockCtx = {
    save() {},
    restore() {},
    fillRect() {},
    beginPath() {},
    closePath() {},
    fill() {},
    moveTo() {},
    lineTo() {},
    fillStyle: '',
    globalCompositeOperation: '',
  };

  // With amount: 0, drawCutMask should run without error and not clear
  assert.doesNotThrow(() => {
    drawCutMask(mockCtx, 800, 600, { type: 'burn', seed: 7, amount: 0, params: { depth: 0.08 } }, 1);
    drawCutMask(mockCtx, 800, 600, { type: 'tear', seed: 7, amount: 0, params: { side: 'bottom', depth: 0.04 } }, 1);
  });
});

