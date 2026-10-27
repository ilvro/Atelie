import { escapeHTML as esc, icon as renderIcon } from '../ui/icons.js';
import { tape, stamp, tiltOf } from '../ui/primitives.js';
import { defaultsFor, libraryDropSize, stampTilt } from './library-defaults.js';
import { getSettings } from '../ui/settings.js';
import {
  filterLibraryItems,
  getStoredFavorites,
  toggleStoredFavorite,
  isStoredFavorite,
  getRecentLibraryIds,
  recordRecentLibraryId,
} from './library-search.js';
import { createFilterBar } from '../ui/filter-bar.js';
import { preserveScroll } from '../ui/scroll.js';
import { imageLayer, textLayer, addLayer, updateLayer, insertionIndex } from '../domain/handouts.js';
import { contextMenu } from '../ui/context-menu.js';
import { play } from '../ui/sound.js';

const TRANSPARENT_DRAG_IMAGE = (() => {
  if (typeof Image === 'undefined') return null;
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  return img;
})();

const CANONICAL_CATEGORIES = [
  'Papéis',
  'Manchas',
  'Sangue',
  'Água',
  'Sujeira',
  'Queimado',
  'Amassados',
  'Dobras',
  'Rasgos',
  'Carimbos',
  'Selos',
  'Prendedores',
  'Fitas',
  'Etiquetas',
  'Lacres',
  'Molduras',
  'Ornamentos',
  'Emblemas',
  'Símbolos',
  'Marcas',
  'Digitais',
  'Fotografias',
];

function sortCategories(categories) {
  return categories.slice().sort((a, b) => {
    const idxA = CANONICAL_CATEGORIES.indexOf(a);
    const idxB = CANONICAL_CATEGORIES.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'pt');
  });
}

import { uploadFont, removeUserFont } from './font-upload.js';
import { emptyStateIllustration } from '../ui/illustrations.js';

export function createLibraryPanel(shell, { api, state, fonts } = {}) {
  const container = document.createElement('div');
  container.className = 'library-panel-root';

  let rawItems = [];
  let sources = [{ id: 'casa', name: 'Coleção do Ateliê' }];
  let activeType = 'elements'; // 'elements' | 'fonts'
  let activeSource = 'all'; // 'all' | 'casa' | expansion id
  let activeCategory = 'all'; // 'all' | specific category name (elements)
  let activeFontCategory = 'all'; // 'all' | specific category name (fonts)
  let openingCategory = null; // group that just opened: plays the expand animation
  let searchQuery = '';
  let favoritesOnly = false;
  let collapsedCategories = new Set();
  let itemsLimit = 60;
  let hoverTimeout = null;
  let hoverPreviewEl = null;

  const filterBar = createFilterBar({
    onChange(key, value) {
      if (key === 'source') activeSource = value;
      if (key === 'category') {
        if (activeType === 'fonts') activeFontCategory = value; else activeCategory = value;
      }
      itemsLimit = 60;
      render();
    },
    onClear() {
      activeSource = 'all';
      activeCategory = 'all';
      activeFontCategory = 'all';
      favoritesOnly = false;
      itemsLimit = 60;
      render();
    },
  });

  const scrollEl = () => container.querySelector('.library-content-scroll');

  /** Re-renders keeping the clicked header (or the scroll position) where it was. */
  function renderKeepingScroll(anchorSelector) {
    preserveScroll(scrollEl, anchorSelector || null, render, container);
  }

  async function loadLibraryData() {
    try {
      const res = await api?.library?.list();
      rawItems = (res?.items || []).filter(i => i.kind !== 'layer' && i.kind !== 'template');
      sources = res?.sources || [{ id: 'casa', name: 'Coleção do Ateliê' }];
      render();
    } catch (err) {
      console.warn('[atelie] Erro ao carregar biblioteca:', err);
      container.innerHTML = `
        <div class="library-error-state">
          <p>Não foi possível carregar a biblioteca.</p>
        </div>
      `;
    }
  }

  function hideHoverPreview() {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    if (hoverPreviewEl) {
      hoverPreviewEl.remove();
      hoverPreviewEl = null;
    }
  }

  function showHoverPreview(item, targetEl) {
    hideHoverPreview();
    hoverTimeout = setTimeout(() => {
      if (!document.body.contains(targetEl)) return;
      const rect = targetEl.getBoundingClientRect();
      hoverPreviewEl = document.createElement('div');
      hoverPreviewEl.className = 'library-hover-preview';
      const previewSrc = api?.library?.previewURL ? api.library.previewURL(item) : (item.preview || '');

      hoverPreviewEl.innerHTML = `
        <div class="hover-preview-media">
          <img src="${esc(previewSrc)}" alt="${esc(item.name)}" />
        </div>
        <div class="hover-preview-info">
          <span class="hover-preview-title">${esc(item.name)}</span>
          <span class="hover-preview-category">${esc(item.category || '')}</span>
          ${item.source && item.source !== 'casa' ? `<span class="at-stamp is-default">${esc(item.source)}</span>` : ''}
        </div>
      `;
      document.body.appendChild(hoverPreviewEl);

      const popW = 240;
      let left = rect.right + 12;
      if (left + popW > window.innerWidth - 12) {
        left = Math.max(12, rect.left - popW - 12);
      }
      let top = Math.max(12, Math.min(window.innerHeight - 300, rect.top));

      hoverPreviewEl.style.left = `${left}px`;
      hoverPreviewEl.style.top = `${top}px`;
    }, 400);
  }

  function addElementToHandout(item, { cover = false, position = null } = {}) {
    if (!state?.handout) return;
    const doc = state.handout;
    const defaults = defaultsFor(item);
    const shouldCover = cover || defaults.cover;

    const dropSize = libraryDropSize(item, doc.page);
    const shouldCoverNow = shouldCover || dropSize.cover;
    const w = shouldCoverNow ? doc.page.width : dropSize.width;
    const h = shouldCoverNow ? doc.page.height : dropSize.height;
    const x = shouldCoverNow ? 0 : Math.round((doc.page.width - w) / 2);
    const y = shouldCoverNow ? 0 : Math.round((doc.page.height - h) / 2);
    const fit = shouldCoverNow ? 'cover' : 'contain';

    const newLayer = imageLayer({
      name: item.name || 'Elemento',
      x,
      y,
      width: Math.round(w),
      height: Math.round(h),
      rotation: getSettings().tiltStamps === false ? 0 : stampTilt(item),
      blend: defaults.blend,
      opacity: defaults.opacity ?? 1,
      image: {
        src: { library: item.id },
        fit,
        tint: defaults.tint || null,
      },
    });

    const isPaper = item.category === 'Papéis' || defaults.position === 'bottom' || (defaults.cover && defaults.blend === 'normal');
    if (isPaper) newLayer.role = 'paper';
    const role = isPaper ? 'paper' : 'auto';
    const selectedId = state.selection ?? state.selectedLayerId;
    const insertIdx = insertionIndex(doc, newLayer, { selectedId, role });
    const next = addLayer(doc, newLayer, insertIdx);
    state.edit(next, { label: `Adicionar ${newLayer.name}` });
    recordRecentLibraryId(item.id);
    state.select(newLayer.id);
    state.flash?.(newLayer.id);
    state.land?.(newLayer.id);

    const cat = item.category?.toLowerCase() || '';
    const name = item.name?.toLowerCase() || '';
    if (cat === 'fitas' || name.includes('fita')) {
      play('tape');
    } else if (name.includes('lacre') || name.includes('cera')) {
      play('stamp', { variant: 'wax' });
    } else if (isPaper || cat === 'papeis' || cat === 'papéis' || cat === 'texturas') {
      play('paper-slide');
    } else {
      play('stamp');
    }
  }

  function applyFontToHandout(item) {
    if (!state?.handout) return;
    recordRecentLibraryId(item.id);
    const selectedId = state.selection ?? state.selectedLayerId;
    const selectedLayer = state.handout.layers.find(l => l.id === selectedId);

    if (fonts) {
      fonts.load({
        library: item.id,
        family: item.family,
        weight: item.weight || 400,
        italic: item.style === 'italic',
      }).catch(() => {});
    }

    if (selectedLayer && selectedLayer.kind === 'text') {
      state.edit(updateLayer(state.handout, selectedLayer.id, {
        text: {
          ...selectedLayer.text,
          font: {
            family: item.family,
            library: item.id,
            weight: item.weight || 400,
            italic: item.style === 'italic',
          },
        },
      }));
    } else {
      const pageW = state.handout.page.width;
      const pageH = state.handout.page.height;
      const w = Math.min(500, pageW * 0.7);
      const h = 120;
      const newL = textLayer({
        name: `Texto — ${item.family}`,
        x: Math.round((pageW - w) / 2),
        y: Math.round((pageH - h) / 2),
        width: Math.round(w),
        height: Math.round(h),
        text: {
          content: 'Escreva aqui',
          font: {
            family: item.family,
            library: item.id,
            weight: item.weight || 400,
            italic: item.style === 'italic',
          },
        },
      });
      const insertIdx = insertionIndex(state.handout, newL, { selectedId });
      state.edit(addLayer(state.handout, newL, insertIdx), { label: `Adicionar ${newL.name}` });
      state.select(newL.id);
      state.flash?.(newL.id);
      state.land?.(newL.id);
      play('type', { font: item.family, key: 'a' });
    }
  }

  function cardHTML(item, favorites) {
    const isFav = favorites.includes(item.id);
    const previewUrl = api?.library?.previewURL ? api.library.previewURL(item) : (item.preview || '');
    return `
      <div class="at-card library-item-card"
           data-id="${esc(item.id)}"
           data-category="${esc(item.category || '')}"
           draggable="true"
           style="transform: rotate(${tiltOf(item.id)}deg);">
        <button type="button" class="library-item-fav-btn ${isFav ? 'is-fav' : ''}" data-fav-id="${esc(item.id)}" aria-label="Favoritar" title="Favoritar">
          ${isFav ? '★' : '☆'}
        </button>
        <div class="library-card-thumb">
          <img src="${esc(previewUrl)}" alt="${esc(item.name)}" loading="lazy" />
        </div>
        <div class="library-card-footer">
          <span class="library-card-name" title="${esc(item.name)}">${esc(item.name)}</span>
          ${item.source && item.source !== 'casa' ? `<span class="at-stamp is-default library-expansion-stamp">${esc(item.source)}</span>` : ''}
        </div>
      </div>
    `;
  }

  function render() {
    const favorites = getStoredFavorites();

    const filtered = filterLibraryItems(rawItems, {
      query: searchQuery,
      type: activeType,
      source: activeSource,
      favoritesOnly,
      favorites,
    });

    if (activeType === 'fonts' && activeFontCategory !== 'all') {
      for (let i = filtered.length - 1; i >= 0; i--) {
        if (filtered[i].category !== activeFontCategory) filtered.splice(i, 1);
      }
    }

    const hasMultipleSources = sources && sources.length > 1;

    let html = `
      <div class="library-drawer-inner">
        <!-- Topo com busca e filtros -->
        <div class="library-top-bar">
          <div class="library-search-wrap">
            <input type="search" class="at-input library-search-input" placeholder="Buscar na biblioteca…" value="${esc(searchQuery)}" autocomplete="off" spellcheck="false" />
          </div>

          <div class="library-chips-row">
            <div class="library-type-chips">
              <button type="button" class="at-chip ${activeType === 'elements' ? 'is-active' : ''}" data-type="elements">Elementos</button>
              <button type="button" class="at-chip ${activeType === 'fonts' ? 'is-active' : ''}" data-type="fonts">Fontes</button>
            </div>

            <div class="library-fav-chips">
              <button type="button" class="at-chip library-fav-chip ${favoritesOnly ? 'is-active' : ''}" data-action="toggle-fav-filter" title="Filtrar favoritos">
                ${favoritesOnly ? '★ Favoritos' : '☆ Favoritos'}
              </button>
            </div>
          </div>

          ${activeType === 'fonts' && api?.expansions?.addUserFont ? `
            <button type="button" class="at-btn is-sm library-upload-font-btn" data-action="upload-font" title="Enviar uma fonte (.ttf, .otf, .woff, .woff2) deste computador">
              ${renderIcon('upload', 13)}<span>Enviar fonte</span>
            </button>
          ` : ''}

          <div class="library-filter-slot"></div>

          ${activeType === 'elements' ? `
            <button type="button" class="library-toggle-all-btn" data-action="toggle-all-cats" title="Alternar recolher e expandir tudo">
              ${collapsedCategories.size > 0 ? 'Expandir tudo' : 'Recolher tudo'}
            </button>
          ` : ''}
        </div>

        <!-- Área de conteúdo rolável -->
        <div class="library-content-scroll">
    `;

    if (filtered.length === 0) {
      html += `
        <div class="library-empty-results empty-state">
          ${emptyStateIllustration('search')}
          <p>Nenhum item encontrado.</p>
          <small>Tente outra palavra ou limpe os filtros.</small>
        </div>
      `;
    } else if (activeType === 'elements') {
      // Group elements by category
      const byCategory = new Map();
      for (const item of filtered) {
        const cat = item.category || 'Outros';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat).push(item);
      }

      const allSorted = sortCategories(Array.from(byCategory.keys()));
      const sortedCategories = activeCategory === 'all'
        ? allSorted
        : allSorted.filter(c => c === activeCategory);
      let renderedCount = 0;

      const showRecents = activeCategory === 'all' && !searchQuery && !favoritesOnly;
      const recentItems = showRecents
        ? getRecentLibraryIds().map(id => filtered.find(i => i.id === id)).filter(Boolean)
        : [];
      if (recentItems.length) {
        html += `
          <div class="library-category-group library-recents" data-category="__recents">
            <div class="library-category-header is-static"><span class="at-tape library-category-tape"><span class="category-name">Usados recentemente</span><span class="category-count">(${recentItems.length})</span></span></div>
            <div class="library-card-grid">${recentItems.map(it => cardHTML(it, favorites)).join('')}</div>
          </div>`;
      }

      for (const cat of sortedCategories) {
        const catItems = byCategory.get(cat) || [];
        const isCollapsed = collapsedCategories.has(cat);

        html += `
          <div class="library-category-group ${openingCategory === cat ? 'is-opening' : ''}" data-category="${esc(cat)}">
            <button type="button" class="library-category-header" data-toggle-category="${esc(cat)}" aria-expanded="${!isCollapsed}">
              <span class="at-tape library-category-tape">
                <span class="category-arrow ${isCollapsed ? '' : 'is-open'}">${renderIcon('chevron', 12)}</span>
                <span class="category-name">${esc(cat)}</span>
                <span class="category-count">(${catItems.length})</span>
              </span>
            </button>
        `;

        if (!isCollapsed) {
          html += '<div class="library-card-grid">';
          for (const item of catItems) {
            renderedCount++;
            if (renderedCount > itemsLimit) continue;

            html += cardHTML(item, favorites);
          }
          html += '</div>';
        }

        html += '</div>';
      }

      if (filtered.length > itemsLimit) {
        html += `
          <div class="library-more-wrap">
            <button type="button" class="at-btn library-more-btn">
              Mostrar mais (${filtered.length - itemsLimit} restantes)
            </button>
          </div>
        `;
      }
    } else {
      // Font cards list
      html += '<div class="library-fonts-list">';
      let fontCount = 0;
      for (const item of filtered) {
        fontCount++;
        if (fontCount > itemsLimit) continue;

        const isFav = favorites.includes(item.id);

        html += `
          <div class="at-card library-font-card" data-id="${esc(item.id)}" data-family="${esc(item.family)}" style="transform: rotate(${tiltOf(item.id)}deg);">
            <div class="library-font-header">
              <span class="library-font-title">${esc(item.name || item.family)}</span>
              <button type="button" class="library-item-fav-btn ${isFav ? 'is-fav' : ''}" data-fav-id="${esc(item.id)}" aria-label="Favoritar" title="Favoritar">
                ${isFav ? '★' : '☆'}
              </button>
            </div>
            <div class="library-font-specimen" data-family="${esc(item.family)}" data-library="${esc(item.id)}" data-weight="${item.weight || 400}" data-style="${esc(item.style || 'normal')}" style="font-family: '${esc(item.family)}', sans-serif;">
              Querida Lia, não procure por mim.
            </div>
            <div class="library-card-footer">
              <span class="library-font-category">${esc(item.category || '')}</span>
              ${item.source && item.source !== 'casa' ? `<span class="at-stamp is-default library-expansion-stamp">${esc(item.source)}</span>` : ''}
            </div>
          </div>
        `;
      }
      html += '</div>';

      if (filtered.length > itemsLimit) {
        html += `
          <div class="library-more-wrap">
            <button type="button" class="at-btn library-more-btn">
              Mostrar mais (${filtered.length - itemsLimit} restantes)
            </button>
          </div>
        `;
      }
    }

    // Discreet server expansion note
    if (api?.mode !== 'browser') {
      html += `
        <div class="library-footer-note">
          Expansões (como o <em>Arquivos Confidenciais</em>) se instalam pelo terminal; veja <code>docs/MANUTENCAO.md</code>.
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Filter groups: origin (only with more than one) and category, with counts
    const typeItems = rawItems.filter(i => (activeType === 'fonts' ? i.kind === 'font' : i.kind === 'element'));
    const bySource = activeSource === 'all' ? typeItems : typeItems.filter(i => (i.source || 'casa') === activeSource);
    const categories = activeType === 'fonts'
      ? Array.from(new Set(typeItems.map(i => i.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt'))
      : sortCategories(Array.from(new Set(typeItems.map(i => i.category).filter(Boolean))));
    const filterGroups = [];
    if (hasMultipleSources) {
      filterGroups.push({
        key: 'source', label: 'Origem', value: activeSource, segmented: true, allLabel: 'Tudo',
        options: sources.map(s => ({ value: s.id, label: s.name })),
      });
    }
    filterGroups.push({
      key: 'category', label: 'Categoria',
      value: activeType === 'fonts' ? activeFontCategory : activeCategory,
      allLabel: `Todas (${bySource.length})`,
      options: categories.map(c => ({ value: c, label: c, count: bySource.filter(i => i.category === c).length })),
    });
    filterBar.update({ groups: filterGroups, extraActive: favoritesOnly ? [{ label: 'Favoritos' }] : [] });
    container.querySelector('.library-filter-slot')?.appendChild(filterBar.element);

    attachEvents();
  }

  function attachEvents() {
    const searchInput = container.querySelector('.library-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
      const updatedInput = container.querySelector('.library-search-input');
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
      }
    });

    // Type chips
    container.querySelectorAll('[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeType = btn.dataset.type;
        itemsLimit = 60;
        render();
      });
    });

    // Favorites filter
    container.querySelector('[data-action="toggle-fav-filter"]')?.addEventListener('click', () => {
      favoritesOnly = !favoritesOnly;
      renderKeepingScroll();
    });

    // Toggle all categories collapse/expand
    container.querySelector('[data-action="toggle-all-cats"]')?.addEventListener('click', () => {
      const allCats = sortCategories(Array.from(new Set(rawItems.filter(i => i.kind === 'element').map(i => i.category).filter(Boolean))));
      if (collapsedCategories.size === 0) {
        for (const cat of allCats) collapsedCategories.add(cat);
      } else {
        collapsedCategories.clear();
      }
      renderKeepingScroll('[data-action="toggle-all-cats"]');
    });

    // Category expand/collapse
    container.querySelectorAll('[data-toggle-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.toggleCategory;
        if (collapsedCategories.has(cat)) {
          collapsedCategories.delete(cat);
          openingCategory = cat;
        } else {
          collapsedCategories.add(cat);
        }
        renderKeepingScroll(`[data-toggle-category="${CSS.escape(cat)}"]`);
        openingCategory = null;
      });
    });

    container.querySelector('[data-action="upload-font"]')?.addEventListener('click', () => {
      uploadFont({
        api, fonts, shell,
        onDone: (item) => {
          activeFontCategory = item.category;
          loadLibraryData();
        },
      });
    });

    // "Mostrar mais"
    container.querySelector('.library-more-btn')?.addEventListener('click', () => {
      itemsLimit += 60;
      renderKeepingScroll();
    });

    // Favorite star clicks on items
    container.querySelectorAll('.library-item-fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.favId;
        toggleStoredFavorite(id);
        renderKeepingScroll();
      });
    });

    // Item card clicks
    container.querySelectorAll('.library-item-card').forEach(card => {
      const id = card.dataset.id;
      const item = rawItems.find(i => i.id === id);
      if (!item) return;

      // Click: add to handout (or cover on shift)
      card.addEventListener('click', (e) => {
        if (e.target.closest('.library-item-fav-btn')) return;
        const isShift = e.shiftKey;
        const isPaper = item.category === 'Papéis' || (item.category || '').toLowerCase().includes('papel');
        addElementToHandout(item, {
          cover: isShift,
          position: isPaper ? 'bottom' : null,
        });
      });

      // Context menu
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isFav = isStoredFavorite(item.id);

        contextMenu.open({
          x: e.clientX,
          y: e.clientY,
          items: [
            {
              label: 'Pôr na página',
              icon: 'plus',
              run: () => addElementToHandout(item),
            },
            {
              label: 'Cobrir a página',
              icon: 'frame',
              run: () => addElementToHandout(item, { cover: true, position: item.category === 'Papéis' ? 'bottom' : null }),
            },
            'separator',
            {
              label: isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
              icon: 'star',
              run: () => {
                toggleStoredFavorite(item.id);
                renderKeepingScroll();
              },
            },
          ],
        });
      });

      // Hover preview
      card.addEventListener('pointerenter', () => showHoverPreview(item, card));
      card.addEventListener('pointerleave', hideHoverPreview);

      // Drag and drop
      card.addEventListener('dragstart', (e) => {
        hideHoverPreview();
        card.classList.add('is-dragging');
        if (typeof window !== 'undefined') {
          window.__atelieActiveDragItem = item;
        }
        e.dataTransfer.setData('text/x-atelie-library', JSON.stringify(item));
        e.dataTransfer.setData('application/json', JSON.stringify({ libraryId: item.id, item }));
        e.dataTransfer.effectAllowed = 'copy';
        // The browser must not draw the card: the stage shows the real element as a ghost.
        if (TRANSPARENT_DRAG_IMAGE) e.dataTransfer.setDragImage(TRANSPARENT_DRAG_IMAGE, 0, 0);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        if (typeof window !== 'undefined') {
          window.__atelieActiveDragItem = null;
        }
      });
    });

    // Font card clicks & lazy loading
    container.querySelectorAll('.library-font-card').forEach(card => {
      const id = card.dataset.id;
      const item = rawItems.find(i => i.id === id);
      if (!item) return;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.library-item-fav-btn')) return;
        applyFontToHandout(item);
      });

      // Only fonts the person sent can be removed
      if (item.source === 'usuario') {
        card.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          contextMenu.open({
            x: e.clientX,
            y: e.clientY,
            items: [
              {
                label: 'Remover fonte',
                icon: 'trash',
                danger: true,
                run: () => removeUserFont({ api, shell, item, onDone: () => { activeFontCategory = 'all'; loadLibraryData(); } }),
              },
            ],
          });
        });
      }
    });

    // Lazy load fonts in specimens
    if (fonts && activeType === 'fonts') {
      const specimenEls = container.querySelectorAll('.library-font-specimen');
      if (typeof IntersectionObserver !== 'undefined') {
        const fontObs = new IntersectionObserver((entries) => {
          for (const ent of entries) {
            if (ent.isIntersecting) {
              const el = ent.target;
              const fam = el.dataset.family;
              const libId = el.dataset.library;
              const weight = Number(el.dataset.weight || 400);
              const italic = el.dataset.style === 'italic';

              fonts.load({ library: libId, family: fam, weight, italic }).catch(() => {});
              fontObs.unobserve(el);
            }
          }
        }, { root: container.querySelector('.library-content-scroll'), rootMargin: '80px' });

        specimenEls.forEach(el => fontObs.observe(el));
      } else {
        specimenEls.forEach(el => {
          fonts.load({
            library: el.dataset.library,
            family: el.dataset.family,
            weight: Number(el.dataset.weight || 400),
            italic: el.dataset.style === 'italic',
          }).catch(() => {});
        });
      }
    }
  }

  // Paper-coloured rectangles pulse softly while the list loads
  container.innerHTML = `
    <div class="library-drawer-inner library-skeleton" aria-busy="true" aria-label="Carregando a biblioteca">
      <div class="library-top-bar"><div class="skeleton-line" style="width:70%"></div><div class="skeleton-line" style="width:45%"></div></div>
      <div class="library-content-scroll"><div class="library-card-grid">${Array.from({ length: 8 }, () => '<div class="skeleton-card"></div>').join('')}</div></div>
    </div>`;

  // Initial load
  loadLibraryData();

  return {
    element: container,
    refresh() {
      loadLibraryData();
    },
    destroy() {
      hideHoverPreview();
    },
  };
}
