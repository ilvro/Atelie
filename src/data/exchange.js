/**
 * Caminho A: Banco de troca mesa-handouts-v1 e canal de tempo real BroadcastChannel('mesa:handout').
 */

export const EXCHANGE_DB = 'mesa-handouts-v1';

/**
 * Abre o banco de troca com as stores 'handouts' (keyPath 'id') e 'bakes' (keyPath ['id', 'light']).
 */
export function openExchange(indexedDB = globalThis.indexedDB) {
  if (!indexedDB) {
    return Promise.reject(new Error('IndexedDB indisponível para o banco de troca.'));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(EXCHANGE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('handouts')) {
        db.createObjectStore('handouts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('bakes')) {
        db.createObjectStore('bakes', { keyPath: ['id', 'light'] });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Feche outras abas para atualizar o banco de troca.'));
  });
}

/**
 * Grava o resumo (com preview Blob) e os assados em uma única transação.
 * Remove o assado UV antigo se bakes.uv for null.
 */
export async function publish(db, summary, preview, bakes) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['handouts', 'bakes'], 'readwrite');
    const hStore = tx.objectStore('handouts');
    const bStore = tx.objectStore('bakes');

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    hStore.put({ ...summary, preview: preview ?? null });

    const normalBlob = bakes?.normal?.blob || bakes?.normal;
    if (normalBlob) {
      bStore.put({
        id: summary.id,
        light: 'normal',
        revision: summary.revision,
        blob: normalBlob,
        width: bakes.width || bakes?.normal?.width || 0,
        height: bakes.height || bakes?.normal?.height || 0,
      });
    }

    const uvBlob = bakes?.uv?.blob || bakes?.uv;
    if (uvBlob) {
      bStore.put({
        id: summary.id,
        light: 'uv',
        revision: summary.revision,
        blob: uvBlob,
        width: bakes.width || bakes?.uv?.width || 0,
        height: bakes.height || bakes?.uv?.height || 0,
      });
    } else {
      bStore.delete([summary.id, 'uv']);
    }
  });
}

/**
 * What is already published for a document at exactly this revision: { preview, bakes: { normal, uv } },
 * or null when the revision differs, the normal bake is missing, or a UV bake is expected and missing.
 */
export async function readPublished(db, id, revision, { hasUv = false } = {}) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['handouts', 'bakes'], 'readonly');
    const summaryReq = tx.objectStore('handouts').get(id);
    const normalReq = tx.objectStore('bakes').get([id, 'normal']);
    const uvReq = tx.objectStore('bakes').get([id, 'uv']);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    tx.oncomplete = () => {
      const summary = summaryReq.result;
      const normal = normalReq.result;
      const uv = uvReq.result;
      if (!summary || summary.revision !== revision) return resolve(null);
      if (!normal || normal.revision !== revision) return resolve(null);
      if (hasUv && (!uv || uv.revision !== revision)) return resolve(null);
      resolve({
        preview: summary.preview ?? null,
        bakes: { normal: normal.blob, uv: hasUv ? uv.blob : null, width: normal.width, height: normal.height },
      });
    };
  });
}

/**
 * Remove o resumo e todos os assados de um documento.
 */
export async function unpublish(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['handouts', 'bakes'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    tx.objectStore('handouts').delete(id);
    tx.objectStore('bakes').delete([id, 'normal']);
    tx.objectStore('bakes').delete([id, 'uv']);
  });
}

/**
 * Remove do banco de troca todos os registros pertencentes a uma mesma origem/source.
 */
export async function unpublishBySource(db, source) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['handouts', 'bakes'], 'readwrite');
    const hStore = tx.objectStore('handouts');
    const bStore = tx.objectStore('bakes');

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    const req = hStore.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const record = cursor.value;
        if (record.source === source) {
          cursor.delete();
          bStore.delete([record.id, 'normal']);
          bStore.delete([record.id, 'uv']);
        }
        cursor.continue();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export const channel = () => new BroadcastChannel('mesa:handout');

export const savedMessage = (summary) => ({
  app: 'atelie',
  contract: 1,
  type: 'handout-saved',
  id: summary.id,
  revision: summary.revision,
  source: summary.source,
});

export const removedMessage = (summaryOrId, source, revision = 0) => {
  const isObj = typeof summaryOrId === 'object' && summaryOrId !== null;
  return {
    app: 'atelie',
    contract: 1,
    type: 'handout-removed',
    id: isObj ? summaryOrId.id : summaryOrId,
    revision: isObj ? (summaryOrId.revision ?? 0) : (revision ?? 0),
    source: isObj ? summaryOrId.source : source,
  };
};

