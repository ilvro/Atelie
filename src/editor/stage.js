import { renderHandout, renderHandoutSync, drawLayer } from '../render/handout-render.js';
import { renderIcon } from '../ui/icons.js';
import {
  HANDLES,
  boxCorners,
  pointInBox,
  moveBox,
  resizeBox,
  rotateBox,
  rotateBoxBy,
  boxCenter,
  snapBox,
  layerAtPoint,
  layersAtPoint,
  nextStackedLayer,
} from './geometry.js';
import { updateLayer, canvasOperation, isPaperLayer } from '../domain/handouts.js';
import { createRulers } from './rulers.js';
import { createSelectionBar } from './selection-bar.js';
import { createDrawTools } from './draw-tools.js';
import { createCutTools } from './cut-tools.js';
import { isTypingTarget } from '../ui/keymap.js';
import { play, isSoundEnabled } from '../ui/sound.js';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4.0;

/** CSS cursor with a curved arrow turned to point along the arc the corner would sweep. */
function getRotateCursor(corner, rotation = 0) {
  const base = { ne: 0, se: 90, sw: 180, nw: 270 }[corner] ?? 0;
  const angle = (((base + rotation) % 360) + 360) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><g transform='rotate(${angle} 12 12)'><path d='M5 17a9 9 0 0 1 0-10M5 7l-1 4 4-1M19 17a9 9 0 0 0 0-10' fill='none' stroke='white' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'/><path d='M5 17a9 9 0 0 1 0-10M5 7l-1 4 4-1' fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/></g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 12 12, crosshair`;
}

function getHandleCursor(handle, rotation = 0) {
  const baseAngles = {
    n: 0,
    ne: 45,
    e: 90,
    se: 135,
    s: 180,
    sw: 225,
    w: 270,
    nw: 315,
  };
  const base = baseAngles[handle];
  if (base === undefined) return 'default';
  const total = (((base + rotation) % 360) + 360) % 360;
  const octant = Math.round(total / 45) % 8;
  switch (octant) {
    case 0:
    case 4:
      return 'ns-resize';
    case 1:
    case 5:
      return 'nesw-resize';
    case 2:
    case 6:
      return 'ew-resize';
    case 3:
    case 7:
      return 'nwse-resize';
    default:
      return 'default';
  }
}

export function createStage(container, { images, fonts, api, onSelect = () => {}, onEdit = () => {}, onMore = () => {}, onCreateTextAt = () => {}, onDraw = () => {}, onSound = () => {}, onToolChange = () => {}, shortcutLabel = () => '' } = {}) {
  let currentHandout = null;
  let currentLight = 'normal';
  let currentZoom = 0.6;
  let selectedLayerId = null;
  let isRendering = false;
  let nextRequest = null;
  let editingLayerId = null;

  // Eyedropper state
  let isEyedropperActive = false;
  let eyedropperCallback = null;

  container.innerHTML = `
    <div class="stage-viewport" tabindex="0" role="region" aria-label="Mesa de trabalho">
      <div class="stage-scroll-canvas">
        <div class="stage-page-wrap">
          <canvas class="stage-canvas"></canvas>
          <div class="stage-guides-overlay" aria-hidden="true"></div>
          <div class="stage-selection-outline" aria-hidden="true">
            <div class="stage-rotate-zone" data-corner="nw"></div>
            <div class="stage-rotate-zone" data-corner="ne"></div>
            <div class="stage-rotate-zone" data-corner="se"></div>
            <div class="stage-rotate-zone" data-corner="sw"></div>
            <div class="stage-rotate-stem"></div>
            <div class="stage-rotate-handle" data-handle="rot" title="Girar (Shift: 15°)"></div>
            <div class="stage-handle" data-handle="nw"></div>
            <div class="stage-handle" data-handle="n"></div>
            <div class="stage-handle" data-handle="ne"></div>
            <div class="stage-handle" data-handle="e"></div>
            <div class="stage-handle" data-handle="se"></div>
            <div class="stage-handle" data-handle="s"></div>
            <div class="stage-handle" data-handle="sw"></div>
            <div class="stage-handle" data-handle="w"></div>
          </div>
          <textarea class="stage-inline-text-editor" style="display:none;" spellcheck="false"></textarea>
        </div>
      </div>
      <div class="stage-zoom-bar">
        <button type="button" class="at-icon-btn stage-zoom-btn" data-action="zoom-out" aria-label="Reduzir zoom" title="Reduzir (−)">
          ${renderIcon('minus', 14)}
        </button>
        <span class="stage-zoom-level">60 %</span>
        <button type="button" class="at-icon-btn stage-zoom-btn" data-action="zoom-in" aria-label="Aumentar zoom" title="Aumentar (+)">
          ${renderIcon('plus', 14)}
        </button>
        <button type="button" class="at-btn stage-zoom-fit-btn" data-action="zoom-fit">Caber</button>
      </div>
    </div>
  `;

  const viewport = container.querySelector('.stage-viewport');
  const pageWrap = container.querySelector('.stage-page-wrap');
  let canvas = container.querySelector('.stage-canvas');
  const outline = container.querySelector('.stage-selection-outline');
  const guidesOverlay = container.querySelector('.stage-guides-overlay');
  const inlineTextEditor = container.querySelector('.stage-inline-text-editor');
  const zoomLevelEl = container.querySelector('.stage-zoom-level');

  const rulers = createRulers(viewport, pageWrap, {
    getHandout: () => currentHandout,
    onEdit: (next, meta) => onEdit(next, meta),
    getZoom: () => currentZoom,
  });

  const selectionBar = createSelectionBar(pageWrap, {
    state: {
      get handout() {
        return currentHandout;
      },
      get selection() {
        return selectedLayerId;
      },
      edit: (next, meta) => onEdit(next, meta),
    },
    getZoom: () => currentZoom,
    api,
    fonts,
    onMore,
  });

  const drawTools = createDrawTools(container, {
    viewport,
    pageWrap,
    getZoom: () => currentZoom,
    getHandout: () => currentHandout,
    getSelectedLayer: () => currentHandout?.layers.find(l => l.id === selectedLayerId) || null,
    onDraw,
    onToolChange: (tool) => {
      activeToolId = tool;
      try { cutTools.reset(); } catch { /* not built yet */ }
      updateSelectionOutline();
      onToolChange(tool);
    },
    shortcutLabel,
  });

  /** What the cutting tools cut: the selected layer (clipped to it), otherwise the whole sheet. */
  function cutTarget() {
    const layer = currentHandout?.layers.find(l => l.id === selectedLayerId);
    if (!layer || layer.kind === 'adjust' || (layer.kind === 'effect' && layer.effect?.type === 'cut') || layer.locked) return null;
    return { id: layer.id, name: layer.name, x: layer.x, y: layer.y, width: layer.width, height: layer.height, rotation: layer.rotation || 0 };
  }

  const cutTools = createCutTools({
    pageWrap,
    viewport,
    getZoom: () => currentZoom,
    getHandout: () => currentHandout,
    getTool: () => drawTools.tool,
    getOptions: () => drawTools.options,
    getTarget: cutTarget,
    onCut: description => onDraw(description),
    onSound,
    reducedMotion: prefersReducedMotion,
    // Where is there paper? A small CPU render of the document (reading back the visible GPU canvas stalls for ~half a second).
    getAlphaMap: () => {
      try {
        const k = 0.25;
        const w = Math.max(1, Math.ceil(currentHandout.page.width * k));
        const h = Math.max(1, Math.ceil(currentHandout.page.height * k));
        const small = document.createElement('canvas');
        small.width = w;
        small.height = h;
        renderHandoutSync(small, currentHandout, { scale: k, light: currentLight, loadedImages: lastLoadedImages });
        const data = small.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h);
        return { data: data.data, width: w, height: h, k };
      } catch {
        return null;
      }
    },
  });

  const loupe = document.createElement('div');
  loupe.className = 'stage-eyedropper-loupe';
  loupe.style.display = 'none';
  document.body.appendChild(loupe);

  function updateZoomLabel() {
    zoomLevelEl.textContent = `${Math.round(currentZoom * 100)} %`;
    // The sheet lifts off the desk a little more the closer you look: its shadow grows with the zoom.
    pageWrap.style.setProperty('--page-lift', Math.min(1.2, currentZoom).toFixed(2));
  }

  function renderGuides(guides = []) {
    guidesOverlay.innerHTML = '';
    if (!guides || !guides.length) return;

    for (const guide of guides) {
      const el = document.createElement('div');
      if (guide.axis === 'x') {
        el.className = 'stage-guide-x';
        el.style.left = `${Math.round(guide.at * currentZoom)}px`;
      } else {
        el.className = 'stage-guide-y';
        el.style.top = `${Math.round(guide.at * currentZoom)}px`;
      }
      guidesOverlay.appendChild(el);
    }
  }

  let activeToolId = 'select';

  function updateSelectionOutline() {
    try { drawTools.setTargetLabel(cutTarget()?.name || 'a folha'); } catch { /* the tools are still being built */ }
    if (!currentHandout || !selectedLayerId || editingLayerId || activeToolId !== 'select') {
      outline.style.display = 'none';
      selectionBar.hide();
      return;
    }

    const layer = currentHandout.layers.find(l => l.id === selectedLayerId);
    if (!layer || !layer.visible) {
      outline.style.display = 'none';
      selectionBar.hide();
      return;
    }

    const w = layer.width * currentZoom;
    const h = layer.height * currentZoom;
    const rot = layer.rotation || 0;

    outline.style.display = 'block';
    outline.style.width = `${Math.round(w)}px`;
    outline.style.height = `${Math.round(h)}px`;
    outline.style.left = `${Math.round(layer.x * currentZoom)}px`;
    outline.style.top = `${Math.round(layer.y * currentZoom)}px`;
    outline.style.setProperty('--outline-transform', `rotate(${rot}deg)`);
    outline.style.transform = `rotate(${rot}deg)`;
    outline.classList.toggle('is-locked', Boolean(layer.locked));

    // Update cursor for each handle based on rotation
    if (!layer.locked) {
      outline.querySelectorAll('.stage-handle').forEach(hEl => {
        const handle = hEl.dataset.handle;
        hEl.style.cursor = getHandleCursor(handle, rot);
      });
      outline.querySelectorAll('.stage-rotate-zone').forEach(zEl => {
        zEl.style.cursor = getRotateCursor(zEl.dataset.corner, rot);
      });
    }

    selectionBar.update();
  }

  function updateSelectionOutlineForBox(box) {
    if (!box) return;
    outline.style.display = 'block';
    outline.style.width = `${Math.round(box.width * currentZoom)}px`;
    outline.style.height = `${Math.round(box.height * currentZoom)}px`;
    outline.style.left = `${Math.round(box.x * currentZoom)}px`;
    outline.style.top = `${Math.round(box.y * currentZoom)}px`;
    const rot = box.rotation || 0;
    outline.style.setProperty('--outline-transform', `rotate(${rot}deg)`);
    outline.style.transform = `rotate(${rot}deg)`;
  }

  // --- 3-Layer Drag Cache & Gesture Variables ---
  let dragCache = null;
  let isFastDrag = false;
  let highResDebounceTimer = null;
  // Images already decoded by the last full render; the synchronous drag renders reuse them.
  const lastLoadedImages = new Map();

  async function performRender(handout, options = {}) {
    if (!handout) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const isHalf = Boolean(options.halfRes);
    const scale = currentZoom * dpr * (isHalf ? 0.5 : 1);

    if (!isHalf && !activeGesture && canvas && canvas.parentNode) {
      const freshCanvas = document.createElement('canvas');
      freshCanvas.className = 'stage-canvas';
      canvas.replaceWith(freshCanvas);
      canvas = freshCanvas;
    }

    canvas.style.width = `${Math.round(handout.page.width * currentZoom)}px`;
    canvas.style.height = `${Math.round(handout.page.height * currentZoom)}px`;
    pageWrap.style.width = `${Math.round(handout.page.width * currentZoom)}px`;
    pageWrap.style.height = `${Math.round(handout.page.height * currentZoom)}px`;

    // If a text layer is currently being edited inline, hide it from the canvas render
    let docToRender = handout;
    if (editingLayerId) {
      docToRender = {
        ...handout,
        layers: handout.layers.map(l => (l.id === editingLayerId ? { ...l, visible: false } : l)),
      };
    }

    await renderHandout(canvas, docToRender, {
      scale,
      light: options.light || currentLight,
      loadImage: images?.load,
      loadFont: fonts?.load,
      loadedImages: lastLoadedImages,
      emptyImage: 'placeholder',
    });

    pageWrap.classList.toggle('has-cut', handout.layers.some(l => l.kind === 'effect' && l.visible && l.effect?.type === 'cut'));
    updateSelectionOutline();
    rulers.draw();
  }

  function scheduleRender(handout, options = {}) {
    currentHandout = handout;
    if (options.light) currentLight = options.light;
    updateSelectionOutline();

    // Skip full document redraw during fast 3-layer drag unless forced
    if (isFastDrag && !options.forceFull) {
      return;
    }

    nextRequest = { handout, options };

    if (isRendering) return;
    isRendering = true;

    requestAnimationFrame(async () => {
      while (nextRequest) {
        const req = nextRequest;
        nextRequest = null;
        await performRender(req.handout, req.options);
      }
      isRendering = false;
    });
  }

  function prefersReducedMotion() {
    if (typeof document !== 'undefined' && document.body?.classList.contains('reduce-motion')) return true;
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  /** Keeps a snapshot of the old light over the page and fades it out once the new light is drawn. */
  async function crossfadeLight(handout, options) {
    const snapshot = document.createElement('canvas');
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext('2d').drawImage(canvas, 0, 0);
    snapshot.className = 'stage-light-fade';
    snapshot.style.width = canvas.style.width;
    snapshot.style.height = canvas.style.height;
    pageWrap.querySelectorAll('.stage-light-fade').forEach(el => el.remove());
    pageWrap.appendChild(snapshot);

    currentHandout = handout;
    currentLight = options.light;
    try {
      await performRender(handout, options);
    } finally {
      requestAnimationFrame(() => {
        snapshot.classList.add('is-fading');
        setTimeout(() => snapshot.remove(), 600);
      });
    }
  }

  /** Resizes the page box now and scrolls so the page point under (clientX, clientY) stays put. */
  function anchorZoomAt(newZoom, clientX, clientY) {
    if (!currentHandout) return;
    const rect = pageWrap.getBoundingClientRect();
    const px = (clientX - rect.left) / currentZoom;
    const py = (clientY - rect.top) / currentZoom;
    currentZoom = newZoom;
    pageWrap.style.width = `${Math.round(currentHandout.page.width * currentZoom)}px`;
    pageWrap.style.height = `${Math.round(currentHandout.page.height * currentZoom)}px`;
    const next = pageWrap.getBoundingClientRect();
    viewport.scrollLeft += next.left + px * currentZoom - clientX;
    viewport.scrollTop += next.top + py * currentZoom - clientY;
  }

  function viewportCenter() {
    const r = viewport.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  function setZoom(factor, options = {}) {
    if (factor === 'fit') {
      if (!currentHandout) return;
      const vw = Math.max(100, viewport.clientWidth - 80);
      const vh = Math.max(100, viewport.clientHeight - 80);
      const scaleX = vw / currentHandout.page.width;
      const scaleY = vh / currentHandout.page.height;
      currentZoom = Math.max(MIN_ZOOM, Math.min(1.5, Math.min(scaleX, scaleY)));
    } else if (typeof factor === 'number') {
      const [cx, cy] = options.anchor || viewportCenter();
      anchorZoomAt(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, factor)), cx, cy);
    }
    updateZoomLabel();
    if (currentHandout && !options.skipRender) {
      scheduleRender(currentHandout, options);
    }
  }

  // --- Inline Text Editing ---
  function startInlineTextEdit(layerId) {
    if (!currentHandout) return;
    const layer = currentHandout.layers.find(l => l.id === layerId);
    if (!layer || layer.kind !== 'text' || layer.locked) return;

    editingLayerId = layer.id;
    container.dataset.editing = 'text';
    updateSelectionOutline();
    scheduleRender(currentHandout);

    const txt = layer.text || {};
    inlineTextEditor.style.left = `${Math.round(layer.x * currentZoom)}px`;
    inlineTextEditor.style.top = `${Math.round(layer.y * currentZoom)}px`;
    inlineTextEditor.style.width = `${Math.round(layer.width * currentZoom)}px`;
    inlineTextEditor.style.height = `${Math.round(layer.height * currentZoom)}px`;
    inlineTextEditor.style.transform = `rotate(${layer.rotation || 0}deg)`;
    inlineTextEditor.style.fontFamily = txt.font?.family || 'IM Fell English';
    inlineTextEditor.style.fontSize = `${(txt.size || 32) * currentZoom}px`;
    inlineTextEditor.style.fontStyle = txt.font?.italic ? 'italic' : 'normal';
    inlineTextEditor.style.fontWeight = txt.font?.weight || 400;
    inlineTextEditor.style.color = txt.color || '#1d1b24';
    inlineTextEditor.style.textAlign = txt.align || 'left';
    inlineTextEditor.style.lineHeight = String(txt.lineHeight || 1.2);
    inlineTextEditor.value = txt.content || '';
    inlineTextEditor.style.display = 'block';

    inlineTextEditor.focus();
    inlineTextEditor.select();
  }

  function finishInlineTextEdit() {
    if (!editingLayerId) return;
    inlineTextEditor.style.display = 'none';
    const finishedId = editingLayerId;
    editingLayerId = null;
    delete container.dataset.editing;

    if (currentHandout) {
      scheduleRender(currentHandout);
      updateSelectionOutline();
    }
  }

  inlineTextEditor.addEventListener('input', () => {
    if (!editingLayerId || !currentHandout) return;
    const layer = currentHandout.layers.find(l => l.id === editingLayerId);
    if (!layer) return;

    const next = updateLayer(currentHandout, layer.id, {
      text: { ...layer.text, content: inlineTextEditor.value },
    });
    onEdit(next, { label: 'Editar texto', coalesce: `type-${layer.id}` });
  });

  inlineTextEditor.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finishInlineTextEdit();
      viewport.focus();
    } else if (isSoundEnabled() && !event.ctrlKey && !event.metaKey && !event.altKey && !['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(event.key)) {
      const layer = currentHandout?.layers?.find(l => l.id === editingLayerId);
      play('type', { font: layer?.text?.font, key: event.key });
    }
  });

  inlineTextEditor.addEventListener('blur', () => {
    finishInlineTextEdit();
  });

  // --- Pointer Gestures: Move, Resize, Rotate ---
  let activeGesture = null;

  outline.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    if (!currentHandout || !selectedLayerId || editingLayerId) return;
    const layer = currentHandout.layers.find(l => l.id === selectedLayerId);
    if (!layer || layer.locked) return;

    const rotateHandle = event.target.closest('.stage-rotate-handle');
    const resizeHandle = event.target.closest('.stage-handle');
    const rotateZone = event.target.closest('.stage-rotate-zone');

    selectionBar.hide();

    // Zones outside the corners rotate from where the pointer started, not from a fixed handle direction.
    if (rotateZone && !resizeHandle && !rotateHandle) {
      event.preventDefault();
      event.stopPropagation();
      rotateZone.setPointerCapture(event.pointerId);
      const pageRect = pageWrap.getBoundingClientRect();
      activeGesture = {
        type: 'rotate-corner',
        gestureId: 'rotate-' + Math.random().toString(36).slice(2, 9),
        layerId: layer.id,
        startBox: { ...layer },
        center: boxCenter(layer),
        startPointer: [(event.clientX - pageRect.left) / currentZoom, (event.clientY - pageRect.top) / currentZoom],
        handleEl: rotateZone,
        pointerId: event.pointerId,
      };
      return;
    }

    if (rotateHandle) {
      event.preventDefault();
      event.stopPropagation();
      rotateHandle.setPointerCapture(event.pointerId);

      const gestureId = 'rotate-' + Math.random().toString(36).slice(2, 9);
      activeGesture = {
        type: 'rotate',
        gestureId,
        layerId: layer.id,
        startBox: { ...layer },
        handleEl: rotateHandle,
        pointerId: event.pointerId,
      };
      return;
    }

    if (resizeHandle) {
      event.preventDefault();
      event.stopPropagation();
      resizeHandle.setPointerCapture(event.pointerId);

      const handle = resizeHandle.dataset.handle;
      const gestureId = 'resize-' + Math.random().toString(36).slice(2, 9);
      activeGesture = {
        type: 'resize',
        gestureId,
        layerId: layer.id,
        handle,
        startBox: { ...layer },
        handleEl: resizeHandle,
        pointerId: event.pointerId,
      };
      return;
    }

    // Drag body to move
    if (event.target === outline) {
      event.preventDefault();
      event.stopPropagation();
      outline.setPointerCapture(event.pointerId);
      outline.classList.add('is-dragging');

      const gestureId = 'drag-' + Math.random().toString(36).slice(2, 9);

      // Snap targets: page borders + center, document guides, and other visible, unrotated layers
      const targets = {
        x: [0, currentHandout.page.width / 2, currentHandout.page.width, ...(currentHandout.guides?.x || [])],
        y: [0, currentHandout.page.height / 2, currentHandout.page.height, ...(currentHandout.guides?.y || [])],
      };

      for (const other of currentHandout.layers) {
        if (other.id !== layer.id && other.visible && !other.locked && !(other.rotation % 360)) {
          targets.x.push(other.x, other.x + other.width / 2, other.x + other.width);
          targets.y.push(other.y, other.y + other.height / 2, other.y + other.height);
        }
      }

      // Initialize 3-layer bitmap cache for fluid 60fps drag (§7 and Fase 3)
      const movingLayerId = layer.id;
      const kIdx = currentHandout.layers.findIndex(l => l.id === movingLayerId);
      const layersAbove = currentHandout.layers.slice(kIdx + 1);
      // Layers above k can be statically cached if none have non-normal blend modes or clipping/cuts
      const canCacheAbove = !layersAbove.some(l => 
        l.visible && (
          (l.blend && l.blend !== 'normal') ||
          l.kind === 'adjust' ||
          (l.kind === 'effect' && (l.effect?.type === 'burn' || l.effect?.type === 'tear' || l.effect?.type === 'cut'))
        )
      );

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const scale = currentZoom * dpr;
      const pw = Math.round(currentHandout.page.width * scale);
      const ph = Math.round(currentHandout.page.height * scale);

      function createBufferCanvas(w, h) {
        if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
        if (typeof document !== 'undefined' && document.createElement) {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          return c;
        }
        return null;
      }

      // Under non-normal light the visibility/order of layers differs, so slicing by index is wrong:
      // the drag then redraws the whole document each frame instead of using the cache.
      const useCache = currentLight === 'normal';
      const belowCanvas = useCache ? createBufferCanvas(pw, ph) : null;
      const aboveCanvas = useCache && canCacheAbove && layersAbove.length > 0 ? createBufferCanvas(pw, ph) : null;

      if (belowCanvas) {
        renderHandoutSync(belowCanvas, { ...currentHandout, layers: currentHandout.layers.slice(0, kIdx) }, {
          scale,
          light: currentLight,
          loadedImages: lastLoadedImages,
          emptyImage: 'placeholder',
        });
      }
      if (aboveCanvas) {
        renderHandoutSync(aboveCanvas, { ...currentHandout, page: { ...currentHandout.page, background: null }, layers: layersAbove }, {
          scale,
          light: currentLight,
          loadedImages: lastLoadedImages,
          emptyImage: 'placeholder',
        });
      }

      dragCache = {
        belowCanvas,
        aboveCanvas,
        movingLayerId,
        canCacheAbove,
        scale,
        kIdx,
      };
      isFastDrag = true;

      activeGesture = {
        type: 'move',
        gestureId,
        layerId: layer.id,
        startBox: { ...layer },
        startPointer: [event.clientX, event.clientY],
        targets,
        pointerId: event.pointerId,
      };
    }
  });

  window.addEventListener('pointermove', event => {
    if (!activeGesture || !currentHandout) return;

    if (activeGesture.type === 'move') {
      const dx = (event.clientX - activeGesture.startPointer[0]) / currentZoom;
      const dy = (event.clientY - activeGesture.startPointer[1]) / currentZoom;
      const moved = moveBox(activeGesture.startBox, dx, dy);

      let finalBox = moved;
      if (!event.ctrlKey && !(moved.rotation % 360)) {
        const threshold = 6 / currentZoom;
        const { box: snapped, guides } = snapBox(moved, activeGesture.targets, threshold);
        finalBox = snapped;
        renderGuides(guides);
      } else {
        renderGuides([]);
      }

      // Fast 3-layer composition onto canvas (below, layer k, above)
      if (dragCache && dragCache.belowCanvas) {
        const ctx = canvas.getContext('2d');
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const scale = dragCache.scale || (currentZoom * dpr);
        const pw = Math.round(currentHandout.page.width * scale);
        const ph = Math.round(currentHandout.page.height * scale);

        ctx.clearRect(0, 0, pw, ph);
        // 1. Below k
        ctx.drawImage(dragCache.belowCanvas, 0, 0);

        // 2. Layer k moving
        const movingLayer = { ...activeGesture.startBox, ...finalBox };
        ctx.save();
        ctx.globalAlpha = movingLayer.opacity ?? 1;
        ctx.globalCompositeOperation = canvasOperation(movingLayer.blend);
        drawLayer(ctx, movingLayer, scale, lastLoadedImages, [], [], { emptyImage: 'placeholder' });
        ctx.restore();

        // 3. Above k
        if (dragCache.aboveCanvas) {
          ctx.drawImage(dragCache.aboveCanvas, 0, 0);
        } else if (dragCache.canCacheAbove === false) {
          const layersAbove = currentHandout.layers.slice(dragCache.kIdx + 1);
          for (const l of layersAbove) {
            if (!l.visible) continue;
            ctx.save();
            ctx.globalAlpha = l.opacity ?? 1;
            ctx.globalCompositeOperation = canvasOperation(l.blend);
            drawLayer(ctx, l, scale, lastLoadedImages, [], [], { emptyImage: 'placeholder' });
            ctx.restore();
          }
        }

        updateSelectionOutlineForBox(finalBox);
      }

      currentHandout = updateLayer(currentHandout, activeGesture.layerId, finalBox);

      if (!dragCache?.belowCanvas && isFastDrag) {
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        renderHandoutSync(canvas, currentHandout, { scale: currentZoom * dpr, light: currentLight, loadedImages: lastLoadedImages, emptyImage: 'placeholder' });
        updateSelectionOutlineForBox(finalBox);
      }

      // Debounce high-res refresh 150ms after movement settles
      clearTimeout(highResDebounceTimer);
      highResDebounceTimer = setTimeout(() => {
        if (activeGesture && currentHandout) {
          scheduleRender(currentHandout, { forceFull: true });
        }
      }, 150);
    } else if (activeGesture.type === 'resize') {
      const pageRect = pageWrap.getBoundingClientRect();
      const pointerPage = [
        (event.clientX - pageRect.left) / currentZoom,
        (event.clientY - pageRect.top) / currentZoom,
      ];
      const keepAspect = event.shiftKey;
      const fromCenter = event.altKey;

      const resized = resizeBox(activeGesture.startBox, activeGesture.handle, pointerPage, {
        keepAspect,
        fromCenter,
      });

      currentHandout = updateLayer(currentHandout, activeGesture.layerId, resized);
      scheduleRender(currentHandout, { halfRes: true });

      clearTimeout(highResDebounceTimer);
      highResDebounceTimer = setTimeout(() => {
        scheduleRender(currentHandout, { fullRes: true, forceFull: true });
      }, 150);
    } else if (activeGesture.type === 'rotate-corner') {
      const pageRect = pageWrap.getBoundingClientRect();
      const pointerPage = [
        (event.clientX - pageRect.left) / currentZoom,
        (event.clientY - pageRect.top) / currentZoom,
      ];
      const newRot = rotateBoxBy(activeGesture.startBox.rotation || 0, activeGesture.center, activeGesture.startPointer, pointerPage, { snap: event.shiftKey });
      currentHandout = updateLayer(currentHandout, activeGesture.layerId, { rotation: newRot });
      scheduleRender(currentHandout, { halfRes: true });

      clearTimeout(highResDebounceTimer);
      highResDebounceTimer = setTimeout(() => {
        scheduleRender(currentHandout, { fullRes: true, forceFull: true });
      }, 150);
    } else if (activeGesture.type === 'rotate') {
      const pageRect = pageWrap.getBoundingClientRect();
      const pointerPage = [
        (event.clientX - pageRect.left) / currentZoom,
        (event.clientY - pageRect.top) / currentZoom,
      ];
      const snap = event.shiftKey;

      const newRot = rotateBox(activeGesture.startBox, pointerPage, { snap });
      currentHandout = updateLayer(currentHandout, activeGesture.layerId, { rotation: newRot });
      scheduleRender(currentHandout, { halfRes: true });

      clearTimeout(highResDebounceTimer);
      highResDebounceTimer = setTimeout(() => {
        scheduleRender(currentHandout, { fullRes: true, forceFull: true });
      }, 150);
    }
  });

  function endGesture() {
    if (!activeGesture) return;
    clearTimeout(highResDebounceTimer);
    renderGuides([]);
    outline.classList.remove('is-dragging');
    try {
      if (activeGesture.handleEl && activeGesture.handleEl.hasPointerCapture(activeGesture.pointerId)) {
        activeGesture.handleEl.releasePointerCapture(activeGesture.pointerId);
      } else if (outline.hasPointerCapture(activeGesture.pointerId)) {
        outline.releasePointerCapture(activeGesture.pointerId);
      }
    } catch {
      // Ignore
    }
    const finished = activeGesture;
    activeGesture = null;
    dragCache = null;
    isFastDrag = false;
    selectionBar.update();
    if (currentHandout) {
      onEdit(currentHandout, {
        label: finished.type === 'move' ? 'Mover camada' : finished.type === 'resize' ? 'Redimensionar camada' : 'Girar camada',
        coalesce: finished.gestureId,
      });
    }
  }

  window.addEventListener('pointerup', endGesture);
  window.addEventListener('pointercancel', endGesture);

  // Double click for inline text editing
  outline.addEventListener('dblclick', event => {
    if (!currentHandout || !selectedLayerId) return;
    const layer = currentHandout.layers.find(l => l.id === selectedLayerId);
    if (layer && layer.kind === 'text' && !layer.locked) {
      event.preventDefault();
      event.stopPropagation();
      startInlineTextEdit(layer.id);
    }
  });

  // Eyedropper pointer handler
  function activateEyedropper(onPick) {
    isEyedropperActive = true;
    eyedropperCallback = onPick;
    loupe.style.display = 'block';
    viewport.style.cursor = 'crosshair';
  }

  function deactivateEyedropper() {
    isEyedropperActive = false;
    eyedropperCallback = null;
    loupe.style.display = 'none';
    viewport.style.cursor = '';
  }

  function sampleCanvasColor(clientX, clientY) {
    const canvasRect = canvas.getBoundingClientRect();
    if (
      clientX >= canvasRect.left &&
      clientX <= canvasRect.right &&
      clientY >= canvasRect.top &&
      clientY <= canvasRect.bottom
    ) {
      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;
      const px = Math.floor((clientX - canvasRect.left) * scaleX);
      const py = Math.floor((clientY - canvasRect.top) * scaleY);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      try {
        const data = ctx.getImageData(px, py, 1, 1).data;
        return (
          '#' +
          [data[0], data[1], data[2]]
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        );
      } catch {
        return null;
      }
    }
    return null;
  }

  window.addEventListener('pointermove', event => {
    if (!isEyedropperActive) return;
    loupe.style.left = `${event.clientX}px`;
    loupe.style.top = `${event.clientY}px`;

    const hex = sampleCanvasColor(event.clientX, event.clientY);
    if (hex) {
      loupe.style.backgroundColor = hex;
    }
  });

  window.addEventListener(
    'click',
    event => {
      if (!isEyedropperActive) return;
      event.preventDefault();
      event.stopPropagation();
      let hex = sampleCanvasColor(event.clientX, event.clientY);
      if (!hex) {
        const color = loupe.style.backgroundColor;
        hex = color;
        const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (match) {
          hex =
            '#' +
            [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
              .map(n => n.toString(16).padStart(2, '0'))
              .join('');
        }
      }
      const cb = eyedropperCallback;
      deactivateEyedropper();
      if (hex) cb?.(hex);
    },
    true
  );

  window.addEventListener('keydown', event => {
    if (isEyedropperActive && event.key === 'Escape') {
      event.preventDefault();
      deactivateEyedropper();
    }
  });

  // Zoom controls click
  viewport.addEventListener('click', event => {
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.dataset.action;
    if (action === 'zoom-in') {
      setZoom(currentZoom * 1.25);
    } else if (action === 'zoom-out') {
      setZoom(currentZoom * 0.8);
    } else if (action === 'zoom-fit') {
      setZoom('fit');
    }
  });

  // Ctrl + Wheel to zoom (half-resolution during wheel, restored to full-resolution after 150ms of quiet)
  let wheelZoomTimer = null;
  viewport.addEventListener(
    'wheel',
    event => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.15 : 0.85;
      anchorZoomAt(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * factor)), event.clientX, event.clientY);
      updateZoomLabel();
      scheduleRender(currentHandout, { halfRes: true });

      clearTimeout(wheelZoomTimer);
      wheelZoomTimer = setTimeout(() => {
        scheduleRender(currentHandout, { fullRes: true, forceFull: true });
      }, 150);
    },
    { passive: false }
  );

  // Pan with Middle Mouse Button, Right Mouse Button, or Space + Drag
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panStartScrollLeft = 0;
  let panStartScrollTop = 0;
  let hasMovedDuringPan = false;
  let isSpacePressed = false;

  window.addEventListener('keydown', event => {
    if (
      event.code === 'Space' &&
      !isTypingTarget()
    ) {
      isSpacePressed = true;
      if (!isPanning && viewport) {
        viewport.style.cursor = 'grab';
      }
    }
  });

  window.addEventListener('keyup', event => {
    if (event.code === 'Space') {
      isSpacePressed = false;
      if (!isPanning && viewport) {
        viewport.style.cursor = '';
      }
    }
  });

  viewport.addEventListener('mousedown', event => {
    // Middle button (1), Right button (2), or Left button with Space (0)
    const isMiddle = event.button === 1;
    const isRight = event.button === 2;
    const isLeftWithSpace = event.button === 0 && isSpacePressed;

    if (isMiddle || isRight || isLeftWithSpace) {
      isPanning = true;
      hasMovedDuringPan = false;
      panStartX = event.clientX;
      panStartY = event.clientY;
      panStartScrollLeft = viewport.scrollLeft;
      panStartScrollTop = viewport.scrollTop;
      viewport.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      event.preventDefault();
    }
  });

  window.addEventListener('mousemove', event => {
    if (!isPanning) return;
    const dx = event.clientX - panStartX;
    const dy = event.clientY - panStartY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      hasMovedDuringPan = true;
    }
    viewport.scrollLeft = panStartScrollLeft - dx;
    viewport.scrollTop = panStartScrollTop - dy;
  });

  window.addEventListener('mouseup', event => {
    if (!isPanning) return;
    isPanning = false;
    viewport.style.cursor = isSpacePressed ? 'grab' : '';
    document.body.style.userSelect = '';
  });

  viewport.addEventListener(
    'contextmenu',
    event => {
      if (hasMovedDuringPan) {
        event.preventDefault();
        event.stopPropagation();
        hasMovedDuringPan = false;
      }
    },
    true
  );

  // Multi-touch gestures (Pinch-to-zoom & two-finger pan) and Long Press (§5 e Fase 4)
  const activeTouchPointers = new Map();
  let pinchInitialDistance = 0;
  let pinchInitialZoom = 1;
  let pinchInitialMidpoint = [0, 0];
  let pinchStartScrollLeft = 0;
  let pinchStartScrollTop = 0;
  let isPinching = false;
  let longPressTimer = null;
  let longPressOrigin = null;

  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') {
      activeTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      // Start long-press detection if single touch
      if (activeTouchPointers.size === 1) {
        longPressOrigin = { x: event.clientX, y: event.clientY, target: event.target };
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          if (longPressOrigin && activeTouchPointers.size === 1) {
            if (activeGesture) {
              endGesture();
            }
            const contextEv = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: longPressOrigin.x,
              clientY: longPressOrigin.y,
              button: 2,
            });
            longPressOrigin.target.dispatchEvent(contextEv);
            longPressOrigin = null;
          }
        }, 500);
      } else {
        clearTimeout(longPressTimer);
        longPressOrigin = null;
      }

      // If two fingers are down, begin pinch-zoom and pan
      if (activeTouchPointers.size === 2) {
        clearTimeout(longPressTimer);
        longPressOrigin = null;
        if (activeGesture) {
          endGesture();
        }
        isPinching = true;
        const [p1, p2] = Array.from(activeTouchPointers.values());
        pinchInitialDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        pinchInitialZoom = currentZoom;
        pinchInitialMidpoint = [(p1.x + p2.x) / 2, (p1.y + p2.y) / 2];
        pinchStartScrollLeft = viewport.scrollLeft;
        pinchStartScrollTop = viewport.scrollTop;
      }
    }
  });

  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' && activeTouchPointers.has(event.pointerId)) {
      activeTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      // Cancel long press if moved more than 8px
      if (longPressOrigin) {
        const dist = Math.hypot(event.clientX - longPressOrigin.x, event.clientY - longPressOrigin.y);
        if (dist > 8) {
          clearTimeout(longPressTimer);
          longPressOrigin = null;
        }
      }

      // Handle 2-finger pinch & pan
      if (isPinching && activeTouchPointers.size === 2) {
        const [p1, p2] = Array.from(activeTouchPointers.values());
        const currentDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (pinchInitialDistance > 10) {
          const ratio = currentDistance / pinchInitialDistance;
          const targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchInitialZoom * ratio));
          currentZoom = targetZoom;
          updateZoomLabel();
          updateSelectionOutline();
          scheduleRender(currentHandout, { halfRes: true });

          const currentMidpoint = [(p1.x + p2.x) / 2, (p1.y + p2.y) / 2];
          const dx = currentMidpoint[0] - pinchInitialMidpoint[0];
          const dy = currentMidpoint[1] - pinchInitialMidpoint[1];
          viewport.scrollLeft = pinchStartScrollLeft - dx;
          viewport.scrollTop = pinchStartScrollTop - dy;
        }
      }
    }
  });

  const handleTouchEnd = event => {
    if (event.pointerType === 'touch') {
      activeTouchPointers.delete(event.pointerId);
      clearTimeout(longPressTimer);
      longPressOrigin = null;
      if (isPinching && activeTouchPointers.size < 2) {
        isPinching = false;
        scheduleRender(currentHandout, { fullRes: true, forceFull: true });
      }
    }
  };

  window.addEventListener('pointerup', handleTouchEnd);
  window.addEventListener('pointercancel', handleTouchEnd);

  // Click on stage for layer hit testing
  pageWrap.addEventListener('click', event => {
    if (!currentHandout || activeGesture || isEyedropperActive || drawTools.tool !== 'select') return;
    if (
      (event.target.closest('.stage-selection-outline') && !event.altKey) ||
      event.target.closest('.stage-inline-text-editor') ||
      event.target.closest('.stage-selection-bar') ||
      event.target.closest('.stage-doc-guide-x') ||
      event.target.closest('.stage-doc-guide-y')
    )
      return;

    const rect = pageWrap.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const pageX = clickX / currentZoom;
    const pageY = clickY / currentZoom;

    // Alt+click walks down the stack of layers under the cursor.
    const hit = event.altKey
      ? nextStackedLayer(layersAtPoint(currentHandout, [pageX, pageY]), selectedLayerId)
      : layerAtPoint(currentHandout, [pageX, pageY]);
    selectedLayerId = hit ? hit.id : null;
    updateSelectionOutline();
    onSelect(selectedLayerId);
  });

  // Double click on an empty part of the page (nothing but the paper under it) writes a text there.
  pageWrap.addEventListener('dblclick', event => {
    if (!currentHandout || activeGesture || isEyedropperActive || editingLayerId) return;
    if (
      event.target.closest('.stage-inline-text-editor') ||
      event.target.closest('.stage-selection-bar')
    ) return;
    const rect = pageWrap.getBoundingClientRect();
    const point = [(event.clientX - rect.left) / currentZoom, (event.clientY - rect.top) / currentZoom];
    const pageArea = currentHandout.page.width * currentHandout.page.height;
    const covering = layer => isPaperLayer(layer) || (layer.width * layer.height >= pageArea * 0.9 && layer.kind !== 'text');
    // The first click of the double click may have selected the paper: its outline then lies over the page.
    const hits = layersAtPoint(currentHandout, point).filter(l => !covering(l));
    if (hits.length) return;
    event.preventDefault();
    onCreateTextAt(point);
  });

  // Clicking on background outside page deselects
  viewport.addEventListener('click', event => {
    if (isEyedropperActive) return;
    if (event.target === viewport || event.target.classList.contains('stage-scroll-canvas')) {
      selectedLayerId = null;
      updateSelectionOutline();
      onSelect(null);
    }
  });

  return {
    show(handout, options = {}) {
      if (options.light && options.light !== currentLight && canvas?.width && !prefersReducedMotion()) {
        crossfadeLight(handout, options);
        return;
      }
      scheduleRender(handout, options);
    },
    async renderNow(handout, options = {}) {
      currentHandout = handout || currentHandout;
      if (options.light) currentLight = options.light;
      await performRender(currentHandout, options);
    },
    zoom(factor, options = {}) {
      if (factor === undefined) return currentZoom;
      setZoom(factor, options);
      return currentZoom;
    },
    getZoom() {
      return currentZoom;
    },
    setTool(tool) {
      drawTools.setTool(tool);
    },
    isChoosingCut() {
      return cutTools.isChoosing();
    },
    cutFrameStats() {
      return cutTools.frameStats();
    },
    clearCutFrameStats() {
      cutTools.clearStats();
    },
    getTool() {
      return drawTools.tool;
    },
    refreshToolLabels() {
      drawTools.refreshLabels();
    },
    getView() {
      return { zoom: currentZoom, scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop };
    },
    /** Restores zoom and scroll of a tab; call before the render so the page box is already sized. */
    setView(view) {
      if (!view) return;
      currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom || currentZoom));
      updateZoomLabel();
      if (currentHandout) {
        pageWrap.style.width = `${Math.round(currentHandout.page.width * currentZoom)}px`;
        pageWrap.style.height = `${Math.round(currentHandout.page.height * currentZoom)}px`;
      }
      requestAnimationFrame(() => {
        viewport.scrollLeft = view.scrollLeft || 0;
        viewport.scrollTop = view.scrollTop || 0;
      });
    },
    select(layerId) {
      selectedLayerId = layerId;
      updateSelectionOutline();
    },
    land(layerId) {
      if (layerId) {
        selectedLayerId = layerId;
        updateSelectionOutline();
      }
      outline.classList.remove('is-landing');
      void outline.offsetWidth;
      outline.classList.add('is-landing');
      outline.addEventListener('animationend', () => {
        outline.classList.remove('is-landing');
      }, { once: true });
    },
    animateOpen() {
      pageWrap.classList.remove('is-entering-open', 'is-exiting-left', 'is-entering-right');
      void pageWrap.offsetWidth;
      pageWrap.classList.add('is-entering-open');
      pageWrap.addEventListener('animationend', () => {
        pageWrap.classList.remove('is-entering-open');
      }, { once: true });
    },
    animateSwitch(onMidpoint) {
      return new Promise(resolve => {
        if (typeof window === 'undefined' || typeof pageWrap?.addEventListener !== 'function') {
          onMidpoint?.();
          resolve();
          return;
        }
        pageWrap.classList.remove('is-entering-open', 'is-exiting-left', 'is-entering-right');
        void pageWrap.offsetWidth;
        pageWrap.classList.add('is-exiting-left');
        let midpointCalled = false;
        const doMidpoint = () => {
          if (midpointCalled) return;
          midpointCalled = true;
          pageWrap.classList.remove('is-exiting-left');
          onMidpoint?.();
          resolve();
          void pageWrap.offsetWidth;
          pageWrap.classList.add('is-entering-right');
          const onEnterEnd = () => {
            pageWrap.classList.remove('is-entering-right');
            pageWrap.removeEventListener('animationend', onEnterEnd);
          };
          pageWrap.addEventListener('animationend', onEnterEnd, { once: true });
          setTimeout(onEnterEnd, 250);
        };
        pageWrap.addEventListener('animationend', doMidpoint, { once: true });
        setTimeout(doMidpoint, 200);
      });
    },
    /** Turns the page over on its vertical axis: the first half hides the old face, `onMidpoint` swaps it, the second shows the new one. */
    animateFlip(onMidpoint) {
      return new Promise(resolve => {
        if (prefersReducedMotion() || typeof pageWrap?.addEventListener !== 'function') {
          Promise.resolve(onMidpoint?.()).then(resolve);
          return;
        }
        pageWrap.classList.remove('is-flipping-in', 'is-flipping-out');
        void pageWrap.offsetWidth;
        pageWrap.classList.add('is-flipping-out');
        let done = false;
        const mid = async () => {
          if (done) return;
          done = true;
          pageWrap.classList.remove('is-flipping-out');
          await onMidpoint?.();
          void pageWrap.offsetWidth;
          pageWrap.classList.add('is-flipping-in');
          const end = () => pageWrap.classList.remove('is-flipping-in');
          pageWrap.addEventListener('animationend', end, { once: true });
          setTimeout(end, 400);
          resolve();
        };
        pageWrap.addEventListener('animationend', mid, { once: true });
        setTimeout(mid, 300);
      });
    },
    startInlineTextEdit(layerId) {
      startInlineTextEdit(layerId);
    },
    toggleRulers() {
      return rulers.toggle();
    },
    activateEyedropper(onPick) {
      activateEyedropper(onPick);
    },
    destroy() {
      rulers.destroy();
      selectionBar.destroy();
      loupe.remove();
      container.innerHTML = '';
    },
  };
}
