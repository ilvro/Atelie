import { f, svg, item } from './svgkit.js';
import { wordPath } from './letters.js';

const CAT = 'Carimbos brasileiros';

const noise = seed => `<filter id="n${seed}"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="${seed}" result="no"/><feComponentTransfer in="no" result="th"><feFuncA type="linear" slope="1.4" intercept="-0.15"/></feComponentTransfer><feComposite in="SourceGraphic" in2="th" operator="in"/></filter>`;

/**
 * A rubber stamp from lines. Each line is a string (centered text) or { blank: n } (a rule to fill in by hand)
 * or { head: text } (bold band). `shape`: 'rect' (double rule) or 'round'.
 */
function stamp(slug, name, lines, { shape = 'rect', scale = 3.2, seed, tags = [] }) {
  const rows = lines.map(l => {
    if (typeof l === 'string') { const t = wordPath(l, { scale, letterSpacing: scale * 0.55 }); return { kind: 'text', t, h: t.height + 8 }; }
    if (l.head) { const t = wordPath(l.head, { scale: scale * 1.25, letterSpacing: scale * 0.6 }); return { kind: 'head', t, h: t.height + 22 }; }
    return { kind: 'blank', w: l.blank, h: 30, label: l.label ? wordPath(l.label, { scale: scale * 0.7, letterSpacing: scale * 0.4 }) : null };
  });
  const inner = Math.max(...rows.map(r => (r.t ? r.t.width : r.w || 0) + (r.label ? r.label.width + 12 : 0)));
  const padX = shape === 'round' ? 56 : 36; const padY = shape === 'round' ? 44 : 28;
  const contentH = rows.reduce((a, r) => a + r.h, 0);
  let w = Math.ceil(inner + padX * 2); let h = Math.ceil(contentH + padY * 2);
  if (shape === 'round') { const s = Math.max(w, h); w = s; h = s; }
  let y = (h - contentH) / 2;
  let body = '';
  for (const r of rows) {
    if (r.kind === 'text') body += `<path d="${r.t.d}" transform="translate(${f((w - r.t.width) / 2)} ${f(y)})" stroke-width="3.2" stroke-linecap="square"/>`;
    else if (r.kind === 'head') body += `<rect x="${f((w - r.t.width) / 2 - 14)}" y="${f(y + 2)}" width="${f(r.t.width + 28)}" height="${f(r.t.height + 12)}" stroke-width="3"/><path d="${r.t.d}" transform="translate(${f((w - r.t.width) / 2)} ${f(y + 8)})" stroke-width="3.6" stroke-linecap="square"/>`;
    else {
      const x0 = (w - (r.w + (r.label ? r.label.width + 12 : 0))) / 2;
      if (r.label) body += `<path d="${r.label.d}" transform="translate(${f(x0)} ${f(y + 4)})" stroke-width="2.2" stroke-linecap="square"/>`;
      const lx = x0 + (r.label ? r.label.width + 12 : 0);
      body += `<path d="M ${f(lx)} ${f(y + r.h - 6)} H ${f(lx + r.w)}" stroke-width="2"/>`;
    }
    y += r.h;
  }
  const frame = shape === 'round'
    ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 6}" stroke-width="5"/><circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 17}" stroke-width="1.8"/>`
    : `<rect x="5" y="5" width="${w - 10}" height="${h - 10}" rx="3" stroke-width="5"/><rect x="14" y="14" width="${w - 28}" height="${h - 28}" rx="2" stroke-width="1.6"/>`;
  const svgText = svg(w, h, `<g filter="url(#n${seed})" stroke="#000" fill="none" stroke-linejoin="round">${frame}${body}</g>`, noise(seed));
  return item(`casa-carimbo-br-${slug}`, `Carimbo · ${name}`, CAT, ['carimbo', 'brasileiro', 'cartório', 'tinta', ...tags], svgText, w, h);
}

export function items() {
  let seed = 700;
  const s = () => ++seed;
  return [
    stamp('reconheco-firma', 'Reconheço firma', ['RECONHEÇO POR SEMELHANÇA', 'A FIRMA DE', { blank: 360 }, 'DOU FÉ.'], { seed: s(), scale: 2.8, tags: ['firma', 'reconhecimento'] }),
    stamp('cartorio', 'Cartório (2º Ofício)', [{ head: 'CARTÓRIO' }, '2º OFÍCIO DE NOTAS', 'VILA AURORA'], { shape: 'round', seed: s(), scale: 2.6, tags: ['cartório', 'notas'] }),
    stamp('protocolo', 'Protocolo com data', [{ head: 'PROTOCOLO' }, { blank: 150, label: 'Nº' }, { blank: 150, label: 'DATA' }], { seed: s(), scale: 3, tags: ['protocolo', 'data', 'repartição'] }),
    stamp('confere-original', 'Confere com o original', [{ head: 'CONFERE COM' }, { head: 'O ORIGINAL' }], { seed: s(), scale: 3, tags: ['confere', 'original', 'cópia'] }),
    stamp('sigiloso', 'Sigiloso', [{ head: 'SIGILOSO' }], { seed: s(), scale: 5.2, tags: ['sigilo', 'segredo'] }),
    stamp('classificado-reservado', 'Classificado · reservado', ['CLASSIFICADO', { head: 'RESERVADO' }], { seed: s(), scale: 3.6, tags: ['classificado', 'reservado', 'sigilo'] }),
    stamp('medico-crm', 'Carimbo de médico (CRM fictício)', [{ blank: 330, label: 'DR.' }, 'CRM-SP 00000', 'CLÍNICA GERAL'], { seed: s(), scale: 2.6, tags: ['médico', 'crm', 'receita'] }),
    stamp('recebido-em', 'Recebido em', [{ head: 'RECEBIDO' }, { blank: 150, label: 'EM' }, { blank: 150, label: 'POR' }], { seed: s(), scale: 3, tags: ['recebido', 'data'] }),
    stamp('primeira-via', 'Primeira via', [{ head: '1ª VIA' }, 'CLIENTE'], { seed: s(), scale: 3.4, tags: ['via', 'cópia'] }),
    stamp('segunda-via', 'Segunda via', [{ head: '2ª VIA' }, 'ARQUIVO'], { seed: s(), scale: 3.4, tags: ['via', 'cópia'] }),
    stamp('em-tramite', 'Em trâmite', [{ head: 'EM TRÂMITE' }], { seed: s(), scale: 4.2, tags: ['trâmite', 'processo'] }),
    stamp('deferido', 'Deferido', [{ head: 'DEFERIDO' }, { blank: 150, label: 'EM' }], { seed: s(), scale: 3.8, tags: ['deferido', 'aprovado'] }),
    stamp('indeferido', 'Indeferido', [{ head: 'INDEFERIDO' }, { blank: 150, label: 'EM' }], { seed: s(), scale: 3.8, tags: ['indeferido', 'negado'] }),
    stamp('autenticado', 'Autenticado', [{ head: 'AUTENTICADO' }, 'CÓPIA CONFERE', { blank: 170 }], { shape: 'round', seed: s(), scale: 2.4, tags: ['autenticado', 'cópia', 'cartório'] }),
  ];
}
