import { renderIcon, escapeHTML as esc } from '../ui/icons.js';
import { tape, tiltOf } from '../ui/primitives.js';
import { pickAndInstallExpansion, openExpansionInstallDialog } from '../ui/expansion-dialog.js';
import { readFolderFromFileList } from '../data/expansion-installer.js';
import { scanBundleFiles } from '../data/bundle-scanner.js';
import { openConversionDialog } from '../ui/conversion-dialog.js';

const TEMPLATE_CATEGORIES = [
  'Cartas e bilhetes',
  'Jornal',
  'Polícia e investigação',
  'Médico',
  'Ocultismo',
  'Fantasia',
  'Cotidiano',
  'Tecnologia',
];

function normalize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function createTemplatesDrawer(shell, { api, onUseTemplate } = {}) {
  const container = document.createElement('div');
  container.className = 'templates-drawer-view';

  let rawTemplates = [];
  let sources = [{ id: 'casa', name: 'Coleção do Ateliê' }];
  let activeSource = 'all';
  let activeCategory = 'all';
  let searchQuery = '';
  let activeTemplateDetail = null;

  async function loadData() {
    try {
      const res = await api?.library?.list();
      rawTemplates = (res?.items || []).filter(i => i.kind === 'template');
      sources = res?.sources || [{ id: 'casa', name: 'Coleção do Ateliê' }];
      render();
    } catch (err) {
      console.warn('[atelie] Erro ao carregar modelos para a gaveta:', err);
      container.innerHTML = `
        <div class="template-empty-state">
          <p>Não foi possível carregar os modelos.</p>
        </div>
      `;
    }
  }

  function filterTemplates() {
    const q = normalize(searchQuery);

    return rawTemplates.filter(tpl => {
      // 1. Source filter
      if (activeSource !== 'all') {
        const itemSource = tpl.source || 'casa';
        if (itemSource !== activeSource) return false;
      }

      // 2. Category filter
      if (activeCategory !== 'all') {
        if (tpl.category !== activeCategory) return false;
      }

      // 3. Search query
      if (q) {
        const nameNorm = normalize(tpl.name);
        const catNorm = normalize(tpl.category);
        const fieldsNorm = (tpl.fields || []).map(f => normalize(f)).join(' ');
        if (!nameNorm.includes(q) && !catNorm.includes(q) && !fieldsNorm.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }

  function renderDetailView(tpl) {
    const previewUrl = api?.library?.previewURL ? api.library.previewURL(tpl) : (tpl.preview || '');
    const fields = Array.isArray(tpl.fields) ? tpl.fields : [];
    const fieldsCount = fields.length;

    const isPending = tpl.status === 'pending';
    const btnLabel = isPending ? 'Preparar e usar este modelo' : 'Usar este modelo';

    container.innerHTML = `
      <div class="template-detail-view" tabindex="0">
        <button type="button" class="template-detail-back-btn" data-action="back-to-grid" aria-label="Voltar para os modelos">
          ${renderIcon('arrow-left', 14)}
          <span>Voltar para modelos</span>
        </button>

        <div class="template-detail-preview">
          <img src="${esc(previewUrl)}" alt="${esc(tpl.name)}" />
        </div>

        <div class="template-detail-header">
          <h3 class="template-detail-title">${esc(tpl.name)}</h3>
          <div class="template-badges-row">
            ${isPending ? '<span class="template-badge is-jit" style="background: rgba(147, 84, 220, 0.2); color: var(--at-uv, #9354dc); font-weight: 700;">JIT</span>' : ''}
            <span class="template-badge">${esc(tpl.category)}</span>
            <span class="template-badge">${fieldsCount} ${fieldsCount === 1 ? 'campo' : 'campos'}</span>
            ${tpl.backTemplate ? '<span class="template-badge is-verso">frente e verso</span>' : ''}
          </div>
        </div>

        <button type="button" class="at-btn is-primary template-use-btn" data-action="use-template" style="width:100%; justify-content:center; padding:10px 16px; font-weight:700;">
          ${btnLabel}
        </button>

        <div class="template-detail-fields-section">
          <h4>Campos editáveis (${fieldsCount})</h4>
          <ul class="template-fields-list">
            ${isPending
              ? '<li style="opacity:0.7; font-style:italic;">Campos editáveis e camadas de texto serão extraídos no primeiro uso (JIT).</li>'
              : (fields.length > 0 
                  ? fields.map(f => `<li><span style="opacity:0.6; font-size:10px;">▪</span> <span>${esc(f)}</span></li>`).join('')
                  : '<li style="opacity:0.6;">Nenhum campo estruturado</li>')
            }
          </ul>
        </div>
      </div>
    `;

    // Events in detail view
    container.querySelector('[data-action="back-to-grid"]')?.addEventListener('click', () => {
      activeTemplateDetail = null;
      render();
    });

    container.querySelector('[data-action="use-template"]')?.addEventListener('click', async () => {
      if (tpl.status === 'pending') {
        let psdFile = tpl.psdFile;
        let fontFiles = tpl.fontFiles || [];
        let db = null;
        if (api?.expansions?.openDB) {
          db = await api.expansions.openDB().catch(() => null);
        }
        if (!psdFile && db && api?.expansions?.getFile) {
          psdFile = await api.expansions.getFile(tpl.source, tpl.file || tpl.psdPath);
        }

        openConversionDialog({
          templateItem: tpl,
          psdFile,
          fontFiles,
          db,
          onComplete: (handout) => {
            tpl.status = 'ready';
            tpl.handout = handout;
            onUseTemplate?.(tpl);
          },
        });
      } else {
        onUseTemplate?.(tpl);
      }
    });

    const detailEl = container.querySelector('.template-detail-view');
    detailEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        activeTemplateDetail = null;
        render();
      }
    });
  }

  function render() {
    if (activeTemplateDetail) {
      renderDetailView(activeTemplateDetail);
      return;
    }

    const filtered = filterTemplates();

    // Source chips
    const sourceChips = [
      `<button type="button" class="templates-chip ${activeSource === 'all' ? 'active' : ''}" data-source="all">Todas as origens</button>`,
      ...sources.map(s => `
        <button type="button" class="templates-chip ${activeSource === s.id ? 'active' : ''}" data-source="${esc(s.id)}">
          ${esc(s.name)}
        </button>
      `)
    ].join('');

    // Category chips
    const sourceTemplates = activeSource === 'all'
      ? rawTemplates
      : rawTemplates.filter(t => (t.source || 'casa') === activeSource);

    const extraCategories = Array.from(
      new Set(sourceTemplates.map(t => t.category).filter(Boolean))
    ).filter(c => !TEMPLATE_CATEGORIES.includes(c))
     .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const allCategories = [...TEMPLATE_CATEGORIES, ...extraCategories];
    const displayCategories = allCategories.filter(cat => {
      const count = sourceTemplates.filter(t => t.category === cat).length;
      return count > 0 || cat === activeCategory;
    });

    const categoryChips = [
      `<button type="button" class="templates-chip ${activeCategory === 'all' ? 'active' : ''}" data-category="all">Todas as categorias</button>`,
      ...displayCategories.map(cat => {
        const count = sourceTemplates.filter(t => t.category === cat).length;
        const isActive = activeCategory === cat;
        return `
          <button type="button" class="templates-chip ${isActive ? 'active' : ''}" data-category="${esc(cat)}">
            ${esc(cat)} (${count})
          </button>
        `;
      })
    ].join('');

    // Template grid items
    const gridItems = filtered.length > 0
      ? filtered.map(tpl => {
          const previewUrl = api?.library?.previewURL ? api.library.previewURL(tpl) : (tpl.preview || '');
          const fieldsCount = (tpl.fields || []).length;
          const tilt = tiltOf(tpl.id);
          return `
            <div class="at-card template-card" role="button" tabindex="0" data-id="${esc(tpl.id)}" aria-label="${esc(tpl.name)}" style="transform: rotate(${tilt}deg);">
              <div class="template-card-preview">
                <img src="${esc(previewUrl)}" alt="${esc(tpl.name)}" loading="lazy" />
              </div>
              <div class="template-card-info">
                <span class="template-card-title">${esc(tpl.name)}</span>
                <span class="template-card-cat">${esc(tpl.category)}</span>
                <div class="template-badges-row">
                  ${tpl.status === 'pending' ? '<span class="template-badge is-jit" style="background: rgba(147, 84, 220, 0.2); color: var(--at-uv, #9354dc); font-weight: 700;">JIT</span>' : ''}
                  <span class="template-badge">${fieldsCount} ${fieldsCount === 1 ? 'campo' : 'campos'}</span>
                  ${tpl.backTemplate ? '<span class="template-badge is-verso">frente e verso</span>' : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')
      : `
        <div class="template-empty-state" style="grid-column: 1 / -1; padding: 24px 12px; text-align: center;">
          <p style="margin-bottom: 8px;">Nenhum modelo encontrado.</p>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="at-btn is-sm is-primary" data-action="load-bundle">
              ${renderIcon('folder', 13)}
              <span>Carregar bundle (JIT)…</span>
            </button>
            <button type="button" class="at-btn is-sm" data-action="install-expansion">
              ${renderIcon('upload', 13)}
              <span>Instalar expansão deste computador…</span>
            </button>
          </div>
        </div>
      `;

    container.innerHTML = `
      <div class="templates-top-bar">
        <div class="templates-search-box">
          <span class="templates-search-icon">${renderIcon('search', 14)}</span>
          <input type="search" class="templates-search-input" placeholder="Buscar modelos..." value="${esc(searchQuery)}" aria-label="Buscar modelos" />
        </div>
        <button type="button" class="at-btn is-sm templates-install-btn" data-action="load-bundle" title="Carregar pasta com arquivos .PSD brutos (JIT)">
          ${renderIcon('folder', 13)}
          <span>Carregar bundle (JIT)</span>
        </button>
        <button type="button" class="at-btn is-sm templates-install-btn" data-action="install-expansion" title="Instalar pacote de expansão com novos modelos">
          ${renderIcon('upload', 13)}
          <span>Instalar expansão</span>
        </button>
        <input type="file" class="templates-bundle-folder-input" webkitdirectory directory multiple style="display:none;" />
        <input type="file" class="templates-expansion-folder-input" webkitdirectory directory multiple style="display:none;" />
      </div>

      ${sources.length > 1 ? `<div class="templates-chips-bar source-chips">${sourceChips}</div>` : ''}

      <div class="templates-chips-bar category-chips">${categoryChips}</div>

      <div class="templates-grid" role="region" aria-label="Modelos de documento">
        ${gridItems}
      </div>
    `;

    // Bind expansion installer
    const expFolderInput = container.querySelector('.templates-expansion-folder-input');
    const bundleFolderInput = container.querySelector('.templates-bundle-folder-input');

    const onExpansionInstalled = async () => {
      await loadData();
      if (window.__atelie?.refreshLibrary) window.__atelie.refreshLibrary();
      shell?.notify?.('Expansão instalada com sucesso!', { tone: 'positive' });
    };

    container.querySelectorAll('[data-action="install-expansion"]').forEach(btn => {
      btn.addEventListener('click', () => {
        pickAndInstallExpansion({
          api,
          inputElement: expFolderInput,
          onComplete: onExpansionInstalled,
        });
      });
    });

    async function handleBundleFiles(fileListOrEntries) {
      if (!fileListOrEntries) return;
      try {
        shell?.notify?.('Escaneando pasta de arquivos…', { tone: 'neutral' });
        const scanned = await scanBundleFiles(fileListOrEntries);
        if (scanned.bundles.length === 0) {
          shell?.notify?.('Nenhum arquivo PSD encontrado nesta pasta.', { tone: 'error' });
          return;
        }

        if (api?.expansions?.registerJitBundle) {
          for (const bundle of scanned.bundles) {
            await api.expansions.registerJitBundle(bundle);
          }
        }

        await loadData();
        if (window.__atelie?.refreshLibrary) window.__atelie.refreshLibrary();
        shell?.notify?.(`${scanned.totalPsdCount} modelo(s) adicionados sob demanda (JIT)!`, { tone: 'positive' });
      } catch (err) {
        shell?.notify?.(`Erro ao carregar bundle: ${err.message}`, { tone: 'error' });
      }
    }

    container.querySelectorAll('[data-action="load-bundle"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
          try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
            const fileEntries = [];
            async function scanHandle(handle, path = '') {
              for await (const entry of handle.values()) {
                const itemPath = path ? `${path}/${entry.name}` : entry.name;
                if (entry.kind === 'file') {
                  const file = await entry.getFile();
                  fileEntries.push({ path: itemPath, file });
                } else if (entry.kind === 'directory') {
                  await scanHandle(entry, itemPath);
                }
              }
            }
            await scanHandle(dirHandle);
            const map = new Map(fileEntries.map(e => [e.path, e.file]));
            await handleBundleFiles(map);
            return;
          } catch (err) {
            if (err.name === 'AbortError') return;
            console.warn('showDirectoryPicker falhou, tentando fallback:', err);
          }
        }

        if (bundleFolderInput) {
          bundleFolderInput.value = '';
          bundleFolderInput.click();
        }
      });
    });

    bundleFolderInput?.addEventListener('change', () => {
      if (bundleFolderInput.files && bundleFolderInput.files.length > 0) {
        handleBundleFiles(bundleFolderInput.files);
      }
    });

    expFolderInput?.addEventListener('change', async () => {
      const files = expFolderInput.files;
      if (!files || files.length === 0) return;
      try {
        const { expansionJson, libraryJson, filesMap } = await readFolderFromFileList(files);
        await openExpansionInstallDialog({
          expansionJson,
          libraryJson,
          filesMap,
          api,
          onComplete: onExpansionInstalled,
        });
      } catch (err) {
        alert(`Erro ao ler pasta selecionada: ${err.message}`);
      }
    });

    // Bind search
    const searchInput = container.querySelector('.templates-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
      // restore focus and cursor
      const newInp = container.querySelector('.templates-search-input');
      if (newInp) {
        newInp.focus();
        newInp.selectionStart = newInp.selectionEnd = searchQuery.length;
      }
    });

    // Bind source chips
    container.querySelectorAll('.source-chips .templates-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSource = btn.dataset.source;
        render();
      });
    });

    // Bind category chips
    container.querySelectorAll('.category-chips .templates-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.category;
        render();
      });
    });

    // Bind card clicks and keyboard
    const cardEls = Array.from(container.querySelectorAll('.template-card'));
    cardEls.forEach((cardEl, idx) => {
      const tplId = cardEl.dataset.id;
      const tpl = rawTemplates.find(t => t.id === tplId);

      const triggerOpen = () => {
        if (tpl) {
          activeTemplateDetail = tpl;
          render();
        }
      };

      cardEl.addEventListener('click', triggerOpen);

      cardEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerOpen();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = cardEls[idx + 1] || cardEls[0];
          next?.focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = cardEls[idx - 1] || cardEls[cardEls.length - 1];
          prev?.focus();
        }
      });
    });
  }

  // Drag and drop support on templates drawer
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    container.classList.add('is-dragover');
  });

  container.addEventListener('dragleave', (e) => {
    if (!container.contains(e.relatedTarget)) {
      container.classList.remove('is-dragover');
    }
  });

  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    container.classList.remove('is-dragover');
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    let hasExpansionJson = false;
    for (let i = 0; i < files.length; i++) {
      if (files[i].name === 'expansion.json') hasExpansionJson = true;
    }

    if (hasExpansionJson) {
      try {
        const { expansionJson, libraryJson, filesMap } = await readFolderFromFileList(files);
        await openExpansionInstallDialog({
          expansionJson,
          libraryJson,
          filesMap,
          api,
          onComplete: () => {
            loadData();
            if (window.__atelie?.refreshLibrary) window.__atelie.refreshLibrary();
            shell?.notify?.('Expansão instalada com sucesso!', { tone: 'positive' });
          },
        });
      } catch (err) {
        shell?.notify?.(err.message, { tone: 'error' });
      }
    } else {
      try {
        shell?.notify?.('Escaneando pasta de arquivos…', { tone: 'neutral' });
        const scanned = await scanBundleFiles(files);
        if (scanned.bundles.length === 0) {
          shell?.notify?.('Nenhum arquivo .psd encontrado nesta pasta.', { tone: 'error' });
          return;
        }
        if (api?.expansions?.registerJitBundle) {
          for (const bundle of scanned.bundles) {
            await api.expansions.registerJitBundle(bundle);
          }
        }
        await loadData();
        if (window.__atelie?.refreshLibrary) window.__atelie.refreshLibrary();
        shell?.notify?.(`${scanned.totalPsdCount} modelo(s) adicionados sob demanda (JIT)!`, { tone: 'positive' });
      } catch (err) {
        shell?.notify?.(`Erro ao carregar bundle: ${err.message}`, { tone: 'error' });
      }
    }
  });

  loadData();

  return {
    get element() {
      return container;
    },
    refresh: loadData,
    openCategory(category) {
      activeCategory = category;
      activeTemplateDetail = null;
      render();
    },
    openSource(sourceId) {
      activeSource = sourceId;
      activeTemplateDetail = null;
      render();
    },
    showDetail(templateIdOrItem) {
      const tpl = typeof templateIdOrItem === 'string'
        ? rawTemplates.find(t => t.id === templateIdOrItem)
        : templateIdOrItem;
      if (tpl) {
        activeTemplateDetail = tpl;
        render();
      }
    },
    showList() {
      activeTemplateDetail = null;
      render();
    },
  };
}

