import { escapeHTML as esc, icon as renderIcon } from './icons.js';
import { matches } from './keymap.js';
import { tape, card } from './primitives.js';
import { emptyDeskIllustration } from './illustrations.js';
import { notify } from './notify.js';
import { contextMenu } from './context-menu.js';
import { palette } from './palette.js';
import { openSettingsModal, applySettings, getSettings } from './settings.js';
import { createHelpDrawer } from './help.js';

export function createShell(root, { onAction } = {}) {
  // Apply saved settings immediately
  applySettings();

  root.innerHTML = `
    <div class="app-shell" id="app-shell">
      <!-- Trilho lateral -->
      <nav class="app-rail" aria-label="Navegação principal">
        <div class="rail-top">
          <div class="rail-brand" title="Ateliê de documentos">
            ${renderIcon('doc', 24)}
          </div>
          <div class="rail-nav">
            <button type="button" class="rail-btn active" data-action="desk" data-tip="Mesa" data-key="1" aria-label="Mesa">
              ${renderIcon('room', 20)}
              <span>Mesa</span>
            </button>
            <button type="button" class="rail-btn" data-action="documents" data-tip="Documentos" data-key="D" aria-label="Documentos">
              ${renderIcon('folder', 20)}
              <span>Documentos</span>
            </button>
            <button type="button" class="rail-btn" data-action="library" data-tip="Biblioteca" data-key="B" aria-label="Biblioteca">
              ${renderIcon('layers', 20)}
              <span>Biblioteca</span>
            </button>
            <button type="button" class="rail-btn" data-action="templates" data-tip="Modelos" data-key="M" aria-label="Modelos">
              ${renderIcon('frame', 20)}
              <span>Modelos</span>
            </button>
            <button type="button" class="rail-btn" data-action="reader" data-tip="Leitura" data-key="P" aria-label="Leitura">
              ${renderIcon('eye', 20)}
              <span>Leitura</span>
            </button>
            <button type="button" class="rail-btn" data-action="export" data-tip="Exportar" data-key="E" aria-label="Exportar">
              ${renderIcon('download', 20)}
              <span>Exportar</span>
            </button>
          </div>
        </div>

        <div class="rail-separator" role="separator"></div>

        <!-- Documentos recentes -->
        <div class="rail-recents" id="rail-recents" aria-label="Documentos recentes"></div>

        <div class="rail-separator" role="separator"></div>

        <div class="rail-bottom">
          <button type="button" class="rail-btn" data-action="settings" data-tip="Ajustes" data-key="," aria-label="Ajustes da mesa">
            ${renderIcon('gear', 20)}
            <span>Ajustes</span>
          </button>
          <button type="button" class="rail-btn" data-action="help" data-tip="Ajuda" data-key="?" aria-label="Ajuda">
            ${renderIcon('help', 20)}
            <span>Ajuda</span>
          </button>
        </div>
      </nav>

      <!-- Gaveta expansível -->
      <aside class="app-drawer" id="app-drawer" aria-hidden="true">
        <header class="drawer-header">
          <div class="drawer-title" id="drawer-title"></div>
          <button type="button" class="at-icon-btn drawer-close-btn" data-action="drawer-close" aria-label="Fechar gaveta">
            ${renderIcon('close', 16)}
          </button>
        </header>
        <div class="drawer-content" id="drawer-content"></div>
      </aside>

      <!-- Bancada de trabalho / Mesa -->
      <main class="app-main">
        <div class="at-desk" id="at-desk">
          <!-- Área de conteúdo / palco -->
          <div class="desk-stage" id="desk-stage">
            <div class="desk-empty-state">
              <div class="desk-illustration">
                ${emptyDeskIllustration()}
              </div>
              <h2 class="desk-empty-title">Nenhum documento aberto</h2>
              <p class="desk-empty-desc">Escolha um modelo ou crie uma folha em branco para começar a forjar.</p>
              <div class="desk-empty-actions">
                <button type="button" class="at-btn is-primary" data-action="open-templates">Ver modelos</button>
                <button type="button" class="at-btn" data-action="new-document">Folha em branco</button>
              </div>
            </div>
          </div>

          <!-- Rodapé discreto -->
          <footer class="desk-footer">
            <span class="desk-storage-badge" id="desk-storage-badge">
              ${renderIcon('doc', 13)}
              <span>Salvando neste navegador</span>
            </span>
            <span class="desk-status-message" id="desk-status-message"></span>
          </footer>
        </div>
      </main>

      <!-- Inspetor lateral -->
      <div class="app-inspector-backdrop" id="app-inspector-backdrop" aria-hidden="true"></div>
      <aside class="app-inspector" id="app-inspector">
        <header class="inspector-tabs" role="tablist">
          <button type="button" class="inspector-tab active" role="tab" aria-selected="true" data-tab="properties">
            Propriedades
          </button>
          <button type="button" class="inspector-tab" role="tab" aria-selected="false" data-tab="fill">
            Preencher
          </button>
          <button type="button" class="inspector-tab" role="tab" aria-selected="false" data-tab="layers">
            Camadas
          </button>
          <button type="button" class="inspector-tab" role="tab" aria-selected="false" data-tab="history">
            Histórico
          </button>
          <button type="button" class="at-icon-btn inspector-close-btn" data-action="inspector-close" aria-label="Fechar inspetor">
            ${renderIcon('close', 16)}
          </button>
        </header>
        <div class="inspector-content" id="inspector-content">
          <div class="inspector-empty">
            <p>Abra um documento para inspecionar e editar propriedades.</p>
          </div>
        </div>
      </aside>
    </div>
  `;

  const drawer = root.querySelector('#app-drawer');
  const drawerTitle = root.querySelector('#drawer-title');
  const drawerContent = root.querySelector('#drawer-content');
  const desk = root.querySelector('#at-desk');
  const railRecents = root.querySelector('#rail-recents');
  const inspector = root.querySelector('#app-inspector');
  const inspectorBackdrop = root.querySelector('#app-inspector-backdrop');
  const inspectorContent = root.querySelector('#inspector-content');

  let activeDrawer = null;
  let activeTab = 'properties';
  const drawerPanels = new Map();
  const inspectorPanels = new Map();
  const actionListeners = new Set();

  const openInspector = () => {
    inspector?.classList.add('open');
    inspectorBackdrop?.classList.add('visible');
    inspector?.setAttribute('aria-hidden', 'false');
    root.querySelector('.desk-inspector-toggle-btn')?.setAttribute('aria-expanded', 'true');
  };

  const closeInspector = () => {
    inspector?.classList.remove('open');
    inspectorBackdrop?.classList.remove('visible');
    inspector?.setAttribute('aria-hidden', 'true');
    root.querySelector('.desk-inspector-toggle-btn')?.setAttribute('aria-expanded', 'false');
  };

  const toggleInspector = () => {
    if (inspector?.classList.contains('open')) {
      closeInspector();
    } else {
      openInspector();
    }
  };

  inspectorBackdrop?.addEventListener('click', closeInspector);
  root.querySelector('[data-action="inspector-close"]')?.addEventListener('click', closeInspector);

  const notifyAction = (action, event) => {
    onAction?.(action, event);
    for (const listener of actionListeners) {
      try {
        listener(action, event);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const DRAWER_TITLES = {
    documents: 'DOCUMENTOS',
    library: 'BIBLIOTECA',
    templates: 'MODELOS',
    export: 'EXPORTAR',
    help: 'AJUDA',
  };

  const openDrawer = (name) => {
    if (!DRAWER_TITLES[name]) return;
    activeDrawer = name;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');

    drawerTitle.innerHTML = tape(DRAWER_TITLES[name]);
    drawerContent.innerHTML = '';

    const panel = drawerPanels.get(name);
    if (panel) {
      drawerContent.appendChild(typeof panel === 'function' ? panel() : panel);
    } else {
      drawerContent.innerHTML = `
        <div class="drawer-empty-state">
          <p>Nenhum item disponível em ${DRAWER_TITLES[name].toLowerCase()}.</p>
        </div>
      `;
    }

    // Highlight rail button
    root.querySelectorAll('.rail-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.action === name);
    });
  };

  const closeDrawer = () => {
    activeDrawer = null;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    root.querySelectorAll('.rail-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.action === 'desk');
    });
  };

  const toggleDrawer = (name) => {
    if (activeDrawer === name) {
      closeDrawer();
    } else {
      openDrawer(name);
    }
  };

  // Register default help panel
  drawerPanels.set('help', () => createHelpDrawer({
    shell: {
      drawer: {
        open: openDrawer,
        close: closeDrawer,
        toggle: toggleDrawer,
      },
    },
  }));

  // Rail click actions
  root.querySelector('.app-rail')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'desk') {
      closeDrawer();
      notifyAction('desk', e);
    } else if (['documents', 'library', 'templates', 'export', 'help'].includes(action)) {
      toggleDrawer(action);
      notifyAction(action, e);
    } else if (action === 'settings') {
      openSettingsModal();
      notifyAction('settings', e);
    } else {
      notifyAction(action, e);
    }
  });

  // Drawer close button
  root.querySelector('[data-action="drawer-close"]')?.addEventListener('click', closeDrawer);

  // Keyboard navigation and shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    if (document.body.classList.contains('is-reading')) return;

    if (e.key === 'Escape') {
      if (inspector?.classList.contains('open')) {
        e.preventDefault();
        closeInspector();
        return;
      }
      if (activeDrawer) {
        e.preventDefault();
        closeDrawer();
        return;
      }
    }

    const isEditing =
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
      document.activeElement?.isContentEditable;
    if (isEditing) return;

    if (matches(e, 'help')) {
      e.preventDefault();
      toggleDrawer('help');
      notifyAction('help', e);
      return;
    }

    if (matches(e, 'desk')) {
      e.preventDefault();
      closeDrawer();
      notifyAction('desk', e);
      return;
    }

    if (matches(e, 'documents')) {
      e.preventDefault();
      toggleDrawer('documents');
      notifyAction('documents', e);
      return;
    }

    if (matches(e, 'library')) {
      e.preventDefault();
      toggleDrawer('library');
      notifyAction('library', e);
      return;
    }

    if (matches(e, 'templates')) {
      e.preventDefault();
      toggleDrawer('templates');
      notifyAction('templates', e);
      return;
    }

    if (matches(e, 'settings')) {
      e.preventDefault();
      openSettingsModal();
      notifyAction('settings', e);
      return;
    }
  });

  // Empty state buttons on desk
  root.querySelector('[data-action="open-templates"]')?.addEventListener('click', () => {
    openDrawer('templates');
  });

  root.querySelector('[data-action="new-document"]')?.addEventListener('click', () => {
    notify('Criando folha em branco...', { tone: 'ok' });
    notifyAction('new-document');
  });

  // Inspector tab switching
  root.querySelectorAll('.inspector-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tabName = tabBtn.dataset.tab;
      activeTab = tabName;
      root.querySelectorAll('.inspector-tab').forEach(b => {
        const isCur = b.dataset.tab === tabName;
        b.classList.toggle('active', isCur);
        b.setAttribute('aria-selected', isCur ? 'true' : 'false');
      });
      const panel = inspectorPanels.get(tabName);
      if (panel) {
        inspectorContent.innerHTML = '';
        const panelEl = typeof panel === 'function' ? panel() : panel;
        panelEl.classList.remove('tab-crossfade');
        void panelEl.offsetWidth;
        panelEl.classList.add('tab-crossfade');
        inspectorContent.appendChild(panelEl);
      } else {
        inspectorContent.innerHTML = `
          <div class="inspector-empty">
            <p>Abra um documento para inspecionar ${tabBtn.textContent.trim().toLowerCase()}.</p>
          </div>
        `;
      }
    });
  });

  // Desk context menu
  desk.addEventListener('contextmenu', (e) => {
    // Only trigger if clicking on the desk background, empty state, or start screen background
    const isClickOnDeskBackground =
      e.target === desk ||
      e.target.closest('.desk-empty-state') ||
      e.target.classList.contains('welcome-overlay') ||
      (e.target.closest('.at-start-screen, .desk-start-wrapper') && !e.target.closest('.at-card, button, input, textarea, a, .welcome-note'));

    if (isClickOnDeskBackground) {
      e.preventDefault();
      contextMenu.open({
        x: e.clientX,
        y: e.clientY,
        items: [
          { label: 'Novo documento', icon: 'plus', run: () => notify('Novo documento iniciado.', { tone: 'ok' }) },
          { label: 'Abrir modelos', icon: 'frame', run: () => openDrawer('templates') },
          'separator',
          { label: 'Ajustes da mesa', icon: 'gear', run: () => openSettingsModal() },
        ]
      });
    }
  });

  // Register default shell actions in palette (Ctrl+K)
  palette.register((query) => [
    {
      id: 'action-desk',
      title: 'Mesa de trabalho',
      subtitle: 'Voltar à visualização principal da bancada',
      icon: 'room',
      key: '1',
      run: () => { closeDrawer(); notifyAction('desk'); }
    },
    {
      id: 'action-docs',
      title: 'Documentos',
      subtitle: 'Abrir gaveta de documentos e trabalhos',
      icon: 'folder',
      key: 'D',
      run: () => { openDrawer('documents'); notifyAction('documents'); }
    },
    {
      id: 'action-library',
      title: 'Biblioteca',
      subtitle: 'Explorar papéis, texturas e carimbos',
      icon: 'layers',
      key: 'B',
      run: () => { openDrawer('library'); notifyAction('library'); }
    },
    {
      id: 'action-templates',
      title: 'Modelos',
      subtitle: 'Catálogo de modelos prontos para preencher',
      icon: 'frame',
      key: 'M',
      run: () => { openDrawer('templates'); notifyAction('templates'); }
    },
    {
      id: 'action-settings',
      title: 'Ajustes da mesa',
      subtitle: 'Alterar superfície de trabalho e iluminação',
      icon: 'gear',
      key: ',',
      run: () => { openSettingsModal(); notifyAction('settings'); }
    },
    {
      id: 'action-help',
      title: 'Ajuda',
      subtitle: 'Guia de uso e comandos rápidos',
      icon: 'help',
      key: '?',
      run: () => { openDrawer('help'); notifyAction('help'); }
    },
  ]);

  return {
    desk,
    inspector: {
      open: openInspector,
      close: closeInspector,
      toggle: toggleInspector,
      isOpen: () => inspector?.classList.contains('open') || false,
      tab(name, elementOrRenderer) {
        if (elementOrRenderer !== undefined) {
          inspectorPanels.set(name, elementOrRenderer);
          if (activeTab === name) {
            inspectorContent.innerHTML = '';
            inspectorContent.appendChild(typeof elementOrRenderer === 'function' ? elementOrRenderer() : elementOrRenderer);
          }
        }
        const btn = root.querySelector(`.inspector-tab[data-tab="${name}"]`);
        btn?.click();
      },
      panel(name, elementOrRenderer) {
        inspectorPanels.set(name, elementOrRenderer);
        if (activeTab === name) {
          inspectorContent.innerHTML = '';
          inspectorContent.appendChild(typeof elementOrRenderer === 'function' ? elementOrRenderer() : elementOrRenderer);
        }
      }
    },
    drawer: {
      open: openDrawer,
      close: closeDrawer,
      toggle: toggleDrawer,
      isOpen: () => activeDrawer !== null,
      current: () => activeDrawer,
      panel(name, elementOrRenderer) {
        drawerPanels.set(name, elementOrRenderer);
        if (activeDrawer === name) {
          openDrawer(name);
        }
      }
    },
    rail: {
      setRecent(items = []) {
        if (!railRecents) return;
        railRecents.innerHTML = items.slice(0, 5).map(item => `
          <button type="button" class="rail-recent-item" data-id="${esc(item.id)}" data-tip="${esc(item.name)}" aria-label="${esc(item.name)}">
            ${item.preview ? `<img src="${esc(item.preview)}" alt="${esc(item.name)}" />` : renderIcon('doc', 14)}
          </button>
        `).join('');
      },
      setActive(name) {
        root.querySelectorAll('.rail-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.action === name);
        });
      }
    },
    notify,
    onAction(listener) {
      actionListeners.add(listener);
      return () => actionListeners.delete(listener);
    },
    contextMenu,
    palette,
    settings: {
      open: openSettingsModal,
      get: getSettings,
    }
  };
}

