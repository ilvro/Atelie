import { escapeHTML as esc } from './icons.js';

/**
 * Labelled filter groups whose chips wrap onto lines (never scroll sideways).
 * A long group shows two lines and a "+N mais" chip that expands it.
 *
 * group: { key, label, options: [{ value, label, count? }], value, allLabel?, segmented? }
 */

const ALL = 'all';

/** The groups that are filtering something right now, for the "active filters" line. */
export function activeFilters(groups) {
  const out = [];
  for (const g of groups) {
    if (g.value == null || g.value === ALL || g.value === false) continue;
    const opt = g.options.find(o => o.value === g.value);
    out.push({ key: g.key, label: opt ? opt.label : String(g.value), group: g.label });
  }
  return out;
}

function chipHTML(group, opt) {
  const active = group.value === opt.value;
  const count = typeof opt.count === 'number' ? ` <span class="filter-chip-count">(${opt.count})</span>` : '';
  return `<button type="button" class="at-chip filter-chip ${active ? 'is-active active' : ''}" data-filter-group="${esc(group.key)}" data-filter-value="${esc(opt.value)}" aria-pressed="${active}">${esc(opt.label)}${count}</button>`;
}

function groupHTML(group, expanded) {
  const all = group.allLabel
    ? [{ value: ALL, label: group.allLabel }, ...group.options]
    : group.options;
  if (group.segmented) {
    return `
      <div class="filter-group is-segmented" data-group="${esc(group.key)}">
        <span class="filter-group-label">${esc(group.label)}</span>
        <div class="filter-segmented" role="group" aria-label="${esc(group.label)}">
          ${all.map(o => chipHTML(group, o)).join('')}
        </div>
      </div>`;
  }
  return `
    <div class="filter-group ${expanded ? 'is-expanded' : ''}" data-group="${esc(group.key)}">
      <span class="filter-group-label">${esc(group.label)}</span>
      <div class="filter-chips" role="group" aria-label="${esc(group.label)}">
        ${all.map(o => chipHTML(group, o)).join('')}
      </div>
      <button type="button" class="filter-more-btn" data-filter-more="${esc(group.key)}" hidden></button>
    </div>`;
}

export function createFilterBar({ onChange, onClear } = {}) {
  const element = document.createElement('div');
  element.className = 'filter-bar';
  const expanded = new Set();
  let current = { groups: [], extraActive: [] };

  function measureOverflow() {
    element.querySelectorAll('.filter-group:not(.is-segmented)').forEach(groupEl => {
      const chips = groupEl.querySelector('.filter-chips');
      const btn = groupEl.querySelector('.filter-more-btn');
      if (!chips || !btn) return;
      const key = groupEl.dataset.group;
      const isExpanded = expanded.has(key);
      groupEl.classList.toggle('is-expanded', isExpanded);
      const limit = chips.clientHeight;
      let hidden = 0;
      if (!isExpanded) {
        for (const chip of chips.children) {
          if (chip.offsetTop >= limit) hidden++;
        }
      }
      if (isExpanded) {
        btn.hidden = false;
        btn.textContent = 'menos';
        chips.style.maxHeight = `${chips.scrollHeight}px`;
      } else if (hidden > 0) {
        btn.hidden = false;
        btn.textContent = `+${hidden} mais`;
        chips.style.maxHeight = '';
      } else {
        btn.hidden = true;
        chips.style.maxHeight = '';
      }
    });
  }

  function render() {
    const { groups, extraActive } = current;
    const active = [...activeFilters(groups), ...extraActive];
    element.innerHTML = `
      ${groups.map(g => groupHTML(g, expanded.has(g.key))).join('')}
      ${active.length ? `
        <div class="filter-active-line">
          <span class="filter-active-label">Filtrando:</span>
          ${active.map(a => `<span class="filter-active-tag">${esc(a.label)}</span>`).join('')}
          <button type="button" class="filter-clear-btn" data-filter-clear>Limpar filtros</button>
        </div>` : ''}
    `;
    measureOverflow();
  }

  element.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter-value]');
    if (chip) {
      onChange?.(chip.dataset.filterGroup, chip.dataset.filterValue);
      return;
    }
    const more = e.target.closest('[data-filter-more]');
    if (more) {
      const key = more.dataset.filterMore;
      if (expanded.has(key)) expanded.delete(key); else expanded.add(key);
      measureOverflow();
      return;
    }
    if (e.target.closest('[data-filter-clear]')) onClear?.();
  });

  return {
    element,
    /** groups as described above; extraActive: [{label}] for filters kept outside the groups (e.g. favorites). */
    update({ groups, extraActive = [] }) {
      current = { groups, extraActive };
      render();
    },
  };
}
