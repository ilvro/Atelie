import { renderIcon, escapeHTML as esc } from '../ui/icons.js';
import {
  textLayer,
  imageLayer,
  shapeLayer,
  adjustLayer,
  effectLayer,
  canvasOperation,
  addLayer,
  insertionIndex,
  moveLayer,
  duplicateLayer,
  removeLayer,
  updateLayer,
} from '../domain/handouts.js';
import { EFFECTS, drawEffect, drawCutMask } from '../render/handout-effects.js';
import { play } from '../ui/sound.js';
import { thumbKey } from './layer-thumbs.js';
import { emptyStateIllustration } from '../ui/illustrations.js';

const thumbnailCache = new Map();

export const LAYER_COLOR_MAP = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#10b981',
  blue: '#3b82f6',
  purple: '#a855f7',
  gray: '#6b7280',
};

export const LAYER_COLOR_NAMES = {
  none: 'Sem etiqueta',
  red: 'Vermelho',
  orange: 'Laranja',
  yellow: 'Amarelo',
  green: 'Verde',
  blue: 'Azul',
  purple: 'Roxo',
  gray: 'Cinza',
};

function getLayerColor(layer) {
  if (layer.color && LAYER_COLOR_MAP[layer.color]) {
    return LAYER_COLOR_MAP[layer.color];
  }
  switch (layer.kind) {
    case 'text':
      return '#3b82f6';
    case 'image':
      return '#10b981';
    case 'shape':
      return '#eab308';
    case 'adjust':
      return '#a855f7';
    case 'effect':
      return '#f97316';
    default:
      return '#71717a';
  }
}

function getLayerHierarchy(layer) {
  let rawGroup = layer.group || '';
  let rawName = layer.name || 'Camada';

  if (!rawGroup && rawName.includes(' · ')) {
    const parts = rawName.split(' · ').map(s => s.trim());
    rawGroup = parts[0];
  }

  // Top-level folder name (e.g. 'Textos', 'Imagens', 'Fundo', 'Desgaste')
  const mainGroup = rawGroup ? rawGroup.split(' · ')[0].trim() : null;

  // Strip mainGroup prefix from rawName if present
  let cleanName = rawName;
  if (mainGroup && cleanName.startsWith(mainGroup + ' · ')) {
    cleanName = cleanName.slice(mainGroup.length + 3).trim();
  }

  const parts = cleanName.split(' · ').map(s => s.trim());
  const leafName = parts[parts.length - 1] || cleanName;
  const subgroup = parts.length > 1 ? parts.slice(0, -1).join(' · ') : null;

  return {
    group: mainGroup,
    subgroup,
    leafName,
  };
}

function getTextSnippet(layer) {
  if (layer.kind !== 'text' || !layer.text?.content) return '';
  const clean = String(layer.text.content).replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > 30 ? clean.slice(0, 30) + '…' : clean;
}

function getEffectThumbnail(typeKey, defaultParams, defaultBlend) {
  if (thumbnailCache.has(typeKey)) return thumbnailCache.get(typeKey);
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f2ede0';
    ctx.fillRect(0, 0, 64, 64);

    if (typeKey === 'burn' || typeKey === 'tear') {
      const cutCanvas = document.createElement('canvas');
      cutCanvas.width = 64;
      cutCanvas.height = 64;
      const cutCtx = cutCanvas.getContext('2d');
      drawCutMask(cutCtx, 64, 64, { type: typeKey, seed: 1, amount: 0.75, params: defaultParams }, 0.25);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(cutCanvas, 0, 0);
      ctx.restore();
    }

    const effCanvas = document.createElement('canvas');
    effCanvas.width = 64;
    effCanvas.height = 64;
    const effCtx = effCanvas.getContext('2d');
    drawEffect(effCtx, 64, 64, { type: typeKey, seed: 1, amount: 0.75, params: defaultParams }, 0.25);

    ctx.save();
    ctx.globalCompositeOperation = canvasOperation(defaultBlend);
    ctx.drawImage(effCanvas, 0, 0);
    ctx.restore();

    const url = canvas.toDataURL();
    thumbnailCache.set(typeKey, url);
    return url;
  } catch {
    return '';
  }
}

export function createLayersPanel(container, { state, onAction = () => {}, getLight = () => 'normal', getTextStyle = () => null, getThumbs = () => null, shell } = {}) {
  let isPlusMenuOpen = false;
  let isEffectsMenuOpen = false;
  let activeFilter = 'all'; // 'all' | 'text' | 'image' | 'effect'
  let viewMode = 'grouped'; // 'grouped' | 'flat'
  const collapsedFolders = new Set();
  let colorPickerLayerId = null;
  let pendingFlashId = null;
  let lastScrolledSelection = null;

  function flash(layerId) {
    if (!layerId) return;
    const layer = state.handout?.layers?.find(l => l.id === layerId);
    if (layer) {
      const hierarchy = getLayerHierarchy(layer);
      if (hierarchy.group && collapsedFolders.has(hierarchy.group)) {
        collapsedFolders.delete(hierarchy.group);
      }
    }
    pendingFlashId = layerId;
    render();
  }

  function thumbKeyOf(layer) {
    return layer.kind === 'adjust' ? '' : thumbKey(layer);
  }

  /** The real thumbnail when it is ready; the kind icon shows underneath until then. */
  function thumbImg(layer) {
    const url = getThumbs()?.get(layer);
    return url ? `<img class="layer-thumb-img" src="${url}" alt="" />` : '';
  }

  /** A thumbnail finished drawing: fill every row that shows that look, without a full render. */
  function thumbReady(key, url) {
    if (!url) return;
    container.querySelectorAll('.layer-thumb').forEach(el => {
      if (el.dataset.thumbKey === key && !el.querySelector('.layer-thumb-img')) {
        el.insertAdjacentHTML('afterbegin', `<img class="layer-thumb-img" src="${url}" alt="" />`);
      }
    });
  }

  function renderLayerRow(layer, index, isGroupChild = false) {
    const selectedId = state.selection;
    const isSelected = layer.id === selectedId;
    const isFlashing = pendingFlashId === layer.id;
    const isLocked = Boolean(layer.locked);
    const isVisible = Boolean(layer.visible);
    const layerColor = getLayerColor(layer);
    const hierarchy = getLayerHierarchy(layer);
    const snippet = getTextSnippet(layer);
    const isColorMenuOpen = colorPickerLayerId === layer.id;

    return `
      <div class="layer-item ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''} ${isGroupChild ? 'is-child' : ''} ${isFlashing ? 'flash' : ''}"
           data-id="${esc(layer.id)}"
           data-index="${index}"
           style="--layer-color: ${layerColor};"
           draggable="true"
           role="option"
           aria-selected="${isSelected}">
        <button type="button" class="layer-btn-icon ${isVisible ? 'active' : 'muted'}" data-action="toggle-visible" title="${isVisible ? 'Ocultar camada' : 'Exibir camada'}" aria-label="Visibilidade">
          ${renderIcon(isVisible ? 'eye' : 'eye-off', 14)}
        </button>
        <button type="button" class="layer-btn-icon ${isLocked ? 'active' : 'muted'}" data-action="toggle-lock" title="${isLocked ? 'Destravar camada' : 'Travar camada'}" aria-label="Bloqueio">
          ${renderIcon(isLocked ? 'lock' : 'unlock', 14)}
        </button>

        <button type="button" class="layer-color-dot" data-action="toggle-color-picker" title="Etiqueta de cor (${esc(layer.color || 'padrão')})" style="background-color: ${layerColor};"></button>

        <div class="layer-thumb" aria-hidden="true" data-thumb-key="${esc(thumbKeyOf(layer))}" style="color: ${layerColor}; border-color: ${layerColor}44; background: ${layerColor}14;">
          ${thumbImg(layer)}${layer.kind === 'text' ? renderIcon('doc', 15) : layer.kind === 'image' ? renderIcon('image', 15) : layer.kind === 'shape' ? renderIcon('crop', 15) : layer.kind === 'effect' ? renderIcon('sparkles', 15) : renderIcon('sun', 15)}
        </div>

        <div class="layer-title-col">
          <div class="layer-main-row">
            <span class="layer-name" title="${esc(layer.name)}">${esc(hierarchy.leafName)}</span>
            ${hierarchy.subgroup ? `<span class="layer-subgroup-pill">${esc(hierarchy.subgroup)}</span>` : ''}
          </div>
          ${snippet ? `<span class="layer-snippet" title="${esc(layer.text.content)}">“${esc(snippet)}”</span>` : ''}
        </div>

        ${layer.light === 'uv' ? '<span class="layer-uv-badge is-uv">UV</span>' : layer.light === 'normal' ? '<span class="layer-uv-badge is-normal">sem UV</span>' : ''}

        <div class="layer-actions">
          <button type="button" class="layer-btn-action" data-action="move-up" title="Mover para cima" aria-label="Mover para cima">↑</button>
          <button type="button" class="layer-btn-action" data-action="move-down" title="Mover para baixo" aria-label="Mover para baixo">↓</button>
          <button type="button" class="layer-btn-action" data-action="duplicate" title="Duplicar camada" aria-label="Duplicar">⧉</button>
          <button type="button" class="layer-btn-action is-danger" data-action="remove" title="Excluir camada" aria-label="Excluir">🗑</button>
        </div>

        ${isColorMenuOpen ? `
          <div class="layer-color-popup" role="menu" aria-label="Escolher cor da camada">
            <button type="button" class="layer-color-swatch is-none" data-set-color="none" title="Sem etiqueta"></button>
            ${Object.keys(LAYER_COLOR_MAP).map(cKey => `
              <button type="button" class="layer-color-swatch ${layer.color === cKey ? 'active' : ''}" data-set-color="${cKey}" style="background-color: ${LAYER_COLOR_MAP[cKey]};" title="${LAYER_COLOR_NAMES[cKey]}"></button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  function render() {
    const handout = state.handout;
    const layers = handout.layers || [];

    // Filter counts
    const textCount = layers.filter(l => l.kind === 'text').length;
    const imgCount = layers.filter(l => l.kind === 'image').length;
    const effCount = layers.filter(l => l.kind === 'effect' || l.kind === 'adjust' || l.kind === 'shape').length;

    // Filter layers if active
    const indexedLayers = layers.map((layer, index) => ({ layer, index }));
    const filtered = indexedLayers.filter(({ layer }) => {
      if (activeFilter === 'text') return layer.kind === 'text';
      if (activeFilter === 'image') return layer.kind === 'image';
      if (activeFilter === 'effect') return layer.kind === 'effect' || layer.kind === 'adjust' || layer.kind === 'shape';
      return true;
    });

    // Reversed from top of stack to bottom of stack (Photoshop order)
    const reversed = [...filtered].reverse();

    // Grouping
    let listContent = '';

    if (viewMode === 'flat' || activeFilter !== 'all') {
      listContent = reversed.map(({ layer, index }) => renderLayerRow(layer, index, false)).join('');
    } else {
      // Group contiguous items or organize by group
      const sections = [];
      const groupMap = new Map();

      for (const item of reversed) {
        const { group } = getLayerHierarchy(item.layer);
        if (!group) {
          sections.push({ type: 'item', item });
        } else {
          let g = groupMap.get(group);
          if (!g) {
            g = { type: 'group', name: group, items: [] };
            groupMap.set(group, g);
            sections.push(g);
          }
          g.items.push(item);
        }
      }

      listContent = sections.map(sec => {
        if (sec.type === 'item') {
          return renderLayerRow(sec.item.layer, sec.item.index, false);
        }

        const isCollapsed = collapsedFolders.has(sec.name);
        const allVisible = sec.items.every(it => it.layer.visible);
        const allLocked = sec.items.every(it => it.layer.locked);

        return `
          <div class="layer-folder-card">
            <div class="layer-folder-header ${isCollapsed ? 'collapsed' : ''}" data-folder="${esc(sec.name)}">
              <button type="button" class="layer-folder-caret" data-action="toggle-folder" data-folder="${esc(sec.name)}" aria-label="Expandir ou recolher pasta">
                ${isCollapsed ? '▸' : '▾'}
              </button>
              <div class="layer-folder-icon" aria-hidden="true">${renderIcon('folder', 14)}</div>
              <span class="layer-folder-title">${esc(sec.name)}</span>
              <span class="layer-folder-badge">${sec.items.length}</span>
              <div class="layer-folder-actions">
                <button type="button" class="layer-btn-icon ${allVisible ? 'active' : 'muted'}" data-action="toggle-folder-visible" data-folder="${esc(sec.name)}" title="Alternar visibilidade do grupo" aria-label="Visibilidade do grupo">
                  ${renderIcon(allVisible ? 'eye' : 'eye-off', 13)}
                </button>
                <button type="button" class="layer-btn-icon ${allLocked ? 'active' : 'muted'}" data-action="toggle-folder-lock" data-folder="${esc(sec.name)}" title="Alternar trava do grupo" aria-label="Bloqueio do grupo">
                  ${renderIcon(allLocked ? 'lock' : 'unlock', 13)}
                </button>
              </div>
            </div>
            <div class="layer-folder-children ${isCollapsed ? 'collapsed' : ''}">
              ${sec.items.map(it => renderLayerRow(it.layer, it.index, true)).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    // FLIP animation: record initial positions
    const prevPositions = new Map();
    if (typeof container.querySelectorAll === 'function') {
      container.querySelectorAll('.layer-item[data-id]').forEach(el => {
        if (el.dataset?.id && typeof el.getBoundingClientRect === 'function') {
          prevPositions.set(el.dataset.id, el.getBoundingClientRect().top);
        }
      });
    }

    container.innerHTML = `
      <div class="layers-panel">
        <div class="layers-toolbar">
          <div class="layers-add-dropdown">
            <button type="button" class="at-btn layers-add-btn" data-action="toggle-add-menu" aria-expanded="${isPlusMenuOpen}">
              ${renderIcon('plus', 14)}
              <span>Adicionar Camada</span>
            </button>
            <div class="layers-add-menu ${isPlusMenuOpen ? 'open' : ''}" role="menu">
              ${isEffectsMenuOpen ? `
                <div class="effects-submenu-header">
                  <button type="button" class="at-btn is-sm effects-back-btn" data-action="back-effects-menu">‹ Voltar</button>
                  <span class="effects-submenu-title">Efeitos</span>
                </div>
                <div class="effects-submenu-list">
                  ${EFFECTS.map(([typeKey, effName, defaultBlend, defaultParams]) => {
                    const thumb = getEffectThumbnail(typeKey, defaultParams, defaultBlend);
                    return `
                      <button type="button" class="effect-menu-item" data-add-effect="${typeKey}" role="menuitem">
                        <img class="effect-thumb-64" src="${thumb}" width="64" height="64" alt="${esc(effName)}" />
                        <div class="effect-menu-item-text">
                          <span class="effect-menu-name">${esc(effName)}</span>
                          <span class="effect-menu-blend">${esc(defaultBlend)}</span>
                        </div>
                      </button>
                    `;
                  }).join('')}
                </div>
              ` : `
                <button type="button" class="layers-menu-item" data-add="text" role="menuitem">
                  ${renderIcon('doc', 14)}
                  <span>Texto</span>
                </button>
                <button type="button" class="layers-menu-item" data-add="image" role="menuitem">
                  ${renderIcon('image', 14)}
                  <span>Imagem</span>
                </button>
                <button type="button" class="layers-menu-item" data-add="rect" role="menuitem">
                  ${renderIcon('crop', 14)}
                  <span>Retângulo</span>
                </button>
                <button type="button" class="layers-menu-item" data-add="ellipse" role="menuitem">
                  ${renderIcon('brush', 14)}
                  <span>Elipse</span>
                </button>
                <button type="button" class="layers-menu-item" data-add="line" role="menuitem">
                  ${renderIcon('ruler', 14)}
                  <span>Linha</span>
                </button>
                <button type="button" class="layers-menu-item" data-add="adjust" role="menuitem">
                  ${renderIcon('sun', 14)}
                  <span>Ajuste de cor</span>
                </button>
                <button type="button" class="layers-menu-item layers-menu-effect-btn" data-action="open-effects-menu" role="menuitem">
                  ${renderIcon('sparkles', 14)}
                  <span>Efeito</span>
                  <span class="menu-arrow" style="margin-left:auto;">›</span>
                </button>
              `}
            </div>
          </div>
        </div>

        <div class="layers-filter-row">
          <div class="layers-filter-chips">
            <button type="button" class="layers-chip ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">Todas (${layers.length})</button>
            <button type="button" class="layers-chip ${activeFilter === 'text' ? 'active' : ''}" data-filter="text">Texto (${textCount})</button>
            <button type="button" class="layers-chip ${activeFilter === 'image' ? 'active' : ''}" data-filter="image">Imagem (${imgCount})</button>
            <button type="button" class="layers-chip ${activeFilter === 'effect' ? 'active' : ''}" data-filter="effect">Efeitos (${effCount})</button>
          </div>
          <button type="button" class="layers-view-btn ${viewMode === 'grouped' ? 'active' : ''}" data-action="toggle-view-mode" title="${viewMode === 'grouped' ? 'Ver lista plana' : 'Ver agrupado em pastas'}">
            ${renderIcon('folder', 13)}
            <span>${viewMode === 'grouped' ? 'Pastas' : 'Plano'}</span>
          </button>
        </div>

        <div class="layers-list" role="listbox" aria-label="Lista de camadas">
          ${listContent || '<div class="layers-empty-msg empty-state">' + emptyStateIllustration('layers') + '<p>Nenhuma camada correspondente.</p></div>'}
          ${activeFilter === 'all' && (state.handout?.layers || []).length <= 1 ? '<div class="layers-empty-msg empty-state is-hint">' + emptyStateIllustration('layers') + '<p>Só o papel por enquanto.</p><small>Arraste algo da Biblioteca ou use “+” para escrever, desenhar ou pôr um carimbo.</small></div>' : ''}
        </div>
      </div>
    `;

    // FLIP animation: invert and play
    if (prevPositions.size > 0 && typeof document !== 'undefined' && !document.body.classList.contains('reduce-motion')) {
      const rows = container.querySelectorAll('.layer-item[data-id]');
      const flips = [];
      rows.forEach(row => {
        const prevTop = prevPositions.get(row.dataset.id);
        if (prevTop === undefined || typeof row.getBoundingClientRect !== 'function') return;
        const currentTop = row.getBoundingClientRect().top;
        const deltaY = prevTop - currentTop;
        if (Math.abs(deltaY) > 1) {
          row.style.transform = `translateY(${deltaY}px)`;
          row.style.transition = 'none';
          flips.push(row);
        }
      });
      if (flips.length > 0) {
        requestAnimationFrame(() => {
          flips.forEach(row => {
            row.style.transition = 'transform var(--eco-fast) var(--eco-ease)';
            row.style.transform = '';
          });
        });
      }
    }

    if (pendingFlashId) {
      const flashId = pendingFlashId;
      pendingFlashId = null;
      lastScrolledSelection = flashId;
      requestAnimationFrame(() => {
        const row = container.querySelector(`.layer-item[data-id="${flashId}"]`);
        if (row) {
          row.scrollIntoView({ block: 'nearest' });
          setTimeout(() => {
            row.classList.remove('flash');
          }, 250);
        }
      });
    } else if (state?.selection && state.selection !== lastScrolledSelection) {
      lastScrolledSelection = state.selection;
      requestAnimationFrame(() => {
        const row = container.querySelector(`.layer-item[data-id="${state.selection}"]`);
        if (row) {
          row.scrollIntoView({ block: 'nearest' });
        }
      });
    } else if (!state?.selection) {
      lastScrolledSelection = null;
    }
  }

  // Event delegation
  container.addEventListener('click', event => {
    // 1. Color Swatch Click
    const colorBtn = event.target.closest('[data-set-color]');
    if (colorBtn) {
      event.stopPropagation();
      const colorVal = colorBtn.dataset.setColor;
      const row = colorBtn.closest('.layer-item');
      if (row) {
        const id = row.dataset.id;
        const next = updateLayer(state.handout, id, { color: colorVal === 'none' ? null : colorVal });
        state.edit(next, { label: 'Alterar cor da camada' });
      }
      colorPickerLayerId = null;
      render();
      return;
    }

    // 2. Toggle Color Picker Menu
    const colorToggle = event.target.closest('[data-action="toggle-color-picker"]');
    if (colorToggle) {
      event.stopPropagation();
      const row = colorToggle.closest('.layer-item');
      if (row) {
        const id = row.dataset.id;
        colorPickerLayerId = colorPickerLayerId === id ? null : id;
        render();
      }
      return;
    }

    // Close color picker if clicked outside
    if (colorPickerLayerId && !event.target.closest('.layer-color-popup')) {
      colorPickerLayerId = null;
      render();
    }

    // 3. Filter Chips
    const filterBtn = event.target.closest('[data-filter]');
    if (filterBtn) {
      activeFilter = filterBtn.dataset.filter;
      render();
      return;
    }

    // 4. Toggle View Mode (Pastas vs Plano)
    const viewBtn = event.target.closest('[data-action="toggle-view-mode"]');
    if (viewBtn) {
      viewMode = viewMode === 'grouped' ? 'flat' : 'grouped';
      render();
      return;
    }

    // 5. Folder Toggle Collapse
    const folderToggle = event.target.closest('[data-action="toggle-folder"]') || event.target.closest('.layer-folder-header');
    if (folderToggle && !event.target.closest('.layer-folder-actions')) {
      const folderName = folderToggle.dataset.folder;
      if (folderName) {
        if (collapsedFolders.has(folderName)) {
          collapsedFolders.delete(folderName);
        } else {
          collapsedFolders.add(folderName);
        }
        render();
        return;
      }
    }

    // 6. Folder Bulk Visibility
    const folderVisible = event.target.closest('[data-action="toggle-folder-visible"]');
    if (folderVisible) {
      event.stopPropagation();
      const folderName = folderVisible.dataset.folder;
      const handout = state.handout;
      const matching = handout.layers.filter(l => getLayerHierarchy(l).group === folderName);
      const allVis = matching.every(l => l.visible);
      let curHandout = handout;
      for (const l of matching) {
        curHandout = updateLayer(curHandout, l.id, { visible: !allVis });
      }
      state.edit(curHandout, { label: allVis ? `Ocultar ${folderName}` : `Exibir ${folderName}` });
      return;
    }

    // 7. Folder Bulk Lock
    const folderLock = event.target.closest('[data-action="toggle-folder-lock"]');
    if (folderLock) {
      event.stopPropagation();
      const folderName = folderLock.dataset.folder;
      const handout = state.handout;
      const matching = handout.layers.filter(l => getLayerHierarchy(l).group === folderName);
      const allLck = matching.every(l => l.locked);
      let curHandout = handout;
      for (const l of matching) {
        curHandout = updateLayer(curHandout, l.id, { locked: !allLck });
      }
      state.edit(curHandout, { label: allLck ? `Destravar ${folderName}` : `Travar ${folderName}` });
      return;
    }

    // 8. Add Menu Toggles
    const addToggle = event.target.closest('[data-action="toggle-add-menu"]');
    if (addToggle) {
      isPlusMenuOpen = !isPlusMenuOpen;
      if (!isPlusMenuOpen) isEffectsMenuOpen = false;
      render();
      return;
    }

    const openEffects = event.target.closest('[data-action="open-effects-menu"]');
    if (openEffects) {
      isEffectsMenuOpen = true;
      render();
      return;
    }

    const backEffects = event.target.closest('[data-action="back-effects-menu"]');
    if (backEffects) {
      isEffectsMenuOpen = false;
      render();
      return;
    }

    const addEffectItem = event.target.closest('[data-add-effect]');
    if (addEffectItem) {
      const typeKey = addEffectItem.dataset.addEffect;
      const entry = EFFECTS.find(([k]) => k === typeKey);
      if (entry) {
        const [, effName, initialBlend, defaultParams] = entry;
        const page = state.handout.page;
        const defaultLight = getLight() === 'uv' ? 'uv' : 'both';
        const newLayer = effectLayer({
          name: effName,
          x: 0,
          y: 0,
          width: page.width,
          height: page.height,
          blend: initialBlend,
          light: defaultLight,
          effect: {
            type: typeKey,
            seed: 1,
            amount: 0.5,
            params: { ...defaultParams },
          },
        });
        isPlusMenuOpen = false;
        isEffectsMenuOpen = false;

        const insertIndex = insertionIndex(state.handout, newLayer, { selectedId: state.selection });
        const next = addLayer(state.handout, newLayer, insertIndex);
        state.edit(next, { label: `Adicionar ${newLayer.name}` });
        state.select(newLayer.id);
        flash(newLayer.id);
        state.land?.(newLayer.id);
      }
      return;
    }

    const addItem = event.target.closest('[data-add]');
    if (addItem) {
      const type = addItem.dataset.add;
      isPlusMenuOpen = false;
      const handout = state.handout;
      const page = handout.page;
      const selectedId = state.selection;
      let newLayer = null;

      const cx = page.width / 2;
      const cy = page.height / 2;
      const defaultLight = getLight() === 'uv' ? 'uv' : 'both';

      if (type === 'text') {
        newLayer = textLayer({
          x: cx,
          y: cy,
          width: 600,
          height: 200,
          light: defaultLight,
          text: { content: 'Escreva aqui', ...(getTextStyle() || {}) },
        });
      } else if (type === 'image') {
        newLayer = imageLayer({
          x: cx,
          y: cy,
          width: 600,
          height: 400,
          light: defaultLight,
        });
      } else if (type === 'rect') {
        newLayer = shapeLayer({
          name: 'Retângulo',
          x: cx,
          y: cy,
          width: 400,
          height: 300,
          light: defaultLight,
          shape: { type: 'rect', fill: '#ffffff', stroke: null, strokeWidth: 0 },
        });
      } else if (type === 'ellipse') {
        newLayer = shapeLayer({
          name: 'Elipse',
          x: cx,
          y: cy,
          width: 300,
          height: 300,
          light: defaultLight,
          shape: { type: 'ellipse', fill: '#ffffff', stroke: null, strokeWidth: 0 },
        });
      } else if (type === 'line') {
        newLayer = shapeLayer({
          name: 'Linha',
          x: cx,
          y: cy,
          width: 400,
          height: 20,
          light: defaultLight,
          shape: { type: 'line', stroke: '#1d1b24', strokeWidth: 3 },
        });
      } else if (type === 'adjust') {
        newLayer = adjustLayer({
          name: 'Ajuste de Cor',
          x: cx,
          y: cy,
          width: page.width,
          height: page.height,
          light: defaultLight,
        });
      }

      if (newLayer) {
        isPlusMenuOpen = false;
        const insertIndex = insertionIndex(handout, newLayer, { selectedId });
        const next = addLayer(handout, newLayer, insertIndex);
        state.edit(next, { label: `Adicionar ${newLayer.name}` });
        state.select(newLayer.id);
        flash(newLayer.id);
        state.land?.(newLayer.id);
      }
      return;
    }

    const row = event.target.closest('.layer-item');
    if (!row) {
      if (isPlusMenuOpen && !event.target.closest('.layers-add-dropdown')) {
        isPlusMenuOpen = false;
        isEffectsMenuOpen = false;
        render();
      }
      return;
    }

    const id = row.dataset.id;
    const actionBtn = event.target.closest('[data-action]');

    if (actionBtn) {
      event.stopPropagation();
      state.select(id);
      const action = actionBtn.dataset.action;
      const handout = state.handout;
      const layer = handout.layers.find(l => l.id === id);
      if (!layer) return;

      if (action === 'toggle-visible') {
        const next = updateLayer(handout, id, { visible: !layer.visible });
        state.edit(next, { label: layer.visible ? 'Ocultar camada' : 'Exibir camada' });
      } else if (action === 'toggle-lock') {
        const next = updateLayer(handout, id, { locked: !layer.locked });
        state.edit(next, { label: layer.locked ? 'Destravar camada' : 'Travar camada' });
      } else if (action === 'move-up') {
        const idx = handout.layers.findIndex(l => l.id === id);
        if (idx < handout.layers.length - 1) {
          const next = moveLayer(handout, id, idx + 1);
          state.edit(next, { label: 'Mover camada' });
        }
      } else if (action === 'move-down') {
        const idx = handout.layers.findIndex(l => l.id === id);
        if (idx > 0) {
          const next = moveLayer(handout, id, idx - 1);
          state.edit(next, { label: 'Mover camada' });
        }
      } else if (action === 'duplicate') {
        const next = duplicateLayer(handout, id);
        state.edit(next, { label: 'Duplicar camada' });
        const duplicated = next.layers.find(l => !handout.layers.some(oldL => oldL.id === l.id));
        if (duplicated) {
          state.select(duplicated.id);
          flash(duplicated.id);
          state.land?.(duplicated.id);
        }
      } else if (action === 'remove') {
        play('delete');
        const next = removeLayer(handout, id);
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
      return;
    }

    // Clicking row selects the layer
    state.select(id);
  });

  // Double click layer name to rename inline
  container.addEventListener('dblclick', event => {
    const nameEl = event.target.closest('.layer-name');
    if (!nameEl) return;
    const row = nameEl.closest('.layer-item');
    if (!row) return;
    const id = row.dataset.id;
    const layer = state.handout.layers.find(l => l.id === id);
    if (!layer || layer.locked) return;

    const currentName = layer.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'layer-name-inline-input';
    input.value = currentName;
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const commitRename = () => {
      const val = input.value.trim() || currentName;
      if (val !== currentName) {
        const next = updateLayer(state.handout, id, { name: val });
        state.edit(next, { label: 'Renomear camada' });
      } else {
        render();
      }
    };

    input.addEventListener('blur', commitRename);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = currentName;
        input.blur();
      }
    });
  });

  // Drag and drop reordering
  let draggedId = null;
  container.addEventListener('dragstart', event => {
    const row = event.target.closest('.layer-item');
    if (!row) return;
    draggedId = row.dataset.id;
    event.dataTransfer.effectAllowed = 'move';
    row.classList.add('dragging');
  });

  container.addEventListener('dragend', event => {
    const row = event.target.closest('.layer-item');
    if (row) row.classList.remove('dragging');
    draggedId = null;
  });

  container.addEventListener('dragover', event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });

  container.addEventListener('drop', event => {
    event.preventDefault();
    const row = event.target.closest('.layer-item');
    if (!row || !draggedId || row.dataset.id === draggedId) return;

    const targetId = row.dataset.id;
    const layers = state.handout.layers;
    const targetIdx = layers.findIndex(l => l.id === targetId);

    if (targetIdx >= 0) {
      const next = moveLayer(state.handout, draggedId, targetIdx);
      state.edit(next, { label: 'Reordenar camadas' });
    }
  });

  render();

  return {
    render,
    flash,
    thumbReady,
    destroy() {
      container.innerHTML = '';
    },
  };
}
