import {
  splitByPath, chaikin, smallerPart, pointToUnit, toUnit, lassoRemove, cornerTear, nearestCorner, flameRadius,
} from '../domain/cut.js';
import { thinPoints } from '../domain/brush.js';
import { createRng, holePolygons } from '../render/handout-effects.js';

export const CUT_TOOLS = new Set(['scissors', 'tear', 'lighter']);

const clamp01 = v => Math.max(0, Math.min(1, v));
const newSeed = () => 1 + Math.floor(Math.random() * 99998);

function pointInPolygon([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Layer-box pixels → page coordinates (the box may be rotated about its centre). */
function boxToPage([x, y], box) {
  const rad = ((box.rotation || 0) * Math.PI) / 180;
  const dx = x - box.width / 2;
  const dy = y - box.height / 2;
  return [
    box.x + box.width / 2 + dx * Math.cos(rad) - dy * Math.sin(rad),
    box.y + box.height / 2 + dx * Math.sin(rad) + dy * Math.cos(rad),
  ];
}

/**
 * The cutting tools of the stage: scissors (a line, or a lasso with Alt), tearing (a fast drag, or a corner
 * with Alt) and the lighter (hold and pass the flame). A finished gesture goes out through `onCut` as a plain
 * description; the editor turns it into a "cut" layer. While the gesture is going on only this overlay
 * canvas is drawn; the document is rendered once, when the layer is born.
 */
/** Is there paper (any opaque pixel of the rendered page) at this page point? Without a map, assume yes. */
export function paperAt(map, [x, y]) {
  if (!map) return true;
  const px = Math.floor(x * map.k);
  const py = Math.floor(y * map.k);
  if (px < 0 || py < 0 || px >= map.width || py >= map.height) return false;
  return map.data[(py * map.width + px) * 4 + 3] > 24;
}

export function createCutTools({ pageWrap, getZoom, getHandout, getTool, getOptions, getTarget, onCut, onSound = () => {}, reducedMotion = () => false, getAlphaMap = () => null } = {}) {
  const overlay = document.createElement('canvas');
  overlay.className = 'stage-tool-overlay';
  overlay.style.display = 'none';
  pageWrap.appendChild(overlay);

  let gesture = null;
  let alphaMap = null;
  let chooser = null;
  let frame = 0;
  let glow = null;
  const embers = [];
  const smoke = [];

  function targetBox() {
    const handout = getHandout();
    const target = getTarget?.();
    return target || { id: null, name: 'a folha', x: 0, y: 0, width: handout.page.width, height: handout.page.height, rotation: 0 };
  }

  let pageRect = null;
  const pagePoint = event => {
    const rect = gesture?.kind === 'lighter' && pageRect ? pageRect : pageWrap.getBoundingClientRect();
    const zoom = getZoom();
    return [(event.clientX - rect.left) / zoom, (event.clientY - rect.top) / zoom];
  };

  function setup() {
    const handout = getHandout();
    const zoom = getZoom();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const pw = Math.round(handout.page.width * zoom * dpr);
    const ph = Math.round(handout.page.height * zoom * dpr);
    if (overlay.width !== pw || overlay.height !== ph) {
      overlay.width = pw;
      overlay.height = ph;
    }
    overlay.style.width = `${Math.round(handout.page.width * zoom)}px`;
    overlay.style.height = `${Math.round(handout.page.height * zoom)}px`;
    overlay.style.display = 'block';
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, pw, ph);
    return { ctx, k: zoom * dpr };
  }

  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    overlay.style.display = 'none';
    overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
    glow?.remove();
    glow = null;
    embers.length = 0;
    smoke.length = 0;
  }

  // --- drawing helpers (overlay only) -------------------------------------------------------------

  function tracePolygon(ctx, poly, k) {
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
    ctx.closePath();
  }

  /** The dashed line follows the whole trace of the hand, smoothed for the scissors and as shaky as it is for tearing. */
  function drawTrace(ctx, k, points, kind) {
    const trace = kind === 'scissors' ? chaikin(points.length > 200 ? points.filter((_, i) => i % 3 === 0) : points, 2) : points;
    const b = trace[trace.length - 1];
    const a = trace[Math.max(0, trace.length - 6)];
    ctx.save();
    ctx.setLineDash([10, 7]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f7f3e6';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    trace.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
    ctx.stroke();
    if (!reducedMotion() && (a[0] !== b[0] || a[1] !== b[1])) {
      // a little pair of scissors rides on the line, pointing the way it is cut
      ctx.setLineDash([]);
      ctx.translate(b[0] * k, b[1] * k);
      ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
      ctx.lineWidth = 2;
      const open = 0.35 + 0.25 * Math.sin(performance.now() / 70);
      for (const sign of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-14, sign * 5);
        ctx.lineTo(8, sign * open * 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-18, sign * 6, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawChooser(ctx, k) {
    const { split, target, pick } = chooser;
    const toPage = poly => poly.map(p => boxToPage(p, target));
    for (const part of ['a', 'b']) {
      const poly = toPage(split[part]);
      ctx.save();
      ctx.beginPath();
      tracePolygon(ctx, poly, k);
      if (part === pick) {
        ctx.fillStyle = 'rgba(10, 8, 12, 0.55)';
        ctx.fill();
        ctx.setLineDash([9, 6]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f7f3e6';
        ctx.stroke();
      } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(247, 243, 230, 0.35)';
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // --- the lighter ---------------------------------------------------------------------------------

  function drawFlame(ctx, k, x, y, now, tilt, size) {
    const flick = Math.sin(now / 53) * 0.5 + Math.sin(now / 31 + 1.7) * 0.35 + Math.sin(now / 97) * 0.4;
    const h = size * (2.6 + flick * 0.35) * k;
    const w = size * (1.05 + flick * 0.08) * k;
    ctx.save();
    ctx.translate(x * k, y * k);
    ctx.rotate(tilt);
    const grad = ctx.createLinearGradient(0, 0, 0, -h);
    grad.addColorStop(0, 'rgba(255, 250, 220, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 190, 70, 0.9)');
    grad.addColorStop(1, 'rgba(230, 70, 20, 0)');
    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.bezierCurveTo(-w * 0.7, -h * 0.35, -w * 0.15, -h * 0.65, flick * w * 0.15, -h);
    ctx.bezierCurveTo(w * 0.15, -h * 0.65, w * 0.7, -h * 0.35, w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function stepParticles(ctx, k, now, rimPoints) {
    if (rimPoints.length && embers.length < 60) {
      for (let i = 0; i < 3; i++) {
        const [x, y] = rimPoints[Math.floor(Math.random() * rimPoints.length)];
        embers.push({ x, y, born: now, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 18 });
      }
      if (smoke.length < 8 && Math.random() < 0.5) {
        const [x, y] = rimPoints[Math.floor(Math.random() * rimPoints.length)];
        smoke.push({ x, y, born: now, vx: (Math.random() - 0.5) * 6 });
      }
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      const age = (now - e.born) / 600;
      if (age >= 1) { embers.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(255, ${Math.round(150 - age * 90)}, 40, ${1 - age})`;
      ctx.beginPath();
      ctx.arc((e.x + e.vx * age) * k, (e.y + e.vy * age) * k, 1.6 * k * (1 - age * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i];
      const age = (now - s.born) / 1100;
      if (age >= 1) { smoke.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(200, 200, 200, ${0.16 * (1 - age)})`;
      ctx.beginPath();
      ctx.arc((s.x + s.vx * age) * k, (s.y - 38 * age) * k, (4 + age * 9) * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function trailUnits(g, target) {
    return g.trail.map(([x, y, r]) => [clamp01(x), clamp01(y), Math.round(r * 10) / 10]);
  }

  /** Two persistent canvases (rim and dark centre) hold the discs already burned; each frame only adds new ones. */
  function burnLayers(w, h) {
    const make = () => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    };
    return { rim: make(), dark: make(), committed: 0 };
  }

  function disc(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.fill();
  }

  /** Burns the segment from one trail point to the next as overlapping discs (page px → canvas px). */
  function burnSegment(layers, k, target, from, to) {
    const rim = layers.rim.getContext('2d');
    const dark = layers.dark.getContext('2d');
    const a = boxToPage([from[0] * target.width, from[1] * target.height], target);
    const b = to ? boxToPage([to[0] * target.width, to[1] * target.height], target) : a;
    const gap = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const r0 = from[2];
    const r1 = to ? to[2] : r0;
    const steps = to ? Math.min(40, Math.max(0, Math.floor(gap / Math.max(1, Math.min(r0, r1) * 0.5)))) : 0;
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / (steps + 1) : 0;
      const x = (a[0] + (b[0] - a[0]) * t) * k;
      const y = (a[1] + (b[1] - a[1]) * t) * k;
      const r = (r0 + (r1 - r0) * t) * k;
      disc(rim, x, y, r + 2.5 * k, '#ff8c28');
      disc(dark, x, y, r, '#080504');
    }
  }

  /** Work done per lighter frame (ms), for the performance test. */
  const frameTimes = [];

  function lighterFrame() {
    frame = requestAnimationFrame(lighterFrame);
    const g = gesture;
    if (!g || g.kind !== 'lighter' || !g.view) return;
    const now = performance.now();
    try { drawLighterFrame(g, now); } finally {
      frameTimes.push(performance.now() - now);
      if (frameTimes.length > 600) frameTimes.shift();
    }
  }

  function drawLighterFrame(g, now) {
    const options = getOptions();
    const base = options.flame;
    const held = (now - g.lastMove) / 1000;
    const radius = flameRadius(base, held, { speed: options.speed / 100 });
    const last = g.trail[g.trail.length - 1];
    if (last) last[2] = Math.max(last[2], radius);
    const { ctx, k, target, layers } = g.view;

    // Points that are no longer the last one are finished: they go to the persistent canvases once
    while (layers.committed < g.trail.length - 1) {
      burnSegment(layers, k, target, g.trail[layers.committed], g.trail[layers.committed + 1]);
      layers.committed++;
    }

    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.drawImage(layers.rim, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.drawImage(layers.dark, 0, 0);
    ctx.restore();
    // The point under the flame is still growing: drawn live on top
    if (last) {
      const p = boxToPage([last[0] * target.width, last[1] * target.height], target);
      disc(ctx, p[0] * k, p[1] * k, (last[2] + 2.5) * k, 'rgba(255, 140, 40, 0.8)');
      disc(ctx, p[0] * k, p[1] * k, last[2] * k, 'rgba(8, 5, 4, 0.78)');
    }
    if (!reducedMotion()) {
      const rim = last ? Array.from({ length: 3 }, () => {
        const p = boxToPage([last[0] * target.width, last[1] * target.height], target);
        const a = Math.random() * Math.PI * 2;
        return [p[0] + Math.cos(a) * last[2], p[1] + Math.sin(a) * last[2]];
      }) : [];
      stepParticles(ctx, k, now, rim);
      const dx = g.current[0] - g.prev[0];
      drawFlame(ctx, k, g.current[0], g.current[1], now, Math.max(-0.5, Math.min(0.5, -dx * 0.03)), base * 0.5 + 4);
      g.prev = [...g.current];
    }
  }

  function moveGlow(event) {
    if (reducedMotion()) return;
    if (!glow) {
      glow = document.createElement('div');
      glow.className = 'stage-flame-glow';
      document.body.appendChild(glow);
    }
    glow.style.transform = `translate3d(${event.clientX - 160}px, ${event.clientY - 160}px, 0)`;
  }

  // --- gestures -----------------------------------------------------------------------------------------

  function localPx(point, target) {
    const [ux, uy] = pointToUnit(point, target);
    return [ux * target.width, uy * target.height];
  }

  function finishLine(g, straight = false) {
    const target = targetBox();
    let length = 0;
    for (let i = 1; i < g.points.length; i++) length += Math.hypot(g.points[i][0] - g.points[i - 1][0], g.points[i][1] - g.points[i - 1][1]);
    if (length < 12) return;
    // The cut follows the hand: Alt+Shift at the end straightens it into a line
    const local = thinPoints(g.points.map(p => [...localPx(p, target), 0.5]), 2.5).map(p => [p[0], p[1]]);
    let path = straight ? [local[0], local[local.length - 1]] : local;
    if (g.kind === 'scissors' && !straight) path = chaikin(path, 2);
    const split = splitByPath({ width: target.width, height: target.height }, path);
    if (!split) return;
    const seconds = Math.max(0.05, (performance.now() - g.t0) / 1000);
    const speed = length / seconds;
    chooser = { split, target, pick: smallerPart(split), kind: g.kind, picote: g.picote, speed, length };
    const { ctx, k } = setup();
    drawChooser(ctx, k);
    listenKeys();
  }

  function confirm(part) {
    if (!chooser) return;
    const { split, target, kind, picote, speed } = chooser;
    chooser = null;
    unlistenKeys();
    const options = getOptions();
    const poly = toUnit(split[part], target.width, target.height);
    const edge = kind === 'tear' ? 'rasgado' : picote ? 'picote' : 'tesoura';
    // The faster the gesture, the rougher the torn edge and the more fibre shows
    const quick = Math.max(0.15, Math.min(1, (speed - 200) / 1400));
    onCut({
      type: 'cut', edge, remove: [poly], target, seed: newSeed(),
      rough: kind === 'tear' ? Math.min(1, (options.rough / 100) * 0.6 + quick * 0.5) : 0.5,
      fiber: kind === 'tear' ? quick : 0.5,
      removedPage: split[part].map(p => boxToPage(p, target)),
    });
    onSound(kind === 'tear' ? 'paper-tear' : 'scissors', { speed });
    clear();
  }

  function cancel() {
    chooser = null;
    unlistenKeys();
    clear();
  }

  function onKey(event) {
    if (!chooser) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      confirm(chooser.pick);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  }

  function listenKeys() { document.addEventListener('keydown', onKey, true); }
  function unlistenKeys() { document.removeEventListener('keydown', onKey, true); }

  function finishLasso(g) {
    const target = targetBox();
    const trace = thinPoints(g.points.map(p => [p[0], p[1], 0.5]), 3);
    if (trace.length < 5) return;
    const lasso = toUnit(trace.map(p => localPx([p[0], p[1]], target)), target.width, target.height)
      .map(([x, y]) => [clamp01(x), clamp01(y)]);
    onCut({ type: 'cut', edge: g.picote ? 'picote' : 'tesoura', remove: lassoRemove(lasso), target, seed: newSeed(), rough: 0.5, fiber: 0.5, lasso: true });
    onSound('scissors', {});
  }

  function finishCorner(g) {
    const target = targetBox();
    const unit = pointToUnit(g.start, target);
    const corner = nearestCorner(unit);
    const cornerPx = { nw: [0, 0], ne: [target.width, 0], se: [target.width, target.height], sw: [0, target.height] }[corner];
    const here = localPx(g.current, target);
    const size = Math.hypot(here[0] - cornerPx[0], here[1] - cornerPx[1]) / Math.min(target.width, target.height);
    if (size < 0.06) return;
    const seed = newSeed();
    const rand = createRng(seed);
    onCut({ type: 'cut', edge: 'rasgado', remove: cornerTear(corner, size, rand), target, seed, rough: 0.8, fiber: 0.8 });
    onSound('paper-tear', { speed: 500 });
  }

  function finishLighter(g) {
    onSound('burn', { on: false });
    cancelAnimationFrame(frame);
    const target = targetBox();
    const options = getOptions();
    if (g.trail.length) {
      onCut({
        type: 'burn', trail: trailUnits(g, target), target, seed: newSeed(),
        char: options.char / 100, appendTo: g.appendTo,
      });
    }
  }

  function down(event) {
    const tool = getTool();
    if (!CUT_TOOLS.has(tool) || event.button !== 0 || !getHandout()) return;
    if (event.target.closest('.stage-selection-bar, .stage-inline-text-editor')) return;
    event.preventDefault();
    event.stopPropagation();

    if (chooser) {
      const local = localPx(pagePoint(event), chooser.target);
      if (pointInPolygon(local, chooser.split.a)) confirm('a');
      else if (pointInPolygon(local, chooser.split.b)) confirm('b');
      else cancel();
      return;
    }

    const start = pagePoint(event);
    if (tool === 'lighter') {
      // The flame has nothing to burn on the desk or on paper that is already gone
      alphaMap = getAlphaMap();
      if (!paperAt(alphaMap, start)) return;
    }
    try { pageWrap.setPointerCapture(event.pointerId); } catch {}
    const now = performance.now();
    gesture = {
      kind: tool, pointerId: event.pointerId, start, current: start, prev: start, t0: now, lastMove: now,
      alt: event.altKey, picote: event.shiftKey || getOptions().picote, points: [start], lastSound: 0,
      trail: [], seed: newSeed(), appendTo: null,
    };
    if (tool === 'lighter') {
      const target = targetBox();
      const [ux, uy] = pointToUnit(start, target);
      gesture.trail.push([clamp01(ux), clamp01(uy), getOptions().flame]);
      gesture.appendTo = event.shiftKey ? 'selected' : null;
      const view = setup();
      gesture.view = { ...view, target, layers: burnLayers(overlay.width, overlay.height) };
      pageRect = pageWrap.getBoundingClientRect();
      onSound('lighter', {});
      onSound('burn', { on: true });
      moveGlow(event);
      frame = requestAnimationFrame(lighterFrame);
    }
  }

  function move(event) {
    const g = gesture;
    if (!g || event.pointerId !== g.pointerId) return;
    const point = pagePoint(event);
    g.current = point;
    if (g.kind === 'lighter') {
      moveGlow(event);
      const lastUnit = g.trail[g.trail.length - 1];
      const target = targetBox();
      const [ux, uy] = pointToUnit(point, target);
      const dist = Math.hypot((ux - lastUnit[0]) * target.width, (uy - lastUnit[1]) * target.height);
      // Moving the hand at all stops the fire from spreading; only paper receives a burn point
      if (Math.hypot(point[0] - (g.lastPointer?.[0] ?? g.start[0]), point[1] - (g.lastPointer?.[1] ?? g.start[1])) >= 2) {
        g.lastMove = performance.now();
        g.lastPointer = point;
      }
      if (dist >= 2 && paperAt(alphaMap, point)) {
        g.trail.push([clamp01(ux), clamp01(uy), getOptions().flame]);
      }
      return;
    }
    g.points.push(point);
    const dist = Math.hypot(point[0] - g.start[0], point[1] - g.start[1]);
    if (g.kind === 'scissors' && dist - g.lastSound > 40) {
      g.lastSound = dist;
      onSound('scissors', {});
    }
    const { ctx, k } = setup();
    if (g.kind === 'scissors' && g.alt) {
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f7f3e6';
      ctx.beginPath();
      g.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    } else if (g.kind === 'tear' && g.alt) {
      ctx.save();
      ctx.strokeStyle = '#f7f3e6';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.current[0] * k, g.current[1] * k, 6 * k, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      drawTrace(ctx, k, g.points, g.kind);
    }
  }

  function up(event) {
    const g = gesture;
    if (!g || event.pointerId !== g.pointerId) return;
    gesture = null;
    try { pageWrap.releasePointerCapture(g.pointerId); } catch {}
    if (g.kind === 'lighter') {
      finishLighter(g);
      clear();
    } else if (g.kind === 'scissors' && g.alt) {
      finishLasso(g);
      clear();
    } else if (g.kind === 'tear' && g.alt) {
      finishCorner(g);
      clear();
    } else {
      finishLine(g, event.altKey && event.shiftKey && !g.alt);
      if (!chooser) clear();
    }
  }

  pageWrap.addEventListener('pointerdown', down, true);
  pageWrap.addEventListener('pointermove', move);
  pageWrap.addEventListener('pointerup', up);
  pageWrap.addEventListener('pointercancel', up);

  return {
    isChoosing: () => Boolean(chooser),
    frameStats() {
      const sorted = [...frameTimes].sort((a, b) => a - b);
      return { count: sorted.length, median: sorted[Math.floor(sorted.length / 2)] ?? 0, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0, max: sorted.at(-1) ?? 0 };
    },
    clearStats() { frameTimes.length = 0; },
    cancel,
    /** Leaving the tool drops a half-made gesture. */
    reset() {
      gesture = null;
      onSound('burn', { on: false });
      cancel();
    },
  };
}

