import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultsFor } from '../src/editor/library-defaults.js';

test('library defaults: Papéis cobrem a página no fundo com blend normal', () => {
  const d1 = defaultsFor({ category: 'Papéis', name: 'Ofício creme' });
  assert.equal(d1.blend, 'normal');
  assert.equal(d1.cover, true);
  assert.equal(d1.position, 'bottom');

  const d2 = defaultsFor({ category: 'Papel Kraft Antigo', name: 'Kraft' });
  assert.equal(d2.blend, 'normal');
  assert.equal(d2.cover, true);
  assert.equal(d2.position, 'bottom');
});

test('library defaults: Manchas, Sangue, Água, Sujeira, Queimado, Digitais usam multiply', () => {
  const categories = ['Manchas', 'Sangue', 'Água', 'Sujeira', 'Queimado', 'Digitais'];
  for (const cat of categories) {
    const d = defaultsFor({ category: cat, name: 'Item teste' });
    assert.equal(d.blend, 'multiply', `Categoria ${cat} deve ter blend multiply`);
    assert.equal(d.cover, false);
    assert.equal(d.position, 'top');
  }

  // Expansion categories matched by keyword
  const keywords = ['mancha de vinho', 'sujeira pesada', 'copo de café', 'papel queimado', 'respingo de sangue', 'poeira fina'];
  for (const kw of keywords) {
    const d = defaultsFor({ category: kw, name: 'Item expansao' });
    assert.equal(d.blend, 'multiply', `Palavra-chave ${kw} deve ter blend multiply`);
  }
});

test('library defaults: Amassados e Dobras usam soft-light cobrindo a página', () => {
  const categories = ['Amassados', 'Dobras'];
  for (const cat of categories) {
    const d = defaultsFor({ category: cat, name: 'Textura teste' });
    assert.equal(d.blend, 'soft-light', `Categoria ${cat} deve ter blend soft-light`);
    assert.equal(d.cover, true);
  }

  // Expansion keywords
  const keywords = ['amassado leve', 'dobrada em 4', 'textura linho'];
  for (const kw of keywords) {
    const d = defaultsFor({ category: kw, name: 'Textura' });
    assert.equal(d.blend, 'soft-light');
    assert.equal(d.cover, true);
  }
});

test('library defaults: Carimbos, Selos, Marcas, Símbolos usam multiply, opacidade 0.9 e tint', () => {
  // General stamp defaults to dark blue #1f2f6b
  const stampNormal = defaultsFor({ category: 'Carimbos', name: 'ARQUIVADO' });
  assert.equal(stampNormal.blend, 'multiply');
  assert.equal(stampNormal.opacity, 0.9);
  assert.equal(stampNormal.tint.color, '#1f2f6b');

  // Stamped with NEGADO, URGENTE, CANCELADO gets red #a3202a
  const stampNegado = defaultsFor({ category: 'Carimbos', name: 'NEGADO', id: 'casa-carimbo-negado' });
  assert.equal(stampNegado.tint.color, '#a3202a');

  const stampUrgente = defaultsFor({ category: 'Carimbos', name: 'URGENTE', id: 'casa-carimbo-urgente' });
  assert.equal(stampUrgente.tint.color, '#a3202a');

  const stampCancelado = defaultsFor({ category: 'Carimbos', name: 'CANCELADO', id: 'casa-carimbo-cancelado' });
  assert.equal(stampCancelado.tint.color, '#a3202a');

  // Other monochrome vectors (Marcas, Símbolos) default to black #000000
  const simbolo = defaultsFor({ category: 'Símbolos', name: 'Olho Místico' });
  assert.equal(simbolo.blend, 'multiply');
  assert.equal(simbolo.opacity, 0.9);
  assert.equal(simbolo.tint.color, '#000000');

  // Custom ink color override
  const customInk = defaultsFor({ category: 'Carimbos', name: 'RECEBIDO' }, { defaultInkColor: '#2b580c' });
  assert.equal(customInk.tint.color, '#2b580c');
});

test('library defaults: Rasgos usam normal com clip desligado e nota explicativa', () => {
  const d = defaultsFor({ category: 'Rasgos', name: 'Rasgo Lateral' });
  assert.equal(d.blend, 'normal');
  assert.equal(d.clip, false);
  assert.ok(typeof d.note === 'string' && d.note.length > 0);
});

test('library defaults: Outros itens usam normal e posição padrão', () => {
  const d = defaultsFor({ category: 'Prendedores', name: 'Clipe de Papel' });
  assert.equal(d.blend, 'normal');
  assert.equal(d.cover, false);
  assert.equal(d.position, 'top');
});


test('libraryDropSize: papéis cobrem a página; o resto fica em no máximo metade da largura', async () => {
  const { libraryDropSize } = await import('../src/editor/library-defaults.js');
  const page = { width: 1000, height: 1400 };
  assert.deepEqual(libraryDropSize({ category: 'Papéis', width: 300, height: 400 }, page), { width: 1000, height: 1400, cover: true });
  assert.deepEqual(libraryDropSize({ category: 'Carimbos', width: 300, height: 150 }, page), { width: 300, height: 150, cover: false });
  assert.deepEqual(libraryDropSize({ category: 'Carimbos', width: 2000, height: 1000 }, page), { width: 500, height: 250, cover: false });
  assert.deepEqual(libraryDropSize({ category: 'Carimbos' }, page), { width: 400, height: 400, cover: false });
});

test('stampTilt: only stamps, seals and wax, within ±3°', async () => {
  const { stampTilt } = await import('../src/editor/library-defaults.js');
  assert.equal(stampTilt({ category: 'Carimbos' }, () => 0), -3);
  assert.equal(stampTilt({ category: 'Selos' }, () => 0.5), 0);
  assert.equal(stampTilt({ category: 'Lacres' }, () => 0.999), 3);
  assert.equal(stampTilt({ category: 'Papéis' }, () => 0), 0);
  assert.equal(stampTilt({}, () => 0), 0);
  for (let i = 0; i < 50; i++) {
    const t = stampTilt({ category: 'Carimbos' });
    assert.ok(t >= -3 && t <= 3);
  }
});

test('library defaults: categorias da C5 (objetos, postal, marcas de investigação…) entram sem tinta; rabiscos e códigos imprimem', async () => {
  const { defaultsFor, stampTilt } = await import('../src/editor/library-defaults.js');
  for (const category of ['Objetos', 'Interfaces', 'Postal', 'Marcas de investigação', 'Emblemas do universo']) {
    const d = defaultsFor({ category, name: 'x', id: 'casa-x' });
    assert.equal(d.blend, 'normal', category);
    assert.equal(d.tint, undefined, `${category}: sem tinta`);
  }
  assert.equal(defaultsFor({ category: 'Rabiscos à mão', name: 'x', id: 'casa-rabisco-x' }).blend, 'multiply');
  assert.equal(defaultsFor({ category: 'Códigos', name: 'x', id: 'casa-codigo-x' }).blend, 'multiply');
  assert.equal(defaultsFor({ category: 'Emblemas do universo', name: 'x', id: 'casa-emblema-universo-die-carimbo' }).blend, 'multiply');
  assert.ok(defaultsFor({ category: 'Carimbos brasileiros', name: 'x', id: 'casa-carimbo-br-x' }).tint);
  assert.equal(stampTilt({ category: 'Objetos' }, () => 1), 0);
  assert.notEqual(stampTilt({ category: 'Carimbos brasileiros' }, () => 1), 0);
});
