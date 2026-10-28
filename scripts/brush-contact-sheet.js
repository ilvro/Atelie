// Contact sheet of the brush tips at 3 pressures on "Ofício creme (Usado)": docs/referencias/pincel-pontas.png
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRUSH_KINDS } from '../src/domain/brush.js';
import { brushCoverage } from '../src/render/brush-raster.js';
import { drawPathShape } from '../src/render/handout-path.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/referencias/pincel-pontas.png');
const CELL_W = 520;
const CELL_H = 170;
const LABEL_W = 150;
const PRESSURES = [0.25, 0.5, 0.9];
const SCALE = 2;
const INK = { pen: ['#15131a', 6], pencil: ['#4a4a4f', 3], chalk: ['#2b2b30', 14], nib: ['#15131a', 8], drybrush: ['#15131a', 18], marker: ['#f2d23c', 18], splatter: ['#15131a', 24], stain: ['#5b3a1e', 40] };

const sheetW = LABEL_W + CELL_W * PRESSURES.length;
const sheetH = CELL_H * BRUSH_KINDS.length;
const paper = await sharp(path.join(root, 'public/colecao/papeis/oficio-creme-usado.webp'))
  .resize(sheetW, sheetH, { fit: 'cover' }).ensureAlpha().raw().toBuffer();
const px = Buffer.from(paper);

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function composite(cov, left, top, color, multiply, opacity = 1) {
  const [r, g, b] = hex(color);
  for (let y = 0; y < cov.height; y++) {
    for (let x = 0; x < cov.width; x++) {
      const a = (cov.data[y * cov.width + x] / 255) * opacity;
      if (!a) continue;
      const X = left + x;
      const Y = top + y;
      if (X < 0 || Y < 0 || X >= sheetW || Y >= sheetH) continue;
      const o = (Y * sheetW + X) * 4;
      const src = [r, g, b];
      for (let c = 0; c < 3; c++) {
        const base = px[o + c];
        const mixed = multiply ? (base * src[c]) / 255 : src[c];
        px[o + c] = Math.round(base * (1 - a) + mixed * a);
      }
    }
  }
}

const labels = [];
BRUSH_KINDS.forEach((k, row) => {
  const [color, width] = INK[k.id];
  labels.push(`<text x="14" y="${row * CELL_H + CELL_H / 2 + 5}" font-family="sans-serif" font-size="17" fill="#2a2420">${k.label}</text>`);
  PRESSURES.forEach((pressure, col) => {
    const n = 60;
    const points = Array.from({ length: n }, (_, i) => [0.06 + (0.88 * i) / (n - 1), 0.5 + 0.22 * Math.sin((i / (n - 1)) * Math.PI * 2.2), pressure]);
    const shape = { type: 'path', stroke: color, strokeWidth: width, points, brush: { kind: k.id, grain: 0.5, seed: 4821 + row * 7 } };
    const left = LABEL_W + col * CELL_W;
    const top = row * CELL_H;
    // pen has no raster: draw it as a thick polyline with the same widths
    const cov = k.id === 'pen' ? penCoverage(shape, CELL_W, CELL_H) : brushCoverage(shape, CELL_W, CELL_H, SCALE / 2 * 1);
    composite(cov, left, top, color, k.id === 'marker' || k.id === 'stain', k.id === 'stain' ? 0.8 : 1);
  });
});

function penCoverage(shape, w, h) {
  const W = w; const H = h;
  const data = new Uint8ClampedArray(W * H);
  const pts = shape.points.map(p => [p[0] * w, p[1] * h, p[2]]);
  for (let i = 0; i < pts.length - 1; i++) {
    const r = (shape.strokeWidth * Math.max(0.2, Math.min(2, pts[i][2] * 2))) / 2;
    for (let t = 0; t < 1; t += 0.1) {
      const cx = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t;
      const cy = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
      for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const a = Math.max(0, Math.min(1, r - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + 0.5)) * 255;
        if (a > data[y * W + x]) data[y * W + x] = a;
      }
    }
  }
  return { width: W, height: H, data };
}

const svg = Buffer.from(`<svg width="${sheetW}" height="${sheetH}" xmlns="http://www.w3.org/2000/svg">${labels.join('')}<text x="${LABEL_W}" y="14" font-family="sans-serif" font-size="12" fill="#6a5a48">pressão 25% · 50% · 90%</text></svg>`);
await sharp(px, { raw: { width: sheetW, height: sheetH, channels: 4 } })
  .composite([{ input: svg }]).png().toFile(out);
console.log('written', out);
