import { strokesOf, pressureFactor, DEFAULT_GRAIN } from '../domain/brush.js';
import { mulberry32, valueNoise2D, fbm } from '../domain/noise.js';

/**
 * Textured brush tips, rasterized in software into an 8-bit coverage buffer.
 * Pure and deterministic (seeded noise only), so screen, baking worker and the Node tests all agree.
 * Strokes are stamped with "max" coverage, so overlaps inside one layer never build up (marker).
 * Grain is measured in page pixels (canvas px ÷ scale) from the stroke's first point: zoom and
 * export size change the sharpness, not the grain size, and growing the box while drawing does not move it.
 */

export const RASTER_PIXEL_LIMIT = 24e6;
export const TEXTURED_KINDS = new Set(['pencil', 'chalk', 'nib', 'drybrush', 'marker']);

const clamp01 = v => Math.max(0, Math.min(1, v));
const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Dense samples along the same quadratic smoothing `drawSmooth` uses. Coordinates in canvas px. */
export function sampleStroke(pts, spacing) {
  const out = { x: [], y: [], p: [], s: [], tx: [], ty: [] };
  const push = (x, y, p) => {
    const n = out.x.length;
    let s = 0;
    let tx = 1;
    let ty = 0;
    if (n) {
      const dx = x - out.x[n - 1];
      const dy = y - out.y[n - 1];
      const d = Math.hypot(dx, dy);
      if (d < 1e-6) return;
      s = out.s[n - 1] + d;
      tx = dx / d;
      ty = dy / d;
      if (n === 1) { out.tx[0] = tx; out.ty[0] = ty; }
    }
    out.x.push(x); out.y.push(y); out.p.push(p); out.s.push(s); out.tx.push(tx); out.ty.push(ty);
  };
  if (pts.length === 1) {
    push(pts[0][0], pts[0][1], pts[0][2] ?? 0.5);
    return out;
  }
  let from = pts[0];
  let fromP = pts[0][2] ?? 0.5;
  push(from[0], from[1], fromP);
  for (let i = 1; i < pts.length; i++) {
    const cur = pts[i];
    const next = pts[i + 1];
    const to = next ? [(cur[0] + next[0]) / 2, (cur[1] + next[1]) / 2] : cur;
    const curP = cur[2] ?? 0.5;
    const len = Math.hypot(cur[0] - from[0], cur[1] - from[1]) + Math.hypot(to[0] - cur[0], to[1] - cur[1]);
    const steps = Math.max(1, Math.ceil(len / spacing));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const u = 1 - t;
      push(
        u * u * from[0] + 2 * u * t * cur[0] + t * t * to[0],
        u * u * from[1] + 2 * u * t * cur[1] + t * t * to[1],
        fromP + (curP - fromP) * t,
      );
    }
    from = to;
    fromP = curP;
  }
  return out;
}

function stampDisc(cov, W, H, cx, cy, r, alpha) {
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const x1 = Math.min(W - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const y1 = Math.min(H - 1, Math.ceil(cy + r + 1));
  for (let y = y0; y <= y1; y++) {
    const row = y * W;
    for (let x = x0; x <= x1; x++) {
      const c = clamp01(r - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + 0.5) * alpha;
      if (c > cov[row + x]) cov[row + x] = c;
    }
  }
}

/** Fills a convex quad (a, b, c, d in order) with an anti-aliased edge. Concave or empty quads are skipped. */
function fillQuad(cov, W, H, q, alpha) {
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    area += a[0] * b[1] - b[0] * a[1];
  }
  if (Math.abs(area) < 1e-3) return;
  const sign = area > 0 ? 1 : -1;
  const edges = [];
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const c = q[(i + 2) % 4];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    if (len < 1e-6) continue;
    // inward normal of the edge for a quad wound `sign`
    const nx = (-ey / len) * sign;
    const ny = (ex / len) * sign;
    // convexity: the next vertex must lie on the inner side
    if ((c[0] - a[0]) * nx + (c[1] - a[1]) * ny < -1e-6) return;
    edges.push([a[0], a[1], nx, ny]);
  }
  if (edges.length < 3) return;
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const [x, y] of q) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const x0 = Math.max(0, Math.floor(minX - 1));
  const x1 = Math.min(W - 1, Math.ceil(maxX + 1));
  const y0 = Math.max(0, Math.floor(minY - 1));
  const y1 = Math.min(H - 1, Math.ceil(maxY + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let d = Infinity;
      for (const [ax, ay, nx, ny] of edges) {
        const v = (x + 0.5 - ax) * nx + (y + 0.5 - ay) * ny;
        if (v < d) d = v;
      }
      const c = clamp01(d + 0.5) * alpha;
      if (c > cov[y * W + x]) cov[y * W + x] = c;
    }
  }
}

/**
 * A flat nib stamped along the samples: wide across the nib and as thin as `thickness` along it.
 * Consecutive stamps are closer than the thickness, so each stamp's anti-aliased edge falls inside its neighbour
 * and no seams show.
 */
function stampNib(cov, W, H, sm, { angle, halfOf, thickness }) {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const mx = (-uy * thickness) / 2;
  const my = (ux * thickness) / 2;
  for (let i = 0; i < sm.x.length; i++) {
    const h = halfOf(sm.p[i]);
    const px = sm.x[i];
    const py = sm.y[i];
    fillQuad(cov, W, H, [
      [px - ux * h - mx, py - uy * h - my], [px + ux * h - mx, py + uy * h - my],
      [px + ux * h + mx, py + uy * h + my], [px - ux * h + mx, py - uy * h + my],
    ], 255);
  }
}

function applyGrain(cov, W, H, { seed, grain, size, originX, originY, scale, soft = 0.1 }) {
  if (grain <= 0) return;
  const noise = valueNoise2D(seed);
  const k = 1 / (scale * size);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = cov[i];
      if (!a) continue;
      const n = clamp01((fbm(noise, (x - originX) * k, (y - originY) * k, { octaves: 2 }) - 0.5) * 2.4 + 0.5);
      // pressed harder (more alpha) → fewer holes
      const theta = grain * (1.15 - 0.65 * (a / 255));
      cov[i] = a * smoothstep(theta - soft, theta + soft, n);
    }
  }
}

/**
 * Coverage of a path shape drawn with a textured tip in a box of w × h canvas px.
 * Returns { width, height, data } (data: Uint8ClampedArray of alpha), or null when there is nothing to draw
 * or the box is too large for the software raster.
 */
export function brushCoverage(shape, w, h, scale) {
  const kind = shape?.brush?.kind;
  if (!TEXTURED_KINDS.has(kind) || !(shape.strokeWidth > 0) || !shape.points?.length) return null;
  const W = Math.max(1, Math.ceil(w));
  const H = Math.max(1, Math.ceil(h));
  if (W * H > RASTER_PIXEL_LIMIT) return null;
  const grain = clamp01(shape.brush.grain ?? DEFAULT_GRAIN);
  const seed = shape.brush.seed ?? 1;
  const base = shape.strokeWidth * scale;
  const cov = new Uint8ClampedArray(W * H);
  const noise = valueNoise2D(seed + 17);
  const first = shape.points.find(Boolean);
  const originX = first[0] * w;
  const originY = first[1] * h;
  const toPage = px => px / scale;

  strokesOf(shape.points).forEach((stroke, strokeIndex) => {
    const pts = stroke.map(p => [p[0] * w, p[1] * h, p[2]]);
    const nibThickness = kind === 'nib' ? Math.max(1, base * 0.12) : Math.max(1, base * 0.3);
    const spacing = kind === 'nib' || kind === 'marker' ? Math.max(0.4, nibThickness / 2.5) : Math.max(0.75, base * 0.12);
    const sm = sampleStroke(pts, kind === 'drybrush' ? Math.max(0.5, (base / 12)) : spacing);

    if (kind === 'pencil' || kind === 'chalk') {
      const amp = kind === 'pencil' ? 0.15 : 0.35;
      for (let i = 0; i < sm.x.length; i++) {
        const wobble = 1 + amp * (fbm(noise, toPage(sm.s[i]) * 0.07 + strokeIndex * 31, 0.5, { octaves: 3 }) - 0.5) * 2;
        const r = Math.max(0.5, (base * pressureFactor(sm.p[i]) * wobble) / 2);
        // light touch → lighter mark, not only a thinner one
        const alpha = kind === 'pencil'
          ? 255 * clamp01(0.3 + sm.p[i] * 1.1)
          : 255 * clamp01(0.7 + (sm.p[i] - 0.5) * 0.6);
        stampDisc(cov, W, H, sm.x[i], sm.y[i], r, alpha);
      }
    } else if (kind === 'nib') {
      stampNib(cov, W, H, sm, {
        angle: (-40 * Math.PI) / 180,
        halfOf: p => Math.max(0.5, (base * pressureFactor(p)) / 2),
        thickness: nibThickness,
      });
    } else if (kind === 'marker') {
      stampNib(cov, W, H, sm, {
        angle: (-45 * Math.PI) / 180,
        halfOf: () => Math.max(0.5, base / 2),
        thickness: nibThickness,
      });
    } else if (kind === 'drybrush') {
      const rand = mulberry32(seed * 7 + strokeIndex * 101);
      const count = 5 + Math.floor(rand() * 5);
      const bristles = Array.from({ length: count }, (_, i) => ({
        lateral: ((i + 0.5) / count - 0.5 + (rand() - 0.5) * (0.5 / count)) * 2,
        wavelength: 10 + rand() * 22,
        noiseSeed: seed * 13 + i * 977 + strokeIndex,
        phase: rand() * 100,
        radius: Math.max(0.5, (base / count) * (0.55 + rand() * 0.3)),
      }));
      const gaps = bristles.map(b => valueNoise2D(b.noiseSeed));
      const drift = valueNoise2D(seed + 5);
      const threshold = 0.05 + grain * 0.4;
      for (let i = 0; i < sm.x.length; i++) {
        const spread = (base * pressureFactor(sm.p[i])) / 2;
        const nx = -sm.ty[i];
        const ny = sm.tx[i];
        const sPage = toPage(sm.s[i]);
        bristles.forEach((b, bi) => {
          const lat = (b.lateral + (drift(sPage / 45 + b.phase, bi * 1.7) - 0.5) * 0.18) * spread;
          const present = smoothstep(threshold - 0.06, threshold + 0.06, gaps[bi](sPage / b.wavelength + b.phase, bi * 3.1));
          if (present > 0.02) stampDisc(cov, W, H, sm.x[i] + nx * lat, sm.y[i] + ny * lat, b.radius, 255 * present);
        });
      }
    }
  });

  if (kind === 'pencil' || kind === 'chalk' || kind === 'marker') {
    // the marker only gets a light felt-tip texture; being flat colour, its overlaps stay even
    applyGrain(cov, W, H, {
      seed, scale, originX, originY,
      grain: kind === 'marker' ? grain * 0.4 : kind === 'pencil' ? grain * 0.6 : grain,
      soft: kind === 'pencil' ? 0.35 : 0.1,
      size: kind === 'pencil' ? 1.2 : kind === 'chalk' ? 3.2 : 1.6,
    });
  }
  return { width: W, height: H, data: cov };
}
