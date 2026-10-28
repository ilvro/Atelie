/**
 * Compositores dos modelos novos (lotes C8 a C11): montam uma especificação inteira a partir de dados.
 * Tudo vira camadas nomeadas em português e usa só itens `casa-`. Os modelos ficam em lote-*.js, curtos:
 *   formulario()  ficha/auto/laudo datilografado: timbre da instituição, grade de campos, seções, assinaturas, carimbos
 *   carta()       página de escrita corrida (carta, diário, bilhete, prova)
 *   tabela()      colunas com linhas (lançamentos, itens, horários)
 *   modelo()      embrulho final: metadados (época, tom, instituição, etiquetas) e campos
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aging, silhouette } from '../kit.js';
import { INSTITUICOES } from '../universo.js';
import { layoutText } from '../../../src/domain/handout-text-layout.js';
import { measureApprox } from '../audit.js';
import { autofit } from './reforma.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FONTS = JSON.parse(fs.readFileSync(path.join(here, '../../../public/colecao/library.json'), 'utf8')).items.filter(i => i.kind === 'font');

export const A4 = { width: 1240, height: 1754 };

/** A família da coleção com o id certo (sem o id a letra cai na fonte padrão do navegador). */
export function fontRef(family, { bold = false, italic = false } = {}) {
  const same = FONTS.filter(f => f.family === family);
  const want = bold ? 700 : 400;
  const exact = same.find(f => f.weight === want && (f.style === 'italic') === italic) || same.find(f => (f.style === 'italic') === italic) || same[0];
  return { family, library: exact?.id ?? null, weight: exact && !exact.variable ? exact.weight : want, italic: Boolean(italic && exact?.style === 'italic') };
}

/** Camada de texto. `o.field` (nome do campo) marca o texto como campo a preencher. */
export function T(name, content, box, o = {}) {
  const { family = 'Courier Prime', size = 24, color = '#1d1b24', align = 'left', bold = false, italic = false, style = 'typewriter', wear = 0.12, lh = 1.25, field, rot = 0, blend, opacity, light } = o;
  return {
    kind: 'text', name, x: box.x, y: box.y, width: box.w ?? box.width, height: box.h ?? box.height, rotation: rot,
    ...(blend ? { blend } : {}), ...(opacity != null ? { opacity } : {}), ...(light ? { light } : {}),
    ...(field ? { _field: field } : {}),
    text: { content, font: fontRef(family, { bold, italic }), size, color, align, lineHeight: lh, ink: { style, wear, seed: 7 + (name.length % 9) } },
  };
}

export const IMG = (name, id, box, o = {}) => ({
  kind: 'image', name, x: box.x, y: box.y, width: box.w ?? box.width, height: box.h ?? box.height, rotation: o.rot ?? 0,
  ...(o.blend ? { blend: o.blend } : {}), ...(o.opacity != null ? { opacity: o.opacity } : {}), ...(o.light ? { light: o.light } : {}), ...(o._field ? { _field: o._field } : {}),
  image: { src: { library: id }, fit: o.fit || 'stretch', ...(o.filter ? { filter: o.filter } : {}) },
});

export const FOTO = (name, id, box, o = {}) => IMG(name, id, box, { ...o, fit: 'cover', _field: o.field ?? name });

export const RULE = (x, y, w, o = {}) => ({ kind: 'shape', name: o.name || 'Linha', x, y, width: w, height: 0, shape: { type: 'line', stroke: o.color || '#555555', strokeWidth: o.weight || 1.5 } });
export const BOX = (name, box, o = {}) => ({
  kind: 'shape', name, x: box.x, y: box.y, width: box.w ?? box.width, height: box.h ?? box.height, ...(o.opacity != null ? { opacity: o.opacity } : {}), ...(o.blend ? { blend: o.blend } : {}), rotation: o.rot ?? 0,
  shape: { type: o.type || 'rect', fill: o.fill ?? null, stroke: o.stroke ?? null, strokeWidth: o.weight ?? 1, radius: o.radius ?? 0, dash: o.dash || [] },
});

/** Traço à mão livre (forma `path`): `pts` são [x, y] em 0–1 dentro da caixa; `null` separa traços. */
export const TRACO = (name, box, pts, o = {}) => ({
  kind: 'shape', name, x: box.x, y: box.y, width: box.w ?? box.width, height: box.h ?? box.height, rotation: o.rot ?? 0,
  ...(o.opacity != null ? { opacity: o.opacity } : {}), ...(o.blend ? { blend: o.blend } : {}),
  shape: { type: 'path', fill: null, stroke: o.color || '#1d1b24', strokeWidth: o.weight || 3, radius: 0, dash: [], points: pts },
});

/** Altura que um texto ocupa na largura dada (a mesma diagramação aproximada da auditoria). */
export function altura(content, width, size, { family = 'Courier Prime', lh = 1.25 } = {}) {
  const r = layoutText(content, { measure: measureApprox(family), width, height: 99999, size, lineHeight: lh, letterSpacing: 0, align: 'left', box: 'area', fit: 'overflow' });
  return Math.ceil(r.lines.length * size * lh) + 6;
}

const idade = a => a || 'usado';
export const papel = (slug, age = 'usado', page = A4) => IMG('Papel', `casa-papel-${slug}-${age}`, { x: 0, y: 0, w: page.width, h: page.height });

/** Pilha base: papel + envelhecimento + silhueta. */
export function base({ page = A4, paper = 'oficio-branco', age = 'usado', aging: recipe = 'usado', seed = 1, intensity = 1, cut = null }) {
  return [
    papel(paper, idade(age), page),
    ...(recipe ? aging(recipe, { seed, intensity, page }) : []),
    ...(cut ? [silhouette(cut[0], { page, seed, ...(cut[1] || {}) })] : []),
  ];
}

const instituicao = id => INSTITUICOES[id];

/**
 * Formulário datilografado. rows: [[rótulo, valor, { col: 1|2, field: false }]…] em duas colunas (col 2 = linha inteira).
 * sections: [{ h, text, field?, hand? }]. signatures: [{ nome, cargo }]. stamps: [{ id, x, y, size, rot }].
 */
export function formulario(c) {
  const page = c.page || A4;
  const org = c.org ? instituicao(c.org) : null;
  const ink = c.ink || (org?.paleta.tinta ?? '#1d1b24');
  const family = c.font || org?.fontes[0] || 'Courier Prime';
  const M = c.margin ?? 110;
  const W = page.width - M * 2;
  const L = base({ page, paper: c.paper || 'oficio-branco', age: c.age, aging: c.aging === undefined ? 'usado' : c.aging, seed: c.seed, intensity: c.intensity, cut: c.cut });
  let y = c.top ?? 90;

  if (c.emblem) {
    L.push(IMG('Emblema', c.emblem, { x: M, y: y - 10, w: 120, h: 136 }, { blend: c.emblemBlend }));
  }
  const title = (c.title || (org ? [org.nome.toUpperCase()] : [])).join('\n');
  const headX = c.emblem ? M + 140 : M;
  const headW = c.emblem ? W - 140 : W;
  L.push(T('Cabeçalho', title, { x: headX, y, w: headW, h: Math.max(60, altura(title, headW, c.titleSize || 28, { family })) }, { family, size: c.titleSize || 28, bold: true, align: c.emblem ? 'left' : 'center', color: ink, style: 'typewriter' }));
  y += Math.max(c.emblem ? 130 : 0, altura(title, headW, c.titleSize || 28, { family })) + 6;
  if (c.subtitle) {
    L.push(T('Subtítulo', c.subtitle, { x: headX, y, w: headW, h: 36 }, { family, size: 20, align: c.emblem ? 'left' : 'center', color: ink, style: 'typewriter' }));
    y += 44;
  }
  L.push(RULE(M, y, W, { weight: 3, color: ink, name: 'Linha do cabeçalho' }));
  y += 22;
  if (c.formTitle) {
    L.push(T('Título do documento', c.formTitle, { x: M, y, w: W, h: 48 }, { family, size: 32, bold: true, align: 'center', color: ink }));
    y += 66;
  }

  // Campos em grade
  const colW = (W - 30) / 2;
  let pending = null;
  const cell = (label, value, x, w, yy, field) => {
    L.push(T(`${label} (rótulo)`, label.toUpperCase(), { x, y: yy, w, h: 22 }, { family, size: 16, color: '#555555', style: 'clean', wear: 0 }));
    const h = Math.max(34, altura(value, w, 24, { family }));
    L.push(T(label, value, { x, y: yy + 22, w, h }, { family, size: 24, color: ink, field: field === false ? undefined : label }));
    L.push(RULE(x, yy + 24 + h, w, { color: '#777777', weight: 1.2, name: `${label} (linha)` }));
    return h + 36;
  };
  for (const [label, value, opt = {}] of c.rows || []) {
    if (opt.col === 2) {
      if (pending) { y += pending.h; pending = null; }
      y += cell(label, value, M, W, y, opt.field) + 8;
    } else if (!pending) {
      const h = cell(label, value, M, colW, y, opt.field);
      pending = { h };
    } else {
      const h = cell(label, value, M + colW + 30, colW, y, opt.field);
      y += Math.max(pending.h, h) + 8;
      pending = null;
    }
  }
  if (pending) y += pending.h + 8;

  for (const s of c.sections || []) {
    y += 8;
    if (s.h) { L.push(T(`${s.h} (título)`, s.h.toUpperCase(), { x: M, y, w: W, h: 32 }, { family, size: 21, bold: true, color: ink, style: 'clean', wear: 0 })); y += 38; }
    const o = s.hand ? { family: 'Nothing You Could Do', size: 32, color: '#1c2a5a', style: 'handwriting', wear: 0.2 } : { family, size: s.size || 23, color: ink };
    const h = altura(s.text, W, o.size, { family: o.family, lh: 1.25 }) + 8;
    L.push(T(s.h || 'Texto', s.text, { x: M, y, w: W, h }, { ...o, field: s.field === false ? undefined : (s.field || s.h || 'Texto') }));
    y += h + 10;
  }

  // Assinaturas ao pé da página
  const sigs = c.signatures || [];
  if (sigs.length) {
    const sy = Math.max(y + 30, c.signY ?? page.height - 330);
    const w = (W - 40 * (sigs.length - 1)) / sigs.length;
    sigs.forEach((s, i) => {
      const x = M + i * (w + 40);
      L.push(T(`Assinatura ${i + 1}`, s.nome, { x, y: sy, w, h: 60 }, { family: s.family || 'Homemade Apple', size: 34, color: '#1c2a5a', style: 'handwriting', wear: 0.2, field: s.field }));
      L.push(RULE(x, sy + 66, w, { color: '#444444', name: `Linha de assinatura ${i + 1}` }));
      L.push(T(`Cargo ${i + 1}`, s.cargo || '', { x, y: sy + 72, w, h: 30 }, { family, size: 17, color: '#444444', style: 'clean', wear: 0, align: 'center' }));
    });
    y = sy + 110;
  }
  for (const s of c.stamps || []) L.push(IMG('Carimbo', s.id, { x: s.x, y: s.y, w: s.size, h: s.h ?? s.size * (s.ratio ?? 1) }, { rot: s.rot ?? -4, blend: 'multiply', opacity: s.opacity ?? 0.85 }));
  L.push(...(c.extras || []));
  if (c.footer) L.push(T('Rodapé', c.footer, { x: M, y: page.height - 90, w: W, h: 30 }, { family, size: 16, color: '#555555', style: 'clean', wear: 0, align: 'center' }));
  return L;
}

/** Página de escrita corrida. */
export function carta(c) {
  const page = c.page || A4;
  const M = c.margin ?? 120;
  const W = page.width - M * 2;
  const family = c.font || 'Caveat';
  const size = c.size || 36;
  const color = c.color || '#1c2a5a';
  const hand = c.typed ? { style: 'typewriter', wear: 0.12 } : { style: 'handwriting', wear: 0.2 };
  const L = base({ page, paper: c.paper || 'carta-pautada', age: c.age, aging: c.aging === undefined ? 'usado' : c.aging, seed: c.seed, intensity: c.intensity, cut: c.cut });
  let y = c.top ?? 130;
  if (c.header) { L.push(T('Cabeçalho', c.header, { x: M, y, w: W, h: altura(c.header, W, 28, { family: c.headFont || family }) }, { family: c.headFont || family, size: 28, bold: true, align: 'center', color: c.headColor || color, style: 'typewriter' })); y += altura(c.header, W, 28, { family: c.headFont || family }) + 30; }
  if (c.date) { L.push(T('Data', c.date, { x: M, y, w: W, h: size * 1.5 }, { family, size, color, align: 'right', ...hand, field: 'Data' })); y += size * 1.7; }
  if (c.greeting) { L.push(T('Saudação', c.greeting, { x: M, y, w: W, h: size * 1.5 }, { family, size, color, ...hand, field: c.greetingField || 'Destinatário' })); y += size * 1.8; }
  const bh = Math.max(c.bodyHeight ?? 0, altura(c.body, W, size, { family, lh: c.lh || 1.3 }));
  L.push(T(c.bodyName || 'Texto', c.body, { x: M, y, w: W, h: bh }, { family, size, color, ...hand, lh: c.lh || 1.3, field: c.bodyField || 'Texto' }));
  y += bh + 20;
  if (c.closing) { L.push(T('Despedida', c.closing, { x: M, y, w: W, h: size * 1.5 }, { family, size, color, align: 'right', ...hand })); y += size * 1.7; }
  if (c.signature) L.push(T('Assinatura', c.signature, { x: M + W / 2, y, w: W / 2, h: size * 2 }, { family: c.signFont || 'Homemade Apple', size: size + 4, color, align: 'right', style: 'handwriting', wear: 0.2, field: 'Assinatura' }));
  L.push(...(c.extras || []));
  return L;
}

/** Colunas de linhas: columns [{ h, w, key, align }], rows [{ key: valor }]. Cada linha ocupa o número de linhas visuais da sua célula mais longa. */
export function tabela(c) {
  const M = c.margin ?? 110;
  const family = c.font || 'Courier Prime';
  const size = c.size || 22;
  const ink = c.ink || '#1d1b24';
  const lh = 1.45;
  const lineH = size * lh;
  const L = [];
  const y0 = c.y;
  const headH = Math.round(size * 1.6);
  const total = c.columns.reduce((a, k) => a + k.w, 0);
  const wrap = (text, w) => layoutText(String(text ?? ''), { measure: measureApprox(family), width: w - 10, height: 99999, size, lineHeight: lh, letterSpacing: 0, align: 'left', box: 'area', fit: 'overflow' }).lines.map(l => l.text);
  const cells = c.rows.map(r => c.columns.map(col => wrap(r[col.key], col.w)));
  const counts = cells.map(r => Math.max(1, ...r.map(x => x.length)));
  L.push(BOX(c.name ? `${c.name} (cabeçalho)` : 'Cabeçalho da tabela', { x: M - 8, y: y0 - 6, w: total + 16, h: headH + 8 }, { fill: c.band || '#d8d2c0', opacity: 0.6, blend: 'multiply' }));
  let x = M;
  c.columns.forEach((col, ci) => {
    L.push(T(`${col.h} (coluna)`, col.h.toUpperCase(), { x, y: y0, w: col.w - 10, h: headH }, { family, size: Math.max(16, size - 4), bold: true, color: ink, style: 'clean', wear: 0, align: col.align }));
    const lines = cells.map((r, ri) => [...r[ci], ...Array(counts[ri] - r[ci].length).fill('')].join('\n')).join('\n');
    L.push(T(col.h, lines, { x, y: y0 + headH + 8, w: col.w - 10, h: Math.ceil(counts.reduce((a, n) => a + n, 0) * lineH) + 8 }, { family, size, color: ink, lh, align: col.align, field: col.field === false ? undefined : col.h }));
    x += col.w;
  });
  let yy = y0 + headH + 8;
  L.push(RULE(M - 8, yy, total + 16, { color: '#7a7466', weight: 1.4, name: 'Linha do topo' }));
  counts.forEach((n, i) => { yy += n * lineH; L.push(RULE(M - 8, yy + 2, total + 16, { color: '#7a7466', weight: 1.2, name: `Linha ${i + 1}` })); });
  c.fimY = yy + 20;
  return L;
}


/** As épocas do manifesto são seis grupos (ERAS em universo.js): o ano de cada modelo cai no mais próximo. */
export function faixaEra(era) {
  const y = Number(era);
  if (!Number.isFinite(y)) return era;
  if (y < 1905) return '1890';
  if (y < 1935) return '1920';
  if (y < 1965) return '1950';
  if (y < 2000) return '1980';
  return 'hoje';
}

/** Embrulho final: especificação do modelo com metadados e campos coletados das camadas. */
export function modelo({ slug, name, category, page = A4, background = '#f3efe6', era, tom, org, tags = [], layers, fields = [], variants = [] }) {
  const campos = [...fields];
  const layersOut = layers.map(autofit).map(l => {
    if (!l._field) return l;
    const { _field, ...rest } = l;
    campos.push({ layerId: rest.name, label: _field });
    return rest;
  });
  return { slug, name, category, page: { ...page, background }, layers: layersOut, fields: campos, meta: { addedIn: '2026-10-27', era: faixaEra(era), tom, ...(org ? { org } : {}), tags }, variants };
}
