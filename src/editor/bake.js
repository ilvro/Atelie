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

export const PREVIEW_WIDTH = 480;

/** Scales an already rendered canvas down to a WebP thumbnail (480 px wide). */
export async function previewFromCanvas(source, handout) {
  const height = Math.max(1, Math.round(PREVIEW_WIDTH * (handout.page.height / handout.page.width)));
  const canvas = createOffscreenOrElementCanvas(PREVIEW_WIDTH, height);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, PREVIEW_WIDTH, height);
  return canvasToBlob(canvas, 'image/webp');
}

/** Renders the thumbnail on its own, for when there is no bake to scale down. */
export async function previewOf(handout, { images, fonts } = {}) {
  const scale = PREVIEW_WIDTH / handout.page.width;
  const canvas = createOffscreenOrElementCanvas(PREVIEW_WIDTH, Math.max(1, Math.round(handout.page.height * scale)));
  const { renderHandout } = await import('../render/handout-render.js');
  await renderHandout(canvas, handout, { scale, loadImage: images?.load, loadFont: fonts?.load });
  return canvasToBlob(canvas, 'image/webp');
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

let bakeWorkerInstance = null;
let bakeWorkerFailed = false;

function getBakeWorker() {
  if (bakeWorkerFailed) return null;
  if (bakeWorkerInstance) return bakeWorkerInstance;
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return null;
  }
  try {
    bakeWorkerInstance = new Worker(new URL('./bake.worker.js', import.meta.url), { type: 'module' });
    return bakeWorkerInstance;
  } catch (err) {
    console.warn('[atelie] Web Worker para assar não pôde ser iniciado, usando thread principal:', err);
    bakeWorkerFailed = true;
    return null;
  }
}

async function bakeWithWorker(handout, width, height, scale, hasUv) {
  const worker = getBakeWorker();
  if (!worker) return null;

  return new Promise((resolve, reject) => {
    const id = 'bake-' + Math.random().toString(36).slice(2, 10);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Bake worker timeout'));
    }, 10000);

    const onMessage = (e) => {
      if (e.data?.id === id) {
        cleanup();
        if (e.data.success) {
          resolve(e.data.result);
        } else {
          reject(new Error(e.data.error || 'Bake worker failed'));
        }
      }
    };

    const onError = (err) => {
      cleanup();
      reject(err);
    };

    function cleanup() {
      clearTimeout(timeout);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    }

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ id, handout, width, height, scale, hasUv });
  });
}

/**
 * Bakes high-resolution PNGs of a handout:
 * Normal light always, UV light only when hasUvLayers is true.
 * Long side scaled to 2048 px.
 * Uses OffscreenCanvas Web Worker when available with fallback to main thread.
 *
 * @param {object} handout
 * @param {{ images?: object, fonts?: object }} options
 * @returns {Promise<{ normal: Blob, uv: Blob | null, preview: Blob | null, width: number, height: number }>}
 */
export async function bakeHandout(handout, { images, fonts } = {}) {
  const maxSide = Math.max(handout.page.width, handout.page.height);
  const scale = 2048 / maxSide;
  const width = Math.round(handout.page.width * scale);
  const height = Math.round(handout.page.height * scale);
  const hasUv = hasUvLayers(handout);

  // Try background worker first when browser supports it
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    try {
      const workerRes = await bakeWithWorker(handout, width, height, scale, hasUv);
      if (workerRes) return workerRes;
    } catch (err) {
      console.warn('[atelie] Assar com Web Worker falhou, recuando para thread principal:', err.message);
    }
  }

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
  // The thumbnail is scaled down from this render instead of rendering the document a second time.
  let previewBlob = null;
  try {
    previewBlob = await previewFromCanvas(normalCanvas, handout);
  } catch {
    previewBlob = null;
  }

  // UV bake
  let uvBlob = null;
  if (hasUv) {
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
    preview: previewBlob,
    width,
    height,
  };
}

