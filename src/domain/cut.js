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

/** Chaikin corner cutting: rounds a hand-drawn trace (each pass replaces every corner by two points). */
export function chaikin(points, passes = 2) {
  let pts = points;
  for (let pass = 0; pass < passes && pts.length > 2; pass++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      next.push([x1 * 0.75 + x2 * 0.25, y1 * 0.75 + y2 * 0.25], [x1 * 0.25 + x2 * 0.75, y1 * 0.25 + y2 * 0.75]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

/** Where the segment a→b first hits segment c→d, as a fraction along a→b, or null. */
function segmentCrossing(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]];
  const q = [d[0] - c[0], d[1] - c[1]];
  const denom = r[0] * q[1] - r[1] * q[0];
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((c[0] - a[0]) * q[1] - (c[1] - a[1]) * q[0]) / denom;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / denom;
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6 ? t : null;
}

/** The trace up to the first time it crosses itself (the crossing point closes it). */
export function truncateAtSelfCrossing(path) {
  for (let i = 1; i < path.length; i++) {
    for (let j = 0; j < i - 1; j++) {
      const t = segmentCrossing(path[i - 1], path[i], path[j], path[j + 1]);
      if (t !== null) {
        const a = path[i - 1];
        const b = path[i];
        return [...path.slice(0, i), [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]];
      }
    }
  }
  return path;
}

/** Ray from `from` along `dir` until it leaves the w × h rectangle (from inside or on its edge). */
function rayToBoundary(from, dir, w, h) {
  let best = Infinity;
  const candidates = [];
  if (dir[0] > 1e-9) candidates.push((w - from[0]) / dir[0]);
  if (dir[0] < -1e-9) candidates.push((0 - from[0]) / dir[0]);
  if (dir[1] > 1e-9) candidates.push((h - from[1]) / dir[1]);
  if (dir[1] < -1e-9) candidates.push((0 - from[1]) / dir[1]);
  for (const t of candidates) if (t >= 0 && t < best) best = t;
  return Number.isFinite(best) ? [from[0] + dir[0] * best, from[1] + dir[1] * best] : null;
}

/** Part of the segment a→b inside the rectangle as [tEnter, tLeave] (Liang–Barsky), or null. */
function clipSegment(a, b, w, h) {
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0]], [dx, w - a[0]], [-dy, a[1]], [dy, h - a[1]]]) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return null;
    } else {
      const r = q / p;
      if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
  }
  return t0 <= t1 ? [t0, t1] : null;
}

/** Position of a point of the rectangle's boundary, measured clockwise from the top-left corner. */
function boundaryPosition([x, y], w, h) {
  const eps = 1e-6 * Math.max(w, h);
  if (Math.abs(y) <= eps) return x;
  if (Math.abs(x - w) <= eps) return w + y;
  if (Math.abs(y - h) <= eps) return w + h + (w - x);
  return 2 * w + h + (h - y);
}

/**
 * Splits a w × h sheet along a hand-drawn trace (points in the sheet's own units). The trace is cut to the
 * sheet, its two ends are carried straight on (along the way the hand was going) until they leave it, and the
 * two parts come back as polygons that follow the trace exactly. A trace that crosses itself stops there.
 * Returns { a, b, areaA, areaB, path } or null when it does not really divide the sheet (each part ≥ 1 %).
 */
export function splitByPath(box, rawPath) {
  const { width: w, height: h } = box;
  let path = truncateAtSelfCrossing(rawPath.filter((p, i) => i === 0 || p[0] !== rawPath[i - 1][0] || p[1] !== rawPath[i - 1][1]));
  if (path.length < 2) return null;

  // Keep the part inside the sheet, from the first entry to the last exit
  let entry = null;
  let exit = null;
  const inside = [];
  for (let i = 0; i < path.length - 1; i++) {
    const clip = clipSegment(path[i], path[i + 1], w, h);
    if (!clip) continue;
    const [t0, t1] = clip;
    const a = path[i];
    const b = path[i + 1];
    const at = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    if (!entry) { entry = { point: at(t0), index: i, enteredInside: t0 === 0 && i === 0 }; inside.push(at(t0)); }
    if (t1 < 1 || i === path.length - 2) exit = { point: at(t1), leftInside: t1 === 1 && i === path.length - 2 };
    if (t1 < 1) { inside.push(at(t1)); break; }
    inside.push(b);
  }
  if (!entry || inside.length < 2) return null;
  const trace = inside.filter((p, i) => i === 0 || Math.hypot(p[0] - inside[i - 1][0], p[1] - inside[i - 1][1]) > 1e-9);
  if (trace.length < 2) return null;

  const back = Math.min(trace.length - 1, 4);
  const first = trace[0];
  const last = trace.at(-1);
  const startsInside = entry.enteredInside && first[0] > 1e-6 && first[0] < w - 1e-6 && first[1] > 1e-6 && first[1] < h - 1e-6;
  const endsInside = exit.leftInside && last[0] > 1e-6 && last[0] < w - 1e-6 && last[1] > 1e-6 && last[1] < h - 1e-6;
  const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const cut = trace.slice();
  if (startsInside) {
    const e = rayToBoundary(first, norm([first[0] - trace[back][0], first[1] - trace[back][1]]), w, h);
    if (e) cut.unshift(e);
  }
  if (endsInside) {
    const e = rayToBoundary(last, norm([last[0] - trace[trace.length - 1 - back][0], last[1] - trace[trace.length - 1 - back][1]]), w, h);
    if (e) cut.push(e);
  }

  const L = 2 * (w + h);
  const start = cut[0];
  const end = cut.at(-1);
  const pa = boundaryPosition(start, w, h);
  const pb = boundaryPosition(end, w, h);
  const corners = [[0, [0, 0]], [w, [w, 0]], [w + h, [w, h]], [2 * w + h, [0, h]]];
  // Corners met going clockwise from `from` to `to`
  const clockwise = (from, to) => {
    const span = (to - from + L) % L;
    return corners
      .map(([pos, pt]) => ({ d: (pos - from + L) % L, pt }))
      .filter(c => c.d > 1e-9 && c.d < span - 1e-9)
      .sort((x, y) => x.d - y.d)
      .map(c => c.pt);
  };
  const counter = (from, to) => clockwise(to, from).reverse();
  const a = [...cut, ...clockwise(pb, pa)];
  const b = [...cut, ...counter(pb, pa)];
  if (a.length < 3 || b.length < 3) return null;
  const areaA = polygonArea(a);
  const areaB = polygonArea(b);
  const total = w * h;
  if (areaA < total * 0.01 || areaB < total * 0.01 || Math.abs(areaA + areaB - total) > total * 0.02) return null;
  return { a, b, areaA, areaB, path: cut };
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
