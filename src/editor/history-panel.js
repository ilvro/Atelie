import { escapeHTML as esc, icon as renderIcon } from '../ui/icons.js';
import { renderHandout } from '../render/handout-render.js';

/**
 * Inspector History panel showing:
 * 1. Session undo/redo steps ("Passos da sessão")
 * 2. Archived versions from storage ("Versões") with preview and restore.
 */
export function createHistoryPanel(container, { state, api, images, fonts, shell } = {}) {
  let activeTab = 'steps'; // 'steps' | 'versions'
  let cachedVersions = null;
  let selectedVersionRev = null;
  let selectedVersionDoc = null;
  let isLoadingVersions = false;

  async function loadVersions() {
    if (!api || !state?.handout?.id) {
      cachedVersions = [];
      return;
    }
    isLoadingVersions = true;
    try {
      cachedVersions = await api.handouts.versions(state.handout.id);
    } catch (err) {
      console.warn('[atelie] Erro ao carregar versões:', err);
      cachedVersions = [];
    } finally {
      isLoadingVersions = false;
    }
  }

  async function selectVersion(rev) {
    selectedVersionRev = rev;
    selectedVersionDoc = null;
    render();

    if (!api || !state?.handout?.id) return;
    try {
      selectedVersionDoc = await api.handouts.version(state.handout.id, rev);
      render();
    } catch (err) {
      console.warn('[atelie] Erro ao carregar versão detalhada:', err);
    }
  }

  function renderPreviewCanvas(canvas, doc) {
    if (!canvas || !doc) return;
    const aspect = doc.page.height / doc.page.width;
    canvas.width = 220;
    canvas.height = Math.round(220 * aspect);
    renderHandout(canvas, doc, {
      scale: 220 / doc.page.width,
      loadImage: images?.load,
      loadFont: fonts?.load,
    }).catch(err => console.warn('[atelie] Erro na prévia da versão:', err));
  }

  function render() {
    if (!state) return;

    const steps = state.steps || [];
    const reversed = steps.slice().reverse();

    container.innerHTML = `
      <div class="history-panel">
        <div class="history-tabs" role="tablist">
          <button type="button" class="history-tab-btn ${activeTab === 'steps' ? 'is-active' : ''}" data-tab="steps" role="tab" aria-selected="${activeTab === 'steps'}">
            Passos da sessão
          </button>
          <button type="button" class="history-tab-btn ${activeTab === 'versions' ? 'is-active' : ''}" data-tab="versions" role="tab" aria-selected="${activeTab === 'versions'}">
            Versões arquivadas
          </button>
        </div>

        ${
          activeTab === 'steps'
            ? `
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
        `
            : `
          <div class="versions-panel">
            ${
              isLoadingVersions
                ? '<p class="versions-empty">Carregando versões...</p>'
                : !cachedVersions || cachedVersions.length === 0
                ? '<p class="versions-empty">Nenhuma versão anterior gravada ainda.</p>'
                : `
              <div class="versions-list" role="list">
                ${cachedVersions
                  .map(v => {
                    const isSelected = selectedVersionRev === v.revision;
                    const dateStr = v.updatedAt ? new Date(v.updatedAt).toLocaleString('pt-BR') : '';
                    return `
                    <div class="version-row ${isSelected ? 'is-selected' : ''}" data-rev="${v.revision}" role="listitem">
                      <div class="version-row-main">
                        <span class="version-rev-tag">Rev ${v.revision}</span>
                        <span class="version-date">${esc(dateStr)}</span>
                      </div>
                    </div>
                  `;
                  })
                  .join('')}
              </div>

              ${
                selectedVersionRev != null
                  ? `
                <div class="version-preview-container">
                  <span class="version-preview-title">Prévia da Rev ${selectedVersionRev}</span>
                  <div class="version-preview-box">
                    <canvas class="version-preview-canvas"></canvas>
                  </div>
                  <button type="button" class="at-btn is-primary version-restore-btn">
                    Restaurar esta versão
                  </button>
                </div>
              `
                  : '<p class="version-select-hint">Selecione uma versão para ver a prévia.</p>'
              }
            `
            }
          </div>
        `
        }
      </div>
    `;

    // Tab buttons
    container.querySelectorAll('.history-tab-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tab = btn.dataset.tab;
        if (activeTab === tab) return;
        activeTab = tab;
        if (activeTab === 'versions') {
          await loadVersions();
        }
        render();
      });
    });

    if (activeTab === 'steps') {
      container.querySelectorAll('.history-step-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index, 10);
          if (!isNaN(idx)) {
            state.goTo(idx);
          }
        });
      });
    } else {
      // Version list selection
      container.querySelectorAll('.version-row').forEach(row => {
        row.addEventListener('click', () => {
          const rev = parseInt(row.dataset.rev, 10);
          selectVersion(rev);
        });
      });

      // Canvas render
      const canvas = container.querySelector('.version-preview-canvas');
      if (canvas && selectedVersionDoc) {
        renderPreviewCanvas(canvas, selectedVersionDoc);
      }

      // Restore button
      const restoreBtn = container.querySelector('.version-restore-btn');
      if (restoreBtn && selectedVersionDoc) {
        restoreBtn.addEventListener('click', () => {
          const restored = {
            ...selectedVersionDoc,
            id: state.handout.id,
            revision: state.handout.revision,
            updatedAt: new Date().toISOString(),
          };
          state.edit(restored, { label: `Restaurar rev ${selectedVersionRev}` });
          shell?.notify?.(`Versão ${selectedVersionRev} restaurada no editor.`, { tone: 'info' });
        });
      }
    }
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
