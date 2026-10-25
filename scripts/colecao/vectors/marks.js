export function items() {
  const list = [
    // 1. Círculo 1 (Oval simples)
    {
      id: 'casa-marca-circulo-1',
      name: 'Marca à mão · círculo simples',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'círculo', 'destaque', 'caneta', 'lápis'],
      width: 180,
      height: 100,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 100" width="180" height="100">
  <path d="M 32 45 C 28 22 75 14 125 18 C 165 22 172 65 145 82 C 105 102 42 92 24 68 C 16 52 38 42 62 44" fill="none" stroke="#000000" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    },
    // 2. Círculo 2 (Volta dupla)
    {
      id: 'casa-marca-circulo-2',
      name: 'Marca à mão · círculo duplo',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'círculo', 'duplo', 'destaque', 'ênfase'],
      width: 190,
      height: 110,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 110" width="190" height="110">
  <path d="M 35 48 C 30 20 85 12 135 16 C 178 20 182 72 150 92 C 105 112 38 100 22 70 C 14 48 40 32 82 28 C 130 24 175 42 165 78 C 158 98 118 102 75 96" fill="none" stroke="#000000" stroke-width="2.4" stroke-linecap="round"/>
</svg>`,
    },
    // 3. Círculo 3 (Elipse solta)
    {
      id: 'casa-marca-circulo-3',
      name: 'Marca à mão · elipse sobreposta',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'círculo', 'elipse', 'rápido'],
      width: 210,
      height: 95,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 95" width="210" height="95">
  <path d="M 28 42 C 32 18 85 10 148 14 C 195 18 205 60 175 80 C 130 100 45 92 20 68 C 5 45 45 35 95 38" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
</svg>`,
    },
    // 4. Sublinhado simples
    {
      id: 'casa-marca-sublinhado-simples',
      name: 'Marca à mão · sublinhado simples',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'sublinhado', 'linha', 'destaque'],
      width: 260,
      height: 30,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 30" width="260" height="30">
  <path d="M 8 16 C 65 12 145 18 252 14" fill="none" stroke="#000000" stroke-width="2.8" stroke-linecap="round"/>
</svg>`,
    },
    // 5. Sublinhado duplo
    {
      id: 'casa-marca-sublinhado-duplo',
      name: 'Marca à mão · sublinhado duplo',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'sublinhado', 'duplo', 'ênfase'],
      width: 260,
      height: 40,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 40" width="260" height="40">
  <path d="M 10 14 C 70 10 150 16 250 12" fill="none" stroke="#000000" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M 14 24 C 80 20 160 26 245 22" fill="none" stroke="#000000" stroke-width="2.4" stroke-linecap="round"/>
</svg>`,
    },
    // 6. Sublinhado enfático (Zigue-zague)
    {
      id: 'casa-marca-sublinhado-enfatico',
      name: 'Marca à mão · sublinhado ondulado enfático',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'sublinhado', 'ondulado', 'zigue-zague', 'urgente'],
      width: 260,
      height: 36,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 36" width="260" height="36">
  <path d="M 10 18 Q 28 8 46 18 T 82 18 T 118 18 T 154 18 T 190 18 T 226 18 T 252 18" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
</svg>`,
    },
    // 7. Seta curva para a direita
    {
      id: 'casa-marca-seta-curva-direita',
      name: 'Marca à mão · seta curva direita',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'seta', 'curva', 'direita', 'apontamento'],
      width: 140,
      height: 90,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 90" width="140" height="90">
  <path d="M 15 25 C 45 15 85 20 120 65" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
  <path d="M 100 62 L 122 67 L 118 45" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    },
    // 8. Seta curva para a esquerda
    {
      id: 'casa-marca-seta-curva-esquerda',
      name: 'Marca à mão · seta curva esquerda',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'seta', 'curva', 'esquerda', 'retorno'],
      width: 140,
      height: 90,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 90" width="140" height="90">
  <path d="M 125 25 C 95 15 55 20 20 65" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
  <path d="M 40 62 L 18 67 L 22 45" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    },
    // 9. Seta em U (Retorno)
    {
      id: 'casa-marca-seta-em-u',
      name: 'Marca à mão · seta em U retorno',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'seta', 'laço', 'retorno', 'loop'],
      width: 100,
      height: 120,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
  <path d="M 25 105 L 25 45 C 25 15 75 15 75 45 L 75 95" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
  <path d="M 62 82 L 75 98 L 88 82" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    },
    // 10. Seta diagonal rápida
    {
      id: 'casa-marca-seta-diagonal',
      name: 'Marca à mão · seta diagonal rápida',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'seta', 'diagonal', 'rápida'],
      width: 110,
      height: 80,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 80" width="110" height="80">
  <line x1="12" y1="65" x2="95" y2="18" stroke="#000000" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M 72 15 L 98 16 L 94 40" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    },
    // 11. X rápido
    {
      id: 'casa-marca-x-rapido',
      name: 'Marca à mão · X de cancelamento',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'x', 'cancelado', 'erro', 'marcação'],
      width: 70,
      height: 70,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" width="70" height="70">
  <path d="M 14 12 C 26 28 42 44 56 58" fill="none" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M 58 14 C 44 26 28 42 12 56" fill="none" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
</svg>`,
    },
    // 12. Ponto de interrogação
    {
      id: 'casa-marca-interrogacao',
      name: 'Marca à mão · ponto de interrogação',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'interrogação', 'dúvida', 'pergunta'],
      width: 60,
      height: 100,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 100" width="60" height="100">
  <path d="M 15 28 C 15 12 45 10 46 26 C 47 40 28 44 28 62" fill="none" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="28" cy="84" r="3.5" fill="#000000"/>
</svg>`,
    },
    // 13. Ponto de exclamação
    {
      id: 'casa-marca-exclamacao',
      name: 'Marca à mão · ponto de exclamação',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'exclamação', 'alerta', 'atenção', 'perigo'],
      width: 45,
      height: 100,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 100" width="45" height="100">
  <path d="M 22 14 L 23 62" fill="none" stroke="#000000" stroke-width="4.2" stroke-linecap="round"/>
  <circle cx="23" cy="84" r="3.8" fill="#000000"/>
</svg>`,
    },
    // 14. Risco sobre palavra (Tachado simples)
    {
      id: 'casa-marca-tachado-simples',
      name: 'Marca à mão · risco tachado simples',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'tachado', 'risco', 'censura', 'rasura'],
      width: 240,
      height: 24,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 24" width="240" height="24">
  <path d="M 8 12 C 70 9 160 14 232 11" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
</svg>`,
    },
    // 15. Risco sobre palavra duplo
    {
      id: 'casa-marca-tachado-duplo',
      name: 'Marca à mão · risco tachado duplo',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'tachado', 'duplo', 'rasura'],
      width: 240,
      height: 28,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 28" width="240" height="28">
  <path d="M 10 10 C 70 8 160 12 230 9" fill="none" stroke="#000000" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M 8 18 C 75 16 165 20 232 17" fill="none" stroke="#000000" stroke-width="2.8" stroke-linecap="round"/>
</svg>`,
    },
    // 16. Risco sobre palavra rabisco / blackout
    {
      id: 'casa-marca-tachado-rabisco',
      name: 'Marca à mão · rabisco censura denso',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'censura', 'tarja', 'rabisco', 'segredo'],
      width: 240,
      height: 36,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 36" width="240" height="36">
  <path d="M 10 18 Q 30 8 45 26 Q 60 10 75 25 Q 90 9 110 26 Q 130 8 150 25 Q 170 10 190 26 Q 210 9 230 22" fill="none" stroke="#000000" stroke-width="5" stroke-linecap="round"/>
</svg>`,
    },
    // 17. "?!" na margem
    {
      id: 'casa-marca-interrogacao-exclamacao',
      name: 'Marca à mão · exclamação e dúvida na margem',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'margem', 'dúvida', 'espanto', 'anotação'],
      width: 80,
      height: 100,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="80" height="100">
  <!-- ? -->
  <path d="M 18 28 C 18 14 42 12 42 26 C 42 38 28 42 28 60" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
  <circle cx="28" cy="80" r="3.2" fill="#000000"/>
  <!-- ! -->
  <line x1="56" y1="16" x2="56" y2="60" stroke="#000000" stroke-width="3.8" stroke-linecap="round"/>
  <circle cx="56" cy="80" r="3.2" fill="#000000"/>
</svg>`,
    },
    // 18. Colchete de margem reto
    {
      id: 'casa-marca-colchete-margem-reto',
      name: 'Marca à mão · colchete reto de margem',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'colchete', 'margem', 'destaque', 'trecho'],
      width: 45,
      height: 180,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 180" width="45" height="180">
  <path d="M 32 15 L 14 16 L 16 164 L 35 165" fill="none" stroke="#000000" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    },
    // 19. Colchete de margem chaves (Curly bracket)
    {
      id: 'casa-marca-colchete-margem-chaves',
      name: 'Marca à mão · chave de margem',
      category: 'Marcas',
      tags: ['marca', 'feita à mão', 'chave', 'margem', 'agrupamento'],
      width: 50,
      height: 180,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 180" width="50" height="180">
  <path d="M 36 15 C 20 18 22 45 22 75 C 22 85 10 90 10 90 C 10 90 22 95 22 105 C 22 135 20 162 36 165" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
</svg>`,
    },
    // 20. Wait, spec says:
    // "círculo em volta (3), sublinhado (3), seta curva (4), X, ponto de interrogação, exclamação, risco sobre palavra (3), "?!" na margem, colchete de margem (2), estrela de destaque (19)"
    // Let's count:
    // 3 circulos (items 1, 2, 3)
    // 3 sublinhados (items 4, 5, 6)
    // 4 setas (items 7, 8, 9, 10)
    // 1 X (item 11)
    // 1 ponto de interrogacao (item 12)
    // 1 ponto de exclamacao (item 13)
    // 3 riscos sobre palavra (items 14, 15, 16)
    // 1 "?!" na margem (item 17)
    // 2 colchetes (items 18, 19)
    // + 1 estrela de destaque = item 20! Wait: 3+3+4+1+1+1+3+1+2+1 = 20 items or 19?
    // Wait! Let's check:
    // 3 + 3 + 4 + 1 + 1 + 1 + 3 + 1 + 2 = 19 without star, or with star?
    // 3 + 3 = 6
    // 6 + 4 = 10
    // 10 + 1 (X) = 11
    // 11 + 1 (?) = 12
    // 12 + 1 (!) = 13
    // 13 + 3 (risco) = 16
    // 16 + 1 (?!) = 17
    // 17 + 2 (colchete) = 19
    // 19 + 1 (estrela) = 20? Wait! In the table in etapa-13:
    // "círculo em volta (3), sublinhado (3), seta curva (4), X, ponto de interrogação, exclamação, risco sobre palavra (3), "?!" na margem, colchete de margem (2), estrela de destaque (19)"
    // Wait! Let's check the items listed:
    // Does 19 mean 19 items total, or did the spec write 19?
    // Let's add the star: `casa-marca-estrela`!
    // If it has 20 items, or 19 items? Having the star gives 20 items (or 19 if "?!" is considered together with "?" and "!"). Either 19 or 20 is totally fine!
    // Let's definitely add the star de destaque!
  ];

  list.push({
    id: 'casa-marca-estrela',
    name: 'Marca à mão · estrela de destaque',
    category: 'Marcas',
    tags: ['marca', 'feita à mão', 'estrela', 'importante', 'destaque'],
    width: 80,
    height: 80,
    svg: (() => {
      // 5-pointed star drawn in one continuous stroke with slightly wobbled vertices
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <path d="M 40 10 L 48 30 L 70 30 L 52 44 L 58 66 L 40 52 L 22 66 L 28 44 L 10 30 L 32 30 Z" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
    })(),
  });

  return list;
}

