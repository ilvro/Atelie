import { normalizeText, matchesWords } from '../ui/palette.js';

export const FAVORITES_STORAGE_KEY = 'atelie-favorites';

export function getStoredFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleStoredFavorite(id) {
  if (!id) return false;
  try {
    const list = getStoredFavorites();
    const idx = list.indexOf(id);
    let isFav = false;
    if (idx >= 0) {
      list.splice(idx, 1);
      isFav = false;
    } else {
      list.push(id);
      isFav = true;
    }
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list));
    return isFav;
  } catch {
    return false;
  }
}

export function isStoredFavorite(id) {
  if (!id) return false;
  const list = getStoredFavorites();
  return list.includes(id);
}

/**
 * Filter library items according to query, type, source, and favorites.
 *
 * @param {Array} items List of library items
 * @param {Object} options
 * @param {string} [options.query] Search string
 * @param {string} [options.type] 'all' | 'elements' | 'fonts'
 * @param {string} [options.source] 'all' | 'casa' | expansion id
 * @param {boolean} [options.favoritesOnly] If true, return only favorited items
 * @param {Array|Set} [options.favorites] List or Set of favorite item IDs
 * @returns {Array} Filtered items
 */
export function filterLibraryItems(items = [], {
  query = '',
  type = 'all',
  source = 'all',
  favoritesOnly = false,
  favorites = [],
} = {}) {
  const favSet = favorites instanceof Set ? favorites : new Set(favorites);

  return items.filter(item => {
    // Exclude internal layers or templates from library elements/fonts drawer
    if (item.kind === 'layer' || item.kind === 'template') {
      return false;
    }

    // 1. Type filter
    if (type === 'fonts') {
      if (item.kind !== 'font') return false;
    } else if (type === 'elements') {
      if (item.kind === 'font') return false;
    }

    // 2. Source filter
    if (source && source !== 'all' && source !== 'tudo') {
      const itemSource = item.source || (item.id?.startsWith('casa-') ? 'casa' : 'casa');
      if (itemSource !== source) return false;
    }

    // 3. Favorites filter
    if (favoritesOnly) {
      if (!favSet.has(item.id)) return false;
    }

    // 4. Query filter (accent-insensitive search in name, category, and tags)
    if (query && query.trim()) {
      const q = query.trim();
      const tagsStr = Array.isArray(item.tags) ? item.tags.join(' ') : '';
      const fullSearchTarget = `${item.name || ''} ${item.category || ''} ${tagsStr} ${item.family || ''}`;

      if (!matchesWords(fullSearchTarget, q)) {
        return false;
      }
    }

    return true;
  });
}
