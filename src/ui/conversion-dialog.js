/**
 * Progress and status dialog for Just-In-Time (JIT) PSD conversion (Etapa 30).
 */
import { escapeHTML as esc, icon as renderIcon } from './icons.js';
import { tape } from './primitives.js';
import { convertPsdJit } from '../editor/client-psd-converter.js';

let activeConversionDialog = null;

/**
 * Opens a modal dialog displaying conversion progress for a JIT template.
 */
export async function openConversionDialog({
  templateItem,
  psdFile,
  fontFiles = [],
  db = null,
  onComplete,
  onCancel,
}) {
  if (activeConversionDialog) {
    activeConversionDialog.remove();
    activeConversionDialog = null;
  }

  const abortController = new AbortController();

  const dialogEl = document.createElement('div');
  dialogEl.className = 'at-settings-modal at-conversion-modal';
  dialogEl.id = 'at-conversion-modal';

  dialogEl.innerHTML = `
    <div class="at-settings-backdrop" data-close-conv-dialog></div>
    <div class="at-settings-card at-conversion-card" role="dialog" aria-modal="true" aria-label="Preparando documento">
      <div class="at-settings-header">
        <h2 class="at-settings-title"><span class="at-tape">Preparando Documento</span></h2>
        <button type="button" class="at-icon-btn" data-close-conv-dialog aria-label="Cancelar">${renderIcon('close', 16)}</button>
      </div>

      <div class="at-settings-body" style="padding: 24px 20px;">
        <div class="at-conversion-header" style="margin-bottom: 16px;">
          <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: var(--at-text);">${esc(templateItem.name)}</h3>
          <span style="font-size: 12px; opacity: 0.7; color: var(--at-text);">${esc(templateItem.category || '')} · Conversão local sob demanda (JIT)</span>
        </div>

        <div class="at-expansion-progress-bar-wrap" style="height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
          <div class="at-conversion-progress-bar" style="width: 10%; height: 100%; background: var(--at-uv, #9354dc); transition: width 0.3s ease;"></div>
        </div>

        <div class="at-conversion-status-row" style="display: flex; justify-content: space-between; font-size: 13px; color: var(--at-text);">
          <span class="at-conversion-status-label">Lendo arquivo PSD…</span>
          <span class="at-conversion-status-pct">10%</span>
        </div>

        <div class="at-conversion-notice" style="margin-top: 20px; font-size: 12px; opacity: 0.6; line-height: 1.4;">
          🔒 O arquivo é processado 100% no seu navegador e o resultado é salvo no cache local para aberturas instantâneas futuras.
        </div>
      </div>

      <div class="at-settings-footer" style="display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--at-line, #3a332c);">
        <button type="button" class="at-btn" data-close-conv-dialog>Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialogEl);
  activeConversionDialog = dialogEl;

  const closeDialog = () => {
    abortController.abort();
    if (activeConversionDialog) {
      activeConversionDialog.remove();
      activeConversionDialog = null;
    }
    onCancel?.();
  };

  dialogEl.querySelectorAll('[data-close-conv-dialog]').forEach(el => {
    el.addEventListener('click', closeDialog);
  });

  const progressBar = dialogEl.querySelector('.at-conversion-progress-bar');
  const statusLabel = dialogEl.querySelector('.at-conversion-status-label');
  const statusPct = dialogEl.querySelector('.at-conversion-status-pct');

  try {
    const result = await convertPsdJit({
      psdFile,
      fontFiles,
      templateItem,
      db,
      signal: abortController.signal,
      onProgress: ({ percent, message }) => {
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (statusLabel) statusLabel.textContent = message;
        if (statusPct) statusPct.textContent = `${percent}%`;
      },
    });

    setTimeout(() => {
      if (activeConversionDialog) {
        activeConversionDialog.remove();
        activeConversionDialog = null;
      }
      onComplete?.(result.handout);
    }, 400);
  } catch (err) {
    if (abortController.signal.aborted) return;
    if (statusLabel) {
      statusLabel.textContent = `Erro ao converter: ${err.message}`;
      statusLabel.style.color = '#ff6e75';
    }
  }
}

