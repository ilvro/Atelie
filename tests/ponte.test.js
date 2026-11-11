import test from 'node:test';
import assert from 'node:assert/strict';
import { ferramentasDoAtelie, criarRegistroDeCriados, aplicarPedido, NOME_DA_CAMADA_UV } from '../src/ponte.js';
import { registrarPista, refDoDocumento } from '../src/mesa.js';
import { createHandout, textLayer, setField, addLayer } from '../src/domain/handouts.js';

const MODELOS = [
  { id: 'tpl-carta', kind: 'template', name: 'Carta envelhecida', category: 'Cartas e bilhetes', era: '1890', tom: 'horror', fields: ['Destinatário', 'Corpo'], tags: ['carta'] },
  { id: 'tpl-jornal', kind: 'template', name: 'Jornal sensacionalista', category: 'Imprensa', era: '1920', tom: 'investigação', fields: ['Manchete'], tags: [] },
];

function modeloDeCarta() {
  let h = createHandout({ name: 'Carta envelhecida', preset: 'note' });
  const dest = textLayer({ name: 'Destinatário', text: { content: 'Caro senhor' } });
  const corpo = textLayer({ name: 'Corpo', text: { content: 'Texto original' } });
  h = addLayer(addLayer(h, dest), corpo);
  h = setField(setField(h, dest.id, 'Destinatário'), corpo.id, 'Corpo');
  return h;
}

/** Contexto de teste: um "armazenamento" de documentos e uma aba aberta. */
function criarContexto({ confirmar = async () => true, campanha = true, existentes = [] } = {}) {
  const docs = new Map(existentes.map(d => [d.id, d]));
  const memoria = new Map();
  const log = { confirmacoes: [], pistas: [], arquivados: 0 };
  let aberto = null;
  const ctx = {
    modelos: async () => MODELOS,
    instanciar: async () => { const h = { ...modeloDeCarta(), id: `00000000-0000-4000-8000-${String(docs.size + 1).padStart(12, '0')}`, revision: 0 }; aberto = h; return h; },
    abrir: async id => { aberto = structuredClone(docs.get(id)); },
    documentoAberto: () => aberto,
    aplicar: h => { aberto = h; },
    arquivar: async () => { log.arquivados++; docs.set(aberto.id, { ...structuredClone(aberto), revision: (docs.get(aberto.id)?.revision ?? 0) + 1 }); },
    listarDocumentos: async () => [...docs.values()].map(d => ({ id: d.id, name: d.name, category: d.category, tags: d.tags, revision: d.revision, hasUv: d.layers.some(l => l.light === 'uv') })),
    lerDocumento: async id => docs.get(id) ?? null,
    registrarPista: async h => { log.pistas.push(h.id); return campanha ? { registrada: true } : { registrada: false, motivo: 'sem campanha ativa na Mesa' }; },
    refDoDocumento: id => `mesa:atelie/documento/${id}`,
    confirmar: async t => { log.confirmacoes.push(t); return confirmar(t); },
    criados: criarRegistroDeCriados({ getItem: k => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v) }),
  };
  const ferramentas = Object.fromEntries(ferramentasDoAtelie(ctx).map(f => [f.nome, f]));
  const chamar = async (nome, args = {}) => JSON.parse((await ferramentas[nome].executar(args))[0].texto);
  return { ctx, ferramentas, chamar, docs, log };
}

test('expõe as cinco ferramentas, com prefixo atelie_', () => {
  const { ferramentas } = criarContexto();
  assert.deepEqual(Object.keys(ferramentas).sort(), ['atelie_documento_criar', 'atelie_documento_editar', 'atelie_documento_ler', 'atelie_documentos_listar', 'atelie_modelos_listar']);
});

test('modelos_listar: filtra por categoria, era (id ou rótulo) e tom, e devolve os campos', async () => {
  const { chamar } = criarContexto();
  const todos = await chamar('atelie_modelos_listar');
  assert.equal(todos.total, 2);
  const cartas = await chamar('atelie_modelos_listar', { categoria: 'cartas e bilhetes' });
  assert.equal(cartas.total, 1);
  assert.deepEqual(cartas.modelos[0].campos, ['Destinatário', 'Corpo']);
  assert.equal((await chamar('atelie_modelos_listar', { era: 'Anos 1920' })).modelos[0].id, 'tpl-jornal');
  assert.equal((await chamar('atelie_modelos_listar', { tom: 'investigacao' })).total, 1);
  assert.equal((await chamar('atelie_modelos_listar', { busca: 'destinatario' })).modelos[0].id, 'tpl-carta');
});

test('modelos_listar: no máximo 40 por resposta, com o total', async () => {
  const { ctx, ferramentas } = criarContexto();
  ctx.modelos = async () => Array.from({ length: 55 }, (_, i) => ({ id: `m${i}`, name: `Modelo ${i}`, fields: [] }));
  const r = JSON.parse((await ferramentas.atelie_modelos_listar.executar({}))[0].texto);
  assert.equal(r.total, 55);
  assert.equal(r.modelos.length, 40);
});

test('criar: preenche os campos, acrescenta a camada UV, arquiva e registra a pista', async () => {
  const { chamar, docs, log, ctx } = criarContexto();
  const r = await chamar('atelie_documento_criar', { modelo: 'tpl-carta', nome: 'Carta do informante', campos: { Corpo: 'Sei onde está a sua família.' }, textoUV: 'Rua das Acácias, 12' });
  const salvo = docs.get(r.id);
  assert.equal(salvo.name, 'Carta do informante');
  assert.equal(salvo.revision, 1);
  assert.equal(salvo.layers.find(l => l.name === 'Corpo').text.content, 'Sei onde está a sua família.');
  const uv = salvo.layers.find(l => l.light === 'uv');
  assert.equal(uv.name, NOME_DA_CAMADA_UV);
  assert.equal(uv.text.content, 'Rua das Acácias, 12');
  assert.equal(uv.text.font.family, salvo.layers.find(l => l.name === 'Corpo').text.font.family);
  assert.equal(r.ref, `mesa:atelie/documento/${r.id}`);
  assert.equal(log.arquivados, 1);
  assert.deepEqual(log.pistas, [r.id]);
  assert.equal(ctx.criados.tem(r.id), true);
});

test('criar: campo desconhecido volta em ignorados; modelo desconhecido é erro com a dica', async () => {
  const { chamar } = criarContexto();
  const r = await chamar('atelie_documento_criar', { modelo: 'tpl-carta', nome: 'X', campos: { Corpo: 'ok', Inexistente: 'nada' } });
  assert.deepEqual(r.ignorados, ['Inexistente']);
  await assert.rejects(chamar('atelie_documento_criar', { modelo: 'nao-existe', nome: 'X' }), /atelie_modelos_listar/);
});

test('criar: sem campanha ativa a resposta diz isso', async () => {
  const { chamar } = criarContexto({ campanha: false });
  const r = await chamar('atelie_documento_criar', { modelo: 'tpl-carta', nome: 'X' });
  assert.match(r.pista, /sem campanha ativa na Mesa/);
});

test('editar: documento criado pelo assistente não pede confirmação', async () => {
  const { chamar, log, docs } = criarContexto();
  const c = await chamar('atelie_documento_criar', { modelo: 'tpl-carta', nome: 'A' });
  const r = await chamar('atelie_documento_editar', { id: c.id, nome: 'B', textoUV: 'segredo' });
  assert.equal(log.confirmacoes.length, 0);
  assert.equal(r.revisao, 2);
  assert.equal(docs.get(c.id).name, 'B');
  assert.equal(docs.get(c.id).layers.filter(l => l.light === 'uv').length, 1);
});

test('editar: documento alheio sem confirmação volta "o mestre recusou" e não arquiva', async () => {
  const alheio = { ...modeloDeCarta(), id: '11111111-1111-4111-8111-111111111111', revision: 3 };
  const { chamar, log } = criarContexto({ confirmar: async () => false, existentes: [alheio] });
  await assert.rejects(chamar('atelie_documento_editar', { id: alheio.id, nome: 'Outro' }), /O mestre recusou/);
  assert.equal(log.confirmacoes.length, 1);
  assert.equal(log.arquivados, 0);
});

test('editar: documento alheio confirmado é alterado e não vira pista', async () => {
  const alheio = { ...modeloDeCarta(), id: '11111111-1111-4111-8111-111111111111', revision: 3 };
  const { chamar, log, docs } = criarContexto({ existentes: [alheio] });
  const r = await chamar('atelie_documento_editar', { id: alheio.id, campos: { Corpo: 'novo' } });
  assert.equal(r.revisao, 4);
  assert.equal(docs.get(alheio.id).layers.find(l => l.name === 'Corpo').text.content, 'novo');
  assert.deepEqual(log.pistas, []);
});

test('editar: sem nada a mudar é erro; textoUV vazio remove a camada UV', async () => {
  const { chamar, docs } = criarContexto();
  const c = await chamar('atelie_documento_criar', { modelo: 'tpl-carta', nome: 'A', textoUV: 'x' });
  await assert.rejects(chamar('atelie_documento_editar', { id: c.id }), /Nada a alterar/);
  await chamar('atelie_documento_editar', { id: c.id, textoUV: '' });
  assert.equal(docs.get(c.id).layers.some(l => l.light === 'uv'), false);
});

test('listar e ler: campos com o texto atual, UV, revisão e se foi criado pelo assistente', async () => {
  const { chamar } = criarContexto();
  const c = await chamar('atelie_documento_criar', { modelo: 'tpl-carta', nome: 'Carta', campos: { Corpo: 'oi' }, textoUV: 'oculto' });
  const lista = await chamar('atelie_documentos_listar', { busca: 'carta' });
  assert.equal(lista.total, 1);
  assert.equal(lista.documentos[0].temUV, true);
  assert.equal(lista.documentos[0].criadoPeloAssistente, true);
  const lido = await chamar('atelie_documento_ler', { id: c.id });
  assert.deepEqual(lido.campos.find(x => x.rotulo === 'Corpo'), { rotulo: 'Corpo', texto: 'oi' });
  assert.equal(lido.textoUV, 'oculto');
  assert.equal(lido.revisao, 1);
  await assert.rejects(chamar('atelie_documento_ler', { id: 'nada' }), /atelie_documentos_listar/);
});

test('aplicarPedido não muda o original', () => {
  const original = modeloDeCarta();
  const { handout } = aplicarPedido(original, { campos: { corpo: 'x' }, textoUV: 'y' });
  assert.equal(original.layers.some(l => l.light === 'uv'), false);
  assert.equal(handout.layers.find(l => l.name === 'Corpo').text.content, 'x');
});

test('registro de criados: sobrevive a armazenamento que falha', () => {
  const quebrado = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const r = criarRegistroDeCriados(quebrado);
  assert.doesNotThrow(() => r.marcar('a'));
  assert.equal(r.tem('a'), false);
});

test('registrarPista: cria a pista com a ref do documento, sem duplicar', async () => {
  const entidades = [];
  const repo = {
    entidadeDaRef: async (_c, ref) => entidades.find(e => e.refs.some(r => r.id === ref.id)),
    criarEntidade: async d => { const e = { id: `e${entidades.length}`, criadaPor: 'atelie', ...d }; entidades.push(e); return e; },
    salvarEntidade: async e => { entidades[entidades.findIndex(x => x.id === e.id)] = e; },
    fechar() {},
  };
  const amb = { campanhaId: 'c1', abrir: async () => repo };
  const h = { id: 'doc1', name: 'Carta' };
  assert.equal((await registrarPista(h, amb)).registrada, true);
  assert.deepEqual(entidades[0].refs, [refDoDocumento('doc1')]);
  assert.equal(entidades[0].tipo, 'pista');
  await registrarPista({ ...h, name: 'Carta 2' }, amb);
  assert.equal(entidades.length, 1);
  assert.equal(entidades[0].nome, 'Carta 2');
});

test('registrarPista: sem campanha ativa não abre nada', async () => {
  let abriu = false;
  const r = await registrarPista({ id: 'd', name: 'x' }, { campanhaId: null, abrir: async () => { abriu = true; } });
  assert.equal(r.registrada, false);
  assert.match(r.motivo, /sem campanha ativa na Mesa/);
  assert.equal(abriu, false);
});

test('orçamento: descrições até 400 caracteres e campos até 80', () => {
  const nada = new Proxy(function () {}, { get: () => nada, apply: () => nada });
  const varrer = o => !o || typeof o !== 'object' ? [] : [...(typeof o.description === 'string' && o.description.length > 80 ? [o.description] : []), ...Object.values(o).flatMap(varrer)];
  for (const t of ferramentasDoAtelie(nada)) { assert.ok(t.descricao.length <= 400, t.nome); assert.deepEqual(varrer(t.esquema), [], t.nome); }
});
