import { renderIcon } from '../ui/icons.js';
import { duplicateLayer, moveLayer, removeLayer, updateLayer } from '../domain/handouts.js';

const QUICK_BLENDS = [
  ['normal', 'Normal'],
  ['multiply', 'Multiplicação'],
  ['overlay', 'Sobrepor'],
  ['soft-light', 'Luz suave'],
  ['screen', 'Divisão de tela'],
];

/**
 * Floating mini-bar above the selected layer.
 */
export function createSelectionBar(pageWrap, { state, getZoom } = {}) {
  const bar = document.createElement('div');
  bar.className = 'stage-selection-bar at-desk-2';
  bar.style.display = 'none';
  pageWrap.appendChild(bar);

  function update() {
    if (!state) return;
    const layerId = state.selection;
    if (!layerId) {
      bar.style.display = 'none';
      return;
    }

    const handout = state.handout;
    const layer = handout.layers.find(l => l.id === layerId);
    if (!layer || !layer.visible) {
      bar.style.display = 'none';
      return;
    }

    const zoom = getZoom?.() || 0.6;
    const w = layer.width * zoom;
    const h = layer.height * zoom;
    const leftPx = layer.x * zoom;
    let topPx = layer.y * zoom - 42;

    // If it doesn't fit on top, place below the layer box
    if (topPx < 10) {
      topPx = (layer.y + layer.height) * zoom + 8;
    }

    bar.style.display = 'flex';
    bar.style.left = `${Math.round(leftPx)}px`;
    bar.style.top = `${Math.round(topPx)}px`;

    const isLocked = Boolean(layer.locked);

    bar.innerHTML = `
      <button type="button" class="at-icon-btn sel-bar-btn" data-action="duplicate" title="Duplicar (Ctrl+D)" aria-label="Duplicar">
        ${renderIcon('copy', 14)}
      </button>
      <button type="button" class="at-icon-btn sel-bar-btn" data-action="bring-forward" title="Trazer para frente (Ctrl+])" aria-label="Subir">
        ↑
      </button>
      <button type="button" class="at-icon-btn sel-bar-btn" data-action="send-backward" title="Enviar para trás (Ctrl+[)" aria-label="Descer">
        ↓
      </button>
      <div class="sel-bar-sep"></div>
      <select class="sel-bar-blend-select" data-action="blend" title="Modo de mesclagem" ${isLocked ? 'disabled' : ''}>
        ${QUICK_BLENDS.map(
          ([id, label]) =>
            `<option value="${id}" ${layer.blend === id ? 'selected' : ''}>${label}</option>`
        ).join('')}
      </select>
      <div class="sel-bar-sep"></div>
      <button type="button" class="at-icon-btn sel-bar-btn ${isLocked ? 'active' : ''}" data-action="toggle-lock" title="${isLocked ? 'Destravar' : 'Travar'}" aria-label="Travar">
        ${renderIcon(isLocked ? 'lock' : 'unlock', 14)}
      </button>
      <button type="button" class="at-icon-btn sel-bar-btn is-danger" data-action="remove" title="Excluir (Del)" aria-label="Excluir">
        🗑
      </button>
    `;
  }

  bar.addEventListener('click', event => {
    const btn = event.target.closest('[data-action]');
    if (!btn || !state) return;

    const action = btn.dataset.action;
    const layerId = state.selection;
    if (!layerId) return;

    const handout = state.handout;
    const layer = handout.layers.find(l => l.id === layerId);
    if (!layer) return;

    if (action === 'duplicate') {
      const next = duplicateLayer(handout, layerId);
      state.edit(next, { label: 'Duplicar camada' });
    } else if (action === 'bring-forward') {
      const idx = handout.layers.findIndex(l => l.id === layerId);
      if (idx < handout.layers.length - 1) {
        const next = moveLayer(handout, layerId, idx + 1);
        state.edit(next, { label: 'Subir camada' });
      }
    } else if (action === 'send-backward') {
      const idx = handout.layers.findIndex(l => l.id === layerId);
      if (idx > 0) {
        const next = moveLayer(handout, layerId, idx - 1);
        state.edit(next, { label: 'Descer camada' });
      }
    } else if (action === 'toggle-lock') {
      const next = updateLayer(handout, layerId, { locked: !layer.locked });
      state.edit(next, { label: layer.locked ? 'Destravar camada' : 'Travar camada' });
    } else if (action === 'remove') {
      const next = removeLayer(handout, layerId);
      state.edit(next, { label: 'Excluir camada' });
    }
  });

  bar.addEventListener('change', event => {
    if (event.target.dataset.action === 'blend') {
      const layerId = state.selection;
      if (!layerId) return;
      const next = updateLayer(state.handout, layerId, { blend: event.target.value });
      state.edit(next, { label: 'Alterar mesclagem' });
    }
  });

  return {
    update,
    hide() {
      bar.style.display = 'none';
    },
    destroy() {
      bar.remove();
    },
  };
}

