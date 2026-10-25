export function items() {
  const list = [];

  // 12 Original Fictional Occult Sigils
  const sigilDefs = [
    {
      num: 1,
      name: 'Sigilo · círculo e trindade de lâminas',
      render: () => `
    <circle cx="100" cy="100" r="82" stroke-width="3"/>
    <circle cx="100" cy="100" r="68" stroke-width="1.2" stroke-dasharray="4 3"/>
    <circle cx="100" cy="100" r="12" fill="#000"/>
    <line x1="100" y1="18" x2="100" y2="182" stroke-width="2.5"/>
    <line x1="28" y1="60" x2="172" y2="140" stroke-width="2"/>
    <line x1="28" y1="140" x2="172" y2="60" stroke-width="2"/>
    <circle cx="100" cy="35" r="5" stroke-width="2"/>
    <circle cx="45" cy="130" r="5" stroke-width="2"/>
    <circle cx="155" cy="130" r="5" stroke-width="2"/>`,
    },
    {
      num: 2,
      name: 'Sigilo · portal de arcos cruzados',
      render: () => `
    <path d="M 40 160 C 40 60 160 60 160 160" stroke-width="3"/>
    <path d="M 160 40 C 60 40 60 160 160 160" stroke-width="3"/>
    <line x1="20" y1="100" x2="180" y2="100" stroke-width="2.5"/>
    <line x1="100" y1="20" x2="100" y2="180" stroke-width="2.5"/>
    <circle cx="100" cy="100" r="28" stroke-width="2"/>
    <polygon points="100,82 118,100 100,118 82,100" stroke-width="1.5"/>`,
    },
    {
      num: 3,
      name: 'Sigilo · constelação orbital',
      render: () => `
    <ellipse cx="100" cy="100" rx="80" ry="32" stroke-width="2.5" transform="rotate(-30, 100, 100)"/>
    <ellipse cx="100" cy="100" rx="80" ry="32" stroke-width="2.5" transform="rotate(30, 100, 100)"/>
    <circle cx="100" cy="100" r="18" stroke-width="3"/>
    <circle cx="100" cy="100" r="6" fill="#000"/>
    <circle cx="40" cy="65" r="6" fill="#000"/>
    <circle cx="160" cy="135" r="6" fill="#000"/>
    <circle cx="160" cy="65" r="6" fill="#000"/>
    <circle cx="40" cy="135" r="6" fill="#000"/>`,
    },
    {
      num: 4,
      name: 'Sigilo · âncora abissal',
      render: () => `
    <circle cx="100" cy="45" r="22" stroke-width="3"/>
    <circle cx="100" cy="45" r="8" fill="#000"/>
    <line x1="100" y1="67" x2="100" y2="175" stroke-width="4"/>
    <line x1="50" y1="95" x2="150" y2="95" stroke-width="3"/>
    <path d="M 40 145 C 50 185 150 185 160 145" stroke-width="4"/>
    <polygon points="35,145 45,145 40,132" fill="#000"/>
    <polygon points="155,145 165,145 160,132" fill="#000"/>`,
    },
    {
      num: 5,
      name: 'Sigilo · olho das sete esferas',
      render: () => `
    <path d="M 25 100 Q 100 35 175 100 Q 100 165 25 100 Z" stroke-width="3"/>
    <circle cx="100" cy="100" r="32" stroke-width="2.5"/>
    <circle cx="100" cy="100" r="14" fill="#000"/>
    <circle cx="100" cy="20" r="6" stroke-width="2"/>
    <circle cx="100" cy="180" r="6" stroke-width="2"/>
    <line x1="100" y1="26" x2="100" y2="68" stroke-width="2"/>
    <line x1="100" y1="132" x2="100" y2="174" stroke-width="2"/>`,
    },
    {
      num: 6,
      name: 'Sigilo · bússola dos ventos velados',
      render: () => `
    <circle cx="100" cy="100" r="75" stroke-width="3"/>
    <polygon points="100,25 110,90 175,100 110,110 100,175 90,110 25,100 90,90" stroke-width="2"/>
    <polygon points="100,50 106,94 150,100 106,106 100,150 94,106 50,100 94,94" fill="#000"/>`,
    },
    {
      num: 7,
      name: 'Sigilo · labirinto concêntrico',
      render: () => `
    <circle cx="100" cy="100" r="80" stroke-width="3"/>
    <circle cx="100" cy="100" r="60" stroke-width="2.5" stroke-dasharray="35 15"/>
    <circle cx="100" cy="100" r="40" stroke-width="2.5" stroke-dasharray="25 12"/>
    <circle cx="100" cy="100" r="20" stroke-width="2.5"/>
    <line x1="100" y1="20" x2="100" y2="80" stroke-width="2.5"/>
    <line x1="100" y1="120" x2="100" y2="180" stroke-width="2.5"/>`,
    },
    {
      num: 8,
      name: 'Sigilo · chifre da lua tríplice',
      render: () => `
    <circle cx="100" cy="100" r="40" stroke-width="3"/>
    <!-- Left waxing crescent -->
    <path d="M 100 40 C 65 40 45 70 45 100 C 45 130 65 160 100 160 C 75 140 75 60 100 40 Z" stroke-width="2.5" fill="#000"/>
    <!-- Right waning crescent -->
    <path d="M 100 40 C 135 40 155 70 155 100 C 155 130 135 160 100 160 C 125 140 125 60 100 40 Z" stroke-width="2.5" fill="#000"/>
    <line x1="20" y1="100" x2="180" y2="100" stroke-width="2"/>`,
    },
    {
      num: 9,
      name: 'Sigilo · cetro hermético',
      render: () => `
    <line x1="100" y1="15" x2="100" y2="185" stroke-width="3.5"/>
    <circle cx="100" cy="35" r="18" stroke-width="2.5"/>
    <path d="M 60 70 Q 100 105 140 70" stroke-width="2.5"/>
    <path d="M 60 120 Q 100 155 140 120" stroke-width="2.5"/>
    <circle cx="60" cy="70" r="5" fill="#000"/>
    <circle cx="140" cy="70" r="5" fill="#000"/>
    <circle cx="60" cy="120" r="5" fill="#000"/>
    <circle cx="140" cy="120" r="5" fill="#000"/>`,
    },
    {
      num: 10,
      name: 'Sigilo · hexagrama de contenção',
      render: () => `
    <circle cx="100" cy="100" r="82" stroke-width="3"/>
    <polygon points="100,30 160,135 40,135" stroke-width="2.5"/>
    <polygon points="100,170 160,65 40,65" stroke-width="2.5"/>
    <circle cx="100" cy="100" r="16" fill="#000"/>`,
    },
    {
      num: 11,
      name: 'Sigilo · nó espiral do abismo',
      render: () => `
    <path d="M 100 100 m 0 -60 a 60 60 0 1 0 60 60 a 45 45 0 1 0 -45 -45 a 30 30 0 1 0 30 30" stroke-width="3" stroke-linecap="round"/>
    <line x1="25" y1="25" x2="175" y2="175" stroke-width="2"/>
    <circle cx="25" cy="25" r="6" fill="#000"/>
    <circle cx="175" cy="175" r="6" fill="#000"/>`,
    },
    {
      num: 12,
      name: 'Sigilo · chave do trono oculto',
      render: () => `
    <circle cx="100" cy="100" r="76" stroke-width="2.5"/>
    <path d="M 55 140 L 100 50 L 145 140 Z" stroke-width="3"/>
    <line x1="45" y1="110" x2="155" y2="110" stroke-width="3"/>
    <line x1="100" y1="25" x2="100" y2="175" stroke-width="2.5"/>
    <circle cx="100" cy="50" r="8" fill="#000"/>
    <circle cx="55" cy="140" r="6" fill="#000"/>
    <circle cx="145" cy="140" r="6" fill="#000"/>`,
    },
  ];

  for (const s of sigilDefs) {
    list.push({
      id: `casa-simbolo-sigilo-${s.num}`,
      name: s.name,
      category: 'Símbolos',
      tags: ['símbolo', 'sigilo', 'oculto', 'magia', 'hermético', 'ritual'],
      width: 200,
      height: 200,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    ${s.render()}
  </g>
</svg>`,
    });
  }

  // 6 Classical Occult & Mysterious Symbols
  // 13. Pentáculo
  list.push({
    id: 'casa-simbolo-pentaculo',
    name: 'Símbolo · pentáculo ritual',
    category: 'Símbolos',
    tags: ['símbolo', 'pentáculo', 'pentagrama', 'estrela', 'ritual', 'proteção'],
    width: 220,
    height: 220,
    svg: (() => {
      const cx = 110;
      const cy = 110;
      const r = 85;
      const points = [];
      // 5-pointed star order: 0, 2, 4, 1, 3
      const order = [0, 2, 4, 1, 3];
      for (const idx of order) {
        const a = (idx * 2 * Math.PI) / 5 - Math.PI / 2;
        points.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <!-- Outer concentric circles -->
    <circle cx="${cx}" cy="${cy}" r="98" stroke-width="3.5"/>
    <circle cx="${cx}" cy="${cy}" r="90" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="85" stroke-width="1"/>
    <!-- Interlaced pentagram -->
    <polygon points="${points.join(' ')}" stroke-width="3.5"/>
  </g>
</svg>`;
    })(),
  });

  // 14. Olho em triângulo (Olho da Providência)
  list.push({
    id: 'casa-simbolo-olho-triangulo',
    name: 'Símbolo · olho da providência',
    category: 'Símbolos',
    tags: ['símbolo', 'olho', 'triângulo', 'providência', 'maçonaria', 'iluminati'],
    width: 240,
    height: 220,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 220" width="240" height="220">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <!-- Radiating sunburst rays -->
    <line x1="120" y1="125" x2="60" y2="45" stroke-width="1.2"/>
    <line x1="120" y1="125" x2="120" y2="25" stroke-width="1.2"/>
    <line x1="120" y1="125" x2="180" y2="45" stroke-width="1.2"/>
    <line x1="120" y1="125" x2="40" y2="125" stroke-width="1.2"/>
    <line x1="120" y1="125" x2="200" y2="125" stroke-width="1.2"/>
    <!-- Equilateral triangle -->
    <polygon points="120,30 215,195 25,195" stroke-width="4"/>
    <polygon points="120,46 200,185 40,185" stroke-width="1.5"/>
    <!-- All-seeing Eye -->
    <path d="M 75 130 Q 120 95 165 130 Q 120 165 75 130 Z" stroke-width="2.5"/>
    <circle cx="120" cy="130" r="18" stroke-width="2"/>
    <circle cx="120" cy="130" r="8" fill="#000000"/>
    <circle cx="117" cy="127" r="2.5" fill="#ffffff"/>
  </g>
</svg>`,
  });

  // 15. Espiral
  list.push({
    id: 'casa-simbolo-espiral',
    name: 'Símbolo · espiral cósmica',
    category: 'Símbolos',
    tags: ['símbolo', 'espiral', 'vórtice', 'infinito', 'celta', 'abismo'],
    width: 200,
    height: 200,
    svg: (() => {
      // Archimedean spiral points
      let d = 'M 100 100';
      const turns = 3.6;
      const totalSteps = 120;
      for (let i = 1; i <= totalSteps; i++) {
        const theta = (i / totalSteps) * (turns * 2 * Math.PI);
        const r = (i / totalSteps) * 82;
        const x = 100 + r * Math.cos(theta);
        const y = 100 + r * Math.sin(theta);
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <path d="${d}" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
  <circle cx="100" cy="100" r="4.5" fill="#000000"/>
  <circle cx="178" cy="80" r="4" fill="#000000"/>
</svg>`;
    })(),
  });

  // 16. Mãos (Mão mística com olho)
  list.push({
    id: 'casa-simbolo-maos',
    name: 'Símbolo · mão mística quiromancia',
    category: 'Símbolos',
    tags: ['símbolo', 'mão', 'quiromancia', 'hamsá', 'olho', 'palma'],
    width: 220,
    height: 300,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 300" width="220" height="300">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <!-- Hand outline: thumb, 3 fingers, pinky, wrist -->
    <path d="M 80 270 L 80 240 C 65 235 45 200 35 170 C 25 140 38 130 50 145 C 58 155 64 170 65 180 L 65 95 C 65 75 80 75 80 95 L 80 60 C 80 40 98 40 98 60 L 98 68 C 98 48 116 48 116 68 L 116 100 C 116 85 132 85 132 105 L 132 175 C 132 165 148 165 152 180 C 160 210 150 245 138 270 Z" stroke-width="3.5"/>
    <!-- Palmistry lines -->
    <path d="M 68 185 C 80 215 105 240 125 255" stroke-width="1.8"/>
    <path d="M 68 175 C 95 185 125 180 140 195" stroke-width="1.8"/>
    <!-- Eye in palm -->
    <path d="M 85 205 Q 105 188 125 205 Q 105 222 85 205 Z" stroke-width="2"/>
    <circle cx="105" cy="205" r="5" fill="#000000"/>
  </g>
</svg>`,
  });

  // 17. Chave antiga
  list.push({
    id: 'casa-simbolo-chave-antiga',
    name: 'Símbolo · chave antiga esotérica',
    category: 'Símbolos',
    tags: ['símbolo', 'chave', 'antiga', 'segredo', 'portal', 'mistério'],
    width: 140,
    height: 320,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 320" width="140" height="320">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <!-- Ornate bow (head) -->
    <circle cx="70" cy="65" r="45" stroke-width="4.5"/>
    <circle cx="70" cy="65" r="28" stroke-width="2.5"/>
    <!-- Inner clover/trefoil cutout -->
    <circle cx="70" cy="50" r="10" stroke-width="2"/>
    <circle cx="56" cy="74" r="10" stroke-width="2"/>
    <circle cx="84" cy="74" r="10" stroke-width="2"/>
    <!-- Key shaft -->
    <line x1="70" y1="110" x2="70" y2="295" stroke-width="6"/>
    <!-- Collar rings -->
    <rect x="60" y="115" width="20" height="8" rx="2" fill="#000000"/>
    <rect x="62" y="245" width="16" height="6" rx="1.5" fill="#000000"/>
    <!-- Ornate bit with notches -->
    <path d="M 73 248 L 105 248 L 105 292 L 95 292 L 95 278 L 85 278 L 85 292 L 73 292 Z" stroke-width="3" fill="#000000"/>
    <rect x="82" y="256" width="6" height="10" fill="#ffffff"/>
  </g>
</svg>`,
  });

  // 18. Ampulheta
  list.push({
    id: 'casa-simbolo-ampulheta',
    name: 'Símbolo · ampulheta do tempo',
    category: 'Símbolos',
    tags: ['símbolo', 'ampulheta', 'tempo', 'areia', 'mortalidade', 'destino'],
    width: 200,
    height: 280,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="200" height="280">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <!-- Top & Bottom wooden caps -->
    <rect x="40" y="25" width="120" height="16" rx="3" fill="#000000"/>
    <rect x="40" y="239" width="120" height="16" rx="3" fill="#000000"/>
    <!-- Outer glass bulbs -->
    <path d="M 55 41 C 55 95 90 135 95 140 C 90 145 55 185 55 239 L 145 239 C 145 185 110 145 105 140 C 110 135 145 95 145 41 Z" stroke-width="3.5"/>
    <!-- Sand in top bulb draining -->
    <path d="M 65 75 C 75 115 95 138 98 140 C 101 138 121 115 131 75 Z" fill="#000000"/>
    <!-- Falling sand trickle -->
    <line x1="100" y1="140" x2="100" y2="200" stroke-width="2" stroke-dasharray="2 3"/>
    <!-- Accumulated sand in bottom bulb -->
    <path d="M 62 235 C 70 215 90 200 100 200 C 110 200 130 215 138 235 Z" fill="#000000"/>
    <!-- Side pillars -->
    <line x1="45" y1="41" x2="45" y2="239" stroke-width="3"/>
    <line x1="155" y1="41" x2="155" y2="239" stroke-width="3"/>
  </g>
</svg>`,
  });

  return list;
}

