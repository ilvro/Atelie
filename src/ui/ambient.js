/**
 * Ambient lighting of the desk (Fase 13): how the room around the document is lit.
 * lamp (default), candle, flashlight (a beam that follows the cursor), uv, studio.
 * Each mode is its own overlay layer; switching crossfades the layers (opacity only), in both directions.
 * The overlay lives in CSS (gradients on GPU layers), so the document canvas is never redrawn.
 */

export const AMBIENT_MODES = [
  { id: 'lamp', label: 'Luminária de bancada', hint: 'Foco suave sobre o documento' },
  { id: 'candle', label: 'À luz de velas', hint: 'Âmbar, com a chama tremulando' },
  { id: 'flashlight', label: 'Lanterna de inspeção', hint: 'Feixe que segue o cursor · Shift + roda muda a abertura' },
  { id: 'uv', label: 'Luz negra (UV)', hint: 'Tintas fluorescentes e marcas d’água' },
  { id: 'studio', label: 'Luz plana de estúdio', hint: 'Uniforme e sem sombras' },
];

const STORAGE_KEY = 'atelie-ambient';
const MIN_BEAM = 70;
const MAX_BEAM = 420;

export function isAmbientMode(id) {
  return AMBIENT_MODES.some(m => m.id === id);
}

export function clampBeam(radius) {
  return Math.max(MIN_BEAM, Math.min(MAX_BEAM, Math.round(radius)));
}

export function loadAmbient() {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return isAmbientMode(id) && id !== 'uv' ? id : 'lamp';
  } catch {
    return 'lamp';
  }
}

/**
 * `container` is the stage container (positioned). `onSelect(mode)` is called when the person picks a mode;
 * the owner decides what it means (UV also turns the document's UV light on).
 */
export function createAmbient(container, { onSelect, shortcutLabel = () => '' } = {}) {
  const root = document.documentElement;
  const layers = document.createElement('div');
  layers.className = 'ambient-layers';
  layers.setAttribute('aria-hidden', 'true');
  layers.innerHTML = AMBIENT_MODES.map(m => `<div class="ambient-layer" data-ambient-layer="${m.id}"></div>`).join('');
  container.appendChild(layers);

  const wrap = document.createElement('div');
  wrap.className = 'ambient-control';
  wrap.innerHTML = `
    <button type="button" class="ambient-btn" aria-haspopup="menu" aria-expanded="false" title="Iluminação da mesa${shortcutLabel() ? ` (${shortcutLabel()})` : ''}">
      <span class="ambient-btn-icon" aria-hidden="true">☀</span><span class="ambient-btn-label">Luminária</span>
    </button>
    <div class="ambient-menu" role="menu" hidden>
      ${AMBIENT_MODES.map(m => `<button type="button" class="ambient-item" role="menuitemradio" aria-checked="false" data-ambient="${m.id}"><strong>${m.label}</strong><small>${m.hint}</small></button>`).join('')}
    </div>`;
  container.appendChild(wrap);

  const btn = wrap.querySelector('.ambient-btn');
  const menu = wrap.querySelector('.ambient-menu');
  let current = 'lamp';
  let beam = 190;

  function openMenu(open) {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }

  btn.addEventListener('click', () => openMenu(menu.hidden));
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !wrap.contains(e.target)) openMenu(false);
  });
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-ambient]');
    if (!item) return;
    openMenu(false);
    onSelect?.(item.dataset.ambient);
  });

  function apply(mode) {
    if (!isAmbientMode(mode)) return;
    current = mode;
    root.dataset.ambient = mode;
    layers.querySelectorAll('.ambient-layer').forEach(el => el.classList.toggle('is-on', el.dataset.ambientLayer === mode));
    const meta = AMBIENT_MODES.find(m => m.id === mode);
    btn.querySelector('.ambient-btn-label').textContent = meta.label.split(' ')[0] === 'À' ? 'Velas' : meta.label.split(' ')[0];
    menu.querySelectorAll('[data-ambient]').forEach(el => el.setAttribute('aria-checked', String(el.dataset.ambient === mode)));
    if (mode !== 'uv') {
      try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
    }
  }

  // Flashlight: the beam follows the cursor over the stage; Shift + wheel changes the opening
  container.addEventListener('pointermove', (e) => {
    if (current !== 'flashlight') return;
    const r = container.getBoundingClientRect();
    layers.style.setProperty('--beam-x', `${e.clientX - r.left}px`);
    layers.style.setProperty('--beam-y', `${e.clientY - r.top}px`);
  });
  container.addEventListener('wheel', (e) => {
    if (current !== 'flashlight' || !e.shiftKey) return;
    e.preventDefault();
    beam = clampBeam(beam + (e.deltaY < 0 ? 20 : -20));
    layers.style.setProperty('--beam-r', `${beam}px`);
  }, { passive: false });
  layers.style.setProperty('--beam-r', `${beam}px`);

  apply(loadAmbient());

  return {
    get mode() { return current; },
    apply,
    /** The beam opening in px (for tests). */
    get beam() { return beam; },
    setShortcutLabel(text) {
      btn.title = `Iluminação da mesa${text ? ` (${text})` : ''}`;
    },
    cycle(direction = 1) {
      const ids = AMBIENT_MODES.map(m => m.id);
      onSelect?.(ids[(ids.indexOf(current) + direction + ids.length) % ids.length]);
    },
  };
}
