import { renderIcon } from '../ui/icons.js';
import { duplicateLayer, moveLayer, removeLayer, updateLayer } from '../domain/handouts.js';
import { mountFontSelector } from './font-selector.js';

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
export function createSelectionBar(pageWrap, { state, getZoom, api, fonts, onMore } = {}) {
  const bar = document.createElement('div');
  bar.className = 'stage-selection-bar at-desk-2';
  bar.style.display = 'none';
  pageWrap.appendChild(bar);

  let lastSignature = null;

  /** Text layers get a second row: font, size, bold, italic, alignment, ink colour, highlight. */
  function textRowHTML(layer, isLocked) {
    const txt = layer.text || {};
    const dis = isLocked ? 'disabled' : '';
    const bold = (txt.font?.weight || 400) >= 600;
    const align = txt.align || 'left';
    const hl = txt.highlight;
    return `
      <div class="sel-bar-row sel-bar-text-row">
        <div class="sel-bar-font-mount"></div>
        <input type="number" class="sel-bar-size" data-text="size" min="4" max="600" step="1" value="${Math.round(txt.size || 16)}" title="Tamanho (px)" aria-label="Tamanho" ${dis} />
        <button type="button" class="sel-bar-btn sel-bar-toggle ${bold ? 'active' : ''}" data-text="bold" title="Negrito" aria-label="Negrito" aria-pressed="${bold}" ${dis}><b>B</b></button>
        <button type="button" class="sel-bar-btn sel-bar-toggle ${txt.font?.italic ? 'active' : ''}" data-text="italic" title="Itálico" aria-label="Itálico" aria-pressed="${Boolean(txt.font?.italic)}" ${dis}><i>I</i></button>
        <div class="sel-bar-sep"></div>
        ${[['left', '⟸', 'Esquerda'], ['center', '≡', 'Centro'], ['right', '⟹', 'Direita']].map(([v, glyph, label]) =>
          `<button type="button" class="sel-bar-btn sel-bar-toggle ${align === v ? 'active' : ''}" data-text="align" data-value="${v}" title="${label}" aria-label="${label}" aria-pressed="${align === v}" ${dis}>${glyph}</button>`).join('')}
        <div class="sel-bar-sep"></div>
        <label class="sel-bar-color" title="Cor da tinta"><span class="sel-bar-color-label">A</span><input type="color" data-text="color" value="${txt.color || '#1d1b24'}" aria-label="Cor da tinta" ${dis} /></label>
        <label class="sel-bar-color ${hl ? 'is-on' : ''}" title="Destaque (clique com Alt para desligar)"><span class="sel-bar-color-label sel-bar-hl-label" style="${hl ? `background:${hl.color}` : ''}">▇</span><input type="color" data-text="highlight" value="${hl?.color || '#fff176'}" aria-label="Cor do destaque" ${dis} /></label>
        <button type="button" class="sel-bar-btn sel-bar-more" data-text="more" title="Mais opções de texto" aria-label="Mais opções">Mais…</button>
      </div>
    `;
  }

  function syncTextRow(layer) {
    const txt = layer.text || {};
    const focused = document.activeElement;
    const size = bar.querySelector('[data-text="size"]');
    if (size && size !== focused) size.value = Math.round(txt.size || 16);
    const setPressed = (sel, on) => {
      const el = bar.querySelector(sel);
      if (!el) return;
      el.classList.toggle('active', on);
      el.setAttribute('aria-pressed', String(on));
    };
    setPressed('[data-text="bold"]', (txt.font?.weight || 400) >= 600);
    setPressed('[data-text="italic"]', Boolean(txt.font?.italic));
    for (const v of ['left', 'center', 'right']) setPressed(`[data-text="align"][data-value="${v}"]`, (txt.align || 'left') === v);
    const color = bar.querySelector('[data-text="color"]');
    if (color && color !== focused) color.value = txt.color || '#1d1b24';
    const hlInput = bar.querySelector('[data-text="highlight"]');
    if (hlInput && hlInput !== focused) hlInput.value = txt.highlight?.color || '#fff176';
    const hlLabel = bar.querySelector('.sel-bar-hl-label');
    if (hlLabel) hlLabel.style.background = txt.highlight ? txt.highlight.color : '';
    const font = bar.querySelector('.font-select-current');
    if (font && txt.font?.family) {
      font.textContent = txt.font.family;
      font.style.fontFamily = `'${txt.font.family}', sans-serif`;
    }
  }

  function patchText(label, patch, coalesce = null) {
    const layerId = state.selection;
    const layer = state.handout.layers.find(l => l.id === layerId);
    if (!layer || layer.kind !== 'text' || layer.locked) return;
    const next = updateLayer(state.handout, layerId, { text: { ...layer.text, ...patch } });
    state.edit(next, coalesce ? { label, coalesce: `${layerId}-${coalesce}` } : { label });
  }

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
    const place = () => {
      let topPx = layer.y * zoom - (bar.offsetHeight || 34) - 8;
      // If it doesn't fit on top, place below the layer box
      if (topPx < 10) topPx = (layer.y + layer.height) * zoom + 8;
      bar.style.left = `${Math.round(layer.x * zoom)}px`;
      bar.style.top = `${Math.round(topPx)}px`;
    };

    bar.style.display = 'flex';

    const isLocked = Boolean(layer.locked);

    const signature = `${layer.id}|${layer.kind}|${isLocked}|${layer.blend}`;
    if (signature === lastSignature && bar.firstElementChild) {
      if (layer.kind === 'text') syncTextRow(layer);
      place();
      return;
    }
    lastSignature = signature;

    bar.innerHTML = `
      <div class="sel-bar-row">
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
      </div>
      ${layer.kind === 'text' ? textRowHTML(layer, isLocked) : ''}
    `;

    const fontMount = bar.querySelector('.sel-bar-font-mount');
    if (fontMount) {
      mountFontSelector(fontMount, {
        currentFont: layer.text?.font,
        api,
        fonts,
        disabled: isLocked,
        onSelect: (found) => {
          const cur = state.handout.layers.find(l => l.id === state.selection)?.text?.font || {};
          patchText('Alterar fonte', {
            font: {
              ...cur,
              family: found.family,
              library: found.id || null,
              weight: found.weight || cur.weight || 400,
              italic: found.style ? found.style === 'italic' : Boolean(cur.italic),
            },
          });
        },
      });
    }
    place();
  }

  bar.addEventListener('click', event => {
    const tbtn = event.target.closest('button[data-text]');
    if (tbtn && state) {
      const layer = state.handout.layers.find(l => l.id === state.selection);
      if (!layer || layer.kind !== 'text') return;
      const kind = tbtn.dataset.text;
      if (kind === 'bold') {
        const bold = (layer.text.font?.weight || 400) >= 600;
        patchText(bold ? 'Tirar negrito' : 'Negrito', { font: { ...layer.text.font, weight: bold ? 400 : 700 } });
      } else if (kind === 'italic') {
        patchText('Itálico', { font: { ...layer.text.font, italic: !layer.text.font?.italic } });
      } else if (kind === 'align') {
        patchText('Alinhar texto', { align: tbtn.dataset.value });
      } else if (kind === 'more') {
        onMore?.();
      }
      return;
    }
    if (event.target.closest('[data-text="highlight"]') && event.altKey) {
      event.preventDefault();
      patchText('Desligar destaque', { highlight: null });
      return;
    }
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

  bar.addEventListener('input', event => {
    const el = event.target;
    if (!el.dataset?.text || !state) return;
    if (el.dataset.text === 'size') {
      const size = Math.max(4, Math.min(600, Number(el.value) || 0));
      if (size >= 4) patchText('Alterar tamanho', { size }, 'size');
    } else if (el.dataset.text === 'color') {
      patchText('Alterar cor da tinta', { color: el.value }, 'color');
    } else if (el.dataset.text === 'highlight') {
      const layer = state.handout.layers.find(l => l.id === state.selection);
      const cur = layer?.text?.highlight;
      patchText('Alterar destaque', { highlight: { color: el.value, opacity: cur?.opacity ?? 0.6, padding: cur?.padding ?? 2 } }, 'highlight');
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
      lastSignature = null;
    },
    destroy() {
      bar.remove();
    },
  };
}

