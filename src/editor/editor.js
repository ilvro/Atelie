import { createEditorState } from './state.js';
import { createStage } from './stage.js';
import { createLayersPanel } from './layers-panel.js';
import { createPropertiesPanel } from './properties-panel.js';
import { createHistoryPanel } from './history-panel.js';
import { createNavigator, recordRecent, getRecentIds } from './navigator.js';
import { saveDraft, loadDraft, removeDraft, draftDecision } from './draft.js';
import { folderPath } from '../domain/folders.js';
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

  // Readonly banner for multi-tab awareness
  const readonlyBanner = document.createElement('div');
  readonlyBanner.className = 'desk-readonly-banner';
  readonlyBanner.style.display = 'none';
  readonlyBanner.innerHTML = `
    <div class="desk-readonly-message">
      ${renderIcon('lock', 16)}
      <span>Aberto em outra aba · Você está em modo somente leitura</span>
    </div>
    <button type="button" class="at-btn is-primary claim-edit-btn">Editar aqui</button>
  `;

  // Draft bar
  const draftBar = document.createElement('div');
  draftBar.className = 'desk-draft-bar';
  draftBar.style.display = 'none';
  draftBar.innerHTML = `
    <div class="desk-draft-info">
      <span class="at-stamp is-accent" style="font-size:11px; padding:1px 6px;">RASCUNHO</span>
      <span class="desk-draft-text">Não arquivado</span>
    </div>
    <div class="desk-draft-actions">
      <button type="button" class="at-btn is-sm draft-discard-btn">Descartar rascunho</button>
      <button type="button" class="at-btn is-sm is-primary draft-archive-btn">Arquivar</button>
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
  deskStage.appendChild(readonlyBanner);
  deskStage.appendChild(draftBar);
  deskStage.appendChild(stageContainer);
  deskStage.appendChild(stampOverlay);

  const nameInput = docBar.querySelector('.at-doc-name-input');
  const sizeStamp = docBar.querySelector('.desk-size-stamp');
  const undoBtn = docBar.querySelector('[data-action="undo"]');
  const redoBtn = docBar.querySelector('[data-action="redo"]');
  const archiveBtn = docBar.querySelector('[data-action="archive"]');

  // State variables for draft and multi-tab
  let hasDraft = false;
  let draftSaved = true;
  let draftTimer = null;
  const tabId = 'tab-' + Math.random().toString(36).slice(2, 10);
  let isReadOnly = false;
  let broadcastChannel = null;

  function updateStageLayout() {
    let top = 52;
    if (isReadOnly) {
      readonlyBanner.style.display = 'flex';
      readonlyBanner.style.top = `${top}px`;
      top += 38;
    } else {
      readonlyBanner.style.display = 'none';
    }
    if (hasDraft) {
      draftBar.style.display = 'flex';
      draftBar.style.top = `${top}px`;
      top += 36;
    } else {
      draftBar.style.display = 'none';
    }
    stageContainer.style.top = `${top}px`;
  }

  function setReadOnly(ro) {
    isReadOnly = ro;
    archiveBtn.disabled = isReadOnly;
    nameInput.disabled = isReadOnly;
    undoBtn.disabled = isReadOnly || !state?.canUndo;
    redoBtn.disabled = isReadOnly || !state?.canRedo;
    updateStageLayout();
  }

  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel('atelie');
    broadcastChannel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || !state?.handout?.id) return;
      if (msg.handoutId !== state.handout.id) return;

      if (msg.type === 'check-open' && msg.tabId !== tabId && !isReadOnly) {
        broadcastChannel.postMessage({
          type: 'claim-active',
          handoutId: state.handout.id,
          ownerTabId: tabId,
        });
      } else if (msg.type === 'claim-active' && msg.ownerTabId !== tabId) {
        setReadOnly(true);
      } else if (msg.type === 'claim-edit' && msg.tabId !== tabId) {
        setReadOnly(true);
      }
    };
  }

  readonlyBanner.querySelector('.claim-edit-btn')?.addEventListener('click', () => {
    setReadOnly(false);
    broadcastChannel?.postMessage({
      type: 'claim-edit',
      handoutId: state?.handout?.id,
      tabId,
    });
    shell.notify('Você agora está editando este documento.', { tone: 'info' });
  });

  draftBar.querySelector('.draft-archive-btn')?.addEventListener('click', () => {
    archiveDocument();
  });

  draftBar.querySelector('.draft-discard-btn')?.addEventListener('click', async () => {
    if (!state?.handout?.id) return;
    if (window.confirm('Descartar as alterações deste rascunho?')) {
      await removeDraft(state.handout.id);
      hasDraft = false;
      draftSaved = true;
      updateStageLayout();
      try {
        const original = await api.handouts.read(state.handout.id);
        loadHandout(original, { skipDraftCheck: true });
        shell.notify('Rascunho descartado.', { tone: 'info' });
      } catch {
        const fresh = createHandout({ preset: 'a4' });
        loadHandout(fresh, { skipDraftCheck: true });
      }
    }
  });

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

      // Clear draft on archive
      await removeDraft(saved.id);
      hasDraft = false;
      draftSaved = true;
      updateStageLayout();

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
      navigatorInstance?.render();
      refreshPaletteCache();
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

  function showDraftPrompt({ title, message, primaryText, secondaryText }) {
    return new Promise(resolve => {
      const backdrop = document.createElement('div');
      backdrop.className = 'at-modal-backdrop draft-recovery-modal';
      backdrop.innerHTML = `
        <div class="at-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <header class="at-modal-header">
            <h3 class="at-modal-title">${esc(title)}</h3>
          </header>
          <div class="at-modal-body">
            <p>${esc(message)}</p>
            <div class="modal-dialog-actions" style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
              <button type="button" class="at-btn modal-discard-btn draft-discard-prompt-btn">${esc(secondaryText)}</button>
              <button type="button" class="at-btn is-primary modal-recover-btn draft-recover-btn">${esc(primaryText)}</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);

      backdrop.querySelector('.draft-discard-prompt-btn').addEventListener('click', () => {
        backdrop.remove();
        resolve(false);
      });

      backdrop.querySelector('.draft-recover-btn').addEventListener('click', () => {
        backdrop.remove();
        resolve(true);
      });
    });
  }

  async function checkDraftRecovery(handout) {
    if (!handout || !handout.id) return handout;
    try {
      const draft = await loadDraft(handout.id);
      const decision = draftDecision({ draft, serverHandout: handout });

      if (decision === 'offer') {
        const dateStr = draft.savedAt ? new Date(draft.savedAt).toLocaleString('pt-BR') : '';
        const shouldRecover = await showDraftPrompt({
          title: 'Alterações não arquivadas',
          message: `Há alterações não arquivadas de ${dateStr}. Deseja recuperar essas alterações?`,
          primaryText: 'Recuperar',
          secondaryText: 'Descartar',
        });

        if (shouldRecover) {
          hasDraft = true;
          draftSaved = true;
          return draft.handout;
        } else {
          await removeDraft(handout.id);
          hasDraft = false;
          draftSaved = true;
          return handout;
        }
      } else if (decision === 'conflict') {
        const shouldCopy = await showDraftPrompt({
          title: 'Conflito de rascunho',
          message: 'O documento mudou desde o seu rascunho. Deseja abrir o rascunho como uma nova cópia?',
          primaryText: 'Abrir como cópia',
          secondaryText: 'Descartar',
        });

        if (shouldCopy) {
          const copy = structuredClone(draft.handout);
          copy.id = 'h-' + Math.random().toString(36).slice(2, 10);
          copy.name = `${copy.name} (Rascunho)`;
          copy.revision = 0;
          await removeDraft(handout.id);
          hasDraft = true;
          draftSaved = false;
          return copy;
        } else {
          await removeDraft(handout.id);
          hasDraft = false;
          draftSaved = true;
          return handout;
        }
      }
    } catch (err) {
      console.warn('[atelie] Erro ao verificar rascunho:', err);
    }
    return handout;
  }

  async function loadHandout(inputHandout, { skipDraftCheck = false } = {}) {
    let handout = inputHandout;
    if (!skipDraftCheck) {
      handout = await checkDraftRecovery(inputHandout);
    }

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
    propertiesPanel = createPropertiesPanel(propertiesWrap, { state, api, fonts });
    shell.inspector.panel('properties', propertiesWrap);

    const historyWrap = document.createElement('div');
    historyPanel = createHistoryPanel(historyWrap, { state, api, images, fonts, shell });
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

        if (change.type === 'edit' && !isReadOnly) {
          hasDraft = true;
          draftSaved = false;
          updateStageLayout();

          if (draftTimer) clearTimeout(draftTimer);
          draftTimer = setTimeout(async () => {
            try {
              await saveDraft(state.handout, state.handout.revision || 1);
              draftSaved = true;
            } catch (err) {
              console.warn('[atelie] Erro ao salvar rascunho:', err);
            }
          }, 800);
        }
      } else if (change.type === 'select') {
        stage.select(state.selection);
        layersPanel.render();
        propertiesPanel.render();
      }
    });

    stage.show(state.handout);
    updateDocBar();
    stage.zoom('fit');

    setReadOnly(false);
    updateStageLayout();

    if (broadcastChannel && handout.id) {
      broadcastChannel.postMessage({
        type: 'check-open',
        handoutId: handout.id,
        tabId,
      });
    }

    recordRecent(handout.id);
    navigatorInstance?.render();
    refreshPaletteCache();

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

  // Navigator Drawer panel
  const navigatorWrap = document.createElement('div');
  navigatorWrap.className = 'docs-navigator-container';
  navigatorWrap.style.height = '100%';

  let navigatorInstance = null;
  navigatorInstance = createNavigator(navigatorWrap, {
    api,
    shell,
    onOpenDocument: async (id) => {
      confirmUnsavedChanges(async () => {
        try {
          const doc = await api.handouts.read(id);
          await loadHandout(doc);
          shell.drawer.close();
        } catch (err) {
          shell.notify(`Erro ao abrir documento: ${err.message}`, { tone: 'error' });
        }
      });
    },
    onCreateDocument: () => {
      confirmUnsavedChanges(() => {
        const doc = createHandout({ preset: 'a4' });
        loadHandout(doc);
        shell.drawer.close();
      });
    },
    getCurrentHandoutId: () => state?.handout?.id,
  });

  shell.drawer.panel('documents', navigatorWrap);

  // Ctrl+K Palette Document Provider
  let paletteDocumentsCache = [];

  async function refreshPaletteCache() {
    try {
      const handouts = await api.handouts.list();
      let folders = [];
      if (api.folders) {
        const fd = await api.folders.list();
        folders = fd.folders || [];
      }
      const folderMap = new Map(folders.map(f => [f.id, f]));
      const recentIds = getRecentIds();

      const items = [];

      // Actions
      items.push({
        title: 'Nova pasta',
        subtitle: 'Pastas de documentos',
        group: 'Ações',
        icon: 'folder',
        run: () => {
          shell.drawer.open('documents');
          navigatorInstance?.promptNewFolder();
        },
      });

      items.push({
        title: 'Abrir lixeira',
        subtitle: 'Ver documentos excluídos',
        group: 'Ações',
        icon: 'trash',
        run: () => {
          shell.drawer.open('documents');
          navigatorInstance?.filterTrash();
        },
      });

      // Folders
      for (const folder of folders) {
        const path = folderPath(folders, folder.id).join(' / ');
        items.push({
          title: `Pasta: ${folder.name}`,
          subtitle: path,
          group: 'Pastas',
          icon: 'folder',
          run: () => {
            shell.drawer.open('documents');
            navigatorInstance?.openFolder(folder.id);
          },
        });
      }

      // Handouts: recents first
      const sorted = handouts.slice().sort((a, b) => {
        const idxA = recentIds.indexOf(a.id);
        const idxB = recentIds.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      for (const h of sorted) {
        const f = h.folder ? folderMap.get(h.folder) : null;
        const sub = f ? folderPath(folders, f.id).join(' / ') : 'Sem pasta';
        items.push({
          title: h.name,
          subtitle: sub,
          group: 'Documentos',
          icon: 'doc',
          run: () => {
            confirmUnsavedChanges(async () => {
              const doc = await api.handouts.read(h.id);
              await loadHandout(doc);
            });
          },
        });
      }

      paletteDocumentsCache = items;
    } catch {}
  }

  shell.palette.register(() => paletteDocumentsCache);

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

  // Warn before unload if dirty and draft was not saved
  window.addEventListener('beforeunload', event => {
    if (state?.dirty && !draftSaved) {
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
    await refreshPaletteCache();

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

    await loadHandout(initialDoc);
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
