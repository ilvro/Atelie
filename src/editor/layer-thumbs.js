import { renderHandout } from '../render/handout-render.js';

/**
 * Real thumbnails for the layer rows: each layer drawn alone, cropped to its box, 40 px,
 * cached by what the layer looks like (not by its name or place), so moving a layer or
 * renaming it does not draw it again. One thumbnail per animation frame keeps typing smooth.
 */

const SIZE = 40;
const MAX_CACHED = 400;

/** A short key that changes only when the look of the layer changes. */
export function thumbKey(layer) {
  const { id, name, x, y, locked, visible, color, ...look } = layer;
  const text = JSON.stringify(look);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${layer.kind}:${(hash >>> 0).toString(36)}:${text.length}`;
}

/** The mini document used to draw one layer alone: its box becomes the page. */
export function thumbDocument(layer) {
  const width = Math.max(1, Math.round(layer.width));
  const height = Math.max(1, Math.round(layer.height));
  return {
    page: { width, height, background: '#00000000' },
    layers: [{ ...layer, x: 0, y: 0, visible: true, locked: false, light: 'both', rotation: 0 }],
    fields: [],
  };
}

export function createLayerThumbs({ images, fonts, onReady } = {}) {
  const cache = new Map(); // key -> data URL ('' when the layer cannot be drawn)
  const waiting = new Map(); // key -> layer
  let scheduled = false;
  let firstWave = true;

  function pump() {
    scheduled = false;
    const next = waiting.entries().next();
    if (next.done) return;
    const [key, layer] = next.value;
    waiting.delete(key);
    drawOne(key, layer).finally(() => {
      firstWave = false;
      if (waiting.size) schedule();
    });
  }

  /** Thumbnails never compete with opening a document: the first waits a moment, each one runs when the browser is idle. */
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    const idle = typeof requestIdleCallback === 'function'
      ? fn => requestIdleCallback(fn, { timeout: 1500 })
      : fn => setTimeout(fn, 50);
    if (firstWave) {
      firstWave = false;
      setTimeout(() => idle(pump), 900);
    } else {
      idle(pump);
    }
  }

  async function drawOne(key, layer) {
    try {
      const doc = thumbDocument(layer);
      const scale = Math.min(1, SIZE / Math.max(doc.page.width, doc.page.height));
      const canvas = document.createElement('canvas');
      await renderHandout(canvas, doc, {
        scale,
        light: 'normal',
        loadImage: images?.load,
        loadFont: fonts?.load,
      });
      const url = canvas.width && canvas.height ? canvas.toDataURL('image/png') : '';
      store(key, url);
    } catch {
      store(key, '');
    }
    onReady?.(key, cache.get(key));
  }

  function store(key, url) {
    if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value);
    cache.set(key, url);
  }

  return {
    /** The thumbnail if ready; otherwise asks for it and returns null. */
    get(layer) {
      if (layer.kind === 'adjust') return null;
      const key = thumbKey(layer);
      if (cache.has(key)) return cache.get(key) || null;
      if (!waiting.has(key)) {
        waiting.set(key, layer);
        schedule();
      }
      return null;
    },
    key: thumbKey,
    get size() { return cache.size; },
  };
}
