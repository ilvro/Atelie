import { createEditorState } from './state.js';
import { createStage } from './stage.js';
import { createLayersPanel } from './layers-panel.js';
import { createPropertiesPanel } from './properties-panel.js';
import { createHistoryPanel } from './history-panel.js';
import { createFillPanel } from './fill-panel.js';
import { createLibraryPanel } from './library-panel.js';
import { createTemplatesDrawer } from './templates-drawer.js';
import { createStartScreen } from './start.js';
import { defaultsFor, libraryDropSize, stampTilt } from './library-defaults.js';
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
  insertionIndex,
  textLayer,
  textStyleFrom,
  effectLayer,
  inheritedTextStyle,
  isPaperLayer,
  newLayerId,
  varyLayer,
  imageLayer,
  shapeLayer,
} from '../domain/handouts.js';
import { moveBox, layerAtPoint } from './geometry.js';
import { contextMenu } from '../ui/context-menu.js';
import { handoffRequest, deliveredMessage } from './handoff.js';
import { bakeHandout, summaryOf, deliveryOf, previewOf, blobToDataUrl } from './bake.js';
import { openExchange, publish, channel, savedMessage, unpublishBySource, readPublished } from '../data/exchange.js';
import { getSettings } from '../ui/settings.js';
import { createExportDrawer } from './export-drawer.js';
import { play } from '../ui/sound.js';
import { wireModal } from '../ui/modal.js';
import { recordRecentLibraryId } from './library-search.js';
import { matches, normalizeCombo, isTypingTarget, label as keyLabel } from '../ui/keymap.js';
import { createAmbient, loadAmbient } from '../ui/ambient.js';
import { createLayerThumbs } from './layer-thumbs.js';
import { normalizeStroke, appendStroke } from '../domain/brush.js';
import { cutEffect } from '../domain/cut.js';
import { createTabBar, reorderIds, nextAfterClose, cycleTab, loadTabs, saveTabs } from './tabs.js';
import { downloadHandoutPng, printHandout, exportScale, printLayout } from './export.js';

export function createEditor(shell, { api, images, fonts, onOpenReader } = {}) {
  const deskStage = document.getElementById('desk-stage');
  if (!deskStage) return null;

  const handoff = typeof window !== 'undefined'
    ? handoffRequest(window.location, window.opener)
    : null;

  // Each open document is a session; `state`, `hasDraft`, ... below mirror the active one.
  // `activeId === null` means the Mesa (start screen) is showing, with every session still open.
  const TAB_BAR_HEIGHT = 36;
  const sessions = new Map();
  let tabOrder = [];
  let activeId = null;
  let activeSession = null;
  const lastFace = new Map(); // tab id -> the session (front or back) that was last on stage

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
      <span class="at-stamp is-uv desk-uv-stamp">UV</span>
      ${handoff && (handoff.mode === 'edit' || handoff.mode === 'new') ? `<span class="at-stamp is-accent at-handoff-stamp" title="Ligado ao Tabletop">Ligado ao Tabletop</span>` : ''}
    </div>
    <div class="desk-doc-actions">
      <button type="button" class="at-icon-btn" data-action="undo" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
        ${renderIcon('undo', 16)}
      </button>
      <button type="button" class="at-icon-btn" data-action="redo" title="Refazer (Ctrl+Y)" aria-label="Refazer">
        ${renderIcon('redo', 16)}
      </button>
      <button type="button" class="at-btn" data-action="flip-sheet" title="Virar a folha (F)">
        Criar verso
      </button>
      <button type="button" class="at-icon-btn" data-action="unlink-back" title="Desvincular verso" aria-label="Desvincular verso" style="display:none;">
        ${renderIcon('close', 14)}
      </button>
      <button type="button" class="at-btn" data-action="toggle-uv" aria-pressed="false" title="Luz UV (U)">
        Luz UV
      </button>
      <button type="button" class="at-btn is-primary" data-action="archive">
        Arquivar
      </button>
      <button type="button" class="at-icon-btn desk-inspector-toggle-btn" data-action="toggle-inspector" title="Inspetor" aria-label="Alternar Inspetor" aria-expanded="false">
        ${renderIcon('panel-right', 16)}
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
  stampOverlay.innerHTML = stamp('ARQUIVADO', { tone: 'wax', tilt: -4 });

  // Stage container
  const stageContainer = document.createElement('div');
  stageContainer.style.position = 'absolute';
  stageContainer.style.top = `${TAB_BAR_HEIGHT + 52}px`;
  stageContainer.style.left = '0';
  stageContainer.style.right = '0';
  stageContainer.style.bottom = '0';

  let templatesDrawer = null;
  let startScreen = null;

  // The stage fills its own host; the room light (layers and menu) sits next to it in the same container.
  const stageHost = document.createElement('div');
  stageHost.style.position = 'absolute';
  stageHost.style.inset = '0';
  stageContainer.appendChild(stageHost);

  // Room light around the document (lamp, candle, flashlight, UV, studio)
  const ambient = createAmbient(stageContainer, {
    shortcutLabel: () => keyLabel('ambient-cycle'),
    onSelect: (mode) => setAmbient(mode),
  });

  /** UV is also the document's UV light; every other mode turns it off. */
  function setAmbient(mode) {
    if (mode === ambient.mode) return;
    const wantsUv = mode === 'uv';
    if (wantsUv !== (currentLight === 'uv') && state) {
      toggleUvLight({ silent: true });
    }
    ambient.apply(wantsUv ? 'uv' : mode);
    play('light-switch', { mode });
  }

  // Start screen container
  const startScreenContainer = document.createElement('div');
  startScreenContainer.className = 'desk-start-wrapper';
  startScreenContainer.style.position = 'absolute';
  startScreenContainer.style.top = `${TAB_BAR_HEIGHT}px`;
  startScreenContainer.style.left = '0';
  startScreenContainer.style.right = '0';
  startScreenContainer.style.bottom = '0';
  startScreenContainer.style.display = 'none';

  /** The Mesa is the home tab: it shows the start screen and keeps every open document where it was. */
  function showStartScreen() {
    suspendActive();
    activeSession = null;
    activeId = null;
    state = null;
    docBar.style.display = 'none';
    readonlyBanner.style.display = 'none';
    draftBar.style.display = 'none';
    stageContainer.style.display = 'none';
    stampOverlay.style.display = 'none';
    startScreenContainer.style.display = 'block';
    delete document.documentElement.dataset.light;
    startScreen?.refresh();
    shell.rail.setActive('desk');
    refreshTabs();
    persistTabs();
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
    getOpenIds: () => tabOrder.slice(),
    onCreatePreset: (presetId) => {
      loadHandout(createHandout({ preset: presetId }), { newTab: true });
    },
    onOpenHandout: async (docId) => {
      openDocumentById(docId);
    },
    onOpenTemplate: async (templateId) => {
      try {
        await instantiateTemplate(templateId, { newTab: true });
        shell.inspector.tab('fill');
      } catch (err) {
        shell.notify(`Erro ao carregar modelo: ${err.message}`, { tone: 'error' });
      }
    },
    onOpenTemplatesDrawer: () => {
      shell.drawer.open('templates');
    },
    onExploreExpansion: (sourceId) => {
      templatesDrawer?.openSource(sourceId);
      shell.drawer.open('templates');
    },
  });

  const tabBar = createTabBar({
    onActivate: (id) => (id ? activateTab(id) : showStartScreen()),
    onClose: (id) => closeTab(id),
    onReorder: (id, toIndex) => {
      tabOrder = reorderIds(tabOrder, id, toIndex);
      refreshTabs();
      persistTabs();
    },
  });

  deskStage.innerHTML = '';
  deskStage.appendChild(tabBar.element);
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
  const flipBtn = docBar.querySelector('[data-action="flip-sheet"]');
  const unlinkBtn = docBar.querySelector('[data-action="unlink-back"]');
  const inspectorToggleBtn = docBar.querySelector('[data-action="toggle-inspector"]');

  if (inspectorToggleBtn) {
    inspectorToggleBtn.addEventListener('click', () => {
      shell.inspector.toggle();
    });
  }

  let currentLight = 'normal';

  function toggleUvLight({ silent = false } = {}) {
    currentLight = currentLight === 'uv' ? 'normal' : 'uv';
    const isUv = currentLight === 'uv';
    if (!silent) play('uv-toggle', { on: isUv });
    if (isUv !== (ambient.mode === 'uv')) ambient.apply(isUv ? 'uv' : loadAmbient());
    if (uvBtn) uvBtn.setAttribute('aria-pressed', isUv ? 'true' : 'false');
    if (isUv) {
      document.documentElement.dataset.light = 'uv';
    } else {
      delete document.documentElement.dataset.light;
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
    let top = TAB_BAR_HEIGHT + 52;
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
    if (activeSession) activeSession.isReadOnly = ro;
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
      if (!msg) return;
      const session = sessions.get(msg.handoutId);
      if (!session) return;

      const setRo = (ro) => {
        if (session === activeSession) setReadOnly(ro); else session.isReadOnly = ro;
      };

      if (msg.type === 'check-open' && msg.tabId !== tabId && !session.isReadOnly) {
        broadcastChannel.postMessage({
          type: 'claim-active',
          handoutId: session.id,
          ownerTabId: tabId,
        });
      } else if (msg.type === 'claim-active' && msg.ownerTabId !== tabId) {
        setRo(true);
      } else if (msg.type === 'claim-edit' && msg.tabId !== tabId) {
        setRo(true);
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
    updateFlipUi();
    undoBtn.disabled = !state.canUndo;
    redoBtn.disabled = !state.canRedo;
  }

  function updateFillTabVisibility(handout) {
    const hasFields = Boolean(handout?.fields && handout.fields.length > 0);
    const fillTabBtn = document.querySelector('.inspector-tab[data-tab="fill"]');
    if (fillTabBtn) {
      fillTabBtn.style.display = hasFields ? 'flex' : 'none';
    }
  }

  function triggerArchiveAnimation() {
    play('archive');
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
      refreshTabs();

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

    const close = () => { backdrop.remove(); dispose(); };
    const dispose = wireModal(backdrop, { onCancel: close, primary: '.modal-save-btn' });
    backdrop.querySelector('.modal-cancel-btn').addEventListener('click', close);
    backdrop.querySelector('.modal-discard-btn').addEventListener('click', () => {
      close();
      onDiscard();
    });
    backdrop.querySelector('.modal-save-btn').addEventListener('click', async () => {
      close();
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

      // Sem cancelar por Esc ou fundo: as duas saídas decidem o destino do rascunho.
      const dispose = wireModal(backdrop, { primary: '.draft-recover-btn' });

      backdrop.querySelector('.draft-discard-prompt-btn').addEventListener('click', () => {
        backdrop.remove();
        dispose();
        resolve(false);
      });

      backdrop.querySelector('.draft-recover-btn').addEventListener('click', () => {
        backdrop.remove();
        dispose();
        resolve(true);
      });
    });
  }

  /** Returns the document to open and the draft flags for its session. */
  async function checkDraftRecovery(handout) {
    const plain = { handout, hasDraft: false, draftSaved: true };
    if (!handout || !handout.id) return plain;
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
          return { handout: draft.handout, hasDraft: true, draftSaved: true };
        }
        await removeDraft(handout.id);
        return plain;
      } else if (decision === 'conflict') {
        const shouldCopy = await showDraftPrompt({
          title: 'Conflito de rascunho',
          message: 'O documento mudou desde o seu rascunho. Deseja abrir o rascunho como uma nova cópia?',
          primaryText: 'Abrir como cópia',
          secondaryText: 'Descartar',
        });

        await removeDraft(handout.id);
        if (shouldCopy) {
          const copy = structuredClone(draft.handout);
          copy.id = 'h-' + Math.random().toString(36).slice(2, 10);
          copy.name = `${copy.name} (Rascunho)`;
          copy.revision = 0;
          return { handout: copy, hasDraft: true, draftSaved: false };
        }
        return plain;
      }
    } catch (err) {
      console.warn('[atelie] Erro ao verificar rascunho:', err);
    }
    return plain;
  }

  // --- Sessions and tabs -------------------------------------------------------

  function persistTabs() {
    const own = tabOrder.filter(id => !sessions.get(id)?.practice);
    saveTabs(own, own.includes(activeId) ? activeId : null);
  }

  function refreshTabs() {
    tabBar.render(
      tabOrder.map(id => {
        const sess = sessions.get(id);
        const back = backSessionOf(id);
        const onBack = id === activeId && activeSession?.owner === id;
        const base = (onBack ? back : sess)?.state?.handout?.name || sess?.state?.handout?.name || 'Sem nome';
        return {
          id,
          title: onBack ? `${base} · verso` : base,
          dirty: Boolean(sess?.state?.dirty || back?.state?.dirty),
        };
      }),
      activeId
    );
  }

  /** Writes the mirrored editor variables back to the session that is leaving the stage. */
  function suspendActive() {
    const sess = activeSession;
    if (!sess) return;
    sess.hasDraft = hasDraft;
    sess.draftSaved = draftSaved;
    sess.isReadOnly = isReadOnly;
    sess.light = currentLight;
    if (stage) sess.view = stage.getView();
  }

  function disposeSession(sess) {
    if (sess.draftTimer) clearTimeout(sess.draftTimer);
    sess.draftTimer = null;
    sess.disposed = true;
    sessions.delete(sess.id);
  }

  /** The back face loaded next to a tab (a separate document linked by `handout.back`), if any. */
  function backSessionOf(tabId) {
    for (const sess of sessions.values()) {
      if (sess.owner === tabId && !sess.disposed) return sess;
    }
    return null;
  }

  function disposePair(front) {
    const back = backSessionOf(front.id);
    if (back) disposeSession(back);
    disposeSession(front);
    lastFace.delete(front.id);
  }

  function updateFlipUi() {
    if (!flipBtn || !state) return;
    const hasBack = Boolean(state.handout.back?.handoutId);
    flipBtn.textContent = !hasBack ? 'Criar verso' : activeSession?.owner ? 'Virar para a frente' : 'Virar para o verso';
    flipBtn.title = hasBack ? 'Virar a folha (F)' : 'Criar um verso para este documento (F)';
    unlinkBtn.style.display = hasBack ? '' : 'none';
  }

  /** Loads the other face of the active tab as a hidden session (not a tab of its own). */
  async function loadFaceSession(linkedId) {
    const tabId = activeSession.owner || activeSession.id;
    let target = sessions.get(linkedId);
    if (target) return target;
    let doc;
    try {
      doc = await api.handouts.read(linkedId);
    } catch {
      doc = null;
    }
    if (!doc) return null;
    const draft = await loadDraft(doc.id).catch(() => null);
    let flags = { hasDraft: false, draftSaved: true };
    if (draft?.handout && draftDecision({ draft, serverHandout: doc }) === 'offer') {
      doc = draft.handout;
      flags = { hasDraft: true, draftSaved: true };
    }
    target = createSession(doc, flags);
    if (target.id !== tabId) target.owner = tabId;
    return target;
  }

  async function flipDocument() {
    if (!activeSession || !state) return;
    const linkedId = state.handout.back?.handoutId;
    if (!linkedId) {
      await createBackForActive();
      return;
    }
    const target = await loadFaceSession(linkedId);
    if (!target) {
      offerUnlinkMissingBack();
      return;
    }
    if (tabOrder.includes(target.id) && target.owner == null && target.id !== (activeSession.owner || activeSession.id)) {
      // The other face is open as a tab of its own: go there instead of pairing it.
      await activateTab(target.id, { exact: true });
      return;
    }
    await activateTab(target.id, { exact: true, flip: true });
  }

  function offerUnlinkMissingBack() {
    const frontId = activeSession?.owner || activeSession?.id;
    shell.notify('O verso deste documento não existe mais.', {
      tone: 'warning',
      duration: 8000,
      action: { label: 'Desvincular', run: () => unlinkBack({ missing: true, tabId: frontId }) },
    });
  }

  /** On opening a document, warns if its back was deleted. */
  async function verifyBackLink(sess) {
    const linkedId = sess.state.handout.back?.handoutId;
    if (!linkedId || sess.backChecked || sessions.has(linkedId)) return;
    sess.backChecked = true;
    try {
      const doc = await api.handouts.read(linkedId);
      if (doc) return;
    } catch {}
    if (sess === activeSession) offerUnlinkMissingBack();
  }

  async function createBackForActive() {
    if (!state || isReadOnly) return;
    const front = state.handout;
    const backDoc = createHandout({ name: `${front.name} (verso)` });
    backDoc.page = structuredClone(front.page);
    const papers = front.layers.filter(isPaperLayer).map(layer => ({ ...structuredClone(layer), id: newLayerId() }));
    backDoc.layers = papers.length
      ? papers
      : backDoc.layers.map(layer => ({ ...layer, width: backDoc.page.width, height: backDoc.page.height }));
    backDoc.back = { handoutId: front.id };
    try {
      const savedBack = await api.handouts.create(backDoc);
      state.edit({ ...state.handout, back: { handoutId: savedBack.id } }, { label: 'Criar verso' });
      await archiveDocument();
      const target = createSession(savedBack);
      target.owner = activeSession.owner || activeSession.id;
      await activateTab(target.id, { exact: true, flip: true });
      shell.notify('Verso criado e ligado à frente.', { tone: 'info' });
    } catch (err) {
      shell.notify(`Não foi possível criar o verso: ${err.message}`, { tone: 'error' });
    }
  }

  /** Saves a face that is not on stage, without the delivery steps of a normal archive. */
  async function savePlain(sess) {
    const doc = sess.state.handout;
    const saved = doc.revision === 0 ? await api.handouts.create(doc) : await api.handouts.save(doc);
    sess.state.markSaved(saved);
    await removeDraft(saved.id).catch(() => {});
    if (sess === activeSession) {
      hasDraft = false;
      draftSaved = true;
      updateStageLayout();
    } else {
      sess.hasDraft = false;
      sess.draftSaved = true;
    }
  }

  async function unlinkBack({ missing = false, tabId = activeSession?.owner || activeSession?.id } = {}) {
    const front = sessions.get(tabId);
    if (!front) return;
    const back = backSessionOf(tabId);
    const backId = front.state.handout.back?.handoutId || back?.id;
    try {
      // Leave the back first so the face on stage is the front, then cut the link on both documents.
      if (activeSession === back) await activateTab(front.id, { exact: true, flip: true });
      front.state.edit({ ...front.state.handout, back: null }, { label: 'Desvincular verso' });
      if (front === activeSession) await archiveDocument(); else await savePlain(front);

      if (!missing && backId) {
        let backSess = back || sessions.get(backId);
        if (backSess) {
          backSess.state.edit({ ...backSess.state.handout, back: null }, { label: 'Desvincular verso' });
          await savePlain(backSess);
        } else {
          const doc = await api.handouts.read(backId).catch(() => null);
          if (doc) await api.handouts.save({ ...doc, back: null });
        }
      }
      if (back) {
        disposeSession(back);
        lastFace.delete(tabId);
      }
      updateFlipUi();
      refreshTabs();
      shell.notify('Verso desvinculado.', { tone: 'info' });
    } catch (err) {
      shell.notify(`Não foi possível desvincular: ${err.message}`, { tone: 'error' });
    }
  }

  // Tutorials run on practice tabs: they leave no draft, are not restored with the tabs and never touch the person's documents.
  let practiceMode = false;

  function createSession(handout, { hasDraft: draftFlag = false, draftSaved: savedFlag = true } = {}) {
    const sessionState = createEditorState(handout, { unsaved: draftFlag });
    sessionState.land = (id) => stage?.land(id);
    const sess = {
      id: handout.id,
      state: sessionState,
      hasDraft: draftFlag,
      draftSaved: savedFlag,
      draftTimer: null,
      isReadOnly: false,
      light: 'normal',
      view: null,
      disposed: false,
      practice: practiceMode,
    };

    sessionState.subscribe(change => {
      if (sess.disposed) return;
      if (sess !== activeSession) {
        refreshTabs();
        return;
      }
      updateDocBar();
      updateFillTabVisibility(state.handout);
      refreshTabs();
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

        if (change.type === 'edit') {
        const selected = state.handout.layers.find(l => l.id === state.selection);
        const style = textStyleFrom(selected);
        if (style) sess.lastTextStyle = style;
      }

      if (change.type === 'edit' && !isReadOnly && !sess.practice) {
          hasDraft = true;
          draftSaved = false;
          updateStageLayout();

          if (sess.draftTimer) clearTimeout(sess.draftTimer);
          sess.draftTimer = setTimeout(async () => {
            try {
              await saveDraft(sess.state.handout, sess.state.handout.revision || 1);
              if (sess === activeSession) draftSaved = true; else sess.draftSaved = true;
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

    sessions.set(sess.id, sess);
    if (broadcastChannel && handout.id) {
      broadcastChannel.postMessage({ type: 'check-open', handoutId: handout.id, tabId });
    }
    return sess;
  }

  function warnMissingExpansion(handout) {
    if (!api?.library || !shell?.notify) return;
    api.library.list().then(libData => {
      if (!libData) return;
      const availableItemIds = new Set((libData.items || []).map(i => i.id));
      for (const page of handout.pages || []) {
        for (const layer of page.layers || []) {
          const libId = layer.image?.src?.library;
          if (libId && !availableItemIds.has(libId)) {
            let expName = 'externa';
            if (libId.startsWith('ac-')) {
              expName = 'Arquivos Confidenciais';
            } else {
              const prefix = libId.split('-')[0];
              expName = prefix ? `"${prefix}"` : 'desconhecida';
            }
            shell.notify(`Este documento usa a expansão ${expName}, que não está instalada neste navegador.`, { tone: 'warning' });
            return;
          }
        }
      }
    }).catch(() => {});
  }

  const layerThumbs = createLayerThumbs({
    images,
    fonts,
    onReady: (key, url) => layersPanel?.thumbReady?.(key, url),
  });

  /** Rebuilds the inspector panels for the session that is on stage. */
  function mountPanels() {
    const layersWrap = document.createElement('div');
    layersPanel = createLayersPanel(layersWrap, {
      state,
      getThumbs: () => layerThumbs,
      getLight: () => currentLight,
      getTextStyle: () => inheritedTextStyle(state.handout, activeSession?.lastTextStyle),
      shell,
    });
    shell.inspector.panel('layers', layersWrap);

    const propertiesWrap = document.createElement('div');
    propertiesPanel = createPropertiesPanel(propertiesWrap, { state, api, fonts });
    shell.inspector.panel('properties', propertiesWrap);

    const historyWrap = document.createElement('div');
    historyPanel = createHistoryPanel(historyWrap, { state, api, images, fonts, shell });
    shell.inspector.panel('history', historyWrap);

    fillPanel = createFillPanel(shell, { state, api, images });
    shell.inspector.panel('fill', fillPanel.element);

    updateFillTabVisibility(state.handout);
  }

  /** Puts a session on stage: Id `null` is the Mesa. */
  async function activateTab(id, { replacing = false, first = false, exact = false, flip = false } = {}) {
    if (id == null) {
      showStartScreen();
      return;
    }
    let sess = sessions.get(id);
    if (!sess) return;
    // Coming back to a tab shows the face it was left on.
    if (!exact && !sess.owner) {
      const back = backSessionOf(sess.id);
      if (back && lastFace.get(sess.id) === back) sess = back;
    }
    if (sess === activeSession) return;

    const isSwitching = (Boolean(activeSession) || replacing) && stageContainer.style.display !== 'none';
    suspendActive();
    activeSession = sess;
    activeId = sess.owner || sess.id;
    lastFace.set(activeId, sess);
    state = sess.state;
    hasDraft = sess.hasDraft;
    draftSaved = sess.draftSaved;
    isReadOnly = sess.isReadOnly;
    currentLight = sess.light;
    play('paper-slide');

    if (uvBtn) uvBtn.setAttribute('aria-pressed', currentLight === 'uv' ? 'true' : 'false');
    if (currentLight === 'uv') document.documentElement.dataset.light = 'uv';
    else delete document.documentElement.dataset.light;
    ambient.apply(currentLight === 'uv' ? 'uv' : loadAmbient());

    hideStartScreen();

    if (!stage) {
      stage = createStage(stageHost, {
        images,
        fonts,
        api,
        onSelect: layerId => state?.select(layerId),
        onEdit: (nextHandout, meta) => state?.edit(nextHandout, meta),
        onMore: () => shell.inspector.tab('properties'),
        onCreateTextAt: (point) => addTextAt(point, { edit: true }),
        onDraw: (description) => addDrawing(description),
        onSound: (name, options) => play(name, options),
        shortcutLabel: (id) => keyLabel(id),
      });
    } else {
      stage.select(null);
    }

    mountPanels();
    if (first && state.handout.fields && state.handout.fields.length > 0) {
      shell.inspector.tab('fill');
    }

    const view = sess.view;
    const draw = async () => {
      if (view) stage.zoom(view.zoom, { skipRender: true }); else stage.zoom('fit', { skipRender: true });
      await stage.renderNow(state.handout, { light: currentLight });
      if (view) stage.setView(view);
      stage.select(state.selection);
    };
    if (flip) {
      await stage.animateFlip(draw);
    } else if (isSwitching) {
      await stage.animateSwitch(draw);
    } else {
      await draw();
      stage.animateOpen();
    }
    updateDocBar();
    setReadOnly(sess.isReadOnly);
    updateStageLayout();
    refreshTabs();
    persistTabs();

    recordRecent(sess.id);
    navigatorInstance?.render();
    refreshPaletteCache();
    verifyBackLink(sess);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.delete('new');
      params.set('handout', sess.id);
      window.history.replaceState(null, '', `?${params.toString()}`);
      try { localStorage.setItem('atelie-last', sess.id); } catch {}
    }
  }

  /**
   * Opens a document in a tab. Already open → that tab is activated. Otherwise it replaces the active tab
   * (the caller has handled unsaved changes), or goes into a new tab when `newTab` is set or the Mesa is showing.
   * A document whose id is already open replaces that tab's session (draft discarded, version restored).
   */
  async function openInTab(inputHandout, { skipDraftCheck = false, newTab = false, background = false, draftFlags = null } = {}) {
    const existing = inputHandout?.id ? sessions.get(inputHandout.id) : null;
    // Opening by id (openDocumentById) activates a tab that is already open; loading a document object replaces it.
    if (existing && background) return;

    let opened = { handout: inputHandout, hasDraft: false, draftSaved: true };
    if (draftFlags) {
      opened = { handout: inputHandout, ...draftFlags };
    } else if (!skipDraftCheck) {
      opened = await checkDraftRecovery(inputHandout);
    }

    let replaced = existing
      ? existing
      : (!newTab && !background && activeSession ? activeSession : null);
    // Replacing while the back is showing replaces the whole tab.
    if (replaced?.owner) replaced = sessions.get(replaced.owner) || replaced;

    const sess = createSession(opened.handout, opened);
    if (replaced && replaced.id !== sess.id) {
      const idx = tabOrder.indexOf(replaced.id);
      disposePair(replaced);
      sessions.set(sess.id, sess);
      tabOrder.splice(idx === -1 ? tabOrder.length : idx, 1, sess.id);
    } else if (replaced) {
      // Same id: createSession already overwrote the map entry; stop the old session's timer.
      if (replaced.draftTimer) clearTimeout(replaced.draftTimer);
      replaced.disposed = true;
      const oldBack = backSessionOf(replaced.id);
      if (oldBack) disposeSession(oldBack);
      if (!tabOrder.includes(sess.id)) tabOrder.push(sess.id);
    } else {
      tabOrder.push(sess.id);
    }
    if (activeSession && (activeSession === replaced || activeSession.owner === replaced?.id)) activeSession = null;

    warnMissingExpansion(opened.handout);

    if (background) {
      refreshTabs();
      persistTabs();
      return sess;
    }
    await activateTab(sess.id, { replacing: Boolean(replaced), first: true });
    return sess;
  }

  async function loadHandout(inputHandout, options = {}) {
    return openInTab(inputHandout, options);
  }

  /** Opens by id: activates the tab if open, otherwise replaces the active tab (asking first if it has unsaved changes). */
  async function openDocumentById(id, { newTab = false } = {}) {
    if (sessions.has(id)) {
      await activateTab(id);
      return;
    }
    const open = async () => {
      try {
        const doc = await api.handouts.read(id);
        if (doc) await loadHandout(doc, { newTab });
      } catch (err) {
        shell.notify(`Erro ao abrir documento: ${err.message}`, { tone: 'error' });
      }
    };
    if (!newTab && activeSession) confirmUnsavedChanges(open); else await open();
  }

  async function closeTab(id) {
    const sess = sessions.get(id);
    if (!sess) return;
    const back = backSessionOf(id);
    const finish = async () => {
      const wasActive = activeId === id;
      const target = nextAfterClose(tabOrder, id, activeId);
      tabOrder = tabOrder.filter(x => x !== id);
      if (wasActive) {
        suspendActive();
        activeSession = null;
      }
      disposePair(sess);
      if (wasActive) {
        if (target) await activateTab(target); else showStartScreen();
      } else {
        refreshTabs();
        persistTabs();
      }
      navigatorInstance?.render();
    };
    const dirtyFace = [sess, back].find(face => face?.state?.dirty);
    if (dirtyFace) {
      // The confirmation (and "Arquivar e continuar") act on the face on stage: bring the unsaved one forward first.
      if (dirtyFace !== activeSession) await activateTab(dirtyFace.id, { exact: true });
      confirmUnsavedChanges(finish);
    } else {
      await finish();
    }
  }

  /** Opens a practice document for a tutorial: 'blank', 'text', 'rect' or a template id. */
  async function openPractice(kind, name = 'Treino', { secret = false } = {}) {
    practiceMode = true;
    if (['blank', 'text', 'rect'].includes(kind)) {
      let doc = createHandout({ name, preset: 'a4' });
      let extra = null;
      if (kind === 'text') {
        extra = textLayer({ name: 'Texto', x: 200, y: 300, width: 700, height: 160, text: { content: 'Querida Lia, não procure por mim.' } });
      } else if (kind === 'rect') {
        extra = shapeLayer({ name: 'Mancha', x: 200, y: 300, width: 400, height: 300, shape: { type: 'rect', fill: '#8a6a3a', stroke: null, strokeWidth: 0 } });
      }
      if (extra) doc = addLayer(doc, extra, doc.layers.length);
      await openInTab(doc, { newTab: true });
      if (extra) state.select(extra.id);
    } else {
      await instantiateTemplate(kind, { newTab: true });
    }
    // A text only the UV light reveals, for lessons that read documents the way the players do
    if (secret && state) {
      const hidden = textLayer({ name: 'Segredo', light: 'uv', x: 120, y: 120, width: 600, height: 120, text: { content: 'A chave está sob o relógio' } });
      state.edit(addLayer(state.handout, hidden, state.handout.layers.length), { label: 'Adicionar segredo' });
    }
  }

  /** Practice documents already archived (they exist in storage), including the hidden back faces. */
  function practiceDocuments() {
    return [...sessions.values()].filter(sess => sess.practice && !sess.disposed && sess.state.handout.revision > 0).map(sess => sess.state.handout.id);
  }

  /** Ends the practice: its tabs close without questions; with `trash` the documents it archived go to the trash. */
  async function closePractice({ trash = false } = {}) {
    const saved = practiceDocuments();
    practiceMode = false;
    const practiceTabs = tabOrder.filter(id => sessions.get(id)?.practice);
    const leavingStage = Boolean(activeSession?.practice);
    for (const id of practiceTabs) {
      const sess = sessions.get(id);
      tabOrder = tabOrder.filter(x => x !== id);
      if (sess) disposePair(sess);
    }
    for (const sess of [...sessions.values()]) if (sess.practice) disposeSession(sess);
    if (trash) {
      for (const id of saved) {
        try { await api.handouts.remove(id); } catch {}
      }
    }
    if (leavingStage) {
      activeSession = null;
      const back = tabOrder[tabOrder.length - 1];
      if (back) await activateTab(back); else showStartScreen();
    } else {
      refreshTabs();
    }
    persistTabs();
    navigatorInstance?.render();
    refreshPaletteCache();
  }

  /** Everything a tutorial's conditions read from the editor. */
  function tutorialSnapshot() {
    const selected = state ? state.handout.layers.find(l => l.id === state.selection) ?? null : null;
    return {
      handout: state?.handout ?? null,
      dirty: Boolean(state?.dirty),
      light: currentLight,
      tool: stage?.getTool?.() ?? 'select',
      selection: selected,
      tabs: tabOrder.slice(),
      practiceTabs: tabOrder.filter(id => sessions.get(id)?.practice).length,
      activeTabId: activeId,
      onMesa: activeId == null,
      face: activeSession?.owner ? 'back' : 'front',
      hasBack: Boolean(state?.handout?.back?.handoutId),
    };
  }

  /** Brings back the tabs of the last visit (documents never archived come back from their drafts). */
  async function restoreTabs(extraActiveId = null) {
    const saved = loadTabs();
    const ids = saved.order.filter(id => !sessions.has(id));
    for (const id of ids) {
      try {
        let doc = null;
        try { doc = await api.handouts.read(id); } catch {}
        const draft = await loadDraft(id).catch(() => null);
        let flags = { hasDraft: false, draftSaved: true };
        if (draft?.handout && (!doc || draftDecision({ draft, serverHandout: doc }) === 'offer')) {
          doc = draft.handout;
          flags = { hasDraft: true, draftSaved: true };
        }
        if (doc) await openInTab(doc, { background: true, draftFlags: flags });
      } catch (err) {
        console.warn('[atelie] Erro ao restaurar aba:', err);
      }
    }
    return saved;
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
  flipBtn.addEventListener('click', () => flipDocument());
  unlinkBtn.addEventListener('click', () => unlinkBack());

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
    onOpenExport: async (id) => {
      if (state?.handout?.id !== id) await openDocumentById(id);
      shell.drawer.open('export');
    },
    onOpenDocument: async (id, { newTab = false } = {}) => {
      await openDocumentById(id, { newTab });
      shell.drawer.close();
    },
    onCreateDocument: () => {
      loadHandout(createHandout({ preset: 'a4' }), { newTab: true });
      shell.drawer.close();
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
    flash: (id) => layersPanel?.flash?.(id),
  };
  libraryPanel = createLibraryPanel(shell, { api, state: libraryStateProxy, fonts });
  shell.drawer.panel('library', libraryPanel.element);

  // Templates Drawer panel
  templatesDrawer = createTemplatesDrawer(shell, {
    api,
    onUseTemplate: async (templateItem) => {
      try {
        await instantiateTemplate(templateItem, { newTab: true });
        shell.inspector.tab('fill');
        shell.drawer.close();
      } catch (err) {
        shell.notify(`Erro ao usar modelo: ${err.message}`, { tone: 'error' });
      }
    },
  });
  shell.drawer.panel('templates', templatesDrawer.element);

  // Export Drawer panel
  const exportWrap = document.createElement('div');
  exportWrap.className = 'export-drawer-container';
  exportWrap.style.height = '100%';

  const exportDrawer = createExportDrawer(exportWrap, {
    shell,
    getHandout: () => state?.handout,
    images,
    fonts,
    api,
    isUvLight: () => currentLight === 'uv',
  });

  shell.drawer.panel('export', () => {
    exportDrawer.render();
    return exportWrap;
  });

  // Rail action listener
  shell.onAction?.((action, event) => {
    if (action === 'desk') showStartScreen();
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
          run: () => openDocumentById(h.id),
        });
      }

      paletteDocumentsCache = items;
    } catch {}
  }

  shell.palette.register(() => paletteDocumentsCache);

  // Helper actions for layers
  function duplicateSelected({ varied = false } = {}) {
    if (!state?.selection) return;
    const oldLayers = state.handout.layers;
    let next = duplicateLayer(state.handout, state.selection);
    const duplicated = next.layers.find(l => !oldLayers.some(oldL => oldL.id === l.id));
    if (varied && duplicated) {
      next = updateLayer(next, duplicated.id, varyLayer(duplicated));
    }
    state.edit(next, { label: varied ? 'Duplicar com variação' : 'Duplicar camada' });
    if (duplicated) {
      state.select(duplicated.id);
      layersPanel?.flash?.(duplicated.id);
      stage?.land(duplicated.id);
    }
  }

  function removeSelected() {
    if (!state?.selection) return;
    const selId = state.selection;
    play('delete');
    const next = removeLayer(state.handout, selId);
    state.edit(next, { label: 'Excluir camada' });
    shell?.notify?.('Camada excluída', {
      duration: 5000,
      action: {
        label: 'Desfazer',
        run: () => {
          state.undo();
        },
      },
    });
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

    const insertIdx = insertionIndex(state.handout, cloned, { selectedId: state.selection });
    const next = addLayer(state.handout, cloned, insertIdx);
    state.edit(next, { label: `Colar ${cloned.name}` });
    state.select(cloned.id);
    layersPanel?.flash?.(cloned.id);
    stage?.land(cloned.id);
  }

  function addTextAt(pos, { edit = false } = {}) {
    if (!state) return;
    const style = inheritedTextStyle(state.handout, activeSession?.lastTextStyle);
    const newL = textLayer({
      name: 'Texto',
      x: Math.round(pos[0] - 300),
      y: Math.round(pos[1] - 100),
      width: 600,
      height: 200,
      light: currentLight === 'uv' ? 'uv' : 'both',
      ...(style ? { text: style } : {}),
    });
    const insertIdx = insertionIndex(state.handout, newL, { selectedId: state.selection });
    const next = addLayer(state.handout, newL, insertIdx);
    state.edit(next, { label: 'Adicionar texto' });
    state.select(newL.id);
    layersPanel?.flash?.(newL.id);
    stage?.land(newL.id);
    if (edit) stage?.startInlineTextEdit(newL.id);
  }

  /** A finished gesture of the drawing tools becomes a layer (or a stroke added to a brush layer). */
  /** A finished cutting gesture becomes one "cut" layer: clipped to the layer it cut, or on top for the whole sheet. */
  function addCut(desc) {
    const handout = state.handout;
    const target = desc.target;
    const onLayer = Boolean(target.id);
    const light = currentLight === 'uv' ? 'uv' : 'both';

    if (desc.type === 'burn' && desc.appendTo === 'selected') {
      const selected = handout.layers.find(l => l.id === state.selection);
      if (selected?.kind === 'effect' && selected.effect?.type === 'cut' && selected.effect.holes) {
        const holes = [...selected.effect.holes, desc.trail];
        state.edit(updateLayer(handout, selected.id, { effect: { ...selected.effect, holes } }), { label: 'Acrescentar queima' });
        return;
      }
    }

    const names = { tesoura: 'Corte · tesoura', picote: 'Corte · picote', rasgado: 'Rasgo', queimado: 'Queimado' };
    let effect;
    if (desc.type === 'burn') {
      effect = cutEffect({ edge: 'queimado', holes: [desc.trail], seed: desc.seed, char: desc.char });
    } else {
      effect = cutEffect({ edge: desc.edge, remove: desc.remove, seed: desc.seed, char: desc.edge === 'queimado' ? 0.5 : 0.5, fiber: desc.fiber });
      effect.params = { rough: desc.rough };
    }
    const newL = effectLayer({
      name: desc.type === 'burn' ? names.queimado : names[desc.edge],
      x: target.x, y: target.y, width: target.width, height: target.height, rotation: target.rotation || 0,
      blend: desc.type === 'burn' ? 'multiply' : 'normal',
      clip: onLayer,
      light,
      effect,
    });
    const insertIdx = insertionIndex(handout, newL, { selectedId: onLayer ? target.id : null });
    state.edit(addLayer(handout, newL, insertIdx), { label: `Adicionar ${newL.name}` });
    state.select(newL.id);
    layersPanel?.flash?.(newL.id);
  }

  function addDrawing(desc) {
    if (!state || isReadOnly) return;
    if (desc.type === 'cut' || desc.type === 'burn') {
      addCut(desc);
      return;
    }
    const o = desc.options;
    const light = currentLight === 'uv' ? 'uv' : 'both';
    const opacity = Math.max(0.05, Math.min(1, o.opacity / 100));

    if (desc.type === 'stroke' && desc.appendTo) {
      const target = state.handout.layers.find(l => l.id === desc.appendTo);
      if (target) {
        const merged = appendStroke(target, desc.points, target.shape.strokeWidth);
        state.edit(updateLayer(state.handout, target.id, { ...merged.box, shape: { ...target.shape, points: merged.points } }), { label: 'Acrescentar traço' });
        state.select(target.id);
        return;
      }
    }

    let newL;
    if (desc.type === 'stroke') {
      const normalized = normalizeStroke(desc.points, o.width);
      if (!normalized) return;
      newL = shapeLayer({
        name: 'Pincel', ...normalized.box, opacity, light,
        shape: { type: 'path', fill: null, stroke: o.color, strokeWidth: o.width, points: normalized.points },
      });
    } else if (desc.type === 'line') {
      newL = shapeLayer({
        name: 'Linha', ...desc.box, opacity, light,
        shape: { type: 'line', fill: null, stroke: o.color, strokeWidth: o.width },
      });
    } else {
      const isRect = desc.type === 'rect';
      newL = shapeLayer({
        name: isRect ? 'Retângulo' : 'Elipse', ...desc.box, opacity, light,
        shape: o.fill
          ? { type: desc.type, fill: o.color, stroke: null, strokeWidth: 0 }
          : { type: desc.type, fill: null, stroke: o.color, strokeWidth: o.width },
      });
    }
    const insertIdx = insertionIndex(state.handout, newL, { selectedId: state.selection });
    state.edit(addLayer(state.handout, newL, insertIdx), { label: `Adicionar ${newL.name}` });
    state.select(newL.id);
    layersPanel?.flash?.(newL.id);
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
    const insertIdx = insertionIndex(state.handout, newL, { selectedId: state.selection });
    const next = addLayer(state.handout, newL, insertIdx);
    state.edit(next, { label: 'Adicionar imagem' });
    state.select(newL.id);
    layersPanel?.flash?.(newL.id);
    stage?.land(newL.id);
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

  // --- External Image Drag-and-Drop, Library Drag Ghost & Paste ---
  let dragGhost = null;

  function ensureDragGhost() {
    if (!dragGhost) {
      dragGhost = document.createElement('img');
      dragGhost.className = 'stage-drag-ghost';
      dragGhost.alt = '';
      dragGhost.draggable = false;
      document.body.appendChild(dragGhost);
    }
    return dragGhost;
  }

  function removeDragGhost() {
    if (dragGhost) {
      dragGhost.remove();
      dragGhost = null;
    }
  }

  // The ghost is the real element at its real size, following the cursor from the drawer to the page.
  function moveDragGhost(event) {
    const item = typeof window !== 'undefined' ? window.__atelieActiveDragItem : null;
    if (!item || !state?.handout || !stage) {
      removeDragGhost();
      return;
    }
    if (!event.clientX && !event.clientY) return;
    const ghost = ensureDragGhost();
    const defaults = defaultsFor(item);
    const size = libraryDropSize(item, state.handout.page);
    const zoom = stage.getZoom();
    const w = Math.round(size.width * zoom);
    const h = Math.round(size.height * zoom);
    const pageWrap = deskStage.querySelector('.stage-page-wrap');

    let left = event.clientX - w / 2;
    let top = event.clientY - h / 2;
    if (size.cover && pageWrap) {
      const r = pageWrap.getBoundingClientRect();
      left = r.left;
      top = r.top;
    }

    ghost.style.left = `${Math.round(left)}px`;
    ghost.style.top = `${Math.round(top)}px`;
    ghost.style.width = `${w}px`;
    ghost.style.height = `${h}px`;
    ghost.style.mixBlendMode = defaults.blend || 'normal';
    ghost.style.objectFit = size.cover ? 'cover' : 'contain';

    if (ghost.dataset.renderedId !== item.id) {
      ghost.dataset.renderedId = item.id;
      ghost.src = api?.library?.previewURL ? api.library.previewURL(item) : (item.preview || '');
    }
  }

  deskStage.addEventListener('dragover', event => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('dragover', moveDragGhost);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('dragend', () => removeDragGhost());
    window.addEventListener('drop', () => removeDragGhost());
  }

  deskStage.addEventListener('drop', async event => {
    removeDragGhost();
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
          const dropSize = libraryDropSize(item, state.handout.page);
          const w = dropSize.width;
          const h = dropSize.height;
          const posX = dropSize.cover ? 0 : Math.round(dropX - w / 2);
          const posY = dropSize.cover ? 0 : Math.round(dropY - h / 2);

          const newL = imageLayer({
            name: item.name || 'Elemento',
            x: posX,
            y: posY,
            width: Math.round(w),
            height: Math.round(h),
            rotation: getSettings().tiltStamps === false ? 0 : stampTilt(item),
            blend: defaults.blend,
            opacity: defaults.opacity ?? 1,
            light: currentLight === 'uv' ? 'uv' : 'both',
            image: {
              src: { library: item.id },
              fit: defaults.cover ? 'cover' : 'contain',
              tint: defaults.tint || null,
            },
          });

          const isPaper = item.category === 'Papéis' || defaults.position === 'bottom' || (defaults.cover && defaults.blend === 'normal');
          if (isPaper) newL.role = 'paper';
          const role = isPaper ? 'paper' : 'auto';
          const insertIdx = insertionIndex(state.handout, newL, { selectedId: state.selection, role });
          const next = addLayer(state.handout, newL, insertIdx);
          state.edit(next, { label: `Adicionar ${newL.name}` });
          recordRecentLibraryId(item.id);
          state.select(newL.id);
          layersPanel?.flash?.(newL.id);
          stage?.land(newL.id);

          const cat = item.category?.toLowerCase() || '';
          const name = item.name?.toLowerCase() || '';
          if (cat === 'fitas' || name.includes('fita')) {
            play('tape');
          } else if (name.includes('lacre') || name.includes('cera')) {
            play('stamp', { variant: 'wax' });
          } else if (isPaper || cat === 'papeis' || cat === 'papéis' || cat === 'texturas') {
            play('paper-slide');
          } else {
            play('stamp');
          }
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

        const insertIdx = insertionIndex(state.handout, newL, { selectedId: state.selection });
        const next = addLayer(state.handout, newL, insertIdx);
        state.edit(next, { label: 'Adicionar imagem' });
        state.select(newL.id);
        layersPanel?.flash?.(newL.id);
        stage?.land(newL.id);
        stage?.land(newL.id);
        play('paper-slide');
        cascade += 20;
      } catch (err) {
        shell.notify(`Erro ao enviar imagem: ${err.message}`, { tone: 'error' });
      }
    }
  });

  window.addEventListener('paste', async event => {
    const isEditingField = isTypingTarget();
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

            const insertIdx = insertionIndex(state.handout, newL, { selectedId: state.selection });
            const next = addLayer(state.handout, newL, insertIdx);
            state.edit(next, { label: 'Colar imagem' });
            state.select(newL.id);
            layersPanel?.flash?.(newL.id);
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

    const isEditingField = isTypingTarget();

    if (matches(event, 'close-tab')) {
      if (activeId) {
        event.preventDefault();
        closeTab(activeId);
      }
      return;
    }

    if (matches(event, 'next-tab') || matches(event, 'prev-tab')) {
      event.preventDefault();
      const target = cycleTab(tabOrder, activeId, matches(event, 'prev-tab') ? -1 : 1);
      if (target) activateTab(target); else showStartScreen();
      return;
    }

    if (matches(event, 'archive')) {
      event.preventDefault();
      archiveDocument();
      return;
    }

    if (isEditingField) return;

    for (const [shortcut, tool] of [['tool-select', 'select'], ['tool-brush', 'brush'], ['tool-rect', 'rect'], ['tool-ellipse', 'ellipse'], ['tool-line', 'line'], ['tool-scissors', 'scissors'], ['tool-tear', 'tear'], ['tool-lighter', 'lighter']]) {
      if (matches(event, shortcut) && state) {
        event.preventDefault();
        stage?.setTool(tool);
        return;
      }
    }

    if (matches(event, 'ambient-cycle')) {
      event.preventDefault();
      ambient.cycle(1);
      return;
    }

    if (matches(event, 'reader')) {
      event.preventDefault();
      onOpenReader?.(state?.handout?.id);
      return;
    }

    if (matches(event, 'flip-sheet')) {
      event.preventDefault();
      flipDocument();
      return;
    }

    if (matches(event, 'export')) {
      event.preventDefault();
      shell.drawer.toggle('export');
      return;
    }

    if (matches(event, 'undo')) {
      event.preventDefault();
      state?.undo();
      return;
    }
    if (matches(event, 'redo') || normalizeCombo(event) === 'Ctrl+Shift+Z') {
      event.preventDefault();
      state?.redo();
      return;
    }

    if (matches(event, 'copy')) {
      if (state?.selection) {
        event.preventDefault();
        copySelected();
      }
      return;
    }
    if (matches(event, 'paste')) {
      const memory =
        copiedLayerMemory || (typeof window !== 'undefined' ? window.__atelieCopiedLayer : null);
      if (memory) {
        event.preventDefault();
        pasteCopiedLayer(memory);
        return;
      }
    }
    if (matches(event, 'duplicate-varied')) {
      if (state?.selection) {
        event.preventDefault();
        duplicateSelected({ varied: true });
      }
      return;
    }
    if (matches(event, 'duplicate')) {
      if (state?.selection) {
        event.preventDefault();
        duplicateSelected();
      }
      return;
    }
    if (matches(event, 'layer-up')) {
      if (state?.selection) {
        event.preventDefault();
        moveSelected(+1);
      }
      return;
    }
    if (matches(event, 'layer-down')) {
      if (state?.selection) {
        event.preventDefault();
        moveSelected(-1);
      }
      return;
    }
    if (matches(event, 'rulers')) {
      event.preventDefault();
      stage?.toggleRulers();
      return;
    }
    if (matches(event, 'eyedropper')) {
      event.preventDefault();
      triggerEyedropper();
      return;
    }
    if (matches(event, 'uv-light')) {
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
    }
  });

  // Esc peels one thing at a time: text editing (handled by the text box itself), then the selection,
  // then, if nothing is selected, the shell closes the drawer. Running in the capture phase lets
  // the selection go first and tells the shell the key is already used.
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || document.body.classList.contains('is-reading')) return;
    if (document.querySelector('.at-modal-backdrop, .at-settings-modal, .at-palette-modal')) return;
    const active = document.activeElement;
    if (isTypingTarget(active)) return;
    // A half-made cut (choosing which part leaves) takes the Esc first.
    if (stage?.isChoosingCut?.()) return;
    if (stage && stage.getTool() !== 'select') {
      event.preventDefault();
      stage.setTool('select');
      return;
    }
    if (state?.selection) {
      event.preventDefault();
      state.select(null);
    }
  }, true);

  // Warn before unload if dirty and draft was not saved
  window.addEventListener('beforeunload', event => {
    if (state?.dirty && !draftSaved && !activeSession?.practice) {
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
        const insertIdx = insertionIndex(state.handout, newL, { selectedId: state.selection });
        state.edit(addLayer(state.handout, newL, insertIdx), { label: 'Adicionar Retângulo' });
        state.select(newL.id);
        layersPanel?.flash?.(newL.id);
        stage?.land(newL.id);
        stage?.land(newL.id);
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
      run: () => showStartScreen(),
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
      run: () => loadHandout(createHandout({ preset: id }), { newTab: true }),
    });
  });

  shell.palette.register(paletteCommands);

  // Initial load
  async function instantiateTemplate(templateIdOrItem, options = {}) {
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

    await loadHandout(doc, options);
    return doc;
  }

  async function init() {
    await updateRecentRail();
    await refreshPaletteCache();

    if (handoff && handoff.mode === 'pick') {
      shell.drawer.open('documents');
      return;
    }

    const hasWindow = typeof window !== 'undefined';
    const urlParams = hasWindow ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const templateId = urlParams.get('template');
    const handoutId = urlParams.get('handout');
    const newPreset = urlParams.get('new');
    const isStart = urlParams.has('start');
    const isDiagnostics = urlParams.has('diagnostics');

    // Tabs of the last visit come back first, in the background.
    const saved = hasWindow ? await restoreTabs() : { order: [], active: null };

    if (isStart) {
      showStartScreen();
      return;
    }

    if (templateId) {
      try {
        await instantiateTemplate(templateId, { newTab: true });
        shell.inspector.tab('fill');
        return;
      } catch (err) {
        console.warn('[atelie] Erro ao carregar modelo da URL:', err);
      }
    }

    let initialDoc = null;
    if (handoutId) {
      if (sessions.has(handoutId)) {
        await activateTab(handoutId, { first: true });
        return;
      }
      try {
        initialDoc = await api.handouts.read(handoutId);
      } catch {
        // not found, fall back
      }
    } else if (newPreset) {
      initialDoc = createHandout({ preset: newPreset });
    } else if (saved.active && sessions.has(saved.active)) {
      await activateTab(saved.active, { first: true });
      return;
    } else if (!isDiagnostics) {
      // Normal user opening Ateliê with no document requested -> Start Screen (Mesa)
      showStartScreen();
      return;
    } else {
      const lastId = hasWindow ? localStorage.getItem('atelie-last') : null;
      if (lastId) {
        if (sessions.has(lastId)) {
          await activateTab(lastId, { first: true });
          return;
        }
        try {
          initialDoc = await api.handouts.read(lastId);
        } catch {
          // ignore
        }
      }
    }

    if (!initialDoc) {
      if (hasWindow && !isDiagnostics) {
        showStartScreen();
        return;
      }
      initialDoc = createHandout({ preset: 'a4' });
    }

    await loadHandout(initialDoc, { newTab: true });
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
    openInTab,
    openPractice,
    closePractice,
    practiceDocuments,
    tutorialSnapshot,
    get hasPractice() {
      return practiceMode || [...sessions.values()].some(sess => sess.practice);
    },
    openDocumentById,
    activateTab,
    closeTab,
    get tabs() {
      return tabOrder.map(id => ({
        id,
        name: sessions.get(id)?.state?.handout?.name,
        dirty: Boolean(sessions.get(id)?.state?.dirty),
        active: id === activeId,
      }));
    },
    get activeTabId() {
      return activeId;
    },
    openTemplate: instantiateTemplate,
    instantiateTemplate,
    createHandout,
    createDocument: options => loadHandout(createHandout(options), { newTab: true }),
    archive: archiveDocument,
    duplicateSelected,
    copySelected,
    pasteCopiedLayer,
    removeSelected,
    triggerEyedropper,
    showStartScreen,
    hideStartScreen,
    get templatesDrawer() {
      return templatesDrawer;
    },
    get exportDrawer() {
      return exportDrawer;
    },
    exportDocument: (options) => downloadHandoutPng(state?.handout, { images, fonts, ...options }),
    printDocument: (options) => printHandout(state?.handout, { images, fonts, ...options }),
    get startScreen() {
      return startScreen;
    },
    get light() {
      return currentLight;
    },
    toggleUvLight,
  };
}
