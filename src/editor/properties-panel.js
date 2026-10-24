import { renderIcon, escapeHTML as esc } from '../ui/icons.js';
import {
  numberField,
  colorField,
  checkField,
  choiceField,
  bindControls,
  normalizeHex,
} from '../ui/controls.js';
import { BLEND_MODES, updateLayer } from '../domain/handouts.js';

export function createPropertiesPanel(container, { state, api } = {}) {
  let isImageModalOpen = false;

  function getSelectedLayer() {
    const id = state.selection;
    if (!id) return null;
    return state.handout.layers.find(l => l.id === id) ?? null;
  }

  function getDeep(obj, pathParts) {
    let cur = obj;
    for (const part of pathParts) {
      if (cur == null) return undefined;
      cur = cur[part];
    }
    return cur;
  }

  function setDeep(obj, pathParts, value) {
    const res = structuredClone(obj);
    let cur = res;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      cur[part] = cur[part] ? { ...cur[part] } : {};
      cur = cur[part];
    }
    cur[pathParts[pathParts.length - 1]] = value;
    return res;
  }

  function applyFieldChange(field, rawValue, isInputEvent = false) {
    const layer = getSelectedLayer();
    if (!layer || layer.locked) return;

    if (!field.startsWith('h:')) return;
    const path = field.slice(2);
    const pathParts = path.split('.');

    let parsed = rawValue;

    // Type conversions
    if (path === 'opacity') {
      parsed = Math.max(0, Math.min(100, Number(rawValue) || 0)) / 100;
    } else if (path.endsWith('.wear') || path.endsWith('.amount') || path.startsWith('image.filter.') || path.startsWith('adjust.')) {
      if (path === 'image.filter.blur' || path === 'image.filter.hue') {
        parsed = Number(rawValue) || 0;
      } else {
        parsed = (Number(rawValue) || 0) / 100;
      }
    } else if (['x', 'y', 'width', 'height', 'rotation', 'shape.strokeWidth', 'shape.radius', 'text.size', 'text.lineHeight', 'text.letterSpacing', 'text.ink.seed'].includes(path)) {
      parsed = Number(rawValue) || 0;
    } else if (path === 'text.fit') {
      parsed = rawValue ? 'shrink' : 'overflow';
    } else if (path === 'shape.noFill') {
      // If noFill is checked, fill becomes null
      const next = updateLayer(state.handout, layer.id, {
        shape: { fill: rawValue ? null : '#ffffff' },
      });
      state.edit(next, { label: 'Alterar preenchimento', coalesce: `${layer.id}-fill` });
      render();
      return;
    }

    const prev = getDeep(layer, pathParts);
    if (prev === parsed) return;

    const patch = setDeep({}, pathParts, parsed);
    const next = updateLayer(state.handout, layer.id, patch);
    const coalesceKey = `${layer.id}-${path}`;
    state.edit(next, { label: `Alterar ${path}`, coalesce: coalesceKey });
  }

  function renderImagePickerModal(layer) {
    const modal = document.createElement('div');
    modal.className = 'at-modal-backdrop';
    modal.innerHTML = `
      <div class="at-modal" role="dialog" aria-modal="true" aria-label="Escolher imagem">
        <header class="at-modal-header">
          <h3 class="at-modal-title">Escolher Imagem</h3>
          <button type="button" class="at-icon-btn modal-close-btn" aria-label="Fechar">
            ${renderIcon('close', 16)}
          </button>
        </header>
        <div class="at-modal-body">
          <div class="image-upload-bar">
            <label class="at-btn is-primary image-upload-label">
              ${renderIcon('plus', 14)}
              <span>Enviar nova imagem</span>
              <input type="file" class="image-upload-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;" />
            </label>
          </div>
          <div class="image-picker-grid" id="image-picker-grid">
            <p class="image-picker-loading">Carregando imagens...</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const grid = modal.querySelector('#image-picker-grid');
    const closeBtn = modal.querySelector('.modal-close-btn');
    const fileInput = modal.querySelector('.image-upload-file-input');

    const closeModal = () => {
      modal.remove();
      isImageModalOpen = false;
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    async function loadUploads() {
      try {
        const list = await api.uploads.list();
        if (!list.length) {
          grid.innerHTML = '<p class="empty-hint">Nenhuma imagem enviada ainda.</p>';
          return;
        }

        grid.innerHTML = list.map(item => `
          <button type="button" class="image-picker-item" data-id="${esc(item.id)}" title="${esc(item.name)}">
            <img src="${esc(api.uploads.fileURL(item.id))}" alt="${esc(item.name)}" />
            <span>${esc(item.name)}</span>
          </button>
        `).join('');

        grid.querySelectorAll('.image-picker-item').forEach(btn => {
          btn.addEventListener('click', () => {
            const uploadId = btn.dataset.id;
            const next = updateLayer(state.handout, layer.id, {
              image: { src: { upload: uploadId } },
            });
            state.edit(next, { label: 'Escolher imagem' });
            closeModal();
            render();
          });
        });
      } catch (err) {
        grid.innerHTML = `<p class="error-hint">Erro ao carregar imagens: ${esc(err.message)}</p>`;
      }
    }

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      try {
        const uploaded = await api.uploads.send(file);
        const next = updateLayer(state.handout, layer.id, {
          image: { src: { upload: uploaded.id } },
        });
        state.edit(next, { label: 'Enviar e escolher imagem' });
        closeModal();
        render();
      } catch (err) {
        alert(`Erro ao enviar imagem: ${err.message}`);
      }
    });

    loadUploads();
  }

  function render() {
    const layer = getSelectedLayer();

    if (!layer) {
      container.innerHTML = `
        <div class="panel-empty">
          <p>Nenhuma camada selecionada.</p>
          <small>Clique em uma camada na lista ou na mesa para inspecionar suas propriedades.</small>
        </div>
      `;
      return;
    }

    const isLocked = Boolean(layer.locked);
    const stateAttr = isLocked ? 'disabled' : '';

    const blendOptions = BLEND_MODES.map(([id, name]) => [id, name]);

    // Common properties HTML
    let html = `
      <div class="properties-panel ${isLocked ? 'is-locked' : ''}">
        ${isLocked ? `<div class="locked-banner">${renderIcon('lock', 14)}<span>Camada bloqueada para edição</span></div>` : ''}

        <fieldset class="prop-group" ${stateAttr}>
          <legend class="prop-legend">Geral</legend>
          <label class="field">
            <span class="field-label">Nome</span>
            <input type="text" data-field="h:name" value="${esc(layer.name)}" maxlength="80" ${stateAttr} />
          </label>

          <div class="field-row">
            ${numberField('h:x', 'X · px', layer.x, { step: 1, disabled: isLocked })}
            ${numberField('h:y', 'Y · px', layer.y, { step: 1, disabled: isLocked })}
          </div>

          <div class="field-row">
            ${numberField('h:width', 'Largura · px', layer.width, { min: 1, step: 1, disabled: isLocked })}
            ${numberField('h:height', 'Altura · px', layer.height, { min: 1, step: 1, disabled: isLocked })}
          </div>

          ${numberField('h:rotation', 'Rotação · graus', layer.rotation, { min: -360, max: 360, step: 1, disabled: isLocked })}
          ${numberField('h:opacity', 'Opacidade · %', Math.round(layer.opacity * 100), { min: 0, max: 100, step: 1, disabled: isLocked })}

          <label class="field">
            <span class="field-label">Mesclagem</span>
            <select data-field="h:blend" ${stateAttr}>
              ${blendOptions.map(([id, name]) => `<option value="${esc(id)}" ${layer.blend === id ? 'selected' : ''}>${esc(name)}</option>`).join('')}
            </select>
          </label>

          ${checkField('h:clip', 'Recortar na camada de baixo', layer.clip)}
          ${choiceField('h:light', 'Iluminação', layer.light, [['both', 'Sempre'], ['normal', 'Comum'], ['uv', 'Luz UV']], { disabled: isLocked })}
        </fieldset>
    `;

    // Type specific fields
    if (layer.kind === 'text') {
      const txt = layer.text;
      const fontFamilies = [
        ['IM Fell English', 'IM Fell English'],
        ['Courier Prime', 'Courier Prime'],
        ['Georgia', 'Georgia'],
        ['Times New Roman', 'Times New Roman'],
        ['Courier New', 'Courier New'],
        ['Arial', 'Arial'],
        ['Special Elite', 'Special Elite'],
      ];

      html += `
        <fieldset class="prop-group" ${stateAttr}>
          <legend class="prop-legend">Texto</legend>
          <label class="field">
            <span class="field-label">Conteúdo</span>
            <textarea data-field="h:text.content" rows="6" ${stateAttr}>${esc(txt.content)}</textarea>
          </label>

          <label class="field">
            <span class="field-label">Família da fonte</span>
            <select data-field="h:text.font.family" ${stateAttr}>
              ${fontFamilies.map(([f, label]) => `<option value="${esc(f)}" ${txt.font?.family === f ? 'selected' : ''}>${esc(label)}</option>`).join('')}
            </select>
          </label>

          <div class="field-row">
            ${choiceField('h:text.font.weight', 'Peso', String(txt.font?.weight || 400), [['400', 'Normal'], ['700', 'Negrito']], { disabled: isLocked })}
            ${checkField('h:text.font.italic', 'Itálico', Boolean(txt.font?.italic))}
          </div>

          ${numberField('h:text.size', 'Tamanho · px', txt.size, { min: 6, max: 200, step: 1, disabled: isLocked })}
          ${colorField('h:text.color', 'Cor da tinta', txt.color || '#1d1b24')}

          ${choiceField('h:text.align', 'Alinhamento', txt.align, [
            ['left', 'Esquerda', '⟸'],
            ['center', 'Centro', '≡'],
            ['right', 'Direita', '⟹'],
            ['justify', 'Justificado', '☰'],
          ], { disabled: isLocked })}

          ${choiceField('h:text.valign', 'Vertical', txt.valign, [
            ['top', 'Topo'],
            ['middle', 'Meio'],
            ['bottom', 'Base'],
          ], { disabled: isLocked })}

          <div class="field-row">
            ${numberField('h:text.lineHeight', 'Altura linha', txt.lineHeight, { min: 0.8, max: 3, step: 0.05, disabled: isLocked })}
            ${numberField('h:text.letterSpacing', 'Espaço · ‰', txt.letterSpacing, { min: -100, max: 500, step: 10, disabled: isLocked })}
          </div>

          ${choiceField('h:text.box', 'Modo da caixa', txt.box, [['area', 'Caixa'], ['point', 'Ponto']], { disabled: isLocked })}
          ${checkField('h:text.fit', 'Encolher para caber', txt.fit === 'shrink')}
        </fieldset>

        <fieldset class="prop-group" ${stateAttr}>
          <legend class="prop-legend">Tinta e Desgaste</legend>
          ${choiceField('h:text.ink.style', 'Estilo', txt.ink?.style || 'clean', [
            ['clean', 'Limpa'],
            ['typewriter', 'Máquina'],
            ['handwriting', 'À mão'],
            ['stamp', 'Carimbo'],
          ], { disabled: isLocked })}

          ${numberField('h:text.ink.wear', 'Desgaste · %', Math.round((txt.ink?.wear || 0) * 100), { min: 0, max: 100, step: 1, disabled: isLocked })}
          ${numberField('h:text.ink.seed', 'Semente', txt.ink?.seed || 1, { min: 1, max: 99999, step: 1, disabled: isLocked })}
        </fieldset>
      `;
    } else if (layer.kind === 'image') {
      const img = layer.image;
      const srcId = img.src?.upload || img.src?.library || null;

      html += `
        <fieldset class="prop-group" ${stateAttr}>
          <legend class="prop-legend">Imagem</legend>
          <div class="image-preview-picker">
            ${srcId ? `<img src="${esc(img.src.upload ? api.uploads.fileURL(srcId) : api.library.fileURL(srcId))}" class="image-thumb-preview" alt="Prévia" />` : '<div class="image-thumb-empty">Sem imagem</div>'}
            <button type="button" class="at-btn image-choose-btn" data-action="open-image-picker" ${stateAttr}>Escolher imagem…</button>
          </div>

          ${choiceField('h:image.fit', 'Enquadramento', img.fit, [['stretch', 'Esticar'], ['cover', 'Cobrir'], ['contain', 'Conter']], { disabled: isLocked })}

          <div class="field-row">
            ${checkField('h:image.flipX', 'Espelhar H', Boolean(img.flipX))}
            ${checkField('h:image.flipY', 'Espelhar V', Boolean(img.flipY))}
          </div>

          <legend class="prop-legend" style="margin-top: 12px;">Filtros</legend>
          ${numberField('h:image.filter.grayscale', 'Escala de cinza · %', Math.round((img.filter?.grayscale || 0) * 100), { min: 0, max: 100, step: 1, disabled: isLocked })}
          ${numberField('h:image.filter.sepia', 'Sépia · %', Math.round((img.filter?.sepia || 0) * 100), { min: 0, max: 100, step: 1, disabled: isLocked })}
          ${numberField('h:image.filter.contrast', 'Contraste · %', Math.round((img.filter?.contrast || 0) * 100), { min: -100, max: 100, step: 1, disabled: isLocked })}
          ${numberField('h:image.filter.brightness', 'Brilho · %', Math.round((img.filter?.brightness || 0) * 100), { min: -100, max: 100, step: 1, disabled: isLocked })}
          ${numberField('h:image.filter.saturation', 'Saturação · %', Math.round((img.filter?.saturation || 0) * 100), { min: -100, max: 100, step: 1, disabled: isLocked })}
          ${numberField('h:image.filter.blur', 'Desfoque · px', img.filter?.blur || 0, { min: 0, max: 50, step: 1, disabled: isLocked })}

          <legend class="prop-legend" style="margin-top: 12px;">Tingimento</legend>
          ${colorField('h:image.tint.color', 'Cor do tingimento', img.tint?.color || '#ffeedd')}
          ${numberField('h:image.tint.amount', 'Intensidade · %', Math.round((img.tint?.amount || 0) * 100), { min: 0, max: 100, step: 1, disabled: isLocked })}
        </fieldset>
      `;
    } else if (layer.kind === 'shape') {
      const shp = layer.shape;
      html += `
        <fieldset class="prop-group" ${stateAttr}>
          <legend class="prop-legend">Forma</legend>
          ${choiceField('h:shape.type', 'Tipo', shp.type, [['rect', 'Retângulo'], ['ellipse', 'Elipse'], ['line', 'Linha']], { disabled: isLocked })}

          ${colorField('h:shape.fill', 'Preenchimento', shp.fill || '#ffffff')}
          ${checkField('h:shape.noFill', 'Sem preenchimento', shp.fill === null)}

          ${colorField('h:shape.stroke', 'Contorno', shp.stroke || '#000000')}
          ${numberField('h:shape.strokeWidth', 'Espessura · px', shp.strokeWidth || 0, { min: 0, max: 50, step: 1, disabled: isLocked })}
          ${numberField('h:shape.radius', 'Arredondamento · px', shp.radius || 0, { min: 0, max: 200, step: 1, disabled: isLocked })}
        </fieldset>
      `;
    } else if (layer.kind === 'adjust') {
      const adj = layer.adjust;
      html += `
        <fieldset class="prop-group" ${stateAttr}>
          <legend class="prop-legend">Ajuste de Cor</legend>
          ${numberField('h:adjust.grayscale', 'Escala de cinza · %', Math.round((adj.grayscale || 0) * 100), { min: 0, max: 100, step: 1, disabled: isLocked })}
          ${numberField('h:adjust.sepia', 'Sépia · %', Math.round((adj.sepia || 0) * 100), { min: 0, max: 100, step: 1, disabled: isLocked })}
          ${numberField('h:adjust.contrast', 'Contraste · %', Math.round((adj.contrast || 0) * 100), { min: -100, max: 100, step: 1, disabled: isLocked })}
          ${numberField('h:adjust.brightness', 'Brilho · %', Math.round((adj.brightness || 0) * 100), { min: -100, max: 100, step: 1, disabled: isLocked })}
          ${numberField('h:adjust.saturation', 'Saturação · %', Math.round((adj.saturation || 0) * 100), { min: -100, max: 100, step: 1, disabled: isLocked })}
          ${numberField('h:adjust.hue', 'Matiz · graus', adj.hue || 0, { min: -180, max: 180, step: 1, disabled: isLocked })}
          ${numberField('h:adjust.invert', 'Inversão · %', Math.round((adj.invert || 0) * 100), { min: 0, max: 100, step: 1, disabled: isLocked })}
        </fieldset>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Bind controls (sliders, color pickers, choices)
    bindControls(container, el => {
      if (el.dataset?.field) {
        applyFieldChange(el.dataset.field, el.type === 'checkbox' ? el.checked : el.value);
      }
    });

    const pickerBtn = container.querySelector('[data-action="open-image-picker"]');
    if (pickerBtn) {
      pickerBtn.addEventListener('click', () => {
        renderImagePickerModal(layer);
      });
    }
  }

  // Handle direct inputs (e.g. typing in textarea or name input)
  container.addEventListener('input', event => {
    const field = event.target.dataset?.field;
    if (field && (event.target.tagName === 'TEXTAREA' || event.target.type === 'text')) {
      applyFieldChange(field, event.target.value, true);
    }
  });

  // Handle select / checkbox changes
  container.addEventListener('change', event => {
    const field = event.target.dataset?.field;
    if (field) {
      applyFieldChange(field, event.target.type === 'checkbox' ? event.target.checked : event.target.value, false);
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

