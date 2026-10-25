import { mulberry32 } from '../../../src/domain/noise.js';

/**
 * Creates an organic melted wax puddle outline polygon.
 */
function makeWaxPuddle(cx, cy, baseR, seed) {
  const rand = mulberry32(seed);
  const steps = 36;
  const points = [];

  for (let i = 0; i < steps; i++) {
    const angle = (i * 2 * Math.PI) / steps;
    // Radial perturbation simulating squeezed molten wax
    const r = baseR + (rand() - 0.45) * 14 + Math.sin(angle * 3) * 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return points.join(' ');
}

export function items() {
  const list = [];

  const WAX_COLORS = [
    {
      slug: 'vermelho',
      name: 'vermelho',
      base: '#9e1818',
      light: '#c92c2c',
      dark: '#5e0b0b',
      shadow: 'rgba(50, 4, 4, 0.35)',
      gold: false,
    },
    {
      slug: 'verde',
      name: 'verde',
      base: '#1a592e',
      light: '#2a8747',
      dark: '#0d3619',
      shadow: 'rgba(6, 30, 14, 0.35)',
      gold: false,
    },
    {
      slug: 'preto',
      name: 'preto',
      base: '#222326',
      light: '#3c3e44',
      dark: '#111214',
      shadow: 'rgba(0, 0, 0, 0.45)',
      gold: false,
    },
    {
      slug: 'dourado',
      name: 'dourado',
      base: '#b89437',
      light: '#dcba54',
      dark: '#6e5416',
      shadow: 'rgba(45, 34, 8, 0.35)',
      gold: true,
    },
  ];

  let seedCounter = 4100;

  for (const c of WAX_COLORS) {
    // 1. Liso (Blank wax seal)
    seedCounter++;
    const seed1 = seedCounter;
    const pts1 = makeWaxPuddle(100, 100, 78, seed1);

    const svgLiso = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <!-- Drop shadow -->
  <polygon points="${pts1}" fill="${c.shadow}" transform="translate(3, 4)"/>
  <!-- Molten wax puddle edge -->
  <polygon points="${pts1}" fill="${c.base}" stroke="${c.dark}" stroke-width="1.5"/>
  <!-- Highlight rim around puddle -->
  <polygon points="${pts1}" fill="none" stroke="${c.light}" stroke-width="1" opacity="0.6" transform="translate(-1, -1) scale(0.98) translate(2, 2)"/>
  <!-- Sunken circular stamp bed -->
  <circle cx="100" cy="100" r="54" fill="${c.dark}" opacity="0.65"/>
  <!-- Raised circular matrix ridge -->
  <circle cx="100" cy="100" r="50" fill="${c.base}" stroke="${c.light}" stroke-width="2"/>
  <circle cx="100" cy="100" r="46" fill="none" stroke="${c.dark}" stroke-width="1.5"/>
  <!-- Center smooth dish -->
  <circle cx="100" cy="100" r="38" fill="${c.base}"/>
  <circle cx="94" cy="94" r="18" fill="${c.light}" opacity="0.35"/>
</svg>`;

    list.push({
      id: `casa-lacre-${c.slug}-liso`,
      name: `Lacre de cera · ${c.name} (liso)`,
      category: 'Lacres',
      tags: ['lacre', 'cera', c.name, 'liso', 'carta', 'envelope'],
      width: 200,
      height: 200,
      svg: svgLiso,
    });

    // 2. Com brasão (Wax seal with heraldic crest)
    seedCounter++;
    const seed2 = seedCounter;
    const pts2 = makeWaxPuddle(100, 100, 78, seed2);

    const svgBrasao = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <polygon points="${pts2}" fill="${c.shadow}" transform="translate(3, 4)"/>
  <polygon points="${pts2}" fill="${c.base}" stroke="${c.dark}" stroke-width="1.5"/>
  <polygon points="${pts2}" fill="none" stroke="${c.light}" stroke-width="1" opacity="0.6" transform="translate(-1, -1) scale(0.98) translate(2, 2)"/>
  <circle cx="100" cy="100" r="54" fill="${c.dark}" opacity="0.65"/>
  <circle cx="100" cy="100" r="50" fill="${c.base}" stroke="${c.light}" stroke-width="2"/>
  <circle cx="100" cy="100" r="46" fill="none" stroke="${c.dark}" stroke-width="1.5"/>
  <circle cx="100" cy="100" r="38" fill="${c.base}"/>
  <!-- Embossed Fleur-de-lis / Heraldic crest -->
  <g transform="translate(100, 100)">
    <!-- Shadow of emblem -->
    <path d="M 0 -22 C 4 -12 12 -6 12 0 C 12 8 4 12 0 16 C -4 12 -12 8 -12 0 C -12 -6 -4 -12 0 -22 Z" fill="${c.dark}" opacity="0.7" transform="translate(1, 1.5)"/>
    <path d="M 0 0 C 10 -4 18 -12 18 -2 C 18 10 8 12 0 16 C -8 12 -18 10 -18 -2 C -18 -12 -10 -4 0 0 Z" fill="${c.dark}" opacity="0.7" transform="translate(1, 1.5)"/>
    <!-- Highlighted emblem -->
    <path d="M 0 -22 C 4 -12 12 -6 12 0 C 12 8 4 12 0 16 C -4 12 -12 8 -12 0 C -12 -6 -4 -12 0 -22 Z" fill="${c.light}" stroke="${c.dark}" stroke-width="1"/>
    <path d="M 0 0 C 10 -4 18 -12 18 -2 C 18 10 8 12 0 16 C -8 12 -18 10 -18 -2 C -18 -12 -10 -4 0 0 Z" fill="${c.light}" stroke="${c.dark}" stroke-width="1"/>
    <!-- Crossbar ribbon -->
    <rect x="-14" y="6" width="28" height="4" rx="1.5" fill="${c.light}" stroke="${c.dark}" stroke-width="0.8"/>
  </g>
</svg>`;

    list.push({
      id: `casa-lacre-${c.slug}-brasao`,
      name: `Lacre de cera · ${c.name} (com brasão)`,
      category: 'Lacres',
      tags: ['lacre', 'cera', c.name, 'brasão', 'flor-de-lis', 'carta', 'oficial'],
      width: 200,
      height: 200,
      svg: svgBrasao,
    });
  }

  return list;
}

