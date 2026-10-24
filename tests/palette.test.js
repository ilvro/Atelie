import test from 'node:test';
import assert from 'node:assert/strict';
import { palette, matchesWords, normalizeText } from '../src/ui/palette.js';

test('normalizeText strips accents and converts to lower case', () => {
  assert.equal(normalizeText('Ateliê de Documentos'), 'atelie de documentos');
  assert.equal(normalizeText('LIXEIRA'), 'lixeira');
  assert.equal(normalizeText('Ajustes da Mesa'), 'ajustes da mesa');
});

test('matchesWords finds Lixeira with lixe and Documentos with doc', () => {
  assert.ok(matchesWords('Lixeira', 'lixe'));
  assert.ok(matchesWords('Lixeira', 'LIXE'));
  assert.ok(matchesWords('Documentos', 'doc'));
  assert.ok(matchesWords('Novo Documento', 'doc'));
});

test('matchesWords matches words out of order', () => {
  assert.ok(matchesWords('Abrir gaveta de Documentos', 'doc abrir'));
  assert.ok(matchesWords('Ajustes da Mesa Noturna', 'mesa ajustes noturna'));
  assert.equal(matchesWords('Abrir gaveta de Documentos', 'doc inexistente'), false);
});

test('palette registry collects and filters items correctly', () => {
  const unregister = palette.register(() => [
    { id: 'action-trash', title: 'Lixeira', subtitle: 'Ver documentos excluídos' },
    { id: 'action-docs', title: 'Documentos', subtitle: 'Listar todos os trabalhos' },
    { id: 'action-settings', title: 'Ajustes da mesa', subtitle: 'Personalizar textura e luminária' },
  ]);

  const trashMatches = palette.search('lixe');
  assert.equal(trashMatches.length, 1);
  assert.equal(trashMatches[0].title, 'Lixeira');

  const docMatches = palette.search('doc');
  assert.equal(docMatches.length, 2); // Documentos title, and Lixeira subtitle ("Ver documentos excluídos")

  const outOfOrder = palette.search('mesa ajustes');
  assert.equal(outOfOrder.length, 1);
  assert.equal(outOfOrder[0].id, 'action-settings');

  unregister();
});

