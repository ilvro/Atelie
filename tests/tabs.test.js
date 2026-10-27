import test from 'node:test';
import assert from 'node:assert/strict';
import { reorderIds, nextAfterClose, cycleTab, serializeTabs, parseTabs } from '../src/editor/tabs.js';

test('reorderIds moves one tab and ignores unknown ids', () => {
  assert.deepEqual(reorderIds(['a', 'b', 'c'], 'a', 2), ['b', 'c', 'a']);
  assert.deepEqual(reorderIds(['a', 'b', 'c'], 'c', 0), ['c', 'a', 'b']);
  assert.deepEqual(reorderIds(['a', 'b'], 'x', 0), ['a', 'b']);
  assert.deepEqual(reorderIds(['a', 'b'], 'a', 99), ['b', 'a']);
});

test('nextAfterClose picks the right neighbour, then the left, then the Mesa', () => {
  assert.equal(nextAfterClose(['a', 'b', 'c'], 'b', 'b'), 'c');
  assert.equal(nextAfterClose(['a', 'b', 'c'], 'c', 'c'), 'b');
  assert.equal(nextAfterClose(['a'], 'a', 'a'), null);
  assert.equal(nextAfterClose(['a', 'b'], 'a', 'b'), 'b', 'closing an inactive tab keeps the active one');
});

test('cycleTab walks Mesa → documents → Mesa in both directions', () => {
  const order = ['a', 'b'];
  assert.equal(cycleTab(order, null, 1), 'a');
  assert.equal(cycleTab(order, 'a', 1), 'b');
  assert.equal(cycleTab(order, 'b', 1), null);
  assert.equal(cycleTab(order, null, -1), 'b');
  assert.equal(cycleTab([], null, 1), null);
});

test('tabs persistence round-trips and survives bad data', () => {
  assert.deepEqual(parseTabs(serializeTabs(['a', 'b'], 'b')), { order: ['a', 'b'], active: 'b' });
  assert.deepEqual(parseTabs(serializeTabs(['a'], null)), { order: ['a'], active: null });
  assert.deepEqual(parseTabs('not json'), { order: [], active: null });
  assert.deepEqual(parseTabs(JSON.stringify({ order: ['a', 'a', 3], active: 'zzz' })), { order: ['a'], active: null });
  assert.deepEqual(parseTabs(null), { order: [], active: null });
});
