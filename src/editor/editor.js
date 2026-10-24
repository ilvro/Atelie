import { createEditorState } from './state.js';
import { createStage } from './stage.js';
import { createLayersPanel } from './layers-panel.js';
import { createPropertiesPanel } from './properties-panel.js';
import { renderIcon, escapeHTML as esc } from '../ui/icons.js';
import { stamp } from '../ui/primitives.js';
import { createHandout, PAGE_PRESETS, removeLayer } from '../domain/handouts.js';

export function createEditor(shell, { api, images, fonts } = {}) {
  const deskStage = document.getElementById('desk-stage');
  if (!deskStage) return null;

  let state = null;
  let stage = null;
  let layersPanel = null;
  let propertiesPanel = null;

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
  stageContainer.style.width = '100%';
  stageContainer.style.height = '100%';

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
    undoBtn.classList.toggle('is-disabled', !state.canUndo);
    redoBtn.classList.toggle('is-disabled', !state.canRedo);
  }

  function triggerArchiveAnimation() {
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
        preview: item.preview ? (api.mode === 'browser' ? null : `api/atelie/handouts/${item.id}/preview`) : null,
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
    if (state) {
      // clean up previous state listeners
    }

    state = createEditorState(handout);

    if (stage) {
      stage.destroy();
    }

    stage = createStage(stageContainer, {
      images,
      fonts,
      onSelect: layerId => state.select(layerId),
    });

    // Inspector panels
    const layersWrap = document.createElement('div');
    layersPanel = createLayersPanel(layersWrap, { state });
    shell.inspector.panel('layers', layersWrap);

    const propertiesWrap = document.createElement('div');
    propertiesPanel = createPropertiesPanel(propertiesWrap, { state, api });
    shell.inspector.panel('properties', propertiesWrap);

    state.subscribe(change => {
      updateDocBar();
      if (change.type === 'edit' || change.type === 'undo' || change.type === 'redo') {
        stage.show(state.handout);
        layersPanel.render();
        propertiesPanel.render();
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
        grid.innerHTML = list.map(item => `
          <button type="button" class="doc-card-btn" data-id="${esc(item.id)}">
            <div class="doc-card-preview">
              ${item.preview ? `<img src="${esc(api.mode === 'browser' ? '' : `api/atelie/handouts/${item.id}/preview`)}" alt="" />` : renderIcon('doc', 24)}
            </div>
            <div class="doc-card-info">
              <span class="doc-card-name">${esc(item.name)}</span>
              <span class="doc-card-meta">${new Date(item.updatedAt).toLocaleDateString('pt-BR')} · Rev ${item.revision}</span>
            </div>
          </button>
        `).join('');

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

  // Keyboard shortcuts
  window.addEventListener('keydown', event => {
    const isEditingField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
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
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      state?.redo();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      if (state?.selection) {
        event.preventDefault();
        const selId = state.selection;
        const next = removeLayer(state.handout, selId);
        state.edit(next, { label: 'Excluir camada' });
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
    loadHandout,
    archive: archiveDocument,
  };
}

