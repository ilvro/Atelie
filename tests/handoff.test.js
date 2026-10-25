import test from 'node:test';
import assert from 'node:assert/strict';
import { handoffRequest, validFrom, deliveredMessage } from '../src/editor/handoff.js';
import { savedMessage, removedMessage } from '../src/data/exchange.js';

test('validFrom accepts valid origins and rejects invalid ones', () => {
  // Valid https
  assert.equal(validFrom('https://conta.github.io'), true);
  assert.equal(validFrom('https://meu-dominio.com'), true);
  assert.equal(validFrom('https://app.tabletop.io:8443'), true);

  // Valid local http
  assert.equal(validFrom('http://127.0.0.1:3001'), true);
  assert.equal(validFrom('http://localhost:3001'), true);
  assert.equal(validFrom('http://127.0.0.1'), true);
  assert.equal(validFrom('http://localhost'), true);

  // Invalid: plain non-local http
  assert.equal(validFrom('http://exemplo.com'), false);
  assert.equal(validFrom('http://site.rpg.net:3000'), false);

  // Invalid: javascript scheme
  assert.equal(validFrom('javascript:alert(1)'), false);
  assert.equal(validFrom('javascript:void(0)'), false);

  // Invalid: origins containing paths
  assert.equal(validFrom('https://conta.github.io/'), false);
  assert.equal(validFrom('https://conta.github.io/Atelie'), false);
  assert.equal(validFrom('http://127.0.0.1:3001/caminho'), false);

  // Invalid: non-string or empty
  assert.equal(validFrom(''), false);
  assert.equal(validFrom(null), false);
  assert.equal(validFrom(undefined), false);
  assert.equal(validFrom(123), false);
});

test('handoffRequest parses pick, edit, and new modes with valid opener and origin', () => {
  const fakeOpener = {};

  // Mode pick
  const pickReq = handoffRequest('https://atelie.com/?pick=1&from=https://conta.github.io&nonce=abc123', fakeOpener);
  assert.deepEqual(pickReq, {
    from: 'https://conta.github.io',
    nonce: 'abc123',
    mode: 'pick',
  });

  // Mode edit
  const editReq = handoffRequest('https://atelie.com/?handout=11111111-2222-3333-4444-555555555555&from=http://127.0.0.1:3001&nonce=xyz789', fakeOpener);
  assert.deepEqual(editReq, {
    from: 'http://127.0.0.1:3001',
    nonce: 'xyz789',
    mode: 'edit',
    handoutId: '11111111-2222-3333-4444-555555555555',
  });

  // Mode new
  const newReq = handoffRequest('https://atelie.com/?new=a4&from=http://localhost:3001&nonce=preset456', fakeOpener);
  assert.deepEqual(newReq, {
    from: 'http://localhost:3001',
    nonce: 'preset456',
    mode: 'new',
    preset: 'a4',
  });
});

test('handoffRequest returns null without opener, without nonce, or with invalid from', () => {
  const fakeOpener = {};

  // Falsy opener
  assert.equal(handoffRequest('?pick=1&from=https://conta.github.io&nonce=abc', null), null);
  assert.equal(handoffRequest('?pick=1&from=https://conta.github.io&nonce=abc', undefined), null);

  // Missing nonce
  assert.equal(handoffRequest('?pick=1&from=https://conta.github.io', fakeOpener), null);
  assert.equal(handoffRequest('?pick=1&from=https://conta.github.io&nonce=', fakeOpener), null);

  // Missing from
  assert.equal(handoffRequest('?pick=1&nonce=abc', fakeOpener), null);

  // Invalid from
  assert.equal(handoffRequest('?pick=1&from=http://exemplo.com&nonce=abc', fakeOpener), null);
  assert.equal(handoffRequest('?pick=1&from=javascript:alert(1)&nonce=abc', fakeOpener), null);
  assert.equal(handoffRequest('?pick=1&from=https://conta.github.io/path&nonce=abc', fakeOpener), null);

  // No mode specified
  assert.equal(handoffRequest('?from=https://conta.github.io&nonce=abc', fakeOpener), null);
});

test('deliveredMessage, savedMessage, and removedMessage have exactly the contract fields', () => {
  const fakeDelivery = {
    id: 'doc-uuid-1',
    name: 'Carta Misteriosa',
    category: 'Cartas',
    tags: ['mistério'],
    revision: 3,
    updatedAt: '2026-10-25T12:00:00Z',
    hasUv: false,
    source: 'https://conta.github.io/Atelie/',
    preview: null,
    bakes: { normal: null, uv: null },
  };

  const delivered = deliveredMessage('nonce-42', fakeDelivery);
  assert.deepEqual(delivered, {
    app: 'atelie',
    contract: 1,
    type: 'delivered',
    nonce: 'nonce-42',
    delivery: fakeDelivery,
  });

  const summary = {
    id: 'doc-uuid-1',
    revision: 3,
    source: 'https://conta.github.io/Atelie/',
  };

  const saved = savedMessage(summary);
  assert.deepEqual(saved, {
    app: 'atelie',
    contract: 1,
    type: 'handout-saved',
    id: 'doc-uuid-1',
    revision: 3,
    source: 'https://conta.github.io/Atelie/',
  });

  const removed = removedMessage(summary);
  assert.deepEqual(removed, {
    app: 'atelie',
    contract: 1,
    type: 'handout-removed',
    id: 'doc-uuid-1',
    revision: 3,
    source: 'https://conta.github.io/Atelie/',
  });

  // Alternative signature for removedMessage
  const removedDirect = removedMessage('doc-uuid-2', 'https://conta.github.io/Atelie/', 5);
  assert.deepEqual(removedDirect, {
    app: 'atelie',
    contract: 1,
    type: 'handout-removed',
    id: 'doc-uuid-2',
    revision: 5,
    source: 'https://conta.github.io/Atelie/',
  });
});

