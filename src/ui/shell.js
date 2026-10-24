import { escapeHTML as esc, icon as renderIcon } from './icons.js';
import { tape, card } from './primitives.js';
import { emptyDeskIllustration } from './illustrations.js';
import { notify } from './notify.js';
import { contextMenu } from './context-menu.js';
import { palette } from './palette.js';
import { openSettingsModal, applySettings, getSettings } from './settings.js';

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
            <button type="button" class="rail-btn" data-action="reader" data-tip="Leitura" data-key="L" aria-label="Leitura">
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
  const inspectorContent = root.querySelector('#inspector-content');

  let activeDrawer = null;
  let activeTab = 'properties';
  const drawerPanels = new Map();
  const inspectorPanels = new Map();

  const DRAWER_TITLES = {
    documents: 'DOCUMENTOS',
    library: 'BIBLIOTECA',
    templates: 'MODELOS',
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

  // Rail click actions
  root.querySelector('.app-rail')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'desk') {
      closeDrawer();
      onAction?.('desk');
    } else if (['documents', 'library', 'templates'].includes(action)) {
      toggleDrawer(action);
      onAction?.(action);
    } else if (action === 'settings') {
      openSettingsModal();
      onAction?.('settings');
    } else if (action === 'help') {
      notify('Atalhos: Ctrl+K abre a paleta de comandos. Use o menu lateral para navegar.', { tone: 'info' });
      onAction?.('help');
    } else {
      onAction?.(action);
    }
  });

  // Drawer close button
  root.querySelector('[data-action="drawer-close"]')?.addEventListener('click', closeDrawer);

  // Keyboard shortcut: Escape closes drawer
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeDrawer) {
      closeDrawer();
    }
  });

  // Empty state buttons on desk
  root.querySelector('[data-action="open-templates"]')?.addEventListener('click', () => {
    openDrawer('templates');
  });

  root.querySelector('[data-action="new-document"]')?.addEventListener('click', () => {
    notify('Criando folha em branco...', { tone: 'ok' });
    onAction?.('new-document');
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
        inspectorContent.appendChild(typeof panel === 'function' ? panel() : panel);
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
    // Only trigger if clicking on the desk background or empty state
    if (e.target.closest('#desk-stage') || e.target === desk) {
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
      run: () => { closeDrawer(); onAction?.('desk'); }
    },
    {
      id: 'action-docs',
      title: 'Documentos',
      subtitle: 'Abrir gaveta de documentos e trabalhos',
      icon: 'folder',
      key: 'D',
      run: () => { openDrawer('documents'); onAction?.('documents'); }
    },
    {
      id: 'action-library',
      title: 'Biblioteca',
      subtitle: 'Explorar papéis, texturas e carimbos',
      icon: 'layers',
      key: 'B',
      run: () => { openDrawer('library'); onAction?.('library'); }
    },
    {
      id: 'action-templates',
      title: 'Modelos',
      subtitle: 'Catálogo de modelos prontos para preencher',
      icon: 'frame',
      key: 'M',
      run: () => { openDrawer('templates'); onAction?.('templates'); }
    },
    {
      id: 'action-settings',
      title: 'Ajustes da mesa',
      subtitle: 'Alterar superfície de trabalho e iluminação',
      icon: 'gear',
      key: ',',
      run: () => { openSettingsModal(); onAction?.('settings'); }
    },
    {
      id: 'action-help',
      title: 'Ajuda',
      subtitle: 'Guia de uso e comandos rápidos',
      icon: 'help',
      key: '?',
      run: () => { notify('Ateliê de documentos — bancada de falsificação de RPG', { tone: 'info' }); onAction?.('help'); }
    },
  ]);

  return {
    desk,
    inspector: {
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
    contextMenu,
    palette,
    settings: {
      open: openSettingsModal,
      get: getSettings,
    }
  };
}

