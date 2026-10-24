import path from 'node:path';
import { stat, readFile, readdir } from 'node:fs/promises';
import { HttpError, assertItemId, safeResolve } from '../storage.js';

const MIME_TYPES = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

export async function register(app, { collection, expansionsDir }) {
  // Validate house collection on startup
  const houseManifest = path.join(collection, 'library.json');
  try {
    await stat(houseManifest);
  } catch (err) {
    throw new Error(`Coleção da casa sem library.json válido em "${collection}". Verifique a instalação.`);
  }

  const manifestCache = new Map();

  async function readManifest(sourceDir, sourceId, isHouse) {
    const libFile = path.join(sourceDir, 'library.json');
    let st;
    try {
      st = await stat(libFile);
    } catch (err) {
      if (isHouse) {
        throw new Error(`Coleção da casa sem library.json válido em "${sourceDir}".`);
      }
      console.warn(`[atelie] Expansão "${sourceId}" ignorada: library.json não encontrado.`);
      return null;
    }

    const cached = manifestCache.get(sourceId);
    if (cached && cached.mtimeMs === st.mtimeMs) {
      return cached;
    }

    let manifest;
    try {
      manifest = JSON.parse(await readFile(libFile, 'utf8'));
    } catch (err) {
      if (isHouse) {
        throw new Error(`Coleção da casa com library.json inválido em "${sourceDir}": ${err.message}`);
      }
      console.warn(`[atelie] Expansão "${sourceId}" ignorada: erro ao ler library.json:`, err.message);
      return null;
    }

    let expansionInfo = null;
    if (!isHouse) {
      const expFile = path.join(sourceDir, 'expansion.json');
      try {
        expansionInfo = JSON.parse(await readFile(expFile, 'utf8'));
      } catch {
        expansionInfo = { id: sourceId, name: sourceId };
      }
    }

    const entry = {
      mtimeMs: st.mtimeMs,
      sourceId,
      sourceDir,
      expansion: expansionInfo,
      items: (Array.isArray(manifest.items) ? manifest.items : []).map(item => ({
        ...item,
        source: sourceId,
      })),
    };

    manifestCache.set(sourceId, entry);
    return entry;
  }

  async function loadLibraryData() {
    const houseEntry = await readManifest(collection, 'casa', true);

    const sources = [{ id: 'casa', name: 'Coleção do Ateliê' }];
    const allItems = [];
    const itemMap = new Map();

    for (const item of houseEntry.items) {
      allItems.push(item);
      itemMap.set(item.id, { item, sourceDir: collection });
    }

    let expansionFolders = [];
    try {
      const entries = await readdir(expansionsDir, { withFileTypes: true });
      expansionFolders = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    } catch {
      // expansionsDir does not exist or cannot be read
    }

    for (const expId of expansionFolders) {
      const expDir = path.join(expansionsDir, expId);
      const expEntry = await readManifest(expDir, expId, false);
      if (!expEntry) continue;

      const info = expEntry.expansion || { id: expId, name: expId };
      sources.push({
        id: expId,
        name: info.name || expId,
        ...(info.description ? { description: info.description } : {}),
        ...(info.license ? { license: info.license } : {}),
      });

      for (const item of expEntry.items) {
        if (itemMap.has(item.id)) {
          console.warn(`[atelie] Item com ID repetido "${item.id}" na expansão "${expId}". Mantido o da origem anterior.`);
          continue;
        }
        allItems.push(item);
        itemMap.set(item.id, { item, sourceDir: expDir });
      }
    }

    return { sources, allItems, itemMap };
  }

  app.get('/api/atelie/library', async (_req, res, next) => {
    try {
      const { sources, allItems } = await loadLibraryData();
      const visibleItems = allItems.filter(item => item.kind !== 'layer');
      res.json({ sources, items: visibleItems });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/atelie/library/:itemId', async (req, res, next) => {
    try {
      const itemId = assertItemId(req.params.itemId);
      const { itemMap } = await loadLibraryData();
      const found = itemMap.get(itemId);
      if (!found) {
        throw new HttpError(404, 'NOT_FOUND', 'Item não encontrado na biblioteca.');
      }

      const { item, sourceDir } = found;
      if (item.kind === 'template' && item.file) {
        const templatePath = safeResolve(sourceDir, item.file);
        try {
          const handout = JSON.parse(await readFile(templatePath, 'utf8'));
          return res.json({ ...item, handout });
        } catch (err) {
          throw new HttpError(404, 'NOT_FOUND', `Modelo não encontrado: ${err.message}`);
        }
      }

      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/atelie/library/:itemId/file', async (req, res, next) => {
    try {
      const itemId = assertItemId(req.params.itemId);
      const { itemMap } = await loadLibraryData();
      const found = itemMap.get(itemId);
      if (!found || !found.item.file) {
        throw new HttpError(404, 'NOT_FOUND', 'Arquivo não encontrado na biblioteca.');
      }

      const { item, sourceDir } = found;
      const filePath = safeResolve(sourceDir, item.file);

      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(filePath, err => {
        if (err) next(err.code === 'ENOENT' ? new HttpError(404, 'NOT_FOUND', 'Arquivo não encontrado.') : err);
      });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/atelie/library/:itemId/preview', async (req, res, next) => {
    try {
      const itemId = assertItemId(req.params.itemId);
      const { itemMap } = await loadLibraryData();
      const found = itemMap.get(itemId);
      if (!found || !found.item.preview) {
        throw new HttpError(404, 'NOT_FOUND', 'Prévia não encontrada na biblioteca.');
      }

      const { item, sourceDir } = found;
      const previewPath = safeResolve(sourceDir, item.preview);

      const ext = path.extname(previewPath).toLowerCase();
      res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(previewPath, err => {
        if (err) next(err.code === 'ENOENT' ? new HttpError(404, 'NOT_FOUND', 'Prévia não encontrada.') : err);
      });
    } catch (err) {
      next(err);
    }
  });
}

