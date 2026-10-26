import { escapeHTML as esc, icon as renderIcon } from '../ui/icons.js';
import { normalizeText, matchesWords } from '../ui/palette.js';
import { tiltOf } from '../ui/primitives.js';
import { contextMenu } from '../ui/context-menu.js';
import {
  createFolder,
  renameFolder,
  moveFolder,
  removeFolder,
  folderPath,
} from '../domain/folders.js';
import { handoffRequest, deliveredMessage } from './handoff.js';
import { bakeHandout, summaryOf, deliveryOf, previewOf } from './bake.js';
import { openExchange, publish, unpublish, channel, removedMessage, savedMessage, readPublished } from '../data/exchange.js';
import { getSettings } from '../ui/settings.js';

export function formatRelativeTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'agora mesmo';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `há ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `há ${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`;
  return date.toLocaleDateString('pt-BR');
}

export function getPinnedIds() {
  try {
    return JSON.parse(localStorage.getItem('atelie-pinned') || '[]');
  } catch {
    return [];
  }
}

export function setPinnedIds(ids) {
  try {
    localStorage.setItem('atelie-pinned', JSON.stringify(ids.slice(0, 8)));
  } catch {}
}

export function getRecentIds() {
  try {
    return JSON.parse(localStorage.getItem('atelie-recents') || '[]');
  } catch {
    return [];
  }
}

export function recordRecent(id) {
  if (!id) return;
  try {
    const list = getRecentIds().filter(x => x !== id);
    list.unshift(id);
    localStorage.setItem('atelie-recents', JSON.stringify(list.slice(0, 10)));
  } catch {}
}

/**
 * Creates the Document Navigator Drawer UI.
 */
export function createNavigator(container, {
  api,
  shell,
  onOpenDocument,
  onCreateDocument,
  getCurrentHandoutId,
  handoff,
  images,
  fonts,
  onOpenReader,
  onOpenExport,
} = {}) {
  const activeHandoff = handoff !== undefined ? handoff : (typeof window !== 'undefined' ? handoffRequest(window.location, window.opener) : null);
  let searchQuery = '';
  let activeFilter = 'todos'; // 'todos' | 'favoritos' | 'recentes' | 'lixeira'
  let foldersData = { folders: [], revision: 1 };
  let handouts = [];
  let trashList = [];
  let collapsedFolders = new Set();
  let selectedIndex = -1;
  let flatItems = []; // For keyboard navigation

  async function loadData() {
    try {
      if (api.folders) {
        foldersData = await api.folders.list();
      }
      handouts = await api.handouts.list();
      if (activeFilter === 'lixeira') {
        trashList = await api.trash.list();
      }
    } catch (err) {
      console.warn('[atelie] Erro ao carregar dados do navegador:', err);
    }
  }

  function getFolderMap() {
    const map = new Map();
    for (const f of foldersData.folders || []) {
      map.set(f.id, f);
    }
    return map;
  }

  function filterHandouts() {
    const folderMap = getFolderMap();
    const pinned = getPinnedIds();
    const recents = getRecentIds();

    return handouts.filter(h => {
      // 1. Text search
      if (searchQuery) {
        const f = h.folder ? folderMap.get(h.folder) : null;
        const fPath = f ? folderPath(foldersData.folders, f.id).join(' ') : '';
        const target = `${h.name} ${h.category || ''} ${(h.tags || []).join(' ')} ${fPath}`;
        if (!matchesWords(target, searchQuery)) {
          return false;
        }
      }

      // 2. Chip filter
      if (activeFilter === 'favoritos') {
        return !!h.favorite;
      }
      if (activeFilter === 'recentes') {
        return recents.includes(h.id);
      }
      return true;
    });
  }

  async function saveFoldersList(newFolders) {
    try {
      foldersData = await api.folders.save(newFolders, foldersData.revision);
      render();
    } catch (err) {
      shell?.notify?.(`Erro ao atualizar pastas: ${err.message}`, { tone: 'error' });
      await loadData();
      render();
    }
  }

  function promptRenameFolder(folder) {
    const name = window.prompt('Novo nome da pasta:', folder.name);
    if (name && name.trim() && name.trim() !== folder.name) {
      const next = renameFolder(foldersData.folders, folder.id, name.trim());
      saveFoldersList(next);
    }
  }

  function promptNewSubfolder(parentId = null) {
    const name = window.prompt('Nome da nova pasta:');
    if (name && name.trim()) {
      const newF = createFolder(name.trim(), { parentId });
      const next = [...foldersData.folders, newF];
      saveFoldersList(next);
    }
  }

  function promptFolderColor(folder) {
    const color = window.prompt('Cor da pasta (#rrggbb ou vazio para padrão):', folder.color || '');
    if (color !== null) {
      const valid = !color.trim() ? null : color.trim();
      const next = foldersData.folders.map(f => f.id === folder.id ? { ...f, color: valid } : f);
      saveFoldersList(next);
    }
  }

  async function deleteFolder(folder) {
    if (!window.confirm(`Excluir a pasta "${folder.name}"? Os documentos serão movidos para a pasta anterior.`)) {
      return;
    }
    // Update handouts that belonged to this folder
    const targetParentId = folder.parentId;
    for (const h of handouts) {
      if (h.folder === folder.id) {
        try {
          const full = await api.handouts.read(h.id);
          full.folder = targetParentId;
          await api.handouts.save(full);
        } catch {}
      }
    }
    const next = removeFolder(foldersData.folders, folder.id);
    await saveFoldersList(next);
    await loadData();
    render();
  }

  async function moveDocToFolder(docId, folderId) {
    try {
      const full = await api.handouts.read(docId);
      full.folder = folderId;
      await api.handouts.save(full);
      await loadData();
      render();
    } catch (err) {
      shell?.notify?.(`Erro ao mover documento: ${err.message}`, { tone: 'error' });
    }
  }

  async function duplicateDocument(docId) {
    try {
      const full = await api.handouts.read(docId);
      const copy = structuredClone(full);
      copy.id = 'h-' + Math.random().toString(36).slice(2, 10);
      copy.name = `${copy.name} (cópia)`;
      copy.revision = 0;
      copy.createdAt = new Date().toISOString();
      copy.updatedAt = copy.createdAt;
      const created = await api.handouts.create(copy);
      shell?.notify?.('Documento duplicado', { tone: 'info' });
      await loadData();
      render();
      onOpenDocument?.(created.id);
    } catch (err) {
      shell?.notify?.(`Erro ao duplicar: ${err.message}`, { tone: 'error' });
    }
  }

  async function promptRenameDoc(h) {
    const name = window.prompt('Novo nome do documento:', h.name);
    if (name && name.trim() && name.trim() !== h.name) {
      try {
        const full = await api.handouts.read(h.id);
        full.name = name.trim();
        await api.handouts.save(full);
        await loadData();
        render();
      } catch (err) {
        shell?.notify?.(`Erro ao renomear: ${err.message}`, { tone: 'error' });
      }
    }
  }

  async function toggleFavorite(h) {
    try {
      const full = await api.handouts.read(h.id);
      full.favorite = !full.favorite;
      await api.handouts.save(full);
      await loadData();
      render();
    } catch (err) {
      shell?.notify?.(`Erro ao favoritar: ${err.message}`, { tone: 'error' });
    }
  }

  function togglePin(id) {
    let pinned = getPinnedIds();
    if (pinned.includes(id)) {
      pinned = pinned.filter(x => x !== id);
    } else {
      if (pinned.length >= 8) {
        shell?.notify?.('Limite de 8 documentos fixados atingido.', { tone: 'warn' });
        return;
      }
      pinned.push(id);
    }
    setPinnedIds(pinned);
    render();
  }

  async function deleteDocument(docId) {
    try {
      const doc = handouts.find(h => h.id === docId);
      await api.handouts.remove(docId);
      if (typeof indexedDB !== 'undefined') {
        try {
          const db = await openExchange();
          await unpublish(db, docId);
          const source = (typeof document !== 'undefined' && document.baseURI)
            ? new URL('.', document.baseURI).href
            : 'http://127.0.0.1:3011/';
          channel().postMessage(removedMessage(docId, source, doc?.revision || 0));
        } catch (exErr) {
          console.warn('[atelie] Erro ao despublicar troca:', exErr);
        }
      }
      shell?.notify?.('Documento movido para a lixeira.', {
        tone: 'info',
        duration: 5000,
        action: {
          label: 'Desfazer',
          run: () => {
            restoreTrash(docId);
          },
        },
      });
      await loadData();
      render();
    } catch (err) {
      shell?.notify?.(`Erro ao excluir: ${err.message}`, { tone: 'error' });
    }
  }

  async function restoreTrash(docId) {
    try {
      const restoredRes = await api.trash.restore(docId);
      const restored = restoredRes?.handout || await api.handouts.read(docId);
      if (typeof indexedDB !== 'undefined') {
        try {
          if (getSettings().shareWithTabletop !== false) {
            const bakes = await bakeHandout(restored, { images, fonts });
            const db = await openExchange();
            const source = (typeof document !== 'undefined' && document.baseURI)
              ? new URL('.', document.baseURI).href
              : 'http://127.0.0.1:3011/';
            const summary = summaryOf(restored, source);
            await publish(db, summary, bakes.preview, bakes);
            channel().postMessage(savedMessage(summary));
          }
        } catch (exErr) {
          console.warn('[atelie] Erro ao republicar troca:', exErr);
        }
      }
      shell?.notify?.('Documento restaurado.', { tone: 'info' });
      await loadData();
      render();
    } catch (err) {
      shell?.notify?.(`Erro ao restaurar: ${err.message}`, { tone: 'error' });
    }
  }

  async function purgeTrash(docId) {
    if (!window.confirm('Apagar este documento de vez? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      await api.trash.purge(docId);
      shell?.notify?.('Documento apagado permanentemente.', { tone: 'info' });
      await loadData();
      render();
    } catch (err) {
      shell?.notify?.(`Erro ao apagar: ${err.message}`, { tone: 'error' });
    }
  }

  function openDocContextMenu(e, h) {
    e.preventDefault();
    e.stopPropagation();
    const isPinned = getPinnedIds().includes(h.id);

    const folderMap = getFolderMap();
    const folderItems = foldersData.folders.map(f => ({
      label: `Mover para: ${folderPath(foldersData.folders, f.id).join(' / ')}`,
      icon: 'folder',
      run: () => moveDocToFolder(h.id, f.id),
    }));
    if (h.folder) {
      folderItems.unshift({
        label: 'Mover para Sem pasta',
        icon: 'folder',
        run: () => moveDocToFolder(h.id, null),
      });
    }

    const items = [
      { label: 'Abrir', icon: 'doc', run: () => onOpenDocument?.(h.id) },
      { label: 'Ler', icon: 'eye', key: 'P', run: () => onOpenReader?.(h.id) },
      { label: 'Exportar…', icon: 'download', key: 'E', run: () => onOpenExport?.(h.id) },
      { label: 'Abrir em nova aba', icon: 'eye', run: () => window.open(`?handout=${encodeURIComponent(h.id)}`, '_blank') },
      'separator',
      { label: 'Duplicar', icon: 'copy', run: () => duplicateDocument(h.id) },
      { label: 'Renomear', icon: 'edit', key: 'F2', run: () => promptRenameDoc(h) },
      { label: isPinned ? 'Desafixar' : 'Fixar no topo', icon: 'pin', run: () => togglePin(h.id) },
      { label: h.favorite ? 'Remover dos favoritos' : 'Favoritar', icon: 'star', run: () => toggleFavorite(h) },
      'separator',
      ...folderItems,
      'separator',
      { label: 'Excluir', icon: 'trash', danger: true, key: 'Del', run: () => deleteDocument(h.id) },
    ];

    contextMenu.open({ x: e.clientX, y: e.clientY, items });
  }

  function openFolderContextMenu(e, f) {
    e.preventDefault();
    e.stopPropagation();

    const items = [
      { label: 'Nova subpasta', icon: 'folder', run: () => promptNewSubfolder(f.id) },
      { label: 'Renomear pasta', icon: 'edit', key: 'F2', run: () => promptRenameFolder(f) },
      { label: 'Cor da pasta', icon: 'brush', run: () => promptFolderColor(f) },
      'separator',
      { label: 'Excluir pasta', icon: 'trash', danger: true, run: () => deleteFolder(f) },
    ];

    contextMenu.open({ x: e.clientX, y: e.clientY, items });
  }

  function renderDocRow(h, { isCurrent = false, isDraggable = true } = {}) {
    const tilt = tiltOf(h.id);
    const folderMap = getFolderMap();
    const folderObj = h.folder ? folderMap.get(h.folder) : null;
    const folderName = folderObj ? folderObj.name : '';
    const isPinned = getPinnedIds().includes(h.id);

    return `
      <div class="nav-doc-row doc-card-btn ${isCurrent ? 'is-current' : ''}"
           data-doc-id="${esc(h.id)}"
           data-id="${esc(h.id)}"
           tabindex="0"
           ${isDraggable ? 'draggable="true"' : ''}>
        <div class="nav-doc-card at-card" style="transform: rotate(${tilt}deg);" aria-hidden="true">
          ${
            h.preview
              ? `<img src="${esc(api.mode === 'browser' ? '' : `api/atelie/handouts/${h.id}/preview`)}" alt="" />`
              : renderIcon('doc', 16)
          }
          ${isCurrent ? `<span class="nav-doc-clip">${renderIcon('clip', 12)}</span>` : ''}
        </div>
        <div class="nav-doc-info">
          <div class="nav-doc-title-row">
            <span class="nav-doc-name">${esc(h.name)}</span>
            ${h.favorite ? `<span class="nav-doc-fav-badge" title="Favorito">${renderIcon('star', 12)}</span>` : ''}
          </div>
          <span class="nav-doc-meta">
            ${folderName ? `<span class="nav-doc-folder-tag">${esc(folderName)}</span> · ` : ''}
            ${formatRelativeTime(h.updatedAt)}
          </span>
          ${activeHandoff && activeHandoff.mode === 'pick' ? `
            <div style="margin-top: 6px;">
              <button type="button" class="at-btn is-primary nav-handoff-pick-btn" data-handoff-id="${esc(h.id)}" style="font-size: 11px; padding: 4px 8px; width: 100%;">Enviar ao Tabletop</button>
            </div>
          ` : ''}
        </div>
        <div class="nav-doc-actions">
          <button type="button" class="nav-doc-action-btn pin-btn ${isPinned ? 'is-pinned' : ''}" title="${isPinned ? 'Desafixar' : 'Fixar'}" data-action="pin">
            ${renderIcon('pin', 14)}
          </button>
          <button type="button" class="nav-doc-action-btn" title="Mais opções" data-action="menu">
            ${renderIcon('dots', 14)}
          </button>
        </div>
      </div>
    `;
  }

  function renderFolderTree(parentId = null, depth = 0) {
    const childFolders = (foldersData.folders || []).filter(f => f.parentId === parentId);
    if (!childFolders.length && parentId !== null) return '';

    return childFolders
      .map(folder => {
        const isCollapsed = collapsedFolders.has(folder.id);
        const folderDocs = handouts.filter(h => h.folder === folder.id);
        const colorStyle = folder.color ? `style="color: ${esc(folder.color)};"` : '';

        return `
          <div class="nav-folder-branch" data-folder-id="${esc(folder.id)}" style="--depth: ${depth};">
            <div class="nav-folder-header" draggable="true" data-folder-id="${esc(folder.id)}">
              <button type="button" class="nav-folder-toggle ${isCollapsed ? 'is-collapsed' : ''}" data-action="toggle-folder" aria-label="Expandir ou recolher">
                ${renderIcon('chevron', 14)}
              </button>
              <span class="nav-folder-icon" ${colorStyle}>
                ${renderIcon('folder', 16)}
              </span>
              <span class="nav-folder-name">${esc(folder.name)}</span>
              <span class="nav-folder-count">(${folderDocs.length})</span>
              <button type="button" class="nav-folder-menu-btn" data-action="folder-menu" title="Opções da pasta">
                ${renderIcon('dots', 14)}
              </button>
            </div>
            ${
              !isCollapsed
                ? `
              <div class="nav-folder-content">
                ${renderFolderTree(folder.id, depth + 1)}
                ${folderDocs.map(h => renderDocRow(h, { isCurrent: h.id === getCurrentHandoutId?.() })).join('')}
              </div>
            `
                : ''
            }
          </div>
        `;
      })
      .join('');
  }

  function render() {
    flatItems = [];
    const currentId = getCurrentHandoutId?.();
    const filteredDocs = filterHandouts();
    const pinnedIds = getPinnedIds();
    const pinnedDocs = pinnedIds
      .map(id => handouts.find(h => h.id === id))
      .filter(Boolean);

    const recentsIds = getRecentIds();
    const recentDocs = recentsIds
      .map(id => handouts.find(h => h.id === id))
      .filter(Boolean);

    const unassignedDocs = filteredDocs.filter(h => !h.folder);

    container.innerHTML = `
      <div class="docs-navigator">
        ${activeHandoff && activeHandoff.mode === 'pick' ? `
          <div class="at-handoff-banner" style="background: var(--at-accent, #704214); color: #fff; padding: 10px 14px; border-radius: 6px; margin: 12px 12px 0 12px; font-weight: 600; font-size: 13px;">
            O Tabletop pediu um documento
          </div>
        ` : ''}
        <!-- Top Toolbar -->
        <div class="nav-toolbar">
          <div class="nav-search-box">
            <span class="nav-search-icon">${renderIcon('search', 16)}</span>
            <input type="text"
                   class="at-input nav-search-input"
                   placeholder="Buscar documentos..."
                   value="${esc(searchQuery)}" />
            ${searchQuery ? `<button type="button" class="nav-search-clear" aria-label="Limpar">${renderIcon('close', 14)}</button>` : ''}
          </div>

          <div class="nav-filter-chips" role="tablist">
            <button type="button" class="nav-chip ${activeFilter === 'todos' ? 'is-active' : ''}" data-filter="todos">
              Todos
            </button>
            <button type="button" class="nav-chip ${activeFilter === 'favoritos' ? 'is-active' : ''}" data-filter="favoritos">
              Favoritos
            </button>
            <button type="button" class="nav-chip ${activeFilter === 'recentes' ? 'is-active' : ''}" data-filter="recentes">
              Recentes
            </button>
            <button type="button" class="nav-chip ${activeFilter === 'lixeira' ? 'is-active' : ''}" data-filter="lixeira">
              Lixeira
            </button>
          </div>

          <div class="nav-actions-bar">
            <button type="button" class="at-btn is-primary nav-new-doc-btn">
              ${renderIcon('plus', 14)}
              <span>Novo Documento</span>
            </button>
            <button type="button" class="at-btn nav-new-folder-btn" title="Nova Pasta">
              ${renderIcon('folder', 14)}
              <span>Nova Pasta</span>
            </button>
          </div>
        </div>

        <!-- Body Content -->
        <div class="nav-body" role="tree" tabindex="0">
          ${
            activeFilter === 'lixeira'
              ? `
            <div class="nav-trash-view">
              <div class="nav-trash-header">
                <span class="nav-section-title">Itens na Lixeira (${trashList.length})</span>
              </div>
              ${
                trashList.length === 0
                  ? '<p class="nav-empty-hint">A lixeira está vazia.</p>'
                  : `
                <div class="nav-trash-list">
                  ${trashList
                    .map(item => `
                    <div class="nav-trash-row" data-trash-id="${esc(item.id)}">
                      <div class="nav-trash-info">
                        <span class="nav-trash-name">${esc(item.name)}</span>
                        <span class="nav-trash-meta">Excluído ${formatRelativeTime(item.deletedAt)}</span>
                      </div>
                      <div class="nav-trash-actions">
                        <button type="button" class="at-btn is-sm trash-restore-btn" data-action="restore">Restaurar</button>
                        <button type="button" class="at-btn is-sm is-danger trash-purge-btn" data-action="purge">Apagar de vez</button>
                      </div>
                    </div>
                  `)
                    .join('')}
                </div>
              `
              }
            </div>
          `
              : `
            <!-- Fixados Section -->
            ${
              !searchQuery && activeFilter === 'todos' && pinnedDocs.length > 0
                ? `
              <div class="nav-section nav-pinned-section">
                <div class="nav-section-header">
                  <span class="nav-section-title">${renderIcon('pin', 14)} Fixados</span>
                  <span class="nav-section-badge">${pinnedDocs.length}/8</span>
                </div>
                <div class="nav-pinned-list">
                  ${pinnedDocs.map(h => renderDocRow(h, { isCurrent: h.id === currentId })).join('')}
                </div>
              </div>
            `
                : ''
            }

            <!-- Recentes Section (when on Recentes filter or empty query) -->
            ${
              activeFilter === 'recentes'
                ? `
              <div class="nav-section">
                <div class="nav-section-header">
                  <span class="nav-section-title">Recentes</span>
                </div>
                <div class="nav-doc-list">
                  ${
                    recentDocs.length === 0
                      ? '<p class="nav-empty-hint">Nenhum documento recente.</p>'
                      : recentDocs.map(h => renderDocRow(h, { isCurrent: h.id === currentId })).join('')
                  }
                </div>
              </div>
            `
                : ''
            }

            <!-- Pastas Section -->
            ${
              activeFilter === 'todos'
                ? `
              <div class="nav-section">
                <div class="nav-section-header">
                  <span class="nav-section-title">Pastas</span>
                </div>
                <div class="nav-folders-tree">
                  ${renderFolderTree(null, 0)}
                </div>
              </div>

              <!-- Sem pasta Section -->
              <div class="nav-section">
                <div class="nav-section-header">
                  <span class="nav-section-title">Sem pasta</span>
                  <span class="nav-section-badge">(${unassignedDocs.length})</span>
                </div>
                <div class="nav-doc-list nav-unassigned-list" data-folder-target="root">
                  ${
                    unassignedDocs.length === 0
                      ? '<p class="nav-empty-hint">Nenhum documento sem pasta.</p>'
                      : unassignedDocs.map(h => renderDocRow(h, { isCurrent: h.id === currentId })).join('')
                  }
                </div>
              </div>
            `
                : ''
            }

            <!-- Favoritos Section -->
            ${
              activeFilter === 'favoritos'
                ? `
              <div class="nav-section">
                <div class="nav-section-header">
                  <span class="nav-section-title">${renderIcon('star', 14)} Favoritos</span>
                </div>
                <div class="nav-doc-list">
                  ${
                    filteredDocs.length === 0
                      ? '<p class="nav-empty-hint">Nenhum documento favorito.</p>'
                      : filteredDocs.map(h => renderDocRow(h, { isCurrent: h.id === currentId })).join('')
                  }
                </div>
              </div>
            `
                : ''
            }
          `
          }
        </div>
      </div>
    `;

    // Connect Search Events
    const searchInput = container.querySelector('.nav-search-input');
    searchInput?.addEventListener('input', e => {
      searchQuery = e.target.value;
      render();
    });

    const searchClear = container.querySelector('.nav-search-clear');
    searchClear?.addEventListener('click', () => {
      searchQuery = '';
      render();
    });

    // Filter Chips
    container.querySelectorAll('.nav-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        activeFilter = chip.dataset.filter;
        await loadData();
        render();
      });
    });

    // Top Action Buttons
    container.querySelector('.nav-new-doc-btn')?.addEventListener('click', () => {
      onCreateDocument?.();
    });

    container.querySelector('.nav-new-folder-btn')?.addEventListener('click', () => {
      promptNewSubfolder(null);
    });

    // Folder collapse toggles
    container.querySelectorAll('[data-action="toggle-folder"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const branch = btn.closest('.nav-folder-branch');
        const fId = branch.dataset.folderId;
        if (collapsedFolders.has(fId)) {
          collapsedFolders.delete(fId);
        } else {
          collapsedFolders.add(fId);
        }
        render();
      });
    });

    // Folder context menu buttons
    container.querySelectorAll('[data-action="folder-menu"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const branch = btn.closest('.nav-folder-branch');
        const f = foldersData.folders.find(x => x.id === branch.dataset.folderId);
        if (f) openFolderContextMenu(e, f);
      });
    });

    // Folder right click
    container.querySelectorAll('.nav-folder-header').forEach(header => {
      header.addEventListener('contextmenu', e => {
        const f = foldersData.folders.find(x => x.id === header.dataset.folderId);
        if (f) openFolderContextMenu(e, f);
      });
    });

    // Document click to open
    container.querySelectorAll('.nav-doc-row').forEach(row => {
      const docId = row.dataset.docId;
      const h = handouts.find(x => x.id === docId);

      row.addEventListener('click', e => {
        if (e.target.closest('.nav-doc-action-btn')) return;
        recordRecent(docId);
        onOpenDocument?.(docId);
      });

      row.addEventListener('contextmenu', e => {
        if (h) openDocContextMenu(e, h);
      });

      // Pin button
      row.querySelector('[data-action="pin"]')?.addEventListener('click', e => {
        e.stopPropagation();
        togglePin(docId);
      });

      // Options button
      row.querySelector('[data-action="menu"]')?.addEventListener('click', e => {
        e.stopPropagation();
        if (h) openDocContextMenu(e, h);
      });
    });

    // Trash actions
    container.querySelectorAll('.nav-trash-row').forEach(row => {
      const id = row.dataset.trashId;
      row.querySelector('.trash-restore-btn')?.addEventListener('click', () => restoreTrash(id));
      row.querySelector('.trash-purge-btn')?.addEventListener('click', () => purgeTrash(id));
    });

    // Handoff pick actions
    container.querySelectorAll('.nav-handoff-pick-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        e.preventDefault();
        const id = btn.getAttribute('data-handoff-id');
        btn.disabled = true;
        btn.textContent = 'Enviando…';
        try {
          const doc = await api.handouts.read(id);

          // Reuse what the exchange database already holds for this revision; bake only when it does not.
          let bakes = null;
          let previewBlob = null;
          if (typeof indexedDB !== 'undefined') {
            try {
              const published = await readPublished(await openExchange(), doc.id, doc.revision, { hasUv: doc.layers.some(l => l.visible && l.light === 'uv') });
              if (published) ({ bakes, preview: previewBlob } = published);
            } catch (pubErr) {
              console.warn('[atelie] Troca indisponível no pick:', pubErr);
            }
          }
          if (!bakes) {
            bakes = await bakeHandout(doc, { images, fonts });
            previewBlob = bakes.preview;
          }
          if (!previewBlob) {
            try {
              previewBlob = await previewOf(doc, { images, fonts });
            } catch (pErr) {
              console.warn('[atelie] Erro na prévia do pick:', pErr);
            }
          }

          const source = (typeof document !== 'undefined' && document.baseURI)
            ? new URL('.', document.baseURI).href
            : 'http://127.0.0.1:3011/';

          const delivery = deliveryOf(doc, { preview: previewBlob, bakes, source });
          window.opener.postMessage(deliveredMessage(activeHandoff.nonce, delivery), activeHandoff.from);
          btn.textContent = 'Enviado';
          setTimeout(() => {
            window.close();
          }, 1000);
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Enviar ao Tabletop';
          shell?.notify?.(`Erro ao enviar ao Tabletop: ${err.message}`, { tone: 'error' });
        }
      });
    });

    // --- Drag and Drop ---
    setupDragAndDrop();
  }

  function setupDragAndDrop() {
    // 1. Drag document
    container.querySelectorAll('.nav-doc-row').forEach(row => {
      row.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/atelie-doc-id', row.dataset.docId);
        e.dataTransfer.effectAllowed = 'move';
        row.classList.add('is-dragging');
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('is-dragging');
      });
    });

    // 2. Drag folder
    container.querySelectorAll('.nav-folder-header').forEach(header => {
      header.addEventListener('dragstart', e => {
        e.stopPropagation();
        e.dataTransfer.setData('text/atelie-folder-id', header.dataset.folderId);
        e.dataTransfer.effectAllowed = 'move';
        header.classList.add('is-dragging');
      });
      header.addEventListener('dragend', () => {
        header.classList.remove('is-dragging');
      });
    });

    // 3. Drop targets: folders
    container.querySelectorAll('.nav-folder-header').forEach(header => {
      const targetFolderId = header.dataset.folderId;

      header.addEventListener('dragover', e => {
        e.preventDefault();
        e.stopPropagation();
        header.classList.add('is-drag-over');
      });

      header.addEventListener('dragleave', () => {
        header.classList.remove('is-drag-over');
      });

      header.addEventListener('drop', async e => {
        e.preventDefault();
        e.stopPropagation();
        header.classList.remove('is-drag-over');

        const docId = e.dataTransfer.getData('text/atelie-doc-id');
        const sourceFolderId = e.dataTransfer.getData('text/atelie-folder-id');

        if (docId) {
          await moveDocToFolder(docId, targetFolderId);
        } else if (sourceFolderId && sourceFolderId !== targetFolderId) {
          try {
            const next = moveFolder(foldersData.folders, sourceFolderId, targetFolderId);
            await saveFoldersList(next);
          } catch (err) {
            shell?.notify?.(`Não foi possível mover pasta: ${err.message}`, { tone: 'error' });
          }
        }
      });
    });

    // 4. Drop target: Sem pasta
    const rootTarget = container.querySelector('.nav-unassigned-list');
    if (rootTarget) {
      rootTarget.addEventListener('dragover', e => {
        e.preventDefault();
        rootTarget.classList.add('is-drag-over');
      });
      rootTarget.addEventListener('dragleave', () => {
        rootTarget.classList.remove('is-drag-over');
      });
      rootTarget.addEventListener('drop', async e => {
        e.preventDefault();
        rootTarget.classList.remove('is-drag-over');
        const docId = e.dataTransfer.getData('text/atelie-doc-id');
        if (docId) {
          await moveDocToFolder(docId, null);
        }
      });
    }
  }

  // Keyboard navigation on body
  container.addEventListener('keydown', e => {
    const rows = Array.from(container.querySelectorAll('.nav-doc-row'));
    if (!rows.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(rows.length - 1, selectedIndex + 1);
      rows[selectedIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(0, selectedIndex - 1);
      rows[selectedIndex]?.focus();
    } else if (e.key === 'Enter') {
      const active = document.activeElement?.closest('.nav-doc-row');
      if (active) {
        e.preventDefault();
        const docId = active.dataset.docId;
        recordRecent(docId);
        onOpenDocument?.(docId);
      }
    } else if (e.key === 'F2') {
      const active = document.activeElement?.closest('.nav-doc-row');
      if (active) {
        e.preventDefault();
        const h = handouts.find(x => x.id === active.dataset.docId);
        if (h) promptRenameDoc(h);
      }
    } else if (e.key === 'Delete') {
      const active = document.activeElement?.closest('.nav-doc-row');
      if (active) {
        e.preventDefault();
        deleteDocument(active.dataset.docId);
      }
    }
  });

  // Initial load
  loadData().then(() => render());

  return {
    render: async () => {
      await loadData();
      render();
    },
    filterTrash: async () => {
      activeFilter = 'lixeira';
      await loadData();
      render();
    },
    openFolder: async (folderId) => {
      activeFilter = 'todos';
      collapsedFolders.delete(folderId);
      await loadData();
      render();
    },
    promptNewFolder: () => promptNewSubfolder(null),
    destroy() {
      container.innerHTML = '';
    },
  };
}
