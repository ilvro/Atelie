import { f, svg, shadowDef, linearDef, item } from './svgkit.js';

const CAT = 'Interfaces';
const T = { claro: { bg: '#ffffff', bar: '#f1f1f4', ink: '#1c1c1e', mute: '#8e8e93', line: '#d8d8dc', bubbleIn: '#e9e9ee', bubbleOut: '#2f7cf6' }, escuro: { bg: '#111114', bar: '#1c1c20', ink: '#f2f2f5', mute: '#8a8a90', line: '#2c2c31', bubbleIn: '#2a2a30', bubbleOut: '#2b6ad0' } };

/** Phone frame: the screen is a transparent window, so the page or a chat shows through. */
function phone(kind, mode) {
  const w = 560; const h = 1140;
  const dark = mode === 'escuro';
  const body_ = kind === 'iphone' ? (dark ? '#1b1b1f' : '#d8d6d0') : (dark ? '#202226' : '#c8ccd2');
  const rim = dark ? '#3a3a40' : '#f4f4f2';
  const r = kind === 'iphone' ? 92 : 64;
  const screenR = kind === 'iphone' ? 72 : 40;
  const notch = kind === 'iphone'
    ? `<rect x="190" y="52" width="180" height="46" rx="23" fill="#050506"/>`
    : `<circle cx="280" cy="68" r="15" fill="#050506"/>`;
  const side = kind === 'iphone'
    ? `<rect x="552" y="260" width="8" height="120" rx="3" fill="${rim}"/><rect x="0" y="230" width="8" height="64" rx="3" fill="${rim}"/><rect x="0" y="320" width="8" height="90" rx="3" fill="${rim}"/>`
    : `<rect x="552" y="300" width="8" height="110" rx="3" fill="${rim}"/><rect x="552" y="440" width="8" height="64" rx="3" fill="${rim}"/>`;
  const frame = `M 14 ${r} Q 14 14 ${r} 14 H ${560 - r} Q 546 14 546 ${r} V ${h - r} Q 546 ${h - 14} ${560 - r} ${h - 14} H ${r} Q 14 ${h - 14} 14 ${h - r} Z`;
  const sx = 38; const sy = 40; const sw = 484; const sh = h - 80;
  const screen = `M ${sx} ${sy + screenR} Q ${sx} ${sy} ${sx + screenR} ${sy} H ${sx + sw - screenR} Q ${sx + sw} ${sy} ${sx + sw} ${sy + screenR} V ${sy + sh - screenR} Q ${sx + sw} ${sy + sh} ${sx + sw - screenR} ${sy + sh} H ${sx + screenR} Q ${sx} ${sy + sh} ${sx} ${sy + sh - screenR} Z`;
  const bottom = kind === 'iphone' ? '' : '';
  const body = `<g filter="url(#s)"><path fill-rule="evenodd" d="${frame} ${screen}" fill="${body_}"/><path d="${frame}" fill="none" stroke="${rim}" stroke-width="3" opacity="0.8"/><path d="${screen}" fill="none" stroke="#050506" stroke-width="5"/>${notch}${side}${bottom}</g>`;
  return item(`casa-interface-celular-${kind}-${mode}`, `Interface · celular ${kind === 'iphone' ? 'tipo iPhone' : 'Android'} (${mode})`, CAT, ['interface', 'celular', 'moldura', kind === 'iphone' ? 'iphone' : 'android', mode], svg(560, h, body, shadowDef('s', 6, 6, 0.4)), 560, h);
}

function statusBar(mode) {
  const c = T[mode];
  const w = 484; const h = 52;
  const bars = [0, 1, 2, 3].map(i => `<rect x="${340 + i * 9}" y="${34 - i * 5 - 6}" width="6" height="${6 + i * 5}" rx="1.5" fill="${c.ink}"/>`).join('');
  const body = `<rect width="${w}" height="${h}" fill="${c.bg}"/><rect x="30" y="18" width="62" height="16" rx="8" fill="${c.ink}" opacity="0.9"/>${bars}<path d="M 390 22 Q 400 12 410 22" fill="none" stroke="${c.ink}" stroke-width="3" stroke-linecap="round"/><path d="M 394 27 Q 400 22 406 27" fill="none" stroke="${c.ink}" stroke-width="3" stroke-linecap="round"/><circle cx="400" cy="31" r="2.2" fill="${c.ink}"/><rect x="420" y="16" width="38" height="20" rx="6" fill="none" stroke="${c.ink}" stroke-width="2.5"/><rect x="424" y="20" width="26" height="12" rx="3" fill="${c.ink}"/><rect x="459" y="23" width="3" height="6" rx="1" fill="${c.ink}"/>`;
  return item(`casa-interface-barra-status-${mode}`, `Interface · barra de status (${mode})`, CAT, ['interface', 'celular', 'barra de status', mode], svg(w, h, body), w, h);
}

function bubble(side, mode) {
  const c = T[mode];
  const out = side === 'enviado';
  const w = 380; const h = 110;
  const fill = out ? c.bubbleOut : c.bubbleIn;
  const tail = out ? `<path d="M 340 80 Q 372 96 376 104 Q 350 106 330 96 Z" fill="${fill}"/>` : `<path d="M 40 80 Q 8 96 4 104 Q 30 106 50 96 Z" fill="${fill}"/>`;
  const body = `<rect x="${out ? 8 : 14}" y="6" width="${w - 22}" height="${h - 20}" rx="34" fill="${fill}"/>${tail}`;
  return item(`casa-interface-balao-${side}-${mode}`, `Interface · balão de chat ${side} (${mode})`, CAT, ['interface', 'chat', 'balão', 'mensagem', side, mode], svg(w, h, body), w, h);
}

function typing(mode) {
  const c = T[mode];
  const w = 190; const h = 90;
  const body = `<rect x="6" y="6" width="${w - 14}" height="70" rx="35" fill="${c.bubbleIn}"/><circle cx="58" cy="41" r="9" fill="${c.mute}" opacity="0.45"/><circle cx="95" cy="41" r="9" fill="${c.mute}" opacity="0.7"/><circle cx="132" cy="41" r="9" fill="${c.mute}"/><path d="M 30 70 Q 8 84 4 88 Q 26 90 44 80 Z" fill="${c.bubbleIn}"/>`;
  return item(`casa-interface-digitando-${mode}`, `Interface · "digitando…" (${mode})`, CAT, ['interface', 'chat', 'digitando', mode], svg(w, h, body), w, h);
}

function emailWindow() {
  const w = 900; const h = 640;
  const body = `<g filter="url(#s)"><rect x="10" y="10" width="880" height="620" rx="12" fill="#ffffff" stroke="#c9ccd1" stroke-width="2"/><path d="M 10 22 Q 10 10 22 10 H 878 Q 890 10 890 22 V 64 H 10 Z" fill="#eceef2"/><circle cx="40" cy="38" r="8" fill="#ff5f57"/><circle cx="66" cy="38" r="8" fill="#febc2e"/><circle cx="92" cy="38" r="8" fill="#28c840"/><rect x="10" y="64" width="880" height="56" fill="#f7f8fa"/><rect x="34" y="82" width="86" height="22" rx="6" fill="#2f7cf6"/><rect x="136" y="86" width="60" height="14" rx="4" fill="#c9ccd1"/><rect x="210" y="86" width="60" height="14" rx="4" fill="#c9ccd1"/><path d="M 10 120 H 890" stroke="#d8dbe0"/><g fill="#b9bdc4"><rect x="34" y="144" width="60" height="12" rx="3"/><rect x="34" y="176" width="60" height="12" rx="3"/><rect x="34" y="208" width="60" height="12" rx="3"/></g><g stroke="#d8dbe0"><path d="M 110 134 H 866"/><path d="M 110 166 H 866"/><path d="M 110 198 H 866"/><path d="M 110 230 H 866"/></g></g>`;
  return item('casa-interface-janela-email', 'Interface · janela de e-mail', CAT, ['interface', 'e-mail', 'janela', 'computador'], svg(w, h, body, shadowDef('s', 6, 6, 0.35)), w, h);
}

function retroWindow() {
  const w = 760; const h = 520;
  const body = `<g><rect x="6" y="6" width="748" height="508" fill="#c0c0c0" stroke="#000" stroke-width="2"/><path d="M 6 6 H 754 M 6 6 V 514" fill="none" stroke="#fff" stroke-width="3"/><path d="M 754 6 V 514 H 6" fill="none" stroke="#808080" stroke-width="3"/><rect x="14" y="14" width="732" height="34" fill="url(#t)"/><rect x="706" y="20" width="30" height="22" fill="#c0c0c0" stroke="#000"/><path d="M 713 27 L 729 37 M 729 27 L 713 37" fill="none" stroke="#000" stroke-width="2.5"/><rect x="668" y="20" width="30" height="22" fill="#c0c0c0" stroke="#000"/><rect x="674" y="34" width="14" height="5" fill="#000"/><rect x="22" y="58" width="716" height="26" fill="#c0c0c0"/><path d="M 22 84 H 738" fill="none" stroke="#808080"/><rect x="22" y="90" width="716" height="410" fill="#ffffff" stroke="#808080" stroke-width="3"/></g>`;
  return item('casa-interface-janela-retro-90', 'Interface · janela de sistema retrô (anos 90)', CAT, ['interface', 'janela', 'retrô', 'anos 90', 'computador'], svg(w, h, body, linearDef('t', [[0, '#0a246a'], [1, '#a6caf0']], 1, 0)), w, h);
}

function retroError() {
  const w = 560; const h = 300;
  const body = `<g><rect x="6" y="6" width="548" height="288" fill="#c0c0c0" stroke="#000" stroke-width="2"/><path d="M 6 6 H 554 M 6 6 V 294" fill="none" stroke="#fff" stroke-width="3"/><path d="M 554 6 V 294 H 6" fill="none" stroke="#808080" stroke-width="3"/><rect x="14" y="14" width="532" height="32" fill="url(#t)"/><rect x="512" y="19" width="26" height="22" fill="#c0c0c0" stroke="#000"/><path d="M 518 25 L 532 35 M 532 25 L 518 35" fill="none" stroke="#000" stroke-width="2.5"/><circle cx="76" cy="124" r="34" fill="#d11" stroke="#600" stroke-width="3"/><path d="M 62 110 L 90 138 M 90 110 L 62 138" stroke="#fff" stroke-width="8" stroke-linecap="round"/><rect x="215" y="228" width="130" height="42" fill="#c0c0c0" stroke="#000" stroke-width="2"/><path d="M 215 228 H 345 M 215 228 V 270" fill="none" stroke="#fff" stroke-width="3"/><path d="M 345 228 V 270 H 215" fill="none" stroke="#808080" stroke-width="3"/></g>`;
  return item('casa-interface-janela-erro-retro', 'Interface · caixa de erro retrô', CAT, ['interface', 'erro', 'retrô', 'anos 90', 'aviso'], svg(w, h, body, linearDef('t', [[0, '#0a246a'], [1, '#a6caf0']], 1, 0)), w, h);
}

function crt() {
  const w = 900; const h = 760;
  const body = `<g filter="url(#s)"><path d="M 60 40 Q 450 -6 840 40 Q 880 380 840 640 Q 450 690 60 640 Q 20 380 60 40 Z" fill="url(#c)"/><path d="M 110 90 Q 450 58 790 90 Q 820 370 790 590 Q 450 620 110 590 Q 80 370 110 90 Z" fill="#050806" stroke="#1c1f1a" stroke-width="10"/><path d="M 130 110 Q 450 84 770 110" fill="none" stroke="#fff" stroke-opacity="0.07" stroke-width="12"/><rect x="250" y="660" width="400" height="60" rx="10" fill="#b5af9c"/><rect x="740" y="652" width="42" height="14" rx="3" fill="#8f8a78"/><circle cx="800" cy="659" r="6" fill="#3fbf5a"/></g>`;
  return item('casa-interface-terminal-crt', 'Interface · terminal com moldura de monitor CRT', CAT, ['interface', 'terminal', 'crt', 'monitor', 'moldura', 'anos 80'], svg(w, h, body, linearDef('c', [[0, '#cfc9b4'], [1, '#a9a38e']]) + shadowDef('s', 8, 8, 0.4)), w, h);
}

function monitor() {
  const w = 1000; const h = 760;
  const body = `<g filter="url(#s)"><rect x="20" y="20" width="960" height="580" rx="22" fill="#26272b"/><rect x="48" y="48" width="904" height="524" rx="6" fill="#050506"/><path d="M 400 600 L 360 700 H 640 L 600 600 Z" fill="#3a3b40"/><rect x="300" y="700" width="400" height="34" rx="14" fill="#2d2e33"/><circle cx="500" cy="586" r="5" fill="#4a4b50"/></g>`;
  return item('casa-interface-monitor-moderno', 'Interface · monitor moderno', CAT, ['interface', 'monitor', 'computador', 'moderno', 'tela'], svg(w, h, body, shadowDef('s', 8, 8, 0.4)), w, h);
}

function notification(mode) {
  const c = T[mode];
  const w = 460; const h = 130;
  const body = `<g filter="url(#s)"><rect x="8" y="8" width="444" height="106" rx="26" fill="${c.bar}" stroke="${c.line}" stroke-width="2"/><rect x="28" y="30" width="62" height="62" rx="16" fill="#2f7cf6"/><rect x="108" y="36" width="150" height="14" rx="5" fill="${c.ink}" opacity="0.85"/><rect x="108" y="62" width="300" height="10" rx="4" fill="${c.mute}"/><rect x="108" y="82" width="210" height="10" rx="4" fill="${c.mute}"/></g>`;
  return item(`casa-interface-notificacao-${mode}`, `Interface · notificação (${mode})`, CAT, ['interface', 'celular', 'notificação', 'aviso', mode], svg(w, h, body, shadowDef('s', 4, 4, 0.25)), w, h);
}

export function items() {
  return [
    phone('android', 'claro'), phone('android', 'escuro'), phone('iphone', 'claro'), phone('iphone', 'escuro'),
    statusBar('claro'), statusBar('escuro'),
    bubble('enviado', 'claro'), bubble('recebido', 'claro'), bubble('enviado', 'escuro'), bubble('recebido', 'escuro'),
    typing('claro'), typing('escuro'),
    emailWindow(), retroWindow(), retroError(), crt(), monitor(), notification('claro'), notification('escuro'),
  ];
}
