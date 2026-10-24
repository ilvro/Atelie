import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapText } from '../src/domain/wrap.js';

test('text wraps by words, keeps paragraphs, splits words wider than line and handles maxLines', () => {
  const measure = text => text.length; // one unit per letter
  assert.deepEqual(wrapText('um dois três quatro', measure, 8).lines, ['um dois', 'três', 'quatro']);
  assert.deepEqual(wrapText('a\n\nb', measure, 8).lines, ['a', '', 'b']);
  assert.deepEqual(wrapText('abcdefghij', measure, 4).lines, ['abcd', 'efgh', 'ij']);
  assert.deepEqual(wrapText('fim\n\n\n', measure, 8).lines, ['fim']);
  assert.deepEqual(wrapText('um dois três', measure, 4, 2), { lines: ['um', 'dois'], overflow: true });
});

