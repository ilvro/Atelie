/**
 * Initial defaults for blend mode, opacity, tint, and positioning
 * when placing library items onto the handout stage.
 */

export function defaultsFor(item, { defaultInkColor = null } = {}) {
  const cat = (item?.category || '').toLowerCase();
  const name = (item?.name || '').toUpperCase();
  const id = (item?.id || '').toLowerCase();

  // 1. Manchas, Água, Sujeira, Queimado, Digitais, Sangue, ou mancha, sujeira, café, queimad, sangue, poeira
  if (
    cat === 'manchas' ||
    cat === 'água' ||
    cat === 'agua' ||
    cat === 'sujeira' ||
    cat === 'queimado' ||
    cat === 'digitais' ||
    cat === 'sangue' ||
    cat.includes('mancha') ||
    cat.includes('sujeira') ||
    cat.includes('café') ||
    cat.includes('cafe') ||
    cat.includes('queimad') ||
    cat.includes('sangue') ||
    cat.includes('poeira')
  ) {
    return {
      blend: 'multiply',
      cover: false,
      position: 'top',
    };
  }

  // 2. Amassados, Dobras, ou palavras amassad, dobrad, textura
  if (
    cat === 'amassados' ||
    cat === 'dobras' ||
    cat.includes('amassad') ||
    cat.includes('dobrad') ||
    cat.includes('textura')
  ) {
    return {
      blend: 'soft-light',
      cover: true,
      position: 'top',
    };
  }

  // 3. Papéis
  if (cat === 'papéis' || cat === 'papeis' || cat.includes('papel') || cat.includes('papeis')) {
    return {
      blend: 'normal',
      cover: true,
      position: 'bottom',
    };
  }

  // 4. Carimbos, Selos, Marcas, Ornamentos, Símbolos (monocromáticos)
  if (
    cat === 'carimbos' ||
    cat === 'selos' ||
    cat === 'marcas' ||
    cat === 'ornamentos' ||
    cat === 'símbolos' ||
    cat === 'simbolos' ||
    cat.includes('carimbo') ||
    cat.includes('selo') ||
    cat.includes('marca') ||
    cat.includes('ornamento') ||
    cat.includes('símbolo') ||
    cat.includes('simbolo')
  ) {
    let tintColor = defaultInkColor;
    if (!tintColor) {
      if (
        name.includes('NEGADO') ||
        name.includes('URGENTE') ||
        name.includes('CANCELADO') ||
        id.includes('negado') ||
        id.includes('urgente') ||
        id.includes('cancelado')
      ) {
        tintColor = '#a3202a';
      } else if (cat === 'carimbos' || cat.includes('carimbo')) {
        tintColor = '#1f2f6b';
      } else {
        tintColor = '#000000';
      }
    }

    return {
      blend: 'multiply',
      opacity: 0.9,
      tint: {
        color: tintColor,
        mode: 'multiply',
      },
      cover: false,
      position: 'top',
    };
  }

  // 5. Rasgos
  if (cat === 'rasgos' || cat.includes('rasgo')) {
    return {
      blend: 'normal',
      clip: false,
      note: 'Use recortando o papel nas propriedades da camada.',
      cover: false,
      position: 'top',
    };
  }

  // 6. O resto
  return {
    blend: 'normal',
    cover: false,
    position: 'top',
  };
}
