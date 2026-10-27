import { escapeHTML as esc, icon as renderIcon } from './icons.js';

let activeMenu = null;
let cleanupHandlers = null;

export const contextMenu = {
  open({ x, y, items = [] }) {
    this.close();

    const menu = document.createElement('div');
    menu.className = 'at-context-menu';
    menu.setAttribute('role', 'menu');

    let html = '';
    items.forEach((item, index) => {
      if (item === 'separator') {
        html += '<div class="at-context-menu-separator" role="separator"></div>';
      } else {
        const itemIcon = item.icon ? renderIcon(item.icon, 14) : '';
        const dangerClass = item.danger ? ' is-danger' : '';
        const keyTag = item.key ? `<kbd class="at-context-menu-key">${esc(item.key)}</kbd>` : '';
        html += `
          <button type="button" class="at-context-menu-item${dangerClass}" role="menuitem" data-index="${index}">
            <span class="at-context-menu-icon">${itemIcon}</span>
            <span class="at-context-menu-label">${esc(item.label)}</span>
            ${keyTag}
          </button>
        `;
      }
    });

    menu.innerHTML = html;
    document.body.appendChild(menu);

    // Initial position
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Reposition to stay in viewport
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let posX = x;
    let posY = y;

    if (posX + rect.width > vw - 8) {
      posX = Math.max(8, vw - rect.width - 8);
    }
    if (posY + rect.height > vh - 8) {
      posY = Math.max(8, vh - rect.height - 8);
    }

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;

    activeMenu = menu;

    const interactiveItems = Array.from(menu.querySelectorAll('.at-context-menu-item'));
    let activeIndex = -1;

    const focusItem = (idx) => {
      if (interactiveItems.length === 0) return;
      if (idx < 0) idx = interactiveItems.length - 1;
      if (idx >= interactiveItems.length) idx = 0;
      activeIndex = idx;
      // Focusing must not scroll the page: a scroll closes the menu.
      interactiveItems[activeIndex].focus({ preventScroll: true });
    };

    interactiveItems.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.index);
        const item = items[idx];
        this.close();
        if (item && typeof item.run === 'function') {
          item.run();
        }
      });
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusItem(activeIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusItem(activeIndex - 1);
      }
    };

    const onPointerDown = (e) => {
      if (!menu.contains(e.target)) {
        this.close();
      }
    };

    const onScroll = () => {
      this.close();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);

    cleanupHandlers = () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
    };

    if (interactiveItems.length > 0) {
      focusItem(0);
    }
  },

  close() {
    if (cleanupHandlers) {
      cleanupHandlers();
      cleanupHandlers = null;
    }
    if (activeMenu) {
      activeMenu.remove();
      activeMenu = null;
    }
  },

  isOpen() {
    return activeMenu !== null;
  }
};

