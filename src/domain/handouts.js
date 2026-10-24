import { ValidationError } from './errors.js';

export const HANDOUT_LIMITS = {
  layers: 200,
  fields: 60,
  text: 5000,
  name: 120,
  category: 60,
  tag: 40,
  tags: 20,
  size: [64, 4096],
  box: 8192,
};

export const BLEND_MODES = [
  ['normal', 'Normal', 'source-over'],
  ['multiply', 'Multiplicação', 'multiply'],
  ['screen', 'Divisão de tela', 'screen'],
  ['overlay', 'Sobrepor', 'overlay'],
  ['soft-light', 'Luz suave', 'soft-light'],
  ['hard-light', 'Luz direta', 'hard-light'],
  ['darken', 'Escurecer', 'darken'],
  ['lighten', 'Clarear', 'lighten'],
  ['color-dodge', 'Subexposição de cor', 'color-dodge'],
  ['color-burn', 'Superexposição de cor', 'color-burn'],
  ['difference', 'Diferença', 'difference'],
  ['exclusion', 'Exclusão', 'exclusion'],
  ['hue', 'Matiz', 'hue'],
  ['saturation', 'Saturação', 'saturation'],
  ['color', 'Cor', 'color'],
  ['luminosity', 'Luminosidade', 'luminosity'],
  ['linear-dodge', 'Subexposição linear', 'lighter'],
  ['linear-burn', 'Superexposição linear', 'multiply'],
  ['lighter-color', 'Cor mais clara', 'lighten'],
  ['darker-color', 'Cor mais escura', 'darken'],
];

export const canvasOperation = blend => BLEND_MODES.find(([id]) => id === blend)?.[2] ?? 'source-over';

export const PAGE_PRESETS = [
  ['a4', 'A4 · retrato', 1240, 1754],
  ['a4-landscape', 'A4 · paisagem', 1754, 1240],
  ['letter', 'Carta', 1275, 1650],
  ['clipping', 'Recorte de jornal', 1200, 700],
  ['polaroid', 'Polaroide', 880, 1070],
  ['telegram', 'Telegrama', 1240, 880],
  ['card', 'Cartão', 1050, 600],
  ['note', 'Bilhete', 900, 700],
  ['square', 'Quadrado', 1200, 1200],
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LAYER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const HEX_COLOR_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function randomId(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

function baseLayer(kind, name, patch = {}) {
  return {
    id: 'l-' + randomId(8),
    name,
    kind,
    visible: true,
    locked: false,
    opacity: 1,
    blend: 'normal',
    x: 0,
    y: 0,
    width: 1240,
    height: 1754,
    rotation: 0,
    clip: false,
    light: 'both',
    ...patch,
  };
}

export function imageLayer(patch = {}) {
  const { image: imagePatch, ...layerPatch } = patch;
  return {
    ...baseLayer('image', 'Papel', layerPatch),
    image: {
      src: null,
      fit: 'stretch',
      crop: null,
      flipX: false,
      flipY: false,
      filter: {
        grayscale: 0,
        sepia: 0,
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        blur: 0,
        invert: false,
      },
      tint: null,
      ...imagePatch,
    },
  };
}

export function textLayer(patch = {}) {
  const { text: textPatch, ...layerPatch } = patch;
  return {
    ...baseLayer('text', 'Texto', { width: 600, height: 120, ...layerPatch }),
    text: {
      content: 'Texto editável',
      font: {
        family: 'IM Fell English',
        library: null,
        weight: 400,
        italic: false,
      },
      size: 46,
      color: '#1d1b24',
      align: 'left',
      valign: 'top',
      lineHeight: 1.25,
      letterSpacing: 0,
      box: 'area',
      fit: 'overflow',
      ink: {
        style: 'clean',
        wear: 0,
        seed: 1,
      },
      ...textPatch,
    },
  };
}

export function shapeLayer(patch = {}) {
  const { shape: shapePatch, ...layerPatch } = patch;
  return {
    ...baseLayer('shape', 'Forma', layerPatch),
    shape: {
      type: 'rect',
      fill: '#ffffff',
      stroke: null,
      strokeWidth: 2,
      radius: 0,
      dash: [],
      ...shapePatch,
    },
  };
}

export function adjustLayer(patch = {}) {
  const { adjust: adjustPatch, ...layerPatch } = patch;
  return {
    ...baseLayer('adjust', 'Ajuste de Cor', layerPatch),
    adjust: {
      grayscale: 0,
      sepia: 0,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      invert: false,
      curve: null,
      ...adjustPatch,
    },
  };
}

export function effectLayer(patch = {}) {
  const { effect: effectPatch, ...layerPatch } = patch;
  return {
    ...baseLayer('effect', 'Efeito', layerPatch),
    effect: {
      type: 'crumple',
      seed: 1,
      amount: 0.5,
      params: {},
      ...effectPatch,
    },
  };
}

export function createHandout({
  name = 'Documento sem nome',
  preset = 'a4',
  id = crypto.randomUUID(),
} = {}) {
  const presetEntry = PAGE_PRESETS.find(([p]) => p === preset) ?? PAGE_PRESETS[0];
  const [, , width, height] = presetEntry;

  const paper = shapeLayer({
    name: 'Papel',
    width,
    height,
    shape: {
      type: 'rect',
      fill: '#ffffff',
      stroke: null,
      strokeWidth: 0,
      radius: 0,
      dash: [],
    },
  });

  return {
    schema: 1,
    id,
    revision: 0,
    name,
    category: '',
    tags: [],
    folder: null,
    favorite: false,
    page: {
      width,
      height,
      background: '#00000000',
    },
    layers: [paper],
    fields: [],
    source: { kind: 'blank' },
    back: null,
  };
}

export function layerAt(handout, layerId) {
  return handout.layers.find(l => l.id === layerId) ?? null;
}

export function addLayer(handout, layer, index = handout.layers.length) {
  const cloned = structuredClone(handout);
  const targetIdx = Math.max(0, Math.min(cloned.layers.length, index));
  cloned.layers.splice(targetIdx, 0, structuredClone(layer));
  return cloned;
}

export function updateLayer(handout, layerId, patch) {
  const cloned = structuredClone(handout);
  const idx = cloned.layers.findIndex(l => l.id === layerId);
  if (idx < 0) return cloned;

  const current = cloned.layers[idx];
  const { [current.kind]: kindPatch, ...topLevelPatch } = patch;

  const updated = {
    ...current,
    ...topLevelPatch,
  };

  if (kindPatch && typeof kindPatch === 'object' && current[current.kind]) {
    updated[current.kind] = {
      ...current[current.kind],
      ...kindPatch,
    };
  }

  cloned.layers[idx] = updated;
  return cloned;
}

export function removeLayer(handout, layerId) {
  const cloned = structuredClone(handout);
  cloned.layers = cloned.layers.filter(l => l.id !== layerId);
  cloned.fields = cloned.fields.filter(f => f.layerId !== layerId);
  return cloned;
}

export function moveLayer(handout, layerId, toIndex) {
  const cloned = structuredClone(handout);
  const fromIndex = cloned.layers.findIndex(l => l.id === layerId);
  if (fromIndex < 0) return cloned;

  const [removed] = cloned.layers.splice(fromIndex, 1);
  const targetIdx = Math.max(0, Math.min(cloned.layers.length, toIndex));
  cloned.layers.splice(targetIdx, 0, removed);
  return cloned;
}

export function duplicateLayer(handout, layerId) {
  const cloned = structuredClone(handout);
  const idx = cloned.layers.findIndex(l => l.id === layerId);
  if (idx < 0) return cloned;

  const original = cloned.layers[idx];
  const copy = structuredClone(original);
  copy.id = 'l-' + randomId(8);
  copy.name = `${original.name} — cópia`;

  cloned.layers.splice(idx + 1, 0, copy);
  return cloned;
}

export function setField(handout, layerId, label) {
  const cloned = structuredClone(handout);
  if (label === null || label === undefined || label === '') {
    cloned.fields = cloned.fields.filter(f => f.layerId !== layerId);
    return cloned;
  }

  const existingIdx = cloned.fields.findIndex(f => f.layerId === layerId);
  if (existingIdx >= 0) {
    cloned.fields[existingIdx].label = String(label);
  } else if (cloned.fields.length < HANDOUT_LIMITS.fields) {
    cloned.fields.push({ layerId, label: String(label) });
  }
  return cloned;
}

export function fillFields(handout, values = {}) {
  const cloned = structuredClone(handout);
  for (const [layerId, value] of Object.entries(values)) {
    const layer = cloned.layers.find(l => l.id === layerId);
    if (!layer) continue;

    if (layer.kind === 'text' && layer.text) {
      layer.text.content = String(value ?? '');
    } else if (layer.kind === 'image' && layer.image) {
      layer.image.src = value;
    }
  }
  return cloned;
}

export function libraryRefs(handout) {
  const refs = new Set();
  for (const layer of handout.layers) {
    if (layer.kind === 'image' && layer.image?.src?.library) {
      refs.add(layer.image.src.library);
    }
    if (layer.kind === 'text' && layer.text?.font?.library) {
      refs.add(layer.text.font.library);
    }
  }
  return Array.from(refs);
}

function fail(path, message) {
  throw new ValidationError(message, path);
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function validateHandout(value) {
  if (!isPlainObject(value)) fail('', 'Documento deve ser um objeto JSON.');

  if (value.schema !== 1) fail('schema', 'Schema deve ser 1.');
  if (typeof value.id !== 'string' || !UUID_RE.test(value.id)) fail('id', 'ID inválido (esperado UUID).');
  if (!Number.isInteger(value.revision) || value.revision < 0) fail('revision', 'Revisão deve ser um inteiro positivo ou zero.');

  if (typeof value.name !== 'string' || value.name.trim().length === 0 || value.name.length > HANDOUT_LIMITS.name) {
    fail('name', `Nome deve ter entre 1 e ${HANDOUT_LIMITS.name} caracteres.`);
  }

  if (typeof value.category !== 'string' || value.category.length > HANDOUT_LIMITS.category) {
    fail('category', `Categoria deve ter até ${HANDOUT_LIMITS.category} caracteres.`);
  }

  if (!Array.isArray(value.tags) || value.tags.length > HANDOUT_LIMITS.tags) {
    fail('tags', `Tags deve ser uma lista com até ${HANDOUT_LIMITS.tags} itens.`);
  }
  value.tags.forEach((tag, i) => {
    if (typeof tag !== 'string' || tag.length > HANDOUT_LIMITS.tag) {
      fail(`tags[${i}]`, `Cada tag deve ter até ${HANDOUT_LIMITS.tag} caracteres.`);
    }
  });

  if (value.folder !== undefined && value.folder !== null) {
    if (typeof value.folder !== 'string' || value.folder.length > 80) {
      fail('folder', 'Pasta deve ser null ou ID com até 80 caracteres.');
    }
  }

  if (value.favorite !== undefined) {
    if (typeof value.favorite !== 'boolean') {
      fail('favorite', 'Favorito deve ser booleano.');
    }
  }

  if (!isPlainObject(value.page)) fail('page', 'Página inválida.');
  const [minSize, maxSize] = HANDOUT_LIMITS.size;
  if (!Number.isFinite(value.page.width) || value.page.width < minSize || value.page.width > maxSize) {
    fail('page.width', `Dimensão fora dos limites (${minSize} a ${maxSize} px).`);
  }
  if (!Number.isFinite(value.page.height) || value.page.height < minSize || value.page.height > maxSize) {
    fail('page.height', `Dimensão fora dos limites (${minSize} a ${maxSize} px).`);
  }
  if (typeof value.page.background !== 'string' || !HEX_COLOR_RE.test(value.page.background)) {
    fail('page.background', 'Cor inválida (use #rrggbb ou #rrggbbaa).');
  }

  if (!Array.isArray(value.layers)) fail('layers', 'Camadas deve ser um array.');
  if (value.layers.length > HANDOUT_LIMITS.layers) {
    fail('layers', `O documento aceita até ${HANDOUT_LIMITS.layers} camadas.`);
  }

  const seenIds = new Set();
  const validKinds = ['image', 'text', 'shape', 'adjust', 'effect'];
  const blendIds = BLEND_MODES.map(([b]) => b);

  value.layers.forEach((layer, i) => {
    const path = `layers[${i}]`;
    if (!isPlainObject(layer)) fail(path, 'Camada deve ser um objeto JSON.');

    if (typeof layer.id !== 'string' || !LAYER_ID_RE.test(layer.id)) {
      fail(`${path}.id`, 'ID de camada inválido.');
    }
    if (seenIds.has(layer.id)) {
      fail(`${path}.id`, `ID de camada duplicado: ${layer.id}.`);
    }
    seenIds.add(layer.id);

    if (typeof layer.name !== 'string' || layer.name.length > 80) {
      fail(`${path}.name`, 'Nome da camada deve ter até 80 caracteres.');
    }

    if (!validKinds.includes(layer.kind)) {
      fail(`${path}.kind`, `Tipo de camada inválido: ${layer.kind}.`);
    }

    if (typeof layer.visible !== 'boolean') fail(`${path}.visible`, 'Visibilidade deve ser booleana.');
    if (typeof layer.locked !== 'boolean') fail(`${path}.locked`, 'Bloqueio deve ser booleano.');

    if (typeof layer.opacity !== 'number' || !Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1) {
      fail(`${path}.opacity`, 'Opacidade deve estar entre 0 e 1.');
    }

    if (!blendIds.includes(layer.blend)) {
      fail(`${path}.blend`, `Modo de mesclagem inválido: ${layer.blend}.`);
    }

    if (!Number.isFinite(layer.x)) fail(`${path}.x`, 'Posição x inválida.');
    if (!Number.isFinite(layer.y)) fail(`${path}.y`, 'Posição y inválida.');

    if (!Number.isFinite(layer.width) || layer.width <= 0 || layer.width > HANDOUT_LIMITS.box) {
      fail(`${path}.width`, `Largura fora dos limites (1 a ${HANDOUT_LIMITS.box} px).`);
    }
    if (!Number.isFinite(layer.height) || layer.height <= 0 || layer.height > HANDOUT_LIMITS.box) {
      fail(`${path}.height`, `Altura fora dos limites (1 a ${HANDOUT_LIMITS.box} px).`);
    }

    if (!Number.isFinite(layer.rotation) || layer.rotation < -360 || layer.rotation > 360) {
      fail(`${path}.rotation`, 'Rotação deve estar entre -360 e 360 graus.');
    }

    if (typeof layer.clip !== 'boolean') fail(`${path}.clip`, 'Recorte deve ser booleano.');
    if (!['both', 'normal', 'uv'].includes(layer.light)) {
      fail(`${path}.light`, 'Luz deve ser both, normal ou uv.');
    }

    // Must have exactly the block of its kind and no others
    for (const k of validKinds) {
      if (k === layer.kind) {
        if (!isPlainObject(layer[k])) fail(`${path}.${k}`, `Bloco de ${k} ausente.`);
      } else {
        if (k in layer) fail(path, `Camada ${layer.kind} não deve conter bloco ${k}.`);
      }
    }

    // Type specific validations
    if (layer.kind === 'image') {
      const img = layer.image;
      if (img.src !== null) {
        if (!isPlainObject(img.src) || (!img.src.library && !img.src.upload)) {
          fail(`${path}.image.src`, 'src da imagem deve ser null ou conter library ou upload.');
        }
      }
      if (!['stretch', 'cover', 'contain'].includes(img.fit)) {
        fail(`${path}.image.fit`, 'fit da imagem inválido.');
      }
      if (img.crop !== null) {
        if (!isPlainObject(img.crop)) fail(`${path}.image.crop`, 'crop inválido.');
        for (const coord of ['x', 'y', 'width', 'height']) {
          const val = img.crop[coord];
          if (typeof val !== 'number' || !Number.isFinite(val) || val < 0 || val > 1) {
            fail(`${path}.image.crop.${coord}`, 'Coordenada de crop fora de 0 a 1.');
          }
        }
      }
      if (typeof img.flipX !== 'boolean' || typeof img.flipY !== 'boolean') {
        fail(`${path}.image`, 'flipX e flipY devem ser booleanos.');
      }
      if (!isPlainObject(img.filter)) fail(`${path}.image.filter`, 'filter inválido.');
      const f = img.filter;
      if (f.grayscale < 0 || f.grayscale > 1) fail(`${path}.image.filter.grayscale`, 'grayscale 0 a 1.');
      if (f.sepia < 0 || f.sepia > 1) fail(`${path}.image.filter.sepia`, 'sepia 0 a 1.');
      if (f.brightness < -1 || f.brightness > 1) fail(`${path}.image.filter.brightness`, 'brightness -1 a 1.');
      if (f.contrast < -1 || f.contrast > 1) fail(`${path}.image.filter.contrast`, 'contrast -1 a 1.');
      if (f.saturation < -1 || f.saturation > 1) fail(`${path}.image.filter.saturation`, 'saturation -1 a 1.');
      if (f.hue < -180 || f.hue > 180) fail(`${path}.image.filter.hue`, 'hue -180 a 180.');
      if (f.blur < 0 || f.blur > 40) fail(`${path}.image.filter.blur`, 'blur 0 a 40 px.');
      if (typeof f.invert !== 'boolean') fail(`${path}.image.filter.invert`, 'invert deve ser booleano.');

      if (img.tint !== null) {
        if (!isPlainObject(img.tint) || !HEX_COLOR_RE.test(img.tint.color) || typeof img.tint.amount !== 'number' || img.tint.amount < 0 || img.tint.amount > 1) {
          fail(`${path}.image.tint`, 'tint deve ter color hex e amount 0 a 1.');
        }
      }
    } else if (layer.kind === 'text') {
      const txt = layer.text;
      if (typeof txt.content !== 'string' || txt.content.length > HANDOUT_LIMITS.text) {
        fail(`${path}.text.content`, `Texto deve ter até ${HANDOUT_LIMITS.text} caracteres.`);
      }
      if (!isPlainObject(txt.font) || typeof txt.font.family !== 'string' || typeof txt.font.weight !== 'number' || txt.font.weight < 100 || txt.font.weight > 900 || typeof txt.font.italic !== 'boolean') {
        fail(`${path}.text.font`, 'Fonte inválida.');
      }
      if (typeof txt.size !== 'number' || txt.size < 4 || txt.size > 600) {
        fail(`${path}.text.size`, 'Tamanho de fonte fora de 4 a 600 px.');
      }
      if (typeof txt.color !== 'string' || !HEX_COLOR_RE.test(txt.color)) {
        fail(`${path}.text.color`, 'Cor de texto inválida.');
      }
      if (!['left', 'center', 'right', 'justify'].includes(txt.align)) {
        fail(`${path}.text.align`, 'Alinhamento inválido.');
      }
      if (!['top', 'middle', 'bottom'].includes(txt.valign)) {
        fail(`${path}.text.valign`, 'Alinhamento vertical inválido.');
      }
      if (typeof txt.lineHeight !== 'number' || txt.lineHeight < 0.6 || txt.lineHeight > 4) {
        fail(`${path}.text.lineHeight`, 'lineHeight fora de 0.6 a 4.');
      }
      if (typeof txt.letterSpacing !== 'number' || txt.letterSpacing < -200 || txt.letterSpacing > 1000) {
        fail(`${path}.text.letterSpacing`, 'letterSpacing fora de -200 a 1000.');
      }
      if (!['area', 'point'].includes(txt.box)) fail(`${path}.text.box`, 'box deve ser area ou point.');
      if (!['overflow', 'shrink'].includes(txt.fit)) fail(`${path}.text.fit`, 'fit deve ser overflow ou shrink.');
      if (!isPlainObject(txt.ink) || !['clean', 'typewriter', 'handwriting', 'stamp'].includes(txt.ink.style) || typeof txt.ink.wear !== 'number' || txt.ink.wear < 0 || txt.ink.wear > 1 || !Number.isInteger(txt.ink.seed)) {
        fail(`${path}.text.ink`, 'ink inválido.');
      }
    } else if (layer.kind === 'shape') {
      const shp = layer.shape;
      if (!['rect', 'ellipse', 'line'].includes(shp.type)) fail(`${path}.shape.type`, 'Tipo de forma inválido.');
      if (shp.fill !== null && (typeof shp.fill !== 'string' || !HEX_COLOR_RE.test(shp.fill))) {
        fail(`${path}.shape.fill`, 'fill deve ser null ou cor hex.');
      }
      if (shp.stroke !== null && (typeof shp.stroke !== 'string' || !HEX_COLOR_RE.test(shp.stroke))) {
        fail(`${path}.shape.stroke`, 'stroke deve ser null ou cor hex.');
      }
      if (typeof shp.strokeWidth !== 'number' || shp.strokeWidth < 0 || shp.strokeWidth > 200) {
        fail(`${path}.shape.strokeWidth`, 'strokeWidth fora de 0 a 200.');
      }
      if (typeof shp.radius !== 'number' || shp.radius < 0) {
        fail(`${path}.shape.radius`, 'radius deve ser maior ou igual a zero.');
      }
      if (!Array.isArray(shp.dash) || shp.dash.length > 8 || !shp.dash.every(d => typeof d === 'number' && d >= 0)) {
        fail(`${path}.shape.dash`, 'dash deve ser uma lista com até 8 números.');
      }
    } else if (layer.kind === 'adjust') {
      const adj = layer.adjust;
      if (adj.grayscale < 0 || adj.grayscale > 1) fail(`${path}.adjust.grayscale`, 'grayscale 0 a 1.');
      if (adj.sepia < 0 || adj.sepia > 1) fail(`${path}.adjust.sepia`, 'sepia 0 a 1.');
      if (adj.brightness < -1 || adj.brightness > 1) fail(`${path}.adjust.brightness`, 'brightness -1 a 1.');
      if (adj.contrast < -1 || adj.contrast > 1) fail(`${path}.adjust.contrast`, 'contrast -1 a 1.');
      if (adj.saturation < -1 || adj.saturation > 1) fail(`${path}.adjust.saturation`, 'saturation -1 a 1.');
      if (adj.hue < -180 || adj.hue > 180) fail(`${path}.adjust.hue`, 'hue -180 a 180.');
      if (typeof adj.invert !== 'boolean') fail(`${path}.adjust.invert`, 'invert deve ser booleano.');

      if (adj.curve !== null) {
        if (!Array.isArray(adj.curve) || adj.curve.length < 2 || adj.curve.length > 16) {
          fail(`${path}.adjust.curve`, 'Curva deve ter de 2 a 16 pontos.');
        }
        for (let ptIdx = 0; ptIdx < adj.curve.length; ptIdx++) {
          const pt = adj.curve[ptIdx];
          if (!Array.isArray(pt) || pt.length !== 2 || typeof pt[0] !== 'number' || typeof pt[1] !== 'number' || pt[0] < 0 || pt[0] > 255 || pt[1] < 0 || pt[1] > 255) {
            fail(`${path}.adjust.curve[${ptIdx}]`, 'Ponto da curva deve ter entrada e saída de 0 a 255.');
          }
          if (ptIdx > 0 && pt[0] <= adj.curve[ptIdx - 1][0]) {
            fail(`${path}.adjust.curve`, 'Entradas da curva devem ser estritamente crescentes.');
          }
        }
      }
    } else if (layer.kind === 'effect') {
      const eff = layer.effect;
      const effectTypes = ['crumple', 'fold', 'stain', 'burn', 'tear', 'damp', 'fade', 'blood', 'grain'];
      if (!effectTypes.includes(eff.type)) fail(`${path}.effect.type`, 'Tipo de efeito inválido.');
      if (!Number.isInteger(eff.seed)) fail(`${path}.effect.seed`, 'seed deve ser inteiro.');
      if (typeof eff.amount !== 'number' || eff.amount < 0 || eff.amount > 1) {
        fail(`${path}.effect.amount`, 'amount deve estar entre 0 e 1.');
      }
      if (!isPlainObject(eff.params)) fail(`${path}.effect.params`, 'params deve ser um objeto.');
    }
  });

  // Fields validation
  if (!Array.isArray(value.fields) || value.fields.length > HANDOUT_LIMITS.fields) {
    fail('fields', `Campos deve ser uma lista com até ${HANDOUT_LIMITS.fields} itens.`);
  }

  value.fields.forEach((field, i) => {
    const fPath = `fields[${i}]`;
    if (!isPlainObject(field)) fail(fPath, 'Campo deve ser um objeto.');
    if (typeof field.label !== 'string' || field.label.length > 120) {
      fail(`${fPath}.label`, 'Rótulo do campo deve ter até 120 caracteres.');
    }
    const target = value.layers.find(l => l.id === field.layerId);
    if (!target || !['text', 'image'].includes(target.kind)) {
      fail(`${fPath}.layerId`, 'Campo aponta para camada inexistente ou inválida.');
    }
  });

  // Source validation
  if (!isPlainObject(value.source) || !['blank', 'template', 'import'].includes(value.source.kind)) {
    fail('source.kind', 'Origem deve ser blank, template ou import.');
  }
  if (value.source.kind === 'template' && (typeof value.source.templateId !== 'string' || !value.source.templateId)) {
    fail('source.templateId', 'templateId obrigatório para origem template.');
  }

  // Back validation
  if (value.back !== null) {
    if (!isPlainObject(value.back) || typeof value.back.handoutId !== 'string' || !UUID_RE.test(value.back.handoutId)) {
      fail('back', 'Verso deve ser null ou { handoutId: uuid }.');
    }
  }

  return value;
}

