import test from 'node:test';
import assert from 'node:assert/strict';
import { tiltOf, stamp, tape, card } from '../src/ui/primitives.js';

test('tiltOf is stable and within ±0.8 degrees', () => {
  const ids = ['doc-1', 'sheet-a', 'polaroide-123', 'template-newspaper', ''];
  for (const id of ids) {
    const t1 = tiltOf(id);
    const t2 = tiltOf(id);
    assert.equal(t1, t2, `tiltOf('${id}') must be deterministic`);
    assert.ok(t1 >= -0.8 && t1 <= 0.8, `tiltOf('${id}')=${t1} must be between -0.8 and 0.8`);
  }
});

test('stamp generates uppercase text and correct tone class', () => {
  const html = stamp('salvo', { tone: 'wax' });
  assert.match(html, /class="at-stamp is-wax"/);
  assert.match(html, />SALVO</);

  const uvHtml = stamp('rascunho', { tone: 'uv', tilt: -2.5 });
  assert.match(uvHtml, /class="at-stamp is-uv"/);
  assert.match(uvHtml, />RASCUNHO</);
  assert.match(uvHtml, /style="transform: rotate\(-2.5deg\);"/);
});

test('tape and card produce proper markup', () => {
  const tapeHtml = tape('Seção Documentos');
  assert.match(tapeHtml, /class="at-tape"/);
  assert.match(tapeHtml, />Seção Documentos</);

  const cardHtml = card({ title: 'Carta Antiga', subtitle: 'A4', id: 'doc-7' });
  assert.match(cardHtml, /class="at-card"/);
  assert.match(cardHtml, /Carta Antiga/);
  assert.match(cardHtml, /data-id="doc-7"/);
});

