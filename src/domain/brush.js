/**
 * The brush stroke as data. A `path` shape keeps its points normalized (0–1) inside the layer box,
 * so moving, resizing and rotating the layer need no code of their own.
 *
 * Points are [x, y, pressure]; a `null` entry separates strokes of the same layer (Shift+brush adds one).
 */

export const MAX_PATH_POINTS = 20000;

const clamp01 = v => Math.max(0, Math.min(1, v));

/** Splits a point list at its `null` separators. */
export function strokesOf(points) {
  const strokes = [];
  let current = [];
  for (const p of points || []) {
    if (p === null) {
      if (current.length) strokes.push(current);
      current = [];
    } else {
      current.push(p);
    }
  }
  if (current.length) strokes.push(current);
  return strokes;
}

/**
 * Page-space points → the layer box and the normalized points inside it.
 * The box is the bounding box grown by half the stroke width, so it is never empty and the round caps stay inside.
 */
export function normalizeStroke(points, strokeWidth = 4) {
  const real = points.filter(Boolean);
  if (!real.length) return null;
  const pad = Math.max(1, strokeWidth) * 1.0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of real) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const box = {
    x: Math.round((minX - pad) * 100) / 100,
    y: Math.round((minY - pad) * 100) / 100,
    width: Math.round((maxX - minX + pad * 2) * 100) / 100,
    height: Math.round((maxY - minY + pad * 2) * 100) / 100,
  };
  const round4 = v => Math.round(v * 10000) / 10000;
  const normalized = points.map(p => (p === null
    ? null
    : [round4(clamp01((p[0] - box.x) / box.width)), round4(clamp01((p[1] - box.y) / box.height)), round4(clamp01(p[2] ?? 0.5))]));
  return { box, points: normalized };
}

/** The layer's points back in page space (before rotation, as drawn in its own box). */
export function denormalizeStroke(layer) {
  return (layer.shape?.points || []).map(p => (p === null
    ? null
    : [layer.x + p[0] * layer.width, layer.y + p[1] * layer.height, p[2] ?? 0.5]));
}

/** Adds a stroke (page-space points) to an existing brush layer: returns the new box and points. */
export function appendStroke(layer, strokePoints, strokeWidth = layer.shape?.strokeWidth ?? 4) {
  const merged = [...denormalizeStroke(layer), null, ...strokePoints];
  return normalizeStroke(merged, strokeWidth);
}

/** Pressure → width factor. A mouse reports 0.5 while pressed, which gives exactly the chosen width. */
export function pressureFactor(pressure) {
  const p = pressure ?? 0.5;
  return Math.max(0.2, Math.min(2, p * 2));
}

/** Drops points closer than `minDistance` to the previous one (keeps the stroke light). */
export function thinPoints(points, minDistance = 1.5) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= minDistance) out.push(p);
  }
  if (points.length && out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  return out;
}

/** Whether a points list is valid for a path shape. Returns an error message or null. */
export function pointsError(points) {
  if (!Array.isArray(points)) return 'points deve ser uma lista.';
  if (points.length > MAX_PATH_POINTS) return `points aceita no máximo ${MAX_PATH_POINTS} pontos.`;
  let real = 0;
  for (const p of points) {
    if (p === null) continue;
    real++;
    if (!Array.isArray(p) || (p.length !== 2 && p.length !== 3) || !p.every(n => typeof n === 'number' && Number.isFinite(n))) {
      return 'cada ponto deve ser [x, y] ou [x, y, pressão].';
    }
    if (p[0] < 0 || p[0] > 1 || p[1] < 0 || p[1] > 1) return 'x e y devem estar entre 0 e 1.';
    if (p.length === 3 && (p[2] < 0 || p[2] > 1)) return 'a pressão deve estar entre 0 e 1.';
  }
  if (real === 0) return 'points precisa de ao menos um ponto.';
  return null;
}

/**
 * The tips a brush stroke can have. `pen` is the plain smooth line and what a path without `brush` is.
 * `defaults` are only offered when the tip is chosen in the strip; they never overwrite what the person set.
 */
export const BRUSH_KINDS = [
  { id: 'pen', label: 'Caneta', layerName: 'Pincel', icon: 'brush-pen', hasGrain: false, defaults: {} },
  { id: 'pencil', label: 'Lápis', layerName: 'Lápis', icon: 'brush-pencil', hasGrain: true, defaults: { color: '#4a4a4f', width: 3 } },
  { id: 'chalk', label: 'Giz / carvão', layerName: 'Giz', icon: 'brush-chalk', hasGrain: true, defaults: { width: 14 } },
  { id: 'nib', label: 'Pena (nanquim)', layerName: 'Pena', icon: 'brush-nib', hasGrain: false, defaults: { color: '#15131a' } },
  { id: 'drybrush', label: 'Pincel seco', layerName: 'Pincel seco', icon: 'brush-dry', hasGrain: true, defaults: { width: 18 } },
  { id: 'marker', label: 'Marca-texto', layerName: 'Marca-texto', icon: 'brush-marker', hasGrain: true, defaults: { color: '#f2d23c', opacity: 45, width: 18 } },
];

export const DEFAULT_GRAIN = 0.5;

export const brushKindOf = shape => shape?.brush?.kind ?? 'pen';
export const brushInfo = kind => BRUSH_KINDS.find(k => k.id === kind) || BRUSH_KINDS[0];

/** Whether `brush` is a valid `shape.brush`. Returns an error message or null. */
export function brushError(brush) {
  if (brush === undefined) return null;
  if (!brush || typeof brush !== 'object' || Array.isArray(brush)) return 'brush deve ser um objeto.';
  if (!BRUSH_KINDS.some(k => k.id === brush.kind)) return 'brush.kind desconhecido.';
  if (typeof brush.grain !== 'number' || !(brush.grain >= 0 && brush.grain <= 1)) return 'brush.grain deve estar entre 0 e 1.';
  if (!Number.isInteger(brush.seed)) return 'brush.seed deve ser um inteiro.';
  return null;
}

export const newBrushSeed = (rand = Math.random) => 1 + Math.floor(rand() * 99998);

/**
 * A brush layer's box only has room for the width it was drawn with. When the stroke is made wider
 * afterwards, the box grows around its own centre (so a turned layer does not move) and the normalized
 * points are re-expressed in it. Returns the layer patch, or null when there is room already.
 */
export function growBoxForWidth(layer, strokeWidth) {
  const old = layer.shape?.strokeWidth ?? 0;
  const d = Math.round((strokeWidth - old) * 100) / 100;
  if (!(d > 0) || layer.shape?.type !== 'path') return null;
  const width = layer.width + 2 * d;
  const height = layer.height + 2 * d;
  const round4 = v => Math.round(v * 10000) / 10000;
  return {
    x: Math.round((layer.x - d) * 100) / 100,
    y: Math.round((layer.y - d) * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
    points: layer.shape.points.map(p => (p === null
      ? null
      : [round4((p[0] * layer.width + d) / width), round4((p[1] * layer.height + d) / height), p[2] ?? 0.5])),
  };
}

/**
 * Lazy-brush stabilizer: the brush is tied to the cursor by a rope of `radius`. While the cursor stays
 * inside the rope the brush does not move; beyond it, the brush walks only the excess towards the cursor,
 * so hand tremor smaller than the rope never reaches the stroke. Radius 0 follows the cursor exactly.
 */
export function stabilize(prev, target, radius) {
  if (!(radius > 0)) return [target[0], target[1]];
  const dx = target[0] - prev[0];
  const dy = target[1] - prev[1];
  const d = Math.hypot(dx, dy);
  if (d <= radius) return [prev[0], prev[1]];
  const k = (d - radius) / d;
  return [prev[0] + dx * k, prev[1] + dy * k];
}

/** Rope length in page px for the strip's "Suavizar" (0–100) at a zoom: 0.3 screen px per step. */
export const stabilizerRadius = (smooth, zoom = 1) => (Math.max(0, Math.min(100, smooth || 0)) * 0.3) / (zoom || 1);
