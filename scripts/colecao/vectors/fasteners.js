export function items() {
  const list = [
    // 1. Clipe prateado 1 (reto)
    {
      id: 'casa-prendedor-clipe-prata-1',
      name: 'Prendedor · clipe prateado (vertical)',
      category: 'Prendedores',
      tags: ['clipe', 'metal', 'prata', 'papel'],
      width: 60,
      height: 180,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 180" width="60" height="180">
  <!-- Soft drop shadow -->
  <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="6" stroke-linecap="round" transform="translate(3, 4)"/>
  <!-- Silver paperclip body -->
  <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="#7e8590" stroke-width="5.5" stroke-linecap="round"/>
  <!-- Chrome highlight -->
  <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="#e6edf8" stroke-width="2" stroke-linecap="round" transform="translate(-0.8, -0.8)"/>
</svg>`,
    },
    // 2. Clipe prateado 2 (inclinado 15°)
    {
      id: 'casa-prendedor-clipe-prata-2',
      name: 'Prendedor · clipe prateado (inclinado)',
      category: 'Prendedores',
      tags: ['clipe', 'metal', 'prata', 'inclinado'],
      width: 100,
      height: 180,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 180" width="100" height="180">
  <g transform="translate(50, 90) rotate(15) translate(-30, -90)">
    <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="6" stroke-linecap="round" transform="translate(3, 4)"/>
    <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="#7e8590" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="#e6edf8" stroke-width="2" stroke-linecap="round" transform="translate(-0.8, -0.8)"/>
  </g>
</svg>`,
    },
    // 3. Clipe prateado 3 (inclinado -20°)
    {
      id: 'casa-prendedor-clipe-prata-3',
      name: 'Prendedor · clipe prateado (diagonal)',
      category: 'Prendedores',
      tags: ['clipe', 'metal', 'prata', 'diagonal'],
      width: 110,
      height: 180,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 180" width="110" height="180">
  <g transform="translate(55, 90) rotate(-20) translate(-30, -90)">
    <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="6" stroke-linecap="round" transform="translate(3, 4)"/>
    <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="#7e8590" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="#e6edf8" stroke-width="2" stroke-linecap="round" transform="translate(-0.8, -0.8)"/>
  </g>
</svg>`,
    },
    // 4. Clipe dourado
    {
      id: 'casa-prendedor-clipe-ouro',
      name: 'Prendedor · clipe dourado',
      category: 'Prendedores',
      tags: ['clipe', 'metal', 'dourado', 'ouro'],
      width: 60,
      height: 180,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 180" width="60" height="180">
  <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="6" stroke-linecap="round" transform="translate(3, 4)"/>
  <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="#b88924" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M 18 165 L 18 40 C 18 20 44 20 44 40 L 44 140 C 44 154 26 154 26 140 L 26 65 C 26 56 36 56 36 65 L 36 125" fill="none" stroke="#ffeb99" stroke-width="2" stroke-linecap="round" transform="translate(-0.8, -0.8)"/>
</svg>`,
    },
    // 5. Clipe de pressão preto (binder clip)
    {
      id: 'casa-prendedor-clipe-pressao',
      name: 'Prendedor · clipe de pressão',
      category: 'Prendedores',
      tags: ['clipe', 'pressão', 'binder', 'preto', 'metal'],
      width: 140,
      height: 160,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 160" width="140" height="160">
  <!-- Wire handles -->
  <path d="M 45 90 L 52 25 C 52 14 88 14 88 25 L 95 90" fill="none" stroke="#222" stroke-width="5" stroke-linecap="round" transform="translate(2, 3)"/>
  <path d="M 45 90 L 52 25 C 52 14 88 14 88 25 L 95 90" fill="none" stroke="#9da6b3" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 45 90 L 52 25 C 52 14 88 14 88 25 L 95 90" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" transform="translate(-0.6, -0.6)"/>
  <!-- Main black clamp body -->
  <polygon points="20,140 120,140 108,90 32,90" fill="#151515" stroke="#333" stroke-width="1"/>
  <rect x="26" y="88" width="88" height="8" rx="2" fill="#2a2a2a"/>
</svg>`,
    },
    // 6. Grampo simples
    {
      id: 'casa-prendedor-grampo',
      name: 'Prendedor · grampo simples',
      category: 'Prendedores',
      tags: ['grampo', 'metal', 'grampeador'],
      width: 90,
      height: 40,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 40" width="90" height="40">
  <!-- Puncture holes -->
  <ellipse cx="14" cy="20" rx="3" ry="2" fill="#222" opacity="0.6"/>
  <ellipse cx="76" cy="20" rx="3" ry="2" fill="#222" opacity="0.6"/>
  <!-- Staple bar -->
  <line x1="14" y1="20" x2="76" y2="20" stroke="#111" stroke-width="5" opacity="0.3" transform="translate(1, 2)"/>
  <line x1="14" y1="20" x2="76" y2="20" stroke="#686e77" stroke-width="4" stroke-linecap="square"/>
  <line x1="14" y1="19" x2="76" y2="19" stroke="#d5dde8" stroke-width="1.4" stroke-linecap="square"/>
</svg>`,
    },
    // 7. Dois grampos
    {
      id: 'casa-prendedor-dois-grampos',
      name: 'Prendedor · dois grampos',
      category: 'Prendedores',
      tags: ['grampos', 'duplo', 'metal', 'grampeador'],
      width: 100,
      height: 80,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="100" height="80">
  <!-- First staple -->
  <g transform="translate(0, 0)">
    <ellipse cx="18" cy="24" rx="3" ry="2" fill="#222" opacity="0.6"/>
    <ellipse cx="80" cy="24" rx="3" ry="2" fill="#222" opacity="0.6"/>
    <line x1="18" y1="24" x2="80" y2="24" stroke="#686e77" stroke-width="4" stroke-linecap="square"/>
    <line x1="18" y1="23" x2="80" y2="23" stroke="#d5dde8" stroke-width="1.4" stroke-linecap="square"/>
  </g>
  <!-- Second staple slightly rotated -->
  <g transform="translate(5, 32) rotate(4, 50, 24)">
    <ellipse cx="18" cy="24" rx="3" ry="2" fill="#222" opacity="0.6"/>
    <ellipse cx="80" cy="24" rx="3" ry="2" fill="#222" opacity="0.6"/>
    <line x1="18" y1="24" x2="80" y2="24" stroke="#686e77" stroke-width="4" stroke-linecap="square"/>
    <line x1="18" y1="23" x2="80" y2="23" stroke="#d5dde8" stroke-width="1.4" stroke-linecap="square"/>
  </g>
</svg>`,
    },
    // 8. Alfinete de cabeça vermelha
    {
      id: 'casa-prendedor-alfinete-vermelho',
      name: 'Prendedor · alfinete vermelho',
      category: 'Prendedores',
      tags: ['alfinete', 'vermelho', 'mural', 'mapa'],
      width: 80,
      height: 120,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 120" width="80" height="120">
  <!-- Metal pin needle -->
  <line x1="40" y1="50" x2="40" y2="110" stroke="#7c848f" stroke-width="3" stroke-linecap="round"/>
  <line x1="39.2" y1="50" x2="39.2" y2="108" stroke="#ffffff" stroke-width="1" stroke-linecap="round"/>
  <!-- Red spherical head with highlight -->
  <circle cx="40" cy="40" r="24" fill="#a81515"/>
  <circle cx="34" cy="32" r="8" fill="#e85858" opacity="0.75"/>
  <circle cx="32" cy="30" r="3" fill="#ffffff" opacity="0.9"/>
</svg>`,
    },
    // 9. Tacha de quadro metálica
    {
      id: 'casa-prendedor-tacha',
      name: 'Prendedor · tacha de quadro',
      category: 'Prendedores',
      tags: ['tacha', 'percevejo', 'latão', 'metal', 'quadro'],
      width: 70,
      height: 70,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" width="70" height="70">
  <!-- Shadow -->
  <circle cx="38" cy="40" r="26" fill="rgba(0,0,0,0.3)"/>
  <!-- Brass head -->
  <circle cx="35" cy="35" r="26" fill="#bfa044" stroke="#876d23" stroke-width="1.5"/>
  <circle cx="32" cy="31" r="18" fill="#dfc058" opacity="0.8"/>
  <circle cx="30" cy="28" r="7" fill="#fff5b0" opacity="0.9"/>
</svg>`,
    },
    // 10. Prendedor de madeira
    {
      id: 'casa-prendedor-madeira',
      name: 'Prendedor · prendedor de madeira',
      category: 'Prendedores',
      tags: ['prendedor', 'madeira', 'retrô', 'varal'],
      width: 60,
      height: 180,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 180" width="60" height="180">
  <!-- Wooden body -->
  <path d="M 16 10 L 44 10 L 40 75 L 42 165 L 34 172 L 26 172 L 18 165 L 20 75 Z" fill="#bfa27a" stroke="#8c704b" stroke-width="1.5"/>
  <!-- Center metal coil spring -->
  <rect x="15" y="72" width="30" height="14" rx="3" fill="#4d535e" stroke="#222" stroke-width="1"/>
  <circle cx="30" cy="79" r="4" fill="#a4afbf"/>
</svg>`,
    },
  ];

  return list;
}

