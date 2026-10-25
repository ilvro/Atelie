import { wordPath } from './letters.js';

const STAMP_TEXTS = [
  ['confidencial', 'CONFIDENCIAL', 'Confidencial'],
  ['ultra-secreto', 'ULTRA SECRETO', 'Ultra Secreto'],
  ['secreto', 'SECRETO', 'Secreto'],
  ['arquivado', 'ARQUIVADO', 'Arquivado'],
  ['urgente', 'URGENTE', 'Urgente'],
  ['recebido', 'RECEBIDO', 'Recebido'],
  ['aprovado', 'APROVADO', 'Aprovado'],
  ['negado', 'NEGADO', 'Negado'],
  ['copia', 'CÓPIA', 'Cópia'],
  ['original', 'ORIGINAL', 'Original'],
  ['classificado', 'CLASSIFICADO', 'Classificado'],
  ['pago', 'PAGO', 'Pago'],
  ['verificado', 'VERIFICADO', 'Verificado'],
  ['arquivo-morto', 'ARQUIVO MORTO', 'Arquivo Morto'],
  ['nao-divulgar', 'NÃO DIVULGAR', 'Não Divulgar'],
  ['evidencia', 'EVIDÊNCIA', 'Evidência'],
  ['cancelado', 'CANCELADO', 'Cancelado'],
  ['devolver-remetente', 'DEVOLVER AO REMETENTE', 'Devolver ao Remetente'],
];

export function items() {
  const list = [];
  let seedCounter = 1001;

  // 18 Rectangular rubber stamps with text
  for (const [slug, text, title] of STAMP_TEXTS) {
    seedCounter++;
    const seed = seedCounter;
    const wp = wordPath(text, { scale: 4.8, letterSpacing: 2.8 });

    const padX = 28;
    const padY = 20;
    const w = Math.round(wp.width + padX * 2);
    const h = Math.round(wp.height + padY * 2);

    const maskId = `st-mask-${seed}`;
    const filtId = `st-flt-${seed}`;

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
  <g filter="url(#${filtId})" stroke="#000000" fill="none">
    <!-- Outer stamp border -->
    <rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="2" stroke-width="4.5" stroke-linecap="square"/>
    <!-- Text path -->
    <path d="${wp.d}" transform="translate(${padX}, ${padY})" stroke-width="4.2" stroke-linecap="square" stroke-linejoin="miter"/>
  </g>
</svg>`;

    list.push({
      id: `casa-carimbo-${slug}`,
      name: `Carimbo · ${title}`,
      category: 'Carimbos',
      tags: ['carimbo', 'tinta', slug.replace(/-/g, ' ')],
      svg,
    });
  }

  // 6 Blank stamp frames
  const blankFrames = [
    {
      slug: 'retangulo-duplo',
      name: 'Carimbo em branco · retângulo duplo',
      tags: ['carimbo', 'moldura', 'duplo', 'retângulo'],
      w: 360,
      h: 120,
      render(w, h, seed) {
        return `
    <rect x="5" y="5" width="${w - 10}" height="${h - 10}" rx="3" stroke-width="4.5"/>
    <rect x="13" y="13" width="${w - 26}" height="${h - 26}" rx="2" stroke-width="1.8"/>`;
      },
    },
    {
      slug: 'cantos-cortados',
      name: 'Carimbo em branco · cantos cortados',
      tags: ['carimbo', 'moldura', 'chanfrado', 'cantos'],
      w: 340,
      h: 110,
      render(w, h, seed) {
        const c = 16;
        return `
    <polygon points="${c},5 ${w - c},5 ${w - 5},${c} ${w - 5},${h - c} ${w - c},${h - 5} ${c},${h - 5} 5,${h - c} 5,${c}" stroke-width="4.5"/>`;
      },
    },
    {
      slug: 'circulo-duplo',
      name: 'Carimbo em branco · círculo duplo',
      tags: ['carimbo', 'moldura', 'círculo', 'duplo'],
      w: 220,
      h: 220,
      render(w, h, seed) {
        const cx = w / 2;
        const cy = h / 2;
        return `
    <circle cx="${cx}" cy="${cy}" r="102" stroke-width="4.5"/>
    <circle cx="${cx}" cy="${cy}" r="92" stroke-width="1.8"/>
    <circle cx="${cx}" cy="${cy}" r="64" stroke-width="1.2" stroke-dasharray="4 4"/>`;
      },
    },
    {
      slug: 'oval',
      name: 'Carimbo em branco · oval',
      tags: ['carimbo', 'moldura', 'oval', 'elipse'],
      w: 320,
      h: 180,
      render(w, h, seed) {
        const cx = w / 2;
        const cy = h / 2;
        return `
    <ellipse cx="${cx}" cy="${cy}" rx="150" ry="80" stroke-width="4.5"/>
    <ellipse cx="${cx}" cy="${cy}" rx="140" ry="70" stroke-width="1.8"/>`;
      },
    },
    {
      slug: 'triangulo',
      name: 'Carimbo em branco · triângulo',
      tags: ['carimbo', 'moldura', 'triângulo', 'aviso'],
      w: 240,
      h: 220,
      render(w, h, seed) {
        return `
    <polygon points="120,8 230,210 10,210" stroke-width="5"/>
    <polygon points="120,24 212,198 28,198" stroke-width="1.8"/>`;
      },
    },
    {
      slug: 'data',
      name: 'Carimbo em branco · data',
      tags: ['carimbo', 'moldura', 'data', 'dia', 'mês', 'ano'],
      w: 360,
      h: 140,
      render(w, h, seed) {
        return `
    <rect x="5" y="5" width="${w - 10}" height="${h - 10}" rx="3" stroke-width="4.5"/>
    <line x1="5" y1="42" x2="${w - 5}" y2="42" stroke-width="2"/>
    <line x1="120" y1="42" x2="120" y2="${h - 5}" stroke-width="1.8"/>
    <line x1="240" y1="42" x2="240" y2="${h - 5}" stroke-width="1.8"/>
    <!-- Small sub-labels -->
    <path d="M 50 20 L 50 32 M 56 20 L 56 32 M 165 20 L 165 32 M 285 20 L 285 32" stroke-width="1.5"/>`;
      },
    },
  ];

  for (const bf of blankFrames) {
    seedCounter++;
    const seed = seedCounter;
    const filtId = `st-flt-${seed}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bf.w} ${bf.h}" width="${bf.w}" height="${bf.h}">
  <defs>
    <filter id="${filtId}">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="${seed}" result="noise"/>
      <feComponentTransfer in="noise" result="thresh">
        <feFuncA type="linear" slope="1.4" intercept="-0.15"/>
      </feComponentTransfer>
      <feComposite in="SourceGraphic" in2="thresh" operator="in"/>
    </filter>
  </defs>
  <g filter="url(#${filtId})" stroke="#000000" fill="none" stroke-linecap="square">
    ${bf.render(bf.w, bf.h, seed)}
  </g>
</svg>`;

    list.push({
      id: `casa-carimbo-${bf.slug}`,
      name: bf.name,
      category: 'Carimbos',
      tags: bf.tags,
      svg,
    });
  }

  return list;
}

