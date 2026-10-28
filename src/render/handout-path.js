import { strokesOf, pressureFactor } from '../domain/brush.js';
import { brushCoverage, TEXTURED_KINDS } from './brush-raster.js';
import { createOffscreenCanvas } from './offscreen.js';

/**
 * Draws the brush strokes of a `path` shape centred on (0, 0), in a box of w × h canvas pixels.
 * Each stroke is smoothed with quadratic curves through the midpoints between points,
 * and each curve piece is as wide as the pressure there says.
 */
export function drawPathShape(ctx, shape, w, h, scale) {
  if (TEXTURED_KINDS.has(shape?.brush?.kind) && drawTextured(ctx, shape, w, h, scale)) return;
  drawSmooth(ctx, shape, w, h, scale);
}

const brushCache = new Map();
const MAX_BRUSH_ENTRIES = 64;
const MAX_BRUSH_PIXELS = 48e6;
let cachedPixels = 0;

export function clearBrushCache() {
  brushCache.clear();
  cachedPixels = 0;
}

function pointsHash(points) {
  let h = 2166136261;
  for (const p of points) {
    if (p === null) { h = Math.imul(h ^ 0x9e37, 16777619); continue; }
    h = Math.imul(h ^ Math.round(p[0] * 10000), 16777619);
    h = Math.imul(h ^ Math.round(p[1] * 10000), 16777619);
    h = Math.imul(h ^ Math.round((p[2] ?? 0.5) * 100), 16777619);
  }
  return h >>> 0;
}

function parseColor(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(hex || '');
  if (!m) return [0, 0, 0, 1];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), m[4] ? parseInt(m[4], 16) / 255 : 1];
}

/** The textured tip as a cached off-screen canvas; false when there is no canvas (Node tests) so the caller draws smooth. */
function drawTextured(ctx, shape, w, h, scale) {
  if (!shape?.stroke || !(shape.strokeWidth > 0) || !shape.points?.length) return false;
  const key = JSON.stringify([shape.points.length, shape.brush, shape.stroke, shape.strokeWidth, Math.round(w), Math.round(h), Math.round(scale * 1000)]) + pointsHash(shape.points);
  let canvas = brushCache.get(key);
  if (!canvas) {
    const cov = brushCoverage(shape, w, h, scale);
    if (!cov) return false;
    canvas = createOffscreenCanvas(cov.width, cov.height);
    const cctx = canvas?.getContext?.('2d');
    if (!cctx?.createImageData) return false;
    const image = cctx.createImageData(cov.width, cov.height);
    const [r, g, b, a] = parseColor(shape.stroke);
    for (let i = 0, n = cov.data.length; i < n; i++) {
      const o = i * 4;
      image.data[o] = r;
      image.data[o + 1] = g;
      image.data[o + 2] = b;
      image.data[o + 3] = cov.data[i] * a;
    }
    cctx.putImageData(image, 0, 0);
    while (brushCache.size >= MAX_BRUSH_ENTRIES || (cachedPixels + cov.width * cov.height > MAX_BRUSH_PIXELS && brushCache.size)) {
      const oldest = brushCache.keys().next().value;
      const old = brushCache.get(oldest);
      cachedPixels -= old.width * old.height;
      brushCache.delete(oldest);
    }
    brushCache.set(key, canvas);
    cachedPixels += cov.width * cov.height;
  }
  ctx.drawImage(canvas, -w / 2, -h / 2);
  return true;
}

function drawSmooth(ctx, shape, w, h, scale) {
  if (!shape?.stroke || !(shape.strokeWidth > 0)) return;
  const base = shape.strokeWidth * scale;
  ctx.strokeStyle = shape.stroke;
  ctx.fillStyle = shape.stroke;
  ctx.setLineDash?.([]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const at = p => [p[0] * w - w / 2, p[1] * h - h / 2, p[2]];

  for (const stroke of strokesOf(shape.points)) {
    const pts = stroke.map(at);
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0][0], pts[0][1], Math.max(0.5, (base * pressureFactor(pts[0][2])) / 2), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    let from = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const cur = pts[i];
      const next = pts[i + 1];
      const to = next ? [(cur[0] + next[0]) / 2, (cur[1] + next[1]) / 2] : cur;
      ctx.beginPath();
      ctx.lineWidth = Math.max(0.5, base * pressureFactor(cur[2]));
      ctx.moveTo(from[0], from[1]);
      ctx.quadraticCurveTo(cur[0], cur[1], to[0], to[1]);
      ctx.stroke();
      from = to;
    }
  }
}
