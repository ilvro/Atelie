import { escapeHTML as esc, icon as renderIcon } from '../ui/icons.js';

export const TABS_STORAGE_KEY = 'atelie-tabs';

/** Moves `id` to `toIndex` in `order`, returning a new array (unknown ids leave it unchanged). */
export function reorderIds(order, id, toIndex) {
  const from = order.indexOf(id);
  if (from === -1) return order.slice();
  const next = order.slice();
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, id);
  return next;
}

/** Which tab becomes active after closing `id`: the neighbour to the right, else to the left, else the Mesa (null). */
export function nextAfterClose(order, id, activeId) {
  if (activeId !== id) return activeId;
  const idx = order.indexOf(id);
  if (idx === -1) return activeId;
  return order[idx + 1] ?? order[idx - 1] ?? null;
}

/** Ctrl+Tab cycles through the Mesa (null, always first) and the open documents. */
export function cycleTab(order, activeId, direction = 1) {
  const ring = [null, ...order];
  const idx = ring.indexOf(activeId);
  const start = idx === -1 ? 0 : idx;
  return ring[(start + direction + ring.length) % ring.length];
}

export function serializeTabs(order, activeId) {
  return JSON.stringify({ order, active: activeId ?? null });
}

export function parseTabs(raw) {
  try {
    const data = JSON.parse(raw);
    const order = Array.isArray(data?.order) ? data.order.filter(x => typeof x === 'string' && x) : [];
    const unique = [...new Set(order)];
    const active = typeof data?.active === 'string' && unique.includes(data.active) ? data.active : null;
    return { order: unique, active };
  } catch {
    return { order: [], active: null };
  }
}

export function loadTabs() {
  try {
    return parseTabs(localStorage.getItem(TABS_STORAGE_KEY));
  } catch {
    return { order: [], active: null };
  }
}

export function saveTabs(order, activeId) {
  try {
    localStorage.setItem(TABS_STORAGE_KEY, serializeTabs(order, activeId));
  } catch {}
}

/**
 * The tab bar above the document bar. The first tab is the Mesa (fixed, never closes).
 * Tabs: [{ id, title, dirty }]. Dragging reorders; the middle button and × close.
 */
export function createTabBar({ onActivate, onClose, onReorder } = {}) {
  const element = document.createElement('div');
  element.className = 'desk-tab-bar';
  element.setAttribute('role', 'tablist');
  element.innerHTML = `
    <button type="button" class="desk-tab is-mesa" data-tab-id="" role="tab" title="Mesa (início)">
      ${renderIcon('grid', 13)}<span class="desk-tab-title">Mesa</span>
    </button>
    <button type="button" class="desk-tab-scroll is-left" aria-label="Rolar abas para a esquerda" hidden>${renderIcon('chevron', 12)}</button>
    <div class="desk-tab-list"></div>
    <button type="button" class="desk-tab-scroll is-right" aria-label="Rolar abas para a direita" hidden>${renderIcon('chevron', 12)}</button>
  `;
  const mesaBtn = element.querySelector('.is-mesa');
  const list = element.querySelector('.desk-tab-list');
  const leftBtn = element.querySelector('.desk-tab-scroll.is-left');
  const rightBtn = element.querySelector('.desk-tab-scroll.is-right');
  let draggingId = null;

  function updateScrollButtons() {
    const overflow = list.scrollWidth > list.clientWidth + 1;
    leftBtn.hidden = !overflow;
    rightBtn.hidden = !overflow;
  }

  mesaBtn.addEventListener('click', () => onActivate?.(null));
  leftBtn.addEventListener('click', () => list.scrollBy({ left: -160, behavior: 'smooth' }));
  rightBtn.addEventListener('click', () => list.scrollBy({ left: 160, behavior: 'smooth' }));

  list.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('.desk-tab-close');
    const tab = e.target.closest('.desk-tab');
    if (!tab) return;
    if (closeBtn) {
      e.stopPropagation();
      onClose?.(tab.dataset.tabId);
    } else {
      onActivate?.(tab.dataset.tabId);
    }
  });

  list.addEventListener('auxclick', (e) => {
    if (e.button !== 1) return;
    const tab = e.target.closest('.desk-tab');
    if (tab) {
      e.preventDefault();
      onClose?.(tab.dataset.tabId);
    }
  });

  list.addEventListener('dragstart', (e) => {
    const tab = e.target.closest('.desk-tab');
    if (!tab) return;
    draggingId = tab.dataset.tabId;
    tab.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/x-atelie-tab', draggingId);
  });

  list.addEventListener('dragover', (e) => {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  list.addEventListener('drop', (e) => {
    if (!draggingId) return;
    e.preventDefault();
    const over = e.target.closest('.desk-tab');
    const tabs = [...list.querySelectorAll('.desk-tab')];
    let toIndex = tabs.length - 1;
    if (over) {
      toIndex = tabs.indexOf(over);
    }
    onReorder?.(draggingId, toIndex);
    draggingId = null;
  });

  list.addEventListener('dragend', () => {
    draggingId = null;
    list.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging'));
  });

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(updateScrollButtons).observe(element);
  }

  return {
    element,
    render(tabs, activeId) {
      mesaBtn.classList.toggle('is-active', activeId == null);
      mesaBtn.setAttribute('aria-selected', activeId == null ? 'true' : 'false');
      list.innerHTML = tabs.map(t => `
        <div class="desk-tab ${t.id === activeId ? 'is-active' : ''}" role="tab" tabindex="0" draggable="true"
             data-tab-id="${esc(t.id)}" aria-selected="${t.id === activeId}" title="${esc(t.title)}">
          ${t.dirty ? '<span class="desk-tab-dirty" title="Não arquivado" aria-label="Não arquivado"></span>' : ''}
          <span class="desk-tab-title">${esc(t.title)}</span>
          <button type="button" class="desk-tab-close" aria-label="Fechar ${esc(t.title)}" tabindex="-1">${renderIcon('close', 10)}</button>
        </div>
      `).join('');
      const active = list.querySelector('.desk-tab.is-active');
      active?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
      updateScrollButtons();
    },
  };
}
