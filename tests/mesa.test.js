import test from 'node:test';
import assert from 'node:assert/strict';
import { criarBarramento, criarRef } from '../vendor/mesa-core/index.js';
import { iniciarMesa, refDoDocumento } from '../src/mesa.js';

/** Dois canais ligados: o que um posta, o outro recebe (como duas abas). */
function parDeCanais() {
  const a = { postMessage: m => queueMicrotask(() => b.onmessage?.({ data: m })), onmessage: null, close() {} };
  const b = { postMessage: m => queueMicrotask(() => a.onmessage?.({ data: m })), onmessage: null, close() {} };
  return [() => a, () => b];
}
const ambienteDe = (criarCanal) => ({ BroadcastChannel: class {}, criarCanal });
const DOC = '6f1c0d52-1c7e-4a58-9d4c-2f4b6c9a1e01';

test('refDoDocumento: mesa:atelie/documento/<id>', () => {
  assert.deepEqual(refDoDocumento(DOC), { app: 'atelie', tipo: 'documento', id: DOC });
});

test('sem BroadcastChannel o módulo não faz nada e não quebra', () => {
  const sem = iniciarMesa({ existe: async () => true, abrir: async () => {} }, { BroadcastChannel: undefined });
  assert.doesNotThrow(() => { sem.documentoSalvo({ id: DOC, revision: 1 }); sem.parar(); });
});

test('atelie.abrir: abre o documento pedido e responde ok', async () => {
  const [canalAtelie, canalPedinte] = parDeCanais();
  const abertos = [];
  iniciarMesa({ existe: async id => id === DOC, abrir: async id => { abertos.push(id); } }, ambienteDe(canalAtelie));
  const atlas = criarBarramento({ app: 'atlas', campanhaId: null, criarCanal: canalPedinte });
  const r = await atlas.pedir('atelie.abrir', { ref: refDoDocumento(DOC) });
  assert.equal(r.ok, true);
  assert.deepEqual(abertos, [DOC]);
});

test('atelie.abrir: documento que não existe aqui é recusado com motivo, sem abrir nada', async () => {
  const [canalAtelie, canalPedinte] = parDeCanais();
  const abertos = [];
  iniciarMesa({ existe: async () => false, abrir: async id => { abertos.push(id); } }, ambienteDe(canalAtelie));
  const atlas = criarBarramento({ app: 'atlas', campanhaId: null, criarCanal: canalPedinte });
  const r = await atlas.pedir('atelie.abrir', { ref: refDoDocumento(DOC) });
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'recusado');
  assert.match(r.detalhe, /não existe/);
  assert.deepEqual(abertos, []);
});

test('atelie.abrir: ref de outro aplicativo ou tipo é recusada; erro ao procurar vira "não existe"', async () => {
  const [canalAtelie, canalPedinte] = parDeCanais();
  const abertos = [];
  iniciarMesa({ existe: async () => { throw new Error('banco fora do ar'); }, abrir: async id => { abertos.push(id); } }, ambienteDe(canalAtelie));
  const atlas = criarBarramento({ app: 'atlas', campanhaId: null, criarCanal: canalPedinte });
  const outro = await atlas.pedir('atelie.abrir', { ref: criarRef('ficha', 'ficha', 'sheet-1') });
  assert.equal(outro.ok, false); assert.match(outro.detalhe, /só abre documentos seus/);
  const tipo = await atlas.pedir('atelie.abrir', { ref: criarRef('atelie', 'pasta', 'x') });
  assert.equal(tipo.ok, false);
  const erro = await atlas.pedir('atelie.abrir', { ref: refDoDocumento(DOC) });
  assert.equal(erro.ok, false); assert.match(erro.detalhe, /não existe/);
  assert.deepEqual(abertos, []);
});

test('documentoSalvo emite atelie.documento-salvo com a ref e a revisão', async () => {
  const [canalAtelie, canalOuvinte] = parDeCanais();
  const mesa = iniciarMesa({ existe: async () => true, abrir: async () => {} }, ambienteDe(canalAtelie));
  const ouvinte = criarBarramento({ app: 'mesa', campanhaId: null, criarCanal: canalOuvinte });
  const recebidos = [];
  ouvinte.ouvir('atelie.documento-salvo', e => recebidos.push(e));
  mesa.documentoSalvo({ id: DOC, revision: 7 });
  mesa.documentoSalvo({});            // sem id: ignorado
  await new Promise(r => setTimeout(r, 20));
  assert.equal(recebidos.length, 1);
  assert.deepEqual(recebidos[0].dados.documento, refDoDocumento(DOC));
  assert.equal(recebidos[0].dados.revisao, 7);
  assert.equal(recebidos[0].app, 'atelie');
});

test('o manifesto do Ateliê é válido no contrato', async () => {
  const { validarManifesto } = await import('../vendor/mesa-core/index.js');
  const { readFile } = await import('node:fs/promises');
  const v = validarManifesto(JSON.parse(await readFile(new URL('../public/mesa.json', import.meta.url), 'utf8')));
  assert.equal(v.ok, true, v.erro);
  assert.deepEqual(v.manifesto.atende, ['atelie.abrir']);
});
