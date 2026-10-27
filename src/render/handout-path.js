import { strokesOf, pressureFactor } from '../domain/brush.js';

/**
 * Draws the brush strokes of a `path` shape centred on (0, 0), in a box of w × h canvas pixels.
 * Each stroke is smoothed with quadratic curves through the midpoints between points,
 * and each curve piece is as wide as the pressure there says.
 */
export function drawPathShape(ctx, shape, w, h, scale) {
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
