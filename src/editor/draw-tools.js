import { renderIcon } from '../ui/icons.js';
import { drawPathShape } from '../render/handout-path.js';
import { thinPoints, normalizeStroke, BRUSH_KINDS, brushInfo, newBrushSeed, stabilize, stabilizerRadius } from '../domain/brush.js';

export const TOOLS = [
  { id: 'select', label: 'Selecionar', icon: 'cursor', shortcut: 'tool-select' },
  { id: 'text', label: 'Texto', icon: 'text', shortcut: 'tool-text' },
  { id: 'brush', label: 'Pincel', icon: 'brush', shortcut: 'tool-brush' },
  { id: 'rect', label: 'Retângulo', icon: 'rect', shortcut: 'tool-rect' },
  { id: 'ellipse', label: 'Elipse', icon: 'ellipse', shortcut: 'tool-ellipse' },
  { id: 'line', label: 'Linha', icon: 'line', shortcut: 'tool-line' },
  { id: 'scissors', label: 'Tesoura', icon: 'scissors', shortcut: 'tool-scissors' },
  { id: 'tear', label: 'Rasgar', icon: 'tear', shortcut: 'tool-tear' },
  { id: 'lighter', label: 'Isqueiro', icon: 'lighter', shortcut: 'tool-lighter' },
];

const CUT_IDS = new Set(['scissors', 'tear', 'lighter']);

const OPTIONS_KEY = 'atelie-tool-options';
const DEFAULT_OPTIONS = { color: '#1d1b24', width: 6, opacity: 100, fill: false, picote: false, rough: 50, flame: 14, speed: 100, char: 50, brush: 'pen', grain: 50, brushes: {}, smooth: 0 };

function loadOptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OPTIONS_KEY) || 'null');
    const merged = { ...DEFAULT_OPTIONS, ...(parsed || {}) };
    if (!BRUSH_KINDS.some(k => k.id === merged.brush)) merged.brush = 'pen';
    if (!merged.brushes || typeof merged.brushes !== 'object') merged.brushes = {};
    return merged;
  } catch {
    return { ...DEFAULT_OPTIONS, brushes: {} };
  }
}

/** Box of a rect/ellipse dragged from `a` to `b`; Shift (square) makes it 1:1. */
export function dragBox(a, b, { square = false } = {}) {
  let dx = b[0] - a[0];
  let dy = b[1] - a[1];
  if (square) {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * size;
    dy = Math.sign(dy || 1) * size;
  }
  return {
    x: Math.round(Math.min(a[0], a[0] + dx)),
    y: Math.round(Math.min(a[1], a[1] + dy)),
    width: Math.round(Math.abs(dx)),
    height: Math.round(Math.abs(dy)),
  };
}

/** Line dragged from `a` to `b` as a horizontal layer box plus rotation; Shift snaps the angle to 45°. */
export function lineBox(a, b, { snap = false, thickness = 2 } = {}) {
  let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  if (snap) angle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const end = [a[0] + Math.cos(angle) * length, a[1] + Math.sin(angle) * length];
  const cx = (a[0] + end[0]) / 2;
  const cy = (a[1] + end[1]) / 2;
  const height = Math.max(2, thickness);
  const degrees = (((angle * 180) / Math.PI) % 360 + 360) % 360;
  return {
    x: Math.round((cx - length / 2) * 100) / 100,
    y: Math.round((cy - height / 2) * 100) / 100,
    width: Math.round(length * 100) / 100,
    height,
    rotation: Math.round(degrees * 100) / 100,
  };
}

/**
 * The drawing tools of the stage: a vertical bar on the left, an options strip while a tool is active,
 * and the pointer gestures. Finished gestures go out through `onDraw` as plain descriptions.
 */
export function createDrawTools(container, { viewport, pageWrap, getZoom, getHandout, getSelectedLayer, onDraw, onToolChange, shortcutLabel = () => '' } = {}) {
  let tool = 'select';
  const options = loadOptions();
  let gesture = null;
  let targetLabel = 'a folha';
  let previewFrame = 0;

  const bar = document.createElement('div');
  bar.className = 'stage-tools';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Ferramentas');
  const strip = document.createElement('div');
  strip.className = 'stage-tool-options';
  strip.style.display = 'none';
  const preview = document.createElement('canvas');
  preview.className = 'stage-draw-preview';
  preview.style.display = 'none';
  container.appendChild(bar);
  container.appendChild(strip);
  pageWrap.appendChild(preview);

  function renderBar() {
    bar.innerHTML = TOOLS.map(t => {
      const key = shortcutLabel(t.shortcut);
      return `<button type="button" class="stage-tool-btn ${t.id === tool ? 'is-active' : ''}" data-tool="${t.id}" aria-pressed="${t.id === tool}" title="${t.label}${key ? ` (${key})` : ''}" aria-label="${t.label}">${renderIcon(t.icon, 16)}</button>`;
    }).join('');
  }

  function renderStrip() {
    if (tool === 'select') {
      strip.style.display = 'none';
      return;
    }
    const canFill = tool === 'rect' || tool === 'ellipse';
    strip.style.display = 'flex';
    if (tool === 'text') {
      strip.innerHTML = '<span class="stage-tool-hint">Clique na folha para escrever ali · arraste para desenhar a caixa do texto · T cria uma caixa no meio da folha</span>';
      return;
    }
    if (CUT_IDS.has(tool)) {
      const target = `<span class="stage-tool-target" data-cut-target>Cortando: ${targetLabel}</span>`;
      const range = (key, label, min, max, step) => `<label class="stage-tool-field" title="${label}"><span>${label}</span><input type="range" data-option="${key}" min="${min}" max="${max}" step="${step}" value="${options[key]}" /></label>`;
      strip.innerHTML = target + ({
        scissors: `<label class="stage-tool-field"><input type="checkbox" data-option="picote" ${options.picote ? 'checked' : ''} /><span>Picote</span></label><span class="stage-tool-hint">Arraste pelo caminho do corte · Alt: laço · Alt+Shift ao soltar: reta · Enter aceita · Esc cancela</span>`,
        tear: `${range('rough', 'Aspereza', 5, 100, 5)}<span class="stage-tool-hint">Arraste de borda a borda, pelo caminho que quiser · Alt: arrancar um canto</span>`,
        lighter: `${range('flame', 'Chama', 6, 40, 1)}${range('speed', 'Fogo', 20, 200, 10)}${range('char', 'Tostado', 0, 100, 5)}<span class="stage-tool-hint">Segure e passe · Shift: acrescentar à queima</span>`,
      }[tool]);
      return;
    }
    const tips = tool === 'brush' ? `
      <span class="stage-brush-tips" role="group" aria-label="Ponta do pincel">${BRUSH_KINDS.map(k => `<button type="button" class="stage-brush-tip" data-tip="${k.id}" aria-pressed="${k.id === options.brush}" title="${k.label}" aria-label="${k.label}">${renderIcon(k.icon, 16)}</button>`).join('')}</span>
      <label class="stage-tool-field" title="Estabilizador: o traço segue o cursor por uma corda, e a mão trêmula some"><span>Suavizar</span><input type="range" data-option="smooth" min="0" max="100" step="5" value="${options.smooth}" /><output data-for="smooth">${options.smooth}</output></label>
      ${brushInfo(options.brush).hasGrain ? `<label class="stage-tool-field" title="Grão"><span>Grão</span><input type="range" data-option="grain" min="0" max="100" step="5" value="${options.grain}" /><output data-for="grain">${options.grain}</output></label>` : ''}
    ` : '';
    strip.innerHTML = `${tips}
      <label class="stage-tool-field" title="Cor"><span>Cor</span><input type="color" data-option="color" value="${options.color}" /></label>
      <label class="stage-tool-field" title="Espessura"><span>Espessura</span><input type="number" data-option="width" min="1" max="200" step="1" value="${options.width}" /></label>
      <label class="stage-tool-field" title="Opacidade"><span>Opacidade</span><input type="range" data-option="opacity" min="5" max="100" step="5" value="${options.opacity}" /><output>${options.opacity}%</output></label>
      ${canFill ? `<label class="stage-tool-field"><input type="checkbox" data-option="fill" ${options.fill ? 'checked' : ''} /><span>Preencher</span></label>` : ''}
    `;
  }

  function persist() {
    try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(options)); } catch {}
  }

  strip.addEventListener('input', (e) => {
    const el = e.target.closest('[data-option]');
    if (!el) return;
    const key = el.dataset.option;
    if (key === 'fill' || key === 'picote') options[key] = el.checked;
    else if (key === 'color') options.color = el.value;
    else {
      const min = Number.isFinite(parseFloat(el.min)) ? parseFloat(el.min) : 1;
      const max = Number.isFinite(parseFloat(el.max)) ? parseFloat(el.max) : 200;
      const value = parseFloat(el.value);
      options[key] = Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
    }
    if (key === 'opacity') strip.querySelector('output:not([data-for])').textContent = `${options.opacity}%`;
    if (key === 'grain' || key === 'smooth') strip.querySelector(`output[data-for="${key}"]`).textContent = options[key];
    persist();
  });

  /**
   * Picks a brush tip. The colour, width and opacity of the tip being left are kept in `options.brushes`,
   * so coming back to it returns it as the person left it; a tip seen for the first time starts from its
   * own defaults over whatever is set now.
   */
  function chooseTip(kind) {
    if (!BRUSH_KINDS.some(k => k.id === kind) || kind === options.brush) return;
    options.brushes[options.brush] = { color: options.color, width: options.width, opacity: options.opacity };
    const next = options.brushes[kind] || { color: options.color, width: options.width, opacity: options.opacity, ...brushInfo(kind).defaults };
    options.brush = kind;
    options.color = next.color;
    options.width = next.width;
    options.opacity = next.opacity;
    persist();
    renderStrip();
  }

  strip.addEventListener('click', (e) => {
    const tip = e.target.closest('[data-tip]');
    if (tip) chooseTip(tip.dataset.tip);
  });

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tool]');
    if (btn) setTool(btn.dataset.tool);
  });

  function setTool(next) {
    if (!TOOLS.some(t => t.id === next) || next === tool) return;
    tool = next;
    viewport.classList.toggle('is-drawing-tool', tool !== 'select');
    renderBar();
    renderStrip();
    onToolChange?.(tool);
  }

  function pagePoint(event) {
    const rect = pageWrap.getBoundingClientRect();
    const zoom = getZoom();
    return [(event.clientX - rect.left) / zoom, (event.clientY - rect.top) / zoom];
  }

  function clearPreview() {
    preview.style.display = 'none';
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);
  }

  const brushShapeOf = (seed = gesture?.seed) => (options.brush === 'pen' ? undefined : { kind: options.brush, grain: options.grain / 100, seed });

  function drawPreview() {
    const handout = getHandout();
    if (!handout || !gesture) return;
    const zoom = getZoom();
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(handout.page.width * zoom * dpr);
    const ph = Math.round(handout.page.height * zoom * dpr);
    if (preview.width !== pw || preview.height !== ph) {
      preview.width = pw;
      preview.height = ph;
    }
    preview.style.width = `${Math.round(handout.page.width * zoom)}px`;
    preview.style.height = `${Math.round(handout.page.height * zoom)}px`;
    preview.style.display = 'block';
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, pw, ph);
    ctx.save();
    ctx.globalAlpha = options.opacity / 100;
    const scale = zoom * dpr;
    const { start, current, shift } = gesture;

    if (gesture.tool === 'brush') {
      // Same geometry as the layer that will be created: the box of the stroke, so a textured tip
      // is rasterized only there and looks identical to the result.
      const n = normalizeStroke(thinPoints(gesture.points), options.width);
      ctx.translate((n.box.x + n.box.width / 2) * scale, (n.box.y + n.box.height / 2) * scale);
      // When a textured tip is too slow to follow the pointer (long, wide strokes), the rest of the drag
      // shows a translucent smooth line and the texture appears on release.
      if (gesture.light) ctx.globalAlpha *= 0.7;
      const started = performance.now();
      drawPathShape(ctx, {
        stroke: options.color,
        strokeWidth: options.width,
        brush: gesture.light ? undefined : brushShapeOf(),
        points: n.points,
      }, n.box.width * scale, n.box.height * scale, scale);
      if (options.brush !== 'pen' && performance.now() - started > 40) gesture.light = true;
    } else if (gesture.tool === 'line') {
      const lb = lineBox(start, current, { snap: shift, thickness: options.width });
      ctx.translate((lb.x + lb.width / 2) * scale, (lb.y + lb.height / 2) * scale);
      ctx.rotate((lb.rotation * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo((-lb.width / 2) * scale, 0);
      ctx.lineTo((lb.width / 2) * scale, 0);
      ctx.lineWidth = options.width * scale;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = options.color;
      ctx.stroke();
    } else if (gesture.tool === 'text') {
      const box = dragBox(start, current);
      ctx.setLineDash([10 * scale, 7 * scale]);
      ctx.lineWidth = 2 * scale;
      ctx.strokeStyle = '#f7f3e6';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 3 * scale;
      ctx.strokeRect(box.x * scale, box.y * scale, box.width * scale, box.height * scale);
    } else {
      const box = dragBox(start, current, { square: shift });
      ctx.beginPath();
      if (gesture.tool === 'rect') ctx.rect(box.x * scale, box.y * scale, box.width * scale, box.height * scale);
      else ctx.ellipse((box.x + box.width / 2) * scale, (box.y + box.height / 2) * scale, (box.width / 2) * scale, (box.height / 2) * scale, 0, 0, Math.PI * 2);
      if (options.fill) {
        ctx.fillStyle = options.color;
        ctx.fill();
      } else {
        ctx.lineWidth = options.width * scale;
        ctx.strokeStyle = options.color;
        ctx.stroke();
      }
    }
    ctx.restore();
    if (gesture.tool === 'brush' && options.smooth > 0) {
      // the rope: a thin dashed line from the brush to the cursor
      ctx.save();
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.lineWidth = dpr;
      ctx.strokeStyle = '#f7f3e6';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(gesture.rope[0] * scale, gesture.rope[1] * scale);
      ctx.lineTo(current[0] * scale, current[1] * scale);
      ctx.stroke();
      ctx.restore();
    }
  }

  pageWrap.addEventListener('pointerdown', (event) => {
    if (tool === 'select' || CUT_IDS.has(tool) || event.button !== 0 || !getHandout()) return;
    if (event.target.closest('.stage-selection-bar, .stage-inline-text-editor')) return;
    event.preventDefault();
    event.stopPropagation();
    try { pageWrap.setPointerCapture(event.pointerId); } catch {}
    const start = pagePoint(event);
    const selected = getSelectedLayer();
    gesture = {
      tool,
      pointerId: event.pointerId,
      start,
      current: start,
      shift: event.shiftKey,
      points: [[start[0], start[1], event.pressure || 0.5]],
      rope: [start[0], start[1]], // where the stabilized brush is
      seed: newBrushSeed(),
      appendTo: tool === 'brush' && event.shiftKey && selected?.kind === 'shape' && selected.shape?.type === 'path' && !selected.locked ? selected.id : null,
    };
    drawPreview();
  }, true);

  pageWrap.addEventListener('pointermove', (event) => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const point = pagePoint(event);
    gesture.current = point;
    gesture.shift = event.shiftKey;
    if (gesture.tool === 'brush') {
      const radius = stabilizerRadius(options.smooth, getZoom());
      const rope = stabilize(gesture.rope, point, radius);
      if (rope[0] !== gesture.rope[0] || rope[1] !== gesture.rope[1]) gesture.points.push([rope[0], rope[1], event.pressure || 0.5]);
      gesture.rope = rope;
      // a textured tip is rasterized in software: at most once per frame
      if (!previewFrame) previewFrame = requestAnimationFrame(() => { previewFrame = 0; drawPreview(); });
      return;
    }
    drawPreview();
  });

  function finish(event, cancelled = false) {
    if (!gesture || (event && event.pointerId !== gesture.pointerId)) return;
    const done = gesture;
    gesture = null;
    if (previewFrame) { cancelAnimationFrame(previewFrame); previewFrame = 0; }
    clearPreview();
    try { pageWrap.releasePointerCapture(done.pointerId); } catch {}
    if (cancelled) return;
    const opts = { ...options };
    if (done.tool === 'brush') {
      // the rope ends where the cursor is: without this, a smoothed stroke would stop short of the release point
      const end = event ? pagePoint(event) : done.current;
      const last = done.points[done.points.length - 1];
      if (options.smooth > 0 && (end[0] !== last[0] || end[1] !== last[1])) done.points.push([end[0], end[1], last[2]]);
      onDraw?.({ type: 'stroke', points: thinPoints(done.points), options: opts, brush: brushShapeOf(done.seed), appendTo: done.appendTo });
    } else if (done.tool === 'line') {
      const length = Math.hypot(done.current[0] - done.start[0], done.current[1] - done.start[1]);
      if (length >= 3) onDraw?.({ type: 'line', box: lineBox(done.start, done.current, { snap: done.shift, thickness: opts.width }), options: opts });
    } else if (done.tool === 'text') {
      // Um clique escreve ali; um arraste desenha a caixa do texto
      const box = dragBox(done.start, done.current);
      onDraw?.(box.width >= 40 && box.height >= 24 ? { type: 'text', box, options: opts } : { type: 'text', point: done.start, options: opts });
    } else {
      const box = dragBox(done.start, done.current, { square: done.shift });
      if (box.width >= 3 && box.height >= 3) onDraw?.({ type: done.tool, box, options: opts });
    }
  }

  pageWrap.addEventListener('pointerup', (event) => finish(event));
  pageWrap.addEventListener('pointercancel', (event) => finish(event, true));

  renderBar();

  return {
    get tool() { return tool; },
    get options() { return { ...options }; },
    setTool,
    refreshLabels: renderBar,
    isDrawing: () => Boolean(gesture),
    /** Names what the cutting tools will cut ("Foto 3x4" or "a folha"). */
    setTargetLabel(label) {
      targetLabel = label;
      const el = strip.querySelector('[data-cut-target]');
      if (el) el.textContent = `Cortando: ${label}`;
    },
  };
}
