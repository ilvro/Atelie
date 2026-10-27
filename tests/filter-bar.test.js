import test from 'node:test';
import assert from 'node:assert/strict';
import { activeFilters } from '../src/ui/filter-bar.js';

test('activeFilters lists only groups that filter something', () => {
  const groups = [
    { key: 'source', label: 'Origem', value: 'all', options: [{ value: 'casa', label: 'Coleção' }] },
    { key: 'category', label: 'Categoria', value: 'Jornal', options: [{ value: 'Jornal', label: 'Jornal', count: 4 }] },
    { key: 'orphan', label: 'Outro', value: 'x', options: [] },
  ];
  assert.deepEqual(activeFilters(groups), [
    { key: 'category', label: 'Jornal', group: 'Categoria' },
    { key: 'orphan', label: 'x', group: 'Outro' },
  ]);
  assert.deepEqual(activeFilters([{ key: 'a', label: 'A', value: 'all', options: [] }]), []);
});
