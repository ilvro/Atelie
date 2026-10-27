import { escapeHTML as esc, icon as renderIcon } from './icons.js';
import { matches } from './keymap.js';

export function normalizeText(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesWords(targetText, query) {
  const normTarget = normalizeText(targetText);
  const normQuery = normalizeText(query);
  if (!normQuery) return true;
  const words = normQuery.split(/\s+/).filter(Boolean);
  return words.every(word => normTarget.includes(word));
}

const providers = new Set();
let modalElement = null;
let activeIndex = 0;
let currentResults = [];

export const palette = {
  register(provider) {
    providers.add(provider);
    return () => providers.delete(provider);
  },

  unregister(provider) {
    providers.delete(provider);
  },

  search(query = '') {
    const all = [];
    for (const provider of providers) {
      try {
        const items = typeof provider === 'function' ? provider(query) : provider;
        if (Array.isArray(items)) {
          all.push(...items);
        }
      } catch (err) {
        console.error('Error in palette provider:', err);
      }
    }
    return all.filter(item => {
      const searchTarget = `${item.title || item.label || ''} ${item.subtitle || item.category || ''} ${item.group || ''}`;
      return matchesWords(searchTarget, query);
    });
  },

  open() {
    if (modalElement) return;

    modalElement = document.createElement('div');
    modalElement.className = 'at-palette-modal';
    modalElement.id = 'at-palette-modal';

    modalElement.innerHTML = `
      <div class="at-palette-backdrop" data-close-palette></div>
      <div class="at-palette-card" role="dialog" aria-modal="true" aria-label="Paleta de Comandos">
        <div class="at-palette-header">
          <span class="at-palette-search-icon">${renderIcon('search', 18)}</span>
          <input type="text"
                 class="at-palette-input"
                 id="at-palette-input"
                 placeholder="Digite um comando ou busque no Ateliê..."
                 autocomplete="off"
                 spellcheck="false" />
          <button type="button" class="at-icon-btn" data-close-palette aria-label="Fechar paleta">${renderIcon('close', 16)}</button>
        </div>
        <div class="at-palette-results" id="at-palette-results" role="listbox"></div>
        <div class="at-palette-footer">
          <div class="at-palette-hints">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navegar</span>
            <span><kbd>↵</kbd> Executar</span>
            <span><kbd>Esc</kbd> Fechar</span>
          </div>
          <span class="at-palette-count" id="at-palette-count"></span>
        </div>
      </div>
    `;

    document.body.appendChild(modalElement);

    const input = modalElement.querySelector('#at-palette-input');
    const resultsContainer = modalElement.querySelector('#at-palette-results');
    const countElement = modalElement.querySelector('#at-palette-count');

    const updateView = () => {
      const query = input.value;
      currentResults = this.search(query);
      if (activeIndex >= currentResults.length) activeIndex = 0;
      if (activeIndex < 0) activeIndex = Math.max(0, currentResults.length - 1);

      countElement.textContent = `${currentResults.length} resultado${currentResults.length === 1 ? '' : 's'}`;

      if (currentResults.length === 0) {
        resultsContainer.innerHTML = `
          <div class="at-palette-empty">Nenhum comando ou documento encontrado</div>
        `;
        return;
      }

      resultsContainer.innerHTML = currentResults.map((item, idx) => {
        const iconSvg = item.icon ? renderIcon(item.icon, 16) : renderIcon('doc', 16);
        const activeClass = idx === activeIndex ? ' active' : '';
        const keyVal = item.key || item.hint;
        const keyTag = keyVal ? `<kbd class="at-palette-item-key">${esc(keyVal)}</kbd>` : '';
        const subtitleTag = item.subtitle ? `<span class="at-palette-item-sub">${esc(item.subtitle)}</span>` : '';
        const titleText = item.title || item.label || '';
        return `
          <div class="at-palette-item${activeClass}" role="option" aria-selected="${idx === activeIndex}" data-index="${idx}">
            <span class="at-palette-item-icon">${iconSvg}</span>
            <div class="at-palette-item-content">
              <span class="at-palette-item-title">${esc(titleText)}</span>
              ${subtitleTag}
            </div>
            ${keyTag}
          </div>
        `;
      }).join('');

      const activeEl = resultsContainer.querySelector('.at-palette-item.active');
      activeEl?.scrollIntoView({ block: 'nearest' });
    };

    input.addEventListener('input', () => {
      activeIndex = 0;
      updateView();
    });

    const executeItem = (idx) => {
      const item = currentResults[idx];
      if (item) {
        this.close();
        if (typeof item.run === 'function') {
          item.run();
        }
      }
    };

    resultsContainer.addEventListener('click', (e) => {
      const itemEl = e.target.closest('.at-palette-item');
      if (itemEl && itemEl.dataset.index !== undefined) {
        executeItem(Number(itemEl.dataset.index));
      }
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentResults.length > 0) {
          activeIndex = (activeIndex + 1) % currentResults.length;
          updateView();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentResults.length > 0) {
          activeIndex = (activeIndex - 1 + currentResults.length) % currentResults.length;
          updateView();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentResults.length > 0) {
          executeItem(activeIndex);
        }
      }
    };

    modalElement.addEventListener('keydown', onKeyDown);
    modalElement.querySelectorAll('[data-close-palette]').forEach(el => {
      el.addEventListener('click', () => this.close());
    });

    updateView();
    input.focus();
  },

  close() {
    if (modalElement) {
      modalElement.remove();
      modalElement = null;
    }
  },

  toggle() {
    if (modalElement) this.close();
    else this.open();
  },

  isOpen() {
    return modalElement !== null;
  }
};

// Global Ctrl+K / Cmd+K listener
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (matches(e, 'palette')) {
      e.preventDefault();
      palette.toggle();
    }
  });
}

