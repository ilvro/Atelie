/**
 * Reforma dos 39 modelos da casa (Fase C7). Cada entrada diz o que o modelo ganha: receita de
 * envelhecimento, silhueta de corte, camadas e campos que faltavam, ajustes de texto e o carimbo da instituição.
 * `reformar(spec)` devolve uma especificação nova (as originais dos arquivos por categoria não mudam), e o
 * pipeline de templates.js e a auditoria enxergam só o resultado.
 *
 *   aging      receita de kit.aging (entra logo depois do papel); intensity (0–1,5) a suaviza onde há muito texto
 *   silhouette [tipo, opções] de kit.silhouette (corte; vai depois do envelhecimento)
 *   remove     nomes de camadas substituídas (faixas brancas de "rasgo" que viraram corte de verdade)
 *   fonts      { 'Nome da camada' | '*': família } para combinar a letra com a época
 *   fix        { 'Nome da camada': { …campos da camada… } } (cor, tamanho, posição)
 *   add        camadas novas acima do papel e do envelhecimento: { layer, field? }
 *   selo       id do carimbo/emblema da instituição, no canto inferior esquerdo
 */
import { aging, silhouette } from '../kit.js';
import { layoutText } from '../../../src/domain/handout-text-layout.js';
import { measureApprox } from '../audit.js';

const FELL = 'IM Fell English';
/** Id da coleção de cada família usada aqui: sem ele a letra cai na fonte padrão do navegador. */
const FONT_ID = {
  'IM Fell English': 'casa-font-im-fell-english-roman', 'IM Fell DW Pica': 'casa-font-im-fell-dw-pica-roman',
  'Old Standard TT': 'casa-font-oldstandardtt-regular', 'Playfair Display': 'casa-font-playfairdisplay-regular',
  'Rye': 'casa-font-rye-regular', 'La Belle Aurore': 'casa-font-labelleaurore', 'VT323': 'casa-font-vt323-regular',
  'Courier Prime': 'casa-font-courierprime-regular', 'Nothing You Could Do': 'casa-font-nothingyoucoulddo',
};
const text = (name, content, box, { family = 'Courier Prime', size = 22, color = '#1d1b24', align = 'left', style = 'typewriter', wear = 0.12 } = {}) => ({
  kind: 'text', name, ...box,
  text: { content, font: { family, library: FONT_ID[family] ?? null, weight: 400, italic: false }, size, color, align, lineHeight: 1.25, ink: { style, wear, seed: 7 } },
});
const campo = (name, content, box, opts) => ({ layer: text(name, content, box, opts), field: name });
const hand = { family: 'Nothing You Could Do', size: 32, color: '#1c2a5a', style: 'handwriting', wear: 0.2 };

export const REFORMA = {
  // --- Cartas e bilhetes
  'carta-envelhecida': { aging: 'antigo', seed: 11, intensity: 0.7, fonts: { '*': FELL }, selo: 'casa-emblema-universo-solar-carimbo' },
  'carta-datilografada-anos-50': { aging: 'usado', seed: 12, fix: { Remetente: { height: 70 } } },
  'bilhete-caderno-rasgado': { aging: 'novo', seed: 13, remove: ['Rasgo superior'], silhouette: ['rasgado-topo', { seed: 13 }] },
  'bilhete-geladeira': { aging: 'novo', seed: 14 },
  'cartao-postal-frente': { aging: 'usado', seed: 15 },
  'cartao-postal-verso': { aging: 'usado', seed: 16 },
  'telegrama-anos-20': { aging: 'usado', seed: 17, selo: 'casa-emblema-universo-companhia-carimbo' },
  'carta-envelope-frente': { aging: 'usado', seed: 18 },
  'carta-envelope-verso': { aging: 'usado', seed: 19 },
  // --- Jornal
  'recorte-jornal-anos-20': { aging: 'antigo', seed: 21, remove: ['Rasgo lateral'], silhouette: ['rasgado-bordas', { seed: 21 }] },
  'capa-jornal': { aging: 'usado', seed: 22, selo: 'casa-emblema-universo-gazeta-carimbo' },
  'obituario': { aging: 'usado', seed: 23 },
  'classificados': { aging: 'antigo', seed: 24, intensity: 0.6 },
  // --- Polícia e investigação
  'relatorio-policial': { aging: 'usado', seed: 31 },
  'boletim-ocorrencia': { aging: 'usado', seed: 32, selo: 'casa-emblema-universo-delegacia-carimbo' },
  'ficha-criminal': { aging: 'usado', seed: 33 },
  'mandado': { aging: 'antigo', seed: 34, intensity: 0.6, fonts: { '*': 'Old Standard TT' } },
  'laudo-pericial': {
    aging: 'usado', seed: 35, selo: 'casa-emblema-universo-iml-carimbo',
    add: [
      campo('Data do exame', 'Data do exame: 14/11/1951', { x: 120, y: 1130, width: 480, height: 40 }),
      campo('Perito responsável', 'Perito: Dr. Jonas Hernandes', { x: 120, y: 1180, width: 480, height: 40 }),
    ],
  },
  'cartao-evidencia': { aging: 'usado', seed: 36 },
  // --- Médico
  'prontuario': {
    aging: 'usado', seed: 41,
    add: [
      campo('Diagnóstico', 'Diagnóstico: neurastenia aguda com delírios de perseguição', { x: 120, y: 1200, width: 1000, height: 40 }),
      campo('Médico responsável', 'Dr. Augusto Vilela Neto', { x: 120, y: 1260, width: 460, height: 40 }),
    ],
  },
  'receita-medica': {
    aging: 'usado', seed: 42, fonts: { 'Símbolo Rx': 'Old Standard TT' },
    add: [
      campo('Posologia', 'Tomar uma colher após as refeições, por dez dias.', { x: 80, y: 1000, width: 440, height: 120 }, { family: 'Courier Prime', size: 22 }),
      campo('Validade', 'Válida por 30 dias', { x: 80, y: 1290, width: 400, height: 40 }),
    ],
  },
  'certidao-obito': { aging: 'antigo', seed: 43, fonts: { '*': 'Old Standard TT' }, selo: 'casa-emblema-universo-cartorio-carimbo' },
  'internacao-sanatorio': { aging: 'usado', seed: 44, selo: 'casa-emblema-universo-sanatorio-carimbo' },
  // --- Ocultismo
  'pagina-grimorio': { aging: 'antigo', seed: 51, fonts: { 'Nota na margem': 'IM Fell English' } },
  'circulo-ritual': { aging: 'antigo', seed: 52 },
  'diario-culto-uv': { aging: 'usado', seed: 53, fonts: { '*': 'La Belle Aurore' }, selo: 'casa-emblema-universo-irmandade-carimbo' },
  // --- Fantasia
  'pergaminho-selo': { aging: 'antigo', seed: 61 },
  'edito-real': { aging: 'antigo', seed: 62, fonts: { 'Assinatura real': 'IM Fell DW Pica' } },
  'mapa-rasgado': { aging: 'antigo', seed: 63, remove: ['Rasgo de canto'], silhouette: ['rasgado-bordas', { seed: 63 }] },
  'cartaz-procurado': { aging: 'antigo', seed: 64, fonts: { 'Título cartaz': 'Rye', 'Nome do procurado': 'Rye', 'Subtítulo': 'Old Standard TT', 'Valor da recompensa': 'Old Standard TT' }, fix: { 'Valor da recompensa': { text: { color: '#4a0c0c' } } } },
  // --- Cotidiano
  'recibo': { aging: 'usado', seed: 71 },
  'passagem-trem': { aging: 'usado', seed: 72 },
  'cartao-visita': { aging: 'novo', seed: 73 },
  'ingresso-teatro': { aging: 'usado', seed: 74, fonts: { 'Canhoto do bilheteiro': 'Playfair Display', 'Espetáculo': 'Playfair Display' } },
  'polaroide-frente': { aging: 'usado', seed: 75 },
  'polaroide-verso': { aging: 'usado', seed: 76 },
  // --- Tecnologia
  'conversa-celular': { aging: 'novo', seed: 81 },
  'email-impresso': { aging: 'usado', seed: 82 },
  'tela-terminal': {
    aging: 'novo', seed: 83,
    fix: { 'Texto do terminal': { text: { color: '#7dff9a' } }, 'Efeito grão de tela': { blend: 'soft-light', opacity: 0.3 } },
    add: [
      { layer: text('Barra do sistema', 'ARQUIVO CENTRAL · TERMINAL 07 · SESSÃO 0412', { x: 80, y: 44, width: 1440, height: 34 }, { family: 'VT323', size: 26, color: '#4fd873', style: 'clean', wear: 0 }) },
      { layer: text('Teclas de função', 'F1 AJUDA   F5 BUSCAR   F9 IMPRIMIR   F10 SAIR', { x: 80, y: 930, width: 1440, height: 34 }, { family: 'VT323', size: 26, color: '#4fd873', style: 'clean', wear: 0 }) },
      { layer: { kind: 'shape', name: 'Brilho do vidro', x: 60, y: 50, width: 1480, height: 900, opacity: 0.07, blend: 'screen', shape: { type: 'rect', fill: '#9dffb5', stroke: null, strokeWidth: 0, radius: 40, dash: [] } } },
      { layer: { kind: 'shape', name: 'Moldura interna da tela', x: 56, y: 56, width: 1488, height: 888, opacity: 0.5, shape: { type: 'rect', fill: null, stroke: '#2a7a44', strokeWidth: 3, radius: 36, dash: [] } } },
      { layer: { kind: 'effect', name: 'Bordas desbotadas da tela', blend: 'multiply', opacity: 0.45, effect: { type: 'damp', seed: 85, amount: 0.6, params: { color: '#0a2a14' } } } },
    ],
  },
};

const isPaper = l => /^papel|^fundo/i.test(l.name || '');

/** Shrinks (down to 85 %, never under 14 px) and then grows a text box until the approximate layout fits. */
export function autofit(layer) {
  const t = layer.text;
  if (!t?.content) return layer;
  const fits = (size, height) => !layoutText(t.content, {
    measure: measureApprox(t.font.family), width: layer.width, height, size, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing, align: t.align, box: t.box, fit: 'overflow',
  }).overflow;
  if (fits(t.size, layer.height)) return layer;
  const floor = Math.max(14, Math.floor(t.size * 0.85));
  for (let size = t.size - 1; size >= floor; size--) {
    if (fits(size, layer.height)) return { ...layer, text: { ...t, size } };
  }
  for (let h = layer.height; h <= layer.height * 1.7 + 40; h += 10) {
    if (fits(floor, h)) return { ...layer, height: h, text: { ...t, size: floor } };
  }
  return { ...layer, text: { ...t, size: floor } };
}

export function reformar(spec) {
  const cfg = REFORMA[spec.slug];
  if (!cfg) return spec;
  let layers = spec.layers.filter(l => !(cfg.remove || []).includes(l.name));
  const page = spec.page;

  layers = layers.map(l => {
    if (l.kind !== 'text') return l;
    let next = l;
    const family = cfg.fonts?.[l.name] ?? cfg.fonts?.['*'];
    if (family) next = { ...next, text: { ...next.text, font: { ...next.text.font, family, library: FONT_ID[family] ?? null, italic: false } } };
    const fix = cfg.fix?.[l.name];
    if (fix) next = { ...next, ...fix, text: fix.text ? { ...next.text, ...fix.text } : next.text };
    return next;
  });
  layers = layers.map(l => (cfg.fix?.[l.name] && l.kind !== 'text' ? { ...l, ...cfg.fix[l.name] } : l));

  const paperEnd = Math.max(0, layers.findIndex(l => !isPaper(l)) - 1);
  const base = layers.slice(0, paperEnd + 1);
  const rest = layers.slice(paperEnd + 1);

  const stack = cfg.aging ? aging(cfg.aging, { seed: cfg.seed || 1, intensity: cfg.intensity ?? 1, page }) : [];
  const cut = cfg.silhouette ? [silhouette(cfg.silhouette[0], { page, ...(cfg.silhouette[1] || {}) })] : [];
  const added = (cfg.add || []).map(a => a.layer);
  const selo = cfg.selo ? [{
    kind: 'image', name: 'Selo da instituição', x: 100, y: page.height - 300, width: 190, height: 215,
    opacity: 0.8, blend: 'multiply', image: { src: { library: cfg.selo } },
  }] : [];

  const merged = [...base, ...stack, ...cut, ...rest, ...selo, ...added].map(autofit);
  const fields = [...(spec.fields || []), ...(cfg.add || []).filter(a => a.field).map(a => ({ layerId: a.layer.name, label: a.field }))];
  return { ...spec, layers: merged, fields };
}

/** Todos os modelos, na ordem da galeria, já reformados. */
export const reformarTodos = specs => specs.map(reformar);
