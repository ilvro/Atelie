import { renderIcon, escapeHTML as esc } from '../ui/icons.js';
import {
  textLayer,
  imageLayer,
  shapeLayer,
  adjustLayer,
  addLayer,
  moveLayer,
  duplicateLayer,
  removeLayer,
  updateLayer,
} from '../domain/handouts.js';

export function createLayersPanel(container, { state, onAction = () => {} } = {}) {
  let isPlusMenuOpen = false;

  function render() {
    const handout = state.handout;
    const selectedId = state.selection;
    const layers = handout.layers || [];

    // Layers are shown from top of stack to bottom of stack (Photoshop order)
    const reversed = layers.map((layer, index) => ({ layer, index })).reverse();

    container.innerHTML = `
      <div class="layers-panel">
        <div class="layers-toolbar">
          <div class="layers-add-dropdown">
            <button type="button" class="at-btn layers-add-btn" data-action="toggle-add-menu" aria-expanded="${isPlusMenuOpen}">
              ${renderIcon('plus', 14)}
              <span>Adicionar Camada</span>
            </button>
            <div class="layers-add-menu ${isPlusMenuOpen ? 'open' : ''}" role="menu">
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
            </div>
          </div>
        </div>

        <div class="layers-list" role="listbox" aria-label="Lista de camadas">
          ${reversed.map(({ layer, index }) => {
            const isSelected = layer.id === selectedId;
            const isLocked = Boolean(layer.locked);
            const isVisible = Boolean(layer.visible);

            return `
              <div class="layer-item ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}"
                   data-id="${esc(layer.id)}"
                   data-index="${index}"
                   draggable="true"
                   role="option"
                   aria-selected="${isSelected}">
                <button type="button" class="layer-btn-icon ${isVisible ? 'active' : 'muted'}" data-action="toggle-visible" title="${isVisible ? 'Ocultar camada' : 'Exibir camada'}" aria-label="Visibilidade">
                  ${renderIcon(isVisible ? 'eye' : 'eye-off', 14)}
                </button>
                <button type="button" class="layer-btn-icon ${isLocked ? 'active' : 'muted'}" data-action="toggle-lock" title="${isLocked ? 'Destravar camada' : 'Travar camada'}" aria-label="Bloqueio">
                  ${renderIcon(isLocked ? 'lock' : 'unlock', 14)}
                </button>
                <div class="layer-thumb" aria-hidden="true">
                  ${layer.kind === 'text' ? renderIcon('doc', 16) : layer.kind === 'image' ? renderIcon('image', 16) : layer.kind === 'shape' ? renderIcon('crop', 16) : renderIcon('sun', 16)}
                </div>
                <span class="layer-name" title="${esc(layer.name)}">${esc(layer.name)}</span>
                <div class="layer-actions">
                  <button type="button" class="layer-btn-action" data-action="move-up" title="Mover para cima" aria-label="Mover para cima">↑</button>
                  <button type="button" class="layer-btn-action" data-action="move-down" title="Mover para baixo" aria-label="Mover para baixo">↓</button>
                  <button type="button" class="layer-btn-action" data-action="duplicate" title="Duplicar camada" aria-label="Duplicar">⧉</button>
                  <button type="button" class="layer-btn-action is-danger" data-action="remove" title="Excluir camada" aria-label="Excluir">🗑</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Event delegation
  container.addEventListener('click', event => {
    const addToggle = event.target.closest('[data-action="toggle-add-menu"]');
    if (addToggle) {
      isPlusMenuOpen = !isPlusMenuOpen;
      render();
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

      if (type === 'text') {
        newLayer = textLayer({
          x: cx,
          y: cy,
          width: 600,
          height: 200,
          text: { content: 'Escreva aqui' },
        });
      } else if (type === 'image') {
        newLayer = imageLayer({
          x: cx,
          y: cy,
          width: 600,
          height: 400,
        });
      } else if (type === 'rect') {
        newLayer = shapeLayer({
          name: 'Retângulo',
          x: cx,
          y: cy,
          width: 400,
          height: 300,
          shape: { type: 'rect', fill: '#ffffff', stroke: null, strokeWidth: 0 },
        });
      } else if (type === 'ellipse') {
        newLayer = shapeLayer({
          name: 'Elipse',
          x: cx,
          y: cy,
          width: 300,
          height: 300,
          shape: { type: 'ellipse', fill: '#ffffff', stroke: null, strokeWidth: 0 },
        });
      } else if (type === 'line') {
        newLayer = shapeLayer({
          name: 'Linha',
          x: cx,
          y: cy,
          width: 400,
          height: 20,
          shape: { type: 'line', stroke: '#1d1b24', strokeWidth: 3 },
        });
      } else if (type === 'adjust') {
        newLayer = adjustLayer({
          name: 'Ajuste de Cor',
          x: cx,
          y: cy,
          width: page.width,
          height: page.height,
        });
      }

      if (newLayer) {
        // Place above selected layer, or at top
        let insertIndex = handout.layers.length;
        if (selectedId) {
          const idx = handout.layers.findIndex(l => l.id === selectedId);
          if (idx >= 0) insertIndex = idx + 1;
        }

        const next = addLayer(handout, newLayer, insertIndex);
        state.edit(next, { label: `Adicionar ${newLayer.name}` });
        state.select(newLayer.id);
      }
      return;
    }

    const row = event.target.closest('.layer-item');
    if (!row) {
      if (isPlusMenuOpen && !event.target.closest('.layers-add-dropdown')) {
        isPlusMenuOpen = false;
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
      } else if (action === 'remove') {
        const next = removeLayer(handout, id);
        state.edit(next, { label: 'Excluir camada' });
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
    destroy() {
      container.innerHTML = '';
    },
  };
}

