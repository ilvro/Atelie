/**
 * High-resolution rendering (baking) of handouts and contract delivery format for Tabletop.
 */

export const hasUvLayers = handout => (
  Array.isArray(handout?.layers) &&
  handout.layers.some(layer => layer.visible && layer.light === 'uv')
);

/**
 * Summary of a handout according to Tabletop contract.
 * @param {object} handout
 * @param {string} source - Base URI of the Ateliê
 */
export const summaryOf = (handout, source) => ({
  id: handout.id,
  name: handout.name,
  category: handout.category || '',
  tags: Array.isArray(handout.tags) ? [...handout.tags] : [],
  revision: handout.revision,
  updatedAt: handout.updatedAt || new Date().toISOString(),
  hasUv: hasUvLayers(handout),
  source,
});

/**
 * Delivery object according to Tabletop contract Section 2.
 * @param {object} handout
 * @param {{ preview: Blob | null, bakes: { normal: Blob, uv: Blob | null }, source: string }} options
 */
export function deliveryOf(handout, { preview = null, bakes = null, source = '' } = {}) {
  return {
    id: handout.id,
    name: handout.name,
    category: handout.category || '',
    tags: Array.isArray(handout.tags) ? [...handout.tags] : [],
    revision: handout.revision,
    updatedAt: handout.updatedAt || new Date().toISOString(),
    hasUv: hasUvLayers(handout),
    source,
    preview: preview ?? null,
    bakes: {
      normal: bakes?.normal ?? null,
      uv: bakes?.uv ?? null,
    },
  };
}

async function canvasToBlob(canvas, mime = 'image/png') {
  if (!canvas) return null;
  if (typeof canvas.convertToBlob === 'function') {
    return await canvas.convertToBlob({ type: mime });
  }
  if (typeof canvas.toBlob === 'function') {
    return new Promise(resolve => canvas.toBlob(resolve, mime));
  }
  if (typeof canvas.toDataURL === 'function') {
    const dataUrl = canvas.toDataURL(mime);
    const binStr = atob(dataUrl.split(',')[1]);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = binStr.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  return null;
}

function createOffscreenOrElementCanvas(width, height) {
  if (typeof document !== 'undefined' && document.createElement) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  return null;
}

/**
 * Bakes high-resolution PNGs of a handout:
 * Normal light always, UV light only when hasUvLayers is true.
 * Long side scaled to 2048 px.
 *
 * @param {object} handout
 * @param {{ images?: object, fonts?: object }} options
 * @returns {Promise<{ normal: Blob, uv: Blob | null, width: number, height: number }>}
 */
export async function bakeHandout(handout, { images, fonts } = {}) {
  const maxSide = Math.max(handout.page.width, handout.page.height);
  const scale = 2048 / maxSide;
  const width = Math.round(handout.page.width * scale);
  const height = Math.round(handout.page.height * scale);

  const { renderHandout } = await import('../render/handout-render.js');

  // Normal bake
  const normalCanvas = createOffscreenOrElementCanvas(width, height);
  await renderHandout(normalCanvas, handout, {
    scale,
    light: 'normal',
    loadImage: images?.load,
    loadFont: fonts?.load,
  });
  const normalBlob = await canvasToBlob(normalCanvas, 'image/png');

  // UV bake
  let uvBlob = null;
  if (hasUvLayers(handout)) {
    const uvCanvas = createOffscreenOrElementCanvas(width, height);
    await renderHandout(uvCanvas, handout, {
      scale,
      light: 'uv',
      loadImage: images?.load,
      loadFont: fonts?.load,
    });
    uvBlob = await canvasToBlob(uvCanvas, 'image/png');
  }

  return {
    normal: normalBlob,
    uv: uvBlob,
    width,
    height,
  };
}

