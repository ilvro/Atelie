/**
 * Pure calculations and interactive UI for canvas rulers and document guides.
 */

export const RULER_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
export const PX_PER_MM = 150 / 25.4; // ~5.9055 px per mm

export function pxToMm(px) {
  return px / PX_PER_MM;
}

export function mmToPx(mm) {
  return mm * PX_PER_MM;
}

/**
 * Calculates step interval between ruler major ticks so they are spaced at least minScreenDistance apart.
 */
export function calculateRulerStep(zoom, { unit = 'px', minScreenDistance = 48 } = {}) {
  const scale = unit === 'mm' ? PX_PER_MM * zoom : zoom;
  for (const step of RULER_STEPS) {
    if (step * scale >= minScreenDistance) {
      return step;
    }
  }
  return RULER_STEPS[RULER_STEPS.length - 1];
}

/**
 * Creates interactive rulers and guides overlay.
 */
export function createRulers(viewport, pageWrap, { getHandout, onEdit, getZoom } = {}) {
  let isVisible = true;
  let unit = 'px';

  // Read unit setting
  try {
    const saved = localStorage.getItem('atelie-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.unit === 'mm') unit = 'mm';
    }
  } catch {
    // Ignore
  }

  // Corner and ruler canvases
  const corner = document.createElement('div');
  corner.className = 'stage-ruler-corner';

  const rulerH = document.createElement('canvas');
  rulerH.className = 'stage-ruler stage-ruler-h';
  rulerH.height = 20;

  const rulerV = document.createElement('canvas');
  rulerV.className = 'stage-ruler stage-ruler-v';
  rulerV.width = 20;

  // Container for guides inside pageWrap
  const guidesContainer = document.createElement('div');
  guidesContainer.className = 'stage-doc-guides';
  guidesContainer.setAttribute('aria-hidden', 'true');

  viewport.appendChild(corner);
  viewport.appendChild(rulerH);
  viewport.appendChild(rulerV);
  pageWrap.appendChild(guidesContainer);

  viewport.addEventListener('scroll', drawRuler, { passive: true });

  function drawRuler() {
    if (!isVisible) {
      corner.style.display = 'none';
      rulerH.style.display = 'none';
      rulerV.style.display = 'none';
      return;
    }

    corner.style.display = 'block';
    rulerH.style.display = 'block';
    rulerV.style.display = 'block';

    const handout = getHandout?.();
    if (!handout) return;

    const zoom = getZoom?.() || 0.6;
    const step = calculateRulerStep(zoom, { unit });

    const pageRect = pageWrap.getBoundingClientRect();
    const vpRect = viewport.getBoundingClientRect();

    // Horizontal Ruler
    const widthH = viewport.clientWidth;
    rulerH.width = widthH;
    rulerH.height = 20;

    const ctxH = rulerH.getContext('2d');
    ctxH.fillStyle = '#23202b';
    ctxH.fillRect(0, 0, widthH, 20);
    ctxH.strokeStyle = '#3d384c';
    ctxH.beginPath();
    ctxH.moveTo(0, 19.5);
    ctxH.lineTo(widthH, 19.5);
    ctxH.stroke();

    ctxH.font = '11px monospace';
    ctxH.fillStyle = '#7a738c';
    ctxH.textAlign = 'left';
    ctxH.textBaseline = 'top';

    const originXH = pageRect.left - vpRect.left;
    const pagePxWidth = handout.page.width * zoom;

    // Draw ticks across page width
    const maxValX = unit === 'mm' ? pxToMm(handout.page.width) : handout.page.width;
    for (let val = 0; val <= maxValX; val += step) {
      const posPx = (unit === 'mm' ? mmToPx(val) : val) * zoom;
      const screenX = originXH + posPx;
      if (screenX >= 20 && screenX <= widthH) {
        ctxH.beginPath();
        ctxH.moveTo(screenX + 0.5, 10);
        ctxH.lineTo(screenX + 0.5, 19);
        ctxH.stroke();
        ctxH.fillText(String(val), screenX + 3, 2);
      }
    }

    // Vertical Ruler
    const heightV = viewport.clientHeight;
    rulerV.width = 20;
    rulerV.height = heightV;

    const ctxV = rulerV.getContext('2d');
    ctxV.fillStyle = '#23202b';
    ctxV.fillRect(0, 0, 20, heightV);
    ctxV.strokeStyle = '#3d384c';
    ctxV.beginPath();
    ctxV.moveTo(19.5, 0);
    ctxV.lineTo(19.5, heightV);
    ctxV.stroke();

    ctxV.font = '11px monospace';
    ctxV.fillStyle = '#7a738c';
    ctxV.textAlign = 'right';
    ctxV.textBaseline = 'middle';

    const originYV = pageRect.top - vpRect.top;
    const maxValY = unit === 'mm' ? pxToMm(handout.page.height) : handout.page.height;
    for (let val = 0; val <= maxValY; val += step) {
      const posPx = (unit === 'mm' ? mmToPx(val) : val) * zoom;
      const screenY = originYV + posPx;
      if (screenY >= 20 && screenY <= heightV) {
        ctxV.beginPath();
        ctxV.moveTo(10, screenY + 0.5);
        ctxV.lineTo(19, screenY + 0.5);
        ctxV.stroke();
        ctxV.save();
        ctxV.translate(9, screenY);
        ctxV.rotate(-Math.PI / 2);
        ctxV.fillText(String(val), 0, 0);
        ctxV.restore();
      }
    }

    renderGuidesOverlay();
  }

  function renderGuidesOverlay() {
    guidesContainer.innerHTML = '';
    const handout = getHandout?.();
    if (!handout || !handout.guides) return;

    const zoom = getZoom?.() || 0.6;
    const guidesX = handout.guides.x || [];
    const guidesY = handout.guides.y || [];

    // Render X guides (vertical lines)
    guidesX.forEach((x, index) => {
      const g = document.createElement('div');
      g.className = 'stage-doc-guide-x';
      g.style.left = `${Math.round(x * zoom)}px`;
      g.dataset.axis = 'x';
      g.dataset.index = String(index);
      g.dataset.val = String(x);
      g.title = `Guia X: ${Math.round(x)} px (Clique duplo para editar, arraste para fora para excluir)`;
      guidesContainer.appendChild(g);
    });

    // Render Y guides (horizontal lines)
    guidesY.forEach((y, index) => {
      const g = document.createElement('div');
      g.className = 'stage-doc-guide-y';
      g.style.top = `${Math.round(y * zoom)}px`;
      g.dataset.axis = 'y';
      g.dataset.index = String(index);
      g.dataset.val = String(y);
      g.title = `Guia Y: ${Math.round(y)} px (Clique duplo para editar, arraste para fora para excluir)`;
      guidesContainer.appendChild(g);
    });
  }

  // Dragging from horizontal ruler creates a Y guide
  function startDragRulerH(event) {
    event.preventDefault();
    const handout = getHandout?.();
    if (!handout) return;
    const zoom = getZoom?.() || 0.6;

    const ghost = document.createElement('div');
    ghost.className = 'stage-doc-guide-y ghost';
    guidesContainer.appendChild(ghost);

    function onMove(e) {
      const pRect = pageWrap.getBoundingClientRect();
      const docY = (e.clientY - pRect.top) / zoom;
      ghost.style.top = `${Math.round(docY * zoom)}px`;
    }

    function onUp(e) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      ghost.remove();

      const pRect = pageWrap.getBoundingClientRect();
      const docY = (e.clientY - pRect.top) / zoom;

      if (docY >= 0 && docY <= handout.page.height) {
        const guides = handout.guides || { x: [], y: [] };
        const next = {
          ...handout,
          guides: {
            x: [...(guides.x || [])],
            y: [...(guides.y || []), Math.round(docY)],
          },
        };
        onEdit?.(next, { label: 'Adicionar guia' });
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  rulerH.addEventListener('pointerdown', startDragRulerH);

  // Dragging from vertical ruler creates an X guide
  function startDragRulerV(event) {
    event.preventDefault();
    const handout = getHandout?.();
    if (!handout) return;
    const zoom = getZoom?.() || 0.6;

    const ghost = document.createElement('div');
    ghost.className = 'stage-doc-guide-x ghost';
    guidesContainer.appendChild(ghost);

    function onMove(e) {
      const pRect = pageWrap.getBoundingClientRect();
      const docX = (e.clientX - pRect.left) / zoom;
      ghost.style.left = `${Math.round(docX * zoom)}px`;
    }

    function onUp(e) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      ghost.remove();

      const pRect = pageWrap.getBoundingClientRect();
      const docX = (e.clientX - pRect.left) / zoom;

      if (docX >= 0 && docX <= handout.page.width) {
        const guides = handout.guides || { x: [], y: [] };
        const next = {
          ...handout,
          guides: {
            x: [...(guides.x || []), Math.round(docX)],
            y: [...(guides.y || [])],
          },
        };
        onEdit?.(next, { label: 'Adicionar guia' });
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  rulerV.addEventListener('pointerdown', startDragRulerV);

  // Double click guide to edit exact position
  guidesContainer.addEventListener('dblclick', event => {
    const guideEl = event.target.closest('[data-axis]');
    if (!guideEl) return;
    const axis = guideEl.dataset.axis;
    const idx = parseInt(guideEl.dataset.index, 10);
    const curVal = guideEl.dataset.val;

    const input = prompt(`Posição exata da guia ${axis.toUpperCase()} (px):`, curVal);
    if (input === null) return;
    const num = parseFloat(input);
    if (!Number.isFinite(num)) return;

    const handout = getHandout?.();
    if (!handout) return;

    const guides = handout.guides || { x: [], y: [] };
    const list = [...(guides[axis] || [])];
    list[idx] = Math.round(num);

    const next = {
      ...handout,
      guides: {
        ...guides,
        [axis]: list,
      },
    };
    onEdit?.(next, { label: 'Editar guia' });
  });

  // Drag existing guide to move or delete
  guidesContainer.addEventListener('pointerdown', event => {
    const guideEl = event.target.closest('[data-axis]');
    if (!guideEl) return;
    event.preventDefault();
    event.stopPropagation();

    const axis = guideEl.dataset.axis;
    const idx = parseInt(guideEl.dataset.index, 10);
    const handout = getHandout?.();
    if (!handout) return;
    const zoom = getZoom?.() || 0.6;

    function onMove(e) {
      const pRect = pageWrap.getBoundingClientRect();
      if (axis === 'x') {
        const docX = (e.clientX - pRect.left) / zoom;
        guideEl.style.left = `${Math.round(docX * zoom)}px`;
      } else {
        const docY = (e.clientY - pRect.top) / zoom;
        guideEl.style.top = `${Math.round(docY * zoom)}px`;
      }
    }

    function onUp(e) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);

      const pRect = pageWrap.getBoundingClientRect();
      const guides = handout.guides || { x: [], y: [] };
      const list = [...(guides[axis] || [])];

      if (axis === 'x') {
        const docX = (e.clientX - pRect.left) / zoom;
        if (docX < 0 || docX > handout.page.width) {
          // Dragged outside page -> delete guide
          list.splice(idx, 1);
          onEdit?.({ ...handout, guides: { ...guides, x: list } }, { label: 'Excluir guia' });
        } else {
          list[idx] = Math.round(docX);
          onEdit?.({ ...handout, guides: { ...guides, x: list } }, { label: 'Mover guia' });
        }
      } else {
        const docY = (e.clientY - pRect.top) / zoom;
        if (docY < 0 || docY > handout.page.height) {
          // Dragged outside page -> delete guide
          list.splice(idx, 1);
          onEdit?.({ ...handout, guides: { ...guides, y: list } }, { label: 'Excluir guia' });
        } else {
          list[idx] = Math.round(docY);
          onEdit?.({ ...handout, guides: { ...guides, y: list } }, { label: 'Mover guia' });
        }
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });

  return {
    draw: drawRuler,
    toggle() {
      isVisible = !isVisible;
      drawRuler();
      return isVisible;
    },
    get isVisible() {
      return isVisible;
    },
    destroy() {
      viewport.removeEventListener('scroll', drawRuler);
      corner.remove();
      rulerH.remove();
      rulerV.remove();
      guidesContainer.remove();
    },
  };
}
