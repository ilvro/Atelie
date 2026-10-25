export function items() {
  const list = [
    // 1. Fio de jornal simples (Tapered newspaper rule)
    {
      id: 'casa-ornamento-fio-jornal-simples',
      name: 'Fio de jornal · simples',
      category: 'Ornamentos',
      tags: ['ornamento', 'fio', 'jornal', 'divisória', 'linha', 'regra'],
      width: 600,
      height: 20,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 20" width="600" height="20">
  <polygon points="10,10 300,11.5 590,10 300,8.5" fill="#000000"/>
</svg>`,
    },
    // 2. Fio de jornal duplo (Double hairline)
    {
      id: 'casa-ornamento-fio-jornal-duplo',
      name: 'Fio de jornal · duplo',
      category: 'Ornamentos',
      tags: ['ornamento', 'fio', 'jornal', 'divisória', 'duplo', 'coluna'],
      width: 600,
      height: 24,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 24" width="600" height="24">
  <line x1="10" y1="9" x2="590" y2="9" stroke="#000000" stroke-width="1.2"/>
  <line x1="10" y1="15" x2="590" y2="15" stroke="#000000" stroke-width="1.2"/>
</svg>`,
    },
    // 3. Fio de jornal grosso-fino (Oxford rule)
    {
      id: 'casa-ornamento-fio-jornal-grosso-fino',
      name: 'Fio de jornal · grosso e fino',
      category: 'Ornamentos',
      tags: ['ornamento', 'fio', 'jornal', 'divisória', 'oxford', 'seção'],
      width: 600,
      height: 26,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 26" width="600" height="26">
  <line x1="10" y1="8" x2="590" y2="8" stroke="#000000" stroke-width="3.5"/>
  <line x1="10" y1="17" x2="590" y2="17" stroke="#000000" stroke-width="1"/>
</svg>`,
    },
    // 4. Arabesco simétrico
    {
      id: 'casa-ornamento-arabesco-simetrico',
      name: 'Arabesco · simétrico clássico',
      category: 'Ornamentos',
      tags: ['ornamento', 'arabesco', 'simétrico', 'vinheta', 'divisória'],
      width: 400,
      height: 60,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 60" width="400" height="60">
  <g stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round">
    <!-- Center diamond -->
    <polygon points="200,22 208,30 200,38 192,30" fill="#000000"/>
    <!-- Left scroll -->
    <path d="M 190 30 C 150 30 140 12 110 12 C 80 12 70 34 50 34 C 30 34 20 24 20 18 C 20 12 28 12 28 18 C 28 26 10 32 6 32"/>
    <path d="M 170 30 C 140 45 120 48 95 44 C 70 40 60 25 45 25"/>
    <!-- Right scroll -->
    <path d="M 210 30 C 250 30 260 12 290 12 C 320 12 330 34 350 34 C 370 34 380 24 380 18 C 380 12 372 12 372 18 C 372 26 390 32 394 32"/>
    <path d="M 230 30 C 260 45 280 48 305 44 C 330 40 340 25 355 25"/>
  </g>
</svg>`,
    },
    // 5. Arabesco espiral
    {
      id: 'casa-ornamento-arabesco-espiral',
      name: 'Arabesco · espirais duplas',
      category: 'Ornamentos',
      tags: ['ornamento', 'arabesco', 'espiral', 'vinheta'],
      width: 400,
      height: 60,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 60" width="400" height="60">
  <g stroke="#000000" stroke-width="2.2" fill="none" stroke-linecap="round">
    <!-- Center knot -->
    <circle cx="200" cy="30" r="5" fill="#000000"/>
    <!-- Left spiral -->
    <path d="M 190 30 C 150 20 130 46 90 46 C 50 46 30 20 50 16 C 65 14 70 28 58 32 C 48 35 40 28 42 22"/>
    <!-- Right spiral -->
    <path d="M 210 30 C 250 20 270 46 310 46 C 350 46 370 20 350 16 C 335 14 330 28 342 32 C 352 35 360 28 358 22"/>
  </g>
</svg>`,
    },
    // 6. Arabesco floral
    {
      id: 'casa-ornamento-arabesco-floral',
      name: 'Arabesco · folhagem floral',
      category: 'Ornamentos',
      tags: ['ornamento', 'arabesco', 'floral', 'folhas', 'botânico'],
      width: 400,
      height: 60,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 60" width="400" height="60">
  <!-- Central rosette -->
  <circle cx="200" cy="30" r="4" fill="#000000"/>
  <!-- Leaves -->
  <path d="M 185 30 Q 160 16 140 28 Q 165 38 185 30 Z" fill="#000000"/>
  <path d="M 215 30 Q 240 16 260 28 Q 235 38 215 30 Z" fill="#000000"/>
  <path d="M 130 28 Q 105 14 85 28 Q 110 38 130 28 Z" fill="#000000"/>
  <path d="M 270 28 Q 295 14 315 28 Q 290 38 270 28 Z" fill="#000000"/>
  <!-- Stem -->
  <path d="M 40 30 C 80 20 140 36 200 30 C 260 36 320 20 360 30" fill="none" stroke="#000000" stroke-width="2"/>
</svg>`,
    },
    // 7. Arabesco rococó
    {
      id: 'casa-ornamento-arabesco-rococo',
      name: 'Arabesco · rococó curva em S',
      category: 'Ornamentos',
      tags: ['ornamento', 'arabesco', 'rococó', 'curva', 'elegante'],
      width: 360,
      height: 70,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 70" width="360" height="70">
  <path d="M 30 50 C 60 10 120 10 180 35 C 240 60 300 60 330 20" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
  <path d="M 50 48 C 80 24 130 24 180 44 C 230 64 280 50 310 28" fill="none" stroke="#000000" stroke-width="1.2"/>
  <circle cx="28" cy="52" r="5" fill="#000000"/>
  <circle cx="332" cy="18" r="5" fill="#000000"/>
  <circle cx="180" cy="35" r="4" fill="#000000"/>
</svg>`,
    },
    // 8. Canto ornamental filigrana
    {
      id: 'casa-ornamento-canto-filigrana',
      name: 'Canto ornamental · filigrana',
      category: 'Ornamentos',
      tags: ['ornamento', 'canto', 'cantoneira', 'filigrana', 'borda'],
      width: 120,
      height: 120,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <path d="M 12 110 L 12 12 L 110 12" fill="none" stroke="#000000" stroke-width="3"/>
  <path d="M 22 100 L 22 22 L 100 22" fill="none" stroke="#000000" stroke-width="1.2"/>
  <path d="M 16 16 C 50 60 60 50 90 26 C 50 70 70 90 26 90" fill="none" stroke="#000000" stroke-width="2"/>
  <circle cx="28" cy="28" r="4.5" fill="#000000"/>
</svg>`,
    },
    // 9. Canto ornamental floral
    {
      id: 'casa-ornamento-canto-floral',
      name: 'Canto ornamental · floral',
      category: 'Ornamentos',
      tags: ['ornamento', 'canto', 'floral', 'louro', 'botânico'],
      width: 120,
      height: 120,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <path d="M 15 15 C 35 12 70 25 85 15 C 75 35 55 45 45 60 C 35 75 45 100 25 110 C 25 90 12 65 15 15 Z" fill="#000000"/>
  <circle cx="22" cy="22" r="5" fill="#000000"/>
  <circle cx="55" cy="20" r="3" fill="#000000"/>
  <circle cx="20" cy="55" r="3" fill="#000000"/>
</svg>`,
    },
    // 10. Canto ornamental gótico
    {
      id: 'casa-ornamento-canto-gotico',
      name: 'Canto ornamental · gótico',
      category: 'Ornamentos',
      tags: ['ornamento', 'canto', 'gótico', 'medieval', 'trevo'],
      width: 120,
      height: 120,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <path d="M 15 105 L 15 15 L 105 15" fill="none" stroke="#000000" stroke-width="4"/>
  <path d="M 24 95 L 24 24 L 95 24" fill="none" stroke="#000000" stroke-width="1.5"/>
  <!-- Trefoil / gothic arch -->
  <path d="M 24 70 C 24 45 45 24 70 24" fill="none" stroke="#000000" stroke-width="2.5"/>
  <circle cx="48" cy="48" r="7" fill="#000000"/>
</svg>`,
    },
    // 11. Canto ornamental geométrico (Art Déco)
    {
      id: 'casa-ornamento-canto-geometrico',
      name: 'Canto ornamental · geométrico deco',
      category: 'Ornamentos',
      tags: ['ornamento', 'canto', 'geométrico', 'art déco', 'degraus'],
      width: 120,
      height: 120,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <polyline points="15,105 15,45 45,45 45,15 105,15" fill="none" stroke="#000000" stroke-width="3.5"/>
  <polyline points="25,95 25,55 55,55 55,25 95,25" fill="none" stroke="#000000" stroke-width="1.8"/>
  <polygon points="55,55 70,40 85,55 70,70" fill="#000000"/>
</svg>`,
    },
    // 12. Divisória com estrelas
    {
      id: 'casa-ornamento-divisoria-estrelas',
      name: 'Divisória · três estrelas',
      category: 'Ornamentos',
      tags: ['ornamento', 'divisória', 'estrelas', 'asteriscos', 'parágrafo', 'quebra'],
      width: 400,
      height: 40,
      svg: (() => {
        const star = (cx, cy, r) => {
          let pts = [];
          for (let i = 0; i < 10; i++) {
            const a = (i * Math.PI) / 5 - Math.PI / 2;
            const rad = i % 2 === 0 ? r : r * 0.42;
            pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
          }
          return `<polygon points="${pts.join(' ')}" fill="#000000"/>`;
        };
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 40" width="400" height="40">
  <line x1="20" y1="20" x2="150" y2="20" stroke="#000000" stroke-width="1.2"/>
  <line x1="250" y1="20" x2="380" y2="20" stroke="#000000" stroke-width="1.2"/>
  ${star(175, 20, 7)}
  ${star(200, 20, 9)}
  ${star(225, 20, 7)}
</svg>`;
      })(),
    },
    // 13. Divisória com losangos
    {
      id: 'casa-ornamento-divisoria-losangos',
      name: 'Divisória · losangos',
      category: 'Ornamentos',
      tags: ['ornamento', 'divisória', 'losangos', 'diamantes', 'seção'],
      width: 400,
      height: 40,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 40" width="400" height="40">
  <line x1="20" y1="20" x2="160" y2="20" stroke="#000000" stroke-width="1.2"/>
  <line x1="240" y1="20" x2="380" y2="20" stroke="#000000" stroke-width="1.2"/>
  <polygon points="175,15 180,20 175,25 170,20" fill="#000000"/>
  <polygon points="200,12 208,20 200,28 192,20" fill="#000000"/>
  <polygon points="225,15 230,20 225,25 220,20" fill="#000000"/>
</svg>`,
    },
    // 14. Divisória florete (Printer's fleuron / hedera)
    {
      id: 'casa-ornamento-divisoria-florete',
      name: 'Divisória · florete tipográfico',
      category: 'Ornamentos',
      tags: ['ornamento', 'divisória', 'florete', 'hedera', 'vinheta', 'tipografia'],
      width: 400,
      height: 40,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 40" width="400" height="40">
  <line x1="20" y1="20" x2="175" y2="20" stroke="#000000" stroke-width="1.2"/>
  <line x1="225" y1="20" x2="380" y2="20" stroke="#000000" stroke-width="1.2"/>
  <!-- Central ivy leaf / fleuron -->
  <path d="M 200 28 C 192 24 186 16 195 12 C 200 10 204 15 200 20 C 205 16 212 14 210 20 C 208 24 204 26 200 28 Z" fill="#000000"/>
</svg>`,
    },
  ];

  return list;
}

