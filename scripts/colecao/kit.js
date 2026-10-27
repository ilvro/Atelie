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

export const AGING_PRESETS = {
  leve: [['casa-dobras-1', 0.35, 'multiply'], ['casa-sujeira-1', 0.25, 'multiply']],
  usado: [['casa-dobras-2', 0.45, 'multiply'], ['casa-sujeira-3', 0.4, 'multiply'], ['casa-manchas-cafe-2', 0.3, 'multiply']],
  antigo: [['casa-dobras-3', 0.55, 'multiply'], ['casa-sujeira-5', 0.55, 'multiply'], ['casa-agua-umidade-2', 0.4, 'multiply'], ['casa-manchas-cafe-4', 0.4, 'multiply']],
};

/** Troca o sufixo numérico do id por outra variação da mesma família (1–4), sorteada pela semente. */
function variant(id, seed, i) {
  const m = /^(.*-)(\d)$/.exec(id);
  return m ? `${m[1]}${1 + Math.floor(prng(seed, i) * 4)}` : id;
}

/** Envelhecimento: camadas multiply de sujeira, dobras e manchas. A semente escolhe a variação. */
export function aging(preset, { seed = 1, page } = {}) {
  const defs = AGING_PRESETS[preset];
  if (!defs) throw new Error(`Envelhecimento desconhecido: ${preset}`);
  return defs.map(([id, opacity, blend], i) => ({
    kind: 'image',
    name: `Envelhecimento ${i + 1}`,
    image: lib(variant(id, seed, i)),
    blend,
    opacity,
    ...(page ? { width: page.width, height: page.height } : {}),
  }));
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
