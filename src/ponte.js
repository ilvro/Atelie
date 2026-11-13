// Ponte do assistente (só em desenvolvimento; carregada por `main.js` dentro de `if (import.meta.env.DEV)`).
// As ferramentas são criadas por `ferramentasDoAtelie(ctx)`, um contexto injetável: testam-se sem navegador.
// O contexto (montado em `main.js`) entrega o que o Ateliê sabe fazer; nada aqui toca o DOM ou o `localStorage` direto,
// exceto `iniciarPonte`, que liga as peças reais.
import { json } from '../vendor/mesa-core/ponte.js';
import { addLayer, fillFields, inheritedTextStyle, insertionIndex, removeLayer, textLayer, updateLayer, validateHandout } from './domain/handouts.js';

export const MAXIMO_DE_MODELOS = 40;
export const NOME_DA_CAMADA_UV = 'Texto UV';
export const TIPOS_DE_IMAGEM = ['image/png', 'image/jpeg', 'image/webp'];
export const MAXIMO_DE_IMAGEM = 15 * 1024 * 1024;
const CHAVE_CRIADOS = 'atelie:ponte-criados';
const MAXIMO_DE_CRIADOS = 500;

const ERAS = { medieval: 'Medieval', 1890: 'Anos 1890', 1920: 'Anos 1920', 1950: 'Anos 1950', 1980: 'Anos 1980', hoje: 'Hoje' };
const TONS = { 'investigação': 'Investigação', horror: 'Horror', fantasia: 'Fantasia', cotidiano: 'Cotidiano', 'sci-fi': 'Ficção científica' };

/** Minúsculas e sem acentos, para comparar. */
const norm = v => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const mesmo = (a, b) => norm(a) === norm(b);
/** Aceita o id (`1890`) ou o rótulo (`Anos 1890`). */
const bate = (valor, rotulos, pedido) => mesmo(valor, pedido) || mesmo(rotulos[valor] ?? '', pedido);

const textoDe = h => (h.layers || []).filter(l => l.kind === 'text');
const camadaUV = h => (h.layers || []).find(l => l.kind === 'text' && l.light === 'uv' && l.name === NOME_DA_CAMADA_UV)
  ?? (h.layers || []).find(l => l.kind === 'text' && l.light === 'uv');

/** Os campos de texto do documento: `[{ rotulo, layerId, texto }]` (os de imagem ficam em `camposDeImagemDoDocumento`). */
export function camposDoDocumento(h) {
  const saida = [];
  for (const f of h.fields || []) {
    const camada = (h.layers || []).find(l => l.id === f.layerId);
    if (camada?.kind === 'text' && camada.text) saida.push({ rotulo: f.label, layerId: f.layerId, texto: camada.text.content ?? '' });
  }
  return saida;
}

/** Os campos de imagem do documento: `[{ rotulo, layerId, temImagem }]`. */
export function camposDeImagemDoDocumento(h) {
  const saida = [];
  for (const f of h.fields || []) {
    const camada = (h.layers || []).find(l => l.id === f.layerId);
    if (camada?.kind === 'image') saida.push({ rotulo: f.label, layerId: f.layerId, temImagem: Boolean(camada.image?.src) });
  }
  return saida;
}

/** Base64 → bytes (`atob` existe no navegador e no Node). Lança se não for base64 válido. */
function bytesDeBase64(texto) {
  const bin = atob(String(texto ?? '').replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Aplica ao documento o que o assistente pediu (nome, categoria, tags, campos, texto UV), sem mutar o original.
 * Devolve `{ handout, ignorados, mudou }`: `ignorados` são os rótulos que o documento não tem.
 */
export function aplicarPedido(handout, { nome, categoria, tags, campos, textoUV } = {}) {
  let h = structuredClone(handout);
  const ignorados = [];
  let mudou = false;
  if (typeof nome === 'string' && nome.trim() && nome.trim() !== h.name) { h.name = nome.trim(); mudou = true; }
  if (typeof categoria === 'string' && categoria !== h.category) { h.category = categoria; mudou = true; }
  if (Array.isArray(tags)) { h.tags = tags.map(String).map(t => t.trim()).filter(Boolean); mudou = true; }

  if (campos && typeof campos === 'object') {
    const existentes = camposDoDocumento(h);
    for (const [rotulo, valor] of Object.entries(campos)) {
      const alvo = existentes.find(c => c.rotulo === rotulo) ?? existentes.find(c => mesmo(c.rotulo, rotulo));
      if (!alvo) { ignorados.push(rotulo); continue; }
      const camada = h.layers.find(l => l.id === alvo.layerId);
      camada.text.content = String(valor ?? '');
      mudou = true;
    }
  }

  if (typeof textoUV === 'string') {
    const atual = camadaUV(h);
    if (atual && textoUV === '') { h = removeLayer(h, atual.id); mudou = true; }
    else if (atual) { h = updateLayer(h, atual.id, { text: { ...atual.text, content: textoUV } }); mudou = true; }
    else if (textoUV !== '') {
      const { width, height } = h.page;
      const camada = textLayer({
        name: NOME_DA_CAMADA_UV, light: 'uv',
        x: Math.round(width * 0.08), y: Math.round(height * 0.78), width: Math.round(width * 0.84), height: Math.round(height * 0.14),
        text: { ...(inheritedTextStyle(h) ?? {}), content: textoUV },
      });
      h = addLayer(h, camada, insertionIndex(h, camada));
      mudou = true;
    }
  }
  return { handout: h, ignorados, mudou };
}

const resumoDoModelo = m => ({
  id: m.id, nome: m.name, categoria: m.category ?? '', era: m.era ?? null, tom: m.tom ?? null,
  campos: Array.isArray(m.fields) ? m.fields : [],
});

const resumoDoDocumento = (h, ctx) => ({
  id: h.id, nome: h.name, categoria: h.category ?? '', tags: h.tags ?? [], temUV: (h.layers || []).some(l => l.visible !== false && l.light === 'uv'),
  revisao: h.revision, criadoPeloAssistente: ctx.criados.tem(h.id),
});

const esquemaCampos = { type: 'object', additionalProperties: { type: 'string' }, description: 'Texto por rótulo de campo.' };

export function ferramentasDoAtelie(ctx) {
  const exigir = (cond, msg) => { if (!cond) throw new Error(msg); };
  const achar = async (id) => {
    const h = await ctx.lerDocumento(String(id ?? ''));
    if (!h) throw new Error(`Não há documento com id "${id}". Use atelie_documentos_listar.`);
    return h;
  };
  const lerEArquivar = async (id, textoDeFalha) => {
    await ctx.arquivar();
    const salvo = await ctx.lerDocumento(id);
    if (!salvo || !(salvo.revision >= 1)) throw new Error(textoDeFalha);
    return salvo;
  };
  const pistaDe = async (salvo) => {
    try {
      const r = await ctx.registrarPista(salvo);
      return r.registrada ? 'registrada como pista na campanha ativa' : (r.motivo || 'sem campanha ativa na Mesa');
    } catch (erro) {
      return `não registrada (${erro?.message ?? erro})`;
    }
  };
  const confirmarAlheio = async (h) => {
    if (ctx.criados.tem(h.id)) return;
    const ok = await ctx.confirmar(`O assistente quer alterar o documento "${h.name}", que ele não criou. Permitir?`);
    if (!ok) throw new Error(`O mestre recusou a alteração do documento "${h.name}". Não insista; pergunte o que fazer ou crie um documento novo com atelie_documento_criar.`);
  };
  const validarPedido = args => {
    if (args.campos !== undefined && (typeof args.campos !== 'object' || args.campos === null || Array.isArray(args.campos))) throw new Error('"campos" deve ser um objeto { rótulo: texto }.');
    if (args.textoUV !== undefined && typeof args.textoUV !== 'string') throw new Error('"textoUV" deve ser texto.');
    if (args.tags !== undefined && !Array.isArray(args.tags)) throw new Error('"tags" deve ser uma lista de textos.');
  };

  return [
    {
      nome: 'atelie_modelos_listar',
      descricao: `Lista modelos de documento (id, nome, categoria, época, tom e os CAMPOS que aceitam), no máximo ${MAXIMO_DE_MODELOS}. Filtra por busca, categoria, era, tom. Detalhes: plataforma_guia ferramentas-atelie.`,
      esquema: {
        type: 'object', additionalProperties: false,
        properties: {
          busca: { type: 'string', description: 'Texto livre.' },
          categoria: { type: 'string', description: 'Ex.: "Cartas e bilhetes".' },
          era: { type: 'string', description: 'Época (valores no guia).' },
          tom: { type: 'string', description: 'Tom (valores no guia).' },
        },
      },
      async executar(args) {
        const todos = await ctx.modelos();
        const busca = norm(args.busca);
        const achados = todos.filter(m => {
          if (args.categoria && !mesmo(m.category, args.categoria)) return false;
          if (args.era && !bate(m.era, ERAS, args.era)) return false;
          if (args.tom && !bate(m.tom, TONS, args.tom)) return false;
          if (busca) {
            const palheiro = norm([m.name, m.category, (m.fields || []).join(' '), (m.tags || []).join(' '), ERAS[m.era] ?? m.era, TONS[m.tom] ?? m.tom, m.orgNome, m.org, m.description].filter(Boolean).join(' '));
            if (!busca.split(/\s+/).every(p => palheiro.includes(p))) return false;
          }
          return true;
        });
        return [json({ total: achados.length, mostrados: Math.min(achados.length, MAXIMO_DE_MODELOS), modelos: achados.slice(0, MAXIMO_DE_MODELOS).map(resumoDoModelo) })];
      },
    },
    {
      nome: 'atelie_documento_criar',
      descricao: 'Cria um documento (pista) de um modelo: preenche campos, texto UV opcional, arquiva e registra na campanha. Modelo e rótulos vêm de atelie_modelos_listar. Detalhes: plataforma_guia ferramentas-atelie.',
      esquema: {
        type: 'object', required: ['modelo', 'nome'], additionalProperties: false,
        properties: {
          modelo: { type: 'string', description: 'De atelie_modelos_listar.' },
          nome: { type: 'string', description: 'Nome do documento.' },
          campos: esquemaCampos,
          textoUV: { type: 'string', description: 'Visível só sob a luz UV.' },
          categoria: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      async executar(args) {
        exigir(typeof args.modelo === 'string' && args.modelo.trim(), '"modelo" é obrigatório. Use atelie_modelos_listar.');
        exigir(typeof args.nome === 'string' && args.nome.trim(), '"nome" é obrigatório.');
        validarPedido(args);
        const modelos = await ctx.modelos();
        const modelo = modelos.find(m => m.id === args.modelo) ?? modelos.find(m => mesmo(m.name, args.modelo));
        if (!modelo) throw new Error(`Não há modelo "${args.modelo}". Use atelie_modelos_listar para ver os ids.`);

        const doc = await ctx.instanciar(modelo.id);
        ctx.criados.marcar(doc.id);
        const { handout, ignorados } = aplicarPedido(doc, args);
        const invalido = (() => { try { validateHandout(handout); return null; } catch (e) { return e; } })();
        if (invalido) throw new Error(`O documento ficou inválido (${invalido.message}). Revise os textos e tente de novo.`);
        ctx.aplicar(handout);
        const salvo = await lerEArquivar(doc.id, 'Não consegui arquivar o documento (veja o aviso no Ateliê). Ele ficou aberto numa aba, sem arquivar.');
        const pista = await pistaDe(salvo);
        return [json({ id: salvo.id, ref: ctx.refDoDocumento(salvo.id), nome: salvo.name, revisao: salvo.revision, ignorados, pista })];
      },
    },
    {
      nome: 'atelie_documento_editar',
      descricao: 'Edita um documento: nome, campos e/ou texto UV; arquiva de novo. O mestre confirma se não é do assistente (recusa: não insista). Detalhes: plataforma_guia ferramentas-atelie.',
      esquema: {
        type: 'object', required: ['id'], additionalProperties: false,
        properties: {
          id: { type: 'string', description: 'De atelie_documentos_listar.' },
          nome: { type: 'string' },
          campos: esquemaCampos,
          textoUV: { type: 'string', description: '"" remove.' },
        },
      },
      async executar(args) {
        validarPedido(args);
        const atual = await achar(args.id);
        await confirmarAlheio(atual);
        await ctx.abrir(atual.id);
        const aberto = ctx.documentoAberto();
        if (!aberto || aberto.id !== atual.id) throw new Error('Não consegui abrir o documento no Ateliê. Peça ao mestre para abrir o Ateliê e tente de novo.');
        const { handout, ignorados, mudou } = aplicarPedido(aberto, { nome: args.nome, campos: args.campos, textoUV: args.textoUV });
        if (!mudou) throw new Error(ignorados.length ? `Nenhum campo bateu: ${ignorados.join(', ')}. Veja os rótulos com atelie_documento_ler.` : 'Nada a alterar: passe nome, campos ou textoUV.');
        ctx.aplicar(handout);
        const salvo = await lerEArquivar(atual.id, 'Não consegui arquivar a edição (veja o aviso no Ateliê). A mudança ficou na aba, sem arquivar.');
        const pista = ctx.criados.tem(salvo.id) ? await pistaDe(salvo) : undefined;
        return [json({ id: salvo.id, ref: ctx.refDoDocumento(salvo.id), nome: salvo.name, revisao: salvo.revision, ignorados, ...(pista ? { pista } : {}) })];
      },
    },
    {
      nome: 'atelie_imagem_receber',
      descricao: 'Interna: usada por atelie_imagem_definir.',
      esquema: {
        type: 'object', required: ['id', 'campo', 'imagem', 'tipo'], additionalProperties: false,
        properties: {
          id: { type: 'string', description: 'Id do documento.' },
          campo: { type: 'string', description: 'Rótulo ou layerId do campo de imagem.' },
          imagem: { type: 'string', description: 'Imagem codificada em base64.' },
          tipo: { type: 'string', enum: TIPOS_DE_IMAGEM, description: 'Tipo MIME.' },
        },
      },
      anotacoes: { destrutiva: false },
      async executar(args) {
        exigir(TIPOS_DE_IMAGEM.includes(args.tipo), `Tipo de imagem "${args.tipo}" não aceito: use ${TIPOS_DE_IMAGEM.join(', ')}.`);
        exigir(typeof args.campo === 'string' && args.campo.trim(), '"campo" é obrigatório.');
        let bytes;
        try { bytes = bytesDeBase64(args.imagem); } catch { throw new Error('A imagem não é base64 válido.'); }
        exigir(bytes.length > 0, 'A imagem veio vazia.');
        exigir(bytes.length <= MAXIMO_DE_IMAGEM, 'A imagem passa de 15 MB.');
        const atual = await achar(args.id);
        const campos = camposDeImagemDoDocumento(atual);
        const lista = campos.length ? campos.map(c => `"${c.rotulo}"`).join(', ') : '(este documento não tem campos de imagem)';
        const alvo = campos.find(c => c.layerId === args.campo) ?? campos.find(c => c.rotulo === args.campo) ?? campos.find(c => mesmo(c.rotulo, args.campo));
        if (!alvo) throw new Error(`O documento "${atual.name}" não tem o campo de imagem "${args.campo}". Campos de imagem: ${lista}.`);
        await confirmarAlheio(atual);
        await ctx.abrir(atual.id);
        const aberto = ctx.documentoAberto();
        if (!aberto || aberto.id !== atual.id) throw new Error('Não consegui abrir o documento no Ateliê. Peça ao mestre para abrir o Ateliê e tente de novo.');
        const enviada = await ctx.guardarImagem(bytes, args.tipo);
        ctx.aplicar(fillFields(aberto, { [alvo.layerId]: { upload: enviada.id } }));
        const salvo = await lerEArquivar(atual.id, 'Não consegui arquivar a imagem (veja o aviso no Ateliê). A mudança ficou na aba, sem arquivar.');
        const pista = ctx.criados.tem(salvo.id) ? await pistaDe(salvo) : undefined;
        return [json({ definido: true, campo: alvo.rotulo, id: salvo.id, revisao: salvo.revision, ...(pista ? { pista } : {}) })];
      },
    },
    {
      nome: 'atelie_documentos_listar',
      descricao: 'Lista os documentos arquivados (recentes primeiro): id, nome, categoria, tags, UV, revisão.',
      esquema: { type: 'object', additionalProperties: false, properties: { busca: { type: 'string', description: 'Nome, categoria ou tag.' } } },
      async executar(args) {
        const busca = norm(args.busca);
        const lista = (await ctx.listarDocumentos()).filter(d => !busca || norm([d.name, d.category, (d.tags || []).join(' ')].join(' ')).includes(busca));
        return [json({ total: lista.length, documentos: lista.map(d => ({
          id: d.id, nome: d.name, categoria: d.category ?? '', tags: d.tags ?? [], temUV: Boolean(d.hasUv), revisao: d.revision, criadoPeloAssistente: ctx.criados.tem(d.id),
        })) })];
      },
    },
    {
      nome: 'atelie_documento_ler',
      descricao: 'Lê um documento: campos com o texto atual, texto UV e revisão.',
      esquema: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string' } } },
      async executar(args) {
        const h = await achar(args.id);
        const uv = (h.layers || []).filter(l => l.kind === 'text' && l.light === 'uv').map(l => l.text?.content ?? '');
        return [json({
          ...resumoDoDocumento(h, ctx), ref: ctx.refDoDocumento(h.id),
          campos: camposDoDocumento(h).map(({ rotulo, texto }) => ({ rotulo, texto })),
          camposDeImagem: camposDeImagemDoDocumento(h),
          ...(uv.length ? { textoUV: uv.join('\n\n') } : {}),
          outrosTextos: textoDe(h).filter(l => l.light !== 'uv' && !(h.fields || []).some(f => f.layerId === l.id)).length,
        })];
      },
    },
  ];
}

/** Ids criados pelo assistente, no `localStorage` (só em desenvolvimento); `armazenamento` injetável. */
export function criarRegistroDeCriados(armazenamento = globalThis.localStorage) {
  const ler = () => { try { const v = JSON.parse(armazenamento?.getItem(CHAVE_CRIADOS) ?? '[]'); return Array.isArray(v) ? v.map(String) : []; } catch { return []; } };
  return {
    tem: id => ler().includes(String(id)),
    marcar(id) {
      try { const l = ler().filter(x => x !== String(id)); l.push(String(id)); armazenamento?.setItem(CHAVE_CRIADOS, JSON.stringify(l.slice(-MAXIMO_DE_CRIADOS))); } catch { /* sem armazenamento: o assistente passa a pedir confirmação */ }
    },
  };
}

/**
 * Liga a ponte do assistente. `adaptador` (montado em `main.js`): `{ editor, api, registrarPista, refDoDocumento }`.
 * Fica em `window.__ponteAtelie` só para depuração.
 */
export async function iniciarPonte(adaptador) {
  const { conectarPonte } = await import('../vendor/mesa-core/ponte.js');
  const { editor, api } = adaptador;
  const ctx = {
    modelos: async () => ((await api.library.list())?.items ?? []).filter(i => i.kind === 'template'),
    instanciar: modeloId => editor.instantiateTemplate(modeloId, { newTab: true }),
    abrir: id => editor.openDocumentById(id, { newTab: true }),
    documentoAberto: () => editor.state?.handout ?? null,
    aplicar: handout => editor.state.edit(handout, { label: 'Assistente' }),
    arquivar: () => editor.archive(),
    listarDocumentos: () => api.handouts.list(),
    lerDocumento: async id => { try { return await api.handouts.read(id); } catch { return null; } },
    guardarImagem: async (bytes, tipo) => {
      const ext = tipo === 'image/jpeg' ? 'jpg' : tipo.split('/')[1];
      return api.uploads.send(new File([bytes], `imagem-do-assistente.${ext}`, { type: tipo }));
    },
    registrarPista: adaptador.registrarPista,
    refDoDocumento: adaptador.refDoDocumento,
    confirmar: async texto => globalThis.confirm(texto),
    criados: criarRegistroDeCriados(),
  };
  return conectarPonte({ app: 'atelie', titulo: 'Ateliê', ferramentas: ferramentasDoAtelie(ctx) });
}
