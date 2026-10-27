import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestFontMeta, userFontItem, userFontId, isUserFontId, validateUserFontFile, fontMimeFor, USER_FONT_CATEGORY } from '../src/data/user-fonts.js';

test('suggestFontMeta: family from the file name, weight and italic from its style words', () => {
  assert.deepEqual(suggestFontMeta('SpecialElite-Regular.ttf'), { family: 'Special Elite', weight: 400, italic: false });
  assert.deepEqual(suggestFontMeta('Libre_Baskerville-BoldItalic.woff2'), { family: 'Libre Baskerville', weight: 700, italic: true });
  assert.deepEqual(suggestFontMeta('courier prime italic.otf'), { family: 'courier prime', weight: 400, italic: true });
  assert.deepEqual(suggestFontMeta('Inter-Light.ttf'), { family: 'Inter', weight: 300, italic: false });
  assert.deepEqual(suggestFontMeta('Roboto-Black.ttf'), { family: 'Roboto', weight: 900, italic: false });
  assert.equal(suggestFontMeta('').family, 'Fonte');
  assert.equal(suggestFontMeta('Bold.ttf').family, 'Bold', 'never leaves an empty name');
});

test('user font ids and items follow the library item shape', () => {
  const id = userFontId('Máquina Antiga', 700, true, 1700000000000);
  assert.match(id, /^usuario-font-maquina-antiga-700i-[a-z0-9]+$/);
  assert.equal(isUserFontId(id), true);
  assert.equal(isUserFontId('casa-fonte-courier'), false);
  assert.equal(isUserFontId(null), false);

  const item = userFontItem({ family: 'Minha Fonte', weight: 400, italic: false, fileName: 'x.WOFF2' }, 5);
  assert.equal(item.kind, 'font');
  assert.equal(item.source, 'usuario');
  assert.equal(item.category, USER_FONT_CATEGORY);
  assert.equal(item.style, 'normal');
  assert.match(item.file, /^fontes\/usuario-font-minha-fonte-400-5\.woff2$/);
});

test('validateUserFontFile: only font extensions up to 8 MB', () => {
  assert.equal(validateUserFontFile({ name: 'a.ttf', size: 1000 }), null);
  assert.equal(validateUserFontFile({ name: 'a.WOFF2', size: 1000 }), null);
  assert.match(validateUserFontFile({ name: 'a.png', size: 10 }), /\.ttf/);
  assert.match(validateUserFontFile({ name: 'a.ttf', size: 9 * 1024 * 1024 }), /8 MB/);
  assert.match(validateUserFontFile(null), /Nenhum/);
  assert.equal(fontMimeFor('a.otf'), 'font/otf');
  assert.equal(fontMimeFor('a.woff2'), 'font/woff2');
});
