import { wordPath } from './letters.js';

export function items() {
  const list = [];
  let seedCounter = 2001;

  const seals = [
    {
      slug: 'arquivo',
      name: 'Selo · Selo do Arquivo',
      tags: ['selo', 'circular', 'arquivo', 'oficial'],
      render(cx, cy) {
        const t1 = wordPath('SELO DO ARQUIVO', { scale: 2.2, letterSpacing: 1.8 });
        const t2 = wordPath('CONFIDENCIAL', { scale: 1.8, letterSpacing: 1.5 });
        return `
    <circle cx="${cx}" cy="${cy}" r="115" stroke-width="4.5"/>
    <circle cx="${cx}" cy="${cy}" r="105" stroke-width="1.8"/>
    <circle cx="${cx}" cy="${cy}" r="75" stroke-width="1.5" stroke-dasharray="3 3"/>
    <!-- Center 5-pointed star -->
    <polygon points="${cx},${cy - 22} ${cx + 7},${cy - 7} ${cx + 22},${cy - 7} ${cx + 10},${cy + 3} ${cx + 14},${cy + 18} ${cx},${cy + 9} ${cx - 14},${cy + 18} ${cx - 10},${cy + 3} ${cx - 22},${cy - 7} ${cx - 7},${cy - 7}" stroke-width="2" fill="none"/>
    <path d="${t1.d}" transform="translate(${cx - t1.width / 2}, ${cy - 48})" stroke-width="2.2"/>
    <path d="${t2.d}" transform="translate(${cx - t2.width / 2}, ${cy + 35})" stroke-width="2"/>`;
      },
    },
    {
      slug: 'investigacao',
      name: 'Selo · Departamento de Investigação',
      tags: ['selo', 'circular', 'investigação', 'polícia'],
      render(cx, cy) {
        const t1 = wordPath('DEPT INVESTIGACAO', { scale: 2.0, letterSpacing: 1.5 });
        const t2 = wordPath('PERICIA OFICIAL', { scale: 1.8, letterSpacing: 1.5 });
        return `
    <circle cx="${cx}" cy="${cy}" r="115" stroke-width="5"/>
    <circle cx="${cx}" cy="${cy}" r="104" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="72" stroke-width="1.5"/>
    <!-- Center shield -->
    <path d="M ${cx - 18} ${cy - 12} L ${cx + 18} ${cy - 12} L ${cx + 18} ${cy + 8} Q ${cx} ${cy + 22} ${cx - 18} ${cy + 8} Z" stroke-width="2.5" fill="none"/>
    <path d="${t1.d}" transform="translate(${cx - t1.width / 2}, ${cy - 46})" stroke-width="2.2"/>
    <path d="${t2.d}" transform="translate(${cx - t2.width / 2}, ${cy + 36})" stroke-width="2"/>`;
      },
    },
    {
      slug: 'cartorio',
      name: 'Selo · Cartório',
      tags: ['selo', 'circular', 'cartório', 'notarial', 'fé pública'],
      render(cx, cy) {
        const t1 = wordPath('CARTORIO NOTARIAL', { scale: 2.0, letterSpacing: 1.5 });
        const t2 = wordPath('REGISTRO GERAL', { scale: 1.8, letterSpacing: 1.5 });
        return `
    <circle cx="${cx}" cy="${cy}" r="115" stroke-width="4.5"/>
    <circle cx="${cx}" cy="${cy}" r="106" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="70" stroke-width="2"/>
    <!-- Scales of justice motif in center -->
    <line x1="${cx}" y1="${cy - 16}" x2="${cx}" y2="${cy + 18}" stroke-width="2.5"/>
    <line x1="${cx - 16}" y1="${cy - 10}" x2="${cx + 16}" y2="${cy - 10}" stroke-width="2"/>
    <path d="M ${cx - 20} ${cy + 4} Q ${cx - 16} ${cy + 10} ${cx - 12} ${cy + 4} Z M ${cx + 12} ${cy + 4} Q ${cx + 16} ${cy + 10} ${cx + 20} ${cy + 4} Z" stroke-width="1.5" fill="none"/>
    <path d="${t1.d}" transform="translate(${cx - t1.width / 2}, ${cy - 46})" stroke-width="2.2"/>
    <path d="${t2.d}" transform="translate(${cx - t2.width / 2}, ${cy + 34})" stroke-width="2"/>`;
      },
    },
    {
      slug: 'postagem',
      name: 'Selo · Postagem',
      tags: ['selo', 'circular', 'correio', 'postagem', 'carimbo postal'],
      render(cx, cy) {
        const t1 = wordPath('CORREIOS · POSTAL', { scale: 2.0, letterSpacing: 1.6 });
        const t2 = wordPath('14 NOV 1928', { scale: 2.0, letterSpacing: 1.6 });
        return `
    <circle cx="${cx}" cy="${cy}" r="115" stroke-width="4.5"/>
    <circle cx="${cx}" cy="${cy}" r="106" stroke-width="1.5"/>
    <line x1="${cx - 65}" y1="${cy}" x2="${cx + 65}" y2="${cy}" stroke-width="1.8"/>
    <!-- Wavy cancellation lines to the right -->
    <path d="M ${cx + 120} ${cy - 20} Q ${cx + 135} ${cy - 26} ${cx + 150} ${cy - 20} T ${cx + 180} ${cy - 20}" stroke-width="2.5"/>
    <path d="M ${cx + 120} ${cy} Q ${cx + 135} ${cy - 6} ${cx + 150} ${cy} T ${cx + 180} ${cy}" stroke-width="2.5"/>
    <path d="M ${cx + 120} ${cy + 20} Q ${cx + 135} ${cy + 14} ${cx + 150} ${cy + 20} T ${cx + 180} ${cy + 20}" stroke-width="2.5"/>
    <path d="${t1.d}" transform="translate(${cx - t1.width / 2}, ${cy - 42})" stroke-width="2.2"/>
    <path d="${t2.d}" transform="translate(${cx - t2.width / 2}, ${cy + 15})" stroke-width="2.2"/>`;
      },
    },
    {
      slug: 'estrela',
      name: 'Selo em branco · estrela',
      tags: ['selo', 'circular', 'estrela', 'em branco'],
      render(cx, cy) {
        return `
    <circle cx="${cx}" cy="${cy}" r="115" stroke-width="4.5"/>
    <circle cx="${cx}" cy="${cy}" r="105" stroke-width="1.8"/>
    <circle cx="${cx}" cy="${cy}" r="70" stroke-width="2.5" stroke-dasharray="6 4"/>
    <polygon points="${cx},${cy - 28} ${cx + 9},${cy - 9} ${cx + 28},${cy - 9} ${cx + 13},${cy + 4} ${cx + 18},${cy + 23} ${cx},${cy + 12} ${cx - 18},${cy + 23} ${cx - 13},${cy + 4} ${cx - 28},${cy - 9} ${cx - 9},${cy - 9}" stroke-width="2.5" fill="none"/>`;
      },
    },
    {
      slug: 'brasao',
      name: 'Selo em branco · brasão',
      tags: ['selo', 'circular', 'brasão', 'escudo', 'em branco'],
      render(cx, cy) {
        return `
    <circle cx="${cx}" cy="${cy}" r="115" stroke-width="4.5"/>
    <circle cx="${cx}" cy="${cy}" r="105" stroke-width="1.8"/>
    <circle cx="${cx}" cy="${cy}" r="65" stroke-width="2"/>
    <!-- Classical heraldic shield in center -->
    <path d="M ${cx - 28} ${cy - 30} L ${cx + 28} ${cy - 30} L ${cx + 28} ${cy} Q ${cx} ${cy + 36} ${cx - 28} ${cy} Z" stroke-width="3" fill="none"/>
    <line x1="${cx}" y1="${cy - 30}" x2="${cx}" y2="${cy + 26}" stroke-width="1.5"/>
    <line x1="${cx - 28}" y1="${cy - 8}" x2="${cx + 28}" y2="${cy - 8}" stroke-width="1.5"/>`;
      },
    },
    {
      slug: 'monograma',
      name: 'Selo em branco · monograma',
      tags: ['selo', 'circular', 'monograma', 'louros', 'em branco'],
      render(cx, cy) {
        return `
    <circle cx="${cx}" cy="${cy}" r="115" stroke-width="4.5"/>
    <circle cx="${cx}" cy="${cy}" r="105" stroke-width="1.8"/>
    <circle cx="${cx}" cy="${cy}" r="82" stroke-width="1.5"/>
    <!-- Laurel wreath branches -->
    <path d="M ${cx - 35} ${cy + 25} C ${cx - 50} ${cy} ${cx - 40} ${cy - 30} ${cx} ${cy - 45} C ${cx + 40} ${cy - 30} ${cx + 50} ${cy} ${cx + 35} ${cy + 25}" stroke-width="2.5" fill="none"/>
    <circle cx="${cx}" cy="${cy}" r="32" stroke-width="2" stroke-dasharray="4 3"/>`;
      },
    },
    {
      slug: 'coroa',
      name: 'Selo em branco · coroa',
      tags: ['selo', 'circular', 'coroa', 'nobreza', 'em branco'],
      render(cx, cy) {
        return `
    <circle cx="${cx}" cy="${cy}" r="115" stroke-width="4.5"/>
    <circle cx="${cx}" cy="${cy}" r="105" stroke-width="1.8"/>
    <circle cx="${cx}" cy="${cy}" r="75" stroke-width="2"/>
    <!-- Classical Crown motif in center -->
    <path d="M ${cx - 32} ${cy + 18} L ${cx + 32} ${cy + 18} L ${cx + 30} ${cy + 24} L ${cx - 30} ${cy + 24} Z" stroke-width="2.5" fill="none"/>
    <path d="M ${cx - 32} ${cy + 18} L ${cx - 38} ${cy - 12} L ${cx - 18} ${cy + 4} L ${cx} ${cy - 18} L ${cx + 18} ${cy + 4} L ${cx + 38} ${cy - 12} L ${cx + 32} ${cy + 18} Z" stroke-width="2.5" fill="none"/>
    <circle cx="${cx - 38}" cy="${cy - 14}" r="3" stroke-width="2" fill="none"/>
    <circle cx="${cx}" cy="${cy - 20}" r="3.5" stroke-width="2" fill="none"/>
    <circle cx="${cx + 38}" cy="${cy - 14}" r="3" stroke-width="2" fill="none"/>`;
      },
    },
  ];

  for (const s of seals) {
    seedCounter++;
    const seed = seedCounter;
    const size = s.slug === 'postagem' ? 320 : 250;
    const w = size;
    const h = 250;
    const cx = 125;
    const cy = 125;

    const filtId = `sl-flt-${seed}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <filter id="${filtId}">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="${seed}" result="noise"/>
      <feComponentTransfer in="noise" result="thresh">
        <feFuncA type="linear" slope="1.4" intercept="-0.15"/>
      </feComponentTransfer>
      <feComposite in="SourceGraphic" in2="thresh" operator="in"/>
    </filter>
  </defs>
  <g filter="url(#${filtId})" stroke="#000000" fill="none" stroke-linecap="round" stroke-linejoin="round">
    ${s.render(cx, cy)}
  </g>
</svg>`;

    list.push({
      id: `casa-selo-${s.slug}`,
      name: s.name,
      category: 'Selos',
      tags: s.tags,
      svg,
    });
  }

  return list;
}

