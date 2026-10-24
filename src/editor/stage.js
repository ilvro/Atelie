import { renderHandout } from '../render/handout-render.js';
import { renderIcon } from '../ui/icons.js';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4.0;

export function createStage(container, { images, fonts, onSelect = () => {} } = {}) {
  let currentHandout = null;
  let currentLight = 'normal';
  let currentZoom = 0.6;
  let selectedLayerId = null;
  let isRendering = false;
  let nextRequest = null;

  container.innerHTML = `
    <div class="stage-viewport" tabindex="0" role="region" aria-label="Mesa de trabalho">
      <div class="stage-scroll-canvas">
        <div class="stage-page-wrap">
          <canvas class="stage-canvas"></canvas>
          <div class="stage-selection-outline" aria-hidden="true"></div>
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
  const canvas = container.querySelector('.stage-canvas');
  const outline = container.querySelector('.stage-selection-outline');
  const zoomLevelEl = container.querySelector('.stage-zoom-level');

  function updateZoomLabel() {
    zoomLevelEl.textContent = `${Math.round(currentZoom * 100)} %`;
  }

  function updateSelectionOutline() {
    if (!currentHandout || !selectedLayerId) {
      outline.style.display = 'none';
      return;
    }

    const layer = currentHandout.layers.find(l => l.id === selectedLayerId);
    if (!layer || !layer.visible) {
      outline.style.display = 'none';
      return;
    }

    const w = layer.width * currentZoom;
    const h = layer.height * currentZoom;
    const cx = layer.x * currentZoom;
    const cy = layer.y * currentZoom;

    outline.style.display = 'block';
    outline.style.width = `${Math.round(w)}px`;
    outline.style.height = `${Math.round(h)}px`;
    outline.style.left = `${Math.round(cx - w / 2)}px`;
    outline.style.top = `${Math.round(cy - h / 2)}px`;
    outline.style.transform = `rotate(${layer.rotation || 0}deg)`;
  }

  async function performRender(handout, options) {
    if (!handout) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const scale = currentZoom * dpr;

    canvas.style.width = `${Math.round(handout.page.width * currentZoom)}px`;
    canvas.style.height = `${Math.round(handout.page.height * currentZoom)}px`;
    pageWrap.style.width = `${Math.round(handout.page.width * currentZoom)}px`;
    pageWrap.style.height = `${Math.round(handout.page.height * currentZoom)}px`;

    await renderHandout(canvas, handout, {
      scale,
      light: options.light || currentLight,
      loadImage: images?.load,
      loadFont: fonts?.load,
    });

    updateSelectionOutline();
  }

  function scheduleRender(handout, options = {}) {
    currentHandout = handout;
    if (options.light) currentLight = options.light;
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

  function setZoom(factor) {
    if (factor === 'fit') {
      if (!currentHandout) return;
      const vw = Math.max(100, viewport.clientWidth - 80);
      const vh = Math.max(100, viewport.clientHeight - 80);
      const scaleX = vw / currentHandout.page.width;
      const scaleY = vh / currentHandout.page.height;
      currentZoom = Math.max(MIN_ZOOM, Math.min(1.5, Math.min(scaleX, scaleY)));
    } else if (typeof factor === 'number') {
      currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, factor));
    }
    updateZoomLabel();
    if (currentHandout) {
      scheduleRender(currentHandout);
    }
  }

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

  // Ctrl + Wheel to zoom
  viewport.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.15 : 0.85;
    setZoom(currentZoom * factor);
  }, { passive: false });

  // Click on stage for layer hit testing
  pageWrap.addEventListener('click', event => {
    if (!currentHandout) return;

    const rect = pageWrap.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const pageX = clickX / currentZoom;
    const pageY = clickY / currentZoom;

    let hit = null;
    const layers = currentHandout.layers || [];

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible || layer.locked) continue;

      const rad = -((layer.rotation || 0) * Math.PI) / 180;
      const dx = pageX - layer.x;
      const dy = pageY - layer.y;
      const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

      if (Math.abs(localX) <= layer.width / 2 && Math.abs(localY) <= layer.height / 2) {
        hit = layer;
        break;
      }
    }

    selectedLayerId = hit ? hit.id : null;
    updateSelectionOutline();
    onSelect(selectedLayerId);
  });

  // Clicking on background outside page deselects
  viewport.addEventListener('click', event => {
    if (event.target === viewport || event.target.classList.contains('stage-scroll-canvas')) {
      selectedLayerId = null;
      updateSelectionOutline();
      onSelect(null);
    }
  });

  return {
    show(handout, options = {}) {
      scheduleRender(handout, options);
    },
    zoom(factor) {
      if (factor === undefined) return currentZoom;
      setZoom(factor);
      return currentZoom;
    },
    getZoom() {
      return currentZoom;
    },
    select(layerId) {
      selectedLayerId = layerId;
      updateSelectionOutline();
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}

