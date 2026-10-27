import { rng, f, svg, shadowDef, linearDef, radialDef, grainDef, item } from './svgkit.js';
import { wordPath, handWord } from './letters.js';

const CAT = 'Marcas de investigação';

function yarn(slug, name, d, w, h, seed) {
  const body = `<g filter="url(#s)"><path d="${d}" fill="none" stroke="#7a1010" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#c0281f" stroke-width="5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#e86a5c" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="3 6" opacity="0.8"/></g>`;
  return item(`casa-investigacao-barbante-${slug}`, `Investigação · barbante vermelho ${name}`, CAT, ['investigação', 'barbante', 'vermelho', 'conexão', name], svg(w, h, body, shadowDef('s', 2, 3, 0.4)), w, h);
}

function pin(color, name, hi) {
  const w = 110; const h = 140;
  const body = `<g filter="url(#s)"><ellipse cx="55" cy="118" rx="22" ry="7" fill="#000" opacity="0.28"/><path d="M 55 62 L 51 124 L 59 124 Z" fill="#a8adb3"/><ellipse cx="55" cy="46" rx="32" ry="28" fill="url(#k)"/><ellipse cx="46" cy="36" rx="10" ry="7" fill="#fff" opacity="0.5"/></g>`;
  return item(`casa-investigacao-alfinete-${name}`, `Investigação · alfinete ${name}`, CAT, ['investigação', 'alfinete', 'tachinha', name], svg(w, h, body, radialDef('k', [[0, hi], [1, color]]) + shadowDef('s', 2, 2, 0.4)), w, h);
}

function postit(slug, name, color, shade, seed, lines) {
  const w = 360; const h = 360;
  const r = rng(seed);
  let rules = '';
  for (let i = 0; i < lines; i++) rules += `<path d="M 40 ${130 + i * 42} H 320" stroke="#000" stroke-opacity="0.12" stroke-width="2"/>`;
  const body = `<g filter="url(#s)"><path d="M 16 16 H 344 V 322 Q 344 336 330 338 Q 170 350 16 340 Z" fill="url(#k)"/><path d="M 344 322 Q 330 340 300 345 Q 318 332 330 318 Z" fill="${shade}" opacity="0.55"/><rect x="16" y="16" width="328" height="44" fill="#fff" opacity="0.14"/>${rules}</g>`;
  return item(`casa-investigacao-postit-${slug}`, `Investigação · post-it ${name}`, CAT, ['investigação', 'post-it', 'nota', 'adesivo', name], svg(w, h, body, linearDef('k', [[0, color], [1, shade]]) + shadowDef('s', 4, 5, 0.38)), w, h);
}

function evidenceTag(n, seed) {
  const w = 240; const h = 330;
  const t = wordPath(String(n), { scale: 14, letterSpacing: 6 });
  const body = `<g filter="url(#s)"><path d="M 20 310 L 20 70 L 120 18 L 220 70 L 220 310 Z" fill="#f2c230" stroke="#9a7608" stroke-width="3"/><path d="M 20 70 L 120 18 L 220 70" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="3"/><path d="${t.d}" transform="translate(${f(120 - t.width / 2)} 130)" fill="none" stroke="#111" stroke-width="12" stroke-linecap="square" stroke-linejoin="miter"/><rect x="20" y="296" width="200" height="14" fill="#000" opacity="0.14"/></g>`;
  return item(`casa-investigacao-etiqueta-numerada-${n}`, `Investigação · etiqueta numerada de cena de crime ${n}`, CAT, ['investigação', 'etiqueta', 'numerada', 'cena do crime', 'perícia', String(n)], svg(w, h, body, shadowDef('s', 4, 4, 0.4)), w, h);
}

function forensicRuler() {
  const w = 900; const h = 150;
  let ticks = '';
  for (let i = 0; i <= 80; i++) {
    const x = 28 + i * 10.5; const long = i % 10 === 0; const mid = i % 5 === 0;
    ticks += `<path d="M ${f(x)} 8 V ${long ? 54 : mid ? 40 : 28}" stroke="#111" stroke-width="${long ? 2.4 : 1.4}"/>`;
    if (long) { const t = wordPath(String(i / 10), { scale: 1.8, letterSpacing: 1 }); ticks += `<path d="${t.d}" transform="translate(${f(x - t.width / 2)} 60)" fill="none" stroke="#111" stroke-width="1.8"/>`; }
  }
  let blocks = '';
  for (let i = 0; i < 6; i++) blocks += `<rect x="${24 + i * 24}" y="104" width="24" height="26" fill="${['#111', '#fff', '#c0281f', '#2b6ad0', '#f2c230', '#111'][i]}" stroke="#111" stroke-width="1"/>`;
  const body = `<g filter="url(#s)"><rect x="8" y="4" width="884" height="142" fill="#e9e4d4" stroke="#8a826a" stroke-width="2"/>${ticks}${blocks}</g>`;
  return item('casa-investigacao-regua-forense', 'Investigação · régua forense com escala de cor', CAT, ['investigação', 'régua', 'forense', 'escala', 'perícia'], svg(w, h, body, shadowDef('s', 3, 3, 0.35)), w, h);
}

export function items() {
  return [
    yarn('reto', 'esticado', 'M 10 40 Q 250 60 490 30', 500, 80, 1), yarn('curvo', 'em curva', 'M 10 150 C 120 10 300 10 410 140', 420, 170, 2), yarn('frouxo', 'frouxo', 'M 10 30 C 100 120 200 130 300 80 S 440 20 490 90', 500, 150, 3),
    pin('#b3261e', 'vermelho', '#ff8a7c'), pin('#2b6ad0', 'azul', '#8fb6ff'), pin('#e0b020', 'amarelo', '#ffe27a'), pin('#2f8f4a', 'verde', '#8fe0a2'),
    postit('amarelo', 'amarelo', '#fff27a', '#e8d84a', 801, 5), postit('rosa', 'rosa', '#ffb3cf', '#ee8fb4', 802, 5), postit('azul', 'azul', '#a8d8ff', '#7cb9ea', 803, 5),
    evidenceTag(1, 1), evidenceTag(2, 2), evidenceTag(3, 3),
    forensicRuler(),
  ];
}
