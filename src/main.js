import './ui/styles.css';
import { createShell } from './ui/shell.js';
import { renderHandout } from './render/handout-render.js';
import { createHandoutImages } from './data/handout-images.js';

const appRoot = document.getElementById('app');
if (appRoot) {
  const shell = createShell(appRoot, {
    onAction(action) {
      // Shell actions hook
    },
  });

  if (typeof window !== 'undefined') {
    const images = createHandoutImages();
    const isDiagnostics = window.location.search.includes('diagnostics');

    const atelieApi = {
      ...shell,
      renderHandout: async (handout, { scale = 0.25, light = 'normal', at = [] } = {}) => {
        const canvas = document.createElement('canvas');
        const res = await renderHandout(canvas, handout, {
          scale,
          light,
          loadImage: src => images.load(src),
        });
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const pixels = at.map(([x, y]) => {
          const px = Math.round(x * scale);
          const py = Math.round(y * scale);
          const data = ctx.getImageData(px, py, 1, 1).data;
          return Array.from(data);
        });
        return {
          canvas,
          pixels,
          missing: res.missing,
          warnings: res.warnings,
        };
      },
    };

    window.__atelie = Object.freeze(atelieApi);
  }
}
