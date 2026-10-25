import { wordPath } from './letters.js';

export function items() {
  const list = [
    // 1. Etiqueta de pasta (File folder label)
    {
      id: 'casa-etiqueta-pasta',
      name: 'Etiqueta · pasta de arquivo',
      category: 'Etiquetas',
      tags: ['etiqueta', 'pasta', 'arquivo', 'ofício', 'adesiva'],
      width: 280,
      height: 120,
      svg: (() => {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 120" width="280" height="120">
  <!-- Drop shadow -->
  <rect x="12" y="12" width="256" height="96" rx="4" fill="rgba(0,0,0,0.18)"/>
  <!-- Aged paper label base -->
  <rect x="10" y="10" width="256" height="96" rx="4" fill="#faf4e6" stroke="#d6ccb2" stroke-width="1.2"/>
  <!-- Top decorative red bar -->
  <rect x="10" y="10" width="256" height="12" rx="4" fill="#ab2e2e"/>
  <!-- Fine double border line -->
  <rect x="18" y="28" width="240" height="70" fill="none" stroke="#2b4c7e" stroke-width="0.8"/>
  <!-- Ruled notebook lines for writing -->
  <line x1="28" y1="52" x2="248" y2="52" stroke="#4a6fa5" stroke-width="0.8" stroke-dasharray="2 1"/>
  <line x1="28" y1="74" x2="248" y2="74" stroke="#4a6fa5" stroke-width="0.8" stroke-dasharray="2 1"/>
</svg>`;
      })(),
    },
    // 2. Etiqueta de arquivo com ilhós (Archive tag with brass eyelet & string)
    {
      id: 'casa-etiqueta-arquivo-ilhos',
      name: 'Etiqueta · arquivo com ilhós',
      category: 'Etiquetas',
      tags: ['etiqueta', 'tag', 'ilhós', 'barbante', 'arquivo', 'manila'],
      width: 340,
      height: 160,
      svg: (() => {
        const textArchive = wordPath('ARQUIVO GERAL', { scale: 1.4, letterSpacing: 1.2 });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 160" width="340" height="160">
  <!-- Jute string loop -->
  <path d="M 52 80 C 15 65 5 40 10 20 C 15 5 40 15 50 75" fill="none" stroke="#9e8765" stroke-width="3" stroke-linecap="round"/>
  <!-- Drop shadow -->
  <polygon points="82,22 302,22 302,142 82,142 54,92 54,72" fill="rgba(0,0,0,0.18)"/>
  <!-- Manila tag body with clipped left corners -->
  <polygon points="80,20 300,20 300,140 80,140 52,90 52,70" fill="#dfca9f" stroke="#bfaa7f" stroke-width="1.5"/>
  <!-- Outer perimeter stitched border -->
  <polygon points="83,26 294,26 294,134 83,134 58,88 58,72" fill="none" stroke="#877555" stroke-width="0.8" stroke-dasharray="4 3"/>
  <!-- Brass eyelet ring -->
  <circle cx="75" cy="80" r="14" fill="#a88c44" stroke="#755e25" stroke-width="1.5"/>
  <!-- Inner hole -->
  <circle cx="75" cy="80" r="7" fill="#ffffff" stroke="#4d3d17" stroke-width="1"/>
  <!-- Tag heading -->
  <path d="${textArchive.d}" transform="translate(110, 36)" stroke="#423521" stroke-width="1.5" fill="none"/>
  <!-- Ruled lines -->
  <line x1="110" y1="70" x2="285" y2="70" stroke="#7a694e" stroke-width="1"/>
  <line x1="110" y1="95" x2="285" y2="95" stroke="#7a694e" stroke-width="1"/>
  <line x1="110" y1="120" x2="285" y2="120" stroke="#7a694e" stroke-width="1"/>
</svg>`;
      })(),
    },
    // 3. Etiqueta de evidência com campos (Evidence tag)
    {
      id: 'casa-etiqueta-evidencia',
      name: 'Etiqueta · evidência pericial',
      category: 'Etiquetas',
      tags: ['etiqueta', 'evidência', 'polícia', 'perícia', 'crime', 'investigação'],
      width: 320,
      height: 200,
      svg: (() => {
        const hTitle = wordPath('EVIDENCIA PERICIAL', { scale: 1.6, letterSpacing: 1.4 });
        const fCaso = wordPath('CASO:', { scale: 1.1, letterSpacing: 1.0 });
        const fData = wordPath('DATA:', { scale: 1.1, letterSpacing: 1.0 });
        const fItem = wordPath('ITEM:', { scale: 1.1, letterSpacing: 1.0 });
        const fAgte = wordPath('AGENTE:', { scale: 1.1, letterSpacing: 1.0 });

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <!-- Shadow -->
  <rect x="12" y="12" width="296" height="176" fill="rgba(0,0,0,0.2)"/>
  <!-- Evidence Card base -->
  <rect x="10" y="10" width="296" height="176" fill="#fcf9ee" stroke="#222" stroke-width="2"/>
  <!-- Black header banner -->
  <rect x="14" y="14" width="288" height="30" fill="#1b1c1e"/>
  <path d="${hTitle.d}" transform="translate(36, 22)" stroke="#ffffff" stroke-width="1.8" fill="none"/>
  <!-- Heavy border frame -->
  <rect x="14" y="48" width="288" height="134" fill="none" stroke="#1b1c1e" stroke-width="1.2"/>
  <!-- Printed field labels and lines -->
  <path d="${fCaso.d}" transform="translate(22, 60)" stroke="#111" stroke-width="1.2" fill="none"/>
  <line x1="80" y1="72" x2="290" y2="72" stroke="#333" stroke-width="1"/>

  <path d="${fData.d}" transform="translate(22, 90)" stroke="#111" stroke-width="1.2" fill="none"/>
  <line x1="80" y1="102" x2="290" y2="102" stroke="#333" stroke-width="1"/>

  <path d="${fItem.d}" transform="translate(22, 120)" stroke="#111" stroke-width="1.2" fill="none"/>
  <line x1="80" y1="132" x2="290" y2="132" stroke="#333" stroke-width="1"/>

  <path d="${fAgte.d}" transform="translate(22, 150)" stroke="#111" stroke-width="1.2" fill="none"/>
  <line x1="95" y1="162" x2="290" y2="162" stroke="#333" stroke-width="1"/>
</svg>`;
      })(),
    },
    // 4. Cantoneira de foto preta (individual)
    {
      id: 'casa-etiqueta-cantoneira-preta',
      name: 'Cantoneira de foto · preta (individual)',
      category: 'Etiquetas',
      tags: ['cantoneira', 'foto', 'álbum', 'preta', 'canto'],
      width: 80,
      height: 80,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <!-- Shadow -->
  <polygon points="12,12 72,12 12,72" fill="rgba(0,0,0,0.22)"/>
  <!-- Black triangular corner mount -->
  <polygon points="10,10 70,10 10,70" fill="#222326" stroke="#101112" stroke-width="1.2"/>
  <!-- Embossed inner triangle contour -->
  <polygon points="15,15 58,15 15,58" fill="none" stroke="#44464c" stroke-width="1"/>
  <!-- Photo insertion slot slit -->
  <line x1="20" y1="60" x2="60" y2="20" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
</svg>`,
    },
    // 5. Cantoneira de foto dourada (individual)
    {
      id: 'casa-etiqueta-cantoneira-dourada',
      name: 'Cantoneira de foto · dourada (individual)',
      category: 'Etiquetas',
      tags: ['cantoneira', 'foto', 'álbum', 'dourada', 'ornada', 'canto'],
      width: 80,
      height: 80,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <polygon points="12,12 72,12 12,72" fill="rgba(0,0,0,0.22)"/>
  <!-- Antique Gold triangle -->
  <polygon points="10,10 70,10 10,70" fill="#c4a54c" stroke="#8c7028" stroke-width="1.2"/>
  <polygon points="15,15 58,15 15,58" fill="none" stroke="#fad875" stroke-width="1"/>
  <!-- Ornate filigree scroll in corner -->
  <path d="M 16 16 Q 28 28 16 38 M 16 16 Q 28 28 38 16" fill="none" stroke="#705417" stroke-width="1.2"/>
  <!-- Insertion slit -->
  <line x1="20" y1="60" x2="60" y2="20" stroke="#523d0e" stroke-width="2.5" stroke-linecap="round"/>
</svg>`,
    },
    // 6. Cantoneira de foto papel kraft (individual)
    {
      id: 'casa-etiqueta-cantoneira-kraft',
      name: 'Cantoneira de foto · kraft (individual)',
      category: 'Etiquetas',
      tags: ['cantoneira', 'foto', 'álbum', 'kraft', 'papel', 'canto'],
      width: 80,
      height: 80,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <polygon points="12,12 72,12 12,72" fill="rgba(0,0,0,0.18)"/>
  <polygon points="10,10 70,10 10,70" fill="#bfa57b" stroke="#947c54" stroke-width="1.2"/>
  <polygon points="16,16 56,16 16,56" fill="none" stroke="#dfc8a2" stroke-width="1"/>
  <line x1="20" y1="60" x2="60" y2="20" stroke="#5c482a" stroke-width="2" stroke-linecap="round"/>
</svg>`,
    },
    // 7. Conjunto 4 cantoneiras pretas
    {
      id: 'casa-etiqueta-cantoneiras-foto-pretas',
      name: 'Cantoneiras de foto (conjunto 4) · pretas',
      category: 'Etiquetas',
      tags: ['cantoneiras', 'conjunto', 'foto', 'álbum', 'preto', 'moldura'],
      width: 400,
      height: 300,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <!-- Top-Left -->
  <g transform="translate(10, 10)">
    <polygon points="2,2 52,2 2,52" fill="rgba(0,0,0,0.2)"/>
    <polygon points="0,0 50,0 0,50" fill="#222326" stroke="#101112" stroke-width="1"/>
    <polygon points="4,4 40,4 4,40" fill="none" stroke="#44464c" stroke-width="0.8"/>
    <line x1="12" y1="42" x2="42" y2="12" stroke="#000" stroke-width="2"/>
  </g>
  <!-- Top-Right -->
  <g transform="translate(390, 10) scale(-1, 1)">
    <polygon points="2,2 52,2 2,52" fill="rgba(0,0,0,0.2)"/>
    <polygon points="0,0 50,0 0,50" fill="#222326" stroke="#101112" stroke-width="1"/>
    <polygon points="4,4 40,4 4,40" fill="none" stroke="#44464c" stroke-width="0.8"/>
    <line x1="12" y1="42" x2="42" y2="12" stroke="#000" stroke-width="2"/>
  </g>
  <!-- Bottom-Left -->
  <g transform="translate(10, 290) scale(1, -1)">
    <polygon points="2,2 52,2 2,52" fill="rgba(0,0,0,0.2)"/>
    <polygon points="0,0 50,0 0,50" fill="#222326" stroke="#101112" stroke-width="1"/>
    <polygon points="4,4 40,4 4,40" fill="none" stroke="#44464c" stroke-width="0.8"/>
    <line x1="12" y1="42" x2="42" y2="12" stroke="#000" stroke-width="2"/>
  </g>
  <!-- Bottom-Right -->
  <g transform="translate(390, 290) scale(-1, -1)">
    <polygon points="2,2 52,2 2,52" fill="rgba(0,0,0,0.2)"/>
    <polygon points="0,0 50,0 0,50" fill="#222326" stroke="#101112" stroke-width="1"/>
    <polygon points="4,4 40,4 4,40" fill="none" stroke="#44464c" stroke-width="0.8"/>
    <line x1="12" y1="42" x2="42" y2="12" stroke="#000" stroke-width="2"/>
  </g>
</svg>`,
    },
    // 8. Conjunto 4 cantoneiras douradas
    {
      id: 'casa-etiqueta-cantoneiras-foto-douradas',
      name: 'Cantoneiras de foto (conjunto 4) · douradas',
      category: 'Etiquetas',
      tags: ['cantoneiras', 'conjunto', 'foto', 'álbum', 'dourado', 'moldura'],
      width: 400,
      height: 300,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <!-- Top-Left -->
  <g transform="translate(10, 10)">
    <polygon points="2,2 52,2 2,52" fill="rgba(0,0,0,0.2)"/>
    <polygon points="0,0 50,0 0,50" fill="#c4a54c" stroke="#8c7028" stroke-width="1"/>
    <polygon points="4,4 40,4 4,40" fill="none" stroke="#fad875" stroke-width="0.8"/>
    <line x1="12" y1="42" x2="42" y2="12" stroke="#523d0e" stroke-width="2"/>
  </g>
  <!-- Top-Right -->
  <g transform="translate(390, 10) scale(-1, 1)">
    <polygon points="2,2 52,2 2,52" fill="rgba(0,0,0,0.2)"/>
    <polygon points="0,0 50,0 0,50" fill="#c4a54c" stroke="#8c7028" stroke-width="1"/>
    <polygon points="4,4 40,4 4,40" fill="none" stroke="#fad875" stroke-width="0.8"/>
    <line x1="12" y1="42" x2="42" y2="12" stroke="#523d0e" stroke-width="2"/>
  </g>
  <!-- Bottom-Left -->
  <g transform="translate(10, 290) scale(1, -1)">
    <polygon points="2,2 52,2 2,52" fill="rgba(0,0,0,0.2)"/>
    <polygon points="0,0 50,0 0,50" fill="#c4a54c" stroke="#8c7028" stroke-width="1"/>
    <polygon points="4,4 40,4 4,40" fill="none" stroke="#fad875" stroke-width="0.8"/>
    <line x1="12" y1="42" x2="42" y2="12" stroke="#523d0e" stroke-width="2"/>
  </g>
  <!-- Bottom-Right -->
  <g transform="translate(390, 290) scale(-1, -1)">
    <polygon points="2,2 52,2 2,52" fill="rgba(0,0,0,0.2)"/>
    <polygon points="0,0 50,0 0,50" fill="#c4a54c" stroke="#8c7028" stroke-width="1"/>
    <polygon points="4,4 40,4 4,40" fill="none" stroke="#fad875" stroke-width="0.8"/>
    <line x1="12" y1="42" x2="42" y2="12" stroke="#523d0e" stroke-width="2"/>
  </g>
</svg>`,
    },
  ];

  return list;
}

