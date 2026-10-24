import { escapeHTML as esc, icon as renderIcon } from './icons.js';

const STORAGE_KEY = 'atelie-settings';

const LAMP_COLORS = {
  quente: '#f2c58a',
  neutra: '#f8e9d2',
  vela: '#e28a45',
};

const DESK_COLORS = {
  madeira: '#131110',
  feltro: '#111a14',
  couro: '#191412',
  concreto: '#18191c',
  preto: '#0e0e11',
};

export const DEFAULT_SETTINGS = {
  deskMaterial: 'madeira',
  lampIntensity: 100,
  lampTemperature: 'quente',
  reduceMotion: false,
  unit: 'px',
};

export function getSettings() {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(updates) {
  const current = getSettings();
  const next = { ...current, ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Failed to save settings:', err);
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
}

let settingsModal = null;

export function openSettingsModal() {
  if (settingsModal) return;

  const current = getSettings();

  settingsModal = document.createElement('div');
  settingsModal.className = 'at-settings-modal';
  settingsModal.id = 'at-settings-modal';

  const materials = [
    ['madeira', 'Madeira escura'],
    ['feltro', 'Feltro verde'],
    ['couro', 'Couro'],
    ['concreto', 'Concreto'],
    ['preto', 'Preto liso'],
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
                 class="at-settings-slider" />
        </section>

        <section class="at-settings-section">
          <label class="at-settings-check">
            <input type="checkbox" id="setting-reduce-motion" ${current.reduceMotion ? 'checked' : ''} />
            <span>Reduzir animações (além do sistema)</span>
          </label>
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
  slider?.addEventListener('input', () => {
    valLabel.textContent = `${slider.value}%`;
    saveSettings({ lampIntensity: Number(slider.value) });
  });

  // Reduce motion
  const motionCheck = settingsModal.querySelector('#setting-reduce-motion');
  motionCheck?.addEventListener('change', () => {
    saveSettings({ reduceMotion: motionCheck.checked });
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
}
