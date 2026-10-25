/**
 * Expansion installer and local browser storage (Etapa 29)
 * Manages loading, validating, installing, and removing private expansions
 * in IndexedDB (atelie-expansions-v1:<scope>) without sending files to any server.
 */

/**
 * Validates the structure and mandatory fields of expansion.json and library.json.
 */
export function validateExpansionManifests(expansionJson, libraryJson) {
  if (!expansionJson || typeof expansionJson !== 'object') {
    throw new Error('expansion.json inválido ou ausente.');
  }
  const id = String(expansionJson.id || '').trim().toLowerCase();
  if (!id || !/^[a-z0-9-_]+$/.test(id)) {
    throw new Error('expansion.json sem id válido (deve conter apenas letras minúsculas, números, hífens ou underlines).');
  }
  const name = String(expansionJson.name || '').trim();
  if (!name) {
    throw new Error('expansion.json sem nome válido.');
  }
  if (!libraryJson || typeof libraryJson !== 'object' || !Array.isArray(libraryJson.items)) {
    throw new Error('library.json inválido ou sem lista de items.');
  }

  return {
    id,
    name,
    description: String(expansionJson.description || '').trim(),
    license: String(expansionJson.license || '').trim(),
    createdAt: expansionJson.createdAt || new Date().toISOString(),
    items: libraryJson.items,
  };
}

/**
 * Calculates the total byte size of all files in filesMap.
 */
export function calculateExpansionSize(filesMap) {
  if (!filesMap) return 0;
  let total = 0;
  const entries = filesMap instanceof Map ? filesMap.values() : Object.values(filesMap);
  for (const file of entries) {
    if (file && typeof file.size === 'number') {
      total += file.size;
    }
  }
  return total;
}

/**
 * Checks if the browser has at least 1.5x free storage space available.
 */
export function checkStorageSpace(requiredBytes, estimate) {
  const bytes = Number(requiredBytes || 0);
  const needed = Math.round(bytes * 1.5);

  if (!estimate || typeof estimate.quota !== 'number' || typeof estimate.usage !== 'number') {
    return { ok: true, available: Infinity, required: bytes, needed };
  }

  const available = Math.max(0, estimate.quota - estimate.usage);
  return {
    ok: available >= needed,
    available,
    required: bytes,
    needed,
  };
}

/**
 * Reads an expansion folder from a DirectoryHandle (showDirectoryPicker).
 */
export async function readFolderFromDirectoryHandle(dirHandle, { onProgress, signal } = {}) {
  const filesMap = new Map();
  let expansionJson = null;
  let libraryJson = null;

  async function scanDir(handle, currentPath = '') {
    if (signal?.aborted) throw new Error('Operação cancelada.');
    for await (const entry of handle.values()) {
      if (signal?.aborted) throw new Error('Operação cancelada.');
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        if (entryPath === 'expansion.json') {
          try {
            expansionJson = JSON.parse(await file.text());
          } catch (err) {
            throw new Error(`Erro ao ler expansion.json: ${err.message}`);
          }
        } else if (entryPath === 'library.json') {
          try {
            libraryJson = JSON.parse(await file.text());
          } catch (err) {
            throw new Error(`Erro ao ler library.json: ${err.message}`);
          }
        }
        filesMap.set(entryPath, file);
      } else if (entry.kind === 'directory') {
        await scanDir(entry, entryPath);
      }
    }
  }

  await scanDir(dirHandle);

  if (!expansionJson) throw new Error('Arquivo expansion.json não encontrado na raiz da pasta.');
  if (!libraryJson) throw new Error('Arquivo library.json não encontrado na raiz da pasta.');

  return { expansionJson, libraryJson, filesMap };
}

/**
 * Reads an expansion folder from a FileList (<input type="file" webkitdirectory>).
 */
export async function readFolderFromFileList(fileList, { onProgress, signal } = {}) {
  const filesMap = new Map();
  let expansionJson = null;
  let libraryJson = null;

  if (!fileList || fileList.length === 0) {
    throw new Error('Nenhum arquivo selecionado.');
  }

  for (let i = 0; i < fileList.length; i++) {
    if (signal?.aborted) throw new Error('Operação cancelada.');
    const file = fileList[i];
    const relPath = file.webkitRelativePath
      ? file.webkitRelativePath.split('/').slice(1).join('/') || file.name
      : file.name;

    if (relPath === 'expansion.json' || file.name === 'expansion.json') {
      try {
        expansionJson = JSON.parse(await file.text());
      } catch (err) {
        throw new Error(`Erro ao ler expansion.json: ${err.message}`);
      }
    } else if (relPath === 'library.json' || file.name === 'library.json') {
      try {
        libraryJson = JSON.parse(await file.text());
      } catch (err) {
        throw new Error(`Erro ao ler library.json: ${err.message}`);
      }
    }

    filesMap.set(relPath, file);
    // Also index by filename for resilient lookup if needed
    if (relPath !== file.name) {
      filesMap.set(file.name, file);
    }
  }

  if (!expansionJson) throw new Error('Arquivo expansion.json não encontrado na pasta selecionada.');
  if (!libraryJson) throw new Error('Arquivo library.json não encontrado na pasta selecionada.');

  return { expansionJson, libraryJson, filesMap };
}

/**
 * Opens or creates the IndexedDB database for browser expansions.
 */
export function openExpansionsDB(dbName, databaseFactory = typeof indexedDB !== 'undefined' ? indexedDB : null) {
  if (!databaseFactory) {
    return Promise.reject(new Error('IndexedDB não suportado neste ambiente.'));
  }

  return new Promise((resolve, reject) => {
    const req = databaseFactory.open(dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('expansions')) {
        db.createObjectStore('expansions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Feche outras abas para atualizar o banco de expansões.'));
  });
}

/**
 * Installs or updates an expansion into IndexedDB.
 */
export async function installExpansion(db, expansionInfo, libraryJson, filesMap, { onProgress, signal } = {}) {
  const validated = validateExpansionManifests(expansionInfo, libraryJson);
  const { id, name, description, license, createdAt, items } = validated;
  const totalBytes = calculateExpansionSize(filesMap);

  // 1. Remove previous version if already installed
  await removeExpansion(db, id);

  // 2. Put metadata and items
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['expansions', 'items'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transação de instalação abortada.'));

    const expStore = tx.objectStore('expansions');
    expStore.put({
      id,
      name,
      description,
      license,
      createdAt,
      installedAt: new Date().toISOString(),
      totalBytes,
      itemCount: items.length,
    });

    const itemsStore = tx.objectStore('items');
    for (const item of items) {
      itemsStore.put({
        ...item,
        source: id,
      });
    }
  });

  // 3. Put files in batches
  const entries = Array.from(filesMap.entries()).filter(([path]) => path !== 'expansion.json');
  const totalFiles = entries.length;
  const batchSize = 10;
  let processed = 0;

  for (let i = 0; i < entries.length; i += batchSize) {
    if (signal?.aborted) {
      await removeExpansion(db, id);
      throw new Error('Instalação cancelada.');
    }

    const batch = entries.slice(i, i + batchSize);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['files'], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore('files');
      for (const [filePath, file] of batch) {
        store.put(file, [id, filePath]);
      }
    });

    processed += batch.length;
    if (onProgress) {
      onProgress({
        processed,
        total: totalFiles,
        percent: totalFiles > 0 ? Math.min(100, Math.round((processed / totalFiles) * 100)) : 100,
      });
    }
  }

  return {
    id,
    name,
    totalBytes,
    itemCount: items.length,
  };
}

/**
 * Removes an expansion and all its items and files from IndexedDB.
 */
export async function removeExpansion(db, expansionId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['expansions', 'items', 'files'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);

    // 1. Remove from expansions store
    tx.objectStore('expansions').delete(expansionId);

    // 2. Remove all items belonging to this expansion
    const itemsStore = tx.objectStore('items');
    const itemsReq = itemsStore.openCursor();
    itemsReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value?.source === expansionId) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    // 3. Remove all files belonging to this expansion
    const filesStore = tx.objectStore('files');
    const filesReq = filesStore.openCursor();
    filesReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        const key = cursor.key;
        if (Array.isArray(key) && key[0] === expansionId) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  });
}

/**
 * Lists all installed expansions from IndexedDB.
 */
export async function listInstalledExpansions(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['expansions'], 'readonly');
    const req = tx.objectStore('expansions').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves a file Blob from an installed expansion.
 */
export async function getExpansionFile(db, expansionId, relativePath) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['files'], 'readonly');
    const req = tx.objectStore('files').get([expansionId, relativePath]);
    req.onsuccess = () => {
      if (req.result) return resolve(req.result);
      // Fallback try basename if full path didn't match
      const baseName = relativePath.split('/').pop();
      if (baseName && baseName !== relativePath) {
        const req2 = tx.objectStore('files').get([expansionId, baseName]);
        req2.onsuccess = () => resolve(req2.result || null);
        req2.onerror = () => reject(req2.error);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all items across all installed expansions.
 */
export async function getExpansionItems(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['items'], 'readonly');
    const req = tx.objectStore('items').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
