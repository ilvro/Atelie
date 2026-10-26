/**
 * Handout font loader and cache using FontFace.
 * Loads library fonts once each; resolves even when a font fails (the fallback draws instead).
 */
export function createHandoutFonts({
  url = null,
  api = null,
} = {}) {
  const cache = new Map();

  async function resolveUrl(id) {
    if (url) return url(id);
    if (api) {
      if (typeof api.library?.resolveFileURL === 'function') {
        return await api.library.resolveFileURL(id);
      }
      return api.library.fileURL(id);
    }
    const base = typeof document !== 'undefined' ? document.baseURI : 'http://127.0.0.1:3011/';
    return new URL(`api/atelie/library/${encodeURIComponent(id)}/file`, base).href;
  }

  async function load(font) {
    if (!font) return true;
    if (!font.library) {
      if (typeof document !== 'undefined' && document.fonts?.load && font.family) {
        const italic = font.italic ? 'italic ' : '';
        const weight = font.weight || 400;
        try {
          await document.fonts.load(`${italic}${weight} 16px "${font.family}"`);
        } catch {
          // Fallback font will be used
        }
      }
      return true;
    }

    const weight = font.weight ?? 400;
    const italic = font.italic ? 'italic' : 'normal';
    const key = `${font.library}|${weight}|${italic}`;

    if (cache.has(key)) {
      return cache.get(key);
    }

    const promise = (async () => {
      try {
        if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) {
          return true;
        }
        const fileUrl = await resolveUrl(font.library);
        const fontFace = new FontFace(font.family, `url(${fileUrl})`, {
          weight: String(weight),
          style: italic,
        });
        document.fonts.add(fontFace);
        await fontFace.load();
        return true;
      } catch (err) {
        console.warn(`[atelie] Falha ao carregar fonte "${font.family}" (${font.library}):`, err);
        return false;
      }
    })();

    cache.set(key, promise);
    return promise;
  }

  return {
    load,
    clear() {
      cache.clear();
    },
  };
}

