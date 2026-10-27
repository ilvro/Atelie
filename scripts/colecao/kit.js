/**
 * Kit de camadas dos modelos: funções puras que devolvem camadas (no formato das especificações de
 * ./modelos/*.js) já nomeadas em português. Os modelos novos se montam com isto, em vez de repetir
 * blocos de coordenadas; o resultado é só dado, então o pipeline de templates.js não muda.
 * `silhouette` entra na Fase C4.
 */
import { prng } from '../../src/domain/handout-text-layout.js';

const lib = id => ({ src: { library: id } });

/** Pilha de papel de fundo. `page` = { width, height }. */
export function paper(id, page) {
  return { kind: 'image', name: 'Papel', image: lib(id), width: page.width, height: page.height };
}

export { silhouette, SILHOUETTES } from './silhouettes.js';
import { silhouette } from './silhouettes.js';

/**
 * Receitas de envelhecimento: `aging(preset, { seed, intensity })` devolve uma pilha de camadas com nome,
 * mesclagem e opacidade já calibradas. Usa as texturas da casa, os efeitos da etapa 11 e o corte da C1.
 * Cada passo é [tipo, nome, ...]: 'img' (textura da casa, variação sorteada), 'fx' (efeito procedural)
 * ou 'cut' (silhueta; vai por último, porque o corte só apaga o que está abaixo dele). `intensity` (0–1,5) escala a opacidade.
 */
export const AGING_PRESETS = {
  novo: [['fx', 'Grão fino', 'grain', { blend: 'soft-light', opacity: 0.15, amount: 0.5 }]],
  usado: [
    ['fx', 'Amassado leve', 'crumple', { blend: 'soft-light', opacity: 0.55, amount: 0.35, params: { creases: 10 } }],
    ['fx', 'Dobra', 'fold', { blend: 'multiply', opacity: 0.3, amount: 0.4, params: { horizontal: 1, vertical: 0 } }],
    ['img', 'Poeira', 'casa-sujeira-3', { blend: 'multiply', opacity: 0.2 }],
    ['fx', 'Bordas escurecidas', 'damp', { blend: 'multiply', opacity: 0.3, amount: 0.4, params: { color: '#a58f63' } }],
  ],
  antigo: [
    ['fx', 'Amassado', 'crumple', { blend: 'soft-light', opacity: 0.7, amount: 0.55, params: { creases: 16 } }],
    ['fx', 'Dobras', 'fold', { blend: 'multiply', opacity: 0.35, amount: 0.5, params: { horizontal: 1, vertical: 1 } }],
    ['fx', 'Manchas de idade', 'stain', { blend: 'linear-burn', opacity: 0.3, amount: 0.45, params: { count: 4, color: '#8a6a34' } }],
    ['fx', 'Bordas amareladas', 'damp', { blend: 'multiply', opacity: 0.45, amount: 0.6, params: { color: '#b0904f' } }],
    ['img', 'Sujeira', 'casa-sujeira-5', { blend: 'multiply', opacity: 0.4 }],
  ],
  'arquivo-morto': [
    ['preset', 'antigo'],
    ['fx', 'Umidade no canto', 'damp', { blend: 'multiply', opacity: 0.3, amount: 0.6, params: { color: '#8a8460' } }],
    ['img', 'Carimbo de arquivo', 'casa-carimbo-arquivo-morto', { blend: 'multiply', opacity: 0.75, box: { x: 0.52, y: 0.06, w: 0.38, h: 0.2 } }],
    ['img', 'Furos de grampo', 'casa-prendedor-dois-grampos', { blend: 'multiply', opacity: 0.8, box: { x: 0.04, y: 0.02, w: 0.2, h: 0.07 } }],
  ],
  queimado: [
    ['img', 'Fuligem', 'casa-queimado-1', { blend: 'multiply', opacity: 0.7 }],
    ['fx', 'Papel tostado', 'burn', { blend: 'multiply', opacity: 0.55, amount: 0.6, params: { depth: 0.1 } }],
    ['cut', 'queimado'],
  ],
  molhado: [
    ['fx', 'Umidade', 'damp', { blend: 'multiply', opacity: 0.5, amount: 0.85, params: { color: '#8a8670' } }],
    ['fx', 'Ondulação', 'crumple', { blend: 'soft-light', opacity: 0.5, amount: 0.3, params: { creases: 8 } }],
  ],
  ensanguentado: [
    ['fx', 'Respingos', 'blood', { blend: 'multiply', opacity: 0.85, amount: 0.7, params: { drops: 10, smear: false, color: '#6e0b0b' } }],
    ['fx', 'Arrasto', 'blood', { blend: 'multiply', opacity: 0.7, amount: 0.5, seedShift: 31, params: { drops: 3, smear: true, color: '#5a0808' } }],
    ['img', 'Digital', 'casa-digitais-2', { blend: 'multiply', opacity: 0.55 }],
  ],
  destruido: [
    ['fx', 'Amassado forte', 'crumple', { blend: 'soft-light', opacity: 0.9, amount: 0.8, params: { creases: 26 } }],
    ['fx', 'Dobras', 'fold', { blend: 'multiply', opacity: 0.4, amount: 0.6, params: { horizontal: 2, vertical: 2 } }],
    ['tape', 'topo-esquerda'],
    ['tape', 'topo-direita'],
    ['cut', 'rasgado-bordas'],
  ],
};

/** O que a receita pede ao texto do modelo (a pilha só cuida do papel). */
export const AGING_HINTS = { molhado: { textWear: 0.7 }, queimado: { textWear: 0.35 }, destruido: { textWear: 0.4 } };

/** Troca o sufixo numérico do id por outra variação da mesma família (1–4), sorteada pela semente. */
function variant(id, seed, i) {
  const m = /^(.*-)(\d)$/.exec(id);
  return m ? `${m[1]}${1 + Math.floor(prng(seed, i) * 4)}` : id;
}

const level = (opacity, intensity) => Math.round(Math.min(1, opacity * intensity) * 1000) / 1000;

/** Envelhecimento por receita. A semente escolhe as variações e decide onde caem manchas e respingos. */
export function aging(preset, { seed = 1, intensity = 1, page = { width: 1240, height: 1754 } } = {}) {
  const defs = AGING_PRESETS[preset];
  if (!defs) throw new Error(`Envelhecimento desconhecido: ${preset}`);
  const out = [];
  defs.forEach((def, i) => {
    const [type] = def;
    if (type === 'preset') {
      out.push(...aging(def[1], { seed, intensity, page }));
    } else if (type === 'cut') {
      out.push(silhouette(def[1], { seed: seed + i, page }));
    } else if (type === 'tape') {
      out.push(tape(def[1], { x: 60, y: 70, width: page.width - 120, height: page.height - 140 }));
    } else if (type === 'fx') {
      const [, name, fx, o] = def;
      out.push({
        kind: 'effect', name, blend: o.blend, opacity: level(o.opacity, intensity),
        effect: { type: fx, seed: seed * 31 + i * 17 + (o.seedShift || 0), amount: o.amount, params: o.params || {} },
      });
    } else {
      const [, name, id, o] = def;
      const box = o.box ? { x: Math.round(o.box.x * page.width), y: Math.round(o.box.y * page.height), width: Math.round(o.box.w * page.width), height: Math.round(o.box.h * page.height) } : { width: page.width, height: page.height };
      out.push({ kind: 'image', name, image: lib(variant(id, seed, i)), blend: o.blend, opacity: level(o.opacity, intensity), ...box });
    }
  });
  return out;
}

/** Cabeçalho de instituição: nome em caixa alta, linha abaixo e endereço. `org` vem de universo.js. */
export function letterhead(org, { x = 80, y = 80, width = 800, size = 30 } = {}) {
  const font = { family: org.fontes[0], library: null, weight: 700, italic: false };
  return [
    { kind: 'text', name: 'Instituição', x, y, width, height: size * 1.6,
      text: { content: org.nome.toUpperCase(), font, size, align: 'center', color: org.paleta.tinta } },
    { kind: 'text', name: 'Endereço', x, y: y + size * 1.7, width, height: size * 0.9,
      text: { content: `${org.endereco} — ${org.cidade}`, font: { ...font, weight: 400 }, size: Math.round(size * 0.55), align: 'center', color: org.paleta.tinta } },
    { kind: 'shape', name: 'Fio do cabeçalho', x, y: y + size * 2.8, width, height: 0,
      shape: { type: 'line', stroke: org.paleta.tinta, strokeWidth: 2 } },
  ];
}

/** Campo de formulário: rótulo + valor de exemplo (+ linha para escrever). `box` = { x, y, width, height }. */
export function formField(label, value, box, { font = { family: 'Courier Prime', library: null, weight: 400, italic: false }, size = 20, color = '#1a1a1a', line = true } = {}) {
  const layers = [
    { kind: 'text', name: `${label} (rótulo)`, x: box.x, y: box.y, width: box.width, height: size * 1.1,
      text: { content: label.toUpperCase(), font, size: Math.max(14, Math.round(size * 0.7)), color: '#444444' } },
    { id: `campo-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, kind: 'text', name: label, x: box.x, y: box.y + size * 0.95, width: box.width, height: box.height - size * 0.95,
      text: { content: value, font, size, color } },
  ];
  if (line) layers.push({ kind: 'shape', name: `${label} (linha)`, x: box.x, y: box.y + box.height, width: box.width, height: 0, shape: { type: 'line', stroke: '#555555', strokeWidth: 1 } });
  return layers;
}

const FRAMES = {
  cantoneiras: 'casa-etiqueta-cantoneira-preta',
  clipe: 'casa-prendedor-clipe-prata-1',
  grampo: 'casa-prendedor-grampo',
  polaroide: null,
};

/** Foto no papel; `slot` = { x, y, width, height }, `default` = id da foto da coleção, `tilt` em graus. */
export function photo(slot, { default: src, frame = 'cantoneiras', tilt = 0 } = {}) {
  if (!src) throw new Error('photo() precisa de uma foto padrão (default)');
  const layers = [{ kind: 'image', name: 'Foto', ...slot, rotation: tilt, image: { ...lib(src), fit: 'cover' } }];
  const f = FRAMES[frame];
  if (f) layers.push({ kind: 'image', name: `Fixação (${frame})`, x: slot.x + slot.width * 0.35, y: slot.y - 24, width: 60, height: 90, rotation: tilt, image: lib(f) });
  return layers;
}

/** Assinatura manuscrita (texto em fonte à mão). */
export function signature(name, { x, y, width = 320, size = 44, color = '#1c2a5a' } = {}) {
  return { kind: 'text', name: 'Assinatura', x, y, width, height: size * 1.6,
    text: { content: name, font: { family: 'Homemade Apple', library: null, weight: 400, italic: false }, size, color, ink: { style: 'pen', wear: 0.2, seed: 7 } } };
}

/** Rubrica: as iniciais, pequenas. */
export function initials(name, { x, y, size = 30, color = '#1c2a5a' } = {}) {
  const sigla = name.replace(/\b(Dr|Dra|Sr|Prof)\.?ª?\b/g, '').split(/\s+/).filter(w => /^[A-ZÀ-Ý]/.test(w)).map(w => w[0]).join('.');
  return { kind: 'text', name: 'Rubrica', x, y, width: size * 5, height: size * 1.4,
    text: { content: `${sigla}.`, font: { family: 'Nothing You Could Do', library: null, weight: 400, italic: false }, size, color } };
}

/** Carimbo da coleção, com inclinação sorteada pela semente (±4°). */
export function stamp(id, { x, y, size = 220, rot, opacity = 0.85, seed = 1 } = {}) {
  const r = rot ?? Math.round((prng(seed, 3) * 8 - 4) * 10) / 10;
  return { kind: 'image', name: 'Carimbo', x, y, width: size, height: size, rotation: r, opacity, blend: 'multiply', image: lib(id) };
}

/** Anotação à margem, em letra de mão. */
export function marginNote(text, { x, y, width = 300, size = 30, color = '#2a3a8a', rot = -2 } = {}) {
  return { kind: 'text', name: 'Anotação à margem', x, y, width, height: size * 3, rotation: rot,
    text: { content: text, font: { family: 'Caveat', library: null, weight: 400, italic: false }, size, color, ink: { style: 'pen', wear: 0.15, seed: 11 } } };
}

/** Código de barras desenhado com blocos de texto (sem imagem extra). */
export function barcode(code, { x, y, width = 260, height = 70 } = {}) {
  const bars = Array.from(String(code), (c, i) => '▌▎▍▋▏▊'[(c.charCodeAt(0) + i) % 6]).join('▕');
  return { kind: 'text', name: 'Código de barras', x, y, width, height,
    text: { content: `${bars}\n${code}`, font: { family: 'Share Tech Mono', library: null, weight: 400, italic: false }, size: 18, color: '#111111', align: 'center' } };
}

const CORNERS = {
  'topo-esquerda': { dx: -20, dy: -20, rot: -35, id: 'casa-fita-crepe-diagonal' },
  'topo-direita': { dx: 1, dy: -20, rot: 35, id: 'casa-fita-crepe-diagonal' },
  'topo': { dx: 0.5, dy: -20, rot: 0, id: 'casa-fita-crepe-curta' },
};

/** Fita adesiva num canto de `box` = { x, y, width, height }. */
export function tape(corner, box) {
  const c = CORNERS[corner];
  if (!c) throw new Error(`Canto desconhecido: ${corner}`);
  const px = Math.abs(c.dx) < 2 ? box.x + box.width * c.dx : box.x + c.dx;
  return { kind: 'image', name: 'Fita', x: Math.round(px - 60), y: box.y + c.dy, width: 160, height: 60, rotation: c.rot, opacity: 0.9, image: lib(c.id) };
}

/** Clipe na borda `edge` ('topo' | 'esquerda') de `box`. */
export function clip(edge, box) {
  const topo = edge === 'topo';
  return { kind: 'image', name: 'Clipe', x: topo ? box.x + box.width * 0.15 : box.x - 20, y: topo ? box.y - 40 : box.y + box.height * 0.1, width: 70, height: 160, rotation: topo ? 0 : -90, image: lib('casa-prendedor-clipe-prata-2') };
}
