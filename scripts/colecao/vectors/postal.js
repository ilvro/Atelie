import { rng, f, svg, shadowDef, item } from './svgkit.js';
import { wordPath, handWord } from './letters.js';

const CAT = 'Postal';

/** Perforated stamp edge: the paper outline as a path with semicircle bites. */
function perforated(w, h, step = 16) {
  const r = 4.2;
  let d = `M 0 0 `;
  const side = (len, horizontal, flip) => {
    let s = '';
    const n = Math.round(len / step);
    const gap = len / n;
    for (let i = 0; i < n; i++) {
      const a = gap * i + gap / 2 - r;
      const b = gap * i + gap / 2 + r;
      if (horizontal) s += `L ${f(a)} ${flip ? h : 0} A ${r} ${r} 0 0 ${flip ? 0 : 1} ${f(b)} ${flip ? h : 0} `;
      else s += `L ${flip ? w : 0} ${f(a)} A ${r} ${r} 0 0 ${flip ? 0 : 1} ${flip ? w : 0} ${f(b)} `;
    }
    return s;
  };
  d += side(w, true, false) + `L ${w} 0 ` + side(h, false, true) + `L ${w} ${h} `;
  // bottom, right-to-left
  const n = Math.round(w / step); const gap = w / n;
  for (let i = n - 1; i >= 0; i--) {
    const b = gap * i + gap / 2 + r; const a = gap * i + gap / 2 - r;
    d += `L ${f(b)} ${h} A ${r} ${r} 0 0 0 ${f(a)} ${h} `;
  }
  d += `L 0 ${h} `;
  const m = Math.round(h / step); const g2 = h / m;
  for (let i = m - 1; i >= 0; i--) {
    const b = g2 * i + g2 / 2 + r; const a = g2 * i + g2 / 2 - r;
    d += `L 0 ${f(b)} A ${r} ${r} 0 0 0 0 ${f(a)} `;
  }
  return d + 'Z';
}

const STAMPS = [
  ['1890', 'Império · 1890', '#6b3a1e', '#e8d9b4', 'ESTRELA', '100'],
  ['1910', 'República · 1910', '#1f4d3a', '#e6dcc0', 'COROA', '200'],
  ['1930', 'Correio aéreo · 1930', '#1f3f7a', '#e9e2cf', 'AVIÃO', '300'],
  ['1950', 'Café · 1950', '#8a1f1f', '#efe6cf', 'CAFÉ', '60'],
  ['1960', 'Industrialização · 1960', '#2d2d2d', '#e4e2da', 'FÁBRICA', '5'],
  ['1970', 'Carta · 1970', '#a65a12', '#f1ead7', 'CARTA', '1'],
  ['1980', 'Natal · 1980', '#9c1c2b', '#f3efe2', 'NATAL', '50'],
  ['hoje', 'Atual · hoje', '#305f9c', '#f6f4ee', 'PAZ', '10'],
];

function postalStamp([slug, name, ink, paper, motif, value], seed) {
  const w = 220; const h = 270;
  const r = rng(seed);
  const sym = {
    ESTRELA: `<polygon points="110,70 122,102 156,104 130,126 139,158 110,140 81,158 90,126 64,104 98,102" fill="${ink}" opacity="0.9"/>`,
    COROA: `<path d="M 66 150 L 72 90 L 94 118 L 110 80 L 126 118 L 148 90 L 154 150 Z" fill="${ink}" opacity="0.9"/><rect x="66" y="150" width="88" height="14" fill="${ink}"/>`,
    AVIÃO: `<path d="M 60 120 L 150 100 L 170 106 L 150 116 L 160 150 L 148 150 L 126 124 L 70 134 Z" fill="${ink}" opacity="0.9"/>`,
    CAFÉ: `<ellipse cx="110" cy="116" rx="40" ry="26" fill="${ink}" opacity="0.9"/><path d="M 74 116 Q 110 96 146 116" fill="none" stroke="${paper}" stroke-width="5"/>`,
    FÁBRICA: `<path d="M 60 150 V 108 L 92 124 V 108 L 124 124 V 84 H 142 V 150 Z" fill="${ink}" opacity="0.9"/>`,
    CARTA: `<rect x="62" y="92" width="96" height="62" fill="none" stroke="${ink}" stroke-width="6"/><path d="M 62 92 L 110 130 L 158 92" fill="none" stroke="${ink}" stroke-width="6"/>`,
    NATAL: `<path d="M 110 80 L 92 120 H 128 Z M 100 120 L 82 156 H 138 L 120 120 Z" fill="${ink}" opacity="0.9"/>`,
    PAZ: `<path d="M 110 156 C 70 130 70 90 110 108 C 150 90 150 130 110 156 Z" fill="${ink}" opacity="0.9"/>`,
  }[motif];
  const word = wordPath('CORREIO', { scale: 2.2, letterSpacing: 1.6 });
  const val = wordPath(value, { scale: 3.4, letterSpacing: 2 });
  const body = `<g filter="url(#s)"><path d="${perforated(w, h)}" fill="${paper}" transform="translate(0 0)"/><rect x="16" y="16" width="${w - 32}" height="${h - 32}" fill="none" stroke="${ink}" stroke-width="2.4"/><rect x="22" y="22" width="${w - 44}" height="${h - 44}" fill="none" stroke="${ink}" stroke-width="0.8"/>${sym}
  <path d="${word.d}" transform="translate(${f((w - word.width) / 2)} 36)" fill="none" stroke="${ink}" stroke-width="2"/><path d="${val.d}" transform="translate(${f((w - val.width) / 2)} 188)" fill="none" stroke="${ink}" stroke-width="3.2"/>
  <path d="M 30 238 H ${w - 30}" stroke="${ink}" stroke-width="1" opacity="0.7"/></g>`;
  return item(`casa-postal-selo-${slug}`, `Postal · selo ${name}`, CAT, ['postal', 'selo', 'correio', 'fictício', slug], svg(w, h, body, shadowDef('s', 2, 2, 0.35)), w, h);
}

/** Postmark: circle with the town and a date, plus wavy cancel lines. Date is just letters, no text tag. */
function postmark(slug, name, town, date, seed) {
  const w = 520; const h = 220;
  const r = rng(seed);
  const t1 = wordPath(town, { scale: 2.2, letterSpacing: 1.4 });
  const t2 = wordPath(date, { scale: 2.6, letterSpacing: 1.6 });
  let waves = '';
  for (let i = 0; i < 5; i++) {
    const y = 60 + i * 24; let d = `M 250 ${y}`;
    for (let x = 250; x <= 500; x += 25) d += ` Q ${x + 12} ${y + (i % 2 ? 9 : -9)} ${x + 25} ${y}`;
    waves += `<path d="${d}" fill="none" stroke="#1a1a1a" stroke-width="3.4"/>`;
  }
  const body = `<g stroke="#1a1a1a" fill="none"><circle cx="120" cy="110" r="96" stroke-width="4"/><circle cx="120" cy="110" r="84" stroke-width="1.6"/><path d="${t1.d}" transform="translate(${f(120 - t1.width / 2)} 62)" stroke-width="2.4"/><path d="M 40 110 H 200" stroke-width="2"/><path d="${t2.d}" transform="translate(${f(120 - t2.width / 2)} 116)" stroke-width="2.8"/>${waves}</g>`;
  return item(`casa-postal-carimbo-correio-${slug}`, `Postal · carimbo de correio ${name}`, CAT, ['postal', 'carimbo', 'correio', 'data', name], svg(w, h, body), w, h);
}

function label(slug, name, text, color, extra = '') {
  const t = wordPath(text, { scale: 5, letterSpacing: 3 });
  const w = Math.ceil(t.width + 90); const h = Math.ceil(t.height + 70);
  const body = `<rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="6" fill="#f3f0e6" stroke="${color}" stroke-width="5"/><rect x="18" y="18" width="${w - 36}" height="${h - 36}" rx="3" fill="none" stroke="${color}" stroke-width="2"/><path d="${t.d}" transform="translate(45 30)" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="square"/>${extra}`;
  return item(`casa-postal-etiqueta-${slug}`, `Postal · etiqueta ${name}`, CAT, ['postal', 'etiqueta', 'correio', name.toLowerCase()], svg(w, h, body, ''), w, h);
}

export function items() {
  return [
    ...STAMPS.map((s, i) => postalStamp(s, 500 + i)),
    postmark('santos-1924', 'Santos · 1924', 'SANTOS', '14 MAR 24', 511), postmark('vila-aurora-1951', 'Vila Aurora · 1951', 'VILA AURORA', '02 JUL 51', 512),
    postmark('sao-paulo-1978', 'São Paulo · 1978', 'SÃO PAULO', '23 NOV 78', 513), postmark('curitiba-1993', 'Curitiba · 1993', 'CURITIBA', '09 JAN 93', 514),
    label('via-aerea', 'VIA AÉREA', 'VIA AÉREA', '#1f4d9c'), label('registrado', 'REGISTRADO', 'REGISTRADO', '#b3261e'),
    label('devolver', 'DEVOLVER', 'DEVOLVER', '#222222'), label('frágil', 'FRÁGIL', 'FRÁGIL', '#b3261e'),
  ];
}
