/**
 * Cuts as data (Fase C1): scissors, tearing and the lighter all end as one "cut" effect layer.
 * `remove` holds closed contours in 0–1 of the layer box (what is INSIDE is taken away, even-odd, so a
 * rectangle plus a lasso removes the ring between them); `holes` are burn trails [x, y, r] with x, y in 0–1
 * and r in page px. Everything here is pure, so the gestures and the renderer share the same geometry.
 */
import { MAX_PATH_POINTS } from './brush.js';

export const CUT_EDGES = ['tesoura', 'picote', 'rasgado', 'queimado'];

const unitBox = [[0, 0], [1, 0], [1, 1], [0, 1]];

export function polygonArea(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/** Sutherland–Hodgman against one half-plane: keeps points with side(p) >= 0. */
function clipHalfPlane(poly, side) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/**
 * Splits a w × h sheet by the (infinite) line through two points, in the same units as the sheet.
 * Returns the two polygons and their areas, or null when the line does not really cross the sheet
 * (each part must be at least 1 % of it).
 */
export function splitByLine(box, line) {
  const { width: w, height: h } = box;
  const [[x1, y1], [x2, y2]] = line;
  const rect = [[0, 0], [w, 0], [w, h], [0, h]];
  const side = p => (x2 - x1) * (p[1] - y1) - (y2 - y1) * (p[0] - x1);
  const a = clipHalfPlane(rect, p => side(p));
  const b = clipHalfPlane(rect, p => -side(p));
  if (a.length < 3 || b.length < 3) return null;
  const areaA = polygonArea(a);
  const areaB = polygonArea(b);
  const total = w * h;
  if (areaA < total * 0.01 || areaB < total * 0.01) return null;
  return { a, b, areaA, areaB };
}

/** Which of the two parts goes by default: the smaller one. */
export function smallerPart(split) {
  return split.areaA <= split.areaB ? 'a' : 'b';
}

/** Page-space point → 0–1 inside a (possibly rotated) layer box. */
export function pointToUnit(point, box) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rad = -((box.rotation || 0) * Math.PI) / 180;
  const dx = point[0] - cx;
  const dy = point[1] - cy;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad) + box.width / 2;
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad) + box.height / 2;
  return [lx / box.width, ly / box.height];
}

/** A polygon in box pixels (0..w, 0..h) → 0–1 (rounded to keep documents small). */
export function toUnit(poly, w, h) {
  const r = v => Math.round(v * 10000) / 10000;
  return poly.map(([x, y]) => [r(x / w), r(y / h)]);
}

/** Lasso: everything OUTSIDE the closed trace is removed (the box contour plus the lasso, even-odd). */
export function lassoRemove(lassoUnit) {
  return [unitBox.map(p => [...p]), lassoUnit];
}

/** A rough triangle torn off a corner: 'nw' | 'ne' | 'se' | 'sw', `size` as a fraction of the box. */
export function cornerTear(corner, size, rand) {
  const s = Math.max(0.05, Math.min(0.6, size));
  const jag = () => (rand() - 0.5) * s * 0.25;
  const pts = {
    nw: [[0, 0], [s + jag(), 0], [s * 0.55 + jag(), s * 0.5 + jag()], [0, s + jag()]],
    ne: [[1, 0], [1, s + jag()], [1 - s * 0.5 + jag(), s * 0.55 + jag()], [1 - s - jag(), 0]],
    se: [[1, 1], [1 - s - jag(), 1], [1 - s * 0.55 + jag(), 1 - s * 0.5 + jag()], [1, 1 - s - jag()]],
    sw: [[0, 1], [0, 1 - s - jag()], [s * 0.5 + jag(), 1 - s * 0.55 + jag()], [s + jag(), 1]],
  };
  return [pts[corner] || pts.nw];
}

/** The corner of the box nearest to a unit-space point. */
export function nearestCorner(unit) {
  const [x, y] = unit;
  return `${y < 0.5 ? 'n' : 's'}${x < 0.5 ? 'w' : 'e'}`;
}

/**
 * Fire that spreads: a held flame at one spot grows its radius with time up to a maximum.
 * `speed` 0.2–2 scales the growth, in page px per second.
 */
export function flameRadius(baseRadius, heldSeconds, { speed = 1, max = baseRadius * 4 } = {}) {
  const r = baseRadius + heldSeconds * 38 * speed;
  return Math.min(max, Math.round(r * 10) / 10);
}

/** Builds the `effect` of a cut layer. */
export function cutEffect({ edge = 'tesoura', remove = [], holes = [], seed = 1, char = 0.5, fiber = 0.5 } = {}) {
  return {
    type: 'cut',
    amount: 1,
    seed,
    params: {},
    edge,
    remove,
    holes,
    char,
    fiber,
  };
}

export function cutPointCount(effect) {
  return (effect.remove || []).reduce((n, c) => n + c.length, 0) + (effect.holes || []).reduce((n, t) => n + t.length, 0);
}

/** Validation of a cut effect: returns an error message or null. */
export function cutError(effect, pageWidth = 4096, pageHeight = 4096) {
  if (!CUT_EDGES.includes(effect.edge)) return 'edge deve ser tesoura, picote, rasgado ou queimado.';
  if (!Array.isArray(effect.remove) || !Array.isArray(effect.holes)) return 'remove e holes devem ser listas.';
  if (!Number.isInteger(effect.seed)) return 'seed deve ser inteiro.';
  for (const key of ['char', 'fiber']) {
    if (typeof effect[key] !== 'number' || effect[key] < 0 || effect[key] > 1) return `${key} deve estar entre 0 e 1.`;
  }
  if (cutPointCount(effect) > MAX_PATH_POINTS) return `um corte aceita no máximo ${MAX_PATH_POINTS} pontos.`;
  for (const contour of effect.remove) {
    if (!Array.isArray(contour) || contour.length < 3) return 'cada contorno de remove precisa de ao menos 3 pontos.';
    for (const p of contour) {
      if (!Array.isArray(p) || p.length !== 2 || !p.every(n => typeof n === 'number' && Number.isFinite(n) && n >= -0.001 && n <= 1.001)) return 'pontos de remove devem ser [x, y] entre 0 e 1.';
    }
  }
  const maxRadius = Math.max(pageWidth, pageHeight) / 2;
  for (const trail of effect.holes) {
    if (!Array.isArray(trail) || !trail.length) return 'cada trilha de holes precisa de ao menos 1 ponto.';
    for (const p of trail) {
      if (!Array.isArray(p) || p.length !== 3 || !p.every(n => typeof n === 'number' && Number.isFinite(n))) return 'pontos de holes devem ser [x, y, raio].';
      if (p[0] < -0.001 || p[0] > 1.001 || p[1] < -0.001 || p[1] > 1.001) return 'x e y de holes devem estar entre 0 e 1.';
      if (p[2] <= 0 || p[2] > maxRadius) return 'o raio de holes deve ser positivo e no máximo metade da página.';
    }
  }
  return null;
}

/** A short stable hash of the geometry, for mask caches. */
export function cutHash(effect) {
  const text = JSON.stringify([effect.edge, effect.remove, effect.holes, effect.char, effect.fiber]);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${(hash >>> 0).toString(36)}.${text.length}`;
}
