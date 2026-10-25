export function items() {
  const list = [
    // 1. Moldura Vitoriana 1 (Ornate filigree corners)
    {
      id: 'casa-moldura-vitoriana-1',
      name: 'Moldura · vitoriana arabesco',
      category: 'Molduras',
      tags: ['moldura', 'vitoriana', 'arabesco', 'ornada', 'elegante', 'filigrana'],
      width: 800,
      height: 600,
      svg: (() => {
        const corner = `
    <!-- Corner filigree -->
    <path d="M 30 30 L 150 30 M 30 30 L 30 150" stroke="#000" stroke-width="3" fill="none"/>
    <path d="M 40 40 L 130 40 M 40 40 L 40 130" stroke="#000" stroke-width="1.2" fill="none"/>
    <path d="M 30 30 C 60 70 70 60 100 40 C 70 80 80 120 40 100" stroke="#000" stroke-width="1.8" fill="none"/>
    <circle cx="45" cy="45" r="4" fill="#000"/>
    <circle cx="85" cy="40" r="3" fill="#000"/>
    <circle cx="40" cy="85" r="3" fill="#000"/>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <!-- Outer border -->
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="#000" stroke-width="2.5"/>
  <rect x="26" y="26" width="748" height="548" fill="none" stroke="#000" stroke-width="1"/>
  <!-- Inner border -->
  <rect x="46" y="46" width="708" height="508" fill="none" stroke="#000" stroke-width="1.5"/>
  <!-- Top-Left -->
  <g>${corner}</g>
  <!-- Top-Right -->
  <g transform="translate(800, 0) scale(-1, 1)">${corner}</g>
  <!-- Bottom-Left -->
  <g transform="translate(0, 600) scale(1, -1)">${corner}</g>
  <!-- Bottom-Right -->
  <g transform="translate(800, 600) scale(-1, -1)">${corner}</g>
</svg>`;
      })(),
    },
    // 2. Moldura Vitoriana 2 (Scalloped lace border)
    {
      id: 'casa-moldura-vitoriana-2',
      name: 'Moldura · vitoriana rendada',
      category: 'Molduras',
      tags: ['moldura', 'vitoriana', 'rendada', 'antiga', 'rococó'],
      width: 800,
      height: 600,
      svg: (() => {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect x="25" y="25" width="750" height="550" fill="none" stroke="#000" stroke-width="3"/>
  <rect x="35" y="35" width="730" height="530" fill="none" stroke="#000" stroke-width="1" stroke-dasharray="6 4"/>
  <rect x="45" y="45" width="710" height="510" fill="none" stroke="#000" stroke-width="2"/>
  <!-- Corner rosettes -->
  <circle cx="35" cy="35" r="8" fill="none" stroke="#000" stroke-width="2"/>
  <circle cx="765" cy="35" r="8" fill="none" stroke="#000" stroke-width="2"/>
  <circle cx="35" cy="565" r="8" fill="none" stroke="#000" stroke-width="2"/>
  <circle cx="765" cy="565" r="8" fill="none" stroke="#000" stroke-width="2"/>
</svg>`;
      })(),
    },
    // 3. Moldura Vitoriana 3 (Floral crest flourishes)
    {
      id: 'casa-moldura-vitoriana-3',
      name: 'Moldura · vitoriana floral',
      category: 'Molduras',
      tags: ['moldura', 'vitoriana', 'floral', 'louros', 'clássica'],
      width: 800,
      height: 600,
      svg: (() => {
        const floralCorner = `
    <path d="M 20 60 C 20 20 60 20 60 20 C 45 35 35 45 20 60 Z" fill="#000"/>
    <path d="M 25 25 C 50 15 80 30 100 20 C 85 35 60 35 25 25 Z" fill="#000"/>
    <path d="M 25 25 C 15 50 30 80 20 100 C 35 85 35 60 25 25 Z" fill="#000"/>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect x="30" y="30" width="740" height="540" fill="none" stroke="#000" stroke-width="3.5"/>
  <rect x="42" y="42" width="716" height="516" fill="none" stroke="#000" stroke-width="1.2"/>
  <g>${floralCorner}</g>
  <g transform="translate(800, 0) scale(-1, 1)">${floralCorner}</g>
  <g transform="translate(0, 600) scale(1, -1)">${floralCorner}</g>
  <g transform="translate(800, 600) scale(-1, -1)">${floralCorner}</g>
</svg>`;
      })(),
    },
    // 4. Moldura Art Déco 1 (Stepped geometric corners)
    {
      id: 'casa-moldura-art-deco-1',
      name: 'Moldura · art déco geométrica',
      category: 'Molduras',
      tags: ['moldura', 'art déco', 'anos 20', 'geométrica', 'degraus'],
      width: 800,
      height: 600,
      svg: (() => {
        const decoCorner = `
    <polyline points="20,100 20,40 40,40 40,20 100,20" fill="none" stroke="#000" stroke-width="3"/>
    <polyline points="30,90 30,50 50,50 50,30 90,30" fill="none" stroke="#000" stroke-width="1.5"/>
    <polygon points="50,50 65,35 75,45 60,60" fill="#000"/>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="#000" stroke-width="2"/>
  <rect x="35" y="35" width="730" height="530" fill="none" stroke="#000" stroke-width="1.2"/>
  <g>${decoCorner}</g>
  <g transform="translate(800, 0) scale(-1, 1)">${decoCorner}</g>
  <g transform="translate(0, 600) scale(1, -1)">${decoCorner}</g>
  <g transform="translate(800, 600) scale(-1, -1)">${decoCorner}</g>
</svg>`;
      })(),
    },
    // 5. Moldura Art Déco 2 (Sunburst / Fan corner accents)
    {
      id: 'casa-moldura-art-deco-2',
      name: 'Moldura · art déco leque',
      category: 'Molduras',
      tags: ['moldura', 'art déco', 'leque', 'anos 30', 'raios'],
      width: 800,
      height: 600,
      svg: (() => {
        const fanCorner = `
    <!-- Fan rays from corner -->
    <path d="M 25 25 L 85 40 M 25 25 L 75 55 M 25 25 L 60 70 M 25 25 L 40 85" stroke="#000" stroke-width="1.5" fill="none"/>
    <path d="M 85 40 Q 60 60 40 85" stroke="#000" stroke-width="2.5" fill="none"/>
    <circle cx="25" cy="25" r="5" fill="#000"/>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect x="25" y="25" width="750" height="550" fill="none" stroke="#000" stroke-width="3"/>
  <rect x="36" y="36" width="728" height="528" fill="none" stroke="#000" stroke-width="1.2"/>
  <g>${fanCorner}</g>
  <g transform="translate(800, 0) scale(-1, 1)">${fanCorner}</g>
  <g transform="translate(0, 600) scale(1, -1)">${fanCorner}</g>
  <g transform="translate(800, 600) scale(-1, -1)">${fanCorner}</g>
</svg>`;
      })(),
    },
    // 6. Moldura Medieval 1 (Interlaced knotwork)
    {
      id: 'casa-moldura-medieval-1',
      name: 'Moldura · medieval iluminura',
      category: 'Molduras',
      tags: ['moldura', 'medieval', 'iluminura', 'celta', 'entrelaçado'],
      width: 800,
      height: 600,
      svg: (() => {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="#000" stroke-width="5"/>
  <rect x="32" y="32" width="736" height="536" fill="none" stroke="#000" stroke-width="1.5"/>
  <rect x="42" y="42" width="716" height="516" fill="none" stroke="#000" stroke-width="2.5"/>
  <!-- Corner medieval diamond bosses -->
  <polygon points="32,18 46,32 32,46 18,32" fill="#000"/>
  <polygon points="768,18 782,32 768,46 754,32" fill="#000"/>
  <polygon points="32,554 46,568 32,582 18,568" fill="#000"/>
  <polygon points="768,554 782,568 768,582 754,568" fill="#000"/>
</svg>`;
      })(),
    },
    // 7. Moldura Medieval 2 (Gothic arch corners)
    {
      id: 'casa-moldura-medieval-2',
      name: 'Moldura · medieval arco gótico',
      category: 'Molduras',
      tags: ['moldura', 'medieval', 'gótica', 'arcos', 'manuscrito'],
      width: 800,
      height: 600,
      svg: (() => {
        const gothicCorner = `
    <path d="M 25 70 C 25 45 45 25 70 25" stroke="#000" stroke-width="3" fill="none"/>
    <path d="M 35 60 C 35 45 45 35 60 35" stroke="#000" stroke-width="1.5" fill="none"/>
    <circle cx="48" cy="48" r="4" fill="#000"/>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect x="25" y="25" width="750" height="550" fill="none" stroke="#000" stroke-width="3"/>
  <rect x="35" y="35" width="730" height="530" fill="none" stroke="#000" stroke-width="1.2"/>
  <g>${gothicCorner}</g>
  <g transform="translate(800, 0) scale(-1, 1)">${gothicCorner}</g>
  <g transform="translate(0, 600) scale(1, -1)">${gothicCorner}</g>
  <g transform="translate(800, 600) scale(-1, -1)">${gothicCorner}</g>
</svg>`;
      })(),
    },
    // 8. Moldura Diploma 1 (Guilloche certificate style)
    {
      id: 'casa-moldura-diploma-1',
      name: 'Moldura · diploma certificado',
      category: 'Molduras',
      tags: ['moldura', 'diploma', 'certificado', 'oficial', 'guilhoché'],
      width: 800,
      height: 600,
      svg: (() => {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <!-- Outer bold border -->
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="#000" stroke-width="4"/>
  <!-- Middle decorative border with hash marks -->
  <rect x="28" y="28" width="744" height="544" fill="none" stroke="#000" stroke-width="1"/>
  <rect x="36" y="36" width="728" height="528" fill="none" stroke="#000" stroke-width="2"/>
  <rect x="42" y="42" width="716" height="516" fill="none" stroke="#000" stroke-width="0.8"/>
  <!-- Corner geometric stars -->
  <polygon points="32,24 34,30 40,32 34,34 32,40 30,34 24,32 30,30" fill="#000"/>
  <polygon points="768,24 770,30 776,32 770,34 768,40 766,34 760,32 766,30" fill="#000"/>
  <polygon points="32,560 34,566 40,568 34,570 32,576 30,570 24,568 30,566" fill="#000"/>
  <polygon points="768,560 770,566 776,568 770,570 768,576 766,570 760,568 766,566" fill="#000"/>
</svg>`;
      })(),
    },
    // 9. Moldura Diploma 2 (Meander / Greek key corner certificate)
    {
      id: 'casa-moldura-diploma-2',
      name: 'Moldura · diploma meandro',
      category: 'Molduras',
      tags: ['moldura', 'diploma', 'meandro', 'grega', 'certificado'],
      width: 800,
      height: 600,
      svg: (() => {
        const meanderCorner = `
    <polyline points="26,60 26,26 60,26" fill="none" stroke="#000" stroke-width="3"/>
    <polyline points="34,54 34,34 54,34 54,46 44,46 44,42" fill="none" stroke="#000" stroke-width="2"/>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect x="18" y="18" width="764" height="564" fill="none" stroke="#000" stroke-width="3.5"/>
  <rect x="42" y="42" width="716" height="516" fill="none" stroke="#000" stroke-width="1.5"/>
  <g>${meanderCorner}</g>
  <g transform="translate(800, 0) scale(-1, 1)">${meanderCorner}</g>
  <g transform="translate(0, 600) scale(1, -1)">${meanderCorner}</g>
  <g transform="translate(800, 600) scale(-1, -1)">${meanderCorner}</g>
</svg>`;
      })(),
    },
    // 10. Moldura simples de fio duplo retangular
    {
      id: 'casa-moldura-fio-duplo-retangular',
      name: 'Moldura · fio duplo simples',
      category: 'Molduras',
      tags: ['moldura', 'simples', 'fio duplo', 'retangular', 'clássica'],
      width: 800,
      height: 600,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <!-- Outer thick line -->
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="#000" stroke-width="3.5"/>
  <!-- Inner fine line -->
  <rect x="30" y="30" width="740" height="540" fill="none" stroke="#000" stroke-width="1.2"/>
</svg>`,
    },
    // 11. Moldura simples de fio duplo cantos cortados
    {
      id: 'casa-moldura-fio-duplo-cantos-cortados',
      name: 'Moldura · fio duplo cantos cortados',
      category: 'Molduras',
      tags: ['moldura', 'fio duplo', 'chanfrada', 'cantos cortados'],
      width: 800,
      height: 600,
      svg: (() => {
        const c1 = 30;
        const c2 = 25;
        const pts1 = `${c1},15 770,15 785,${c1} 785,570 770,585 ${c1},585 15,570 15,${c1}`;
        const pts2 = `${c1 + 8},25 762,25 775,${c1 + 8} 775,562 762,575 ${c1 + 8},575 25,562 25,${c1 + 8}`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <polygon points="${pts1}" fill="none" stroke="#000" stroke-width="3.5"/>
  <polygon points="${pts2}" fill="none" stroke="#000" stroke-width="1.2"/>
</svg>`;
      })(),
    },
    // 12. Moldura Polaroide (Classic instant photo frame with white border and bottom chin)
    {
      id: 'casa-moldura-polaroide',
      name: 'Moldura · foto instantânea polaroide',
      category: 'Molduras',
      tags: ['moldura', 'polaroide', 'foto', 'instantânea', 'borda branca'],
      width: 500,
      height: 600,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="500" height="600">
  <!-- Drop shadow -->
  <rect x="18" y="18" width="464" height="564" rx="2" fill="rgba(0,0,0,0.22)"/>
  <!-- Polaroid white/cream card body -->
  <rect x="15" y="15" width="464" height="564" rx="2" fill="#faf9f5" stroke="#dedcd2" stroke-width="1"/>
  <!-- Photo aperture / window inner cutout with subtle inner shadow -->
  <rect x="42" y="42" width="410" height="410" fill="#1b1c20"/>
  <rect x="42" y="42" width="410" height="410" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>
  <!-- Bottom chin area: Y=452 to 579 is the classic blank writing area -->
</svg>`,
    },
    // 13. Moldura Foto antiga com borda serrilhada (Deckled / scalloped edge vintage photo)
    {
      id: 'casa-moldura-foto-antiga-serrilhada',
      name: 'Moldura · foto antiga borda serrilhada',
      category: 'Molduras',
      tags: ['moldura', 'foto', 'antiga', 'serrilhada', 'postal', 'vintage'],
      width: 600,
      height: 460,
      svg: (() => {
        // Scalloped / deckled postage stamp edge
        const w = 560;
        const h = 420;
        const ox = 20;
        const oy = 20;
        const step = 14;
        let d = `M ${ox} ${oy}`;

        // Top edge with small serrated scallops
        for (let x = ox; x < ox + w; x += step) {
          d += ` Q ${x + step / 2} ${oy + 2.5} ${Math.min(ox + w, x + step)} ${oy}`;
        }
        // Right edge
        for (let y = oy; y < oy + h; y += step) {
          d += ` Q ${ox + w - 2.5} ${y + step / 2} ${ox + w} ${Math.min(oy + h, y + step)}`;
        }
        // Bottom edge
        for (let x = ox + w; x > ox; x -= step) {
          d += ` Q ${x - step / 2} ${oy + h - 2.5} ${Math.max(ox, x - step)} ${oy + h}`;
        }
        // Left edge
        for (let y = oy + h; y > oy; y -= step) {
          d += ` Q ${ox + 2.5} ${y - step / 2} ${ox} ${Math.max(oy, y - step)}`;
        }
        d += ' Z';

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 460" width="600" height="460">
  <!-- Shadow -->
  <path d="${d}" fill="rgba(0,0,0,0.18)" transform="translate(3, 4)"/>
  <!-- Deckled photo base -->
  <path d="${d}" fill="#f5f0e1" stroke="#cfc5ad" stroke-width="1"/>
  <!-- Inner vintage photo window -->
  <rect x="52" y="52" width="496" height="356" fill="#201e1b" stroke="#756b5c" stroke-width="1"/>
</svg>`;
      })(),
    },
  ];

  return list;
}

