import { escapeHTML as esc, icon as renderIcon } from '../ui/icons.js';
import { tape } from '../ui/primitives.js';
import { fillFields } from '../domain/handouts.js';
import { getSampleText } from './sample-text.js';

export function createFillPanel(shell, { state, api, images } = {}) {
  const container = document.createElement('div');
  container.className = 'fill-panel-root';

  let unsubscribe = null;

  function render() {
    if (!state || !state.handout) {
      container.innerHTML = `
        <div class="fill-empty-state">
          <p>Nenhum documento aberto.</p>
        </div>
      `;
      return;
    }

    const doc = state.handout;
    const fields = doc.fields || [];

    if (fields.length === 0) {
      container.innerHTML = `
        <div class="fill-empty-state">
          <p class="fill-empty-title">Nenhum campo para preencher</p>
          <p class="fill-empty-hint">Este documento não tem campos marcados. Marque camadas como campos no painel de <strong>Propriedades</strong> para criar um modelo preenchível.</p>
        </div>
      `;
      return;
    }

    let fieldsHTML = '';
    for (const field of fields) {
      const layer = doc.layers.find(l => l.id === field.layerId);
      if (!layer) continue;

      const isText = layer.kind === 'text';
      const isImage = layer.kind === 'image';

      fieldsHTML += `
        <div class="fill-field-card" data-layer-id="${esc(layer.id)}">
          <div class="fill-field-header">
            <button type="button" class="fill-field-tape-btn" data-action="highlight-layer" data-layer-id="${esc(layer.id)}" title="Destacar na página">
              <span class="at-tape fill-tape-label">${esc(field.label || layer.name)}</span>
            </button>
            <span class="fill-field-type-badge">${isText ? 'Texto' : isImage ? 'Imagem' : layer.kind}</span>
          </div>

          <div class="fill-field-body">
      `;

      if (isText) {
        const textContent = layer.text?.content ?? '';
        const isMulti = textContent.includes('\n') || textContent.length > 60;

        fieldsHTML += `
          <div class="fill-input-wrap">
            ${isMulti
              ? `<textarea class="at-textarea fill-field-input" rows="3" data-field-id="${esc(layer.id)}">${esc(textContent)}</textarea>`
              : `<input type="text" class="at-input fill-field-input" data-field-id="${esc(layer.id)}" value="${esc(textContent)}" />`
            }
          </div>
          <div class="fill-actions-row">
            <button type="button" class="at-btn is-sm fill-sample-btn" data-field-id="${esc(layer.id)}">
              ${renderIcon('sparkle', 14)}
              <span>Preencher com exemplo</span>
            </button>
          </div>
        `;
      } else if (isImage) {
        const img = layer.image;
        const srcId = img?.src?.upload || img?.src?.library || null;
        let thumbUrl = null;
        if (img?.src?.upload && api?.uploads) {
          thumbUrl = api.uploads.fileURL(srcId);
        } else if (img?.src?.library && api?.library) {
          thumbUrl = api.library.previewURL(srcId);
        }

        fieldsHTML += `
          <div class="fill-image-row">
            <div class="fill-image-thumb-box">
              ${thumbUrl
                ? `<img src="${esc(thumbUrl)}" class="fill-image-thumb" alt="Prévia" />`
                : '<div class="fill-image-thumb-empty">Sem imagem</div>'
              }
            </div>
            <div class="fill-image-actions">
              <button type="button" class="at-btn is-sm fill-change-image-btn" data-field-id="${esc(layer.id)}">
                Trocar imagem…
              </button>
            </div>
          </div>
        `;
      }

      fieldsHTML += `
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="fill-panel-inner">
        <div class="fill-panel-header">
          <span class="fill-fields-count">${fields.length} ${fields.length === 1 ? 'campo preenchível' : 'campos preenchíveis'}</span>
        </div>
        <div class="fill-fields-list">
          ${fieldsHTML}
        </div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    // Highlight layer on tape click
    container.querySelectorAll('[data-action="highlight-layer"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const layerId = btn.dataset.layerId;
        state.select(layerId);
        // Pulse outline on stage if stage element exists
        const outline = document.querySelector('.stage-selection-outline');
        if (outline) {
          outline.classList.remove('pulse');
          void outline.offsetWidth;
          outline.classList.add('pulse');
        }
      });
    });

    // Text inputs and textareas
    container.querySelectorAll('.fill-field-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const layerId = input.dataset.fieldId;
        const val = e.target.value;
        const next = fillFields(state.handout, { [layerId]: val });
        state.edit(next, { coalesce: 'fill-' + layerId });
      });
    });

    // Sample button
    container.querySelectorAll('.fill-sample-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const layerId = btn.dataset.fieldId;
        const field = (state.handout.fields || []).find(f => f.layerId === layerId);
        const layer = state.handout.layers.find(l => l.id === layerId);
        const currentVal = layer?.text?.content || '';

        const sample = getSampleText(field?.label || layer?.name || '', currentVal);
        const input = container.querySelector(`.fill-field-input[data-field-id="${layerId}"]`);
        if (input) {
          input.value = sample;
        }
        const next = fillFields(state.handout, { [layerId]: sample });
        state.edit(next, { coalesce: 'fill-' + layerId });
      });
    });

    // Image change button
    container.querySelectorAll('.fill-change-image-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const layerId = btn.dataset.fieldId;
        openImageChooser((newSrc) => {
          if (!newSrc) return;
          const next = fillFields(state.handout, { [layerId]: newSrc });
          state.edit(next, { coalesce: 'fill-' + layerId });
          render();
        });
      });
    });
  }

  function openImageChooser(onSelect) {
    const modal = document.createElement('div');
    modal.className = 'at-modal-backdrop image-chooser-modal';
    modal.innerHTML = `
      <div class="at-modal at-card" style="width: 560px; max-width: 90vw;">
        <div class="at-modal-header">
          <h2 class="at-modal-title"><span class="at-tape">Trocar Imagem</span></h2>
          <button type="button" class="at-icon-btn modal-close-btn" aria-label="Fechar">${renderIcon('close', 16)}</button>
        </div>
        <div class="at-modal-body">
          <div class="image-chooser-tabs">
            <button type="button" class="at-chip is-active" data-tab="uploads">Imagens enviadas</button>
            <button type="button" class="at-chip" data-tab="library">Coleção da casa</button>
            <label class="at-btn is-sm is-primary chooser-upload-label" style="margin-left: auto; cursor: pointer;">
              Enviar nova imagem…
              <input type="file" accept="image/*" class="chooser-file-input" style="display: none;" />
            </label>
          </div>
          <div class="image-chooser-grid" style="min-height: 220px; max-height: 380px; overflow-y: auto; padding: 12px 0;">
            <p style="color: var(--eco-text-muted); font-size: 13px;">Carregando imagens…</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.modal-close-btn').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    const grid = modal.querySelector('.image-chooser-grid');
    let currentTab = 'uploads';

    async function loadTab(tab) {
      currentTab = tab;
      grid.innerHTML = '<p style="color: var(--eco-text-muted); font-size: 13px;">Carregando imagens…</p>';

      if (tab === 'uploads') {
        try {
          const list = await api.uploads.list();
          if (list.length === 0) {
            grid.innerHTML = '<p style="color: var(--eco-text-muted); font-size: 13px;">Nenhuma imagem enviada ainda. Envie uma no botão acima.</p>';
            return;
          }
          grid.innerHTML = list.map(item => `
            <div class="chooser-item at-card" data-upload-id="${esc(item.id)}" style="display: inline-block; width: 100px; margin: 6px; cursor: pointer;">
              <img src="${esc(api.uploads.fileURL(item.id))}" style="width: 100%; height: 90px; object-fit: contain; background: #2a2634; border-radius: 4px;" alt="" />
              <div style="font-size: 10px; font-family: var(--at-font-type); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 2px 4px;">
                ${esc(item.name || item.id)}
              </div>
            </div>
          `).join('');

          grid.querySelectorAll('[data-upload-id]').forEach(el => {
            el.addEventListener('click', () => {
              onSelect({ upload: el.dataset.uploadId });
              close();
            });
          });
        } catch (err) {
          grid.innerHTML = '<p style="color: var(--eco-danger); font-size: 13px;">Erro ao carregar imagens.</p>';
        }
      } else {
        try {
          const res = await api.library.list();
          const items = (res.items || []).filter(i => i.kind !== 'layer' && i.kind !== 'template' && i.kind !== 'font');
          if (items.length === 0) {
            grid.innerHTML = '<p style="color: var(--eco-text-muted); font-size: 13px;">Nenhum elemento encontrado.</p>';
            return;
          }
          grid.innerHTML = items.slice(0, 80).map(item => `
            <div class="chooser-item at-card" data-lib-id="${esc(item.id)}" style="display: inline-block; width: 100px; margin: 6px; cursor: pointer;">
              <img src="${esc(api.library.previewURL(item))}" style="width: 100%; height: 90px; object-fit: contain; background: #2a2634; border-radius: 4px;" alt="" />
              <div style="font-size: 10px; font-family: var(--at-font-type); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 2px 4px;">
                ${esc(item.name)}
              </div>
            </div>
          `).join('');

          grid.querySelectorAll('[data-lib-id]').forEach(el => {
            el.addEventListener('click', () => {
              onSelect({ library: el.dataset.libId });
              close();
            });
          });
        } catch {
          grid.innerHTML = '<p style="color: var(--eco-danger); font-size: 13px;">Erro ao carregar elementos da biblioteca.</p>';
        }
      }
    }

    modal.querySelectorAll('.image-chooser-tabs [data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.image-chooser-tabs [data-tab]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        loadTab(btn.dataset.tab);
      });
    });

    modal.querySelector('.chooser-file-input').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const uploaded = await api.uploads.send(file);
        onSelect({ upload: uploaded.id });
        close();
      } catch (err) {
        shell.notify?.('Erro ao enviar imagem.', { tone: 'danger' });
      }
    });

    loadTab('uploads');
  }

  // Subscribe to state changes
  if (state && typeof state.subscribe === 'function') {
    unsubscribe = state.subscribe(() => {
      render();
    });
  }

  render();

  return {
    element: container,
    render,
    destroy() {
      if (unsubscribe) unsubscribe();
    },
  };
}

