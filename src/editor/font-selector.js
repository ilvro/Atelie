import { escapeHTML as esc } from '../ui/icons.js';

let cachedLibraryFonts = null;

export async function getLibraryFonts(api) {
  if (cachedLibraryFonts) return cachedLibraryFonts;
  try {
    const res = await api?.library?.list();
    const items = res?.items || [];
    cachedLibraryFonts = items.filter(it => it.kind === 'font');
    return cachedLibraryFonts;
  } catch (err) {
    console.warn('[atelie] Erro ao carregar fontes da biblioteca:', err);
    return [];
  }
}

/** Forget the cached list (a font was added or removed). */
export function clearLibraryFontsCache() {
  cachedLibraryFonts = null;
}

export function getCachedFont(familyOrId) {
  if (!cachedLibraryFonts) return null;
  return cachedLibraryFonts.find(f => f.family === familyOrId || f.id === familyOrId) || null;
}

export function getRecentFonts() {
  try {
    return JSON.parse(localStorage.getItem('atelie-recent-fonts') || '[]');
  } catch {
    return [];
  }
}

export function saveRecentFont(family) {
  if (!family) return;
  try {
    const list = getRecentFonts().filter(f => f !== family);
    list.unshift(family);
    localStorage.setItem('atelie-recent-fonts', JSON.stringify(list.slice(0, 5)));
  } catch {}
}

const CATEGORY_ORDER = [
  'Máquina de escrever',
  'Letra à mão',
  'Caligrafia formal',
  'Marcador',
  'Impressão antiga',
  'Jornal e cartaz',
  'Gótica',
  'Estêncil e militar',
  'Tela de computador',
  'Interface moderna',
  'Código de barras',
];

/**
 * Mounts the custom font selector inside container.
 */
export function mountFontSelector(container, { currentFont, onSelect, api, fonts, disabled = false }) {
  const currentFamily = currentFont?.family || 'Courier Prime';

  container.innerHTML = `
    <div class="font-select-wrapper">
      <button type="button" class="font-select-trigger" ${disabled ? 'disabled' : ''} aria-haspopup="listbox" aria-expanded="false">
        <span class="font-select-current" style="font-family: '${esc(currentFamily)}', sans-serif;">${esc(currentFamily)}</span>
        <span class="font-select-arrow">▾</span>
      </button>
      <select data-field="h:text.font.family" class="font-native-select" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;" tabindex="-1" aria-hidden="true" ${disabled ? 'disabled' : ''}>
        <option value="${esc(currentFamily)}" selected>${esc(currentFamily)}</option>
      </select>
    </div>
  `;

  // Asynchronously populate options in native select for compatibility
  getLibraryFonts(api).then(allFonts => {
    const select = container.querySelector('select[data-field="h:text.font.family"]');
    if (!select) return;

    const seenFamilies = new Set();
    const optionsHTML = [];
    for (const f of allFonts) {
      if (!seenFamilies.has(f.family)) {
        seenFamilies.add(f.family);
        optionsHTML.push(`<option value="${esc(f.family)}" ${f.family === currentFamily ? 'selected' : ''}>${esc(f.family)}</option>`);
      }
    }
    if (!seenFamilies.has(currentFamily)) {
      optionsHTML.unshift(`<option value="${esc(currentFamily)}" selected>${esc(currentFamily)}</option>`);
    }
    select.innerHTML = optionsHTML.join('');
  });

  if (disabled) return;

  const trigger = container.querySelector('.font-select-trigger');
  const nativeSelect = container.querySelector('select[data-field="h:text.font.family"]');

  // If programmatic change on native select happens (e.g. from tests)
  nativeSelect.addEventListener('change', async (e) => {
    const newFamily = e.target.value;
    const allFonts = await getLibraryFonts(api);
    const found = allFonts.find(f => f.family === newFamily) || { family: newFamily, id: '' };

    container.querySelector('.font-select-current').textContent = newFamily;
    container.querySelector('.font-select-current').style.fontFamily = `'${newFamily}', sans-serif`;

    if (fonts && found.id) {
      fonts.load({ library: found.id, family: found.family, weight: found.weight, italic: found.style === 'italic' }).catch(() => {});
    }

    if (typeof onSelect === 'function') {
      onSelect(found);
    }
  });

  let popover = null;
  let observer = null;

  function closePopover() {
    if (popover) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      popover.remove();
      popover = null;
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onDocKey);
    }
  }

  function onDocPointer(e) {
    if (popover && !popover.contains(e.target) && !trigger.contains(e.target)) {
      closePopover();
    }
  }

  function onDocKey(e) {
    if (e.key === 'Escape') {
      closePopover();
    }
  }

  trigger.addEventListener('click', async (e) => {
    e.preventDefault();
    if (popover) {
      closePopover();
      return;
    }

    const allFonts = await getLibraryFonts(api);
    trigger.setAttribute('aria-expanded', 'true');

    // Create popover menu
    popover = document.createElement('div');
    popover.className = 'font-select-popover';
    popover.setAttribute('role', 'listbox');

    // Deduplicate by family name for display
    const familyMap = new Map();
    for (const f of allFonts) {
      if (!familyMap.has(f.family)) {
        familyMap.set(f.family, f);
      }
    }
    const uniqueFamilies = Array.from(familyMap.values());

    const recentNames = getRecentFonts();
    const recentFonts = recentNames
      .map(name => uniqueFamilies.find(f => f.family === name))
      .filter(Boolean);

    // Group fonts by category
    const byCategory = new Map();
    for (const cat of CATEGORY_ORDER) {
      byCategory.set(cat, []);
    }
    for (const f of uniqueFamilies) {
      const cat = f.category || 'Outras';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat).push(f);
    }

    let popoverHTML = `
      <div class="font-search-wrap">
        <input type="search" class="font-search-input" placeholder="Buscar fonte..." autocomplete="off" spellcheck="false" />
      </div>
      <div class="font-list-scroll">
    `;

    // 1. Recents section
    if (recentFonts.length > 0) {
      popoverHTML += `
        <div class="font-group" data-group="recent">
          <div class="font-group-title">Usadas recentemente</div>
          ${recentFonts.map(f => renderFontItem(f)).join('')}
        </div>
      `;
    }

    // 2. Categories
    for (const [cat, list] of byCategory.entries()) {
      if (list.length === 0) continue;
      popoverHTML += `
        <div class="font-group" data-group="${esc(cat)}">
          <div class="font-group-title">${esc(cat)}</div>
          ${list.map(f => renderFontItem(f)).join('')}
        </div>
      `;
    }

    popoverHTML += '</div>';
    popover.innerHTML = popoverHTML;
    document.body.appendChild(popover);

    // Position popover
    const rect = trigger.getBoundingClientRect();
    const popW = Math.max(rect.width, 270);
    popover.style.width = `${popW}px`;
    popover.style.left = `${Math.min(window.innerWidth - popW - 12, Math.max(12, rect.left))}px`;

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    if (spaceBelow < 280 && rect.top > 280) {
      popover.style.bottom = `${window.innerHeight - rect.top + 4}px`;
      popover.style.top = 'auto';
    } else {
      popover.style.top = `${rect.bottom + 4}px`;
      popover.style.bottom = 'auto';
    }

    const searchInput = popover.querySelector('.font-search-input');
    searchInput.focus();

    // IntersectionObserver for lazy loading fonts
    if (fonts && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const btn = entry.target;
            const libId = btn.dataset.library;
            const fam = btn.dataset.family;
            const weight = Number(btn.dataset.weight || 400);
            const italic = btn.dataset.style === 'italic';

            fonts.load({ library: libId, family: fam, weight, italic }).catch(() => {});
            observer.unobserve(btn);
          }
        }
      }, { root: popover.querySelector('.font-list-scroll'), rootMargin: '80px' });

      popover.querySelectorAll('.font-item-btn').forEach(btn => observer.observe(btn));
    } else if (fonts) {
      uniqueFamilies.forEach(f => {
        fonts.load({ library: f.id, family: f.family, weight: f.weight, italic: f.style === 'italic' }).catch(() => {});
      });
    }

    // Search filter
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const groups = popover.querySelectorAll('.font-group');

      for (const group of groups) {
        let visibleInGroup = 0;
        const items = group.querySelectorAll('.font-item-btn');
        for (const item of items) {
          const fam = item.dataset.family.toLowerCase();
          const cat = (item.dataset.category || '').toLowerCase();
          const match = fam.includes(q) || cat.includes(q);
          item.style.display = match ? 'flex' : 'none';
          if (match) visibleInGroup++;
        }
        group.style.display = visibleInGroup > 0 ? 'block' : 'none';
      }
    });

    // Font item selection
    popover.addEventListener('click', (e) => {
      const btn = e.target.closest('.font-item-btn');
      if (!btn) return;

      const selectedFamily = btn.dataset.family;
      const selectedLibId = btn.dataset.library;
      const selectedFont = allFonts.find(f => f.id === selectedLibId) || { family: selectedFamily, id: selectedLibId };

      saveRecentFont(selectedFamily);

      container.querySelector('.font-select-current').textContent = selectedFamily;
      container.querySelector('.font-select-current').style.fontFamily = `'${selectedFamily}', sans-serif`;

      const select = container.querySelector('select[data-field="h:text.font.family"]');
      if (select) {
        select.value = selectedFamily;
      }

      closePopover();

      if (typeof onSelect === 'function') {
        onSelect(selectedFont);
      }
    });

    setTimeout(() => {
      document.addEventListener('pointerdown', onDocPointer);
      document.addEventListener('keydown', onDocKey);
    }, 10);
  });
}

function renderFontItem(font) {
  return `
    <button type="button" class="font-item-btn" role="option" data-family="${esc(font.family)}" data-library="${esc(font.id)}" data-weight="${font.weight || 400}" data-style="${esc(font.style || 'normal')}" data-category="${esc(font.category || '')}">
      <span class="font-item-name" style="font-family: '${esc(font.family)}', sans-serif;">${esc(font.family)}</span>
      ${font.variable ? '<span class="font-tag-var">var</span>' : ''}
    </button>
  `;
}

