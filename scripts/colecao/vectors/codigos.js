import { rng, f, svg, item } from './svgkit.js';
import { wordPath } from './letters.js';

const CAT = 'Códigos';

function barcode(slug, name, seed, bars, h) {
  const r = rng(seed);
  let x = 20;
  let rects = '';
  for (let i = 0; i < bars; i++) {
    const w = 2 + Math.floor(r() * 4) * 1.5;
    if (i % 2 === 0) rects += `<rect x="${f(x)}" y="14" width="${f(w)}" height="${h}" fill="#000"/>`;
    x += w;
  }
  const code = Array.from({ length: 12 }, () => Math.floor(r() * 10)).join('');
  const t = wordPath(code, { scale: 1.9, letterSpacing: 2 });
  const W = Math.ceil(x + 20);
  const body = `<rect width="${W}" height="${h + 54}" fill="#fff" opacity="0"/>${rects}<path d="${t.d}" transform="translate(${f((W - t.width) / 2)} ${h + 18})" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="square"/>`;
  return item(`casa-codigo-barras-${slug}`, `Código · código de barras ${name}`, CAT, ['código', 'barras', 'etiqueta', name], svg(W, h + 54, body), W, h + 54);
}

/** A QR-looking square (three finder squares and a seeded field). Fictional: it does not decode. */
function qr(slug, name, seed, n) {
  const r = rng(seed);
  const m = 12;
  const W = n * m + 40;
  let cells = '';
  const finder = (ox, oy) => `<rect x="${ox}" y="${oy}" width="${7 * m}" height="${7 * m}" fill="#000"/><rect x="${ox + m}" y="${oy + m}" width="${5 * m}" height="${5 * m}" fill="#fff"/><rect x="${ox + 2 * m}" y="${oy + 2 * m}" width="${3 * m}" height="${3 * m}" fill="#000"/>`;
  const inFinder = (i, j) => (i < 8 && j < 8) || (i >= n - 8 && j < 8) || (i < 8 && j >= n - 8);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (inFinder(i, j)) continue;
    if (r() > 0.52) cells += `<rect x="${20 + i * m}" y="${20 + j * m}" width="${m}" height="${m}" fill="#000"/>`;
  }
  const body = `<rect width="${W}" height="${W}" fill="#fff"/>${cells}${finder(20, 20)}${finder(20 + (n - 7) * m, 20)}${finder(20, 20 + (n - 7) * m)}`;
  return item(`casa-codigo-qr-${slug}`, `Código · QR fictício ${name}`, CAT, ['código', 'qr', 'quadrado', 'fictício', name], svg(W, W, body), W, W);
}

function serial(slug, name, text, seed) {
  const t = wordPath(text, { scale: 3.4, letterSpacing: 2.4 });
  const W = Math.ceil(t.width + 60); const H = Math.ceil(t.height + 30);
  const r = rng(seed);
  const body = `<path d="${t.d}" transform="translate(30 12)" fill="none" stroke="#9c1c1c" stroke-width="3.4" stroke-linecap="square" opacity="0.92"/>${Array.from({ length: 36 }, () => `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(0.6 + r() * 1.2)}" fill="#fff" opacity="0.7"/>`).join('')}`;
  return item(`casa-codigo-serie-${slug}`, `Código · numeração de série ${name}`, CAT, ['código', 'numeração', 'série', 'tipografia', name], svg(W, H, body), W, H);
}

function rosette(slug, name, a, b, turns, color) {
  const S = 520; const c = S / 2; const R = 230;
  let d = '';
  for (let t = 0; t <= Math.PI * 2 * turns; t += 0.012) {
    const r = R * (0.55 + 0.45 * Math.cos(t * a));
    const x = c + r * Math.cos(t * b);
    const y = c + r * Math.sin(t * b);
    d += `${t === 0 ? 'M' : 'L'} ${f(x)} ${f(y)} `;
  }
  const body = `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.1" stroke-opacity="0.75"/><circle cx="${c}" cy="${c}" r="${R + 14}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.8"/>`;
  return item(`casa-codigo-guilhoche-${slug}`, `Código · guilhoche ${name}`, CAT, ['código', 'guilhoche', 'segurança', 'rosácea', name], svg(S, S, body), S, S);
}

function microtext() {
  const phrase = 'DOCUMENTO OFICIAL ';
  const t = wordPath(phrase.repeat(10), { scale: 0.9, letterSpacing: 0.9 });
  const W = Math.ceil(t.width + 20);
  return item('casa-codigo-microtexto', 'Código · linha de microtexto', CAT, ['código', 'microtexto', 'segurança', 'linha'], svg(W, 18, `<path d="${t.d}" transform="translate(10 2)" fill="none" stroke="#000" stroke-width="0.8"/>`), W, 18);
}

function watermark() {
  const t = wordPath('ORIGINAL', { scale: 12, letterSpacing: 5 });
  const W = Math.ceil(t.width + 60); const H = Math.ceil(t.height + 60);
  return item('casa-codigo-marca-dagua', 'Código · marca d’água ORIGINAL', CAT, ['código', 'marca d’água', 'original', 'segurança'], svg(W, H, `<path d="${t.d}" transform="translate(30 30)" fill="none" stroke="#6d6a5c" stroke-width="12" stroke-linecap="square" stroke-opacity="0.22"/>`), W, H);
}

export function items() {
  return [
    barcode('curto', 'curto', 401, 38, 110), barcode('medio', 'médio', 402, 54, 130), barcode('longo', 'longo', 403, 72, 90),
    qr('pequeno', 'pequeno', 411, 21), qr('medio', 'médio', 412, 25), qr('grande', 'grande', 413, 29),
    serial('vermelho-a', 'A', 'Nº 004871', 421), serial('vermelho-b', 'B', 'SÉRIE B 119203', 422),
    rosette('verde', 'verde', 5, 7, 7, '#2f6b4a'), rosette('azul', 'azul', 3, 8, 8, '#2b4f8f'),
    microtext(), watermark(),
  ];
}
