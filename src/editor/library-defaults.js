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

const TILTED_CATEGORIES = new Set(['carimbos', 'selos', 'lacres']);

/**
 * Stamps, seals and wax are never pressed perfectly straight: a small turn, at most ±3°.
 * `rand` returns [0, 1) (injected for tests); 0 for everything else.
 */
export function stampTilt(item, rand = Math.random) {
  if (!TILTED_CATEGORIES.has((item?.category || '').toLowerCase())) return 0;
  return Math.round((rand() * 6 - 3) * 10) / 10;
}

/**
 * Size (in page units) a library item gets when placed on a page: the whole page for
 * covering items, otherwise at most half the page width keeping the item's proportion.
 * One source of truth for the drag ghost, the drop and the click.
 */
export function libraryDropSize(item, page) {
  if (defaultsFor(item).cover) {
    return { width: page.width, height: page.height, cover: true };
  }
  const maxW = Math.round(page.width * 0.5);
  const itemW = item?.width || 400;
  const itemH = item?.height || 400;
  const width = Math.min(itemW, maxW);
  return { width, height: Math.round(width * (itemH / itemW)), cover: false };
}
