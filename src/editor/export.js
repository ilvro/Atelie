/**
 * Export and Print engine (Etapa 21)
 * Pure functions and helpers for high-resolution PNG export,
 * canvas size limits, and 1:1 scale physical printing.
 */
import { hasUvLayers } from './bake.js';
import { renderHandout } from '../render/handout-render.js';

// Universal safe limit for HTML5 2D Canvas in Chromium/Webkit/Firefox
export const MAX_CANVAS_DIMENSION = 16384;
export const MAX_CANVAS_AREA = 268435456; // 16384 * 16384 (2^28)

/**
 * Checks if the given canvas width and height fit within safe browser canvas limits.
 * @param {number} width
 * @param {number} height
 * @returns {boolean}
 */
export function fitsCanvas(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width <= 0 || height <= 0) return false;
  if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) return false;
  if (width * height > MAX_CANVAS_AREA) return false;
  return true;
}

/**
 * Computes the rendering scale for the given target ('screen' | 'print').
 * - 'screen': scale such that the largest dimension is 2048 px.
 * - 'print': 300 DPI over 150 DPI document resolution => scale = 2 (or safe maximum).
 * @param {object} handout Document or page object
 * @param {'screen' | 'print'} target
 * @returns {number}
 */
export function exportScale(handout, target = 'screen') {
  const page = handout?.page || handout || {};
  const width = page.width || 1240;
  const height = page.height || 1754;

  if (target === 'screen') {
    const maxDim = Math.max(width, height);
    return maxDim > 0 ? 2048 / maxDim : 1;
  }

  // target === 'print' (300 DPI / 150 DPI = 2.0)
  let scale = 2;
  const targetW = width * scale;
  const targetH = height * scale;

  if (!fitsCanvas(targetW, targetH)) {
    const scaleByDim = Math.min(MAX_CANVAS_DIMENSION / width, MAX_CANVAS_DIMENSION / height);
    const scaleByArea = Math.sqrt(MAX_CANVAS_AREA / (width * height));
    scale = Math.min(scale, scaleByDim, scaleByArea);
  }

  return scale;
}

/**
 * Calculates physical dimensions in millimeters, orientation and crop mark requirements.
 * Document pixels are at 150 DPI (1 inch = 25.4 mm => mm = px / 150 * 25.4).
 * @param {object} handout
 * @returns {{ orientation: 'portrait' | 'landscape', widthMm: number, heightMm: number, cropMarks: boolean }}
 */
export function printLayout(handout) {
  const page = handout?.page || handout || {};
  const widthPx = page.width || 1240;
  const heightPx = page.height || 1754;

  const rawWidthMm = (widthPx / 150) * 25.4;
  const rawHeightMm = (heightPx / 150) * 25.4;

  const orientation = rawWidthMm > rawHeightMm ? 'landscape' : 'portrait';

  // Check if document is standard A4 (210 × 297 mm) within 1.5mm tolerance
  const isA4Portrait = Math.abs(rawWidthMm - 210) < 1.5 && Math.abs(rawHeightMm - 297) < 1.5;
  const isA4Landscape = Math.abs(rawWidthMm - 297) < 1.5 && Math.abs(rawHeightMm - 210) < 1.5;
  const isA4 = isA4Portrait || isA4Landscape;

  return {
    orientation,
    widthMm: Math.round(rawWidthMm * 10) / 10,
    heightMm: Math.round(rawHeightMm * 10) / 10,
    cropMarks: !isA4,
  };
}

/**
 * Generates standalone HTML document for print preview / browser print dialog.
 * @param {object} handout
 * @param {string} dataUrl
 * @returns {string}
 */
export function generatePrintHtml(handout, dataUrl) {
  const name = handout?.name || 'Documento';
  const layout = printLayout(handout);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
  <style>
    @page {
      size: A4 ${layout.orientation};
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #ffffff;
    }
    ${layout.cropMarks ? `
    body {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .print-box {
      width: ${layout.widthMm}mm;
      height: ${layout.heightMm}mm;
      outline: 1px dashed #999999;
      position: relative;
      box-sizing: border-box;
    }
    .print-box img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
    }
    ` : `
    img {
      display: block;
      width: 210mm;
      height: 297mm;
      object-fit: contain;
    }
    `}
  </style>
</head>
<body>
  ${layout.cropMarks ? `<div class="print-box"><img src="${dataUrl}" alt="" /></div>` : `<img src="${dataUrl}" alt="" />`}
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 250);
    });
    window.addEventListener('afterprint', () => {
      window.close();
    });
  </script>
</body>
</html>`;
}

function sanitizeFilename(name) {
  return (name || 'documento')
    .toLowerCase()
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Renders document to PNG Blob and triggers browser file download.
 * @param {object} handout
 * @param {object} options
 */
export async function downloadHandoutPng(handout, {
  target = 'screen',
  light = 'normal',
  images,
  fonts,
  onProgress = () => {},
} = {}) {
  const scale = exportScale(handout, target);
  onProgress({ status: 'rendering', scale, target });

  const canvas = document.createElement('canvas');
  await renderHandout(canvas, handout, {
    scale,
    light,
    loadImage: images?.load,
    loadFont: fonts?.load,
  });

  onProgress({ status: 'encoding' });

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Falha ao gerar imagem PNG');

  const baseName = sanitizeFilename(handout.name || 'documento');
  const targetTag = target === 'print' ? '-300dpi' : '';
  const lightTag = light === 'uv' ? '-uv' : '';
  const filename = `${baseName}${targetTag}${lightTag}.png`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);

  onProgress({ status: 'done', filename });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('atelie:exported', { detail: { target } }));
  return { filename, blob, scale };
}

/**
 * Opens a print popup with 1:1 scale layout for printing.
 * @param {object} handout
 * @param {object} options
 */
export async function printHandout(handout, {
  light = 'normal',
  images,
  fonts,
  onProgress = () => {},
} = {}) {
  const scale = exportScale(handout, 'print');
  onProgress({ status: 'rendering', scale });

  const canvas = document.createElement('canvas');
  await renderHandout(canvas, handout, {
    scale,
    light,
    loadImage: images?.load,
    loadFont: fonts?.load,
  });

  onProgress({ status: 'preparing' });
  const dataUrl = canvas.toDataURL('image/png');
  const html = generatePrintHtml(handout, dataUrl);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Bloqueador de popups impediu a abertura da janela de impressão.');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  onProgress({ status: 'done' });
  return true;
}

