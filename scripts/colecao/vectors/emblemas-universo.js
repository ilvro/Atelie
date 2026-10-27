import { f, svg, shadowDef, linearDef, item } from './svgkit.js';
import { wordPath } from './letters.js';
import { INSTITUICOES } from '../universo.js';

const CAT = 'Emblemas do universo';

/** Each institution of the universe: outline shape and a motif drawn in a 0–100 box. */
const DESIGN = {
  delegacia: { shape: 'escudo', motif: 'estrela', cor: '#1f3a6b', ouro: '#d8b45a' },
  sanatorio: { shape: 'circulo', motif: 'bastao', cor: '#2f5d4a', ouro: '#e6dcc0' },
  gazeta: { shape: 'circulo', motif: 'pena', cor: '#222226', ouro: '#e8e2d0' },
  solar: { shape: 'arco', motif: 'pinheiro', cor: '#3b4f2a', ouro: '#d8c58a' },
  companhia: { shape: 'circulo', motif: 'ancora', cor: '#17375e', ouro: '#d9c27a' },
  iml: { shape: 'escudo', motif: 'balanca', cor: '#4a4a52', ouro: '#e6e0cc' },
  doe: { shape: 'octogono', motif: 'olho', cor: '#2b2b2b', ouro: '#c9a24a' },
  halden: { shape: 'hexagono', motif: 'frasco', cor: '#1f5f6b', ouro: '#e3efe8' },
  irmandade: { shape: 'losango', motif: 'luas', cor: '#3a1f4f', ouro: '#cdbb7a' },
  colegio: { shape: 'escudo', motif: 'livro', cor: '#7a1f2b', ouro: '#e3c77a' },
  cartorio: { shape: 'circulo', motif: 'rosacea', cor: '#6b4a1f', ouro: '#e8d9a8' },
  radio: { shape: 'hexagono', motif: 'antena', cor: '#a33a1f', ouro: '#f0e2c4' },
  banco: { shape: 'arco', motif: 'colunas', cor: '#244a3a', ouro: '#d9c27a' },
};

/** The acronym shrinks to fit the narrow bottom of the shapes. */
const siglaScale = text => Math.min(4, 150 / (text.length * 6.9));

function outline(kind) {
  const c = 150;
  switch (kind) {
    case 'circulo': return `M ${c} 14 A 136 136 0 1 1 ${c - 0.1} 14 Z`;
    case 'escudo': return 'M 40 24 H 260 V 170 C 260 240 190 284 150 304 C 110 284 40 240 40 170 Z';
    case 'arco': return 'M 44 300 V 130 C 44 60 96 18 150 18 C 204 18 256 60 256 130 V 300 Z';
    case 'octogono': return 'M 96 20 H 204 L 280 96 V 204 L 204 280 H 96 L 20 204 V 96 Z';
    case 'hexagono': return 'M 150 16 L 272 82 V 218 L 150 284 L 28 218 V 82 Z';
    default: return 'M 150 14 L 286 150 L 150 286 L 14 150 Z';
  }
}

const MOTIFS = {
  estrela: '<polygon points="50,6 61,36 94,38 68,58 77,92 50,72 23,92 32,58 6,38 39,36"/>',
  bastao: '<path d="M 50 4 V 96" fill="none"/><path d="M 50 18 C 80 24 20 40 50 48 C 80 56 20 70 50 76" fill="none"/>',
  pena: '<path d="M 80 6 C 40 12 18 50 22 94 C 30 70 44 56 58 50 C 52 64 50 78 54 90 C 70 70 82 40 80 6 Z"/>',
  pinheiro: '<path d="M 50 4 L 70 34 H 58 L 80 62 H 62 L 88 90 H 12 L 38 62 H 20 L 42 34 H 30 Z"/><rect x="46" y="90" width="8" height="8"/>',
  ancora: '<circle cx="50" cy="16" r="8" fill="none"/><path d="M 50 24 V 90 M 30 40 H 70 M 14 62 C 18 86 50 94 50 90 C 50 94 82 86 86 62" fill="none"/>',
  balanca: '<path d="M 50 8 V 90 M 18 24 H 82 M 18 24 L 6 56 H 30 Z M 82 24 L 70 56 H 94 Z M 30 90 H 70" fill="none"/>',
  olho: '<path d="M 4 50 C 24 18 76 18 96 50 C 76 82 24 82 4 50 Z" fill="none"/><circle cx="50" cy="50" r="14"/>',
  frasco: '<path d="M 40 6 H 60 M 43 6 V 36 L 14 88 C 12 94 16 96 20 96 H 80 C 84 96 88 94 86 88 L 57 36 V 6" fill="none"/><path d="M 28 70 H 72" fill="none"/>',
  luas: '<path d="M 22 16 A 28 28 0 1 0 22 84 A 22 22 0 1 1 22 16 Z"/><circle cx="50" cy="50" r="15"/><path d="M 78 16 A 28 28 0 1 1 78 84 A 22 22 0 1 0 78 16 Z"/>',
  livro: '<path d="M 6 24 C 26 18 42 20 50 28 C 58 20 74 18 94 24 V 82 C 74 76 58 78 50 86 C 42 78 26 76 6 82 Z M 50 28 V 86" fill="none"/><path d="M 50 4 C 56 10 56 16 50 18 C 44 16 44 10 50 4 Z"/>',
  rosacea: '<circle cx="50" cy="50" r="40" fill="none"/><circle cx="50" cy="50" r="26" fill="none"/><path d="M 50 10 V 90 M 10 50 H 90 M 22 22 L 78 78 M 78 22 L 22 78" fill="none"/>',
  antena: '<path d="M 50 20 V 94 M 38 94 H 62" fill="none"/><circle cx="50" cy="16" r="6"/><path d="M 30 8 A 30 30 0 0 0 30 40 M 70 8 A 30 30 0 0 1 70 40 M 16 2 A 46 46 0 0 0 16 46 M 84 2 A 46 46 0 0 1 84 46" fill="none"/>',
  colunas: '<path d="M 6 24 L 50 4 L 94 24 Z"/><path d="M 20 34 V 80 M 40 34 V 80 M 60 34 V 80 M 80 34 V 80" fill="none"/><rect x="6" y="84" width="88" height="10"/>',
};

function colored(org) {
  const d = DESIGN[org.id];
  const sigla = wordPath(org.sigla, { scale: siglaScale(org.sigla), letterSpacing: 2.6 });
  const w = 300; const h = 340;
  const motif = `<g transform="translate(95 58) scale(1.1)" fill="${d.ouro}" stroke="${d.ouro}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${MOTIFS[d.motif]}</g>`;
  const body = `<g filter="url(#s)"><path d="${outline(d.shape)}" fill="${d.cor}"/><path d="${outline(d.shape)}" fill="none" stroke="${d.ouro}" stroke-width="5" transform="translate(150 150) scale(0.93) translate(-150 -150)"/>${motif}<path d="${sigla.d}" transform="translate(${f(150 - sigla.width / 2)} 192)" fill="none" stroke="${d.ouro}" stroke-width="4.2" stroke-linecap="square"/></g>`;
  return item(`casa-emblema-universo-${org.id}`, `Emblema · ${org.nome}`, CAT, ['emblema', 'universo', 'instituição', org.sigla.toLowerCase(), org.id, 'colorido'], svg(w, h, body, shadowDef('s', 3, 3, 0.3)), w, h);
}

function stamped(org) {
  const d = DESIGN[org.id];
  const sigla = wordPath(org.sigla, { scale: siglaScale(org.sigla), letterSpacing: 2.6 });
  const w = 300; const h = 340;
  const seed = 900 + Object.keys(DESIGN).indexOf(org.id);
  const body = `<defs><filter id="n${seed}"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="${seed}" result="no"/><feComponentTransfer in="no" result="th"><feFuncA type="linear" slope="1.4" intercept="-0.15"/></feComponentTransfer><feComposite in="SourceGraphic" in2="th" operator="in"/></filter></defs>
  <g filter="url(#n${seed})" stroke="#000" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${outline(d.shape)}" stroke-width="6"/><path d="${outline(d.shape)}" stroke-width="2" transform="translate(150 150) scale(0.9) translate(-150 -150)"/><g transform="translate(95 58) scale(1.1)" stroke-width="4">${MOTIFS[d.motif].replace(/<(polygon|path|circle|rect)([^>]*)\/>/g, (m, tag, attrs) => `<${tag}${attrs.includes('fill="none"') ? attrs : `${attrs} fill="none"`}/>`)}</g><path d="${sigla.d}" transform="translate(${f(150 - sigla.width / 2)} 192)" stroke-width="4.2" stroke-linecap="square"/></g>`;
  return item(`casa-emblema-universo-${org.id}-carimbo`, `Emblema · ${org.nome} (carimbo)`, CAT, ['emblema', 'universo', 'instituição', org.sigla.toLowerCase(), org.id, 'carimbo'], svg(w, h, body), w, h);
}

export function items() {
  const orgs = Object.values(INSTITUICOES);
  return [...orgs.map(colored), ...orgs.map(stamped)];
}
