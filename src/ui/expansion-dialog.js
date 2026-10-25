import { escapeHTML as esc, icon as renderIcon } from './icons.js';
import {
  calculateExpansionSize,
  checkStorageSpace,
  readFolderFromDirectoryHandle,
  readFolderFromFileList,
} from '../data/expansion-installer.js';

let dialogEl = null;

/**
 * Opens confirmation and installation progress dialog for an expansion.
 */
export async function openExpansionInstallDialog({
  expansionJson,
  libraryJson,
  filesMap,
  api,
  onComplete,
}) {
  if (dialogEl) {
    dialogEl.remove();
    dialogEl = null;
  }

  const totalBytes = calculateExpansionSize(filesMap);
  const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1);
  const itemCount = libraryJson.items?.length || 0;
  const fileCount = filesMap.size;

  let estimate = null;
  if (api?.estimate) {
    estimate = await api.estimate().catch(() => null);
  }
  const spaceCheck = checkStorageSpace(totalBytes, estimate);

  dialogEl = document.createElement('div');
  dialogEl.className = 'at-settings-modal at-expansion-modal';
  dialogEl.id = 'at-expansion-modal';

  const abortController = new AbortController();

  dialogEl.innerHTML = `
    <div class="at-settings-backdrop" data-close-exp-dialog></div>
    <div class="at-settings-card at-expansion-dialog-card" role="dialog" aria-modal="true" aria-label="Instalar Expansão">
      <div class="at-settings-header">
        <h2 class="at-settings-title"><span class="at-tape">Instalar Expansão</span></h2>
        <button type="button" class="at-icon-btn" data-close-exp-dialog aria-label="Fechar">${renderIcon('close', 16)}</button>
      </div>

      <div class="at-settings-body">
        <div class="at-expansion-summary">
          <h3 class="at-expansion-name">${esc(expansionJson.name || expansionJson.id)}</h3>
          ${expansionJson.description ? `<p class="at-expansion-desc">${esc(expansionJson.description)}</p>` : ''}
          <div class="at-expansion-meta-grid">
            <div class="at-expansion-meta-item">
              <span class="meta-label">ID da Expansão</span>
              <strong class="meta-val">${esc(expansionJson.id)}</strong>
            </div>
            <div class="at-expansion-meta-item">
              <span class="meta-label">Licença</span>
              <strong class="meta-val">${esc(expansionJson.license || 'Uso pessoal')}</strong>
            </div>
            <div class="at-expansion-meta-item">
              <span class="meta-label">Total de Itens</span>
              <strong class="meta-val">${itemCount} itens</strong>
            </div>
            <div class="at-expansion-meta-item">
              <span class="meta-label">Espaço em Disco</span>
              <strong class="meta-val">~${sizeMb} MB (${fileCount} arquivos)</strong>
            </div>
          </div>
        </div>

        <div class="at-expansion-notice">
          <span class="notice-icon">🔒</span>
          <div class="notice-text">
            <strong>Armazenamento Local Privado</strong>
            <p>Os arquivos desta expansão ficam salvos apenas neste navegador (IndexedDB). Nada sai do seu computador e nada é enviado para servidores públicos.</p>
          </div>
        </div>

        ${!spaceCheck.ok ? `
          <div class="at-expansion-notice is-error" style="border-color: #e0150d; background: rgba(224, 21, 13, 0.1);">
            <span class="notice-icon">⚠️</span>
            <div class="notice-text">
              <strong>Espaço em disco insuficiente</strong>
              <p>O navegador necessita de pelo menos ${(spaceCheck.needed / (1024 * 1024)).toFixed(1)} MB livres (1,5× o tamanho da expansão). Espaço disponível estimado: ${(spaceCheck.available / (1024 * 1024)).toFixed(1)} MB.</p>
            </div>
          </div>
        ` : ''}

        <div class="at-expansion-progress-area" style="display: none;">
          <div class="at-expansion-progress-bar-wrap">
            <div class="at-expansion-progress-bar" style="width: 0%;"></div>
          </div>
          <span class="at-expansion-progress-label">Preparando instalação…</span>
        </div>
      </div>

      <div class="at-settings-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="at-btn" data-close-exp-dialog>Cancelar</button>
        <button type="button" class="at-btn is-primary" id="btn-confirm-install-exp" ${!spaceCheck.ok ? 'disabled' : ''}>
          Instalar Expansão
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(dialogEl);

  const closeDialog = () => {
    abortController.abort();
    if (dialogEl) {
      dialogEl.remove();
      dialogEl = null;
    }
  };

  dialogEl.querySelectorAll('[data-close-exp-dialog]').forEach(el => {
    el.addEventListener('click', closeDialog);
  });

  const installBtn = dialogEl.querySelector('#btn-confirm-install-exp');
  const progressArea = dialogEl.querySelector('.at-expansion-progress-area');
  const progressBar = dialogEl.querySelector('.at-expansion-progress-bar');
  const progressLabel = dialogEl.querySelector('.at-expansion-progress-label');

  installBtn?.addEventListener('click', async () => {
    installBtn.disabled = true;
    dialogEl.querySelectorAll('[data-close-exp-dialog]').forEach(el => el.setAttribute('disabled', 'true'));
    progressArea.style.display = 'block';

    try {
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
        await navigator.storage.persist().catch(() => {});
      }

      await api.expansions.install(expansionJson, libraryJson, filesMap, {
        signal: abortController.signal,
        onProgress: ({ processed, total, percent }) => {
          if (progressBar) progressBar.style.width = `${percent}%`;
          if (progressLabel) progressLabel.textContent = `Copiando arquivos: ${processed} de ${total} (${percent}%)`;
        },
      });

      if (progressLabel) progressLabel.textContent = 'Expansão instalada com sucesso!';
      setTimeout(() => {
        closeDialog();
        if (onComplete) onComplete(expansionJson);
      }, 500);
    } catch (err) {
      if (progressLabel) {
        progressLabel.textContent = `Erro na instalação: ${err.message}`;
        progressLabel.style.color = '#ff6e75';
      }
      installBtn.disabled = false;
      dialogEl.querySelectorAll('[data-close-exp-dialog]').forEach(el => el.removeAttribute('disabled'));
    }
  });
}

/**
 * Triggers picking a directory or fallback input.
 */
export async function pickAndInstallExpansion({ api, inputElement, onComplete }) {
  if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      const { expansionJson, libraryJson, filesMap } = await readFolderFromDirectoryHandle(dirHandle);
      await openExpansionInstallDialog({
        expansionJson,
        libraryJson,
        filesMap,
        api,
        onComplete,
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('showDirectoryPicker falhou, tentando seletor de arquivos:', err);
    }
  }

  // Fallback to <input type="file" webkitdirectory>
  if (inputElement) {
    inputElement.value = '';
    inputElement.click();
  }
}

