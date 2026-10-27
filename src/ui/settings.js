import { escapeHTML as esc, icon as renderIcon } from './icons.js';
import { exportBackup, importBackup } from '../data/backup.js';
import {
  openExpansionInstallDialog,
  pickAndInstallExpansion,
} from './expansion-dialog.js';
import { readFolderFromFileList } from '../data/expansion-installer.js';

const STORAGE_KEY = 'atelie-settings';

const LAMP_COLORS = {
  quente: '#f2c58a',
  neutra: '#f8e9d2',
  vela: '#e28a45',
};

const DESK_COLORS = {
  madeira: '#131110',
  cortica: '#21170f',
  feltro: '#111a14',
  couro: '#191412',
  concreto: '#18191c',
  preto: '#0e0e11',
};

let memorySettings = null;

export const DEFAULT_SETTINGS = {
  deskMaterial: 'madeira',
  lampIntensity: 100,
  lampTemperature: 'quente',
  reduceMotion: false,
  unit: 'px',
  shareWithTabletop: true,
  tiltStamps: true,
  shortcuts: {},
  sound: {
    enabled: false,
    volume: 80,
    typing: 'auto', // 'auto' | 'typewriter' | 'pen' | 'off'
    ambient: false,
  },
};

export function getSettings() {
  if (typeof localStorage === 'undefined') {
    return memorySettings ? { ...memorySettings } : { ...DEFAULT_SETTINGS, sound: { ...DEFAULT_SETTINGS.sound } };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, sound: { ...DEFAULT_SETTINGS.sound } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      sound: {
        ...DEFAULT_SETTINGS.sound,
        ...(parsed.sound || {}),
      },
      shortcuts: { ...(parsed.shortcuts || {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, sound: { ...DEFAULT_SETTINGS.sound } };
  }
}

export function saveSettings(updates) {
  const current = getSettings();
  const next = {
    ...current,
    ...updates,
    ...(updates.sound ? { sound: { ...current.sound, ...updates.sound } } : {}),
    ...(updates.shortcuts ? { shortcuts: { ...current.shortcuts, ...updates.shortcuts } } : {}),
  };
  memorySettings = next;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }
  applySettings(next);
  return next;
}

export function applySettings(settings = getSettings()) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const lampColor = LAMP_COLORS[settings.lampTemperature] || LAMP_COLORS.quente;
  const deskColor = DESK_COLORS[settings.deskMaterial] || DESK_COLORS.madeira;

  root.style.setProperty('--at-desk-material', settings.deskMaterial);
  root.style.setProperty('--at-desk', deskColor);
  root.style.setProperty('--at-lamp', lampColor);
  root.style.setProperty('--at-lamp-intensity', String(settings.lampIntensity / 100));
  root.dataset.deskMaterial = settings.deskMaterial;
  root.dataset.unit = settings.unit;

  document.body.classList.toggle('reduce-motion', Boolean(settings.reduceMotion));

  if (typeof window !== 'undefined' && window.__atelieSound?.setSettings) {
    window.__atelieSound.setSettings(settings.sound || {});
  }
}

let settingsModal = null;

export function openSettingsModal() {
  if (settingsModal) return;

  const current = getSettings();

  settingsModal = document.createElement('div');
  settingsModal.className = 'at-settings-modal';
  settingsModal.id = 'at-settings-modal';

  const materials = [
    ['madeira', 'Madeira escura envernizada'],
    ['feltro', 'Feltro verde de jogo'],
    ['couro', 'Couro'],
    ['concreto', 'Concreto · ardósia forense'],
    ['cortica', 'Cortiça investigativa'],
    ['preto', 'Preto neutro'],
  ];

  const temps = [
    ['quente', 'Quente · tungstênio'],
    ['neutra', 'Neutra · difusa'],
    ['vela', 'Vela · chama'],
  ];

  settingsModal.innerHTML = `
    <div class="at-settings-backdrop" data-close-settings></div>
    <div class="at-settings-card" role="dialog" aria-modal="true" aria-label="Ajustes da Mesa">
      <div class="at-settings-header">
        <h2 class="at-settings-title"><span class="at-tape">Ajustes da Mesa</span></h2>
        <button type="button" class="at-icon-btn" data-close-settings aria-label="Fechar ajustes">${renderIcon('close', 16)}</button>
      </div>

      <div class="at-settings-body">
        <section class="at-settings-section">
          <label class="at-settings-label">Superfície da bancada</label>
          <div class="at-settings-choices" role="radiogroup" aria-label="Superfície da bancada">
            ${materials.map(([val, label]) => `
              <button type="button"
                      class="at-settings-choice${current.deskMaterial === val ? ' active' : ''}"
                      role="radio"
                      aria-checked="${current.deskMaterial === val}"
                      data-material="${val}">
                ${esc(label)}
              </button>
            `).join('')}
          </div>
        </section>

        <section class="at-settings-section">
          <label class="at-settings-label">Calor da luminária</label>
          <div class="at-settings-choices" role="radiogroup" aria-label="Calor da luminária">
            ${temps.map(([val, label]) => `
              <button type="button"
                      class="at-settings-choice${current.lampTemperature === val ? ' active' : ''}"
                      role="radio"
                      aria-checked="${current.lampTemperature === val}"
                      data-temp="${val}">
                ${esc(label)}
              </button>
            `).join('')}
          </div>
        </section>

        <section class="at-settings-section">
          <div class="at-settings-row">
            <label for="setting-lamp-intensity" class="at-settings-label">Força da luminária</label>
            <span class="at-settings-value" id="setting-lamp-value">${current.lampIntensity}%</span>
          </div>
          <input type="range"
                 id="setting-lamp-intensity"
                 min="0"
                 max="100"
                 value="${current.lampIntensity}"
                 style="--range-progress: ${current.lampIntensity}%;"
                 class="at-settings-slider" />
        </section>

        <section class="at-settings-section">
          <label class="at-settings-check">
            <input type="checkbox" id="setting-reduce-motion" ${current.reduceMotion ? 'checked' : ''} />
            <span>Reduzir animações (além do sistema)</span>
          </label>
        </section>

        <section class="at-settings-section">
          <label class="at-settings-check">
            <input type="checkbox" id="setting-tilt-stamps" ${current.tiltStamps !== false ? 'checked' : ''} />
            <span>Carimbos, selos e lacres entram levemente tortos</span>
          </label>
        </section>

        <section class="at-settings-section">
          <label class="at-settings-check">
            <input type="checkbox" id="setting-share-tabletop" ${current.shareWithTabletop !== false ? 'checked' : ''} />
            <span>Compartilhar com o Tabletop neste navegador</span>
          </label>
        </section>

        <section class="at-settings-section" id="setting-sound-section">
          <div class="at-settings-row">
            <label class="at-settings-check" style="font-weight: 600;">
              <input type="checkbox" id="setting-sound-enabled" ${current.sound?.enabled ? 'checked' : ''} />
              <span>Sons da bancada</span>
            </label>
            <button type="button" class="at-btn is-sm sound-preview-btn" data-sound-preview="master" title="Ouvir exemplo de som geral">
              Ouvir exemplo
            </button>
          </div>
          <p class="at-settings-desc" style="font-size:12px; color:var(--text-muted, #888); margin:4px 0 10px;">
            Sons táteis sintetizados em tempo real: teclas de máquina de escrever, risco de caneta, carimbos e fita crepe.
          </p>

          <div id="setting-sound-options" style="${current.sound?.enabled ? '' : 'opacity: 0.55;'}">
            <div class="at-settings-row" style="margin-top: 8px;">
              <label for="setting-sound-volume" class="at-settings-label">Volume geral</label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="at-settings-value" id="setting-sound-volume-val">${current.sound?.volume ?? 80}%</span>
                <button type="button" class="at-btn is-sm sound-preview-btn" data-sound-preview="volume">
                  Ouvir exemplo
                </button>
              </div>
            </div>
            <input type="range"
                   id="setting-sound-volume"
                   min="0"
                   max="100"
                   value="${current.sound?.volume ?? 80}"
                   style="--range-progress: ${current.sound?.volume ?? 80}%;"
                   class="at-settings-slider" />

            <div style="margin-top: 12px;">
              <label class="at-settings-label" style="margin-bottom: 6px; display: block;">Voz de digitação nas camadas de texto</label>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <button type="button"
                          class="at-settings-choice${(current.sound?.typing ?? 'auto') === 'auto' ? ' active' : ''}"
                          style="flex: 1; margin-right: 8px;"
                          role="radio"
                          aria-checked="${(current.sound?.typing ?? 'auto') === 'auto'}"
                          data-sound-typing="auto">
                    Automático (pela fonte do texto)
                  </button>
                  <button type="button" class="at-btn is-sm sound-preview-btn" data-sound-preview="typing-auto">
                    Ouvir exemplo
                  </button>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <button type="button"
                          class="at-settings-choice${current.sound?.typing === 'typewriter' ? ' active' : ''}"
                          style="flex: 1; margin-right: 8px;"
                          role="radio"
                          aria-checked="${current.sound?.typing === 'typewriter'}"
                          data-sound-typing="typewriter">
                    Máquina de escrever
                  </button>
                  <button type="button" class="at-btn is-sm sound-preview-btn" data-sound-preview="typing-typewriter">
                    Ouvir exemplo
                  </button>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <button type="button"
                          class="at-settings-choice${current.sound?.typing === 'pen' ? ' active' : ''}"
                          style="flex: 1; margin-right: 8px;"
                          role="radio"
                          aria-checked="${current.sound?.typing === 'pen'}"
                          data-sound-typing="pen">
                    Caneta / Lápis
                  </button>
                  <button type="button" class="at-btn is-sm sound-preview-btn" data-sound-preview="typing-pen">
                    Ouvir exemplo
                  </button>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <button type="button"
                          class="at-settings-choice${current.sound?.typing === 'off' ? ' active' : ''}"
                          style="flex: 1; margin-right: 8px;"
                          role="radio"
                          aria-checked="${current.sound?.typing === 'off'}"
                          data-sound-typing="off">
                    Desligado (digitação silenciosa)
                  </button>
                </div>
              </div>
            </div>

            <div style="margin-top: 12px;">
              <div class="at-settings-row">
                <label class="at-settings-check">
                  <input type="checkbox" id="setting-sound-ambient" ${current.sound?.ambient ? 'checked' : ''} />
                  <span>Zumbido elétrico quando a lâmpada UV estiver acesa</span>
                </label>
                <button type="button" class="at-btn is-sm sound-preview-btn" data-sound-preview="ambient">
                  Ouvir exemplo
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="at-settings-section">
          <label class="at-settings-label">Unidades de medida</label>
          <div class="at-settings-choices" role="radiogroup" aria-label="Unidades de medida">
            <button type="button"
                    class="at-settings-choice${current.unit === 'px' ? ' active' : ''}"
                    role="radio"
                    aria-checked="${current.unit === 'px'}"
                    data-unit="px">
              Pixels (px)
            </button>
            <button type="button"
                    class="at-settings-choice${current.unit === 'mm' ? ' active' : ''}"
                    role="radio"
                    aria-checked="${current.unit === 'mm'}"
                    data-unit="mm">
              Milímetros (mm)
            </button>
          </div>
        </section>

        <section class="at-settings-section">
          <label class="at-settings-label">Armazenamento e cópia de segurança</label>
          <p class="at-settings-desc" id="setting-storage-estimate" style="font-size:12px; color:var(--text-muted, #888); margin:4px 0 8px;">
            Armazenamento local neste navegador.
          </p>
          <div class="at-settings-actions" style="display:flex; gap:8px;">
            <button type="button" class="at-btn" id="setting-backup-export" data-action="backup-export">
              Exportar tudo
            </button>
            <button type="button" class="at-btn" id="setting-backup-import" data-action="backup-import">
              Importar
            </button>
            <input type="file" id="setting-backup-file-input" accept=".json,application/json" style="display:none;" />
          </div>
          <span class="at-settings-feedback" id="setting-backup-feedback" style="display:none; margin-top:6px; font-size:12px; color:var(--text-muted, #888);"></span>
        </section>

        <section class="at-settings-section" id="setting-expansions-section">
          <label class="at-settings-label">Expansões neste navegador</label>
          <p class="at-settings-desc" style="font-size:12px; color:var(--text-muted, #888); margin:4px 0 8px;">
            Adicione pacotes de modelos e elementos salvos no seu computador. Os arquivos ficam armazenados exclusivamente no banco de dados local deste navegador.
          </p>
          <div id="setting-expansions-list" class="at-expansions-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:8px;"></div>
          <div class="at-settings-actions" style="display:flex; gap:8px;">
            <button type="button" class="at-btn" id="setting-install-expansion-btn" data-action="install-expansion">
              Instalar expansão deste computador…
            </button>
            <input type="file" id="setting-expansion-folder-input" webkitdirectory directory multiple style="display:none;" />
          </div>
        </section>
      </div>

      <div class="at-settings-footer">
        <button type="button" class="at-btn is-primary" data-close-settings>Concluir</button>
      </div>
    </div>
  `;

  document.body.appendChild(settingsModal);

  // Event handlers
  const close = () => {
    if (settingsModal) {
      window.removeEventListener('keydown', onKeyDown);
      settingsModal.remove();
      settingsModal = null;
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  settingsModal.querySelectorAll('[data-close-settings]').forEach(el => {
    el.addEventListener('click', close);
  });

  // Material selection
  settingsModal.querySelectorAll('[data-material]').forEach(btn => {
    btn.addEventListener('click', () => {
      settingsModal.querySelectorAll('[data-material]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      saveSettings({ deskMaterial: btn.dataset.material });
    });
  });

  // Temperature selection
  settingsModal.querySelectorAll('[data-temp]').forEach(btn => {
    btn.addEventListener('click', () => {
      settingsModal.querySelectorAll('[data-temp]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      saveSettings({ lampTemperature: btn.dataset.temp });
    });
  });

  // Intensity slider
  const slider = settingsModal.querySelector('#setting-lamp-intensity');
  const valLabel = settingsModal.querySelector('#setting-lamp-value');
  const updateSliderProgress = () => {
    if (slider) slider.style.setProperty('--range-progress', `${slider.value}%`);
  };
  updateSliderProgress();
  slider?.addEventListener('input', () => {
    valLabel.textContent = `${slider.value}%`;
    updateSliderProgress();
    saveSettings({ lampIntensity: Number(slider.value) });
  });

  // Reduce motion
  const motionCheck = settingsModal.querySelector('#setting-reduce-motion');
  motionCheck?.addEventListener('change', () => {
    saveSettings({ reduceMotion: motionCheck.checked });
  });

  // Stamps land a little crooked
  const tiltCheck = settingsModal.querySelector('#setting-tilt-stamps');
  tiltCheck?.addEventListener('change', () => {
    saveSettings({ tiltStamps: tiltCheck.checked });
  });

  // Share with Tabletop
  const shareCheck = settingsModal.querySelector('#setting-share-tabletop');
  shareCheck?.addEventListener('change', () => {
    const enabled = shareCheck.checked;
    saveSettings({ shareWithTabletop: enabled });
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('atelie:share-tabletop-changed', { detail: { enabled } }));
    }
  });

  // Sound enabled
  const soundEnabledCheck = settingsModal.querySelector('#setting-sound-enabled');
  const soundOptionsEl = settingsModal.querySelector('#setting-sound-options');
  soundEnabledCheck?.addEventListener('change', () => {
    const enabled = soundEnabledCheck.checked;
    if (soundOptionsEl) soundOptionsEl.style.opacity = enabled ? '1' : '0.55';
    saveSettings({ sound: { enabled } });
  });

  // Sound volume
  const soundVolSlider = settingsModal.querySelector('#setting-sound-volume');
  const soundVolLabel = settingsModal.querySelector('#setting-sound-volume-val');
  soundVolSlider?.addEventListener('input', () => {
    const val = Number(soundVolSlider.value);
    if (soundVolLabel) soundVolLabel.textContent = `${val}%`;
    soundVolSlider.style.setProperty('--range-progress', `${val}%`);
    saveSettings({ sound: { volume: val } });
  });

  // Sound typing choice
  settingsModal.querySelectorAll('[data-sound-typing]').forEach(btn => {
    btn.addEventListener('click', () => {
      settingsModal.querySelectorAll('[data-sound-typing]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      saveSettings({ sound: { typing: btn.dataset.soundTyping } });
    });
  });

  // Sound ambient
  const soundAmbientCheck = settingsModal.querySelector('#setting-sound-ambient');
  soundAmbientCheck?.addEventListener('change', () => {
    saveSettings({ sound: { ambient: soundAmbientCheck.checked } });
  });

  // Preview buttons ("Ouvir exemplo")
  settingsModal.querySelectorAll('[data-sound-preview]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.soundPreview;
      const soundApi = (typeof window !== 'undefined' && window.__atelieSound) || null;
      if (!soundApi) return;

      if (type === 'master' || type === 'volume') {
        soundApi.play('stamp', { preview: true });
      } else if (type === 'typing-typewriter') {
        soundApi.play('type', { preview: true, forceVoice: 'typewriter', key: 'a' });
        setTimeout(() => soundApi.play('type', { preview: true, forceVoice: 'typewriter', key: ' ' }), 60);
        setTimeout(() => soundApi.play('type', { preview: true, forceVoice: 'typewriter', key: 'Enter' }), 140);
      } else if (type === 'typing-pen') {
        soundApi.play('type', { preview: true, forceVoice: 'pen' });
        setTimeout(() => soundApi.play('type', { preview: true, forceVoice: 'pen' }), 70);
      } else if (type === 'typing-auto') {
        soundApi.play('type', { preview: true, forceVoice: 'typewriter', key: 'x' });
        setTimeout(() => soundApi.play('type', { preview: true, forceVoice: 'pen' }), 80);
      } else if (type === 'ambient') {
        soundApi.play('uv-toggle', { preview: true, on: true });
        setTimeout(() => {
          soundApi.play('uv-toggle', { preview: true, on: false });
        }, 1200);
      }
    });
  });

  // Unit selection
  settingsModal.querySelectorAll('[data-unit]').forEach(btn => {
    btn.addEventListener('click', () => {
      settingsModal.querySelectorAll('[data-unit]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      saveSettings({ unit: btn.dataset.unit });
    });
  });

  // Storage estimate
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
    navigator.storage.estimate().then(estimate => {
      const el = settingsModal?.querySelector('#setting-storage-estimate');
      if (!el) return;
      const usageMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
      const quotaMB = estimate.quota ? ((estimate.quota || 0) / (1024 * 1024)).toFixed(0) : null;
      el.textContent = quotaMB
        ? `Espaço usado: ${usageMB} MB de ${quotaMB} MB disponíveis neste navegador.`
        : `Espaço usado: ${usageMB} MB neste navegador.`;
    }).catch(() => {});
  }

  // Backup Export
  const exportBtn = settingsModal.querySelector('#setting-backup-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      exportBtn.disabled = true;
      exportBtn.textContent = 'Exportando...';
      try {
        const api = window.__atelie?.api;
        if (!api) throw new Error('API não disponível no momento.');
        const data = await exportBackup(api);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `atelie-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Falha ao exportar cópia de segurança: ${err.message}`);
      } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = 'Exportar tudo';
      }
    });
  }

  // Backup Import
  const importBtn = settingsModal.querySelector('#setting-backup-import');
  const fileInput = settingsModal.querySelector('#setting-backup-file-input');
  const feedbackEl = settingsModal.querySelector('#setting-backup-feedback');

  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => {
      fileInput.value = '';
      fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      importBtn.disabled = true;
      importBtn.textContent = 'Importando...';
      try {
        const api = window.__atelie?.api;
        if (!api) throw new Error('API não disponível no momento.');
        const text = await file.text();
        const res = await importBackup(api, text);
        const msg = `Cópia importada! ${res.importedHandouts} documento(s) importado(s)${res.skippedHandouts ? `, ${res.skippedHandouts} ignorado(s) por já estarem mais atualizados` : ''}.`;
        if (feedbackEl) {
          feedbackEl.textContent = msg;
          feedbackEl.style.display = 'block';
        }
        if (window.__atelie?.navigator?.refresh) {
          window.__atelie.navigator.refresh();
        }
      } catch (err) {
        alert(`Falha ao importar backup: ${err.message}`);
      } finally {
        importBtn.disabled = false;
        importBtn.textContent = 'Importar';
      }
    });
  }

  // Browser Expansions Wiring
  const expansionsListEl = settingsModal.querySelector('#setting-expansions-list');
  const installExpBtn = settingsModal.querySelector('#setting-install-expansion-btn');
  const expFolderInput = settingsModal.querySelector('#setting-expansion-folder-input');

  const refreshExpansionsList = async () => {
    if (!expansionsListEl) return;
    const api = window.__atelie?.api;
    if (!api?.expansions) {
      expansionsListEl.innerHTML = `<span style="font-size:12px; color:var(--text-muted, #888); font-style:italic;">Expansões locais não disponíveis neste modo.</span>`;
      return;
    }

    try {
      const list = await api.expansions.list();
      if (!list || list.length === 0) {
        expansionsListEl.innerHTML = `<span style="font-size:12px; color:var(--text-muted, #888); font-style:italic;">Nenhuma expansão instalada neste navegador.</span>`;
        return;
      }

      expansionsListEl.innerHTML = list.map(exp => `
        <div class="at-expansion-card-item" data-exp-id="${esc(exp.id)}" style="display:flex; align-items:center; justify-content:space-between; background:var(--at-desk-3, #24201c); border:1px solid var(--at-line, #3a332c); border-radius:6px; padding:8px 12px;">
          <div class="at-expansion-card-info" style="display:flex; flex-direction:column; gap:2px;">
            <strong style="font-size:12.5px; color:#fff;">${esc(exp.name || exp.id)}</strong>
            <span style="font-size:11px; color:var(--at-muted, #888);">
              ${exp.itemCount || 0} itens · ~${((exp.totalBytes || 0) / (1024 * 1024)).toFixed(1)} MB
              ${exp.license ? ` · ${esc(exp.license)}` : ''}
            </span>
          </div>
          <div class="at-expansion-card-actions" style="display:flex; gap:6px;">
            <button type="button" class="at-btn at-btn-sm" data-action="update-expansion" data-exp-id="${esc(exp.id)}" style="padding:4px 8px; font-size:11px;">
              Atualizar
            </button>
            <button type="button" class="at-btn at-btn-sm" data-action="remove-expansion" data-exp-id="${esc(exp.id)}" style="padding:4px 8px; font-size:11px; color:#ff6e75;">
              Remover
            </button>
          </div>
        </div>
      `).join('');

      // Wire update and remove buttons
      expansionsListEl.querySelectorAll('[data-action="remove-expansion"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const expId = btn.dataset.expId;
          if (!confirm(`Deseja realmente remover esta expansão e todos os seus arquivos do navegador?`)) return;
          btn.disabled = true;
          try {
            await api.expansions.remove(expId);
            await refreshExpansionsList();
            if (window.__atelie?.refreshLibrary) window.__atelie.refreshLibrary();
          } catch (err) {
            alert(`Falha ao remover expansão: ${err.message}`);
          }
        });
      });

      expansionsListEl.querySelectorAll('[data-action="update-expansion"]').forEach(btn => {
        btn.addEventListener('click', () => {
          installExpBtn?.click();
        });
      });
    } catch (err) {
      expansionsListEl.innerHTML = `<span style="font-size:12px; color:#ff6e75;">Erro ao carregar expansões: ${esc(err.message)}</span>`;
    }
  };

  refreshExpansionsList();

  if (installExpBtn && expFolderInput) {
    installExpBtn.addEventListener('click', () => {
      const api = window.__atelie?.api;
      pickAndInstallExpansion({
        api,
        inputElement: expFolderInput,
        onComplete: async () => {
          await refreshExpansionsList();
          if (window.__atelie?.refreshLibrary) window.__atelie.refreshLibrary();
        },
      });
    });

    expFolderInput.addEventListener('change', async () => {
      const files = expFolderInput.files;
      if (!files || files.length === 0) return;
      try {
        const { expansionJson, libraryJson, filesMap } = await readFolderFromFileList(files);
        const api = window.__atelie?.api;
        await openExpansionInstallDialog({
          expansionJson,
          libraryJson,
          filesMap,
          api,
          onComplete: async () => {
            await refreshExpansionsList();
            if (window.__atelie?.refreshLibrary) window.__atelie.refreshLibrary();
          },
        });
      } catch (err) {
        alert(`Erro ao ler pasta selecionada: ${err.message}`);
      }
    });
  }
}
