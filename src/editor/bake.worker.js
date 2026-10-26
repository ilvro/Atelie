/**
 * Web Worker for offscreen baking of handouts (Fase 3 · Palco fluido)
 * Renders 2048px high-resolution PNGs and thumbnails in background without blocking main UI.
 */
import { renderHandout } from '../render/handout-render.js';
import { hasUvLayers } from './bake.js';

self.onmessage = async (e) => {
  const { id, handout, width, height, scale, hasUv } = e.data;
  try {
    const normalCanvas = new OffscreenCanvas(width, height);
    await renderHandout(normalCanvas, handout, {
      scale,
      light: 'normal',
      loadImage: async (src) => {
        try {
          const url = src.upload ? `/api/uploads/${src.upload}` : src.library ? `/api/library/${src.library}/file` : null;
          if (!url) return null;
          const res = await fetch(url);
          const blob = await res.blob();
          return await createImageBitmap(blob);
        } catch {
          return null;
        }
      },
    });

    const normalBlob = await normalCanvas.convertToBlob({ type: 'image/png' });

    // Preview thumbnail
    const prevW = 480;
    const prevH = Math.max(1, Math.round(prevW * (handout.page.height / handout.page.width)));
    const prevCanvas = new OffscreenCanvas(prevW, prevH);
    const prevCtx = prevCanvas.getContext('2d');
    prevCtx.drawImage(normalCanvas, 0, 0, prevW, prevH);
    const previewBlob = await prevCanvas.convertToBlob({ type: 'image/webp' });

    let uvBlob = null;
    if (hasUv) {
      const uvCanvas = new OffscreenCanvas(width, height);
      await renderHandout(uvCanvas, handout, {
        scale,
        light: 'uv',
        loadImage: async (src) => {
          try {
            const url = src.upload ? `/api/uploads/${src.upload}` : src.library ? `/api/library/${src.library}/file` : null;
            if (!url) return null;
            const res = await fetch(url);
            const blob = await res.blob();
            return await createImageBitmap(blob);
          } catch {
            return null;
          }
        },
      });
      uvBlob = await uvCanvas.convertToBlob({ type: 'image/png' });
    }

    self.postMessage({
      id,
      success: true,
      result: {
        normal: normalBlob,
        uv: uvBlob,
        preview: previewBlob,
        width,
        height,
      },
    });
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message });
  }
};

