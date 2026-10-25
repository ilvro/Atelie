import test from 'node:test';
import assert from 'node:assert/strict';
import { GLYPHS, wordPath } from '../scripts/colecao/vectors/letters.js';

test('colecao-letters: o alfabeto cobre todos os caracteres obrigatórios', () => {
  const required = [
    // A-Z
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    // 0-9
    ...'0123456789',
    // Accents & cedilla
    'Ç', 'Ã', 'Õ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Â', 'Ê', 'Ô',
    // Punctuation
    '/', '-', '.',
  ];

  for (const ch of required) {
    assert.ok(
      GLYPHS[ch] !== undefined,
      `caractere obrigatório ausente no alfabeto GLYPHS: "${ch}"`
    );
    assert.ok(
      GLYPHS[ch].length > 0,
      `path do caractere "${ch}" está vazio`
    );
  }
});

test('colecao-letters: wordPath tem largura proporcional ao número de letras', () => {
  const shortWord = wordPath('URGENTE');
  const longWord = wordPath('CONFIDENCIAL');
  const extraLongWord = wordPath('DEVOLVER AO REMETENTE');

  assert.ok(shortWord.d && shortWord.d.length > 0, 'path curto deve ter dados');
  assert.ok(longWord.d && longWord.d.length > 0, 'path longo deve ter dados');

  assert.ok(
    longWord.width > shortWord.width,
    `CONFIDENCIAL (${longWord.width}) deve ser mais largo que URGENTE (${shortWord.width})`
  );

  assert.ok(
    extraLongWord.width > longWord.width,
    `DEVOLVER AO REMETENTE (${extraLongWord.width}) deve ser mais largo que CONFIDENCIAL (${longWord.width})`
  );

  // Proportionality check: ~12 letters vs ~7 letters
  const ratio = longWord.width / shortWord.width;
  assert.ok(
    ratio >= 1.4 && ratio <= 2.0,
    `razão de largura ${ratio} fora da proporção esperada (1.4 - 2.0)`
  );
});

