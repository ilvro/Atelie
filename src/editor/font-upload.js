import { escapeHTML as esc } from '../ui/icons.js';
import { wireModal } from '../ui/modal.js';
import {
  USER_FONT_ACCEPT,
  suggestFontMeta,
  validateUserFontFile,
  fontMimeFor,
} from '../data/user-fonts.js';
import { clearLibraryFontsCache } from './font-selector.js';

const WEIGHTS = [[100, 'Fina (100)'], [200, 'Extra leve (200)'], [300, 'Leve (300)'], [400, 'Normal (400)'], [500, 'Média (500)'], [600, 'Semi-negrito (600)'], [700, 'Negrito (700)'], [800, 'Extra negrito (800)'], [900, 'Preta (900)']];

/** Short dialog to name the font and confirm its weight and italic; resolves with the choice or null. */
function askFontMeta(meta, probeFamily) {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.className = 'at-modal-backdrop font-upload-modal';
    backdrop.innerHTML = `
      <div class="at-modal" role="dialog" aria-modal="true" aria-label="Enviar fonte">
        <header class="at-modal-header"><h3 class="at-modal-title">Enviar fonte</h3></header>
        <div class="at-modal-body">
          <p class="font-upload-specimen" style="font-family: '${esc(probeFamily)}', serif; font-size: 28px; margin: 0 0 14px;">Querida Lia, não procure por mim.</p>
          <label class="field"><span class="field-label">Nome da família</span>
            <input type="text" class="at-input" data-font-name value="${esc(meta.family)}" maxlength="60" /></label>
          <div class="field-row" style="margin-top:8px;">
            <label class="field"><span class="field-label">Peso</span>
              <select class="at-input" data-font-weight>${WEIGHTS.map(([w, n]) => `<option value="${w}" ${w === meta.weight ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="check"><input type="checkbox" data-font-italic ${meta.italic ? 'checked' : ''} /><span>Itálico</span></label>
          </div>
          <div class="modal-dialog-actions" style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
            <button type="button" class="at-btn font-upload-cancel">Cancelar</button>
            <button type="button" class="at-btn is-primary font-upload-confirm">Adicionar à biblioteca</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    let dispose;
    const close = (value) => {
      backdrop.remove();
      dispose?.();
      resolve(value);
    };
    dispose = wireModal(backdrop, { onCancel: () => close(null), primary: '.font-upload-confirm' });
    backdrop.querySelector('.font-upload-cancel').addEventListener('click', () => close(null));
    const confirm = () => {
      const family = backdrop.querySelector('[data-font-name]').value.trim();
      if (!family) {
        backdrop.querySelector('[data-font-name]').focus();
        return;
      }
      close({
        family,
        weight: Number(backdrop.querySelector('[data-font-weight]').value) || 400,
        italic: backdrop.querySelector('[data-font-italic]').checked,
      });
    };
    backdrop.querySelector('.font-upload-confirm').addEventListener('click', confirm);
    backdrop.querySelector('[data-font-name]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirm();
    });
  });
}

/**
 * Sends a font from the computer: reads and tests it, asks for name/weight/italic and stores it
 * as a library font of the browser. `file` may be passed (tests, drag and drop) or picked.
 */
export async function uploadFont({ api, fonts, shell, file = null, onDone } = {}) {
  if (!file) {
    file = await new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = USER_FONT_ACCEPT;
      input.addEventListener('change', () => resolve(input.files?.[0] || null), { once: true });
      input.addEventListener('cancel', () => resolve(null), { once: true });
      input.click();
    });
  }
  if (!file) return null;

  const problem = validateUserFontFile(file);
  if (problem) {
    shell?.notify?.(problem, { tone: 'error' });
    return null;
  }

  const buffer = await file.arrayBuffer();
  const probeFamily = `atelie-probe-${Date.now().toString(36)}`;
  const probe = new FontFace(probeFamily, buffer);
  try {
    await probe.load();
    document.fonts.add(probe);
  } catch {
    shell?.notify?.(`Não consegui ler “${file.name}” como fonte. Confira se o arquivo está inteiro e é um .ttf, .otf, .woff ou .woff2.`, { tone: 'error', duration: 8000 });
    return null;
  }

  const choice = await askFontMeta(suggestFontMeta(file.name), probeFamily);
  document.fonts.delete(probe);
  if (!choice) return null;

  try {
    const item = await api.expansions.addUserFont(
      { ...choice, fileName: file.name },
      new Blob([buffer], { type: fontMimeFor(file.name) })
    );
    clearLibraryFontsCache();
    await fonts?.load?.({ library: item.id, family: item.family, weight: item.weight, italic: item.style === 'italic' });
    shell?.notify?.(`Fonte “${item.family}” adicionada em Minhas fontes.`, { tone: 'info' });
    onDone?.(item);
    return item;
  } catch (err) {
    shell?.notify?.(`Não foi possível guardar a fonte: ${err.message}`, { tone: 'error' });
    return null;
  }
}

export async function removeUserFont({ api, shell, item, onDone } = {}) {
  try {
    await api.expansions.removeUserFont(item.id);
    clearLibraryFontsCache();
    shell?.notify?.(`Fonte “${item.family}” removida.`, { tone: 'info' });
    onDone?.();
  } catch (err) {
    shell?.notify?.(`Não foi possível remover a fonte: ${err.message}`, { tone: 'error' });
  }
}
