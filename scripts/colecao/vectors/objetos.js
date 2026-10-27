import { rng, f, svg, shadowDef, grainDef, linearDef, radialDef, item } from './svgkit.js';
import { wordPath } from './letters.js';

const CAT = 'Objetos';

function spiral(id, name, vertical, tags) {
  const w = vertical ? 90 : 900;
  const h = vertical ? 900 : 90;
  const n = 30;
  let rings = '';
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * ((vertical ? h : w) / n);
    rings += vertical
      ? `<ellipse cx="62" cy="${f(t)}" rx="26" ry="7" fill="none" stroke="url(#m)" stroke-width="6"/><ellipse cx="22" cy="${f(t)}" rx="8" ry="8" fill="#16130f" opacity="0.85"/>`
      : `<ellipse cx="${f(t)}" cy="28" rx="7" ry="26" fill="none" stroke="url(#m)" stroke-width="6"/><ellipse cx="${f(t)}" cy="68" rx="8" ry="8" fill="#16130f" opacity="0.85"/>`;
  }
  return item(id, name, CAT, tags, svg(w, h, `<g filter="url(#s)">${rings}</g>`, linearDef('m', [[0, '#f2f2f2'], [0.5, '#8d9298'], [1, '#d9dcdf']], vertical ? 1 : 0, vertical ? 0 : 1) + shadowDef('s', 2, 2, 0.4)), w, h);
}

function binderRings() {
  let body = '<rect x="10" y="0" width="70" height="480" rx="6" fill="#2b2b2e" filter="url(#s)"/>';
  for (const y of [60, 240, 420]) {
    body += `<ellipse cx="100" cy="${y}" rx="48" ry="62" fill="none" stroke="#6d7279" stroke-width="12"/><ellipse cx="100" cy="${y}" rx="48" ry="62" fill="none" stroke="url(#m)" stroke-width="7"/><rect x="26" y="${y - 22}" width="38" height="44" rx="8" fill="url(#m)"/>`;
  }
  return item('casa-objeto-argolas-fichario', 'Objeto · argolas de fichário', CAT, ['objeto', 'fichário', 'argolas', 'metal'], svg(170, 480, body, linearDef('m', [[0, '#f4f4f4'], [0.5, '#8a9096'], [1, '#d4d7da']], 1, 0) + shadowDef('s', 3, 3, 0.4)), 170, 480);
}

function clipboard() {
  const w = 620; const h = 860;
  const body = `<g filter="url(#s)"><rect x="10" y="30" width="600" height="820" rx="14" fill="url(#w)"/><rect x="10" y="30" width="600" height="820" rx="14" fill="#000" filter="url(#g)" opacity="0.2"/>
  <rect x="60" y="110" width="500" height="690" fill="#f5f2e8" opacity="0.0"/></g>`;
  return item('casa-objeto-prancheta', 'Objeto · prancheta de madeira', CAT, ['objeto', 'prancheta', 'madeira', 'base'], svg(w, h, body, linearDef('w', [[0, '#9a6b3c'], [0.5, '#80532b'], [1, '#6b4322']], 1, 0.3) + shadowDef('s', 5, 5, 0.45) + grainDef('g', 12, 0.025, 0.5)), w, h);
}

function clipboardClip() {
  const w = 300; const h = 150;
  const body = `<g filter="url(#s)"><path d="M 30 130 L 30 50 Q 30 20 60 20 L 240 20 Q 270 20 270 50 L 270 130 Z" fill="url(#m)" stroke="#5c6167" stroke-width="3"/><rect x="95" y="6" width="110" height="34" rx="12" fill="url(#m)" stroke="#5c6167" stroke-width="3"/><rect x="40" y="100" width="220" height="18" fill="#3f4348" opacity="0.5"/><circle cx="150" cy="23" r="8" fill="#555a60"/></g>`;
  return item('casa-objeto-prendedor-prancheta', 'Objeto · prendedor de prancheta', CAT, ['objeto', 'prancheta', 'prendedor', 'metal'], svg(w, h, body, linearDef('m', [[0, '#eceef0'], [0.5, '#9aa0a6'], [1, '#c9ccd0']], 0, 1) + shadowDef('s', 3, 3, 0.4)), w, h);
}

function badge(slug, name, color, seed) {
  const w = 360; const h = 560;
  const r = rng(seed);
  const body = `<g filter="url(#s)"><path d="M 150 0 Q 140 150 120 240" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"/><path d="M 210 0 Q 220 150 240 240" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"/>
  <rect x="150" y="226" width="60" height="26" rx="8" fill="url(#m)"/><rect x="164" y="236" width="32" height="7" rx="3" fill="#2a2c30"/>
  <rect x="40" y="262" width="280" height="290" rx="22" fill="#f7f7f4" stroke="#c8c8c2" stroke-width="3"/><rect x="40" y="262" width="280" height="62" rx="22" fill="${color}"/><rect x="40" y="300" width="280" height="24" fill="${color}"/>
  <rect x="104" y="350" width="152" height="120" rx="6" fill="#d9d6cc" stroke="#aaa69a" stroke-width="2"/><circle cx="180" cy="392" r="26" fill="#bdb9ad"/><path d="M 130 470 Q 180 405 230 470 Z" fill="#bdb9ad"/>
  <rect x="64" y="486" width="232" height="10" rx="3" fill="#c9c6bb"/><rect x="64" y="508" width="150" height="10" rx="3" fill="#c9c6bb"/></g>`;
  return item(`casa-objeto-cracha-${slug}`, `Objeto · crachá com cordão ${name}`, CAT, ['objeto', 'crachá', 'cordão', 'identificação', name], svg(w, h, body, linearDef('m', [[0, '#eee'], [1, '#999']]) + shadowDef('s', 4, 4, 0.4)), w, h);
}

function scrollRod(slug, name, top) {
  const w = 900; const h = 110;
  const y = top ? 60 : 50;
  const body = `<g filter="url(#s)"><rect x="70" y="${y - 22}" width="760" height="44" rx="22" fill="url(#m)"/><circle cx="50" cy="${y}" r="38" fill="url(#k)"/><circle cx="850" cy="${y}" r="38" fill="url(#k)"/><circle cx="26" cy="${y}" r="14" fill="url(#k)"/><circle cx="874" cy="${y}" r="14" fill="url(#k)"/>
  <rect x="120" y="${y - 22}" width="12" height="44" fill="#4a2f17" opacity="0.5"/><rect x="768" y="${y - 22}" width="12" height="44" fill="#4a2f17" opacity="0.5"/></g>`;
  return item(`casa-objeto-hastes-pergaminho-${slug}`, `Objeto · hastes de pergaminho (${name})`, CAT, ['objeto', 'pergaminho', 'hastes', 'madeira', 'medieval'], svg(w, h, body, linearDef('m', [[0, '#8b5a2b'], [0.5, '#c28b4f'], [1, '#6e431e']]) + radialDef('k', [[0, '#d9a066'], [1, '#6a3f1b']]) + shadowDef('s', 3, 4, 0.45)), w, h);
}

function bookSpine(slug, name, color, seed) {
  const w = 220; const h = 760;
  const r = rng(seed);
  let bands = '';
  for (const y of [90, 150, 610, 670]) bands += `<rect x="6" y="${y}" width="208" height="14" fill="#d7b565" opacity="0.85"/><rect x="6" y="${y + 3}" width="208" height="2" fill="#7a5a1c" opacity="0.6"/>`;
  const label = wordPath('MEMÓRIAS', { scale: 3, letterSpacing: 1.2 });
  const body = `<g filter="url(#s)"><path d="M 10 8 Q 110 -4 210 8 L 214 752 Q 110 764 6 752 Z" fill="${color}"/><path d="M 10 8 Q 110 -4 210 8 L 214 752 Q 110 764 6 752 Z" fill="#000" filter="url(#g)" opacity="0.7"/>
  ${bands}<rect x="40" y="230" width="140" height="300" fill="#1b130c" opacity="0.18"/><g transform="translate(150 262) rotate(90)"><path d="${label.d}" fill="none" stroke="#d7b565" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
  <path d="M 10 8 Q 110 -4 210 8" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="3"/></g>`;
  return item(`casa-objeto-lombada-livro-${slug}`, `Objeto · lombada de livro ${name}`, CAT, ['objeto', 'livro', 'lombada', 'couro', name], svg(w, h, body, shadowDef('s', 4, 4, 0.4) + grainDef('g', seed, 0.9, 0.5)), w, h);
}

function dossier(slug, name, color, edge, seed) {
  const w = 900; const h = 1200;
  const body = `<g filter="url(#s)"><path d="M 20 70 L 20 1180 L 880 1180 L 880 70 L 520 70 Q 500 70 488 40 Q 478 18 452 18 L 60 18 Q 20 18 20 70 Z" fill="${color}"/><path d="M 20 70 L 20 1180 L 880 1180 L 880 70 L 520 70 Q 500 70 488 40 Q 478 18 452 18 L 60 18 Q 20 18 20 70 Z" fill="#000" filter="url(#g)" opacity="0.22"/>
  <path d="M 20 70 L 880 70" stroke="${edge}" stroke-width="3" opacity="0.7"/><rect x="40" y="1150" width="820" height="12" fill="#000" opacity="0.08"/><rect x="330" y="470" width="240" height="120" fill="#f4efe0" opacity="0.88" rx="4"/><rect x="350" y="500" width="200" height="8" fill="#6b6657" opacity="0.7"/><rect x="350" y="526" width="140" height="8" fill="#6b6657" opacity="0.7"/></g>`;
  return item(`casa-objeto-capa-dossie-${slug}`, `Objeto · capa de dossiê ${name}`, CAT, ['objeto', 'dossiê', 'capa', 'pasta', name], svg(w, h, body, shadowDef('s', 6, 6, 0.4) + grainDef('g', seed, 0.7, 0.4)), w, h);
}

function hangingFolder() {
  const w = 900; const h = 360;
  const body = `<g filter="url(#s)"><path d="M 20 330 L 20 90 L 880 90 L 880 330 Z" fill="#3e6b4d"/><path d="M 20 90 L 150 90 L 190 30 L 420 30 L 460 90" fill="#355c42"/><rect x="215" y="46" width="190" height="34" rx="3" fill="#f2efe2" stroke="#9b977f"/><rect x="226" y="58" width="120" height="8" fill="#8f8a74"/><rect x="0" y="86" width="40" height="12" fill="#999da2"/><rect x="860" y="86" width="40" height="12" fill="#999da2"/></g>`;
  return item('casa-objeto-pasta-suspensa', 'Objeto · pasta suspensa com etiqueta', CAT, ['objeto', 'pasta', 'suspensa', 'arquivo', 'escritório'], svg(w, h, body, shadowDef('s', 4, 4, 0.4)), w, h);
}

function stringEnvelope() {
  const w = 900; const h = 640;
  const body = `<g filter="url(#s)"><rect x="20" y="20" width="860" height="600" fill="url(#k)"/><rect x="20" y="20" width="860" height="600" fill="#000" filter="url(#g)" opacity="0.2"/><path d="M 20 20 L 450 330 L 880 20" fill="#b8905a" stroke="#8a6a3a" stroke-width="2"/>
  <circle cx="450" cy="340" r="26" fill="#cfa86e" stroke="#7d6034" stroke-width="3"/><circle cx="450" cy="340" r="14" fill="#a98652"/><path d="M 450 340 C 520 380 560 330 600 400 S 520 520 450 500" fill="none" stroke="#e8e0cf" stroke-width="5" stroke-linecap="round"/><circle cx="450" cy="470" r="20" fill="#cfa86e" stroke="#7d6034" stroke-width="3"/></g>`;
  return item('casa-objeto-envelope-pardo-cordao', 'Objeto · envelope pardo com cordão', CAT, ['objeto', 'envelope', 'pardo', 'cordão', 'arquivo'], svg(w, h, body, linearDef('k', [[0, '#c9a06a'], [1, '#b08650']]) + shadowDef('s', 5, 5, 0.4) + grainDef('g', 31, 0.8, 0.4)), w, h);
}

function vhsLabel() {
  const w = 480; const h = 160;
  const body = `<g filter="url(#s)"><rect x="10" y="10" width="460" height="140" fill="#f3f1ea" stroke="#c9c6b8" stroke-width="2"/><rect x="10" y="10" width="460" height="36" fill="#c0392b"/><rect x="26" y="26" width="90" height="8" fill="#f3f1ea" opacity="0.9"/><g stroke="#8d8a7c" stroke-width="2"><path d="M 26 80 H 454"/><path d="M 26 106 H 454"/><path d="M 26 132 H 454"/></g></g>`;
  return item('casa-objeto-etiqueta-vhs', 'Objeto · etiqueta de fita VHS', CAT, ['objeto', 'etiqueta', 'vhs', 'fita', 'anos 80'], svg(w, h, body, shadowDef('s', 2, 2, 0.3)), w, h);
}

function vhsTape() {
  const w = 760; const h = 420;
  const body = `<g filter="url(#s)"><rect x="20" y="20" width="720" height="380" rx="14" fill="#1d1d20"/><rect x="20" y="20" width="720" height="380" rx="14" fill="none" stroke="#3a3a40" stroke-width="3"/><rect x="60" y="48" width="640" height="150" fill="#f3f1ea"/><rect x="60" y="48" width="640" height="36" fill="#c0392b"/><rect x="60" y="300" width="640" height="76" rx="8" fill="#2b2b30"/><rect x="190" y="316" width="380" height="44" rx="6" fill="#0f0f12"/><circle cx="260" cy="338" r="30" fill="#e8e8e8"/><circle cx="500" cy="338" r="30" fill="#e8e8e8"/><circle cx="260" cy="338" r="14" fill="#222"/><circle cx="500" cy="338" r="14" fill="#222"/><path d="M 60 230 H 700" stroke="#56565c" stroke-width="2"/><circle cx="46" cy="380" r="8" fill="#0f0f12"/><circle cx="714" cy="380" r="8" fill="#0f0f12"/></g>`;
  return item('casa-objeto-fita-vhs', 'Objeto · fita VHS', CAT, ['objeto', 'fita', 'vhs', 'vídeo', 'anos 80'], svg(w, h, body, shadowDef('s', 4, 4, 0.45)), w, h);
}

function cassette() {
  const w = 640; const h = 410;
  const body = `<g filter="url(#s)"><rect x="20" y="20" width="600" height="370" rx="22" fill="#e6e2d6" stroke="#b3ae9c" stroke-width="3"/><rect x="60" y="56" width="520" height="190" rx="10" fill="#f7f5ee"/><rect x="60" y="56" width="520" height="48" rx="10" fill="#d4572e"/><rect x="170" y="256" width="300" height="100" rx="14" fill="#2b2b30"/><circle cx="240" cy="296" r="34" fill="#e8e6dc"/><circle cx="400" cy="296" r="34" fill="#e8e6dc"/><circle cx="240" cy="296" r="15" fill="#2b2b30"/><circle cx="400" cy="296" r="15" fill="#2b2b30"/><rect x="290" y="330" width="60" height="22" rx="4" fill="#d7d3c4"/><circle cx="48" cy="48" r="9" fill="#9a9686"/><circle cx="592" cy="48" r="9" fill="#9a9686"/><circle cx="48" cy="362" r="9" fill="#9a9686"/><circle cx="592" cy="362" r="9" fill="#9a9686"/><path d="M 80 160 H 560 M 80 190 H 560 M 80 220 H 400" stroke="#b9b5a5" stroke-width="2"/></g>`;
  return item('casa-objeto-fita-cassete', 'Objeto · fita cassete', CAT, ['objeto', 'fita', 'cassete', 'áudio', 'anos 80'], svg(w, h, body, shadowDef('s', 4, 4, 0.45)), w, h);
}

function tagWithString() {
  const w = 420; const h = 800;
  const body = `<g filter="url(#s)"><path d="M 210 40 C 180 10 120 10 110 60" fill="none" stroke="#d9d2bf" stroke-width="8" stroke-linecap="round"/><path d="M 210 40 C 240 10 300 10 310 60 C 320 120 270 130 230 150" fill="none" stroke="#d9d2bf" stroke-width="8" stroke-linecap="round"/>
  <path d="M 130 150 L 290 150 L 330 200 L 330 770 L 90 770 L 90 200 Z" fill="url(#k)"/><path d="M 130 150 L 290 150 L 330 200 L 330 770 L 90 200 Z" fill="none"/><circle cx="210" cy="190" r="22" fill="#d9d2bf"/><circle cx="210" cy="190" r="12" fill="#2b2b2e"/><circle cx="210" cy="190" r="17" fill="none" stroke="#999" stroke-width="5"/><g stroke="#8c8573" stroke-width="2"><path d="M 120 330 H 300"/><path d="M 120 400 H 300"/><path d="M 120 470 H 300"/><path d="M 120 540 H 300"/></g></g>`;
  return item('casa-objeto-etiqueta-corpo', 'Objeto · etiqueta de cartolina com ilhós e barbante', CAT, ['objeto', 'etiqueta', 'ilhós', 'barbante', 'identificação'], svg(w, h, body, linearDef('k', [[0, '#e3d6b4'], [1, '#d3c39a']]) + shadowDef('s', 4, 4, 0.4)), w, h);
}

function keyTag() {
  const w = 300; const h = 560;
  const body = `<g filter="url(#s)"><circle cx="150" cy="70" r="46" fill="none" stroke="#9aa0a6" stroke-width="10"/><circle cx="150" cy="70" r="46" fill="none" stroke="#d6d9dc" stroke-width="4"/><path d="M 150 116 V 180" stroke="#9aa0a6" stroke-width="8"/><rect x="190" y="104" width="12" height="130" fill="url(#m)" transform="rotate(-18 190 104)"/>
  <path d="M 90 190 L 210 190 L 232 230 L 232 520 L 68 520 L 68 230 Z" fill="#c0392b"/><circle cx="150" cy="232" r="14" fill="#f2efe2"/><rect x="92" y="300" width="116" height="9" fill="#f2efe2" opacity="0.85"/><rect x="92" y="330" width="80" height="9" fill="#f2efe2" opacity="0.85"/></g>`;
  return item('casa-objeto-chave-etiqueta', 'Objeto · chaveiro com etiqueta vermelha', CAT, ['objeto', 'chave', 'etiqueta', 'chaveiro'], svg(w, h, body, linearDef('m', [[0, '#eee'], [1, '#888']], 1, 0) + shadowDef('s', 3, 3, 0.4)), w, h);
}

function pin() {
  const w = 120; const h = 150;
  const body = `<g filter="url(#s)"><ellipse cx="60" cy="118" rx="26" ry="8" fill="#000" opacity="0.25"/><path d="M 60 60 L 56 128 L 64 128 Z" fill="#9aa0a6"/><ellipse cx="60" cy="48" rx="34" ry="30" fill="url(#k)"/><ellipse cx="50" cy="38" rx="11" ry="8" fill="#fff" opacity="0.45"/></g>`;
  return item('casa-objeto-tachinha-quadro', 'Objeto · tachinha de quadro', CAT, ['objeto', 'tachinha', 'quadro', 'cortiça'], svg(w, h, body, radialDef('k', [[0, '#ff7b6d'], [1, '#a1201a']]) + shadowDef('s', 2, 2, 0.4)), w, h);
}

function corkFrame() {
  const w = 1000; const h = 760;
  const body = `<g filter="url(#s)"><rect x="10" y="10" width="980" height="740" rx="10" fill="#6a4423"/><rect x="40" y="40" width="920" height="680" fill="url(#k)"/><rect x="40" y="40" width="920" height="680" fill="#000" filter="url(#g)" opacity="0.8"/><rect x="40" y="40" width="920" height="680" fill="none" stroke="#3f2711" stroke-width="3"/></g>`;
  return item('casa-objeto-moldura-cortica', 'Objeto · quadro de cortiça com moldura de madeira', CAT, ['objeto', 'cortiça', 'quadro', 'moldura', 'investigação'], svg(w, h, body, linearDef('k', [[0, '#c79a63'], [1, '#b98a52']]) + shadowDef('s', 6, 6, 0.4) + grainDef('g', 77, 0.45, 0.6)), w, h);
}

function archiveBox() {
  const w = 760; const h = 520;
  const body = `<g filter="url(#s)"><path d="M 30 120 L 730 120 L 730 500 L 30 500 Z" fill="url(#k)"/><path d="M 20 70 L 740 70 L 730 130 L 30 130 Z" fill="#a5855a"/><rect x="250" y="190" width="260" height="120" rx="6" fill="#f2efe2" stroke="#9b977f" stroke-width="3"/><rect x="274" y="214" width="150" height="10" fill="#8f8a74"/><rect x="274" y="246" width="200" height="10" fill="#8f8a74"/><ellipse cx="380" cy="380" rx="70" ry="22" fill="#6e5230" opacity="0.5"/></g>`;
  return item('casa-objeto-caixa-arquivo', 'Objeto · caixa de arquivo com etiqueta', CAT, ['objeto', 'caixa', 'arquivo', 'papelão'], svg(w, h, body, linearDef('k', [[0, '#b8946a'], [1, '#a07c52']]) + shadowDef('s', 5, 5, 0.4)), w, h);
}

function ribbonBookmark() {
  const w = 160; const h = 700;
  const body = `<g filter="url(#s)"><path d="M 30 0 L 130 0 L 130 680 L 80 620 L 30 680 Z" fill="url(#k)"/><path d="M 60 0 V 620" stroke="#fff" stroke-opacity="0.18" stroke-width="3"/></g>`;
  return item('casa-objeto-fita-marcador', 'Objeto · fita marcadora de livro', CAT, ['objeto', 'marcador', 'livro', 'fita', 'cetim'], svg(w, h, body, linearDef('k', [[0, '#8e1b2d'], [0.5, '#b4283e'], [1, '#7a1424']], 1, 0) + shadowDef('s', 3, 3, 0.35)), w, h);
}

function wooden() {
  const w = 700; const h = 140;
  const body = `<g filter="url(#s)"><rect x="10" y="20" width="680" height="100" rx="8" fill="url(#k)"/><rect x="10" y="20" width="680" height="100" rx="8" fill="#000" filter="url(#g)" opacity="0.2"/><g stroke="#000" stroke-opacity="0.25"><path d="M 10 50 H 690"/><path d="M 10 80 H 690"/></g></g>`;
  return item('casa-objeto-ripa-madeira', 'Objeto · ripa de madeira', CAT, ['objeto', 'madeira', 'ripa', 'prancha'], svg(w, h, body, linearDef('k', [[0, '#a0703f'], [1, '#7a4f27']]) + shadowDef('s', 4, 4, 0.4) + grainDef('g', 91, 0.03, 0.6)), w, h);
}

function ruler() {
  const w = 900; const h = 130;
  let ticks = '';
  for (let i = 0; i <= 60; i++) { const x = 30 + i * 14; const len = i % 10 === 0 ? 46 : i % 5 === 0 ? 34 : 22; ticks += `<path d="M ${x} 14 V ${14 + len}" stroke="#2a2a2a" stroke-width="${i % 10 === 0 ? 2.2 : 1.4}"/>`; }
  const body = `<g filter="url(#s)"><rect x="10" y="8" width="880" height="114" rx="6" fill="url(#k)" stroke="#a89358"/>${ticks}</g>`;
  return item('casa-objeto-regua', 'Objeto · régua de madeira', CAT, ['objeto', 'régua', 'medida', 'madeira'], svg(w, h, body, linearDef('k', [[0, '#e6d29a'], [1, '#d2bb7b']]) + shadowDef('s', 3, 3, 0.35)), w, h);
}

function folderTab() {
  const w = 900; const h = 220;
  const body = `<g filter="url(#s)"><path d="M 20 200 L 20 60 Q 20 30 50 30 L 300 30 Q 330 30 345 55 Q 358 80 390 80 L 880 80 L 880 200 Z" fill="#d6b97d"/><path d="M 20 200 L 20 60 Q 20 30 50 30 L 300 30 Q 330 30 345 55 Q 358 80 390 80 L 880 80 L 880 200 Z" fill="#000" filter="url(#g)" opacity="0.2"/><rect x="60" y="48" width="220" height="24" fill="#f4efe0" opacity="0.9"/></g>`;
  return item('casa-objeto-aba-pasta', 'Objeto · aba de pasta de arquivo', CAT, ['objeto', 'pasta', 'aba', 'arquivo'], svg(w, h, body, shadowDef('s', 3, 3, 0.35) + grainDef('g', 44, 0.7, 0.4)), w, h);
}

export function items() {
  return [
    spiral('casa-objeto-espiral-topo', 'Objeto · espiral de caderno (topo)', false, ['objeto', 'caderno', 'espiral', 'topo']),
    spiral('casa-objeto-espiral-lateral', 'Objeto · espiral de caderno (lateral)', true, ['objeto', 'caderno', 'espiral', 'lateral']),
    binderRings(), clipboard(), clipboardClip(),
    badge('azul', 'azul', '#2f5d9e', 301), badge('vermelho', 'vermelho', '#b3322a', 302),
    scrollRod('topo', 'topo', true), scrollRod('base', 'base', false),
    bookSpine('couro', 'de couro', '#5a3420', 311), bookSpine('vinho', 'vinho', '#6a1f2b', 312), bookSpine('verde', 'verde', '#25472f', 313),
    dossier('kraft', 'kraft', '#c3a06b', '#8a6a3a', 321), dossier('preta', 'preta', '#222226', '#555', 322), dossier('verde', 'verde', '#3b5d46', '#26402f', 323),
    hangingFolder(), stringEnvelope(), vhsLabel(), vhsTape(), cassette(), tagWithString(), keyTag(), pin(), corkFrame(), archiveBox(),
    ribbonBookmark(), wooden(), ruler(), folderTab(),
  ];
}
