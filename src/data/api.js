import { ApiError } from './errors.js';
import { validateHandout } from '../domain/handouts.js';
import { validateFolders } from '../domain/folders.js';

export { ApiError };

function defaultBaseURI() {
  if (typeof document !== 'undefined' && document.baseURI) {
    return document.baseURI;
  }
  return 'http://127.0.0.1:3011/';
}

export function storageScope(baseURI = defaultBaseURI()) {
  try {
    const url = new URL(baseURI);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    return `${url.origin}${path}`;
  } catch {
    return '/';
  }
}

export function detectStorageMode({ env, hostname } = {}) {
  const currentEnv = env || (typeof process !== 'undefined' ? process.env : {}) || {};
  if (currentEnv.VITE_ATELIE_STORAGE === 'browser') return 'browser';

  if (typeof window !== 'undefined') {
    if (window.location && window.location.search && window.location.search.includes('storage=browser')) return 'browser';
    if (window.__ATELIE_STORAGE === 'browser') return 'browser';
    const host = hostname || window.location.hostname;
    if (host && host.endsWith('github.io')) return 'browser';
  }

  return 'server';
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function createApi({
  mode = detectStorageMode(),
  baseURI = defaultBaseURI(),
  databaseFactory = typeof indexedDB !== 'undefined' ? indexedDB : null,
} = {}) {
  let persistedRequested = false;
  async function requestPersistOnce() {
    if (persistedRequested) return;
    persistedRequested = true;
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      await navigator.storage.persist().catch(() => {});
    }
  }

  // --- BROWSER MODE (IndexedDB) ---
  const dbName = `atelie-v1:${storageScope(baseURI)}`;

  function openDB() {
    if (!databaseFactory) {
      return Promise.reject(new Error('IndexedDB não suportado neste ambiente.'));
    }
    return new Promise((resolve, reject) => {
      const req = databaseFactory.open(dbName, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of ['handouts', 'versions', 'trash', 'uploads', 'previews', 'folders']) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name);
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Feche outras abas para atualizar o banco de dados.'));
    });
  }

  async function transact(stores, txMode, action) {
    const db = await openDB();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(stores, txMode);
        let result;
        let failure;
        const stop = err => {
          failure = err;
          tx.abort();
        };
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => { failure ??= tx.error; };
        tx.onabort = () => reject(failure ?? tx.error ?? new Error('Transação abortada.'));
        try {
          action(tx, val => { result = val; }, stop);
        } catch (err) {
          stop(err);
        }
      });
    } finally {
      db.close();
    }
  }

  const browserHandouts = {
    async list() {
      return transact(['handouts', 'previews'], 'readonly', (tx, resolve, stop) => {
        const hReq = tx.objectStore('handouts').getAll();
        const pReq = tx.objectStore('previews').getAllKeys();
        hReq.onerror = () => stop(hReq.error);
        pReq.onerror = () => stop(pReq.error);

        let handoutsList = null;
        let previewKeys = null;
        const checkDone = () => {
          if (handoutsList && previewKeys) {
            const pSet = new Set(previewKeys);
            const list = handoutsList.map(doc => ({
              id: doc.id,
              name: doc.name,
              category: doc.category || '',
              tags: doc.tags || [],
              folder: doc.folder ?? null,
              favorite: doc.favorite ?? false,
              revision: doc.revision,
              updatedAt: doc.updatedAt || new Date().toISOString(),
              preview: pSet.has(doc.id),
            }));
            list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            resolve(list);
          }
        };

        hReq.onsuccess = () => {
          handoutsList = hReq.result || [];
          checkDone();
        };
        pReq.onsuccess = () => {
          previewKeys = pReq.result || [];
          checkDone();
        };
      });
    },

    async read(id) {
      return transact(['handouts'], 'readonly', (tx, resolve, stop) => {
        const req = tx.objectStore('handouts').get(id);
        req.onerror = () => stop(req.error);
        req.onsuccess = () => {
          if (!req.result) {
            return stop(new ApiError('Documento não encontrado.', 404));
          }
          resolve(req.result);
        };
      });
    },

    async create(h) {
      validateHandout(h);
      await requestPersistOnce();
      const doc = structuredClone(h);
      doc.revision = 1;
      doc.updatedAt = new Date().toISOString();

      return transact(['handouts'], 'readwrite', (tx, resolve, stop) => {
        const store = tx.objectStore('handouts');
        const check = store.get(doc.id);
        check.onerror = () => stop(check.error);
        check.onsuccess = () => {
          if (check.result) {
            return stop(new ApiError('Documento com este ID já existe.', 409));
          }
          store.put(doc, doc.id);
          resolve(doc);
        };
      });
    },

    async save(h) {
      validateHandout(h);
      await requestPersistOnce();
      const doc = structuredClone(h);

      return transact(['handouts', 'versions'], 'readwrite', (tx, resolve, stop) => {
        const hStore = tx.objectStore('handouts');
        const vStore = tx.objectStore('versions');

        const req = hStore.get(doc.id);
        req.onerror = () => stop(req.error);
        req.onsuccess = () => {
          const current = req.result;
          if (!current) {
            return stop(new ApiError('Documento não encontrado.', 404));
          }
          if (current.revision !== doc.revision) {
            return stop(new ApiError('O documento mudou no navegador. Recarregue antes de salvar.', 409, {
              currentRevision: current.revision,
            }));
          }

          // Archive version
          vStore.put(current, `${doc.id}:${current.revision}`);

          // Keep up to 10 versions in browser mode
          const vKeysReq = vStore.getAllKeys();
          vKeysReq.onerror = () => stop(vKeysReq.error);
          vKeysReq.onsuccess = () => {
            const keys = (vKeysReq.result || [])
              .filter(k => typeof k === 'string' && k.startsWith(`${doc.id}:`))
              .map(k => parseInt(k.split(':')[1], 10))
              .filter(n => Number.isInteger(n) && n > 0)
              .sort((a, b) => a - b);

            if (keys.length > 10) {
              const toDelete = keys.slice(0, keys.length - 10);
              for (const rev of toDelete) {
                vStore.delete(`${doc.id}:${rev}`);
              }
            }

            doc.revision = current.revision + 1;
            doc.updatedAt = new Date().toISOString();
            hStore.put(doc, doc.id);
            resolve(doc);
          };
        };
      });
    },

    async remove(h) {
      const id = typeof h === 'string' ? h : h.id;
      return transact(['handouts', 'trash'], 'readwrite', (tx, resolve, stop) => {
        const hStore = tx.objectStore('handouts');
        const tStore = tx.objectStore('trash');

        const req = hStore.get(id);
        req.onerror = () => stop(req.error);
        req.onsuccess = () => {
          const current = req.result;
          if (!current) {
            return stop(new ApiError('Documento não encontrado.', 404));
          }
          const deletedAt = new Date().toISOString();
          tStore.put({ ...current, deletedAt }, id);
          hStore.delete(id);
          resolve(true);
        };
      });
    },

    async versions(id) {
      return transact(['versions'], 'readonly', (tx, resolve, stop) => {
        const store = tx.objectStore('versions');
        const req = store.openCursor();
        req.onerror = () => stop(req.error);
        const list = [];
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            if (typeof cursor.key === 'string' && cursor.key.startsWith(`${id}:`)) {
              const doc = cursor.value;
              list.push({
                revision: doc.revision,
                updatedAt: doc.updatedAt,
                name: doc.name,
              });
            }
            cursor.continue();
          } else {
            list.sort((a, b) => b.revision - a.revision);
            resolve(list);
          }
        };
      });
    },

    async version(id, rev) {
      const revision = parseInt(rev, 10);
      return transact(['versions'], 'readonly', (tx, resolve, stop) => {
        const req = tx.objectStore('versions').get(`${id}:${revision}`);
        req.onerror = () => stop(req.error);
        req.onsuccess = () => {
          if (!req.result) {
            return stop(new ApiError('Versão não encontrada.', 404));
          }
          resolve(req.result);
        };
      });
    },

    async savePreview(h, dataUrl) {
      const id = typeof h === 'string' ? h : h.id;
      await requestPersistOnce();
      return transact(['previews'], 'readwrite', (tx, resolve, stop) => {
        const req = tx.objectStore('previews').put(dataUrl, id);
        req.onerror = () => stop(req.error);
        req.onsuccess = () => resolve(true);
      });
    },
  };

  const browserTrash = {
    async list() {
      const now = Date.now();
      return transact(['trash', 'versions', 'previews'], 'readwrite', (tx, resolve, stop) => {
        const tStore = tx.objectStore('trash');
        const vStore = tx.objectStore('versions');
        const pStore = tx.objectStore('previews');

        const req = tStore.getAll();
        req.onerror = () => stop(req.error);
        req.onsuccess = () => {
          const all = req.result || [];
          const list = [];
          for (const doc of all) {
            const deletedTime = doc.deletedAt ? new Date(doc.deletedAt).getTime() : now;
            if (now - deletedTime > THIRTY_DAYS_MS) {
              tStore.delete(doc.id);
              pStore.delete(doc.id);
              continue;
            }
            list.push({
              id: doc.id,
              name: doc.name,
              category: doc.category || '',
              tags: doc.tags || [],
              deletedAt: doc.deletedAt,
              revision: doc.revision,
            });
          }
          list.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
          resolve(list);
        };
      });
    },

    async restore(id) {
      return transact(['trash', 'handouts'], 'readwrite', (tx, resolve, stop) => {
        const tStore = tx.objectStore('trash');
        const hStore = tx.objectStore('handouts');

        const req = tStore.get(id);
        req.onerror = () => stop(req.error);
        req.onsuccess = () => {
          const doc = req.result;
          if (!doc) {
            return stop(new ApiError('Documento não encontrado na lixeira.', 404));
          }
          delete doc.deletedAt;
          doc.updatedAt = new Date().toISOString();
          hStore.put(doc, id);
          tStore.delete(id);
          resolve(doc);
        };
      });
    },

    async purge(id) {
      return transact(['trash', 'versions', 'previews'], 'readwrite', (tx, resolve, stop) => {
        const tStore = tx.objectStore('trash');
        const vStore = tx.objectStore('versions');
        const pStore = tx.objectStore('previews');

        tStore.delete(id);
        pStore.delete(id);

        const vReq = vStore.openCursor();
        vReq.onerror = () => stop(vReq.error);
        vReq.onsuccess = () => {
          const cursor = vReq.result;
          if (cursor) {
            if (typeof cursor.key === 'string' && cursor.key.startsWith(`${id}:`)) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve(true);
          }
        };
      });
    },
  };

  const browserLibrary = {
    async list() {
      const url = new URL('colecao/library.json', baseURI).href;
      const res = await fetch(url);
      if (!res.ok) {
        throw new ApiError('Não foi possível carregar a coleção da casa.', res.status);
      }
      const data = await res.json();
      const visible = (data.items || [])
        .filter(i => i.kind !== 'layer')
        .map(i => ({ ...i, source: 'casa' }));
      return {
        sources: [{ id: 'casa', name: 'Coleção do Ateliê' }],
        items: visible,
      };
    },

    async item(id) {
      const listData = await this.list();
      const found = listData.items.find(i => i.id === id);
      if (!found) {
        throw new ApiError('Item não encontrado na biblioteca.', 404);
      }
      if (found.kind === 'template' && found.file) {
        const tplUrl = new URL(`colecao/${found.file}`, baseURI).href;
        const res = await fetch(tplUrl);
        if (!res.ok) {
          throw new ApiError('Modelo não encontrado.', 404);
        }
        const handout = await res.json();
        return { ...found, handout };
      }
      return found;
    },

    fileURL(item) {
      const file = typeof item === 'object' && item ? item.file : item;
      return new URL(`colecao/${file}`, baseURI).href;
    },

    previewURL(item) {
      const preview = typeof item === 'object' && item ? item.preview : item;
      return new URL(`colecao/${preview}`, baseURI).href;
    },
  };

  const browserUploads = {
    async list() {
      return transact(['uploads'], 'readonly', (tx, resolve, stop) => {
        const req = tx.objectStore('uploads').getAll();
        req.onerror = () => stop(req.error);
        req.onsuccess = () => {
          const items = (req.result || []).map(({ id, name, mime, size, width, height, createdAt }) => ({
            id,
            name,
            mime,
            size,
            width,
            height,
            createdAt,
          }));
          resolve(items);
        };
      });
    },

    async send(file) {
      let width = 0;
      let height = 0;
      const mime = file.type || 'image/png';
      const name = file.name || 'imagem';

      if (typeof createImageBitmap === 'function') {
        try {
          const bmp = await createImageBitmap(file);
          width = bmp.width;
          height = bmp.height;
          bmp.close();
        } catch {
          // ignore
        }
      }

      const id = 'up-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');
      const createdAt = new Date().toISOString();
      const record = {
        id,
        name,
        mime,
        size: file.size || 0,
        width,
        height,
        createdAt,
        blob: file,
      };

      await transact(['uploads'], 'readwrite', (tx, resolve, stop) => {
        const req = tx.objectStore('uploads').put(record, id);
        req.onerror = () => stop(req.error);
        req.onsuccess = () => resolve(true);
      });

      return {
        id,
        name,
        mime,
        size: record.size,
        width,
        height,
        createdAt,
      };
    },

    async remove(id) {
      return transact(['uploads'], 'readwrite', (tx, resolve, stop) => {
        const req = tx.objectStore('uploads').delete(id);
        req.onerror = () => stop(req.error);
        req.onsuccess = () => resolve(true);
      });
    },

    async fileURL(id) {
      return transact(['uploads'], 'readonly', (tx, resolve, stop) => {
        const req = tx.objectStore('uploads').get(id);
        req.onerror = () => stop(req.error);
        req.onsuccess = () => {
          const record = req.result;
          if (!record || !record.blob) {
            return stop(new ApiError('Upload não encontrado.', 404));
          }
          if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            resolve(URL.createObjectURL(record.blob));
          } else {
            resolve(`data:${record.mime};base64,...`);
          }
        };
      });
    },
  };

  const browserFolders = {
    async list() {
      return transact(['folders'], 'readonly', (tx, resolve, stop) => {
        const req = tx.objectStore('folders').get('current');
        req.onerror = () => stop(req.error);
        req.onsuccess = () => {
          if (!req.result) {
            resolve({ folders: [], revision: 1 });
          } else {
            resolve(req.result);
          }
        };
      });
    },

    async save(folders, expectedRevision) {
      validateFolders(folders);
      await requestPersistOnce();
      return transact(['folders'], 'readwrite', (tx, resolve, stop) => {
        const store = tx.objectStore('folders');
        const getReq = store.get('current');
        getReq.onerror = () => stop(getReq.error);
        getReq.onsuccess = () => {
          const current = getReq.result || { folders: [], revision: 1 };
          if (expectedRevision !== undefined && expectedRevision !== null) {
            if (Number(expectedRevision) !== current.revision) {
              return stop(new ApiError('Conflito de revisão nas pastas.', 409, {
                code: 'REVISION_CONFLICT',
                currentRevision: current.revision,
              }));
            }
          }
          const nextRevision = (current.revision || 1) + 1;
          const payload = { folders, revision: nextRevision };
          const putReq = store.put(payload, 'current');
          putReq.onerror = () => stop(putReq.error);
          putReq.onsuccess = () => resolve(payload);
        };
      });
    },
  };

  // --- SERVER MODE (REST API) ---
  async function fetchJson(path, options = {}) {
    const url = new URL(path, baseURI).href;
    const res = await fetch(url, options);
    if (!res.ok) {
      let errorBody = {};
      try {
        errorBody = await res.json();
      } catch {}
      const msg = errorBody.error?.message || `Erro HTTP ${res.status}`;
      throw new ApiError(msg, res.status, errorBody);
    }
    if (res.status === 204) return null;
    return await res.json();
  }

  const serverHandouts = {
    async list() {
      return await fetchJson('api/atelie/handouts');
    },

    async read(id) {
      return await fetchJson(`api/atelie/handouts/${encodeURIComponent(id)}`);
    },

    async create(h) {
      validateHandout(h);
      const data = await fetchJson('api/atelie/handouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handout: h }),
      });
      return data.handout;
    },

    async save(h) {
      validateHandout(h);
      const data = await fetchJson(`api/atelie/handouts/${encodeURIComponent(h.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handout: h, expectedRevision: h.revision }),
      });
      return data.handout;
    },

    async remove(h) {
      const id = typeof h === 'string' ? h : h.id;
      const rev = typeof h === 'object' && h ? `?expectedRevision=${h.revision}` : '';
      await fetchJson(`api/atelie/handouts/${encodeURIComponent(id)}${rev}`, {
        method: 'DELETE',
      });
      return true;
    },

    async versions(id) {
      return await fetchJson(`api/atelie/handouts/${encodeURIComponent(id)}/versions`);
    },

    async version(id, rev) {
      return await fetchJson(`api/atelie/handouts/${encodeURIComponent(id)}/versions/${encodeURIComponent(rev)}`);
    },

    async savePreview(h, dataUrl) {
      const id = typeof h === 'string' ? h : h.id;
      await fetchJson(`api/atelie/handouts/${encodeURIComponent(id)}/preview`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      return true;
    },
  };

  const serverTrash = {
    async list() {
      return await fetchJson('api/atelie/trash');
    },

    async restore(id) {
      const data = await fetchJson(`api/atelie/trash/${encodeURIComponent(id)}/restore`, {
        method: 'POST',
      });
      return data.handout;
    },

    async purge(id) {
      await fetchJson(`api/atelie/trash/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return true;
    },
  };

  const serverLibrary = {
    async list() {
      return await fetchJson('api/atelie/library');
    },

    async item(id) {
      return await fetchJson(`api/atelie/library/${encodeURIComponent(id)}`);
    },

    fileURL(item) {
      const id = typeof item === 'object' && item ? item.id : item;
      return new URL(`api/atelie/library/${encodeURIComponent(id)}/file`, baseURI).href;
    },

    previewURL(item) {
      const id = typeof item === 'object' && item ? item.id : item;
      return new URL(`api/atelie/library/${encodeURIComponent(id)}/preview`, baseURI).href;
    },
  };

  const serverUploads = {
    async list() {
      return await fetchJson('api/atelie/uploads');
    },

    async send(file) {
      const name = file.name || 'imagem';
      const url = new URL(`api/atelie/uploads?name=${encodeURIComponent(name)}`, baseURI).href;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'image/png' },
        body: file,
      });
      if (!res.ok) {
        let errorBody = {};
        try { errorBody = await res.json(); } catch {}
        throw new ApiError(errorBody.error?.message || `Erro HTTP ${res.status}`, res.status, errorBody);
      }
      return await res.json();
    },

    async remove(id) {
      await fetchJson(`api/atelie/uploads/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return true;
    },

    fileURL(id) {
      return new URL(`api/atelie/uploads/${encodeURIComponent(id)}/file`, baseURI).href;
    },
  };

  const serverFolders = {
    async list() {
      return await fetchJson('api/atelie/folders');
    },

    async save(folders, expectedRevision) {
      validateFolders(folders);
      return await fetchJson('api/atelie/folders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folders, expectedRevision }),
      });
    },
  };

  return {
    mode,
    handouts: mode === 'browser' ? browserHandouts : serverHandouts,
    folders: mode === 'browser' ? browserFolders : serverFolders,
    trash: mode === 'browser' ? browserTrash : serverTrash,
    library: mode === 'browser' ? browserLibrary : serverLibrary,
    uploads: mode === 'browser' ? browserUploads : serverUploads,
    estimate: async () => {
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
        return await navigator.storage.estimate();
      }
      return { usage: 0, quota: 0 };
    },
  };
}

export const api = createApi();
