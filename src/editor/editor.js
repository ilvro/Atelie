import { createEditorState } from './state.js';
import { createStage } from './stage.js';
import { createLayersPanel } from './layers-panel.js';
import { createPropertiesPanel } from './properties-panel.js';
import { createHistoryPanel } from './history-panel.js';
import { renderIcon, escapeHTML as esc } from '../ui/icons.js';
import { stamp } from '../ui/primitives.js';
import {
  createHandout,
  PAGE_PRESETS,
  removeLayer,
  duplicateLayer,
  moveLayer,
  updateLayer,
  addLayer,
  textLayer,
  imageLayer,
  shapeLayer,
} from '../domain/handouts.js';
import { moveBox, layerAtPoint } from './geometry.js';
import { contextMenu } from '../ui/context-menu.js';

export function createEditor(shell, { api, images, fonts } = {}) {
  const deskStage = document.getElementById('desk-stage');
  if (!deskStage) return null;

  let state = null;
  let stage = null;
  let layersPanel = null;
  let propertiesPanel = null;
  let historyPanel = null;

  // Local clipboard memory for copy/paste between tabs and documents
  let copiedLayerMemory = null;

  // Document bar
  const docBar = document.createElement('div');
  docBar.className = 'desk-doc-bar';
  docBar.innerHTML = `
    <div class="desk-doc-title-area">
      <input type="text" class="at-doc-name-input" aria-label="Nome do documento" value="" />
      <span class="at-stamp is-default desk-size-stamp"></span>
    </div>
    <div class="desk-doc-actions">
      <button type="button" class="at-icon-btn" data-action="undo" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
        ${renderIcon('undo', 16)}
      </button>
      <button type="button" class="at-icon-btn" data-action="redo" title="Refazer (Ctrl+Y)" aria-label="Refazer">
        ${renderIcon('redo', 16)}
      </button>
      <button type="button" class="at-btn is-disabled" title="Disponível na etapa 19" disabled>
        Luz UV
      </button>
      <button type="button" class="at-btn is-primary" data-action="archive">
        Arquivar
      </button>
    </div>
  `;

  // Stamp overlay for saved animation
  const stampOverlay = document.createElement('div');
  stampOverlay.className = 'archive-stamp-overlay';
  stampOverlay.innerHTML = stamp('ARQUIVADO', { tone: 'default', tilt: -4 });

  // Stage container
  const stageContainer = document.createElement('div');
  stageContainer.style.position = 'absolute';
  stageContainer.style.top = '52px';
  stageContainer.style.left = '0';
  stageContainer.style.right = '0';
  stageContainer.style.bottom = '0';

  deskStage.innerHTML = '';
  deskStage.appendChild(docBar);
  deskStage.appendChild(stageContainer);
  deskStage.appendChild(stampOverlay);

  const nameInput = docBar.querySelector('.at-doc-name-input');
  const sizeStamp = docBar.querySelector('.desk-size-stamp');
  const undoBtn = docBar.querySelector('[data-action="undo"]');
  const redoBtn = docBar.querySelector('[data-action="redo"]');
  const archiveBtn = docBar.querySelector('[data-action="archive"]');

  function updateDocBar() {
    if (!state) return;
    const doc = state.handout;
    if (nameInput.value !== doc.name && document.activeElement !== nameInput) {
      nameInput.value = doc.name;
    }
    sizeStamp.textContent = `${doc.page.width} × ${doc.page.height}`;
    undoBtn.disabled = !state.canUndo;
    redoBtn.disabled = !state.canRedo;
  }

  function triggerArchiveAnimation() {
    stampOverlay.classList.remove('active');
    void stampOverlay.offsetWidth;
    stampOverlay.classList.add('active');
    setTimeout(() => {
      stampOverlay.classList.remove('active');
    }, 1200);
  }

  async function updateRecentRail() {
    try {
      const list = await api.handouts.list();
      const recents = list.slice(0, 5).map(item => ({
        id: item.id,
        name: item.name,
        preview: item.preview
          ? api.mode === 'browser'
            ? null
            : `api/atelie/handouts/${item.id}/preview`
          : null,
      }));
      shell.rail.setRecent(recents);
    } catch {
      // ignore
    }
  }

  async function archiveDocument() {
    if (!state) return;
    const doc = state.handout;

    try {
      let saved;
      if (doc.revision === 0) {
        saved = await api.handouts.create(doc);
      } else {
        saved = await api.handouts.save(doc);
      }

      state.markSaved(saved);

      // Generate thumbnail preview (480px width)
      try {
        const previewCanvas = document.createElement('canvas');
        const aspect = doc.page.height / doc.page.width;
        previewCanvas.width = 480;
        previewCanvas.height = Math.round(480 * aspect);
        const { renderHandout } = await import('../render/handout-render.js');
        await renderHandout(previewCanvas, saved, {
          scale: 480 / doc.page.width,
          loadImage: images?.load,
          loadFont: fonts?.load,
        });
        const dataUrl = previewCanvas.toDataURL('image/webp', 0.82);
        await api.handouts.savePreview(saved, dataUrl);
      } catch (err) {
        console.warn('[atelie] Erro ao gerar prévia:', err);
      }

      triggerArchiveAnimation();

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        params.delete('new');
        params.set('handout', saved.id);
        window.history.replaceState(null, '', `?${params.toString()}`);
        localStorage.setItem('atelie-last', saved.id);
      }

      await updateRecentRail();
      renderDocumentsDrawer();
    } catch (err) {
      shell.notify(`Não foi possível arquivar: ${err.message}`, { tone: 'error' });
    }
  }

  function confirmUnsavedChanges(onDiscard) {
    if (!state || !state.dirty) {
      onDiscard();
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'at-modal-backdrop';
    backdrop.innerHTML = `
      <div class="at-modal" role="dialog" aria-modal="true" aria-label="Alterações não arquivadas">
        <header class="at-modal-header">
          <h3 class="at-modal-title">Alterações não arquivadas</h3>
        </header>
        <div class="at-modal-body">
          <p>O documento atual possui alterações que ainda não foram arquivadas. Deseja arquivar antes de prosseguir?</p>
          <div class="modal-dialog-actions" style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
            <button type="button" class="at-btn modal-cancel-btn">Cancelar</button>
            <button type="button" class="at-btn is-danger modal-discard-btn">Descartar</button>
            <button type="button" class="at-btn is-primary modal-save-btn">Arquivar e continuar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    backdrop.querySelector('.modal-cancel-btn').addEventListener('click', () => backdrop.remove());
    backdrop.querySelector('.modal-discard-btn').addEventListener('click', () => {
      backdrop.remove();
      onDiscard();
    });
    backdrop.querySelector('.modal-save-btn').addEventListener('click', async () => {
      backdrop.remove();
      await archiveDocument();
      onDiscard();
    });
  }

  function loadHandout(handout) {
    state = createEditorState(handout);

    if (stage) {
      stage.destroy();
    }

    stage = createStage(stageContainer, {
      images,
      fonts,
      onSelect: layerId => state.select(layerId),
      onEdit: (nextHandout, meta) => state.edit(nextHandout, meta),
    });

    // Inspector panels
    const layersWrap = document.createElement('div');
    layersPanel = createLayersPanel(layersWrap, { state });
    shell.inspector.panel('layers', layersWrap);

    const propertiesWrap = document.createElement('div');
    propertiesPanel = createPropertiesPanel(propertiesWrap, { state, api });
    shell.inspector.panel('properties', propertiesWrap);

    const historyWrap = document.createElement('div');
    historyPanel = createHistoryPanel(historyWrap, { state });
    shell.inspector.panel('history', historyWrap);

    state.subscribe(change => {
      updateDocBar();
      if (
        change.type === 'edit' ||
        change.type === 'undo' ||
        change.type === 'redo' ||
        change.type === 'goto'
      ) {
        stage.show(state.handout);
        layersPanel.render();
        propertiesPanel.render();
        historyPanel.render();
      } else if (change.type === 'select') {
        stage.select(state.selection);
        layersPanel.render();
        propertiesPanel.render();
      }
    });

    stage.show(state.handout);
    updateDocBar();
    stage.zoom('fit');

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.delete('new');
      params.set('handout', handout.id);
      window.history.replaceState(null, '', `?${params.toString()}`);
      localStorage.setItem('atelie-last', handout.id);
    }
  }

  // Document Name editing
  nameInput.addEventListener('input', () => {
    if (!state) return;
    const next = { ...state.handout, name: nameInput.value };
    state.edit(next, { label: 'Renomear documento', coalesce: 'doc-name' });
  });

  // Action buttons
  undoBtn.addEventListener('click', () => state?.undo());
  redoBtn.addEventListener('click', () => state?.redo());
  archiveBtn.addEventListener('click', () => archiveDocument());

  // Documents drawer
  async function renderDocumentsDrawer() {
    const content = document.createElement('div');
    content.className = 'docs-drawer-view';

    content.innerHTML = `
      <div class="docs-drawer-actions">
        <button type="button" class="at-btn is-primary docs-new-btn" data-action="new-doc">
          ${renderIcon('plus', 14)}
          <span>Novo Documento</span>
        </button>
      </div>
      <div class="docs-grid" id="docs-drawer-grid">
        <p class="drawer-loading">Carregando documentos...</p>
      </div>
    `;

    const grid = content.querySelector('#docs-drawer-grid');
    const newBtn = content.querySelector('.docs-new-btn');

    newBtn.addEventListener('click', () => {
      confirmUnsavedChanges(() => {
        const doc = createHandout({ preset: 'a4' });
        loadHandout(doc);
        shell.drawer.close();
      });
    });

    try {
      const list = await api.handouts.list();
      if (!list.length) {
        grid.innerHTML = '<p class="drawer-empty-hint">Nenhum documento arquivado ainda.</p>';
      } else {
        grid.innerHTML = list
          .map(
            item => `
          <button type="button" class="doc-card-btn" data-id="${esc(item.id)}">
            <div class="doc-card-preview">
              ${
                item.preview
                  ? `<img src="${esc(api.mode === 'browser' ? '' : `api/atelie/handouts/${item.id}/preview`)}" alt="" />`
                  : renderIcon('doc', 24)
              }
            </div>
            <div class="doc-card-info">
              <span class="doc-card-name">${esc(item.name)}</span>
              <span class="doc-card-meta">${new Date(item.updatedAt).toLocaleDateString('pt-BR')} · Rev ${item.revision}</span>
            </div>
          </button>
        `
          )
          .join('');

        grid.querySelectorAll('.doc-card-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            confirmUnsavedChanges(async () => {
              try {
                const doc = await api.handouts.read(id);
                loadHandout(doc);
                shell.drawer.close();
              } catch (err) {
                shell.notify(`Erro ao abrir documento: ${err.message}`, { tone: 'error' });
              }
            });
          });
        });
      }
    } catch (err) {
      grid.innerHTML = `<p class="drawer-error-hint">Erro ao carregar: ${esc(err.message)}</p>`;
    }

    shell.drawer.panel('documents', content);
  }

  // Initialize documents drawer panel
  renderDocumentsDrawer();

  // Helper actions for layers
  function duplicateSelected() {
    if (!state?.selection) return;
    const next = duplicateLayer(state.handout, state.selection);
    state.edit(next, { label: 'Duplicar camada' });
  }

  function removeSelected() {
    if (!state?.selection) return;
    const selId = state.selection;
    const next = removeLayer(state.handout, selId);
    state.edit(next, { label: 'Excluir camada' });
  }

  function moveSelected(delta) {
    if (!state?.selection) return;
    const idx = state.handout.layers.findIndex(l => l.id === state.selection);
    const target = idx + delta;
    if (target >= 0 && target < state.handout.layers.length) {
      const next = moveLayer(state.handout, state.selection, target);
      state.edit(next, { label: delta > 0 ? 'Subir camada' : 'Descer camada' });
    }
  }

  function moveSelectedTo(targetIdx) {
    if (!state?.selection) return;
    const next = moveLayer(state.handout, state.selection, targetIdx);
    state.edit(next, { label: 'Reordenar camada' });
  }

  function toggleLockSelected() {
    if (!state?.selection) return;
    const l = state.handout.layers.find(x => x.id === state.selection);
    if (!l) return;
    const next = updateLayer(state.handout, l.id, { locked: !l.locked });
    state.edit(next, { label: l.locked ? 'Destravar camada' : 'Travar camada' });
  }

  function toggleVisibleSelected() {
    if (!state?.selection) return;
    const l = state.handout.layers.find(x => x.id === state.selection);
    if (!l) return;
    const next = updateLayer(state.handout, l.id, { visible: !l.visible });
    state.edit(next, { label: l.visible ? 'Ocultar camada' : 'Exibir camada' });
  }

  function copySelected() {
    if (!state?.selection) return;
    const layer = state.handout.layers.find(l => l.id === state.selection);
    if (!layer) return;
    copiedLayerMemory = structuredClone(layer);
    if (typeof window !== 'undefined') {
      window.__atelieCopiedLayer = copiedLayerMemory;
    }
    try {
      navigator.clipboard?.writeText?.('atelie-layer:v1:' + JSON.stringify(copiedLayerMemory)).catch(() => {});
    } catch {}
    shell.notify('Camada copiada', { tone: 'info' });
  }

  function pasteCopiedLayer(sourceLayer, atPos = null) {
    if (!state || !sourceLayer) return;
    const cloned = structuredClone(sourceLayer);
    cloned.id = 'l-' + Math.random().toString(36).slice(2, 10);
    if (atPos) {
      cloned.x = Math.round(atPos[0] - cloned.width / 2);
      cloned.y = Math.round(atPos[1] - cloned.height / 2);
    } else {
      cloned.x += 20;
      cloned.y += 20;
    }

    let insertIdx = state.handout.layers.length;
    if (state.selection) {
      const idx = state.handout.layers.findIndex(l => l.id === state.selection);
      if (idx >= 0) insertIdx = idx + 1;
    }

    const next = addLayer(state.handout, cloned, insertIdx);
    state.edit(next, { label: `Colar ${cloned.name}` });
    state.select(cloned.id);
  }

  function addTextAt(pos) {
    if (!state) return;
    const newL = textLayer({
      name: 'Texto',
      x: Math.round(pos[0] - 300),
      y: Math.round(pos[1] - 100),
      width: 600,
      height: 200,
    });
    const next = addLayer(state.handout, newL);
    state.edit(next, { label: 'Adicionar texto' });
    state.select(newL.id);
  }

  function addImageAt(pos) {
    if (!state) return;
    const newL = imageLayer({
      name: 'Imagem',
      x: Math.round(pos[0] - 300),
      y: Math.round(pos[1] - 200),
      width: 600,
      height: 400,
    });
    const next = addLayer(state.handout, newL);
    state.edit(next, { label: 'Adicionar imagem' });
    state.select(newL.id);
  }

  function triggerEyedropper() {
    if (!stage) return;
    stage.activateEyedropper(color => {
      const focusedInput = document.activeElement?.closest?.('.field')?.querySelector?.('input[type="color"]');
      if (focusedInput) {
        focusedInput.value = color;
        focusedInput.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      const selId = state?.selection;
      if (!selId) return;
      const layer = state.handout.layers.find(l => l.id === selId);
      if (!layer || layer.locked) return;

      if (layer.kind === 'text') {
        const next = updateLayer(state.handout, selId, { text: { ...layer.text, color } });
        state.edit(next, { label: 'Conta-gotas: cor da tinta' });
      } else if (layer.kind === 'shape') {
        const next = updateLayer(state.handout, selId, { shape: { ...layer.shape, fill: color } });
        state.edit(next, { label: 'Conta-gotas: cor de preenchimento' });
      } else if (layer.kind === 'image') {
        const next = updateLayer(state.handout, selId, {
          image: { ...layer.image, tint: { ...(layer.image.tint || {}), color } },
        });
        state.edit(next, { label: 'Conta-gotas: cor de tingimento' });
      }
    });
  }

  // --- External Image Drag-and-Drop & Paste ---
  deskStage.addEventListener('dragover', event => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  });

  deskStage.addEventListener('drop', async event => {
    event.preventDefault();
    const dt = event.dataTransfer;
    if (!dt || !dt.files || !dt.files.length) return;

    const files = Array.from(dt.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;

    const pageWrap = deskStage.querySelector('.stage-page-wrap');
    if (!pageWrap || !state) return;
    const pRect = pageWrap.getBoundingClientRect();
    const zoom = stage.getZoom();
    let dropX = (event.clientX - pRect.left) / zoom;
    let dropY = (event.clientY - pRect.top) / zoom;
    if (
      (!event.clientX && !event.clientY) ||
      dropX < 0 ||
      dropX > state.handout.page.width ||
      dropY < 0 ||
      dropY > state.handout.page.height
    ) {
      dropX = state.handout.page.width / 2;
      dropY = state.handout.page.height / 2;
    }

    shell.notify('Enviando imagem…', { tone: 'info' });
    let cascade = 0;

    for (const file of files) {
      try {
        const uploaded = await api.uploads.send(file);
        const pageWidth = state.handout.page.width;
        const maxW = pageWidth * 0.5;
        const w = Math.min(uploaded.width || maxW, maxW);
        const h =
          uploaded.width && uploaded.height
            ? Math.round(w * (uploaded.height / uploaded.width))
            : Math.round(w * 0.75);
        const posX = Math.round(dropX - w / 2) + cascade;
        const posY = Math.round(dropY - h / 2) + cascade;

        const newL = imageLayer({
          name: file.name.replace(/\.[^.]+$/, '') || 'Imagem',
          x: posX,
          y: posY,
          width: w,
          height: h,
          image: { src: { upload: uploaded.id }, fit: 'contain' },
        });

        const next = addLayer(state.handout, newL);
        state.edit(next, { label: 'Adicionar imagem' });
        state.select(newL.id);
        cascade += 20;
      } catch (err) {
        shell.notify(`Erro ao enviar imagem: ${err.message}`, { tone: 'error' });
      }
    }
  });

  window.addEventListener('paste', async event => {
    const isEditingField =
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
      document.activeElement?.isContentEditable;
    if (isEditingField) return;

    // Check if clipboard contains an image file
    const items = event.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          shell.notify('Enviando imagem…', { tone: 'info' });
          try {
            const uploaded = await api.uploads.send(file);
            const pageWidth = state.handout.page.width;
            const maxW = pageWidth * 0.5;
            const w = Math.min(uploaded.width || maxW, maxW);
            const h =
              uploaded.width && uploaded.height
                ? Math.round(w * (uploaded.height / uploaded.width))
                : Math.round(w * 0.75);
            const x = Math.round((pageWidth - w) / 2);
            const y = Math.round((state.handout.page.height - h) / 2);

            const newL = imageLayer({
              name: 'Imagem colada',
              x,
              y,
              width: w,
              height: h,
              image: { src: { upload: uploaded.id }, fit: 'contain' },
            });

            const next = addLayer(state.handout, newL);
            state.edit(next, { label: 'Colar imagem' });
            state.select(newL.id);
            return;
          } catch (err) {
            shell.notify(`Erro ao colar imagem: ${err.message}`, { tone: 'error' });
            return;
          }
        }
      }
    }

    // Check if clipboard text contains atelie-layer:v1:
    let text = '';
    try {
      text = event.clipboardData?.getData('text/plain') || '';
    } catch {}

    if (text.startsWith('atelie-layer:v1:')) {
      event.preventDefault();
      try {
        const raw = text.slice('atelie-layer:v1:'.length);
        const parsed = JSON.parse(raw);
        pasteCopiedLayer(parsed);
      } catch {
        // ignore
      }
    } else if (copiedLayerMemory) {
      event.preventDefault();
      pasteCopiedLayer(copiedLayerMemory);
    }
  });

  // --- Context Menu on Desk / Stage ---
  deskStage.addEventListener('contextmenu', event => {
    event.preventDefault();
    event.stopPropagation();
    const pageWrap = deskStage.querySelector('.stage-page-wrap');
    if (!pageWrap || !state) return;

    const pRect = pageWrap.getBoundingClientRect();
    const zoom = stage.getZoom();
    const pageX = (event.clientX - pRect.left) / zoom;
    const pageY = (event.clientY - pRect.top) / zoom;

    const hit = layerAtPoint(state.handout, [pageX, pageY]);
    if (hit) {
      state.select(hit.id);
      contextMenu.open({
        x: event.clientX,
        y: event.clientY,
        items: [
          { label: 'Duplicar', key: 'Ctrl+D', run: () => duplicateSelected() },
          { label: 'Copiar', key: 'Ctrl+C', run: () => copySelected() },
          {
            label: 'Colar',
            key: 'Ctrl+V',
            run: () =>
              pasteCopiedLayer(
                copiedLayerMemory || (typeof window !== 'undefined' ? window.__atelieCopiedLayer : null),
                [pageX, pageY]
              ),
          },
          'separator',
          { label: 'Trazer para frente', key: 'Ctrl+]', run: () => moveSelected(+1) },
          { label: 'Enviar para trás', key: 'Ctrl+[', run: () => moveSelected(-1) },
          { label: 'Para o topo', run: () => moveSelectedTo(state.handout.layers.length - 1) },
          { label: 'Para o fundo', run: () => moveSelectedTo(0) },
          'separator',
          { label: hit.locked ? 'Destravar' : 'Travar', run: () => toggleLockSelected() },
          { label: hit.visible ? 'Ocultar' : 'Exibir', run: () => toggleVisibleSelected() },
          'separator',
          { label: 'Excluir', key: 'Del', danger: true, run: () => removeSelected() },
        ],
      });
    } else if (
      pageX >= 0 &&
      pageX <= state.handout.page.width &&
      pageY >= 0 &&
      pageY <= state.handout.page.height
    ) {
      contextMenu.open({
        x: event.clientX,
        y: event.clientY,
        items: [
          {
            label: 'Colar',
            key: 'Ctrl+V',
            run: () =>
              pasteCopiedLayer(
                copiedLayerMemory || (typeof window !== 'undefined' ? window.__atelieCopiedLayer : null),
                [pageX, pageY]
              ),
          },
          'separator',
          { label: 'Adicionar texto aqui', run: () => addTextAt([pageX, pageY]) },
          { label: 'Adicionar imagem aqui', run: () => addImageAt([pageX, pageY]) },
        ],
      });
    }
  });

  // --- Keyboard shortcuts ---
  window.addEventListener('keydown', event => {
    const isEditingField =
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
      document.activeElement?.isContentEditable;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      archiveDocument();
      return;
    }

    if (isEditingField) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        state?.redo();
      } else {
        state?.undo();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      state?.redo();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      if (state?.selection) {
        event.preventDefault();
        copySelected();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
      const memory =
        copiedLayerMemory || (typeof window !== 'undefined' ? window.__atelieCopiedLayer : null);
      if (memory) {
        event.preventDefault();
        pasteCopiedLayer(memory);
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      if (state?.selection) {
        event.preventDefault();
        duplicateSelected();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === ']') {
      if (state?.selection) {
        event.preventDefault();
        moveSelected(+1);
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === '[') {
      if (state?.selection) {
        event.preventDefault();
        moveSelected(-1);
      }
      return;
    }

    if (event.shiftKey && event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      stage?.toggleRulers();
      return;
    }

    if (
      event.key.toLowerCase() === 'i' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      triggerEyedropper();
      return;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      if (state?.selection) {
        const layer = state.handout.layers.find(l => l.id === state.selection);
        if (layer && !layer.locked) {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          let dx = 0;
          let dy = 0;
          if (event.key === 'ArrowLeft') dx = -step;
          else if (event.key === 'ArrowRight') dx = step;
          else if (event.key === 'ArrowUp') dy = -step;
          else if (event.key === 'ArrowDown') dy = step;
          const next = updateLayer(state.handout, layer.id, moveBox(layer, dx, dy));
          state.edit(next, { label: 'Mover camada', coalesce: 'nudge-' + layer.id });
        }
      }
      return;
    }

    if (event.key === 'Enter') {
      if (state?.selection) {
        const layer = state.handout.layers.find(l => l.id === state.selection);
        if (layer && layer.kind === 'text' && !layer.locked && stage) {
          event.preventDefault();
          stage.startInlineTextEdit(layer.id);
        }
      }
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (state?.selection) {
        event.preventDefault();
        removeSelected();
      }
    } else if (event.key === 'Escape') {
      state?.select(null);
    }
  });

  // Warn before unload if dirty
  window.addEventListener('beforeunload', event => {
    if (state?.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  // --- Register Ctrl+K Commands ---
  const paletteCommands = [
    {
      id: 'doc:archive',
      label: 'Arquivar documento',
      hint: 'Ctrl+S',
      category: 'Documento',
      run: () => archiveDocument(),
    },
    {
      id: 'doc:undo',
      label: 'Desfazer',
      hint: 'Ctrl+Z',
      category: 'Edição',
      run: () => state?.undo(),
    },
    {
      id: 'doc:redo',
      label: 'Refazer',
      hint: 'Ctrl+Y',
      category: 'Edição',
      run: () => state?.redo(),
    },
    {
      id: 'layer:duplicate',
      label: 'Duplicar camada',
      hint: 'Ctrl+D',
      category: 'Camada',
      run: () => duplicateSelected(),
    },
    {
      id: 'layer:remove',
      label: 'Excluir camada',
      hint: 'Del',
      category: 'Camada',
      run: () => removeSelected(),
    },
    {
      id: 'layer:add-text',
      label: 'Adicionar texto',
      category: 'Inserir',
      run: () => addTextAt([state.handout.page.width / 2, state.handout.page.height / 2]),
    },
    {
      id: 'layer:add-image',
      label: 'Adicionar imagem',
      category: 'Inserir',
      run: () => addImageAt([state.handout.page.width / 2, state.handout.page.height / 2]),
    },
    {
      id: 'layer:add-rect',
      label: 'Adicionar retângulo',
      category: 'Inserir',
      run: () => {
        const newL = shapeLayer({
          name: 'Retângulo',
          x: Math.round(state.handout.page.width / 2 - 200),
          y: Math.round(state.handout.page.height / 2 - 150),
          width: 400,
          height: 300,
          shape: { type: 'rect', fill: '#ffffff', stroke: null, strokeWidth: 0 },
        });
        state.edit(addLayer(state.handout, newL), { label: 'Adicionar Retângulo' });
        state.select(newL.id);
      },
    },
    {
      id: 'stage:rulers',
      label: 'Mostrar / Ocultar réguas',
      hint: 'Shift+R',
      category: 'Visualização',
      run: () => stage?.toggleRulers(),
    },
    {
      id: 'stage:eyedropper',
      label: 'Conta-gotas',
      hint: 'I',
      category: 'Ferramentas',
      run: () => triggerEyedropper(),
    },
    {
      id: 'stage:fit',
      label: 'Caber na tela',
      category: 'Visualização',
      run: () => stage?.zoom('fit'),
    },
    {
      id: 'stage:zoom-100',
      label: 'Zoom 100 %',
      category: 'Visualização',
      run: () => stage?.zoom(1.0),
    },
  ];

  PAGE_PRESETS.forEach(([id, name]) => {
    paletteCommands.push({
      id: `doc:new-${id}`,
      label: `Novo documento: ${name}`,
      category: 'Documento',
      run: () => {
        confirmUnsavedChanges(() => {
          loadHandout(createHandout({ preset: id }));
        });
      },
    });
  });

  shell.palette.register(paletteCommands);

  // Initial load
  async function init() {
    await updateRecentRail();

    let initialDoc = null;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const handoutId = urlParams.get('handout');
      const newPreset = urlParams.get('new');

      if (handoutId) {
        try {
          initialDoc = await api.handouts.read(handoutId);
        } catch {
          // not found, fall back
        }
      } else if (newPreset) {
        initialDoc = createHandout({ preset: newPreset });
      } else {
        const lastId = localStorage.getItem('atelie-last');
        if (lastId) {
          try {
            initialDoc = await api.handouts.read(lastId);
          } catch {
            // ignore
          }
        }
      }
    }

    if (!initialDoc) {
      initialDoc = createHandout({ preset: 'a4' });
    }

    loadHandout(initialDoc);
  }

  init();

  return {
    get state() {
      return state;
    },
    get stage() {
      return stage;
    },
    open: loadHandout,
    loadHandout,
    createHandout,
    createDocument: options => loadHandout(createHandout(options)),
    archive: archiveDocument,
    duplicateSelected,
    copySelected,
    pasteCopiedLayer,
    triggerEyedropper,
  };
}
