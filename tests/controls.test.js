import test from 'node:test';
import assert from 'node:assert/strict';
import { numberField, choiceField, splitLabel, normalizeHex, colorField } from '../src/ui/controls.js';

test('labels give up their unit and hint to the control', () => {
  assert.deepEqual(splitLabel('Largura do rejunte · % · da peça'), { name: 'Largura do rejunte', unit: '%', hint: 'da peça' });
  assert.deepEqual(splitLabel('Grão · 0–1'), { name: 'Grão', unit: '', hint: '' });
  assert.equal(splitLabel('Rotação · graus').unit, '°');
});

test('bounded values get a slider beside the same native field; open or huge ranges and seeds do not', () => {
  const range = numberField('material-roughness', 'Rugosidade', .5, { min: 0, max: 1, step: .05 });
  assert.match(range, /class="field range-field"/);
  assert.match(range, /<input type="number" data-field="material-roughness" value="0.5"/);
  assert.match(range, /<input type="range" data-range="material-roughness" value="0.5" step="0.05" min="0" max="1"/);
  assert.equal((range.match(/data-field=/g) ?? []).length, 1, 'only the number commits the field');
  for (const html of [
    numberField('width', 'Largura · m', 2, { min: 0 }),
    numberField('light-intensity', 'Força', 5, { min: 0, max: 10000, step: 1 }),
    numberField('wear-seed', 'Variação · seed', 3, { min: 0, max: 255, step: 1 }),
  ]) {
    assert.match(html, /measure-field/);
    assert.doesNotMatch(html, /type="range"/);
  }
  assert.match(numberField('width', 'Largura · m', 2), /<i>m<\/i>/);
  assert.match(numberField('material-relief', 'Relevo', 0, { min: 0, max: .2, step: .005, disabled: true }), /type="number"[^>]*disabled[\s\S]*type="range"[^>]*disabled/);
});

test('choices keep a native select as the field and offer one button per option', () => {
  const html = choiceField('light-type', 'Tipo de luz', 'spot', [['point', 'Pontual'], ['spot', 'Spot · foco cônico'], ['directional', 'Direcional']]);
  assert.match(html, /<select data-field="light-type"[^>]*>[\s\S]*value="spot" selected/);
  assert.match(html, /class="segments"/);
  assert.match(html, /aria-checked="true" data-choice="spot" class="active" title="Spot · foco cônico"[^>]*><span>Spot<\/span>/);
  assert.equal((html.match(/data-choice=/g) ?? []).length, 3);
  assert.match(choiceField('f', 'L', 'a', [['a', 'A'], ['b', 'B'], ['c', 'C'], ['d', 'Longo nome', 'D']]), /class="chips"[\s\S]*<span>D<\/span>/);
});

test('a colour field has a box for its code, and codes are read in the usual ways', () => {
  const markup = colorField('fill-color', 'Luz ambiente · cor', '#26304D');
  assert.match(markup, /type="color" data-field="fill-color" value="#26304D"/);
  assert.match(markup, /data-hex="fill-color" value="#26304d"/);
  assert.equal(normalizeHex('#6F7FFF'), '#6f7fff');
  assert.equal(normalizeHex(' 6f7fff '), '#6f7fff');
  assert.equal(normalizeHex('#abc'), '#aabbcc');
  for (const wrong of ['', '#12', 'red', '#12345g', '#1234567']) assert.equal(normalizeHex(wrong), null, wrong);
});

