import {
  splitByLine, smallerPart, pointToUnit, toUnit, lassoRemove, cornerTear, nearestCorner, flameRadius,
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
export function createCutTools({ pageWrap, getZoom, getHandout, getTool, getOptions, getTarget, onCut, onSound = () => {}, reducedMotion = () => false } = {}) {
  const overlay = document.createElement('canvas');
  overlay.className = 'stage-tool-overlay';
  overlay.style.display = 'none';
  pageWrap.appendChild(overlay);

  let gesture = null;
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

  const pagePoint = event => {
    const rect = pageWrap.getBoundingClientRect();
    const zoom = getZoom();
    return [(event.clientX - rect.left) / zoom, (event.clientY - rect.top) / zoom];
  };

  function setup() {
    const handout = getHandout();
    const zoom = getZoom();
    const dpr = window.devicePixelRatio || 1;
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

  function drawScissorLine(ctx, k, a, b) {
    ctx.save();
    ctx.setLineDash([10, 7]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f7f3e6';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(a[0] * k, a[1] * k);
    ctx.lineTo(b[0] * k, b[1] * k);
    ctx.stroke();
    if (!reducedMotion()) {
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
    if (rimPoints.length && embers.length < 140) {
      for (let i = 0; i < 3; i++) {
        const [x, y] = rimPoints[Math.floor(Math.random() * rimPoints.length)];
        embers.push({ x, y, born: now, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 18 });
      }
      if (smoke.length < 18 && Math.random() < 0.5) {
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

  function lighterFrame() {
    frame = requestAnimationFrame(lighterFrame);
    const g = gesture;
    if (!g || g.kind !== 'lighter') return;
    const now = performance.now();
    const options = getOptions();
    const base = options.flame;
    const held = (now - g.lastMove) / 1000;
    const radius = flameRadius(base, held, { speed: options.speed / 100 });
    const last = g.trail[g.trail.length - 1];
    if (last) last[2] = Math.max(last[2], radius);
    const { ctx, k } = setup();
    const target = targetBox();
    const effectLike = { remove: [], holes: g.trail.map(([x, y, r]) => [[x, y, r]]).length ? [g.trail] : [], seed: g.seed };
    const polys = holePolygons(effectLike.holes, target.width, target.height, g.seed, 1);
    const toPage = poly => poly.map(p => boxToPage(p, target));
    ctx.save();
    ctx.beginPath();
    for (const poly of polys) tracePolygon(ctx, toPage(poly), k);
    ctx.fillStyle = 'rgba(8, 5, 4, 0.62)';
    ctx.fill();
    ctx.lineWidth = 3 * k;
    ctx.strokeStyle = 'rgba(255, 140, 40, 0.75)';
    ctx.stroke();
    ctx.restore();
    if (!reducedMotion()) {
      const rim = polys.slice(-8).flatMap(poly => toPage(poly).filter((_, i) => i % 4 === 0));
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
    glow.style.transform = `translate(${event.clientX - 220}px, ${event.clientY - 220}px)`;
  }

  // --- gestures -----------------------------------------------------------------------------------------

  function localPx(point, target) {
    const [ux, uy] = pointToUnit(point, target);
    return [ux * target.width, uy * target.height];
  }

  function finishLine(g) {
    const target = targetBox();
    const length = Math.hypot(g.current[0] - g.start[0], g.current[1] - g.start[1]);
    if (length < 12) return;
    const split = splitByLine({ width: target.width, height: target.height }, [localPx(g.start, target), localPx(g.current, target)]);
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

    try { pageWrap.setPointerCapture(event.pointerId); } catch {}
    const start = pagePoint(event);
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
      if (dist >= 2) {
        g.trail.push([clamp01(ux), clamp01(uy), getOptions().flame]);
        g.lastMove = performance.now();
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
      drawScissorLine(ctx, k, g.start, g.current);
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
      finishLine(g);
      if (!chooser) clear();
    }
  }

  pageWrap.addEventListener('pointerdown', down, true);
  pageWrap.addEventListener('pointermove', move);
  pageWrap.addEventListener('pointerup', up);
  pageWrap.addEventListener('pointercancel', up);

  return {
    isChoosing: () => Boolean(chooser),
    cancel,
    /** Leaving the tool drops a half-made gesture. */
    reset() {
      gesture = null;
      onSound('burn', { on: false });
      cancel();
    },
  };
}

