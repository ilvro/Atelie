import test from 'node:test';
import assert from 'node:assert/strict';
import { filterLibraryItems } from '../src/editor/library-search.js';

const sampleItems = [
  { id: 'casa-papel-1', kind: 'image', name: 'Ofício Creme Antigo', category: 'Papéis', tags: ['envelhecido', 'textura'], source: 'casa' },
  { id: 'casa-mancha-1', kind: 'image', name: 'Mancha de Café Dupla', category: 'Manchas', tags: ['xícara', 'mesa'], source: 'casa' },
  { id: 'casa-carimbo-1', kind: 'image', name: 'CONFIDENCIAL', category: 'Carimbos', tags: ['sigilo', 'urgente'], source: 'casa' },
  { id: 'casa-font-courier', kind: 'font', name: 'Courier Prime Regular', family: 'Courier Prime', category: 'Máquina de escrever', source: 'casa' },
  { id: 'ac-sangue-1', kind: 'image', name: 'Respingo de Sangue Arterial', category: 'Sangue', tags: ['crime', 'perícia'], source: 'ac' },
  { id: 'ac-doc-1', kind: 'template', name: 'Relatório Modelo', category: 'Relatórios', source: 'ac' },
];

test('library search: busca sem acento em nome, categoria e tags', () => {
  // Query "oficio" matches "Ofício"
  const res1 = filterLibraryItems(sampleItems, { query: 'oficio' });
  assert.equal(res1.length, 1);
  assert.equal(res1[0].id, 'casa-papel-1');

  // Query "cafe" matches "Café"
  const res2 = filterLibraryItems(sampleItems, { query: 'cafe' });
  assert.equal(res2.length, 1);
  assert.equal(res2[0].id, 'casa-mancha-1');

  // Query "pericia" matches tag "perícia"
  const res3 = filterLibraryItems(sampleItems, { query: 'pericia' });
  assert.equal(res3.length, 1);
  assert.equal(res3[0].id, 'ac-sangue-1');

  // Query by category "carimbos"
  const res4 = filterLibraryItems(sampleItems, { query: 'carimbo' });
  assert.equal(res4.length, 1);
  assert.equal(res4[0].id, 'casa-carimbo-1');

  // Query out of order words: "creme oficio"
  const res5 = filterLibraryItems(sampleItems, { query: 'creme oficio' });
  assert.equal(res5.length, 1);
  assert.equal(res5[0].id, 'casa-papel-1');
});

test('library search: filtro por tipo (elementos vs fontes)', () => {
  // elements: excludes fonts and templates
  const elements = filterLibraryItems(sampleItems, { type: 'elements' });
  assert.equal(elements.length, 4);
  assert.ok(elements.every(i => i.kind !== 'font' && i.kind !== 'template'));

  // fonts: only kind 'font'
  const fonts = filterLibraryItems(sampleItems, { type: 'fonts' });
  assert.equal(fonts.length, 1);
  assert.equal(fonts[0].id, 'casa-font-courier');
});

test('library search: filtro por origem', () => {
  // Filter casa
  const casaItems = filterLibraryItems(sampleItems, { source: 'casa' });
  assert.equal(casaItems.length, 4);
  assert.ok(casaItems.every(i => i.source === 'casa'));

  // Filter ac
  const acItems = filterLibraryItems(sampleItems, { source: 'ac' });
  assert.equal(acItems.length, 1); // ac-sangue-1 (template is excluded)
  assert.equal(acItems[0].id, 'ac-sangue-1');

  // Filter all / tudo
  const allItems = filterLibraryItems(sampleItems, { source: 'all' });
  assert.equal(allItems.length, 5);
});

test('library search: filtro por favoritos', () => {
  const favorites = ['casa-mancha-1', 'ac-sangue-1'];

  const favItems = filterLibraryItems(sampleItems, { favoritesOnly: true, favorites });
  assert.equal(favItems.length, 2);
  assert.deepEqual(favItems.map(i => i.id).sort(), ['ac-sangue-1', 'casa-mancha-1'].sort());
});


test('recentes da biblioteca: mais novo primeiro, sem repetir, no máximo 12', async () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  };
  const { recordRecentLibraryId, getRecentLibraryIds } = await import('../src/editor/library-search.js');
  for (let i = 0; i < 15; i++) recordRecentLibraryId(`item-${i}`);
  recordRecentLibraryId('item-10');
  const list = getRecentLibraryIds();
  assert.equal(list.length, 12);
  assert.equal(list[0], 'item-10');
  assert.equal(new Set(list).size, 12);
  delete globalThis.localStorage;
});
