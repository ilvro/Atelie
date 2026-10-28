import { PAGE_PRESETS } from '../domain/handouts.js';
import { tape, tiltOf } from '../ui/primitives.js';
import { renderIcon, escapeHTML as esc } from '../ui/icons.js';
import { getRecentIds } from './navigator.js';
import { showWelcomeNotes } from '../ui/welcome.js';

const FEATURED_CATEGORIES = [
  'Cartas e bilhetes',
  'Jornal',
  'Polícia e investigação',
  'Médico',
  'Ocultismo',
  'Fantasia',
  'Cotidiano',
  'Tecnologia',
];

/** O número da semana do ano (semente da rotação dos modelos em destaque). */
export function weekNumber(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / (7 * 86400000));
}

/** Modelos em destaque: um por categoria, e o escolhido muda a cada semana. As variações não entram. */
export function pickFeatured(items, week = weekNumber()) {
  const bases = items.filter(i => i.kind === 'template' && !i.family && (!i.source || i.source === 'casa'));
  const featured = [];
  FEATURED_CATEGORIES.forEach((cat, k) => {
    const inCat = bases.filter(i => i.category === cat).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (inCat.length > 0) featured.push(inCat[(week + k) % inCat.length]);
  });
  return featured;
}

/** Novidades: os modelos com `addedIn` mais recente, um por categoria para variar. */
export function pickNews(items, limit = 8) {
  const bases = items.filter(i => i.kind === 'template' && !i.family && i.addedIn && (!i.source || i.source === 'casa'));
  if (!bases.length) return [];
  const latest = bases.map(i => i.addedIn).sort().at(-1);
  const recent = bases.filter(i => i.addedIn === latest).sort((a, b) => a.category.localeCompare(b.category, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'));
  const seen = new Set();
  const out = [];
  for (const i of recent) if (!seen.has(i.category)) { seen.add(i.category); out.push(i); }
  return out.slice(0, limit);
}

export function createStartScreen(container, {
  api,
  onCreatePreset,
  onOpenHandout,
  onOpenTemplate,
  onOpenTemplatesDrawer,
  onExploreExpansion,
  getOpenIds = () => [],
} = {}) {
  const root = document.createElement('div');
  root.className = 'at-start-screen';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Tela de início');

  let libraryData = null;
  let recentDocs = [];
  let recentPreviews = new Map();

  async function loadData() {
    // 1. Library data (templates and sources)
    try {
      libraryData = await api?.library?.list();
    } catch (err) {
      console.warn('[atelie] Erro ao carregar biblioteca na tela de início:', err);
      libraryData = { sources: [{ id: 'casa', name: 'Coleção do Ateliê' }], items: [] };
    }

    // 2. Recent documents
    try {
      // Documents open in tabs come first: "Continuar" is where you left off.
      const openIds = getOpenIds();
      const recentIds = [...openIds, ...getRecentIds().filter(id => !openIds.includes(id))]
        .slice(0, Math.max(6, openIds.length));
      if (recentIds.length > 0 && api?.handouts?.list) {
        const allHandouts = await api.handouts.list();
        const found = [];
        for (const id of recentIds) {
          const item = allHandouts.find(h => h.id === id);
          if (item) {
            found.push(item);
            if (api.handouts.getPreview) {
              try {
                const prev = await api.handouts.getPreview(id);
                if (prev) recentPreviews.set(id, prev);
              } catch {}
            }
          }
        }
        recentDocs = found;
      } else {
        recentDocs = [];
      }
    } catch (err) {
      console.warn('[atelie] Erro ao carregar recentes na tela de início:', err);
      recentDocs = [];
    }

    render();
  }

  function getFeaturedTemplates() {
    return pickFeatured(libraryData?.items || []);
  }

  function getNews() {
    return pickNews(libraryData?.items || []);
  }

  function getExpansions() {
    const sources = libraryData?.sources || [];
    const nonHouse = sources.filter(s => s.id !== 'casa');
    const items = libraryData?.items || [];

    return nonHouse.map(s => {
      const tplCount = items.filter(i => i.source === s.id && i.kind === 'template').length;
      const elemCount = items.filter(i => i.source === s.id && i.kind !== 'template').length;
      return {
        ...s,
        tplCount,
        elemCount,
      };
    });
  }

  function renderWelcomeNotes(force = false) {
    showWelcomeNotes({ root, force });
  }

  function bindRowKeyboard(rowEl) {
    if (!rowEl) return;
    const cards = Array.from(rowEl.querySelectorAll('.at-card, [tabindex="0"]'));
    cards.forEach((card, idx) => {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = cards[idx + 1] || cards[0];
          next?.focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = cards[idx - 1] || cards[cards.length - 1];
          prev?.focus();
        }
      });
    });
  }

  function render() {
    const featuredTemplates = getFeaturedTemplates();
    const expansions = getExpansions();

    // 1. Presets section
    const presetsMarkup = PAGE_PRESETS.map(([id, name, w, h]) => {
      const cardWidth = Math.max(65, Math.round(120 * (w / h)));
      const tilt = tiltOf(id);
      return `
        <div class="at-card start-preset-card" role="button" tabindex="0" data-preset="${esc(id)}" aria-label="Criar documento ${esc(name)}" style="width: ${cardWidth}px; transform: rotate(${tilt}deg);">
          <span class="preset-name">${esc(name)}</span>
          <span class="preset-dims">${w} × ${h}</span>
        </div>
      `;
    }).join('');

    // 2. Recent documents section
    const recentsMarkup = recentDocs.map(doc => {
      const tilt = tiltOf(doc.id);
      const prevData = recentPreviews.get(doc.id);
      const title = doc.name || 'Sem título';
      const updatedDate = doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString('pt-BR') : '';
      const isOpen = getOpenIds().includes(doc.id);

      return `
        <div class="at-card start-recent-card ${isOpen ? 'is-open-tab' : ''}" role="button" tabindex="0" data-id="${esc(doc.id)}" aria-label="Abrir documento ${esc(title)}" style="transform: rotate(${tilt}deg);">
          <div class="start-recent-preview">
            ${prevData
              ? `<img src="${esc(prevData)}" alt="${esc(title)}" />`
              : `<div class="recent-fallback-icon">${renderIcon('doc', 36)}</div>`
            }
          </div>
          <div class="start-recent-info">
            <span class="start-recent-title">${esc(title)}</span>
            <span class="start-recent-date">${isOpen ? 'Aberto em aba' : esc(updatedDate)}</span>
          </div>
        </div>
      `;
    }).join('');

    // 3. Featured templates section
    const cardMarkup = tpl => {
      const tilt = tiltOf(tpl.id);
      const previewUrl = api?.library?.previewURL ? api.library.previewURL(tpl) : (tpl.preview || '');
      return `
        <div class="at-card start-featured-card" role="button" tabindex="0" data-id="${esc(tpl.id)}" aria-label="Modelo ${esc(tpl.name)}" style="transform: rotate(${tilt}deg);">
          <div class="start-featured-preview">
            <img src="${esc(previewUrl)}" alt="${esc(tpl.name)}" loading="lazy" />
          </div>
          <div class="start-featured-info">
            <span class="start-featured-title">${esc(tpl.name)}</span>
            <span class="start-featured-cat">${esc(tpl.category)}</span>
            <div class="template-badges-row">
              <span class="template-badge">${(tpl.fields || []).length} campos</span>
              ${tpl.backTemplate ? '<span class="template-badge is-verso">frente e verso</span>' : ''}
            </div>
          </div>
        </div>
      `;
    };
    const featuredMarkup = featuredTemplates.map(cardMarkup).join('');
    const newsMarkup = getNews().map(cardMarkup).join('');

    // 4. Expansions section
    const expansionsMarkup = expansions.map(exp => {
      const tilt = tiltOf(exp.id);
      return `
        <div class="at-card start-expansion-card" role="region" tabindex="0" aria-label="Expansão ${esc(exp.name)}" style="transform: rotate(${tilt}deg);">
          <div class="expansion-header">
            <h3 class="expansion-name">${esc(exp.name)}</h3>
            ${exp.description ? `<p class="expansion-desc">${esc(exp.description)}</p>` : ''}
          </div>
          <div class="expansion-meta">
            <span class="expansion-count">${exp.tplCount} ${exp.tplCount === 1 ? 'modelo' : 'modelos'}</span>
            <span class="expansion-dot">·</span>
            <span class="expansion-count">${exp.elemCount} ${exp.elemCount === 1 ? 'elemento' : 'elementos'}</span>
          </div>
          <div class="expansion-actions">
            <button type="button" class="at-btn is-sm is-primary" data-action="explore-expansion" data-source="${esc(exp.id)}">
              Explorar
            </button>
          </div>
        </div>
      `;
    }).join('');

    root.innerHTML = `
      <!-- Seção COMEÇAR -->
      <section class="start-section" aria-label="Começar um novo documento">
        <div class="start-section-header">
          ${tape('COMEÇAR')}
        </div>
        <div class="start-row start-presets-row" role="region" aria-label="Folhas em branco">
          ${presetsMarkup}
        </div>
      </section>

      <!-- Aprender o básico -->
      <div class="start-learn-card">
        <p><strong>Aprender o básico</strong>Preencha um modelo pronto em 3 minutos: o tutorial aponta, você faz.</p>
        <button type="button" class="at-btn is-primary" data-action="tutorial-start" data-id="fill-template">Começar o tutorial</button>
      </div>

      <!-- Seção CONTINUAR (se houver recentes) -->
      ${recentDocs.length > 0 ? `
        <section class="start-section" aria-label="Continuar documentos recentes">
          <div class="start-section-header">
            ${tape('CONTINUAR')}
          </div>
          <div class="start-row start-recents-row" role="region" aria-label="Documentos recentes">
            ${recentsMarkup}
          </div>
        </section>
      ` : ''}

      <!-- Seção MODELOS -->
      <section class="start-section" aria-label="Modelos de documentos">
        <div class="start-section-header">
          ${tape('MODELOS')}
          <button type="button" class="start-link-btn" data-action="view-all-templates">
            ver todos →
          </button>
        </div>
        <div class="start-row start-featured-row" role="region" aria-label="Modelos em destaque">
          ${featuredMarkup}
        </div>
      </section>

      <!-- Seção NOVIDADES -->
      ${newsMarkup ? `
        <section class="start-section" aria-label="Novidades da coleção">
          <div class="start-section-header">
            ${tape('NOVIDADES')}
          </div>
          <div class="start-row start-news-row" role="region" aria-label="Novidades">
            ${newsMarkup}
          </div>
        </section>
      ` : ''}

      <!-- Seção EXPANSÕES (se houver) -->
      ${expansions.length > 0 ? `
        <section class="start-section" aria-label="Expansões disponíveis">
          <div class="start-section-header">
            ${tape('EXPANSÕES')}
          </div>
          <div class="start-row start-expansions-row" role="region" aria-label="Expansões">
            ${expansionsMarkup}
          </div>
        </section>
      ` : ''}
    `;

    // Event bindings: Presets
    root.querySelectorAll('.start-preset-card').forEach(card => {
      const presetId = card.dataset.preset;
      const trigger = () => onCreatePreset?.(presetId);
      card.addEventListener('click', trigger);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger();
        }
      });
    });

    // Event bindings: Recents
    root.querySelectorAll('.start-recent-card').forEach(card => {
      const docId = card.dataset.id;
      const trigger = () => onOpenHandout?.(docId);
      card.addEventListener('click', trigger);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger();
        }
      });
    });

    // Event bindings: Featured models
    root.querySelectorAll('.start-featured-card').forEach(card => {
      const tplId = card.dataset.id;
      const trigger = () => onOpenTemplate?.(tplId);
      card.addEventListener('click', trigger);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger();
        }
      });
    });

    // Event bindings: View all templates
    root.querySelector('[data-action="view-all-templates"]')?.addEventListener('click', () => {
      onOpenTemplatesDrawer?.();
    });

    // Event bindings: Expansions
    root.querySelectorAll('[data-action="explore-expansion"]').forEach(btn => {
      const sourceId = btn.dataset.source;
      btn.addEventListener('click', () => {
        onExploreExpansion?.(sourceId);
      });
    });

    // Keyboard navigation within rows
    root.querySelectorAll('.start-row').forEach(row => {
      bindRowKeyboard(row);
    });

    // Check first visit welcome notes
    renderWelcomeNotes();
  }

  loadData();

  if (container) {
    container.appendChild(root);
  }

  return {
    get element() {
      return root;
    },
    refresh: loadData,
    showWelcome: renderWelcomeNotes,
  };
}
