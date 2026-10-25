import { createEditorState } from './state.js';
import { createStage } from './stage.js';
import { createLayersPanel } from './layers-panel.js';
import { createPropertiesPanel } from './properties-panel.js';
import { createHistoryPanel } from './history-panel.js';
import { createFillPanel } from './fill-panel.js';
import { createLibraryPanel } from './library-panel.js';
import { createTemplatesDrawer } from './templates-drawer.js';
import { createStartScreen } from './start.js';
import { defaultsFor } from './library-defaults.js';
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
import { handoffRequest, deliveredMessage } from './handoff.js';
import { bakeHandout, summaryOf, deliveryOf, previewOf, blobToDataUrl } from './bake.js';
import { openExchange, publish, channel, savedMessage, unpublishBySource, readPublished } from '../data/exchange.js';
import { getSettings } from '../ui/settings.js';

export function createEditor(shell, { api, images, fonts, onOpenReader } = {}) {
  const deskStage = document.getElementById('desk-stage');
  if (!deskStage) return null;

  const handoff = typeof window !== 'undefined'
    ? handoffRequest(window.location, window.opener)
    : null;

  let state = null;
  let stage = null;
  let layersPanel = null;
  let propertiesPanel = null;
  let historyPanel = null;
  let fillPanel = null;
  let libraryPanel = null;

  // Local clipboard memory for copy/paste between tabs and documents
  let copiedLayerMemory = null;

  // Document bar
  const docBar = document.createElement('div');
  docBar.className = 'desk-doc-bar';
  docBar.innerHTML = `
    <div class="desk-doc-title-area">
      <input type="text" class="at-doc-name-input" aria-label="Nome do documento" value="" />
      <span class="at-stamp is-default desk-size-stamp"></span>
      <span class="at-stamp is-uv desk-uv-stamp" style="display: none;">UV</span>
      ${handoff && (handoff.mode === 'edit' || handoff.mode === 'new') ? `<span class="at-stamp is-accent at-handoff-stamp" title="Ligado ao Tabletop">Ligado ao Tabletop</span>` : ''}
    </div>
    <div class="desk-doc-actions">
      <button type="button" class="at-icon-btn" data-action="undo" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
        ${renderIcon('undo', 16)}
      </button>
      <button type="button" class="at-icon-btn" data-action="redo" title="Refazer (Ctrl+Y)" aria-label="Refazer">
        ${renderIcon('redo', 16)}
      </button>
      <button type="button" class="at-btn" data-action="toggle-uv" aria-pressed="false" title="Luz UV (U)">
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

  let templatesDrawer = null;
  let startScreen = null;

  // Start screen container
  const startScreenContainer = document.createElement('div');
  startScreenContainer.className = 'desk-start-wrapper';
  startScreenContainer.style.position = 'absolute';
  startScreenContainer.style.top = '0';
  startScreenContainer.style.left = '0';
  startScreenContainer.style.right = '0';
  startScreenContainer.style.bottom = '0';
  startScreenContainer.style.display = 'none';

  function showStartScreen() {
    state = null;
    docBar.style.display = 'none';
    readonlyBanner.style.display = 'none';
    draftBar.style.display = 'none';
    stageContainer.style.display = 'none';
    stampOverlay.style.display = 'none';
    startScreenContainer.style.display = 'block';
    startScreen?.refresh();
    shell.rail.setActive('desk');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('handout');
      url.searchParams.delete('template');
      url.searchParams.delete('new');
      window.history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
    }
  }

  function hideStartScreen() {
    startScreenContainer.style.display = 'none';
    docBar.style.display = 'flex';
    stageContainer.style.display = 'block';
  }

  startScreen = createStartScreen(startScreenContainer, {
    api,
    onCreatePreset: (presetId) => {
      confirmUnsavedChanges(() => {
        loadHandout(createHandout({ preset: presetId }));
      });
    },
    onOpenHandout: async (docId) => {
      confirmUnsavedChanges(async () => {
        try {
          const doc = await api.handouts.read(docId);
          if (doc) await loadHandout(doc);
        } catch (err) {
          shell.notify(`Erro ao abrir documento: ${err.message}`, { tone: 'error' });
        }
      });
    },
    onOpenTemplate: async (templateId) => {
      confirmUnsavedChanges(async () => {
        try {
          await instantiateTemplate(templateId);
          shell.inspector.tab('fill');
        } catch (err) {
          shell.notify(`Erro ao carregar modelo: ${err.message}`, { tone: 'error' });
        }
      });
    },
    onOpenTemplatesDrawer: () => {
      shell.drawer.open('templates');
    },
    onExploreExpansion: (sourceId) => {
      templatesDrawer?.openSource(sourceId);
      shell.drawer.open('templates');
    },
  });

  deskStage.innerHTML = '';
  deskStage.appendChild(docBar);
  deskStage.appendChild(readonlyBanner);
  deskStage.appendChild(draftBar);
  deskStage.appendChild(stageContainer);
  deskStage.appendChild(stampOverlay);
  deskStage.appendChild(startScreenContainer);

  const nameInput = docBar.querySelector('.at-doc-name-input');
  const sizeStamp = docBar.querySelector('.desk-size-stamp');
  const undoBtn = docBar.querySelector('[data-action="undo"]');
  const redoBtn = docBar.querySelector('[data-action="redo"]');
  const archiveBtn = docBar.querySelector('[data-action="archive"]');
  const uvBtn = docBar.querySelector('[data-action="toggle-uv"]');
  const uvStamp = docBar.querySelector('.desk-uv-stamp');

  let currentLight = 'normal';

  function toggleUvLight() {
    currentLight = currentLight === 'uv' ? 'normal' : 'uv';
    const isUv = currentLight === 'uv';
    if (uvBtn) uvBtn.setAttribute('aria-pressed', isUv ? 'true' : 'false');
    if (isUv) {
      document.documentElement.dataset.light = 'uv';
      if (uvStamp) uvStamp.style.display = 'inline-block';
    } else {
      delete document.documentElement.dataset.light;
      if (uvStamp) uvStamp.style.display = 'none';
    }
    if (state?.handout && stage) {
      stage.show(state.handout, { light: currentLight });
    }
  }

  if (uvBtn) {
    uvBtn.addEventListener('click', () => {
      toggleUvLight();
    });
  }

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

  function updateFillTabVisibility(handout) {
    const hasFields = Boolean(handout?.fields && handout.fields.length > 0);
    const fillTabBtn = document.querySelector('.inspector-tab[data-tab="fill"]');
    if (fillTabBtn) {
      fillTabBtn.style.display = hasFields ? 'inline-flex' : 'none';
    }
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
    const archiveBtn = docBar.querySelector('[data-action="archive"]');
    const originalBtnText = archiveBtn ? archiveBtn.textContent : 'Arquivar';
    if (archiveBtn) {
      archiveBtn.textContent = 'Arquivando…';
      archiveBtn.disabled = true;
    }

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

      const source = (typeof document !== 'undefined' && document.baseURI)
        ? new URL('.', document.baseURI).href
        : 'http://127.0.0.1:3011/';

      // One high-resolution render feeds the thumbnail and every delivery path.
      let bakes = null;
      let bakeError = null;
      try {
        bakes = await bakeHandout(saved, { images, fonts });
      } catch (err) {
        bakeError = err;
        console.warn('[atelie] Erro ao assar documento:', err);
      }

      let previewBlob = bakes?.preview ?? null;
      try {
        if (!previewBlob) previewBlob = await previewOf(saved, { images, fonts });
        if (previewBlob) await api.handouts.savePreview(saved, await blobToDataUrl(previewBlob));
      } catch (err) {
        console.warn('[atelie] Erro ao gerar prévia:', err);
      }

      // Each delivery path is independent: a failure in one must not block the others.
      const deliveryErrors = [];
      if (bakeError) {
        deliveryErrors.push(bakeError);
      } else {
        // Caminho C: Servidor
        if (api.mode === 'server') {
          try {
            await api.handouts.saveBake(saved.id, 'normal', saved.revision, bakes.normal);
            if (bakes.uv) {
              await api.handouts.saveBake(saved.id, 'uv', saved.revision, bakes.uv);
            } else {
              await api.handouts.removeBake(saved.id, 'uv', saved.revision).catch(() => {});
            }
          } catch (err) {
            console.warn('[atelie] Erro ao enviar assado ao servidor:', err);
            deliveryErrors.push(err);
          }
        }

        // Caminho A: Banco de troca (IndexedDB)
        if (getSettings().shareWithTabletop !== false && typeof indexedDB !== 'undefined') {
          try {
            const db = await openExchange();
            const summary = summaryOf(saved, source);
            await publish(db, summary, previewBlob, bakes);
            try {
              channel().postMessage(savedMessage(summary));
            } catch (chErr) {
              console.warn('[atelie] Erro ao avisar no BroadcastChannel:', chErr);
            }
          } catch (err) {
            console.warn('[atelie] Erro ao publicar no banco de troca:', err);
            deliveryErrors.push(err);
          }
        }

        // Caminho B: Janela (postMessage)
        if (handoff && window.opener && (handoff.mode === 'edit' || handoff.mode === 'new')) {
          try {
            const delivery = deliveryOf(saved, { preview: previewBlob, bakes, source });
            window.opener.postMessage(deliveredMessage(handoff.nonce, delivery), handoff.from);
          } catch (err) {
            console.warn('[atelie] Erro ao entregar pela janela:', err);
            deliveryErrors.push(err);
          }
        }
      }

      if (deliveryErrors.length) {
        shell.notify(`Arquivado, mas a entrega ao Tabletop falhou: ${deliveryErrors[0].message}`, { tone: 'error' });
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
    } finally {
      if (archiveBtn) {
        archiveBtn.textContent = originalBtnText;
        archiveBtn.disabled = false;
      }
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

    currentLight = 'normal';
    if (uvBtn) uvBtn.setAttribute('aria-pressed', 'false');
    delete document.documentElement.dataset.light;
    if (uvStamp) uvStamp.style.display = 'none';

    state = createEditorState(handout);
    hideStartScreen();

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
    layersPanel = createLayersPanel(layersWrap, { state, getLight: () => currentLight });
    shell.inspector.panel('layers', layersWrap);

    const propertiesWrap = document.createElement('div');
    propertiesPanel = createPropertiesPanel(propertiesWrap, { state, api, fonts });
    shell.inspector.panel('properties', propertiesWrap);

    const historyWrap = document.createElement('div');
    historyPanel = createHistoryPanel(historyWrap, { state, api, images, fonts, shell });
    shell.inspector.panel('history', historyWrap);

    const fillWrap = document.createElement('div');
    fillPanel = createFillPanel(shell, { state, api, images });
    shell.inspector.panel('fill', fillPanel.element);

    updateFillTabVisibility(state.handout);
    if (state.handout.fields && state.handout.fields.length > 0) {
      shell.inspector.tab('fill');
    }

    state.subscribe(change => {
      updateDocBar();
      updateFillTabVisibility(state.handout);
      if (
        change.type === 'edit' ||
        change.type === 'undo' ||
        change.type === 'redo' ||
        change.type === 'goto'
      ) {
        stage.show(state.handout, { light: currentLight });
        layersPanel.render();
        propertiesPanel.render();
        historyPanel.render();
        fillPanel.render();

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

    stage.show(state.handout, { light: currentLight });
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
    handoff,
    images,
    fonts,
    onOpenReader: async (id) => {
      shell.drawer.close();
      onOpenReader?.(id);
    },
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

  // Library Drawer panel
  const libraryStateProxy = {
    get handout() { return state?.handout; },
    get selection() { return state?.selection; },
    get selectedLayerId() { return state?.selection; },
    edit: (doc, meta) => state?.edit(doc, meta),
    select: (id) => state?.select(id),
  };
  libraryPanel = createLibraryPanel(shell, { api, state: libraryStateProxy, fonts });
  shell.drawer.panel('library', libraryPanel.element);

  // Templates Drawer panel
  templatesDrawer = createTemplatesDrawer(shell, {
    api,
    onUseTemplate: async (templateItem) => {
      confirmUnsavedChanges(async () => {
        try {
          await instantiateTemplate(templateItem);
          shell.inspector.tab('fill');
          shell.drawer.close();
        } catch (err) {
          shell.notify(`Erro ao usar modelo: ${err.message}`, { tone: 'error' });
        }
      });
    },
  });
  shell.drawer.panel('templates', templatesDrawer.element);

  // Rail action listener
  shell.onAction?.((action, event) => {
    if (action === 'desk') {
      if (event?.ctrlKey || event?.metaKey || !state) {
        confirmUnsavedChanges(() => {
          showStartScreen();
        });
      }
    }
  });

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
      light: currentLight === 'uv' ? 'uv' : 'both',
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
      light: currentLight === 'uv' ? 'uv' : 'both',
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
    if (!dt) return;

    // Check if drop is an item from the library drawer
    const libDataRaw = dt.getData('text/x-atelie-library') || dt.getData('application/json');
    if (libDataRaw) {
      try {
        const parsed = JSON.parse(libDataRaw);
        const item = parsed.item || parsed;
        if (item && item.id) {
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

          const defaults = defaultsFor(item);
          const pageWidth = state.handout.page.width;
          const maxW = pageWidth * 0.5;
          const itemW = item.width || maxW;
          const itemH = item.height || maxW;
          const w = Math.min(itemW, maxW);
          const h = Math.round(w * (itemH / itemW));
          const posX = Math.round(dropX - w / 2);
          const posY = Math.round(dropY - h / 2);

          const newL = imageLayer({
            name: item.name || 'Elemento',
            x: posX,
            y: posY,
            width: Math.round(w),
            height: Math.round(h),
            blend: defaults.blend,
            opacity: defaults.opacity ?? 1,
            light: currentLight === 'uv' ? 'uv' : 'both',
            image: {
              src: { library: item.id },
              fit: defaults.cover ? 'cover' : 'contain',
              tint: defaults.tint || null,
            },
          });

          const next = addLayer(state.handout, newL, state.selection);
          state.edit(next);
          state.select(newL.id);
          return;
        }
      } catch {}
    }

    if (!dt.files || !dt.files.length) return;

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
          light: currentLight === 'uv' ? 'uv' : 'both',
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
              light: currentLight === 'uv' ? 'uv' : 'both',
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
    const pageWrap = deskStage.querySelector('.stage-page-wrap');
    if (!pageWrap || !state) return;

    event.preventDefault();
    event.stopPropagation();

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
    if (document.body.classList.contains('is-reading')) return;

    const isEditingField =
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
      document.activeElement?.isContentEditable;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      archiveDocument();
      return;
    }

    if (isEditingField) return;

    if (
      event.key.toLowerCase() === 'p' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      onOpenReader?.(state?.handout?.id);
      return;
    }

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

    if (
      event.key.toLowerCase() === 'u' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      toggleUvLight();
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
          light: currentLight === 'uv' ? 'uv' : 'both',
          shape: { type: 'rect', fill: '#ffffff', stroke: null, strokeWidth: 0 },
        });
        state.edit(addLayer(state.handout, newL), { label: 'Adicionar Retângulo' });
        state.select(newL.id);
      },
    },
    {
      id: 'view:toggle-uv',
      label: 'Luz UV',
      hint: 'U',
      category: 'Visualização',
      run: () => toggleUvLight(),
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
    {
      id: 'app:start',
      label: 'Ir para o início',
      hint: 'Mesa',
      category: 'Navegação',
      run: () => {
        confirmUnsavedChanges(() => {
          showStartScreen();
        });
      },
    },
    {
      id: 'app:templates',
      label: 'Modelos de documentos',
      hint: 'Gaveta',
      category: 'Navegação',
      run: () => {
        shell.drawer.open('templates');
      },
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
  async function instantiateTemplate(templateIdOrItem) {
    let tplItem = null;
    let tplId = typeof templateIdOrItem === 'string' ? templateIdOrItem : templateIdOrItem?.id;
    if (typeof templateIdOrItem === 'object' && templateIdOrItem?.handout) {
      tplItem = templateIdOrItem;
    } else {
      tplItem = await api.library.item(tplId);
    }

    if (!tplItem || !tplItem.handout) {
      throw new Error(`Modelo não encontrado: ${tplId}`);
    }

    const doc = structuredClone(tplItem.handout);
    doc.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padStart(12, '0'));
    doc.revision = 0;
    doc.source = { kind: 'template', templateId: tplItem.id };
    doc.createdAt = new Date().toISOString();
    doc.updatedAt = new Date().toISOString();

    // Check if template has backTemplate (frente e verso)
    if (tplItem.backTemplate) {
      try {
        const backTplItem = await api.library.item(tplItem.backTemplate);
        if (backTplItem && backTplItem.handout) {
          const backDoc = structuredClone(backTplItem.handout);
          backDoc.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padStart(12, '0'));
          backDoc.revision = 0;
          backDoc.source = { kind: 'template', templateId: backTplItem.id };
          backDoc.createdAt = new Date().toISOString();
          backDoc.updatedAt = new Date().toISOString();

          // Link both documents in both directions
          doc.back = { handoutId: backDoc.id };
          backDoc.back = { handoutId: doc.id };

          // Save the back document to storage so it exists and can be flipped to
          await api.handouts.create(backDoc);
        }
      } catch (err) {
        console.warn('[atelie] Erro ao criar verso do modelo:', err);
      }
    }

    await loadHandout(doc);
    return doc;
  }

  async function init() {
    await updateRecentRail();
    await refreshPaletteCache();

    if (handoff && handoff.mode === 'pick') {
      shell.drawer.open('documents');
      return;
    }

    let initialDoc = null;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const templateId = urlParams.get('template');
      const handoutId = urlParams.get('handout');
      const newPreset = urlParams.get('new');
      const isStart = urlParams.has('start');
      const isDiagnostics = urlParams.has('diagnostics');

      if (isStart) {
        showStartScreen();
        return;
      }

      if (templateId) {
        try {
          initialDoc = await instantiateTemplate(templateId);
          shell.inspector.tab('fill');
          return;
        } catch (err) {
          console.warn('[atelie] Erro ao carregar modelo da URL:', err);
        }
      }

      if (handoutId) {
        try {
          initialDoc = await api.handouts.read(handoutId);
        } catch {
          // not found, fall back
        }
      } else if (newPreset) {
        initialDoc = createHandout({ preset: newPreset });
      } else if (!isDiagnostics) {
        // Normal user opening Ateliê with no document requested -> Start Screen
        showStartScreen();
        return;
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
      if (typeof window !== 'undefined' && !window.location.search.includes('diagnostics')) {
        showStartScreen();
        return;
      }
      initialDoc = createHandout({ preset: 'a4' });
    }

    await loadHandout(initialDoc);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('atelie:share-tabletop-changed', async (e) => {
      const enabled = e.detail?.enabled;
      const source = (typeof document !== 'undefined' && document.baseURI)
        ? new URL('.', document.baseURI).href
        : 'http://127.0.0.1:3011/';
      if (!enabled) {
        try {
          const db = await openExchange();
          await unpublishBySource(db, source);
          shell.notify('Compartilhamento com o Tabletop desativado.', { tone: 'info' });
        } catch (err) {
          console.warn('[atelie] Erro ao despublicar troca:', err);
        }
      } else {
        try {
          shell.notify('Sincronizando documentos com o Tabletop...', { tone: 'info' });
          const db = await openExchange();
          const list = await api.handouts.list();
          let done = 0;
          for (const item of list) {
            done += 1;
            try {
              const doc = await api.handouts.read(item.id);
              const summary = summaryOf(doc, source);
              // Documents already published at this exact revision are not baked again.
              const already = await readPublished(db, doc.id, doc.revision, { hasUv: summary.hasUv });
              if (!already) {
                shell.notify(`Sincronizando ${done}/${list.length}: ${doc.name || 'Sem nome'}…`, { tone: 'info' });
                const bakes = await bakeHandout(doc, { images, fonts });
                await publish(db, summary, bakes.preview, bakes);
              }
              try { channel().postMessage(savedMessage(summary)); } catch {}
            } catch (err) {
              console.warn('[atelie] Erro ao assar documento:', err);
            }
            // Give the interface a chance to breathe between documents.
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          shell.notify('Documentos sincronizados com o Tabletop.', { tone: 'info' });
        } catch (err) {
          console.warn('[atelie] Erro ao sincronizar troca:', err);
        }
      }
    });
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
    openTemplate: instantiateTemplate,
    instantiateTemplate,
    createHandout,
    createDocument: options => loadHandout(createHandout(options)),
    archive: archiveDocument,
    duplicateSelected,
    copySelected,
    pasteCopiedLayer,
    triggerEyedropper,
    showStartScreen,
    hideStartScreen,
    get templatesDrawer() {
      return templatesDrawer;
    },
    get startScreen() {
      return startScreen;
    },
    get light() {
      return currentLight;
    },
    toggleUvLight,
  };
}
