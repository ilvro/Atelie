import test from 'node:test';
import assert from 'node:assert/strict';
import { hasUvLayers, summaryOf, deliveryOf } from '../src/editor/bake.js';

test('hasUvLayers detects visible layers with light uv', () => {
  const noLayers = { layers: [] };
  assert.equal(hasUvLayers(noLayers), false);

  const normalOnly = {
    layers: [
      { id: '1', visible: true, light: 'normal' },
      { id: '2', visible: true, light: 'both' },
    ],
  };
  assert.equal(hasUvLayers(normalOnly), false);

  const uvInvisible = {
    layers: [
      { id: '1', visible: true, light: 'normal' },
      { id: '2', visible: false, light: 'uv' },
    ],
  };
  assert.equal(hasUvLayers(uvInvisible), false);

  const uvVisible = {
    layers: [
      { id: '1', visible: true, light: 'normal' },
      { id: '2', visible: true, light: 'uv' },
    ],
  };
  assert.equal(hasUvLayers(uvVisible), true);
});

test('summaryOf formats summary according to Tabletop contract Section 2', () => {
  const handout = {
    id: '12345678-1234-1234-1234-123456789abc',
    name: 'Diário de Bordo',
    category: 'Diários',
    tags: ['navio', '1920'],
    revision: 4,
    updatedAt: '2026-10-25T15:30:00.000Z',
    layers: [
      { id: 'papel', visible: true, light: 'normal' },
      { id: 'tinta-invisivel', visible: true, light: 'uv' },
    ],
  };

  const source = 'https://conta.github.io/Atelie/';
  const summary = summaryOf(handout, source);

  assert.deepEqual(summary, {
    id: '12345678-1234-1234-1234-123456789abc',
    name: 'Diário de Bordo',
    category: 'Diários',
    tags: ['navio', '1920'],
    revision: 4,
    updatedAt: '2026-10-25T15:30:00.000Z',
    hasUv: true,
    source: 'https://conta.github.io/Atelie/',
  });
});

test('deliveryOf formats full Delivery payload matching contract Section 2', () => {
  const handout = {
    id: '12345678-1234-1234-1234-123456789abc',
    name: 'Pista Secreta',
    category: 'Pistas',
    tags: ['sangue'],
    revision: 2,
    updatedAt: '2026-10-25T16:00:00.000Z',
    layers: [
      { id: 'base', visible: true, light: 'normal' },
    ],
  };

  const fakePreview = { size: 1234, type: 'image/webp' };
  const fakeNormalBake = { size: 56789, type: 'image/png' };
  const source = 'http://127.0.0.1:3011/';

  const delivery = deliveryOf(handout, {
    preview: fakePreview,
    bakes: { normal: fakeNormalBake, uv: null },
    source,
  });

  assert.deepEqual(delivery, {
    id: '12345678-1234-1234-1234-123456789abc',
    name: 'Pista Secreta',
    category: 'Pistas',
    tags: ['sangue'],
    revision: 2,
    updatedAt: '2026-10-25T16:00:00.000Z',
    hasUv: false,
    source: 'http://127.0.0.1:3011/',
    preview: fakePreview,
    bakes: {
      normal: fakeNormalBake,
      uv: null,
    },
  });
});

