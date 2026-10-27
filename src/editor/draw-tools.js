import { renderIcon } from '../ui/icons.js';
import { drawPathShape } from '../render/handout-path.js';
import { thinPoints } from '../domain/brush.js';

export const TOOLS = [
  { id: 'select', label: 'Selecionar', icon: 'cursor', shortcut: 'tool-select' },
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
const DEFAULT_OPTIONS = { color: '#1d1b24', width: 6, opacity: 100, fill: false, picote: false, rough: 50, flame: 14, speed: 100, char: 50 };

function loadOptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OPTIONS_KEY) || 'null');
    return { ...DEFAULT_OPTIONS, ...(parsed || {}) };
  } catch {
    return { ...DEFAULT_OPTIONS };
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
    strip.innerHTML = `
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
    if (key === 'opacity') strip.querySelector('output').textContent = `${options.opacity}%`;
    persist();
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
      const w = handout.page.width;
      const h = handout.page.height;
      ctx.translate(pw / 2, ph / 2);
      drawPathShape(ctx, {
        stroke: options.color,
        strokeWidth: options.width,
        points: gesture.points.map(p => [p[0] / w, p[1] / h, p[2]]),
      }, pw, ph, scale);
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
      appendTo: tool === 'brush' && event.shiftKey && selected?.kind === 'shape' && selected.shape?.type === 'path' && !selected.locked ? selected.id : null,
    };
    drawPreview();
  }, true);

  pageWrap.addEventListener('pointermove', (event) => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const point = pagePoint(event);
    gesture.current = point;
    gesture.shift = event.shiftKey;
    if (gesture.tool === 'brush') gesture.points.push([point[0], point[1], event.pressure || 0.5]);
    drawPreview();
  });

  function finish(event, cancelled = false) {
    if (!gesture || (event && event.pointerId !== gesture.pointerId)) return;
    const done = gesture;
    gesture = null;
    clearPreview();
    try { pageWrap.releasePointerCapture(done.pointerId); } catch {}
    if (cancelled) return;
    const opts = { ...options };
    if (done.tool === 'brush') {
      onDraw?.({ type: 'stroke', points: thinPoints(done.points), options: opts, appendTo: done.appendTo });
    } else if (done.tool === 'line') {
      const length = Math.hypot(done.current[0] - done.start[0], done.current[1] - done.start[1]);
      if (length >= 3) onDraw?.({ type: 'line', box: lineBox(done.start, done.current, { snap: done.shift, thickness: opts.width }), options: opts });
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
