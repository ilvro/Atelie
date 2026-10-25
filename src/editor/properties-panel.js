import { renderIcon, escapeHTML as esc } from '../ui/icons.js';
import {
  numberField,
  colorField,
  checkField,
  choiceField,
  bindControls,
  normalizeHex,
} from '../ui/controls.js';
import { BLEND_MODES, updateLayer, setField } from '../domain/handouts.js';
import { boxCorners } from './geometry.js';
import { EFFECTS } from '../render/handout-effects.js';
import { mountFontSelector, getCachedFont } from './font-selector.js';

export function getDocumentColors(handout) {
  const colors = new Set();
  if (!handout) return [];
  for (const layer of handout.layers || []) {
    if (layer.kind === 'text' && layer.text?.color) {
      colors.add(layer.text.color.toLowerCase());
    }
    if (layer.kind === 'shape') {
      if (layer.shape?.fill) colors.add(layer.shape.fill.toLowerCase());
      if (layer.shape?.stroke) colors.add(layer.shape.stroke.toLowerCase());
    }
    if (layer.kind === 'image' && layer.image?.tint?.color) {
      colors.add(layer.image.tint.color.toLowerCase());
    }
  }
  return Array.from(colors).slice(0, 12);
}

export function saveRecentColor(hex) {
  if (!hex || typeof hex !== 'string') return;
  const clean = hex.toLowerCase();
  try {
    const list = JSON.parse(localStorage.getItem('atelie-recent-colors') || '[]');
    const filtered = list.filter(c => c !== clean);
    filtered.unshift(clean);
    localStorage.setItem('atelie-recent-colors', JSON.stringify(filtered.slice(0, 8)));
  } catch {
    // ignore
  }
}

export function alignLayer(layer, alignType, page) {
  const corners = boxCorners(layer);
  const minX = Math.min(...corners.map(c => c[0]));
  const maxX = Math.max(...corners.map(c => c[0]));
  const minY = Math.min(...corners.map(c => c[1]));
  const maxY = Math.max(...corners.map(c => c[1]));
  const rotW = maxX - minX;
  const rotH = maxY - minY;

  let dx = 0;
  let dy = 0;

  if (alignType === 'left') dx = -minX;
  else if (alignType === 'center-h') dx = page.width / 2 - (minX + rotW / 2);
  else if (alignType === 'right') dx = page.width - maxX;
  else if (alignType === 'top') dy = -minY;
  else if (alignType === 'center-v') dy = page.height / 2 - (minY + rotH / 2);
  else if (alignType === 'bottom') dy = page.height - maxY;

  return {
    ...layer,
    x: Math.round(layer.x + dx),
    y: Math.round(layer.y + dy),
  };
}

export function createPropertiesPanel(container, { state, api, fonts } = {}) {
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

    if (field === 'field:isField') {
      const isChecked = Boolean(rawValue);
      const nextHandout = setField(state.handout, layer.id, isChecked ? (layer.name || 'Campo') : null);
      state.edit(nextHandout, { label: isChecked ? 'Marcar como campo' : 'Desmarcar campo' });
      render();
      return;
    }
    if (field === 'field:label') {
      const nextHandout = setField(state.handout, layer.id, String(rawValue || ''));
      state.edit(nextHandout, { label: 'Renomear campo do preencher', coalesce: `${layer.id}-field-label` });
      return;
    }

    if (!field.startsWith('h:')) return;
    const path = field.slice(2);
    const pathParts = path.split('.');

    let parsed = rawValue;

    // Type conversions
    if (path === 'effect.type') {
      const entry = EFFECTS.find(([k]) => k === rawValue);
      if (entry) {
        const [, , defaultBlend, defaultParams] = entry;
        const next = updateLayer(state.handout, layer.id, {
          blend: defaultBlend,
          effect: {
            ...layer.effect,
            type: rawValue,
            params: { ...defaultParams },
          },
        });
        state.edit(next, { label: `Mudar efeito para ${entry[1]}` });
        render();
        return;
      }
    } else if (path === 'effect.params.smear') {
      parsed = Boolean(rawValue);
    } else if (path.endsWith('.depth')) {
      parsed = (Number(rawValue) || 0) / 100;
    } else if (['effect.seed', 'effect.params.creases', 'effect.params.horizontal', 'effect.params.vertical', 'effect.params.count', 'effect.params.drops', 'effect.params.size'].includes(path)) {
      parsed = Number(rawValue) || 0;
    } else if (path === 'opacity') {
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

    if (path.endsWith('.color') || path === 'shape.fill' || path === 'shape.stroke') {
      saveRecentColor(parsed);
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

    function renderColorSwatchesHTML(targetField) {
      const docColors = getDocumentColors(state.handout);
      let recentColors = [];
      try {
        recentColors = JSON.parse(localStorage.getItem('atelie-recent-colors') || '[]');
      } catch {}

      if (!docColors.length && !recentColors.length) return '';

      return `
        <div class="color-swatches-section" data-for="${targetField}">
          ${docColors.length ? `
            <div class="color-swatches-row">
              <span class="color-swatches-label">No documento</span>
              <div class="color-swatches-grid">
                ${docColors.map(c => `<button type="button" class="color-swatch-btn" data-color="${c}" data-target="${targetField}" style="background-color: ${c};" title="${c}"></button>`).join('')}
              </div>
            </div>
          ` : ''}
          ${recentColors.length ? `
            <div class="color-swatches-row">
              <span class="color-swatches-label">Recentes</span>
              <div class="color-swatches-grid">
                ${recentColors.map(c => `<button type="button" class="color-swatch-btn" data-color="${c}" data-target="${targetField}" style="background-color: ${c};" title="${c}"></button>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

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

          <div class="field align-actions-field">
            <span class="field-label">Alinhar à página</span>
            <div class="align-buttons-row">
              <button type="button" class="at-icon-btn align-btn" data-align="left" title="Alinhar à esquerda" ${stateAttr}>⇤</button>
              <button type="button" class="at-icon-btn align-btn" data-align="center-h" title="Centro horizontal" ${stateAttr}>⇥⇤</button>
              <button type="button" class="at-icon-btn align-btn" data-align="right" title="Alinhar à direita" ${stateAttr}>⇥</button>
              <button type="button" class="at-icon-btn align-btn" data-align="top" title="Alinhar ao topo" ${stateAttr}>⤒</button>
              <button type="button" class="at-icon-btn align-btn" data-align="center-v" title="Centro vertical" ${stateAttr}>↕</button>
              <button type="button" class="at-icon-btn align-btn" data-align="bottom" title="Alinhar à base" ${stateAttr}>⤓</button>
            </div>
          </div>
        </fieldset>
    `;

    // Type specific fields
    const currentField = (state.handout?.fields || []).find(f => f.layerId === layer.id);
    const isField = Boolean(currentField);
    const fieldLabel = currentField ? currentField.label : layer.name;
    const fieldMarkup = `
      <fieldset class="prop-group" ${stateAttr}>
        <legend class="prop-legend">Preenchimento</legend>
        ${checkField('field:isField', 'Campo do Preencher', isField)}
        ${isField ? `
          <label class="field" style="margin-top: 8px;">
            <span class="field-label">Rótulo</span>
            <input type="text" class="at-input" data-field="field:label" value="${esc(fieldLabel)}" ${stateAttr} />
          </label>
        ` : ''}
      </fieldset>
    `;

    if (layer.kind === 'text') {
      const txt = layer.text;
      const curFontMeta = getCachedFont(txt.font?.library) || getCachedFont(txt.font?.family);
      const wghtAxis = curFontMeta?.variable?.axes?.find(a => a.tag === 'wght');

      html += `
        <fieldset class="prop-group" ${stateAttr}>
          <legend class="prop-legend">Texto</legend>
          <label class="field">
            <span class="field-label">Conteúdo</span>
            <textarea data-field="h:text.content" rows="6" ${stateAttr}>${esc(txt.content)}</textarea>
          </label>

          <label class="field">
            <span class="field-label">Família da fonte</span>
            <div class="font-selector-mount"></div>
          </label>

          <div class="field-row">
            ${wghtAxis
              ? numberField('h:text.font.weight', 'Peso · contínuo', txt.font?.weight ?? wghtAxis.default, { min: wghtAxis.min, max: wghtAxis.max, step: 1, disabled: isLocked })
              : choiceField('h:text.font.weight', 'Peso', String(txt.font?.weight || 400), [['400', 'Normal'], ['700', 'Negrito']], { disabled: isLocked })
            }
            ${checkField('h:text.font.italic', 'Itálico', Boolean(txt.font?.italic))}
          </div>

          ${numberField('h:text.size', 'Tamanho · px', txt.size, { min: 6, max: 200, step: 1, disabled: isLocked })}
          ${colorField('h:text.color', 'Cor da tinta', txt.color || '#1d1b24')}
          ${renderColorSwatchesHTML('h:text.color')}

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

        ${fieldMarkup}
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
          ${renderColorSwatchesHTML('h:image.tint.color')}
          ${numberField('h:image.tint.amount', 'Intensidade · %', Math.round((img.tint?.amount || 0) * 100), { min: 0, max: 100, step: 1, disabled: isLocked })}
        </fieldset>

        ${fieldMarkup}
      `;
    } else if (layer.kind === 'shape') {
      const shp = layer.shape;
      html += `
        <fieldset class="prop-group" ${stateAttr}>
          <legend class="prop-legend">Forma</legend>
          ${choiceField('h:shape.type', 'Tipo', shp.type, [['rect', 'Retângulo'], ['ellipse', 'Elipse'], ['line', 'Linha']], { disabled: isLocked })}

          ${colorField('h:shape.fill', 'Preenchimento', shp.fill || '#ffffff')}
          ${renderColorSwatchesHTML('h:shape.fill')}
          ${checkField('h:shape.noFill', 'Sem preenchimento', shp.fill === null)}

          ${colorField('h:shape.stroke', 'Contorno', shp.stroke || '#000000')}
          ${renderColorSwatchesHTML('h:shape.stroke')}
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
    } else if (layer.kind === 'effect') {
      const eff = layer.effect || {};
      const params = eff.params || {};

      function renderEffectParamsHTML(type, p, locked, attr) {
        switch (type) {
          case 'crumple':
            return numberField('h:effect.params.creases', 'Vincos', p.creases ?? 18, { min: 1, max: 60, step: 1, disabled: locked });
          case 'fold':
            return `
              <div class="field-row">
                ${numberField('h:effect.params.horizontal', 'Dobras horizontais', p.horizontal ?? 2, { min: 0, max: 10, step: 1, disabled: locked })}
                ${numberField('h:effect.params.vertical', 'Dobras verticais', p.vertical ?? 1, { min: 0, max: 10, step: 1, disabled: locked })}
              </div>
            `;
          case 'stain':
            return `
              ${numberField('h:effect.params.count', 'Quantidade', p.count ?? 5, { min: 1, max: 20, step: 1, disabled: locked })}
              ${colorField('h:effect.params.color', 'Cor do café', p.color || '#7a4a1e')}
              ${renderColorSwatchesHTML('h:effect.params.color')}
            `;
          case 'burn':
            return numberField('h:effect.params.depth', 'Profundidade · %', Math.round((p.depth ?? 0.08) * 100), { min: 1, max: 35, step: 1, disabled: locked });
          case 'tear':
            return `
              ${choiceField('h:effect.params.side', 'Lado rasgado', p.side || 'bottom', [
                ['bottom', 'Inferior'],
                ['top', 'Superior'],
                ['left', 'Esquerdo'],
                ['right', 'Direito'],
              ], { disabled: locked })}
              ${numberField('h:effect.params.depth', 'Profundidade · %', Math.round((p.depth ?? 0.04) * 100), { min: 1, max: 30, step: 1, disabled: locked })}
            `;
          case 'damp':
            return `
              ${colorField('h:effect.params.color', 'Cor da umidade', p.color || '#8a7a5a')}
              ${renderColorSwatchesHTML('h:effect.params.color')}
            `;
          case 'fade':
            return `
              ${colorField('h:effect.params.color', 'Cor do desbotamento', p.color || '#efe6cf')}
              ${renderColorSwatchesHTML('h:effect.params.color')}
            `;
          case 'blood':
            return `
              ${numberField('h:effect.params.drops', 'Gotas', p.drops ?? 12, { min: 1, max: 50, step: 1, disabled: locked })}
              ${checkField('h:effect.params.smear', 'Arrasto de sangue', p.smear !== false)}
              ${colorField('h:effect.params.color', 'Cor do sangue', p.color || '#6e0b0b')}
              ${renderColorSwatchesHTML('h:effect.params.color')}
            `;
          case 'grain':
            return numberField('h:effect.params.size', 'Tamanho do grão · px', p.size ?? 1.5, { min: 0.5, max: 10, step: 0.5, disabled: locked });
          default:
            return '<p class="empty-hint">Nenhum parâmetro extra.</p>';
        }
      }

      html += `
        <fieldset class="prop-group" ${stateAttr}>
          <legend class="prop-legend">Efeito</legend>
          <label class="field">
            <span class="field-label">Tipo de efeito</span>
            <select data-field="h:effect.type" ${stateAttr}>
              ${EFFECTS.map(([id, name]) => `<option value="${esc(id)}" ${eff.type === id ? 'selected' : ''}>${esc(name)}</option>`).join('')}
            </select>
          </label>

          ${numberField('h:effect.amount', 'Intensidade · %', Math.round((eff.amount ?? 0.5) * 100), { min: 0, max: 100, step: 1, disabled: isLocked })}

          <div class="seed-control-group">
            ${numberField('h:effect.seed', 'Variação', eff.seed ?? 1, { min: 1, max: 999999, step: 1, disabled: isLocked })}
            <button type="button" class="at-btn seed-reroll-btn" data-action="reroll-seed" title="Próxima variação" ${stateAttr}>↻ outra</button>
          </div>
        </fieldset>

        <fieldset class="prop-group" ${stateAttr}>
          <legend class="prop-legend">Parâmetros</legend>
          ${renderEffectParamsHTML(eff.type, params, isLocked, stateAttr)}
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

    const fontMount = container.querySelector('.font-selector-mount');
    if (fontMount && layer.kind === 'text') {
      mountFontSelector(fontMount, {
        currentFont: layer.text?.font,
        onSelect: (selectedFont) => {
          const curLayer = getSelectedLayer();
          if (!curLayer || curLayer.locked) return;

          const nextFont = {
            ...curLayer.text.font,
            family: selectedFont.family,
            library: selectedFont.id,
          };

          const wAxis = selectedFont.variable?.axes?.find(a => a.tag === 'wght');
          if (wAxis) {
            const curW = Number(nextFont.weight || 400);
            nextFont.weight = Math.max(wAxis.min, Math.min(wAxis.max, curW));
          }

          const updated = updateLayer(state.handout, curLayer.id, {
            text: {
              ...curLayer.text,
              font: nextFont,
            },
          });
          state.edit(updated, { desc: `Mudar fonte para ${selectedFont.family}` });
        },
        api,
        fonts,
        disabled: isLocked,
      });
    }

    const pickerBtn = container.querySelector('[data-action="open-image-picker"]');
    if (pickerBtn) {
      pickerBtn.addEventListener('click', () => {
        renderImagePickerModal(layer);
      });
    }

    container.querySelectorAll('.align-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const alignType = btn.dataset.align;
        const curLayer = getSelectedLayer();
        if (!curLayer || curLayer.locked) return;
        const aligned = alignLayer(curLayer, alignType, state.handout.page);
        state.edit(updateLayer(state.handout, curLayer.id, aligned), { label: `Alinhar ${alignType}` });
      });
    });

    container.querySelectorAll('.color-swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetField = btn.dataset.target;
        const color = btn.dataset.color;
        applyFieldChange(targetField, color);
        saveRecentColor(color);
        render();
      });
    });

    const rerollBtn = container.querySelector('[data-action="reroll-seed"]');
    if (rerollBtn) {
      rerollBtn.addEventListener('click', () => {
        const curLayer = getSelectedLayer();
        if (!curLayer || curLayer.locked || curLayer.kind !== 'effect') return;
        const curSeed = Number(curLayer.effect?.seed || 1);
        const next = updateLayer(state.handout, curLayer.id, {
          effect: { ...curLayer.effect, seed: curSeed + 1 },
        });
        state.edit(next, { label: 'Outra variação' });
        render();
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

  // Handle select / checkbox / hex changes
  container.addEventListener('change', event => {
    const field = event.target.dataset?.field;
    if (field) {
      applyFieldChange(field, event.target.type === 'checkbox' ? event.target.checked : event.target.value, false);
    } else if (event.target.dataset?.hex) {
      const hexField = event.target.dataset.hex;
      const code = normalizeHex(event.target.value);
      if (code) {
        applyFieldChange(hexField, code, false);
        saveRecentColor(code);
      }
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

