import './ui/styles.css';
import './ui/editor.css';
import './ui/controls.css';
import './ui/start.css';
import './ui/reader.css';
import './ui/export.css';
import './ui/help.css';
import { createShell } from './ui/shell.js';
import { renderHandout } from './render/handout-render.js';
import { createHandoutImages } from './data/handout-images.js';
import { createHandoutFonts } from './data/handout-fonts.js';
import { api } from './data/api.js';
import * as exchange from './data/exchange.js';
import { createEditor } from './editor/editor.js';
import { createReading } from './reading/reading.js';

const appRoot = document.getElementById('app');
if (appRoot) {
  const shell = createShell(appRoot, {
    onAction(action) {
      // Shell actions hook
    },
  });

  const badgeEl = appRoot.querySelector('#desk-storage-badge span');
  if (badgeEl) {
    badgeEl.textContent = api.mode === 'browser' ? 'Salvando neste navegador' : 'Conectado ao servidor local';
  }

  if (typeof window !== 'undefined') {
    const images = createHandoutImages({ api });
    const fonts = createHandoutFonts({ api });
    const isDiagnostics = window.location.search.includes('diagnostics');

    let reading = null;
    const editor = createEditor(shell, {
      api,
      images,
      fonts,
      onOpenReader: (id) => reading?.open(id),
    });

    reading = createReading(shell, { api, images, fonts, editor });

    shell.onAction((action) => {
      if (action === 'reader') {
        reading?.open(editor?.state?.handout?.id);
      }
    });

    const atelieApi = {
      ...shell,
      api,
      ...(reading ? { reading } : {}),
      ...(isDiagnostics && editor ? { editor, exchange } : {}),
      renderHandout: async (handout, { scale = 0.25, light = 'normal', at = [] } = {}) => {
        const canvas = document.createElement('canvas');
        const res = await renderHandout(canvas, handout, {
          scale,
          light,
          loadImage: src => images.load(src),
          loadFont: font => fonts.load(font),
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
