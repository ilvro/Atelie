import { rng, f, svg, wobblyPath, item } from './svgkit.js';
import { handWord } from './letters.js';

const CAT = 'Rabiscos à mão';
const INK = '#111';
const stroke = (d, w = 3.2, extra = '') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

function arrow(slug, name, pts, head, seed, w = 360, h = 160, both = false) {
  const r = rng(seed);
  const [ex, ey] = pts[pts.length - 1];
  const [px, py] = pts[pts.length - 2];
  const a = Math.atan2(ey - py, ex - px);
  const hd = (da, len) => `M ${f(ex)} ${f(ey)} L ${f(ex - Math.cos(a + da) * len)} ${f(ey - Math.sin(a + da) * len)}`;
  let body = stroke(wobblyPath(pts, r, 1.6)) + stroke(`${hd(0.5, head)} ${hd(-0.45, head * 0.9)}`, 3.4);
  if (both) {
    const [sx, sy] = pts[0];
    const [nx, ny] = pts[1];
    const b = Math.atan2(sy - ny, sx - nx);
    const sh = da => `M ${f(sx)} ${f(sy)} L ${f(sx - Math.cos(b + da) * head)} ${f(sy - Math.sin(b + da) * head)}`;
    body += stroke(`${sh(0.5)} ${sh(-0.45)}`, 3.4);
  }
  return item(`casa-rabisco-seta-${slug}`, `Rabisco · seta ${name}`, CAT, ['rabisco', 'seta', 'mão', name], svg(w, h, body), w, h);
}

function circle(slug, name, seed, loops, rx = 150, ry = 60) {
  const r = rng(seed);
  const pts = [];
  const n = 26 * loops;
  for (let i = 0; i <= n; i++) {
    const t = (i / 26) * Math.PI * 2;
    const k = 1 + (i / n) * 0.06 + (r() - 0.5) * 0.05;
    pts.push([200 + Math.cos(t) * rx * k, 90 + Math.sin(t) * ry * k]);
  }
  return item(`casa-rabisco-circulo-${slug}`, `Rabisco · círculo ${name}`, CAT, ['rabisco', 'círculo', 'destaque', 'mão'], svg(400, 180, stroke(wobblyPath(pts, r, 1.3), 3.4)), 400, 180);
}

function strike(slug, name, seed, zig) {
  const r = rng(seed);
  const pts = zig ? Array.from({ length: 9 }, (_, i) => [20 + i * 40, 30 + (i % 2 ? 36 : 0)]) : [[16, 40], [120, 34], [230, 46], [344, 36]];
  const twice = slug === 'duplo' ? stroke(wobblyPath(pts.map(([x, y]) => [x, y + 14]), r, 1.8), 3.4) : '';
  return item(`casa-rabisco-risco-${slug}`, `Rabisco · risco ${name}`, CAT, ['rabisco', 'riscado', 'cortar', 'mão'], svg(360, 80, stroke(wobblyPath(pts, r, 1.8), 3.4) + twice), 360, 80);
}

function tally(count, seed) {
  const r = rng(seed);
  let body = '';
  let x = 20;
  for (let i = 0; i < count; i++) {
    const g = Math.floor(i / 5); const k = i % 5;
    const gx = 20 + g * 96;
    if (k < 4) body += stroke(wobblyPath([[gx + k * 20, 20 + (r() - 0.5) * 3], [gx + k * 20 + (r() - 0.5) * 3, 110]], r, 1.2), 4);
    else body += stroke(wobblyPath([[gx - 8, 100], [gx + 76, 28]], r, 1.2), 4);
  }
  const groups = Math.ceil(count / 5);
  const w = 40 + groups * 96;
  return item(`casa-rabisco-contagem-${count}`, `Rabisco · contagem de dias (${count})`, CAT, ['rabisco', 'contagem', 'palitinhos', 'dias', 'prisão'], svg(w, 140, body), w, 140);
}

function hand(slug, name, text, scale, seed, w, h, tilt = -3) {
  const t = handWord(text, { scale, letterSpacing: 1.6, jitter: 0.5, seed });
  const W = Math.ceil(t.width + 40);
  return item(`casa-rabisco-${slug}`, `Rabisco · ${name}`, CAT, ['rabisco', 'letra à mão', 'anotação', ...slug.split('-')], svg(W, Math.ceil(t.height + 30), `<g transform="rotate(${tilt} ${W / 2} 30)"><path d="${t.d}" transform="translate(20 8)" fill="none" stroke="${INK}" stroke-width="${f(scale * 0.8)}" stroke-linecap="round" stroke-linejoin="round"/></g>`), W, Math.ceil(t.height + 30));
}

function face(slug, name, seed, crossed) {
  const r = rng(seed);
  const ring = Array.from({ length: 25 }, (_, i) => { const t = (i / 24) * Math.PI * 2; return [100 + Math.cos(t) * 62, 110 + Math.sin(t) * 74]; });
  let body = stroke(wobblyPath(ring, r, 1.8), 3.4);
  body += stroke(wobblyPath([[68, 92], [88, 88]], r, 1)) + stroke(wobblyPath([[112, 88], [132, 92]], r, 1));
  body += stroke(wobblyPath([[76, 140], [100, 148], [126, 138]], r, 1.2));
  if (crossed) {
    body += stroke(wobblyPath([[28, 30], [100, 120], [176, 196]], r, 2.4), 5) + stroke(wobblyPath([[176, 30], [100, 110], [28, 196]], r, 2.4), 5);
    body += stroke(wobblyPath([[40, 22], [160, 40], [40, 60], [160, 78]], r, 2.2), 3);
  }
  return item(`casa-rabisco-rosto-${slug}`, `Rabisco · rosto ${name}`, CAT, ['rabisco', 'rosto', 'desenho', 'margem', name], svg(200, 220, body), 200, 220);
}

function doodle(slug, name, build, seed, w = 220, h = 220) {
  const r = rng(seed);
  return item(`casa-rabisco-${slug}`, `Rabisco · ${name}`, CAT, ['rabisco', 'desenho', 'margem', 'mão', slug], svg(w, h, build(r)), w, h);
}

function scribbleMap(slug, name, seed) {
  const r = rng(seed);
  const w = 460; const h = 320;
  let body = stroke(wobblyPath([[20, 80], [120, 60], [200, 120], [300, 90], [420, 150]], r, 3), 3.2);
  body += stroke(wobblyPath([[60, 250], [140, 190], [230, 220], [330, 170], [410, 240]], r, 3), 3.2);
  body += stroke(wobblyPath([[150, 30], [170, 120], [160, 200], [190, 300]], r, 3), 2.6, 'stroke-dasharray="9 7"');
  body += stroke(wobblyPath([[250, 140], [262, 152], [244, 166], [256, 178]], r, 1.2), 4);
  body += `<path d="M 330 118 L 342 98 L 354 118 Z" fill="${INK}"/><path d="M 80 130 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0" fill="none" stroke="${INK}" stroke-width="3"/>`;
  body += stroke('M 360 266 L 392 246 M 392 266 L 360 246', 4);
  return item(`casa-rabisco-mapa-${slug}`, `Rabisco · mapa ${name}`, CAT, ['rabisco', 'mapa', 'croqui', 'trajeto', name], svg(w, h, body), w, h);
}

export function items() {
  return [
    arrow('reta', 'reta', [[20, 90], [120, 86], [220, 92], [330, 84]], 30, 601),
    arrow('curva', 'curva', [[24, 120], [90, 50], [200, 36], [310, 76], [340, 110]], 28, 602),
    arrow('em-u', 'em U', [[40, 20], [150, 8], [200, 70], [150, 136], [50, 120]], 28, 603),
    arrow('diagonal', 'diagonal', [[24, 140], [110, 100], [220, 54], [320, 18]], 30, 604),
    arrow('dupla', 'dupla ponta', [[40, 84], [160, 90], [300, 84]], 24, 605, 360, 160, true),
    arrow('ziguezague', 'ziguezague', [[24, 130], [90, 40], [160, 120], [230, 36], [330, 100]], 26, 606),
    circle('simples', 'simples', 611, 1), circle('duplo', 'duplo', 612, 2), circle('alto', 'alto', 613, 1, 90, 78),
    strike('reto', 'reto', 621, false), strike('ziguezague', 'em ziguezague', 622, true), strike('duplo', 'duplo', 623, false),
    tally(5, 631), tally(10, 632), tally(15, 633),
    hand('nao-confie', 'NÃO CONFIE', 'NÃO CONFIE', 6, 641, 420, 90),
    hand('ele-sabe', 'ELE SABE', 'ELE SABE', 6, 642, 420, 90, 2),
    hand('quem', 'QUEM?', 'QUEM?', 8, 643, 300, 90, -5),
    face('serio', 'sério', 651, false), face('riscado', 'riscado', 652, true),
    doodle('olho-margem', 'olho de margem', r => stroke(wobblyPath([[20, 110], [70, 60], [130, 60], [190, 110], [130, 160], [70, 160], [20, 110]], r, 2), 3.2) + stroke(wobblyPath(Array.from({ length: 13 }, (_, i) => [105 + Math.cos(i / 12 * 6.28) * 22, 110 + Math.sin(i / 12 * 6.28) * 22]), r, 1), 4), 661),
    doodle('estrela-margem', 'estrela de margem', r => stroke(wobblyPath([[110, 14], [136, 82], [206, 86], [150, 130], [170, 200], [110, 160], [50, 200], [70, 130], [14, 86], [84, 82], [110, 14]], r, 2), 3.2), 662),
    scribbleMap('rua', 'da rua', 671), scribbleMap('trilha', 'da trilha', 672),
  ];
}
