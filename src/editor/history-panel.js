import { escapeHTML as esc } from '../ui/icons.js';

/**
 * Inspector History panel showing the list of undo/redo steps.
 */
export function createHistoryPanel(container, { state } = {}) {
  function render() {
    if (!state) return;

    const steps = state.steps || [];
    // Show most recent step at the top
    const reversed = steps.slice().reverse();

    container.innerHTML = `
      <div class="history-panel">
        <header class="history-panel-header">
          <span class="history-count">${steps.length} ${steps.length === 1 ? 'passo gravado' : 'passos gravados'}</span>
        </header>
        <div class="history-list" role="list">
          ${reversed
            .map(step => {
              const currentClass = step.isCurrent ? 'is-current' : '';
              const undoneClass = step.isUndone ? 'is-undone' : '';
              return `
              <button type="button" class="history-step-btn ${currentClass} ${undoneClass}" data-index="${step.index}" role="listitem">
                <span class="history-step-indicator" aria-hidden="true"></span>
                <span class="history-step-label">${esc(step.label)}</span>
                <span class="history-step-idx">#${step.index}</span>
              </button>
            `;
            })
            .join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.history-step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx)) {
          state.goTo(idx);
        }
      });
    });
  }

  const unsubscribe = state.subscribe(() => {
    render();
  });

  render();

  return {
    render,
    destroy() {
      unsubscribe();
      container.innerHTML = '';
    },
  };
}

