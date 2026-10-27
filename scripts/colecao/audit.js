/**
 * Auditoria dos modelos da coleção da casa. Funciona sobre os JSON gravados (public/colecao/modelos) e
 * as prévias; devolve achados { modelo, nivel: 'erro' | 'aviso', regra, mensagem }.
 *  - erro: quebra o build (a menos que o par modelo+regra esteja em LEGADO, a dívida dos 39 modelos
 *    da Fase C0/C1; modelos novos precisam passar limpos)
 *  - aviso: só informa
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { layoutText } from '../../src/domain/handout-text-layout.js';
import { fontFitsEra, NOMES_PROIBIDOS, INSTITUICOES } from './universo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const colecaoDir = path.resolve(__dirname, '../../public/colecao');

export const ORCAMENTO_BYTES = 60 * 1024 * 1024;
export const TAMANHO_MIN_TEXTO = 14;
export const CONTRASTE_MIN = 3;

/** Pares "slug:regra" aceitos enquanto os modelos antigos não são refeitos. Não crescer: só diminuir. */
export const LEGADO = new Set([
  'bilhete-caderno-rasgado:texto-transborda',
  'boletim-ocorrencia:poucas-camadas',
  'capa-jornal:sem-envelhecimento',
  'carta-datilografada-anos-50:texto-transborda',
  'carta-envelhecida:poucas-camadas',
  'carta-envelope-frente:poucas-camadas',
  'carta-envelope-frente:texto-transborda',
  'carta-envelope-verso:texto-transborda',
  'cartaz-procurado:contraste',
  'cartaz-procurado:texto-transborda',
  'certidao-obito:sem-envelhecimento',
  'certidao-obito:texto-transborda',
  'circulo-ritual:poucas-camadas',
  'classificados:poucas-camadas',
  'conversa-celular:texto-transborda',
  'diario-culto-uv:contraste',
  'diario-culto-uv:poucas-camadas',
  'edito-real:poucas-camadas',
  'edito-real:sem-envelhecimento',
  'email-impresso:poucas-camadas',
  'email-impresso:sem-envelhecimento',
  'ficha-criminal:texto-transborda',
  'internacao-sanatorio:texto-transborda',
  'laudo-pericial:poucas-camadas',
  'laudo-pericial:texto-transborda',
  'mandado:sem-envelhecimento',
  'mandado:texto-transborda',
  'obituario:texto-transborda',
  'pagina-grimorio:poucas-camadas',
  'passagem-trem:texto-transborda',
  'pergaminho-selo:poucas-camadas',
  'pergaminho-selo:sem-envelhecimento',
  'polaroide-frente:texto-transborda',
  'tela-terminal:contraste',
  'tela-terminal:poucas-camadas',
  'tela-terminal:texto-transborda',
  'laudo-pericial:formulario-curto',
  'prontuario:formulario-curto',
  'receita-medica:formulario-curto',
]);

const MONO = new Set(['Courier Prime', 'Share Tech Mono', 'VT323', 'Special Elite', 'Cutive Mono']);

/** Largura aproximada de um trecho (sem canvas): monoespaçadas 0,6 em; demais 0,5 em. */
export function measureApprox(family) {
  const k = MONO.has(family) ? 0.6 : 0.5;
  return (str, px) => str.length * px * k;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Cor média da prévia por trás da caixa (coordenadas do documento). */
async function paperBehind(previewPath, doc, layer) {
  const img = sharp(previewPath);
  const { width, height } = await img.metadata();
  const sx = width / doc.page.width, sy = height / doc.page.height;
  const left = Math.max(0, Math.floor(layer.x * sx)), top = Math.max(0, Math.floor(layer.y * sy));
  const w = Math.max(1, Math.min(width - left, Math.floor(layer.width * sx)));
  const h = Math.max(1, Math.min(height - top, Math.floor(layer.height * sy)));
  const { channels } = await sharp(previewPath).extract({ left, top, width: w, height: h }).stats();
  return toHex([channels[0].mean, channels[1].mean, channels[2].mean]);
}

const isLarge = doc => Math.max(doc.page.width, doc.page.height) >= 1500 && Math.min(doc.page.width, doc.page.height) >= 1000;
const isAging = l => (l.kind === 'image' && l.blend === 'multiply') || l.kind === 'effect';

export async function auditTemplate(item, { colecaoDir: dir = colecaoDir, libraryIds = new Set() } = {}) {
  const doc = JSON.parse(await fs.readFile(path.join(dir, item.file), 'utf8'));
  const slug = item.file.replace(/^modelos\//, '').replace(/\.json$/, '');
  const out = [];
  const add = (nivel, regra, mensagem) => out.push({ modelo: slug, nivel, regra, mensagem });
  const lorem = /lorem ipsum|dolor sit amet/i;
  const ingles = /\b(the|and|your|with|this|please|dear)\b/i;

  for (const f of doc.fields || []) {
    const layer = doc.layers.find(l => l.id === f.layerId);
    if (layer?.kind === 'image' && !layer.image?.src && layer.allowEmpty !== true) add('erro', 'foto-sem-padrao', `campo de foto "${f.label}" sem foto padrão`);
  }
  if (isLarge(doc)) {
    if (doc.layers.length < 10) add('erro', 'poucas-camadas', `${doc.layers.length} camadas (mínimo 10 num A4/carta)`);
    if (!doc.layers.some(isAging)) add('erro', 'sem-envelhecimento', 'sem camada de textura multiply nem efeito');
  }
  if ((item.tags || []).includes('formulário') && (doc.fields || []).length < 4) add('erro', 'formulario-curto', `formulário com ${(doc.fields || []).length} campos (mínimo 4)`);

  const previewPath = path.join(dir, item.preview);
  for (const l of doc.layers) {
    if (l.kind !== 'text' || !l.text?.content) continue;
    const t = l.text;
    if (t.size < TAMANHO_MIN_TEXTO) add('erro', 'texto-pequeno', `"${l.name}" com ${t.size}px (mínimo ${TAMANHO_MIN_TEXTO})`);
    const r = layoutText(t.content, { measure: measureApprox(t.font.family), width: l.width, height: l.height, size: t.size, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing, align: t.align, box: t.box, fit: 'overflow' });
    if (r.overflow) add('erro', 'texto-transborda', `"${l.name}" não cabe na caixa ${l.width}×${l.height}`);
    if (lorem.test(t.content)) add('erro', 'lorem', `"${l.name}" tem lorem ipsum`);
    for (const nome of NOMES_PROIBIDOS) if (t.content.includes(nome)) add('erro', 'nome-proibido', `"${l.name}" cita "${nome}"`);
    if (ingles.test(t.content) && item.era !== 'hoje' && item.tom !== 'sci-fi') add('aviso', 'ingles', `"${l.name}" parece ter inglês fora de contexto`);
    if (!fontFitsEra(t.font.family, item.era)) add('aviso', 'fonte-epoca', `"${l.name}": ${t.font.family} destoa da época ${item.era}`);
    if (/^#[0-9a-f]{6}$/i.test(t.color || '')) {
      try {
        const fundo = await paperBehind(previewPath, doc, l);
        const c = contrast(t.color, fundo);
        if (c < CONTRASTE_MIN) add('erro', 'contraste', `"${l.name}" com contraste ${c.toFixed(1)}:1 (mínimo ${CONTRASTE_MIN}:1)`);
      } catch { /* prévia ausente: o teste de existência já cobre */ }
    }
  }
  if (item.org && !INSTITUICOES[item.org]) add('erro', 'org-desconhecida', `org "${item.org}" não existe em universo.js`);
  for (const l of doc.layers) {
    const id = l.image?.src?.library;
    if (id && libraryIds.size && !libraryIds.has(id)) add('erro', 'recurso-ausente', `"${l.name}" usa ${id}, que não existe`);
  }
  return out;
}

export async function dirSize(dir) {
  let total = 0;
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? await dirSize(p) : (await fs.stat(p)).size;
  }
  return total;
}

/** Audita todos os modelos do library.json. Devolve { achados, erros (sem LEGADO), tamanho }. */
export async function auditCollection({ colecaoDir: dir = colecaoDir } = {}) {
  const lib = JSON.parse(await fs.readFile(path.join(dir, 'library.json'), 'utf8'));
  const libraryIds = new Set(lib.items.map(i => i.id));
  const achados = [];
  for (const item of lib.items.filter(i => i.kind === 'template')) achados.push(...await auditTemplate(item, { colecaoDir: dir, libraryIds }));
  const tamanho = await dirSize(dir);
  if (tamanho > ORCAMENTO_BYTES) achados.push({ modelo: '(coleção)', nivel: 'erro', regra: 'orcamento', mensagem: `${(tamanho / 1048576).toFixed(1)} MB (orçamento ${ORCAMENTO_BYTES / 1048576} MB)` });
  const erros = achados.filter(a => a.nivel === 'erro' && !LEGADO.has(`${a.modelo}:${a.regra}`));
  return { achados, erros, tamanho };
}

if (process.argv[1] && process.argv[1].endsWith('audit.js')) {
  const { achados, erros, tamanho } = await auditCollection();
  for (const a of achados) console.log(`${a.nivel === 'erro' ? 'ERRO ' : 'aviso'} ${a.modelo} [${a.regra}] ${a.mensagem}`);
  console.log(`\n${achados.length} achados (${erros.length} erros fora do legado); coleção com ${(tamanho / 1048576).toFixed(1)} MB`);
  process.exitCode = erros.length ? 1 : 0;
}
