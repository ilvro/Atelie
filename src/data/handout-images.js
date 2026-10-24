/**
 * Handout image loader and cache.
 */
export function createHandoutImages({
  fetchBlob = url => fetch(url).then(r => (r.ok ? r.blob() : null)),
} = {}) {
  const cache = new Map();

  function getUrl(src) {
    if (!src || typeof src !== 'object') return '';
    const base = typeof document !== 'undefined' ? document.baseURI : 'http://127.0.0.1:3011/';
    if (src.library) {
      return new URL(`api/atelie/library/${encodeURIComponent(src.library)}/file`, base).href;
    }
    if (src.upload) {
      return new URL(`api/atelie/uploads/${encodeURIComponent(src.upload)}/file`, base).href;
    }
    return '';
  }

  function keyOf(src) {
    if (!src || typeof src !== 'object') return null;
    if (src.library) return `library:${src.library}`;
    if (src.upload) return `upload:${src.upload}`;
    return null;
  }

  async function load(src) {
    const key = keyOf(src);
    if (!key) return null;

    if (cache.has(key)) {
      return cache.get(key);
    }

    const promise = (async () => {
      try {
        const u = getUrl(src);
        if (!u) return null;
        const blob = await fetchBlob(u);
        if (!blob) return null;
        if (typeof createImageBitmap === 'function') {
          return await createImageBitmap(blob);
        }
        return null;
      } catch (err) {
        console.warn(`Failed to load handout image ${key}:`, err);
        return null;
      }
    })();

    cache.set(key, promise);
    return promise;
  }

  return {
    load,
    url: getUrl,
    clear() {
      cache.clear();
    },
  };
}

