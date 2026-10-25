import { mulberry32 } from '../../../src/domain/noise.js';

/**
 * Creates a torn/serrated polygon path for a tape strip.
 */
function makeTapePath(w, h, seed, { leftTorn = true, rightTorn = true, serrated = false } = {}) {
  const rand = mulberry32(seed);
  const steps = 12;
  const points = [];

  // Top edge
  points.push(`0,${(rand() * 1.5).toFixed(1)}`);
  points.push(`${w},${(rand() * 1.5).toFixed(1)}`);

  // Right edge
  if (rightTorn) {
    if (serrated) {
      // Small zigzag like a tape dispenser cutter
      const teeth = 8;
      for (let i = 1; i <= teeth; i++) {
        const y = (h * i) / teeth;
        const x = w + (i % 2 === 0 ? 0 : -3.5);
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    } else {
      for (let i = 1; i <= steps; i++) {
        const y = (h * i) / steps;
        const x = w + (rand() - 0.5) * 7;
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    }
  } else {
    points.push(`${w},${h}`);
  }

  // Bottom edge
  points.push(`${w},${h}`);
  points.push(`0,${h}`);

  // Left edge
  if (leftTorn) {
    for (let i = steps - 1; i >= 0; i--) {
      const y = (h * i) / steps;
      const x = (rand() - 0.5) * 7;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
  } else {
    points.push(`0,0`);
  }

  return points.join(' ');
}

export function items() {
  const list = [
    // 1. Fita crepe curta
    {
      id: 'casa-fita-crepe-curta',
      name: 'Fita crepe · curta',
      category: 'Fitas',
      tags: ['fita', 'crepe', 'adesiva', 'curta'],
      width: 140,
      height: 60,
      svg: (() => {
        const pts = makeTapePath(120, 36, 3101, { leftTorn: true, rightTorn: true });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 60" width="140" height="60">
  <g transform="translate(10, 12)">
    <!-- Shadow -->
    <polygon points="${pts}" fill="rgba(0,0,0,0.18)" transform="translate(2, 3)"/>
    <!-- Crepe base -->
    <polygon points="${pts}" fill="#e8dec3" stroke="#d5c8a5" stroke-width="0.8"/>
    <!-- Translucent fibers and wrinkles -->
    <line x1="25" y1="4" x2="28" y2="32" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>
    <line x1="75" y1="2" x2="72" y2="34" stroke="rgba(0,0,0,0.06)" stroke-width="1.2"/>
  </g>
</svg>`;
      })(),
    },
    // 2. Fita crepe média
    {
      id: 'casa-fita-crepe-media',
      name: 'Fita crepe · média',
      category: 'Fitas',
      tags: ['fita', 'crepe', 'adesiva', 'média'],
      width: 220,
      height: 60,
      svg: (() => {
        const pts = makeTapePath(200, 36, 3102, { leftTorn: true, rightTorn: true });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 60" width="220" height="60">
  <g transform="translate(10, 12)">
    <polygon points="${pts}" fill="rgba(0,0,0,0.18)" transform="translate(2, 3)"/>
    <polygon points="${pts}" fill="#ece3cd" stroke="#d8ccaa" stroke-width="0.8"/>
    <line x1="40" y1="3" x2="44" y2="33" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
    <line x1="120" y1="2" x2="116" y2="34" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
    <line x1="165" y1="4" x2="168" y2="32" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
  </g>
</svg>`;
      })(),
    },
    // 3. Fita crepe longa
    {
      id: 'casa-fita-crepe-longa',
      name: 'Fita crepe · longa',
      category: 'Fitas',
      tags: ['fita', 'crepe', 'adesiva', 'longa'],
      width: 320,
      height: 64,
      svg: (() => {
        const pts = makeTapePath(300, 40, 3103, { leftTorn: true, rightTorn: true });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64" width="320" height="64">
  <g transform="translate(10, 12)">
    <polygon points="${pts}" fill="rgba(0,0,0,0.18)" transform="translate(2, 3)"/>
    <polygon points="${pts}" fill="#ebe1c9" stroke="#d6c9a3" stroke-width="0.8"/>
    <line x1="60" y1="2" x2="64" y2="38" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
    <line x1="150" y1="3" x2="148" y2="37" stroke="rgba(0,0,0,0.05)" stroke-width="1.2"/>
    <line x1="230" y1="2" x2="235" y2="38" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
  </g>
</svg>`;
      })(),
    },
    // 4. Fita crepe diagonal
    {
      id: 'casa-fita-crepe-diagonal',
      name: 'Fita crepe · diagonal',
      category: 'Fitas',
      tags: ['fita', 'crepe', 'adesiva', 'diagonal', 'canto'],
      width: 180,
      height: 110,
      svg: (() => {
        const pts = makeTapePath(160, 36, 3104, { leftTorn: true, rightTorn: true });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 110" width="180" height="110">
  <g transform="translate(90, 55) rotate(22) translate(-80, -18)">
    <polygon points="${pts}" fill="rgba(0,0,0,0.18)" transform="translate(2, 3)"/>
    <polygon points="${pts}" fill="#ece2ca" stroke="#d5c8a4" stroke-width="0.8"/>
    <line x1="50" y1="3" x2="52" y2="33" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/>
    <line x1="110" y1="2" x2="108" y2="34" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
  </g>
</svg>`;
      })(),
    },
    // 5. Fita crepe rasgada
    {
      id: 'casa-fita-crepe-rasgada',
      name: 'Fita crepe · rasgada irregular',
      category: 'Fitas',
      tags: ['fita', 'crepe', 'adesiva', 'rasgada', 'irregular'],
      width: 170,
      height: 64,
      svg: (() => {
        const pts = makeTapePath(150, 42, 3105, { leftTorn: true, rightTorn: true });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 64" width="170" height="64">
  <g transform="translate(10, 11)">
    <polygon points="${pts}" fill="rgba(0,0,0,0.18)" transform="translate(2, 3)"/>
    <polygon points="${pts}" fill="#e6dcb8" stroke="#d0c299" stroke-width="0.8"/>
    <line x1="45" y1="4" x2="48" y2="38" stroke="rgba(255,255,255,0.4)" stroke-width="1.4"/>
    <line x1="95" y1="3" x2="92" y2="39" stroke="rgba(0,0,0,0.07)" stroke-width="1.2"/>
  </g>
</svg>`;
      })(),
    },
    // 6. Fita crepe ponta reta
    {
      id: 'casa-fita-crepe-ponta-reta',
      name: 'Fita crepe · ponta reta',
      category: 'Fitas',
      tags: ['fita', 'crepe', 'adesiva', 'corte reto'],
      width: 190,
      height: 60,
      svg: (() => {
        const pts = makeTapePath(170, 36, 3106, { leftTorn: false, rightTorn: true });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 60" width="190" height="60">
  <g transform="translate(10, 12)">
    <polygon points="${pts}" fill="rgba(0,0,0,0.18)" transform="translate(2, 3)"/>
    <polygon points="${pts}" fill="#eae0c6" stroke="#d3c5a0" stroke-width="0.8"/>
    <line x1="60" y1="2" x2="63" y2="34" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/>
  </g>
</svg>`;
      })(),
    },
    // 7. Fita transparente amarelada curta
    {
      id: 'casa-fita-transparente-curta',
      name: 'Fita transparente · curta',
      category: 'Fitas',
      tags: ['fita', 'transparente', 'durex', 'adesiva', 'amarelada', 'curta'],
      width: 140,
      height: 54,
      svg: (() => {
        const pts = makeTapePath(120, 30, 3107, { leftTorn: true, rightTorn: true, serrated: true });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 54" width="140" height="54">
  <g transform="translate(10, 12)">
    <polygon points="${pts}" fill="rgba(0,0,0,0.12)" transform="translate(2, 2)"/>
    <polygon points="${pts}" fill="#e8d88e" fill-opacity="0.55" stroke="#cbb866" stroke-opacity="0.6" stroke-width="0.8"/>
    <!-- Specular gloss line -->
    <line x1="8" y1="7" x2="112" y2="7" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.5"/>
    <!-- Air bubble under tape -->
    <ellipse cx="45" cy="18" rx="6" ry="3" fill="#ffffff" fill-opacity="0.35"/>
  </g>
</svg>`;
      })(),
    },
    // 8. Fita transparente amarelada média
    {
      id: 'casa-fita-transparente-media',
      name: 'Fita transparente · média',
      category: 'Fitas',
      tags: ['fita', 'transparente', 'durex', 'adesiva', 'amarelada', 'média'],
      width: 220,
      height: 56,
      svg: (() => {
        const pts = makeTapePath(200, 32, 3108, { leftTorn: true, rightTorn: true, serrated: true });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 56" width="220" height="56">
  <g transform="translate(10, 12)">
    <polygon points="${pts}" fill="rgba(0,0,0,0.12)" transform="translate(2, 2)"/>
    <polygon points="${pts}" fill="#ebd992" fill-opacity="0.52" stroke="#ccba68" stroke-opacity="0.6" stroke-width="0.8"/>
    <line x1="8" y1="7" x2="192" y2="7" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.5"/>
    <ellipse cx="80" cy="16" rx="8" ry="3" fill="#ffffff" fill-opacity="0.3"/>
    <ellipse cx="140" cy="20" rx="5" ry="2.5" fill="#ffffff" fill-opacity="0.3"/>
  </g>
</svg>`;
      })(),
    },
    // 9. Fita transparente amarelada diagonal
    {
      id: 'casa-fita-transparente-diagonal',
      name: 'Fita transparente · diagonal',
      category: 'Fitas',
      tags: ['fita', 'transparente', 'durex', 'adesiva', 'diagonal', 'canto'],
      width: 170,
      height: 100,
      svg: (() => {
        const pts = makeTapePath(150, 30, 3109, { leftTorn: true, rightTorn: true, serrated: true });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 100" width="170" height="100">
  <g transform="translate(85, 50) rotate(-20) translate(-75, -15)">
    <polygon points="${pts}" fill="rgba(0,0,0,0.12)" transform="translate(2, 2)"/>
    <polygon points="${pts}" fill="#ebd992" fill-opacity="0.55" stroke="#ccba68" stroke-opacity="0.6" stroke-width="0.8"/>
    <line x1="8" y1="6" x2="142" y2="6" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.5"/>
    <ellipse cx="50" cy="15" rx="6" ry="3" fill="#ffffff" fill-opacity="0.3"/>
  </g>
</svg>`;
      })(),
    },
    // 10. Fita isolante preta média
    {
      id: 'casa-fita-isolante-media',
      name: 'Fita isolante preta · média',
      category: 'Fitas',
      tags: ['fita', 'isolante', 'preta', 'adesiva', 'vinil'],
      width: 220,
      height: 60,
      svg: (() => {
        const pts = makeTapePath(200, 36, 3110, { leftTorn: true, rightTorn: true });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 60" width="220" height="60">
  <g transform="translate(10, 12)">
    <polygon points="${pts}" fill="rgba(0,0,0,0.28)" transform="translate(2, 3)"/>
    <!-- Black vinyl tape -->
    <polygon points="${pts}" fill="#1c1d22" stroke="#101114" stroke-width="1"/>
    <!-- Vinyl subtle reflection sheen -->
    <line x1="12" y1="8" x2="188" y2="8" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
    <line x1="12" y1="28" x2="188" y2="28" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  </g>
</svg>`;
      })(),
    },
    // 11. Fita isolante preta diagonal
    {
      id: 'casa-fita-isolante-diagonal',
      name: 'Fita isolante preta · diagonal',
      category: 'Fitas',
      tags: ['fita', 'isolante', 'preta', 'adesiva', 'vinil', 'diagonal'],
      width: 180,
      height: 110,
      svg: (() => {
        const pts = makeTapePath(160, 36, 3111, { leftTorn: true, rightTorn: true });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 110" width="180" height="110">
  <g transform="translate(90, 55) rotate(22) translate(-80, -18)">
    <polygon points="${pts}" fill="rgba(0,0,0,0.28)" transform="translate(2, 3)"/>
    <polygon points="${pts}" fill="#1c1d22" stroke="#101114" stroke-width="1"/>
    <line x1="12" y1="8" x2="148" y2="8" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  </g>
</svg>`;
      })(),
    },
  ];

  return list;
}

