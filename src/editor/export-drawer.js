/**
 * Export and Print Drawer (Etapa 21)
 * Drawer panel for high-res PNG export (screen & 300 DPI) and 1:1 physical printing.
 */
import { escapeHTML as esc, renderIcon } from '../ui/icons.js';
import { tape, card } from '../ui/primitives.js';
import { printLayout, downloadHandoutPng, printHandout } from './export.js';
import { hasUvLayers } from './bake.js';

export function createExportDrawer(container, {
  shell,
  getHandout,
  images,
  fonts,
  api,
  isUvLight = () => false,
} = {}) {
  let isWorking = false;

  function render() {
    const handout = getHandout?.();
    if (!handout) {
      container.innerHTML = `
        <div class="drawer-empty-state">
          <p>Abra um documento para exportar ou imprimir.</p>
        </div>
      `;
      return;
    }

    const layout = printLayout(handout);
    const hasUv = hasUvLayers(handout);
    const page = handout.page || {};
    const w = page.width || 1240;
    const h = page.height || 1754;

    const orientationLabel = layout.orientation === 'landscape' ? 'paisagem' : 'retrato';
    const dimSummary = `${layout.widthMm} × ${layout.heightMm} mm · ${orientationLabel}${layout.cropMarks ? ' (com corte)' : ' (A4)'}`;

    container.innerHTML = `
      <div class="export-drawer-content">
        <!-- Document Card Summary -->
        <div class="export-doc-card">
          <div class="export-doc-thumb-wrap">
            ${
              handout.preview
                ? `<img src="${esc(api?.mode === 'browser' ? '' : `api/atelie/handouts/${handout.id}/preview`)}" alt="" />`
                : renderIcon('doc', 24)
            }
          </div>
          <div class="export-doc-info">
            <h4 class="export-doc-name">${esc(handout.name || 'Sem nome')}</h4>
            <div class="export-doc-meta">
              <span>${w} × ${h} px</span>
              <span class="export-doc-dot">·</span>
              <span>${esc(dimSummary)}</span>
            </div>
          </div>
        </div>

        ${hasUv ? `
          <div class="export-uv-box">
            <label class="export-uv-label">
              <input type="checkbox" id="export-uv-checkbox" ${isUvLight() ? 'checked' : ''} />
              <span>Exportar sob luz ultravioleta (UV)</span>
            </label>
            <p class="export-uv-note">Revela as camadas secretas fluorescentes no arquivo exportado.</p>
          </div>
        ` : ''}

        <div class="export-options-list">
          <!-- Option 1: PNG Screen -->
          <div class="export-card">
            <div class="export-card-header">
              <div class="export-card-title-row">
                <span class="export-card-title">PNG · Tela</span>
                <span class="at-stamp is-default" style="font-size: 11px;">2048 px</span>
              </div>
              <p class="export-card-desc">Lado maior 2048 px. Otimizado para Foundry VTT, Roll20, Discord e telas de celular ou tablet.</p>
            </div>
            <button type="button" class="at-btn is-primary export-action-btn" data-action="export-screen" ${isWorking ? 'disabled' : ''}>
              ${renderIcon('download', 14)}
              <span>Baixar PNG (Tela)</span>
            </button>
          </div>

          <!-- Option 2: PNG Print -->
          <div class="export-card">
            <div class="export-card-header">
              <div class="export-card-title-row">
                <span class="export-card-title">PNG · Impressão</span>
                <span class="at-stamp is-accent" style="font-size: 11px;">300 ppp</span>
              </div>
              <p class="export-card-desc">Escala 2× em 300 ppp reais (${Math.round(w * 2)} × ${Math.round(h * 2)} px). Perfeito para gráficas ou arquivo definitivo de alta fidelidade.</p>
            </div>
            <button type="button" class="at-btn export-action-btn" data-action="export-print" ${isWorking ? 'disabled' : ''}>
              ${renderIcon('download', 14)}
              <span>Baixar PNG (300 ppp)</span>
            </button>
          </div>

          <!-- Option 3: Print -->
          <div class="export-card">
            <div class="export-card-header">
              <div class="export-card-title-row">
                <span class="export-card-title">Imprimir folha</span>
                <span class="at-stamp is-default" style="font-size: 11px;">Escala 1:1</span>
              </div>
              <p class="export-card-desc">Abre o diálogo de impressão do navegador em folha A4 com medidas reais em milímetros${layout.cropMarks ? ' e marcas de corte pontilhadas para recortar' : ''}.</p>
            </div>
            <button type="button" class="at-btn export-action-btn" data-action="print" ${isWorking ? 'disabled' : ''}>
              ${renderIcon('printer', 14)}
              <span>Imprimir documento…</span>
            </button>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const screenBtn = container.querySelector('[data-action="export-screen"]');
    const printPngBtn = container.querySelector('[data-action="export-print"]');
    const printBtn = container.querySelector('[data-action="print"]');
    const uvCheck = container.querySelector('#export-uv-checkbox');

    const getLight = () => (uvCheck && uvCheck.checked ? 'uv' : 'normal');

    screenBtn?.addEventListener('click', async () => {
      const handout = getHandout?.();
      if (!handout || isWorking) return;
      isWorking = true;
      render();
      shell?.notify?.('Gerando PNG em alta resolução (2048 px)…', { tone: 'info' });

      try {
        await downloadHandoutPng(handout, {
          target: 'screen',
          light: getLight(),
          images,
          fonts,
        });
        shell?.notify?.('Download do PNG iniciado!', { tone: 'ok' });
      } catch (err) {
        shell?.notify?.(`Erro ao exportar: ${err.message}`, { tone: 'error' });
      } finally {
        isWorking = false;
        render();
      }
    });

    printPngBtn?.addEventListener('click', async () => {
      const handout = getHandout?.();
      if (!handout || isWorking) return;
      isWorking = true;
      render();
      shell?.notify?.('Renderizando PNG em 300 ppp…', { tone: 'info' });

      try {
        await downloadHandoutPng(handout, {
          target: 'print',
          light: getLight(),
          images,
          fonts,
        });
        shell?.notify?.('Download do PNG em 300 ppp iniciado!', { tone: 'ok' });
      } catch (err) {
        shell?.notify?.(`Erro ao exportar em 300 ppp: ${err.message}`, { tone: 'error' });
      } finally {
        isWorking = false;
        render();
      }
    });

    printBtn?.addEventListener('click', async () => {
      const handout = getHandout?.();
      if (!handout || isWorking) return;
      isWorking = true;
      render();
      shell?.notify?.('Preparando folha de impressão…', { tone: 'info' });

      try {
        await printHandout(handout, {
          light: getLight(),
          images,
          fonts,
        });
        shell?.notify?.('Janela de impressão aberta.', { tone: 'ok' });
      } catch (err) {
        shell?.notify?.(`Erro ao abrir impressão: ${err.message}`, { tone: 'error' });
      } finally {
        isWorking = false;
        render();
      }
    });
  }

  return {
    render,
    element: container,
  };
}

