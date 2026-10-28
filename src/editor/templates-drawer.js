import { renderIcon, escapeHTML as esc } from '../ui/icons.js';
import { tape, tiltOf } from '../ui/primitives.js';
import { pickAndInstallExpansion, openExpansionInstallDialog } from '../ui/expansion-dialog.js';
import { readFolderFromFileList } from '../data/expansion-installer.js';
import { scanBundleFiles } from '../data/bundle-scanner.js';
import { openConversionDialog } from '../ui/conversion-dialog.js';
import { createFilterBar } from '../ui/filter-bar.js';

const TEMPLATE_CATEGORIES = [
  'Cartas e bilhetes',
  'Jornal',
  'Polícia e investigação',
  'Médico',
  'Ocultismo',
  'Fantasia',
  'Cotidiano',
  'Tecnologia',
  'Forense e perícia',
  'Oficial e jurídico',
  'Militar e governo',
  'Cadernos, diários e livros',
  'Escola e juventude',
  'Ciência e laboratório',
  'Fotografias e objetos',
  'Destruídos e composições',
  'Conjuntos',
];

export const ERA_LABELS = { medieval: 'Medieval', 1890: 'Anos 1890', 1920: 'Anos 1920', 1950: 'Anos 1950', 1980: 'Anos 1980', hoje: 'Hoje' };
export const TOM_LABELS = { 'investigação': 'Investigação', horror: 'Horror', fantasia: 'Fantasia', cotidiano: 'Cotidiano', 'sci-fi': 'Ficção científica' };
const ERA_ORDER = ['medieval', '1890', '1920', '1950', '1980', 'hoje'];

function normalize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchSource(tpl, sourceId) {
  if (sourceId === 'all') return true;
  const itemSource = tpl.source || 'casa';
  if (sourceId === 'arquivos-confidenciais') {
    return (
      itemSource === 'arquivos-confidenciais' ||
      itemSource.startsWith('ac-') ||
      tpl.tags?.includes('arquivos-confidenciais') ||
      tpl.tags?.includes('bundle') ||
      tpl.tags?.includes('jit')
    );
  }
  if (sourceId === 'casa') {
    return itemSource === 'casa' || !tpl.source;
  }
  return itemSource === sourceId;
}

export function createTemplatesDrawer(shell, { api, onUseTemplate, onUseSet } = {}) {
  const container = document.createElement('div');
  container.className = 'templates-drawer-view';

  let rawTemplates = [];
  let sources = [{ id: 'casa', name: 'Coleção do Ateliê' }];
  let activeSource = 'all';
  let activeCategory = 'all';
  let activeEra = 'all';
  let activeTom = 'all';
  let activeOrg = 'all';
  let searchQuery = '';
  let activeTemplateDetail = null;
  let gridScrollTop = 0;

  const filterBar = createFilterBar({
    onChange(key, value) {
      if (key === 'source') activeSource = value;
      if (key === 'category') activeCategory = value;
      if (key === 'era') activeEra = value;
      if (key === 'tom') activeTom = value;
      if (key === 'org') activeOrg = value;
      gridScrollTop = 0;
      render();
    },
    onClear() {
      activeSource = 'all';
      activeCategory = 'all';
      activeEra = 'all';
      activeTom = 'all';
      activeOrg = 'all';
      gridScrollTop = 0;
      render();
    },
  });

  async function loadData() {
    try {
      const res = await api?.library?.list();
      rawTemplates = (res?.items || []).filter(i => i.kind === 'template' || i.kind === 'set');
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

  /** Variações de um modelo (a grade mostra só a base; o detalhe mostra a família). */
  function variantsOf(tpl) {
    return rawTemplates.filter(t => t.family && `casa-tpl-${t.family}` === tpl.id);
  }

  function searchText(tpl) {
    return normalize([
      tpl.name, tpl.category, (Array.isArray(tpl.fields) ? tpl.fields : []).join(' '), (Array.isArray(tpl.tags) ? tpl.tags : []).join(' '), ERA_LABELS[tpl.era] || tpl.era,
      TOM_LABELS[tpl.tom] || tpl.tom, tpl.orgNome, tpl.org, tpl.texto, tpl.description,
    ].filter(Boolean).join(' '));
  }

  function matchesFilters(tpl, { era = activeEra, tom = activeTom, org = activeOrg, category = activeCategory, source = activeSource } = {}) {
    if (!matchSource(tpl, source)) return false;
    if (category !== 'all' && tpl.category !== category) return false;
    if (era !== 'all' && tpl.era !== era) return false;
    if (tom !== 'all' && tpl.tom !== tom) return false;
    if (org !== 'all' && tpl.org !== org) return false;
    return true;
  }

  /** A grade: bases e conjuntos. Uma variação que combina com a busca leva a sua base para a grade. */
  function filterTemplates() {
    const q = normalize(searchQuery);
    const shown = new Set();
    for (const tpl of rawTemplates) {
      if (!matchesFilters(tpl)) continue;
      if (q && !searchText(tpl).includes(q)) continue;
      shown.add(tpl.family ? `casa-tpl-${tpl.family}` : tpl.id);
    }
    return rawTemplates.filter(t => !t.family && shown.has(t.id));
  }

  function renderDetailView(tpl) {
    const previewUrl = api?.library?.previewURL ? api.library.previewURL(tpl) : (tpl.preview || '');
    const fields = Array.isArray(tpl.fields) ? tpl.fields : [];
    const fieldsCount = fields.length;

    const isPending = tpl.status === 'pending';
    const btnLabel = isPending ? 'Preparar e usar este modelo' : 'Usar este modelo';
    const isSet = tpl.kind === 'set';
    const members = isSet ? (tpl.templates || []).map(id => rawTemplates.find(t => t.id === id)).filter(Boolean) : [];
    const baseTpl = tpl.family ? (rawTemplates.find(t => t.id === `casa-tpl-${tpl.family}`) || tpl) : tpl;
    const family = isSet ? [] : [baseTpl, ...variantsOf(baseTpl)];

    container.innerHTML = `
      <div class="template-detail-view tab-crossfade" tabindex="0">
        <button type="button" class="template-detail-back-btn" data-action="back-to-grid" aria-label="Voltar para os modelos">
          ${renderIcon('arrow-left', 14)}
          <span>Voltar para modelos</span>
        </button>

        <div class="template-detail-preview">
          <img src="${esc(previewUrl)}" alt="${esc(tpl.name)}" style="${previewUrl ? '' : 'display:none;'}" />
          <div class="template-card-preview-placeholder" style="${previewUrl ? 'display:none;' : 'width:100%; min-height:220px;'}">
            ${renderIcon('doc', 40)}
            <span>${esc(tpl.name)}</span>
          </div>
        </div>

        <div class="template-detail-header">
          <h3 class="template-detail-title">${esc(tpl.name)}</h3>
          <div class="template-badges-row">
            ${isPending ? '<span class="template-badge is-jit" style="background: rgba(147, 84, 220, 0.2); color: var(--at-uv, #9354dc); font-weight: 700;">JIT</span>' : ''}
            <span class="template-badge">${esc(tpl.category)}</span>
            <span class="template-badge">${fieldsCount} ${fieldsCount === 1 ? 'campo' : 'campos'}</span>
            ${tpl.backTemplate ? '<span class="template-badge is-verso">frente e verso</span>' : ''}
            ${tpl.era ? `<span class="template-badge">${esc(ERA_LABELS[tpl.era] || tpl.era)}</span>` : ''}
            ${tpl.tom ? `<span class="template-badge">${esc(TOM_LABELS[tpl.tom] || tpl.tom)}</span>` : ''}
            ${tpl.orgNome ? `<span class="template-badge">${esc(tpl.orgNome)}</span>` : ''}
          </div>
          ${isSet ? `<p class="template-detail-description">${esc(tpl.description || '')}</p>` : ''}
        </div>

        <button type="button" class="at-btn is-primary template-use-btn" data-action="${isSet ? 'use-set' : 'use-template'}" style="width:100%; justify-content:center; padding:10px 16px; font-weight:700;">
          ${isSet ? `Usar conjunto (${members.length} documentos)` : btnLabel}
        </button>

        ${isSet ? `
        <div class="template-detail-fields-section template-set-members">
          <h4>Neste conjunto (${members.length})</h4>
          <div class="template-family-row">
            ${members.map(m => `<button type="button" class="template-family-thumb" data-member-id="${esc(m.id)}" title="${esc(m.name)}"><img src="${esc(api?.library?.previewURL ? api.library.previewURL(m) : (m.preview || ''))}" alt="${esc(m.name)}" /><span>${esc(m.name)}</span></button>`).join('')}
          </div>
        </div>` : ''}

        ${family.length > 1 ? `
        <div class="template-detail-fields-section template-family">
          <h4>Variações (${family.length - 1})</h4>
          <div class="template-family-row">
            ${family.map(m => `<button type="button" class="template-family-thumb ${m.id === tpl.id ? 'is-active' : ''}" data-family-id="${esc(m.id)}" title="${esc(m.name)}"><img src="${esc(api?.library?.previewURL ? api.library.previewURL(m) : (m.preview || ''))}" alt="${esc(m.name)}" /><span>${esc(m.family ? m.name.split(' · ').pop() : 'Original')}</span></button>`).join('')}
          </div>
        </div>` : ''}

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

    // Resolve preview asynchronously if needed
    if ((!previewUrl || !previewUrl.startsWith('blob:')) && tpl.source !== 'casa' && api?.library?.resolvePreviewURL) {
      api.library.resolvePreviewURL(tpl).then(resolved => {
        if (resolved) {
          const img = container.querySelector('.template-detail-preview img');
          const placeholder = container.querySelector('.template-detail-preview .template-card-preview-placeholder');
          if (img) {
            img.src = resolved;
            img.style.display = '';
          }
          if (placeholder) {
            placeholder.style.display = 'none';
          }
        }
      }).catch(() => {});
    }

    container.querySelectorAll('[data-family-id]').forEach(btn => btn.addEventListener('click', () => {
      const next = rawTemplates.find(t => t.id === btn.dataset.familyId);
      if (next) { activeTemplateDetail = next; render(); }
    }));
    container.querySelectorAll('[data-member-id]').forEach(btn => btn.addEventListener('click', () => {
      const next = rawTemplates.find(t => t.id === btn.dataset.memberId);
      if (next) { activeTemplateDetail = next; render(); }
    }));
    container.querySelector('[data-action="use-set"]')?.addEventListener('click', () => onUseSet?.(members));

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
        if (!psdFile && api?.library?.fileURL) {
          try {
            shell?.notify?.('Carregando arquivo do modelo...', { tone: 'neutral' });
            const url = api.library.fileURL(tpl);
            const res = await fetch(url);
            if (res.ok) {
              const blob = await res.blob();
              psdFile = new File([blob], tpl.fileName || `${tpl.name}.psd`, { type: 'image/vnd.adobe.photoshop' });
            }
          } catch (err) {
            console.warn('[atelie] Erro ao buscar PSD do servidor:', err);
          }
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
    const currentGrid = container.querySelector('.templates-grid');
    if (currentGrid) gridScrollTop = currentGrid.scrollTop;
    if (activeTemplateDetail) {
      renderDetailView(activeTemplateDetail);
      return;
    }

    const filtered = filterTemplates();

    // Filter groups (chips wrap onto lines, with counts); the counts follow the other filters
    const bases = rawTemplates.filter(t => !t.family);
    const sourceTemplates = activeSource === 'all'
      ? bases
      : bases.filter(t => matchSource(t, activeSource));
    const countWith = over => sourceTemplates.filter(t => matchesFilters(t, over)).length;

    const extraCategories = Array.from(
      new Set(sourceTemplates.map(t => t.category).filter(Boolean))
    ).filter(c => !TEMPLATE_CATEGORIES.includes(c))
     .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const displayCategories = [...TEMPLATE_CATEGORIES, ...extraCategories].filter(cat => {
      const count = sourceTemplates.filter(t => t.category === cat).length;
      return count > 0 || cat === activeCategory;
    });

    const filterGroups = [];
    if (sources.length > 1) {
      filterGroups.push({
        key: 'source',
        label: 'Origem',
        value: activeSource,
        segmented: true,
        allLabel: 'Todas',
        options: sources.map(s => ({ value: s.id, label: s.name })),
      });
    }
    filterGroups.push({
      key: 'category',
      label: 'Categoria',
      value: activeCategory,
      allLabel: `Todas (${sourceTemplates.length})`,
      options: displayCategories.map(cat => ({
        value: cat,
        label: cat,
        count: sourceTemplates.filter(t => t.category === cat).length,
      })),
    });

    const distinct = key => Array.from(new Set(sourceTemplates.map(t => t[key]).filter(Boolean)));
    const eras = ERA_ORDER.filter(e => distinct('era').includes(e));
    const toms = Object.keys(TOM_LABELS).filter(e => distinct('tom').includes(e));
    const orgs = distinct('org').map(id => ({ id, nome: sourceTemplates.find(t => t.org === id)?.orgNome || id })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (eras.length) filterGroups.push({ key: 'era', label: 'Época', value: activeEra, allLabel: 'Todas', options: eras.map(e => ({ value: e, label: ERA_LABELS[e], count: countWith({ era: e }) })) });
    if (toms.length) filterGroups.push({ key: 'tom', label: 'Tom', value: activeTom, allLabel: 'Todos', options: toms.map(e => ({ value: e, label: TOM_LABELS[e], count: countWith({ tom: e }) })) });
    if (orgs.length) filterGroups.push({ key: 'org', label: 'Instituição', value: activeOrg, allLabel: 'Todas', options: orgs.map(o => ({ value: o.id, label: o.nome, count: countWith({ org: o.id }) })) });

    // Template grid items
    const gridItems = filtered.length > 0
      ? filtered.map(tpl => {
          const previewUrl = api?.library?.previewURL ? api.library.previewURL(tpl) : (tpl.preview || '');
          const fieldsCount = (tpl.fields || []).length;
          const tilt = tiltOf(tpl.id);
          return `
            <div class="at-card template-card" role="button" tabindex="0" data-id="${esc(tpl.id)}" aria-label="${esc(tpl.name)}" style="transform: rotate(${tilt}deg);">
              <div class="template-card-preview">
                <img src="${esc(previewUrl)}" data-preview-id="${esc(tpl.id)}" alt="${esc(tpl.name)}" loading="lazy" style="${previewUrl ? '' : 'display: none;'}" onerror="this.onerror=null; this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
                <div class="template-card-preview-placeholder" style="${previewUrl ? 'display: none;' : ''}">
                  ${renderIcon('doc', 28)}
                  <span>${esc(tpl.name)}</span>
                </div>
              </div>
              <div class="template-card-info">
                <span class="template-card-title">${esc(tpl.name)}</span>
                <span class="template-card-cat">${esc(tpl.category)}</span>
                <div class="template-badges-row">
                  ${tpl.status === 'pending' ? '<span class="template-badge is-jit" style="background: rgba(147, 84, 220, 0.2); color: var(--at-uv, #9354dc); font-weight: 700;">JIT</span>' : ''}
                  ${tpl.kind === 'set'
                    ? `<span class="template-badge is-set">Conjunto · ${(tpl.templates || []).length} modelos</span>`
                    : `<span class="template-badge">${fieldsCount} ${fieldsCount === 1 ? 'campo' : 'campos'}</span>`}
                  ${tpl.backTemplate ? '<span class="template-badge is-verso">frente e verso</span>' : ''}
                  ${variantsOf(tpl).length ? `<span class="template-badge is-family">+${variantsOf(tpl).length} variações</span>` : ''}
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
        <div class="templates-actions-row">
          <button type="button" class="at-btn is-sm templates-install-btn" data-action="load-bundle" title="Carregar pasta com arquivos .PSD brutos (JIT)">
            ${renderIcon('folder', 13)}
            <span>Carregar bundle (JIT)</span>
          </button>
          <button type="button" class="at-btn is-sm templates-install-btn" data-action="install-expansion" title="Instalar pacote de expansão com novos modelos">
            ${renderIcon('upload', 13)}
            <span>Instalar expansão</span>
          </button>
        </div>
        <input type="file" class="templates-bundle-folder-input" webkitdirectory directory multiple style="display:none;" />
        <input type="file" class="templates-expansion-folder-input" webkitdirectory directory multiple style="display:none;" />
      </div>

      <div class="templates-filter-slot"></div>

      <div class="templates-grid" role="region" aria-label="Modelos de documento">
        ${gridItems}
      </div>
    `;

    filterBar.update({ groups: filterGroups });
    container.querySelector('.templates-filter-slot').appendChild(filterBar.element);
    const gridEl = container.querySelector('.templates-grid');
    if (gridEl) gridEl.scrollTop = gridScrollTop;

    // Asynchronously resolve preview URLs for browser items if needed
    container.querySelectorAll('.template-card').forEach(async (card) => {
      const tplId = card.dataset.id;
      const tpl = rawTemplates.find(t => t.id === tplId);
      if (tpl && tpl.source && tpl.source !== 'casa' && api?.library?.resolvePreviewURL) {
        try {
          const resolved = await api.library.resolvePreviewURL(tpl);
          if (resolved) {
            const img = card.querySelector('img[data-preview-id]');
            const placeholder = card.querySelector('.template-card-preview-placeholder');
            if (img && img.src !== resolved) {
              img.src = resolved;
              img.style.display = '';
            }
            if (placeholder) {
              placeholder.style.display = 'none';
            }
          }
        } catch {}
      }
    });

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
          // Check if user selected an expansion package folder instead of raw PSD files
          let hasExpansionJson = false;
          let hasLibraryJson = false;
          let imageCount = 0;
          if (fileListOrEntries instanceof Map) {
            for (const path of fileListOrEntries.keys()) {
              const p = path.toLowerCase();
              if (p.endsWith('expansion.json')) hasExpansionJson = true;
              if (p.endsWith('library.json')) hasLibraryJson = true;
              if (/\.(png|jpe?g|webp)$/i.test(p)) imageCount++;
            }
          } else if (fileListOrEntries.length) {
            for (let i = 0; i < fileListOrEntries.length; i++) {
              const name = (fileListOrEntries[i].webkitRelativePath || fileListOrEntries[i].name).toLowerCase();
              if (name.endsWith('expansion.json')) hasExpansionJson = true;
              if (name.endsWith('library.json')) hasLibraryJson = true;
              if (/\.(png|jpe?g|webp)$/i.test(name)) imageCount++;
            }
          }

          if (hasExpansionJson || hasLibraryJson) {
            shell?.notify?.('Esta pasta é um pacote de expansão, não arquivos PSD brutos. Use o botão "Instalar expansão".', { tone: 'warn' });
          } else if (imageCount > 0) {
            shell?.notify?.(`Esta pasta contém apenas imagens (${imageCount} foto(s)). Selecione a pasta completa do bundle (a pasta pai, ex: "Bundle 3") que contém os arquivos .psd.`, { tone: 'warn' });
          } else {
            shell?.notify?.('Nenhum arquivo PSD encontrado nesta pasta. Verifique se há arquivos .psd ou .psb.', { tone: 'error' });
          }
          return;
        }

        if (api?.expansions?.registerJitBundle) {
          for (const bundle of scanned.bundles) {
            await api.expansions.registerJitBundle(bundle);
          }
        }

        // Keep filter on arquivos-confidenciais so the newly loaded templates are immediately visible
        if (activeSource === 'casa') {
          activeSource = 'arquivos-confidenciais';
        }
        activeCategory = 'all';
        searchQuery = '';

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
            await scanHandle(dirHandle, dirHandle.name);
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
      gridScrollTop = 0;
      render();
      // restore focus and cursor
      const newInp = container.querySelector('.templates-search-input');
      if (newInp) {
        newInp.focus();
        newInp.selectionStart = newInp.selectionEnd = searchQuery.length;
      }
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
        if (activeSource === 'casa') {
          activeSource = 'arquivos-confidenciais';
        }
        activeCategory = 'all';
        searchQuery = '';
        await loadData();
        if (window.__atelie?.refreshLibrary) window.__atelie.refreshLibrary();
        shell?.notify?.(`${scanned.totalPsdCount} modelo(s) adicionados sob demanda (JIT)!`, { tone: 'positive' });
      } catch (err) {
        shell?.notify?.(`Erro ao carregar bundle: ${err.message}`, { tone: 'error' });
      }
    }
  });

  container.innerHTML = `
    <div class="templates-skeleton" aria-busy="true" aria-label="Carregando os modelos">
      <div class="skeleton-line" style="width:60%"></div>
      <div class="templates-grid">${Array.from({ length: 6 }, () => '<div class="skeleton-card is-tall"></div>').join('')}</div>
    </div>`;

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

