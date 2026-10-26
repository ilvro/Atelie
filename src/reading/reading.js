/**
 * Modo Leitura (Etapa 20)
 * Visualização limpa e imersiva em tela cheia com Lupa, Lanterna UV,
 * Virar folha (frente/verso) e navegação entre documentos.
 */
import { fitPage, neighbors } from './reading-geometry.js';
import { renderHandout } from '../render/handout-render.js';
import { hasUvLayers } from '../editor/bake.js';
import { renderIcon, escapeHTML as esc } from '../ui/icons.js';
import { tiltOf } from '../ui/primitives.js';
import { getRecentIds } from '../editor/navigator.js';
import { play } from '../ui/sound.js';

export { fitPage, neighbors };

export function createReading(shell, { api, images, fonts, editor, onExit = () => {} } = {}) {
  let isReaderOpen = false;
  let currentHandoutId = null;
  let currentHandout = null;
  let backHandout = null;
  let carouselDocs = [];

  let isFlipped = false;
  let isLoupeActive = false;
  let isLanternActive = false;
  let lanternRadius = 130; // 260px diameter

  let currentScale = 1;
  let currentFit = null;

  let cachedFrontUvCanvas = null;
  let cachedFrontLargeCanvas = null;
  let cachedBackUvCanvas = null;
  let cachedBackLargeCanvas = null;

  let hideBarTimer = null;
  let isHoveringBar = false;
  let lastPointerPos = { x: 0, y: 0, clientX: 0, clientY: 0 };

  async function fetchHandout(id) {
    if (!id || !api?.handouts) return null;
    if (typeof api.handouts.read === 'function') {
      return await api.handouts.read(id);
    }
    if (typeof api.handouts.get === 'function') {
      return await api.handouts.get(id);
    }
    return null;
  }

  // Create reader container
  const readerRoot = document.createElement('div');
  readerRoot.id = 'at-reader';
  readerRoot.className = 'at-reader at-desk';
  readerRoot.style.display = 'none';
  readerRoot.setAttribute('role', 'region');
  readerRoot.setAttribute('aria-label', 'Modo Leitura');

  readerRoot.innerHTML = `
    <div class="reader-stage">
      <div class="reader-sheet-stage">
        <div class="reader-sheet">
          <div class="reader-face is-front">
            <canvas class="reader-canvas reader-canvas-front"></canvas>
            <div class="reader-dark-overlay reader-dark-overlay-front"></div>
            <canvas class="reader-canvas-lantern reader-canvas-lantern-front"></canvas>
          </div>
          <div class="reader-face is-back">
            <canvas class="reader-canvas reader-canvas-back"></canvas>
            <div class="reader-dark-overlay reader-dark-overlay-back"></div>
            <canvas class="reader-canvas-lantern reader-canvas-lantern-back"></canvas>
          </div>
        </div>
      </div>
      <div class="reader-uv-halo" style="display: none;"></div>
      <div class="reader-loupe" style="display: none;">
        <canvas class="reader-loupe-canvas" width="220" height="220"></canvas>
        <div class="reader-loupe-glare"></div>
      </div>
      <div class="reader-bar">
        <div class="reader-carousel">
          <button type="button" class="reader-nav-btn reader-nav-prev" data-action="prev-doc" title="Documento anterior (←)" aria-label="Anterior">
            ${renderIcon('chevron', 16)}
          </button>
          <div class="reader-thumbs-row"></div>
          <button type="button" class="reader-nav-btn reader-nav-next" data-action="next-doc" title="Próximo documento (→)" aria-label="Próximo">
            ${renderIcon('chevron', 16)}
          </button>
        </div>
        <div class="reader-tools"></div>
      </div>
    </div>
  `;

  document.body.appendChild(readerRoot);

  const stageEl = readerRoot.querySelector('.reader-stage');
  const sheetEl = readerRoot.querySelector('.reader-sheet');
  const frontCanvas = readerRoot.querySelector('.reader-canvas-front');
  const frontOverlay = readerRoot.querySelector('.reader-dark-overlay-front');
  const frontLantern = readerRoot.querySelector('.reader-canvas-lantern-front');

  const backCanvas = readerRoot.querySelector('.reader-canvas-back');
  const backOverlay = readerRoot.querySelector('.reader-dark-overlay-back');
  const backLantern = readerRoot.querySelector('.reader-canvas-lantern-back');

  const uvHalo = readerRoot.querySelector('.reader-uv-halo');
  const loupeEl = readerRoot.querySelector('.reader-loupe');
  const loupeCanvas = readerRoot.querySelector('.reader-loupe-canvas');
  const loupeCtx = loupeCanvas.getContext('2d');

  const readerBar = readerRoot.querySelector('.reader-bar');
  const thumbsRow = readerRoot.querySelector('.reader-thumbs-row');
  const toolsEl = readerRoot.querySelector('.reader-tools');
  const prevBtn = readerRoot.querySelector('[data-action="prev-doc"]');
  const nextBtn = readerRoot.querySelector('[data-action="next-doc"]');

  function wakeBar() {
    readerBar.classList.remove('is-hidden');
    if (hideBarTimer) clearTimeout(hideBarTimer);
    hideBarTimer = setTimeout(() => {
      if (!isHoveringBar && isReaderOpen) {
        readerBar.classList.add('is-hidden');
      }
    }, 2000);
  }

  readerBar.addEventListener('mouseenter', () => { isHoveringBar = true; });
  readerBar.addEventListener('mouseleave', () => { isHoveringBar = false; wakeBar(); });

  function getActiveFaceDoc() {
    return isFlipped && backHandout ? backHandout : currentHandout;
  }

  function getActiveCanvases() {
    if (isFlipped && backHandout) {
      return {
        mainCanvas: backCanvas,
        overlayEl: backOverlay,
        lanternCanvas: backLantern,
        isBack: true,
      };
    }
    return {
      mainCanvas: frontCanvas,
      overlayEl: frontOverlay,
      lanternCanvas: frontLantern,
      isBack: false,
    };
  }

  async function ensureUvCanvas(doc, scale) {
    if (isFlipped) {
      if (!cachedBackUvCanvas) {
        cachedBackUvCanvas = document.createElement('canvas');
        await renderHandout(cachedBackUvCanvas, doc, {
          scale,
          light: 'uv',
          loadImage: images?.load,
          loadFont: fonts?.load,
        });
      }
      return cachedBackUvCanvas;
    }
    if (!cachedFrontUvCanvas) {
      cachedFrontUvCanvas = document.createElement('canvas');
      await renderHandout(cachedFrontUvCanvas, doc, {
        scale,
        light: 'uv',
        loadImage: images?.load,
        loadFont: fonts?.load,
      });
    }
    return cachedFrontUvCanvas;
  }

  async function ensureLargeCanvas(doc, baseScale) {
    const largeScale = baseScale * 2.5;
    if (isFlipped) {
      if (!cachedBackLargeCanvas) {
        cachedBackLargeCanvas = document.createElement('canvas');
        await renderHandout(cachedBackLargeCanvas, doc, {
          scale: largeScale,
          light: 'normal',
          loadImage: images?.load,
          loadFont: fonts?.load,
        });
      }
      return cachedBackLargeCanvas;
    }
    if (!cachedFrontLargeCanvas) {
      cachedFrontLargeCanvas = document.createElement('canvas');
      await renderHandout(cachedFrontLargeCanvas, doc, {
        scale: largeScale,
        light: 'normal',
        loadImage: images?.load,
        loadFont: fonts?.load,
      });
    }
    return cachedFrontLargeCanvas;
  }

  function updateLoupe(px, py, clientX, clientY) {
    if (!isLoupeActive || !currentFit) {
      loupeEl.style.display = 'none';
      return;
    }

    const largeCanvas = isFlipped ? cachedBackLargeCanvas : cachedFrontLargeCanvas;
    if (!largeCanvas) {
      loupeEl.style.display = 'none';
      return;
    }

    // Coordinates in largeCanvas correspond to (px * 2.5, py * 2.5)
    const sx = Math.round(px * 2.5 - 110);
    const sy = Math.round(py * 2.5 - 110);

    loupeCtx.clearRect(0, 0, 220, 220);
    loupeCtx.drawImage(largeCanvas, sx, sy, 220, 220, 0, 0, 220, 220);

    const rect = sheetEl.getBoundingClientRect();
    const cx = clientX !== undefined ? clientX : (rect.left + px);
    const cy = clientY !== undefined ? clientY : (rect.top + py);

    loupeEl.style.left = `${cx}px`;
    loupeEl.style.top = `${cy}px`;
    loupeEl.style.display = 'block';
  }

  async function updateLantern(px, py, clientX, clientY) {
    const doc = getActiveFaceDoc();
    if (!isLanternActive || !doc || !hasUvLayers(doc) || !currentFit) {
      uvHalo.style.display = 'none';
      frontLantern.getContext('2d').clearRect(0, 0, frontLantern.width, frontLantern.height);
      backLantern.getContext('2d').clearRect(0, 0, backLantern.width, backLantern.height);
      return;
    }

    const { lanternCanvas } = getActiveCanvases();
    const uvCanvas = await ensureUvCanvas(doc, currentScale);
    const ctx = lanternCanvas.getContext('2d');

    const w = lanternCanvas.width;
    const h = lanternCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(uvCanvas, 0, 0);

    // Apply destination-in radial mask
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    const grad = ctx.createRadialGradient(px, py, Math.max(0, lanternRadius * 0.72), px, py, lanternRadius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.95)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, lanternRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const rect = sheetEl.getBoundingClientRect();
    const cx = clientX !== undefined ? clientX : (rect.left + px);
    const cy = clientY !== undefined ? clientY : (rect.top + py);

    uvHalo.style.width = `${lanternRadius * 2}px`;
    uvHalo.style.height = `${lanternRadius * 2}px`;
    uvHalo.style.left = `${cx}px`;
    uvHalo.style.top = `${cy}px`;
    uvHalo.style.display = 'block';
  }

  function handlePointer(e) {
    if (!isReaderOpen) return;
    wakeBar();

    const rect = sheetEl.getBoundingClientRect();
    const px = Math.round(e.clientX - rect.left);
    const py = Math.round(e.clientY - rect.top);

    lastPointerPos = { x: px, y: py, clientX: e.clientX, clientY: e.clientY };

    const isInsideSheet = px >= 0 && px <= rect.width && py >= 0 && py <= rect.height;

    if (isInsideSheet) {
      if (isLoupeActive) {
        updateLoupe(px, py, e.clientX, e.clientY);
      }
      if (isLanternActive) {
        updateLantern(px, py, e.clientX, e.clientY);
      }
    } else {
      if (isLoupeActive) loupeEl.style.display = 'none';
      if (isLanternActive) {
        uvHalo.style.display = 'none';
        frontLantern.getContext('2d').clearRect(0, 0, frontLantern.width, frontLantern.height);
        backLantern.getContext('2d').clearRect(0, 0, backLantern.width, backLantern.height);
      }
    }
  }

  readerRoot.addEventListener('pointermove', handlePointer);

  // Wheel adjusts UV lantern circle size
  readerRoot.addEventListener('wheel', e => {
    if (!isReaderOpen || !isLanternActive) return;
    e.preventDefault();
    lanternRadius = Math.max(60, Math.min(240, lanternRadius - Math.sign(e.deltaY) * 15));
    updateLantern(lastPointerPos.x, lastPointerPos.y, lastPointerPos.clientX, lastPointerPos.clientY);
  }, { passive: false });

  async function toggleLoupe() {
    isLoupeActive = !isLoupeActive;
    if (isLoupeActive) {
      isLanternActive = false;
      uvHalo.style.display = 'none';
      frontOverlay.classList.remove('is-active');
      backOverlay.classList.remove('is-active');
      frontLantern.getContext('2d').clearRect(0, 0, frontLantern.width, frontLantern.height);
      backLantern.getContext('2d').clearRect(0, 0, backLantern.width, backLantern.height);

      const doc = getActiveFaceDoc();
      if (doc) await ensureLargeCanvas(doc, currentScale);
      updateLoupe(lastPointerPos.x, lastPointerPos.y, lastPointerPos.clientX, lastPointerPos.clientY);
    } else {
      loupeEl.style.display = 'none';
    }
    updateToolsBar();
  }

  async function toggleLantern() {
    const doc = getActiveFaceDoc();
    if (!doc || !hasUvLayers(doc)) return;

    isLanternActive = !isLanternActive;
    if (isLanternActive) {
      isLoupeActive = false;
      loupeEl.style.display = 'none';

      frontOverlay.classList.toggle('is-active', !isFlipped);
      backOverlay.classList.toggle('is-active', isFlipped);

      await ensureUvCanvas(doc, currentScale);
      updateLantern(lastPointerPos.x, lastPointerPos.y, lastPointerPos.clientX, lastPointerPos.clientY);
    } else {
      uvHalo.style.display = 'none';
      frontOverlay.classList.remove('is-active');
      backOverlay.classList.remove('is-active');
      frontLantern.getContext('2d').clearRect(0, 0, frontLantern.width, frontLantern.height);
      backLantern.getContext('2d').clearRect(0, 0, backLantern.width, backLantern.height);
    }
    updateToolsBar();
  }

  async function flipSheet() {
    if (!currentHandout?.back?.handoutId) return;

    play('paper-slide');
    isFlipped = !isFlipped;
    sheetEl.classList.toggle('is-flipped', isFlipped);

    // If back handout was not loaded yet
    if (isFlipped && !backHandout) {
      try {
        backHandout = await fetchHandout(currentHandout.back.handoutId);
        if (backHandout) {
          await renderHandout(backCanvas, backHandout, {
            scale: currentScale,
            light: 'normal',
            loadImage: images?.load,
            loadFont: fonts?.load,
          });
          backLantern.width = backCanvas.width;
          backLantern.height = backCanvas.height;
        }
      } catch (err) {
        console.warn('[atelie] Erro ao carregar verso:', err);
      }
    }

    // Reset or adapt tools
    if (isLanternActive) {
      const activeDoc = getActiveFaceDoc();
      if (activeDoc && hasUvLayers(activeDoc)) {
        frontOverlay.classList.toggle('is-active', !isFlipped);
        backOverlay.classList.toggle('is-active', isFlipped);
        await ensureUvCanvas(activeDoc, currentScale);
        updateLantern(lastPointerPos.x, lastPointerPos.y, lastPointerPos.clientX, lastPointerPos.clientY);
      } else {
        isLanternActive = false;
        frontOverlay.classList.remove('is-active');
        backOverlay.classList.remove('is-active');
        uvHalo.style.display = 'none';
      }
    }

    if (isLoupeActive) {
      const activeDoc = getActiveFaceDoc();
      if (activeDoc) await ensureLargeCanvas(activeDoc, currentScale);
      updateLoupe(lastPointerPos.x, lastPointerPos.y, lastPointerPos.clientX, lastPointerPos.clientY);
    }

    updateToolsBar();
  }

  function updateToolsBar() {
    const doc = getActiveFaceDoc();
    const hasUv = Boolean(doc && hasUvLayers(doc));
    const hasBack = Boolean(currentHandout?.back?.handoutId);

    toolsEl.innerHTML = `
      <button type="button" class="at-btn reader-tool-btn" data-action="toggle-loupe" aria-pressed="${isLoupeActive}" title="Lupa (L)">
        ${renderIcon('search', 16)}
        <span>Lupa</span>
      </button>
      ${hasUv ? `
        <button type="button" class="at-btn reader-tool-btn is-uv" data-action="toggle-uv-lantern" aria-pressed="${isLanternActive}" title="Lanterna UV (U)">
          ${renderIcon('sun', 16)}
          <span>Lanterna UV</span>
        </button>
      ` : ''}
      ${hasBack ? `
        <button type="button" class="at-btn reader-tool-btn" data-action="flip-sheet" title="Virar folha (F)">
          ${renderIcon('rotate', 16)}
          <span>Virar</span>
        </button>
      ` : ''}
      <button type="button" class="at-btn reader-tool-btn is-close" data-action="close-reader" title="Sair (Esc)">
        ${renderIcon('close', 16)}
        <span>Sair</span>
      </button>
    `;
  }

  function updateCarouselRow() {
    if (!carouselDocs.length) {
      thumbsRow.innerHTML = '';
      return;
    }

    const { prev, current, next } = neighbors(carouselDocs, currentHandout.id);

    thumbsRow.innerHTML = `
      <div class="reader-thumb-card is-prev" data-action="prev-doc" title="${esc(prev?.name || '')}">
        <span class="reader-thumb-title">${esc(prev?.name || '')}</span>
      </div>
      <div class="reader-thumb-card is-current" title="${esc(current?.name || '')}">
        <span class="reader-thumb-title">${esc(current?.name || '')}</span>
      </div>
      <div class="reader-thumb-card is-next" data-action="next-doc" title="${esc(next?.name || '')}">
        <span class="reader-thumb-title">${esc(next?.name || '')}</span>
      </div>
    `;
  }

  async function renderDocument(doc, direction = 0) {
    currentHandout = doc;
    currentHandoutId = doc.id;
    backHandout = null;
    isFlipped = false;
    sheetEl.classList.remove('is-flipped');

    cachedFrontUvCanvas = null;
    cachedFrontLargeCanvas = null;
    cachedBackUvCanvas = null;
    cachedBackLargeCanvas = null;

    if (direction !== 0) {
      const outClass = direction > 0 ? 'is-sliding-out-left' : 'is-sliding-out-right';
      const inClass = direction > 0 ? 'is-sliding-in-right' : 'is-sliding-in-left';
      sheetEl.classList.add(outClass);
      await new Promise(r => setTimeout(r, 120));
      sheetEl.classList.remove(outClass);
      sheetEl.classList.add(inClass);
      setTimeout(() => sheetEl.classList.remove(inClass), 220);
    }

    const vp = { width: window.innerWidth, height: window.innerHeight };
    currentFit = fitPage(doc.page, vp, 0.06);
    currentScale = currentFit.scale;

    sheetEl.style.width = `${currentFit.width}px`;
    sheetEl.style.height = `${currentFit.height}px`;

    frontCanvas.width = currentFit.width;
    frontCanvas.height = currentFit.height;
    frontLantern.width = currentFit.width;
    frontLantern.height = currentFit.height;

    backCanvas.width = currentFit.width;
    backCanvas.height = currentFit.height;
    backLantern.width = currentFit.width;
    backLantern.height = currentFit.height;

    await renderHandout(frontCanvas, doc, {
      scale: currentScale,
      light: 'normal',
      loadImage: images?.load,
      loadFont: fonts?.load,
    });

    if (doc.back?.handoutId) {
      try {
        backHandout = await fetchHandout(doc.back.handoutId);
        if (backHandout) {
          await renderHandout(backCanvas, backHandout, {
            scale: currentScale,
            light: 'normal',
            loadImage: images?.load,
            loadFont: fonts?.load,
          });
        }
      } catch (err) {
        console.warn('[atelie] Erro ao pré-carregar verso:', err);
      }
    }

    if (isLanternActive && hasUvLayers(doc)) {
      frontOverlay.classList.add('is-active');
      await ensureUvCanvas(doc, currentScale);
      updateLantern(lastPointerPos.x, lastPointerPos.y, lastPointerPos.clientX, lastPointerPos.clientY);
    } else {
      isLanternActive = false;
      frontOverlay.classList.remove('is-active');
      uvHalo.style.display = 'none';
    }

    if (isLoupeActive) {
      await ensureLargeCanvas(doc, currentScale);
      updateLoupe(lastPointerPos.x, lastPointerPos.y, lastPointerPos.clientX, lastPointerPos.clientY);
    }

    updateCarouselRow();
    updateToolsBar();
    wakeBar();
  }

  async function navigateCarousel(direction) {
    if (!carouselDocs.length || carouselDocs.length <= 1) return;
    const { prev, next } = neighbors(carouselDocs, currentHandout.id);
    const target = direction > 0 ? next : prev;
    if (!target || target.id === currentHandout.id) return;

    try {
      const fullDoc = await fetchHandout(target.id);
      if (fullDoc) {
        await renderDocument(fullDoc, direction);
      }
    } catch (err) {
      console.warn('[atelie] Erro ao navegar carrossel:', err);
    }
  }

  // Keyboard shortcut listener
  function handleKeyDown(e) {
    if (!isReaderOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateCarousel(-1);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateCarousel(1);
      return;
    }

    if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      toggleLoupe();
      return;
    }

    if (e.key.toLowerCase() === 'u' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      toggleLantern();
      return;
    }

    if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      flipSheet();
      return;
    }
  }

  // Bar and button events
  readerBar.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'toggle-loupe') toggleLoupe();
    else if (action === 'toggle-uv-lantern') toggleLantern();
    else if (action === 'flip-sheet') flipSheet();
    else if (action === 'close-reader') close();
    else if (action === 'prev-doc') navigateCarousel(-1);
    else if (action === 'next-doc') navigateCarousel(1);
  });

  function handleResize() {
    if (!isReaderOpen || !currentHandout) return;
    renderDocument(currentHandout, 0);
  }

  async function open(handoutId) {
    play('paper-slide');
    let targetDoc = null;

    if (handoutId) {
      try {
        targetDoc = await fetchHandout(handoutId);
      } catch (err) {
        console.warn('[atelie] Erro ao carregar documento para leitura:', err);
      }
    }

    if (!targetDoc && editor?.state?.handout) {
      targetDoc = editor.state.handout;
    }

    if (!targetDoc) {
      try {
        const list = await api.handouts.list();
        if (list.length > 0) {
          targetDoc = await fetchHandout(list[0].id);
        }
      } catch {}
    }

    if (!targetDoc) return;

    // Load folder documents or recents for carousel
    try {
      const allDocs = await api.handouts.list();
      if (targetDoc.folder) {
        carouselDocs = allDocs.filter(d => d.folder === targetDoc.folder);
      } else {
        const recentIds = getRecentIds();
        const recents = recentIds.map(id => allDocs.find(d => d.id === id)).filter(Boolean);
        carouselDocs = recents.length > 0 ? recents : allDocs.filter(d => !d.folder);
      }
    } catch {
      carouselDocs = [targetDoc];
    }

    isReaderOpen = true;
    document.body.classList.add('is-reading');
    readerRoot.style.display = 'flex';

    // Enter fullscreen if supported
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    await renderDocument(targetDoc, 0);
  }

  function close() {
    if (!isReaderOpen) return;
    isReaderOpen = false;

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    document.body.classList.remove('is-reading');
    readerRoot.style.display = 'none';

    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', handleResize);

    if (hideBarTimer) clearTimeout(hideBarTimer);

    // If editor exists, restore document
    if (editor && currentHandout && editor.state?.handout?.id !== currentHandout.id) {
      editor.open(currentHandout);
    }

    onExit();
  }

  return {
    open,
    close,
    isOpen: () => isReaderOpen,
    get currentHandout() {
      return currentHandout;
    },
    toggleLoupe,
    toggleLantern,
    flipSheet,
    navigateCarousel,
    element: readerRoot,
  };
}
